const { fetchUser, fetchRepos } = require("../services/github.service");
const { analyzeProfile } = require("../services/analyzer.service");
const repo = require("../services/profile.repository");

// POST /api/profiles/analyze/:username
async function analyzeGitHubProfile(req, res, next) {
  try {
    const { username } = req.params;

    // Fetch from GitHub
    let user, repos;
    try {
      [user, repos] = await Promise.all([fetchUser(username), fetchRepos(username)]);
    } catch (err) {
      if (err.response?.status === 404) {
        return res.status(404).json({ success: false, message: `GitHub user '${username}' not found.` });
      }
      if (err.response?.status === 403) {
        return res.status(429).json({ success: false, message: "GitHub API rate limit exceeded. Add a GITHUB_TOKEN to increase limits." });
      }
      throw err;
    }

    // Analyze
    const insights = analyzeProfile(user, repos);

    // Persist
    const profileId = await repo.upsertProfile(user);
    await Promise.all([
      repo.saveStats(profileId, insights.stats),
      repo.saveLanguages(profileId, insights.topLanguages),
      repo.saveTopRepos(profileId, insights.topRepos),
      repo.saveActivity(profileId, insights.activity),
    ]);

    // Return full result
    const result = await repo.getProfileByUsername(username);
    res.status(200).json({ success: true, message: "Profile analyzed and stored successfully.", data: result });
  } catch (err) {
    next(err);
  }
}

// GET /api/profiles
async function listProfiles(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const sortBy = req.query.sortBy || "analyzed_at";
    const order = req.query.order === "asc" ? "asc" : "desc";

    const result = await repo.getAllProfiles({ page, limit, sortBy, order });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// GET /api/profiles/:username
async function getProfile(req, res, next) {
  try {
    const { username } = req.params;
    const result = await repo.getProfileByUsername(username);
    if (!result) {
      return res.status(404).json({ success: false, message: `Profile '${username}' not found. Analyze it first via POST /api/profiles/analyze/${username}` });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/profiles/:username
async function deleteProfile(req, res, next) {
  try {
    const { username } = req.params;
    const deleted = await repo.deleteProfile(username);
    if (!deleted) {
      return res.status(404).json({ success: false, message: `Profile '${username}' not found.` });
    }
    res.json({ success: true, message: `Profile '${username}' deleted successfully.` });
  } catch (err) {
    next(err);
  }
}

module.exports = { analyzeGitHubProfile, listProfiles, getProfile, deleteProfile };
