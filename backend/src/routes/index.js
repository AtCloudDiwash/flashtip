const express = require("express");
const router = express.Router();
const authenticateJWT = require("../middleware/auth");

const authController = require("../controllers/authController");
const creatorController = require("../controllers/creatorController");
const transactionController = require("../controllers/transactionController");
const dashboardController = require("../controllers/dashboardController");
const aiController = require("../controllers/aiController");
const { SOLANA_NETWORK } = require("../config");

// Health check
router.get("/health", (_req, res) => {
    res.json({ status: "ok", network: SOLANA_NETWORK });
});

// Auth
router.post("/auth/login", authController.login);

// Creator
router.get("/creator/:channelName", creatorController.getCreator);

// Transaction
router.post("/build-transaction", transactionController.buildTransaction);
router.post("/record-tip", transactionController.recordTip);

// Dashboard
router.post("/dashboard/data", authenticateJWT, dashboardController.getDashboardData);
router.get("/dashboard/analytics/:channelName", dashboardController.getDashboardData);
router.post("/dashboard/create-indexes", authenticateJWT, dashboardController.createIndexes);

// AI
router.post("/ai/chat", authenticateJWT, aiController.chat);

module.exports = router;
