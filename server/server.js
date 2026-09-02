require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const multer = require("multer");
const app = express();
const server = http.createServer(app);

const allowedOrigins = (
  process.env.CLIENT_ORIGINS ||
  "https://capstone-coams-pnc.onrender.com")
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
// Without this, a request sent with the wrong Content-Type (e.g. a client
// bug sending form-encoded instead of JSON) left `req.body` `undefined`
// instead of `{}`, since no parser matched it at all -- every route handler
// that destructures `req.body` then threw a raw, uncaught TypeError.
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/studentRoutes");
const professorRoutes = require("./routes/professorRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { sendServerError } = require("./utils/errorResponse");
const { startNoShowSweeper } = require("./jobs/queueNoShowSweeper");
const { startExpirySweeper } = require("./jobs/queueExpirySweeper");
const { startDocumentPickupSweeper } = require("./jobs/documentPickupSweeper");
const {
  startDocumentSubmissionStaleSweeper,
} = require("./jobs/documentSubmissionStaleSweeper");
const {
  startAppointmentReminderSweeper,
} = require("./jobs/appointmentReminderSweeper");
const { initSocketServer } = require("./sockets");

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/professor", professorRoutes);
app.use("/api/admin", adminRoutes);

// Surfaces multer upload failures (file too large, too many files, or an
// unsupported type from upload.js's fileFilter) as a clear 400 instead of
// falling through to Express's generic 500/HTML error page.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "Each file must be 10MB or smaller" });
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

// Catch-all: anything not already handled above (malformed JSON from
// express.json(), or an uncaught synchronous exception in a route handler)
// previously fell through to Express's default handler, which renders a
// full HTML stack trace -- including real server file paths -- instead of
// a clean JSON error. This must stay the LAST middleware registered.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed request body" });
  }
  sendServerError(res, err, "Unhandled error");
});

initSocketServer(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

startNoShowSweeper();
startExpirySweeper();
startDocumentPickupSweeper();
startDocumentSubmissionStaleSweeper();
startAppointmentReminderSweeper();
