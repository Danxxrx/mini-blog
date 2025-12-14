const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = 3000;


app.use(cors());
app.use(express.json());


app.use(express.static(path.join(__dirname, "..", "frontend")));


app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});


app.get("/api/health", (req, res) => {
  res.json({ ok: true, name: "Mini-Blog" });
});




app.get("/api/posts", (req, res) => {
  db.all(
    "SELECT id, title, content, created_at FROM posts ORDER BY id DESC",
    (err, rows) => {
      if (err) return res.status(500).json({ error: "db_error" });
      res.json(rows);
    }
  );
});


app.post("/api/posts", (req, res) => {
  const title = (req.body.title || "").trim();
  const content = (req.body.content || "").trim();

  if (!title || !content) {
    return res.status(400).json({ error: "title_and_content_required" });
  }

  const createdAt = new Date().toISOString();

  db.run(
    "INSERT INTO posts (title, content, created_at) VALUES (?, ?, ?)",
    [title, content, createdAt],
    function (err) {
      if (err) return res.status(500).json({ error: "db_error" });
      res.json({ id: this.lastID, title, content, created_at: createdAt });
    }
  );
});



// get comments for post
app.get("/api/posts/:id/comments", (req, res) => {
  const postId = Number(req.params.id);

  db.all(
    "SELECT id, post_id, author, text, created_at FROM comments WHERE post_id = ? ORDER BY id DESC",
    [postId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "db_error" });
      res.json(rows);
    }
  );
});

// add comment to post
app.post("/api/posts/:id/comments", (req, res) => {
  const postId = Number(req.params.id);
  const author = (req.body.author || "Anon").trim();
  const text = (req.body.text || "").trim();

  if (!text) return res.status(400).json({ error: "text_required" });

  const createdAt = new Date().toISOString();

  db.run(
    "INSERT INTO comments (post_id, author, text, created_at) VALUES (?, ?, ?, ?)",
    [postId, author || "Anon", text, createdAt],
    function (err) {
      if (err) return res.status(500).json({ error: "db_error" });
      res.json({
        id: this.lastID,
        post_id: postId,
        author: author || "Anon",
        text,
        created_at: createdAt,
      });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Connected to SQLite database");
});
