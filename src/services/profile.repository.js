const { pool } = require("../config/db");

// ── Upsert profile ────────────────────────────────────────────────────────────
async function upsertProfile(user) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      "SELECT id FROM profiles WHERE github_username = ?",
      [user.login]
    );

    const data = {
      github_username: user.login,
      name: user.name || null,
      bio: user.bio || null,
      avatar_url: user.avatar_url || null,
      github_url: user.html_url || null,
      blog: user.blog || null,
      company: user.company || null,
      location: user.location || null,
      email: user.email || null,
      twitter_handle: user.twitter_username || null,
      account_type: user.type || "User",
      is_hireable: user.hireable ? 1 : 0,
      created_at_github: user.created_at ? new Date(user.created_at) : null,
      analyzed_at: new Date(),
    };

    if (rows.length > 0) {
      const id = rows[0].id;
      await conn.query(
        `UPDATE profiles SET
          name=?, bio=?, avatar_url=?, github_url=?, blog=?, company=?,
          location=?, email=?, twitter_handle=?, account_type=?,
          is_hireable=?, created_at_github=?, analyzed_at=?
         WHERE id=?`,
        [
          data.name, data.bio, data.avatar_url, data.github_url, data.blog,
          data.company, data.location, data.email, data.twitter_handle,
          data.account_type, data.is_hireable, data.created_at_github,
          data.analyzed_at, id,
        ]
      );
      return id;
    } else {
      const [result] = await conn.query(
        `INSERT INTO profiles
          (github_username, name, bio, avatar_url, github_url, blog, company,
           location, email, twitter_handle, account_type, is_hireable,
           created_at_github, analyzed_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          data.github_username, data.name, data.bio, data.avatar_url,
          data.github_url, data.blog, data.company, data.location, data.email,
          data.twitter_handle, data.account_type, data.is_hireable,
          data.created_at_github, data.analyzed_at,
        ]
      );
      return result.insertId;
    }
  } finally {
    conn.release();
  }
}

// ── Save stats ────────────────────────────────────────────────────────────────
async function saveStats(profileId, stats) {
  await pool.query(
    `INSERT INTO profile_stats
      (profile_id, public_repos, public_gists, followers, following,
       total_stars, total_forks, total_watchers, total_open_issues)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      profileId, stats.public_repos, stats.public_gists,
      stats.followers, stats.following, stats.total_stars,
      stats.total_forks, stats.total_watchers, stats.total_open_issues,
    ]
  );
}

// ── Save languages (replace previous) ────────────────────────────────────────
async function saveLanguages(profileId, languages) {
  const conn = await pool.getConnection();
  try {
    await conn.query("DELETE FROM top_languages WHERE profile_id = ?", [profileId]);
    for (const { language, repo_count } of languages) {
      await conn.query(
        "INSERT INTO top_languages (profile_id, language, repo_count) VALUES (?,?,?)",
        [profileId, language, repo_count]
      );
    }
  } finally {
    conn.release();
  }
}

