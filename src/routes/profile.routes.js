const router = require("express").Router();
const { param, validationResult } = require("express-validator");
const ctrl = require("../controllers/profile.controller");

// Validation middleware
const validateUsername = [
  param("username")
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage("Invalid GitHub username format"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

// POST   /api/profiles/analyze/:username  — fetch from GitHub, store insights
router.post("/analyze/:username", validateUsername, ctrl.analyzeGitHubProfile);

// GET    /api/profiles                    — list all stored profiles (paginated)
router.get("/", ctrl.listProfiles);

// GET    /api/profiles/:username          — get single profile with all insights
router.get("/:username", validateUsername, ctrl.getProfile);

// DELETE /api/profiles/:username          — remove stored profile
router.delete("/:username", validateUsername, ctrl.deleteProfile);

module.exports = router;
