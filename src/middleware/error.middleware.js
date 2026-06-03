function errorHandler(err, req, res, next) {
  console.error("Unhandled error:", err.message);

  // Axios / GitHub API errors
  if (err.response) {
    return res.status(err.response.status || 502).json({
      success: false,
      message: err.response.data?.message || "External API error",
    });
  }

  // MySQL errors
  if (err.code && err.code.startsWith("ER_")) {
    return res.status(500).json({ success: false, message: "Database error: " + err.message });
  }

  res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
}

module.exports = { errorHandler };
