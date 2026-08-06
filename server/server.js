require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const multer = require("multer");
const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json());

// Routes
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/studentRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { startNoShowSweeper } = require("./jobs/queueNoShowSweeper");
const { startExpirySweeper } = require("./jobs/queueExpirySweeper");
const { startDocumentPickupSweeper } = require("./jobs/documentPickupSweeper");
const { startAppointmentReminderSweeper } = require("./jobs/appointmentReminderSweeper");
const { initSocketServer } = require("./sockets");

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/admin", adminRoutes);

// Surfaces multer upload failures (file too large, too many files, or an
// unsupported type from upload.js's fileFilter) as a clear 400 instead of
// falling through to Express's generic 500/HTML error page.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Each file must be 10MB or smaller" });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ error: "You can attach up to 5 files" });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err && err.message === "That file type isn't supported") {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

initSocketServer(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

startNoShowSweeper();
startExpirySweeper();
startDocumentPickupSweeper();
startAppointmentReminderSweeper();
