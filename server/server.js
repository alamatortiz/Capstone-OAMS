require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/studentRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { startNoShowSweeper } = require("./jobs/queueNoShowSweeper");
const { startExpirySweeper } = require("./jobs/queueExpirySweeper");
const { initSocketServer } = require("./sockets");

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/admin", adminRoutes);

initSocketServer(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

startNoShowSweeper();
startExpirySweeper();

const pool = require("./db"); // your mysql2 pool connection

// Get current count
app.get("/api/counter", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT count_value FROM demo_counters WHERE counter_id = 1",
    );
    const count = rows.length ? rows[0].count_value : 0;
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Increment count
app.post("/api/counter/tap", async (req, res) => {
  try {
    await pool.query(
      "UPDATE demo_counters SET count_value = count_value + 1 WHERE counter_id = 1",
    );
    const [rows] = await pool.query(
      "SELECT count_value FROM demo_counters WHERE counter_id = 1",
    );
    res.json({ count: rows[0].count_value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
