const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getChallenges,
  getMyChallenges,
  joinChallenge,
  completeChallenge,
  leaveChallenge,
  restartChallenge,
  checkExpiredChallenges,
  getLevels
} = require("../controllers/challengeController");

router.get("/", auth, checkExpiredChallenges, getChallenges);
router.get("/my", auth, checkExpiredChallenges, getMyChallenges);
router.get("/levels", auth, getLevels);
router.post("/:id/join", auth, joinChallenge);
router.patch("/:id/complete", auth, completeChallenge);
router.delete("/:id/leave", auth, leaveChallenge);
router.post("/:id/restart", auth, restartChallenge);

module.exports = router;