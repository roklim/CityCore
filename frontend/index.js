"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function mapPath(urlPath) {
  if (urlPath === "/" || urlPath === "") return "index.html";
  if (urlPath === "/admin") return "admin.html";
  if (urlPath === "/customer") return "customer.html";
  return urlPath.replace(/^\/+/, "");
}

function isSafePath(rootDir, filePath) {
  const relative = path.relative(rootDir, filePath);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

module.exports = async (req, res) => {
  const rootDir = __dirname;
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const relativePath = mapPath(url.pathname);
  const filePath = path.normalize(path.join(rootDir, relativePath));

  if (!isSafePath(rootDir, filePath)) {
    res.statusCode = 403;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Forbidden" }));
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("content-type", MIME_TYPES[ext] || "application/octet-stream");
    res.end(file);
  } catch {
    res.statusCode = 404;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Not found" }));
  }
};
