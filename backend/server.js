const express = require("express");
const cors = require("cors");
const path = require("path");
const { init, run, get, all } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, name: "Mini-Blog" });
});

app.get("/posts", async (req, res) => {
  try {
    const posts = await all(
      "SELECT id, title, content, created_at FROM posts ORDER BY id DESC"
    );
    res.json(posts);
  } catch {
    res.status(500).json({ error: "DB_ERROR" });
  }
});

app.get("/posts/:id", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    if (!Number.isFinite(postId)) return res.status(400).json({ error: "BAD_ID" });

    const post = await get(
      "SELECT id, title, content, created_at FROM posts WHERE id = ?",
      [postId]
    );

    if (!post) return res.status(404).json({ error: "POST_NOT_FOUND" });
    res.json(post);
  } catch {
    res.status(500).json({ error: "DB_ERROR" });
  }
});

app.post("/posts", async (req, res) => {
  try {
    const title = String(req.body?.title ?? "").trim();
    const content = String(req.body?.content ?? "").trim();

    if (!title || !content) {
      return res.status(400).json({ error: "TITLE_AND_CONTENT_REQUIRED" });
    }

    const result = await run(
      "INSERT INTO posts (title, content) VALUES (?, ?)",
      [title, content]
    );

    const post = await get(
      "SELECT id, title, content, created_at FROM posts WHERE id = ?",
      [result.lastID]
    );

    res.status(201).json(post);
  } catch {
    res.status(500).json({ error: "DB_ERROR" });
  }
});

app.get("/posts/:id/comments", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    if (!Number.isFinite(postId)) return res.status(400).json({ error: "BAD_ID" });

    const comments = await all(
      `SELECT id, post_id, parent_id, author, content, created_at
       FROM comments
       WHERE post_id = ?
       ORDER BY id DESC`,
      [postId]
    );

    res.json(comments);
  } catch {
    res.status(500).json({ error: "DB_ERROR" });
  }
});

app.post("/posts/:id/comments", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    if (!Number.isFinite(postId)) return res.status(400).json({ error: "BAD_ID" });

    const content = String(req.body?.content ?? "").trim();
    const author = String(req.body?.author ?? "").trim() || null;

    const parentIdRaw = req.body?.parentId ?? null;
    const parentId =
      parentIdRaw === null || parentIdRaw === undefined || parentIdRaw === ""
        ? null
        : Number(parentIdRaw);

    if (!content) return res.status(400).json({ error: "CONTENT_REQUIRED" });

    const postExists = await get("SELECT id FROM posts WHERE id = ?", [postId]);
    if (!postExists) return res.status(404).json({ error: "POST_NOT_FOUND" });

    if (parentId !== null) {
      if (!Number.isFinite(parentId)) return res.status(400).json({ error: "BAD_PARENT_ID" });

      const parent = await get(
        "SELECT id, post_id, parent_id FROM comments WHERE id = ?",
        [parentId]
      );

      if (!parent) return res.status(404).
