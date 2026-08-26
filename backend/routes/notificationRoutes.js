const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { getNotifications } = require("../controllers/notificationController");

router.get("/", auth, getNotifications);

module.exports = router;