#!/usr/bin/env node
"use strict";

// Offline checks only. Compatible with the existing Node 12 installation; no packages.
const fs = require("fs");
const path = require("path");
const APP_ID = "9S29AL28QR.com.aasirvalji.tab";
const ASSOCIATION_FILE = ".well-known/apple-app-site-association";
const SITE_FILES = [
  "index.html", "privacy.html", "terms.html", "support.html", "invite.html",
  "group.html", "404.html", "styles.css", "_headers", "_redirects", ASSOCIATION_FILE
];

function hasSecret(content) {
  return /-----BEGIN [A-Z ]*PRIVATE KEY-----|sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(content);
}

function verifySite(directory, options = {}) {
  const errors = [];
  const warnings = [];
  const allowed = new Set(SITE_FILES.concat(["README.md", ".gitignore"]));
  const fail = message => errors.push(message);
  if (!fs.existsSync(directory) || !fs.lstatSync(directory).isDirectory()) {
    return { errors: ["Website directory is missing."], warnings };
  }
  const contents = {};
  function visit(relative = "") {
    for (const name of fs.readdirSync(path.join(directory, relative))) {
      const filename = relative ? relative + "/" + name : name;
      const stat = fs.lstatSync(path.join(directory, filename));
      if (stat.isSymbolicLink()) {
        fail("Symlinks are not allowed in website sources: " + filename);
      } else if (stat.isDirectory()) {
        if (filename !== ".well-known") fail("Unexpected website directory: " + filename);
        else visit(filename);
      } else if (!allowed.has(filename)) {
        fail("Unexpected website file (not exportable): " + filename);
      }
    }
  }
  visit();
  // Never follow a rejected source directory/symlink while inspecting expected assets.
  if (errors.length) return { errors, warnings };
  for (const filename of SITE_FILES) {
    const location = path.join(directory, filename);
    if (!fs.existsSync(location) || !fs.lstatSync(location).isFile()) {
      fail("Missing website asset: " + filename);
      continue;
    }
    if (fs.lstatSync(location).isSymbolicLink()) continue;
    contents[filename] = fs.readFileSync(location, "utf8");
    if (hasSecret(contents[filename])) {
      fail("Secret-like content must not be published: " + filename);
    }
    if (!filename.endsWith(".html")) continue;
    const html = contents[filename];
    if (/<script\b|<iframe\b|<form\b|\bon[a-z]+\s*=|javascript:/i.test(html)) {
      fail("Website must remain static, without scripts, forms or embedded services: " + filename);
    }
    for (const pattern of [
      /<!doctype html>/i, /<html lang="en">/i, /<main\b/i, /<h1\b/i,
      /name="viewport"/i, /name="referrer" content="no-referrer"/i
    ]) {
      if (!pattern.test(html)) fail("Missing document/accessibility/privacy markup: " + filename);
    }
    for (const match of html.matchAll(/href="([^"]+)"/g)) {
      const href = match[1];
      if (href.startsWith("#") || href.startsWith("https://")) continue;
      if (href.startsWith("mailto:")) {
        if (href !== "mailto:aasir.valji@hotmail.com") fail("Unexpected support contact: " + filename);
        continue;
      }
      const target = href === "/" ? "index.html" : href.replace(/^\//, "");
      if (!href.startsWith("/") || (!SITE_FILES.includes(target) && !SITE_FILES.includes(target + ".html"))) {
        fail("Broken or unsupported website link in " + filename + ": " + href);
      }
    }
    const placeholders = Array.from(new Set(html.match(/\[[A-Z][A-Z0-9_]*\]/g) || []));
    if (placeholders.length || /\bdraft\b/i.test(html)) {
      const message = "Owner approval/content required for " + filename +
        (placeholders.length ? ": " + placeholders.join(", ") : " (draft notice remains)");
      (options.publish ? errors : warnings).push(message);
    }
  }
  for (const filename of ["privacy.html", "terms.html"]) {
    if (contents[filename] && (!contents[filename].includes("Aasir Valji") ||
        !contents[filename].includes("mailto:aasir.valji@hotmail.com"))) {
      fail("Confirmed operator/contact details are missing: " + filename);
    }
  }

  try {
    const association = JSON.parse(contents[ASSOCIATION_FILE]);
    const details = association.applinks.details;
    if (!Array.isArray(details) || details.length !== 1 ||
        JSON.stringify(details[0].appIDs) !== JSON.stringify([APP_ID])) {
      fail("Apple association must identify exactly " + APP_ID);
    } else {
      const paths = details[0].components.map(component => component["/"]).sort();
      if (JSON.stringify(paths) !== JSON.stringify(["/group/*", "/invite/*"])) {
        fail("Apple association must cover exactly invitation and group links.");
      }
    }
  } catch (_) {
    fail("Apple association file is missing or invalid JSON.");
  }

  const headers = {};
  let route;
  for (const line of (contents._headers || "").split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (line.startsWith("/")) {
      route = line.trim();
      if (headers[route]) fail("Duplicate header route: " + route);
      headers[route] = {};
    } else {
      const match = line.match(/^\s+([^:]+):\s*(.+)$/);
      if (!route || !match) { fail("Invalid Cloudflare header configuration."); continue; }
      const key = match[1].toLowerCase();
      if (headers[route][key]) fail("Duplicate header: " + key);
      headers[route][key] = match[2];
    }
  }
  const general = headers["/*"] || {};
  if (general["referrer-policy"] !== "no-referrer") fail("Invitation URLs must not be sent as referrers.");
  if (general["x-content-type-options"] !== "nosniff") fail("Missing content-type protection.");
  if (general["x-frame-options"] !== "DENY") fail("Missing framing protection.");
  if (general["x-robots-tag"] !== "noindex, nofollow") fail("Pre-release website/invites must not be indexed.");
  const policy = general["content-security-policy"] || "";
  for (const directive of [
    "default-src 'none'", "style-src 'self'", "base-uri 'none'",
    "form-action 'none'", "frame-ancestors 'none'"
  ]) {
    if (!policy.split(";").some(value => value.trim() === directive)) {
      fail("Missing restrictive CSP directive: " + directive);
    }
  }
  const associationHeaders = headers["/" + ASSOCIATION_FILE] || {};
  if (associationHeaders["content-type"] !== "application/json") {
    fail("Apple association must have Content-Type: application/json.");
  }
  if (Object.keys(headers).some(key => !["/*", "/" + ASSOCIATION_FILE].includes(key))) {
    fail("Unexpected Cloudflare header route; review before publication.");
  }

  const routes = (contents._redirects || "").split(/\r?\n/)
    .filter(line => line.trim() && !line.trim().startsWith("#"))
    .map(line => line.trim().split(/\s+/).join(" "));
  if (JSON.stringify(routes.sort()) !== JSON.stringify([
    "/group/* /group 200", "/invite/* /invite 200"
  ])) {
    fail("Only the approved invitation/group internal 200 proxies are allowed; never redirect Apple association.");
  }
  return { errors, warnings };
}

function main() {
  const args = process.argv.slice(2);
  let directory = path.resolve(__dirname, "../public");
  let publish = false;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--publish") publish = true;
    else if (args[index] === "--site" && args[index + 1]) directory = path.resolve(args[++index]);
    else {
      console.error("Usage: node verify.cjs [--site DIRECTORY] [--publish]");
      process.exitCode = 2;
      return;
    }
  }
  const result = verifySite(directory, { publish });
  for (const warning of result.warnings) console.log("REVIEW: " + warning);
  for (const error of result.errors) console.error("BLOCKED: " + error);
  if (result.errors.length) { process.exitCode = 1; return; }
  console.log("WEBSITE CHECKS PASSED (" + (publish ? "publication content checks" : "local; drafts permitted") + ").");
}

module.exports = { APP_ID, SITE_FILES, hasSecret, verifySite };
if (require.main === module) main();
