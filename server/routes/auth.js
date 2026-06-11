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

module.exports = router;
