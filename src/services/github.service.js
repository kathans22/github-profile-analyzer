const axios = require("axios");

const GITHUB_BASE = "https://api.github.com";

function buildHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchUser(username) {
  const { data } = await axios.get(`${GITHUB_BASE}/users/${username}`, {
    headers: buildHeaders(),
  });
  return data;
}

async function fetchRepos(username) {
  let page = 1;
  const allRepos = [];

  while (true) {
    const { data } = await axios.get(`${GITHUB_BASE}/users/${username}/repos`, {
      headers: buildHeaders(),
      params: { per_page: 100, page, sort: "pushed", direction: "desc" },
    });
    allRepos.push(...data);
    if (data.length < 100) break;
    page++;
  }

  return allRepos;
}

module.exports = { fetchUser, fetchRepos };
