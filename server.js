require("dotenv").config();
const app = require("./src/app");
const db = require("./src/config/db");

const PORT = process.env.PORT || 3000;

console.log("DB_HOST:", JSON.stringify(process.env.DB_HOST));
console.log("DB_PORT:", JSON.stringify(process.env.DB_PORT));
console.log("DB_USER:", JSON.stringify(process.env.DB_USER));
console.log("DB_NAME:", JSON.stringify(process.env.DB_NAME));

console.log("MYSQLHOST:", JSON.stringify(process.env.MYSQLHOST));
console.log("MYSQLPORT:", JSON.stringify(process.env.MYSQLPORT));
console.log("MYSQLUSER:", JSON.stringify(process.env.MYSQLUSER));
console.log("MYSQLDATABASE:", JSON.stringify(process.env.MYSQLDATABASE));


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
