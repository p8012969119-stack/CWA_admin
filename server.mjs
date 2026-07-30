import { createReadStream } from "node:fs";
import { stat, readFile, writeFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, basename } from "node:path";

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

  if (!fileStat.isFile()) {
    throw new Error("Not a file");
  }

  res.writeHead(200, {
    "Content-Length": fileStat.size,
    "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
  });

  const stream = createReadStream(filePath);
  stream.on("error", () => {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Server error");
  });
  stream.pipe(res);
};

const dataDir = resolve("data");
const commentsFile = join(dataDir, "comments.json");
const usersFile = join(dataDir, "users.json");

async function ensureDataFiles() {
  await mkdir(dataDir, { recursive: true });
  try {
    await stat(commentsFile);
  } catch {
    await writeFile(commentsFile, JSON.stringify([], null, 2), "utf8");
  }
  try {
    await stat(usersFile);
  } catch {
    // example user with admin role
    const defaultUsers = [
      { id: 1, name: "Admin", role: "admin" },
      { id: 2, name: "User", role: "user" },
    ];
    await writeFile(usersFile, JSON.stringify(defaultUsers, null, 2), "utf8");
  }
}

async function readData(file) {
  const txt = await readFile(file, "utf8");
  return JSON.parse(txt || "[]");
}

async function writeData(file, data) {
  await writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

const server = createServer(async (req, res) => {
  try {
    await ensureDataFiles();

    const url = new URL(req.url || "/", "http://localhost");
    const pathname = normalize(decodeURIComponent(url.pathname)).replace(/^([.]{2}[\/\\])+/, "");

    // API routes
    if (pathname.startsWith("/api/")) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      // COMMENTS
      if (pathname === "/api/comments" && req.method === "GET") {
        const comments = await readData(commentsFile);
        res.writeHead(200);
        res.end(JSON.stringify(comments));
        return;
      }

      if (pathname.startsWith("/api/comments/") && (req.method === "PUT" || req.method === "DELETE")) {
        const id = Number(basename(pathname));
        const comments = await readData(commentsFile);
        const idx = comments.findIndex(c => c.id === id);
        if (idx === -1) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "Not found" }));
          return;
        }

        if (req.method === "DELETE") {
          // mark hidden
          comments[idx].hidden = true;
          await writeData(commentsFile, comments);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
          return;
        }

        // PUT update
        let body = "";
        for await (const chunk of req) body += chunk;
        const payload = body ? JSON.parse(body) : {};
        comments[idx] = { ...comments[idx], ...payload };
        await writeData(commentsFile, comments);
        res.writeHead(200);
        res.end(JSON.stringify(comments[idx]));
        return;
      }

      // USERS
      if (pathname === "/api/users" && req.method === "GET") {
        const users = await readData(usersFile);
        res.writeHead(200);
        res.end(JSON.stringify(users));
        return;
      }

      if (pathname.startsWith("/api/users/") && req.method === "PUT") {
        const id = Number(basename(pathname));
        const users = await readData(usersFile);
        const idx = users.findIndex(u => u.id === id);
        if (idx === -1) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "Not found" }));
          return;
        }
        let body = "";
        for await (const chunk of req) body += chunk;
        const payload = body ? JSON.parse(body) : {};
        users[idx] = { ...users[idx], ...payload };
        await writeData(usersFile, users);
        res.writeHead(200);
        res.end(JSON.stringify(users[idx]));
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: "Unknown API route" }));
      return;
    }

    // Static file handling (serve public/index.html for SPA fallback)
    let filePath = join(publicDir, pathname === "/" ? "index.html" : pathname);

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
