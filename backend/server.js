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

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "Mini-Blog" });
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
    const title = String(req.body.title || "").trim();
    const content = String(req.body.content || "").trim();

    if (!title || !content) {
      return res.status(400).json({ error: "VALIDATION_ERROR" });
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
      "SELECT id, post_id, parent_id, author, content, created_at FROM comments WHERE post_id = ? ORDER BY created_at ASC, id ASC",
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

    const author = String(req.body.author || "").trim() || "Anonim";
    const content = String(req.body.content || "").trim();
    const parentIdRaw = req.body.parent_id;

    const parentId =
      parentIdRaw === null || parentIdRaw === undefined || parentIdRaw === ""
        ? null
        : Number(parentIdRaw);

    if (!content) return res.status(400).json({ error: "VALIDATION_ERROR" });
    if (parentId !== null && !Number.isFinite(parentId)) {
      return res.status(400).json({ error: "BAD_PARENT_ID" });
    }

    const exists = await get("SELECT id FROM posts WHERE id = ?", [postId]);
    if (!exists) return res.status(404).json({ error: "POST_NOT_FOUND" });

    if (parentId !== null) {
      const parent = await get(
        "SELECT id FROM comments WHERE id = ? AND post_id = ?",
        [parentId, postId]
      );
      if (!parent) return res.status(404).json({ error: "PARENT_NOT_FOUND" });
    }

    const result = await run(
      "INSERT INTO comments (post_id, parent_id, author, content) VALUES (?, ?, ?, ?)",
      [postId, parentId, author, content]
    );

    const comment = await get(
      "SELECT id, post_id, parent_id, author, content, created_at FROM comments WHERE id = ?",
      [result.lastID]
    );

    res.status(201).json(comment);
  } catch {
    res.status(500).json({ error: "DB_ERROR" });
  }
});

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(() => {
    process.exit(1);
  });
