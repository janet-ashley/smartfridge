const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { getVapidPublicKey, subscribe, unsubscribe, sendPushToUser } = require("../controllers/pushController");

router.get("/vapid-public-key", getVapidPublicKey);
router.post("/subscribe", auth, subscribe);
router.post("/unsubscribe", auth, unsubscribe);

router.post("/test", auth, async (req, res) => {
  await sendPushToUser(req.user.id, {
    title: "Test SmartFridge",
    body: "Si tu vois cette notification, ça fonctionne !",
    url: "/notifications"
  });
  res.json({ message: "Notification de test envoyée" });
});

module.exports = router;
