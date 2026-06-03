require("dotenv").config();
const app = require("./src/app");
const db = require("./src/config/db");

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    await db.testConnection();
    console.log("✅ MySQL connected successfully");

    await db.initSchema();
    console.log("✅ Database schema initialized");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    console.error("Full error:", err);
    process.exit(1);
  }
}

bootstrap();
