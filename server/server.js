require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const http = require("http");
const multer = require("multer");
const app = express();
const server = http.createServer(app);

// Render puts the app behind a reverse proxy -- without this, req.ip (and
// therefore every rate limiter below, plus the login IP logging in
// authController.js) sees Render's internal proxy address instead of the
// real client, which would bucket every user under one shared IP.
app.set("trust proxy", 1);

app.use(
  helmet({
    // This is a JSON API consumed by a separate frontend origin (and it
    // serves uploaded document/announcement attachments to that same
    // frontend) -- helmet's default same-site CORP would block those
    // cross-origin resource loads.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// CORS must be registered before the rate limiters (and everything else
// that can reject a request) -- otherwise a blocked request's response
// (e.g. a rate limiter's 429) skips this middleware entirely and comes
// back with no Access-Control-Allow-Origin header, which the browser then
// reports to the frontend as an opaque CORS failure instead of surfacing
// the actual "too many requests" JSON body.
const allowedOrigins = (
  process.env.CLIENT_ORIGINS ||
  "https://capstone-oams-ucpnc.onrender.com,http://localhost:5173"
)
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

// General API throttle -- a backstop against scraping/abuse on top of the
// per-account login lockout in authController.js, which only covers the
// login endpoint itself. Kept generous (not a precision defense) because
// this is keyed per IP and a whole college's computer lab or campus wifi
// can sit behind one shared public IP -- this only needs to catch traffic
// that's orders of magnitude above real concurrent usage, not tighten
// around it.
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again shortly." },
});
// Tighter limit on auth endpoints specifically -- blunts a distributed
// (many-username, one-IP) credential-stuffing attempt that the per-account
// lockout alone wouldn't catch until each individual account had already
// failed 3 times. skipSuccessfulRequests matters a lot here: several
// colleges' students/faculty can share one public IP (a computer lab,
// campus wifi behind one NAT), so this must only count failures -- a
// stream of successful logins from that shared IP must never itself burn
// the budget and lock out the rest of the lab.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many attempts. Please try again later." },
});
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter);

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
