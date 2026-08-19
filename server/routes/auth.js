const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/authMiddleware");

// POST /api/auth/login
router.post("/login", authController.login);

// POST /api/auth/register/student, POST /api/auth/register/faculty
// Two separate endpoints on purpose -- each handler hardcodes its own role,
// never reading one from the request body, so the URL itself is the only
// thing that determines what kind of account gets created.
router.post("/register/student", authController.registerStudent);
router.post("/register/faculty", authController.registerFaculty);

// GET /api/auth/me - Get current user profile details
router.get("/me", authenticateToken, authController.getCurrentUser);

// POST /api/auth/logout
router.post("/logout", authController.logout);

// POST /api/auth/push-token - Register/refresh this device's Expo push token
router.post("/push-token", authenticateToken, authController.registerPushToken);

module.exports = router;
