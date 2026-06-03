// const mysql = require("mysql2/promise");

// const pool = mysql.createPool({
//   host: process.env.DB_HOST || "localhost",
//   port: process.env.DB_PORT || 3306,
//   user: process.env.DB_USER || "root",
//   password: process.env.DB_PASSWORD || "",
//   database: process.env.DB_NAME || "github_analyzer",
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   timezone: "+00:00",
// });

// async function testConnection() {
//   const conn = await pool.getConnection();
//   conn.release();
// }

// async function initSchema() {
//   const conn = await pool.getConnection();
//   try {
//     // Create database if not exists
//     await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || "github_analyzer"}\``);
//     await conn.query(`USE \`${process.env.DB_NAME || "github_analyzer"}\``);

//     // profiles table
//     await conn.query(`
//       CREATE TABLE IF NOT EXISTS profiles (
//         id              INT AUTO_INCREMENT PRIMARY KEY,
//         github_username VARCHAR(100) NOT NULL UNIQUE,
//         name            VARCHAR(255),
//         bio             TEXT,
//         avatar_url      VARCHAR(500),
//         github_url      VARCHAR(500),
//         blog            VARCHAR(500),
//         company         VARCHAR(255),
//         location        VARCHAR(255),
//         email           VARCHAR(255),
//         twitter_handle  VARCHAR(100),
//         account_type    ENUM('User','Organization') DEFAULT 'User',
//         is_hireable     TINYINT(1) DEFAULT 0,
//         created_at_github DATETIME,
//         analyzed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
//         updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//         INDEX idx_username (github_username)
//       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
//     `);

//     // profile_stats table
//     await conn.query(`
//       CREATE TABLE IF NOT EXISTS profile_stats (
//         id                    INT AUTO_INCREMENT PRIMARY KEY,
//         profile_id            INT NOT NULL,
//         public_repos          INT DEFAULT 0,
//         public_gists          INT DEFAULT 0,
//         followers             INT DEFAULT 0,
//         following             INT DEFAULT 0,
//         total_stars           INT DEFAULT 0,
//         total_forks           INT DEFAULT 0,
//         total_watchers        INT DEFAULT 0,
//         total_open_issues     INT DEFAULT 0,
//         recorded_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
//         INDEX idx_profile_id (profile_id)
//       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
//     `);

//     // top_languages table
//     await conn.query(`
//       CREATE TABLE IF NOT EXISTS top_languages (
//         id           INT AUTO_INCREMENT PRIMARY KEY,
//         profile_id   INT NOT NULL,
//         language     VARCHAR(100) NOT NULL,
//         repo_count   INT DEFAULT 0,
//         recorded_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
//         INDEX idx_profile_lang (profile_id, language)
//       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
//     `);

//     // top_repos table
//     await conn.query(`
//       CREATE TABLE IF NOT EXISTS top_repos (
//         id            INT AUTO_INCREMENT PRIMARY KEY,
//         profile_id    INT NOT NULL,
//         repo_name     VARCHAR(255) NOT NULL,
//         repo_url      VARCHAR(500),
//         description   TEXT,
//         language      VARCHAR(100),
//         stars         INT DEFAULT 0,
//         forks         INT DEFAULT 0,
//         watchers      INT DEFAULT 0,
//         open_issues   INT DEFAULT 0,
//         is_fork       TINYINT(1) DEFAULT 0,
//         created_at_github DATETIME,
//         pushed_at     DATETIME,
//         recorded_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
//         INDEX idx_profile_id (profile_id)
//       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
//     `);

