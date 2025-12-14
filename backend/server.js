const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

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

// -------------------- POSTS --------------------


app.get("/api/posts", (req, res) => {
  db.all(
    `SELECT id, title, content, author, createdAt
     FROM posts
     ORDER BY datetime(createdAt) DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "DB_ERROR" });
      res.json(rows);
    }
  );
});


app.get("/api/posts/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "BAD_ID" });

  db.get(
    `SELECT id, title, content, author, createdAt
     FROM posts
     WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ error: "DB_ERROR" });
      if (!row) return res.status(404).json({ error: "NOT_FOUND" });
      res.json(row);
    }
  );
});


app.post("/api/posts", (req, res) => {
  const { title, content, author } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: "MISSING_FIELDS" });

  const safeAuthor = (author && String(author).trim()) ? String(author).trim() : "Administrator";
  const createdAt = new Date().toISOString();

  db.run(
    `INSERT INTO posts (title, content, author, createdAt)
     VALUES (?, ?, ?, ?)`,
    [String(title).trim(), String(content).trim(), safeAuthor, createdAt],
    function (err) {
      if (err) return res.status(500).json({ error: "DB_ERROR" });

      res.status(201).json({
        id: this.lastID,
        title: String(title).trim(),
        content: String(content).trim(),
        author: safeAuthor,
        createdAt,
      });
    }
  );
});

// PUT /api/posts/:id (update)
app.put("/api/posts/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "BAD_ID" });

  const { title, content, author } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: "MISSING_FIELDS" });

  const safeAuthor = (author && String(author).trim()) ? String(author).trim() : "Administrator";

  db.run(
    `UPDATE posts
     SET title = ?, content = ?, author = ?
     WHERE id = ?`,
    [String(title).trim(), String(content).trim(), safeAuthor, id],
    function (err) {
      if (err) return res.status(500).json({ error: "DB_ERROR" });
      if (this.changes === 0) return res.status(404).json({ error: "NOT_FOUND" });

      res.json({ id, title: String(title).trim(), content: String(content).trim(), author: safeAuthor });
    }
  );
});


app.delete("/api/posts/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "BAD_ID" });

  // сначала удалим комментарии (на всякий случай, если FK не сработает)
  db.run(`DELETE FROM comments WHERE postId = ?`, [id], (err) => {
    if (err) return res.status(500).json({ error: "DB_ERROR" });

    db.run(`DELETE FROM posts WHERE id = ?`, [id], function (err2) {
      if (err2) return res.status(500).json({ error: "DB_ERROR" });
      if (this.changes === 0) return res.status(404).json({ error: "NOT_FOUND" });
      res.status(204).send();
    });
  });
});

// -------------------- COMMENTS --------------------


app.get("/api/posts/:id/comments", (req, res) => {
  const postId = Number(req.params.id);
  if (!postId) return res.status(400).json({ error: "BAD_ID" });

  db.all(
    `SELECT id, postId, author, content, createdAt
     FROM comments
     WHERE postId = ?
     ORDER BY datetime(createdAt) ASC`,
    [postId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "DB_ERROR" });
      res.json(rows);
    }
  );
});


app.post("/api/posts/:id/comments", (req, res) => {
  const postId = Number(req.params.id);
  if (!postId) return res.status(400).json({ error: "BAD_ID" });

  const { content, author } = req.body || {};
  if (!content) return res.status(400).json({ error: "MISSING_FIELDS" });

  const safeAuthor = (author && String(author).trim()) ? String(author).trim() : "Gość";
  const createdAt = new Date().toISOString();

  
  db.get(`SELECT id FROM posts WHERE id = ?`, [postId], (err, row) => {
    if (err) return res.status(500).json({ error: "DB_ERROR" });
    if (!row) return res.status(404).json({ error: "POST_NOT_FOUND" });

    db.run(
      `INSERT INTO comments (postId, author, content, createdAt)
       VALUES (?, ?, ?, ?)`,
      [postId, safeAuthor, String(content).trim(), createdAt],
      function (err2) {
        if (err2) return res.status(500).json({ error: "DB_ERROR" });

        res.status(201).json({
          id: this.lastID,
          postId,
          author: safeAuthor,
          content: String(content).trim(),
          createdAt,
        });
      }
    );
  });
});


app.delete("/api/comments/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "BAD_ID" });

  db.run(`DELETE FROM comments WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ error: "DB_ERROR" });
    if (this.changes === 0) return res.status(404).json({ error: "NOT_FOUND" });
    res.status(204).send();
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
