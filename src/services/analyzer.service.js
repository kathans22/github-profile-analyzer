/**
 * Derives all computed insights from raw GitHub user + repos data.
 */
function analyzeProfile(user, repos) {
  // ── Language distribution ─────────────────────────────────────────────────
  const langMap = {};
  repos.forEach((r) => {
    if (r.language) {
      langMap[r.language] = (langMap[r.language] || 0) + 1;
    }
  });
  const topLanguages = Object.entries(langMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([language, repo_count]) => ({ language, repo_count }));

  // ── Aggregated repo stats ─────────────────────────────────────────────────
  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
  const totalForks = repos.reduce((s, r) => s + r.forks_count, 0);
  const totalWatchers = repos.reduce((s, r) => s + r.watchers_count, 0);
  const totalOpenIssues = repos.reduce((s, r) => s + r.open_issues_count, 0);

  // ── Top 5 repos by stars ──────────────────────────────────────────────────
  const topRepos = [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5)
    .map((r) => ({
      repo_name: r.name,
      repo_url: r.html_url,
      description: r.description || null,
      language: r.language || null,
      stars: r.stargazers_count,
      forks: r.forks_count,
      watchers: r.watchers_count,
      open_issues: r.open_issues_count,
      is_fork: r.fork ? 1 : 0,
      created_at_github: r.created_at ? new Date(r.created_at) : null,
      pushed_at: r.pushed_at ? new Date(r.pushed_at) : null,
    }));

  // ── Activity summary ──────────────────────────────────────────────────────
  const now = new Date();
  const createdAt = new Date(user.created_at);
  const accountAgeDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const recentPushRepos = repos.filter(
    (r) => r.pushed_at && new Date(r.pushed_at) >= thirtyDaysAgo
  ).length;

  const originalRepos = repos.filter((r) => !r.fork);
  const forkedRepos = repos.filter((r) => r.fork);

  const avgStarsPerRepo = repos.length > 0 ? (totalStars / repos.length).toFixed(2) : 0;
  const avgForksPerRepo = repos.length > 0 ? (totalForks / repos.length).toFixed(2) : 0;

  // Influence score: a simple composite metric
  const influenceScore = (totalStars * 2 + totalForks + (user.followers || 0)).toFixed(2);

  return {
    stats: {
      public_repos: user.public_repos || 0,
      public_gists: user.public_gists || 0,
      followers: user.followers || 0,
      following: user.following || 0,
      total_stars: totalStars,
      total_forks: totalForks,
      total_watchers: totalWatchers,
      total_open_issues: totalOpenIssues,
    },
    topLanguages,
    topRepos,
    activity: {
      recent_push_repos: recentPushRepos,
      avg_stars_per_repo: parseFloat(avgStarsPerRepo),
      avg_forks_per_repo: parseFloat(avgForksPerRepo),
      original_repo_count: originalRepos.length,
      forked_repo_count: forkedRepos.length,
      account_age_days: accountAgeDays,
      influence_score: parseFloat(influenceScore),
    },
  };
}

module.exports = { analyzeProfile };
