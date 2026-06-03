# GitHub Profile Analyzer API

A production-ready REST API that fetches a GitHub user's public profile, analyzes key insights from their repositories, and persists everything in a structured MySQL database — with snapshot history on every re-analysis.

---

## Features

| Feature | Details |
|---|---|
| **Profile Analysis** | Fetches user details + all public repos in one call |
| **Rich Insights** | Stars, forks, followers, language distribution, top repos, account age |
| **Influence Score** | Composite metric: `stars×2 + forks + followers` |
| **Snapshot History** | Every re-analysis appends a new stats row (trend tracking) |
| **Pagination & Sorting** | List endpoint supports page/limit/sortBy/order |
| **Input Validation** | Username format validated before hitting GitHub API |
| **Rate Limiting** | 100 req / 15 min globally; supports GitHub token for higher API limits |
| **Security** | Helmet headers, CORS, structured error responses |

---

## Tech Stack

- **Runtime:** Node.js  
- **Framework:** Express.js  
- **Database:** MySQL (via `mysql2/promise`)  
- **External API:** GitHub REST API v3  
- **Libraries:** axios, dotenv, helmet, cors, express-rate-limit, express-validator, morgan

---

## Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- (Optional) GitHub Personal Access Token — dramatically increases rate limits from 60 to 5000 req/hr

### 1. Clone the repository
```bash
git clone https://github.com/your-username/github-profile-analyzer.git
cd github-profile-analyzer
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=github_analyzer

# Optional but recommended
GITHUB_TOKEN=ghp_your_token_here
```

> **Get a GitHub token:** Go to https://github.com/settings/tokens → Generate new token (classic) → No scopes needed for public data.

### 4. Create the MySQL database
The app auto-creates all tables on first start. Just make sure your MySQL user has `CREATE DATABASE` privilege, or create the DB manually:

```sql
CREATE DATABASE github_analyzer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

You can also run the full schema manually:
```bash
mysql -u root -p < docs/schema.sql
```

### 5. Start the server
```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

---

## API Reference

Base URL: `http://localhost:3000`

### `GET /health`
Health check.

---

### `POST /api/profiles/analyze/:username`
Fetch a GitHub profile, compute insights, and store results. Safe to call multiple times — updates profile info and appends a new stats snapshot.

**Example:**
```
POST /api/profiles/analyze/torvalds
```

**Response:**
```json
{
  "success": true,
  "message": "Profile analyzed and stored successfully.",
  "data": {
    "profile": { "github_username": "torvalds", "name": "Linus Torvalds", ... },
    "stats": { "public_repos": 6, "followers": 218000, "total_stars": 22000, ... },
    "languages": [{ "language": "C", "repo_count": 4 }, ...],
    "topRepos": [{ "repo_name": "linux", "stars": 18000, ... }, ...],
    "activity": { "influence_score": 262000, "account_age_days": 5200, ... },
    "statsHistory": [...]
  }
}
```

---

### `GET /api/profiles`
List all analyzed profiles with latest stats snapshot.

**Query params:**

| Param | Default | Options |
|---|---|---|
| `page` | 1 | any int |
| `limit` | 20 | 1–100 |
| `sortBy` | `analyzed_at` | `analyzed_at`, `followers`, `stars`, `username` |
| `order` | `desc` | `asc`, `desc` |

---

### `GET /api/profiles/:username`
Get a single profile's full analysis, including stats history.

---

### `DELETE /api/profiles/:username`
Remove a stored profile and all its related data.

---

## Database Schema

Five normalized tables:

```
profiles           — core identity (bio, location, company, etc.)
profile_stats      — quantitative snapshot per analysis (history-capable)
top_languages      — language distribution across all repos
top_repos          — top 5 repos by star count
activity_summary   — derived metrics: influence score, account age, averages
```

See [`docs/schema.sql`](docs/schema.sql) for the full DDL.

---

## Postman Collection

Import [`docs/postman_collection.json`](docs/postman_collection.json) into Postman.  
Set the `base_url` variable to your deployed URL.

---

## Project Structure

```
github-profile-analyzer/
├── server.js                        # Entry point (DB init + listen)
├── src/
│   ├── app.js                       # Express app setup
│   ├── config/
│   │   └── db.js                    # MySQL pool + schema init
│   ├── routes/
│   │   └── profile.routes.js        # Route definitions + validation
│   ├── controllers/
│   │   └── profile.controller.js    # Request/response handlers
│   ├── services/
│   │   ├── github.service.js        # GitHub API client
│   │   ├── analyzer.service.js      # Insight computation logic
│   │   └── profile.repository.js    # All database queries
│   └── middleware/
│       └── error.middleware.js      # Global error handler
├── docs/
│   ├── schema.sql                   # Full DB schema export
│   └── postman_collection.json      # Postman collection
├── .env.example
└── README.md
```

---

## Deployment Notes (Railway / Render / Fly.io)

1. Set all env vars from `.env.example` in your platform's dashboard.
2. Use the platform's managed MySQL add-on (Railway / PlanetScale / Clever Cloud).
3. Set `PORT` to whatever the platform injects (most inject it automatically).
4. The app auto-creates tables on boot — no migration step needed.
