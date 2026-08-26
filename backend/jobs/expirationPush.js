const cron = require("node-cron");
const pool = require("../config/db");
const { sendPushToUser } = require("../controllers/pushController");

const checkExpirationsAndNotify = async () => {
  try {
    const result = await pool.query(
      `SELECT foods.id, foods.name, foods.expiration_date, foods.user_id
       FROM foods
       WHERE foods.expiration_date >= CURRENT_DATE
       AND foods.expiration_date <= CURRENT_DATE + INTERVAL '1 day'`
    );

    const byUser = {};
    for (const food of result.rows) {
      if (!byUser[food.user_id]) byUser[food.user_id] = [];
      byUser[food.user_id].push(food);
    }

    for (const userId of Object.keys(byUser)) {
      const items = byUser[userId];
      const title = items.length === 1
        ? "1 aliment expire bientôt"
        : `${items.length} aliments expirent bientôt`;
      const body = items.map(f => f.name).slice(0, 5).join(", ");

      await sendPushToUser(userId, {
        title,
        body,
        url: "/notifications"
      });
    }

    console.log(`[expiration-push] Verification terminee, ${Object.keys(byUser).length} utilisateur(s) notifie(s)`);
  } catch (err) {
    console.error("[expiration-push] Erreur:", err);
  }
};

// Tous les jours a 9h00
const startExpirationPushJob = () => {
  cron.schedule("0 9 * * *", checkExpirationsAndNotify);
  console.log("[expiration-push] Tache planifiee tous les jours a 9h00");
};

module.exports = { startExpirationPushJob, checkExpirationsAndNotify };