// ── Save top repos (replace previous) ────────────────────────────────────────
async function saveTopRepos(profileId, repos) {
  const conn = await pool.getConnection();
  try {
    await conn.query("DELETE FROM top_repos WHERE profile_id = ?", [profileId]);
    for (const r of repos) {
      await conn.query(
        `INSERT INTO top_repos
          (profile_id, repo_name, repo_url, description, language,
           stars, forks, watchers, open_issues, is_fork,
           created_at_github, pushed_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          profileId, r.repo_name, r.repo_url, r.description, r.language,
          r.stars, r.forks, r.watchers, r.open_issues, r.is_fork,
          r.created_at_github, r.pushed_at,
        ]
      );
    }
  } finally {
    conn.release();
  }
}

// ── Save activity summary ─────────────────────────────────────────────────────
async function saveActivity(profileId, activity) {
  await pool.query(
    `INSERT INTO activity_summary
      (profile_id, recent_push_repos, avg_stars_per_repo, avg_forks_per_repo,
       original_repo_count, forked_repo_count, account_age_days, influence_score)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      profileId, activity.recent_push_repos, activity.avg_stars_per_repo,
      activity.avg_forks_per_repo, activity.original_repo_count,
      activity.forked_repo_count, activity.account_age_days, activity.influence_score,
    ]
  );
}

// ── Fetch all profiles (list) ─────────────────────────────────────────────────
async function getAllProfiles({ page = 1, limit = 20, sortBy = "analyzed_at", order = "desc" }) {
  const allowed = { analyzed_at: "p.analyzed_at", followers: "ps.followers", stars: "ps.total_stars", username: "p.github_username" };
  const col = allowed[sortBy] || "p.analyzed_at";
  const dir = order === "asc" ? "ASC" : "DESC";
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `SELECT p.id, p.github_username, p.name, p.avatar_url, p.location,
            p.account_type, p.analyzed_at,
            ps.followers, ps.public_repos, ps.total_stars, ps.total_forks,
            act.influence_score
     FROM profiles p
     LEFT JOIN profile_stats ps ON ps.profile_id = p.id
       AND ps.id = (SELECT MAX(id) FROM profile_stats WHERE profile_id = p.id)
     LEFT JOIN activity_summary act ON act.profile_id = p.id
       AND act.id = (SELECT MAX(id) FROM activity_summary WHERE profile_id = p.id)
     ORDER BY ${col} ${dir}
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM profiles");
  return { profiles: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ── Fetch single profile ──────────────────────────────────────────────────────
async function getProfileByUsername(username) {
  const [[profile]] = await pool.query(
    "SELECT * FROM profiles WHERE github_username = ?", [username]
  );
  if (!profile) return null;

  const [[stats]] = await pool.query(
    "SELECT * FROM profile_stats WHERE profile_id = ? ORDER BY id DESC LIMIT 1",
    [profile.id]
  );

  const [languages] = await pool.query(
    "SELECT language, repo_count FROM top_languages WHERE profile_id = ? ORDER BY repo_count DESC",
    [profile.id]
  );

  const [topRepos] = await pool.query(
    "SELECT * FROM top_repos WHERE profile_id = ? ORDER BY stars DESC",
    [profile.id]
  );

  const [[activity]] = await pool.query(
    "SELECT * FROM activity_summary WHERE profile_id = ? ORDER BY id DESC LIMIT 1",
    [profile.id]
  );

  // History: last 10 stat snapshots
  const [statsHistory] = await pool.query(
    "SELECT * FROM profile_stats WHERE profile_id = ? ORDER BY id DESC LIMIT 10",
    [profile.id]
  );

  return { profile, stats, languages, topRepos, activity, statsHistory };
}

// ── Delete profile ────────────────────────────────────────────────────────────
async function deleteProfile(username) {
  const conn = await pool.getConnection();
  try {
    const [[row]] = await conn.query(
      "SELECT id FROM profiles WHERE github_username = ?", [username]
    );
    if (!row) return false;
    await conn.query("DELETE FROM profiles WHERE id = ?", [row.id]);
    return true;
  } finally {
    conn.release();
  }
}

module.exports = {
  upsertProfile, saveStats, saveLanguages, saveTopRepos, saveActivity,
  getAllProfiles, getProfileByUsername, deleteProfile,
};



// const { getPool } = require("../config/db");

// // ── Upsert profile ────────────────────────────────────────────────────────────
// async function upsertProfile(user) {
//   const conn = await getPool().getConnection();
//   try {
//     const [rows] = await conn.query(
//       "SELECT id FROM profiles WHERE github_username = ?",
//       [user.login]
//     );

//     const data = {
//       github_username: user.login,
//       name: user.name || null,
//       bio: user.bio || null,
//       avatar_url: user.avatar_url || null,
//       github_url: user.html_url || null,
//       blog: user.blog || null,
//       company: user.company || null,
//       location: user.location || null,
//       email: user.email || null,
//       twitter_handle: user.twitter_username || null,
//       account_type: user.type || "User",
//       is_hireable: user.hireable ? 1 : 0,
//       created_at_github: user.created_at ? new Date(user.created_at) : null,
//       analyzed_at: new Date(),
//     };

//     if (rows.length > 0) {
//       const id = rows[0].id;
//       await conn.query(
//         `UPDATE profiles SET
//           name=?, bio=?, avatar_url=?, github_url=?, blog=?, company=?,
//           location=?, email=?, twitter_handle=?, account_type=?,
//           is_hireable=?, created_at_github=?, analyzed_at=?
//          WHERE id=?`,
//         [
//           data.name, data.bio, data.avatar_url, data.github_url, data.blog,
//           data.company, data.location, data.email, data.twitter_handle,
//           data.account_type, data.is_hireable, data.created_at_github,
//           data.analyzed_at, id,
//         ]
//       );
//       return id;
//     } else {
//       const [result] = await conn.query(
//         `INSERT INTO profiles
//           (github_username, name, bio, avatar_url, github_url, blog, company,
//            location, email, twitter_handle, account_type, is_hireable,
//            created_at_github, analyzed_at)
//          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
//         [
//           data.github_username, data.name, data.bio, data.avatar_url,
//           data.github_url, data.blog, data.company, data.location, data.email,
//           data.twitter_handle, data.account_type, data.is_hireable,
//           data.created_at_github, data.analyzed_at,
//         ]
//       );
//       return result.insertId;
//     }
//   } finally {
//     conn.release();
//   }
// }

// // ── Save stats ────────────────────────────────────────────────────────────────
// async function saveStats(profileId, stats) {
//   await getPool().query(
//     `INSERT INTO profile_stats
//       (profile_id, public_repos, public_gists, followers, following,
//        total_stars, total_forks, total_watchers, total_open_issues)
//      VALUES (?,?,?,?,?,?,?,?,?)`,
//     [
//       profileId, stats.public_repos, stats.public_gists,
//       stats.followers, stats.following, stats.total_stars,
//       stats.total_forks, stats.total_watchers, stats.total_open_issues,
//     ]
//   );
// }

// // ── Save languages (replace previous) ────────────────────────────────────────
// async function saveLanguages(profileId, languages) {
//   const conn = await getPool().getConnection();
//   try {
//     await conn.query("DELETE FROM top_languages WHERE profile_id = ?", [profileId]);
//     for (const { language, repo_count } of languages) {
//       await conn.query(
//         "INSERT INTO top_languages (profile_id, language, repo_count) VALUES (?,?,?)",
//         [profileId, language, repo_count]
//       );
//     }
//   } finally {
//     conn.release();
//   }
// }

// // ── Save top repos (replace previous) ────────────────────────────────────────
// async function saveTopRepos(profileId, repos) {
//   const conn = await getPool().getConnection();
//   try {
//     await conn.query("DELETE FROM top_repos WHERE profile_id = ?", [profileId]);
//     for (const r of repos) {
//       await conn.query(
//         `INSERT INTO top_repos
//           (profile_id, repo_name, repo_url, description, language,
//            stars, forks, watchers, open_issues, is_fork,
//            created_at_github, pushed_at)
//          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
//         [
//           profileId, r.repo_name, r.repo_url, r.description, r.language,
//           r.stars, r.forks, r.watchers, r.open_issues, r.is_fork,
//           r.created_at_github, r.pushed_at,
//         ]
//       );
//     }
//   } finally {
//     conn.release();
//   }
// }

// // ── Save activity summary ─────────────────────────────────────────────────────
// async function saveActivity(profileId, activity) {
//   await getPool().query(
//     `INSERT INTO activity_summary
//       (profile_id, recent_push_repos, avg_stars_per_repo, avg_forks_per_repo,
//        original_repo_count, forked_repo_count, account_age_days, influence_score)
//      VALUES (?,?,?,?,?,?,?,?)`,
//     [
//       profileId, activity.recent_push_repos, activity.avg_stars_per_repo,
//       activity.avg_forks_per_repo, activity.original_repo_count,
//       activity.forked_repo_count, activity.account_age_days, activity.influence_score,
//     ]
//   );
// }

// // ── Fetch all profiles (list) ─────────────────────────────────────────────────
// async function getAllProfiles({ page = 1, limit = 20, sortBy = "analyzed_at", order = "desc" }) {
//   const allowed = { analyzed_at: "p.analyzed_at", followers: "ps.followers", stars: "ps.total_stars", username: "p.github_username" };
//   const col = allowed[sortBy] || "p.analyzed_at";
//   const dir = order === "asc" ? "ASC" : "DESC";
//   const offset = (page - 1) * limit;

//   const [rows] = await getPool().query(
//     `SELECT p.id, p.github_username, p.name, p.avatar_url, p.location,
//             p.account_type, p.analyzed_at,
//             ps.followers, ps.public_repos, ps.total_stars, ps.total_forks,
//             act.influence_score
//      FROM profiles p
//      LEFT JOIN profile_stats ps ON ps.profile_id = p.id
//        AND ps.id = (SELECT MAX(id) FROM profile_stats WHERE profile_id = p.id)
//      LEFT JOIN activity_summary act ON act.profile_id = p.id
//        AND act.id = (SELECT MAX(id) FROM activity_summary WHERE profile_id = p.id)
//      ORDER BY ${col} ${dir}
//      LIMIT ? OFFSET ?`,
//     [limit, offset]
//   );

//   const [[{ total }]] = await getPool().query("SELECT COUNT(*) AS total FROM profiles");
//   return { profiles: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
// }

// // ── Fetch single profile ──────────────────────────────────────────────────────
// async function getProfileByUsername(username) {
//   const [[profile]] = await getPool().query(
//     "SELECT * FROM profiles WHERE github_username = ?", [username]
//   );
//   if (!profile) return null;

//   const [[stats]] = await getPool().query(
//     "SELECT * FROM profile_stats WHERE profile_id = ? ORDER BY id DESC LIMIT 1",
//     [profile.id]
//   );

//   const [languages] = await getPool().query(
//     "SELECT language, repo_count FROM top_languages WHERE profile_id = ? ORDER BY repo_count DESC",
//     [profile.id]
//   );

//   const [topRepos] = await getPool().query(
//     "SELECT * FROM top_repos WHERE profile_id = ? ORDER BY stars DESC",
//     [profile.id]
//   );

//   const [[activity]] = await getPool().query(
//     "SELECT * FROM activity_summary WHERE profile_id = ? ORDER BY id DESC LIMIT 1",
//     [profile.id]
//   );

//   // History: last 10 stat snapshots
//   const [statsHistory] = await getPool().query(
//     "SELECT * FROM profile_stats WHERE profile_id = ? ORDER BY id DESC LIMIT 10",
//     [profile.id]
//   );

//   return { profile, stats, languages, topRepos, activity, statsHistory };
// }

// // ── Delete profile ────────────────────────────────────────────────────────────
// async function deleteProfile(username) {
//   const conn = await getPool().getConnection();
//   try {
//     const [[row]] = await conn.query(
//       "SELECT id FROM profiles WHERE github_username = ?", [username]
//     );
//     if (!row) return false;
//     await conn.query("DELETE FROM profiles WHERE id = ?", [row.id]);
//     return true;
//   } finally {
//     conn.release();
//   }
// }

// module.exports = {
//   upsertProfile, saveStats, saveLanguages, saveTopRepos, saveActivity,
//   getAllProfiles, getProfileByUsername, deleteProfile,
// };
