const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { getProfile, updateUsername, updatePassword, updateBannerColor } = require("../controllers/userController");

router.get("/profile", auth, getProfile);
router.patch("/username", auth, updateUsername);
router.patch("/password", auth, updatePassword);
router.patch("/banner-color", auth, updateBannerColor);

module.exports = router;