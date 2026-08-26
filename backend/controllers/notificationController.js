const pool = require("../config/db");

const getNotifications = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM foods WHERE user_id = $1",
      [req.user.id]
    );

    const alerts = result.rows
      .filter(item => {
        const diff = new Date(item.expiration_date) - new Date();
        return diff / (1000 * 60 * 60 * 24) <= 3;
      })
      .map(item => `⚠️ ${item.name} expire bientôt`);

    res.json(alerts);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = { getNotifications };