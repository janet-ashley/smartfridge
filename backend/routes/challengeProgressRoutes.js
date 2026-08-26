const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  logProgress,
  getProgress,
  awardPoints,
  subtractProgress
} = require("../controllers/challengeProgressController");

router.post("/log", auth, logProgress);
router.get("/:challenge_id", auth, getProgress);
router.post("/award", auth, awardPoints);
router.patch("/subtract", auth, subtractProgress);

module.exports = router;
