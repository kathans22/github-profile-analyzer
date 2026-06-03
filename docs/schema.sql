-- GitHub Profile Analyzer — Database Schema
-- Run this in your MySQL client to set up the database manually.
-- The app also auto-creates these tables on first start.

CREATE DATABASE IF NOT EXISTS github_analyzer
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE github_analyzer;

-- ─────────────────────────────────────────────────────────────
-- 1. profiles: core identity info from GitHub user object
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  github_username   VARCHAR(100) NOT NULL UNIQUE,
  name              VARCHAR(255),
  bio               TEXT,
  avatar_url        VARCHAR(500),
  github_url        VARCHAR(500),
  blog              VARCHAR(500),
  company           VARCHAR(255),
  location          VARCHAR(255),
  email             VARCHAR(255),
  twitter_handle    VARCHAR(100),
  account_type      ENUM('User','Organization') DEFAULT 'User',
  is_hireable       TINYINT(1) DEFAULT 0,
  created_at_github DATETIME,
  analyzed_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (github_username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 2. profile_stats: quantitative snapshot (stored per analysis,
--    enabling historical trend tracking)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profile_stats (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  profile_id        INT NOT NULL,
  public_repos      INT DEFAULT 0,
  public_gists      INT DEFAULT 0,
  followers         INT DEFAULT 0,
  following         INT DEFAULT 0,
  total_stars       INT DEFAULT 0,
  total_forks       INT DEFAULT 0,
  total_watchers    INT DEFAULT 0,
  total_open_issues INT DEFAULT 0,
  recorded_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_profile_id (profile_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 3. top_languages: programming languages used across all repos
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS top_languages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  profile_id  INT NOT NULL,
  language    VARCHAR(100) NOT NULL,
  repo_count  INT DEFAULT 0,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_profile_lang (profile_id, language)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 4. top_repos: top 5 repositories by star count
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS top_repos (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  profile_id        INT NOT NULL,
  repo_name         VARCHAR(255) NOT NULL,
  repo_url          VARCHAR(500),
  description       TEXT,
  language          VARCHAR(100),
  stars             INT DEFAULT 0,
  forks             INT DEFAULT 0,
  watchers          INT DEFAULT 0,
  open_issues       INT DEFAULT 0,
  is_fork           TINYINT(1) DEFAULT 0,
  created_at_github DATETIME,
  pushed_at         DATETIME,
  recorded_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_profile_id (profile_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 5. activity_summary: derived metrics & composite score
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_summary (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  profile_id           INT NOT NULL,
  recent_push_repos    INT DEFAULT 0    COMMENT 'Repos with a push in the last 30 days',
  avg_stars_per_repo   DECIMAL(10,2) DEFAULT 0,
  avg_forks_per_repo   DECIMAL(10,2) DEFAULT 0,
  original_repo_count  INT DEFAULT 0,
  forked_repo_count    INT DEFAULT 0,
  account_age_days     INT DEFAULT 0,
  influence_score      DECIMAL(10,2) DEFAULT 0 COMMENT 'stars*2 + forks + followers',
  recorded_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_profile_id (profile_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
