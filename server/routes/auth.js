const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/authMiddleware");

// POST /api/auth/login
router.post("/login", authController.login);

// GET /api/auth/me - Get current user profile details
router.get("/me", authenticateToken, authController.getCurrentUser);

// POST /api/auth/logout
router.post("/logout", authController.logout);

// POST /api/auth/push-token - Register/refresh this device's Expo push token
router.post("/push-token", authenticateToken, authController.registerPushToken);

module.exports = router;
