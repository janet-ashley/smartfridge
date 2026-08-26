const pool = require("../config/db");
const bcrypt = require("bcrypt");

// Prix moyens approximatifs par categorie (en euros), utilises pour estimer
// l'argent perdu quand on n'a pas le prix reel de chaque produit.
const CATEGORY_AVG_PRICE = {
  "Fruits": 3,
  "Légumes": 2.5,
  "Laitages": 2,
  "Viandes": 6,
  "Poissons": 7,
  "Féculents": 2,
  "Boissons": 2,
  "Autres": 3
};

const estimateValue = (rows) => {
  return rows.reduce((total, row) => {
    const price = CATEGORY_AVG_PRICE[row.category_name] ?? CATEGORY_AVG_PRICE["Autres"];
    const qty = Number(row.quantity) || 1;
    return total + price * qty;
  }, 0);
};

const getProfile = async (req, res) => {
  try {
    const user = await pool.query(
      `SELECT id, email, username, total_points, created_at, banner_color FROM users WHERE id = $1`,
      [req.user.id]
    );
    const foods = await pool.query(
      `SELECT COUNT(*) FROM foods WHERE user_id = $1`,
      [req.user.id]
    );
    const recipes = await pool.query(
      `SELECT COUNT(*) FROM recipes WHERE user_id = $1`,
      [req.user.id]
    );
    const challenges = await pool.query(
      `SELECT COUNT(*) FROM user_challenges WHERE user_id = $1 AND status = 'completed'`,
      [req.user.id]
    );
    const expiredThisWeek = await pool.query(
      `SELECT foods.quantity, categories.name AS category_name
       FROM foods
       LEFT JOIN categories ON foods.category_id = categories.id
       WHERE foods.user_id = $1
       AND expiration_date >= NOW() - INTERVAL '7 days'
       AND expiration_date < NOW()`,
      [req.user.id]
    );
    const expiredLastWeek = await pool.query(
      `SELECT foods.quantity, categories.name AS category_name
       FROM foods
       LEFT JOIN categories ON foods.category_id = categories.id
       WHERE foods.user_id = $1
       AND expiration_date >= NOW() - INTERVAL '14 days'
       AND expiration_date < NOW() - INTERVAL '7 days'`,
      [req.user.id]
    );

    const expiredCount = expiredThisWeek.rows.length;
    const moneyLostThisWeek = Math.round(estimateValue(expiredThisWeek.rows) * 100) / 100;
    const moneyLostLastWeek = Math.round(estimateValue(expiredLastWeek.rows) * 100) / 100;

    let percentChange = null;
    if (moneyLostLastWeek > 0) {
      percentChange = Math.round(((moneyLostThisWeek - moneyLostLastWeek) / moneyLostLastWeek) * 100);
    }

    let weekMessage = "";
    let weekEmoji = "";
    if (expiredCount === 0) {
      weekMessage = "Bravo, vous etes un heros de la planete ! Aucun gaspillage cette semaine !";
      weekEmoji = "??";
    } else if (expiredCount <= 2) {
      weekMessage = "Vous etes sur la bonne voie ! Quelques aliments perdus mais vous faites des efforts !";
      weekEmoji = "??";
    } else {
      weekMessage = "Vous pouvez faire mieux ! Pensez a verifier votre frigo plus regulierement.";
      weekEmoji = "??";
    }
    res.json({
      user: user.rows[0],
      stats: {
        foods: parseInt(foods.rows[0].count),
        recipes: parseInt(recipes.rows[0].count),
        challenges: parseInt(challenges.rows[0].count)
      },
      week: {
        expired_count: expiredCount,
        message: weekMessage,
        emoji: weekEmoji,
        money_lost: moneyLostThisWeek,
        money_lost_last_week: moneyLostLastWeek,
        percent_change: percentChange
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const updateUsername = async (req, res) => {
  const { username } = req.body;
  try {
    await pool.query(
      `UPDATE users SET username = $1 WHERE id = $2`,
      [username, req.user.id]
    );
    res.json({ message: "Nom mis a jour !" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await pool.query(
      `SELECT * FROM users WHERE id = $1`,
      [req.user.id]
    );
    const isValid = await bcrypt.compare(currentPassword, user.rows[0].password);
    if (!isValid) {
      return res.status(400).json({ message: "Mot de passe actuel incorrect" });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE users SET password = $1 WHERE id = $2`,
      [hashed, req.user.id]
    );
    res.json({ message: "Mot de passe mis a jour !" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const ALLOWED_BANNER_COLORS = [
  "#4CAF50", "#2196F3", "#9C27B0", "#FF9800",
  "#E91E63", "#00BCD4", "#795548", "#607D8B"
];

const updateBannerColor = async (req, res) => {
  const { color } = req.body;
  if (color !== null && !ALLOWED_BANNER_COLORS.includes(color)) {
    return res.status(400).json({ message: "Couleur invalide" });
  }
  try {
    await pool.query(
      `UPDATE users SET banner_color = $1 WHERE id = $2`,
      [color, req.user.id]
    );
    res.json({ message: "Couleur mise a jour !", color });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = { getProfile, updateUsername, updatePassword, updateBannerColor, ALLOWED_BANNER_COLORS };
