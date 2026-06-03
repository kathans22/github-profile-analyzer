const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const profileRoutes = require("./routes/profile.routes");
const { errorHandler } = require("./middleware/error.middleware");

const app = express();

// Security & utility middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Global rate limiter: 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many requests. Please try again later." },
});
app.use(limiter);

// Routes
app.use("/api/profiles", profileRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ success: true, message: "GitHub Profile Analyzer API is running", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
