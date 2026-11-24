require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

const origins = (process.env.CLIENT_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origins.length === 0 || origins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS"));
    }
  })
);

app.use(express.json());

// Readable HTML API guide at GET /
app.get("/", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Campus Maintenance Requests API Guide</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 860px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { border: 1px solid #cbd5e1; padding: 0.5rem 0.65rem; text-align: left; }
    th { background: #f1f5f9; }
    pre { background: #f8fafc; border: 1px solid #cbd5e1; padding: 0.75rem; overflow-x: auto; }
    code { background: #f1f5f9; padding: 0.1rem 0.3rem; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Campus Maintenance Requests — Backend API Guide</h1>
  <p><strong>Student Number:</strong> 202509450</p>
  <p><strong>Description:</strong> Independent REST API for managing campus maintenance requests (lighting, plumbing, furniture, and facility issues) backed by PostgreSQL.</p>
  <p><strong>Base URL:</strong> <code>${baseUrl}</code></p>
  <p>
    Quick links:
    <a href="${baseUrl}/health">/health</a> |
    <a href="${baseUrl}/api/records">/api/records</a>
  </p>

  <h2>Required Routes</h2>
  <table>
    <thead>
      <tr><th>Method</th><th>Route</th><th>Purpose</th></tr>
    </thead>
    <tbody>
      <tr><td>GET</td><td><code>/</code></td><td>API documentation guide</td></tr>
      <tr><td>GET</td><td><code>/health</code></td><td>Server and database health check</td></tr>
      <tr><td>GET</td><td><code>/api/records</code></td><td>List all maintenance records</td></tr>
      <tr><td>GET</td><td><code>/api/records/:id</code></td><td>Get a single record by positive integer ID</td></tr>
      <tr><td>POST</td><td><code>/api/records</code></td><td>Create a new record</td></tr>
      <tr><td>PUT</td><td><code>/api/records/:id</code></td><td>Replace all four editable fields of a record</td></tr>
      <tr><td>DELETE</td><td><code>/api/records/:id</code></td><td>Delete a record by ID</td></tr>
    </tbody>
  </table>

  <h2>Fields, Rules &amp; Sample JSON Body (POST / PUT)</h2>
  <ul>
    <li><code>title</code>: string, 3 to 80 characters after trimming</li>
    <li><code>category</code>: string, 2 to 40 characters after trimming</li>
    <li><code>description</code>: string, 5 to 300 characters after trimming</li>
    <li><code>status</code>: exact match — <code>Pending</code>, <code>In progress</code>, or <code>Completed</code></li>
  </ul>
  <pre>{
  "title": "Broken classroom light",
  "category": "Electrical",
  "description": "The light in Room B12 does not switch on.",
  "status": "Pending"
}</pre>

  <h2>Status Codes &amp; Hosting Note</h2>
  <p><strong>Success codes:</strong> <code>200 OK</code> (GET, PUT, DELETE), <code>201 Created</code> (POST).</p>
  <p><strong>Error codes:</strong> <code>400 Bad Request</code> (validation error or malformed JSON), <code>404 Not Found</code> (missing record or unknown route), <code>500 Internal Server Error</code>, <code>503 Service Unavailable</code> (if <code>/health</code> cannot reach the database).</p>
  <p><em>Note:</em> On free hosting plans (such as Render), an idle service may spin down and take extra time on the first request.</p>
</body>
</html>`);
});

// GET /health - Check server and database response
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check failed:", error.message);
    res.status(503).json({ status: "error", message: "Database unavailable." });
  }
});

// Mount record routes
app.use("/api/records", require("./routes/records"));

// 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

// 4-parameter error handler (malformed JSON -> 400, unexpected -> 500)
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ message: "Malformed JSON in request body." });
  }
  console.error("Unhandled server error:", error);
  res.status(500).json({ message: "Internal server error." });
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});