import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const port = Number(process.env.PORT || 3000);
const publicDir = resolve("public");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const sendFile = async (res, filePath) => {
  const fileStat = await stat(filePath);
  res.writeHead(200, {
    "Content-Length": fileStat.size,
    "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(res);
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    const requestedPath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    let filePath = join(publicDir, requestedPath === "/" ? "index.html" : requestedPath);

    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    try {
      await sendFile(res, filePath);
    } catch {
      filePath = join(publicDir, "index.html");
      await sendFile(res, filePath);
    }
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(error.message || "Server error");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`CWA Admin running on port ${port}`);
});