//     // activity_summary table
//     await conn.query(`
//       CREATE TABLE IF NOT EXISTS activity_summary (
//         id                      INT AUTO_INCREMENT PRIMARY KEY,
//         profile_id              INT NOT NULL,
//         recent_push_repos       INT DEFAULT 0,
//         avg_stars_per_repo      DECIMAL(10,2) DEFAULT 0,
//         avg_forks_per_repo      DECIMAL(10,2) DEFAULT 0,
//         original_repo_count     INT DEFAULT 0,
//         forked_repo_count       INT DEFAULT 0,
//         account_age_days        INT DEFAULT 0,
//         influence_score         DECIMAL(10,2) DEFAULT 0 COMMENT 'Custom score: stars*2 + forks + followers',
//         recorded_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
//         INDEX idx_profile_id (profile_id)
//       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
//     `);
//   } finally {
//     conn.release();
//   }
// }

// module.exports = { pool, testConnection, initSchema };

const mysql = require("mysql2/promise");

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "github_analyzer",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: "+00:00",
    });

    console.log("=== ENV CHECK ===");
    console.log("DB_HOST:", process.env.DB_HOST);
    console.log("DB_PORT:", process.env.DB_PORT);
    console.log("DB_USER:", process.env.DB_USER);
    console.log("DB_NAME:", process.env.DB_NAME);
    console.log("=================");
  }
  return pool;
}

async function testConnection() {
  const conn = await getPool().getConnection();
  conn.release();
}

async function initSchema() {
  const conn = await getPool().getConnection();
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || "github_analyzer"}\``);
    await conn.query(`USE \`${process.env.DB_NAME || "github_analyzer"}\``);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        github_username VARCHAR(100) NOT NULL UNIQUE,
        name            VARCHAR(255),
        bio             TEXT,
        avatar_url      VARCHAR(500),
        github_url      VARCHAR(500),
        blog            VARCHAR(500),
        company         VARCHAR(255),
        location        VARCHAR(255),
        email           VARCHAR(255),
        twitter_handle  VARCHAR(100),
        account_type    ENUM('User','Organization') DEFAULT 'User',
        is_hireable     TINYINT(1) DEFAULT 0,
        created_at_github DATETIME,
        analyzed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (github_username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS profile_stats (
        id                    INT AUTO_INCREMENT PRIMARY KEY,
        profile_id            INT NOT NULL,
        public_repos          INT DEFAULT 0,
        public_gists          INT DEFAULT 0,
        followers             INT DEFAULT 0,
        following             INT DEFAULT 0,
        total_stars           INT DEFAULT 0,
        total_forks           INT DEFAULT 0,
        total_watchers        INT DEFAULT 0,
        total_open_issues     INT DEFAULT 0,
        recorded_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
        INDEX idx_profile_id (profile_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS top_languages (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        profile_id   INT NOT NULL,
        language     VARCHAR(100) NOT NULL,
        repo_count   INT DEFAULT 0,
        recorded_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
        INDEX idx_profile_lang (profile_id, language)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS top_repos (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        profile_id    INT NOT NULL,
        repo_name     VARCHAR(255) NOT NULL,
        repo_url      VARCHAR(500),
        description   TEXT,
        language      VARCHAR(100),
        stars         INT DEFAULT 0,
        forks         INT DEFAULT 0,
        watchers      INT DEFAULT 0,
        open_issues   INT DEFAULT 0,
        is_fork       TINYINT(1) DEFAULT 0,
        created_at_github DATETIME,
        pushed_at     DATETIME,
        recorded_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
        INDEX idx_profile_id (profile_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS activity_summary (
        id                      INT AUTO_INCREMENT PRIMARY KEY,
        profile_id              INT NOT NULL,
        recent_push_repos       INT DEFAULT 0,
        avg_stars_per_repo      DECIMAL(10,2) DEFAULT 0,
        avg_forks_per_repo      DECIMAL(10,2) DEFAULT 0,
        original_repo_count     INT DEFAULT 0,
        forked_repo_count       INT DEFAULT 0,
        account_age_days        INT DEFAULT 0,
        influence_score         DECIMAL(10,2) DEFAULT 0 COMMENT 'Custom score: stars*2 + forks + followers',
        recorded_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
        INDEX idx_profile_id (profile_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } finally {
    conn.release();
  }
}

module.exports = { getPool, testConnection, initSchema };
