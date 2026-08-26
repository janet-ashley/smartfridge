const pool = require("../config/db");

const logProgress = async (req, res) => {
  const { challenge_id, value } = req.body;
  try {
    const uc = await pool.query(
      `SELECT * FROM user_challenges 
       WHERE user_id = $1 AND challenge_id = $2 AND status = 'active'`,
      [req.user.id, challenge_id]
    );
    if (uc.rows.length === 0) {
      return res.status(404).json({ message: "Challenge actif introuvable" });
    }
    const userChallengeId = uc.rows[0].id;
    const existing = await pool.query(
      `SELECT * FROM challenge_progress
       WHERE user_id = $1 AND challenge_id = $2 AND logged_at = CURRENT_DATE`,
      [req.user.id, challenge_id]
    );
    if (existing.rows.length > 0) {
      const updated = await pool.query(
        `UPDATE challenge_progress
         SET value = value + $1
         WHERE user_id = $2 AND challenge_id = $3 AND logged_at = CURRENT_DATE
         RETURNING *`,
        [value, req.user.id, challenge_id]
      );
      return res.json({ progress: updated.rows[0] });
    }
    const created = await pool.query(
      `INSERT INTO challenge_progress (user_id, challenge_id, user_challenge_id, value, logged_at)
       VALUES ($1, $2, $3, $4, CURRENT_DATE)
       RETURNING *`,
      [req.user.id, challenge_id, userChallengeId, value]
    );
    res.status(201).json({ progress: created.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const getProgress = async (req, res) => {
  const { challenge_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM challenge_progress
       WHERE user_id = $1 AND challenge_id = $2
       ORDER BY logged_at DESC LIMIT 7`,
      [req.user.id, challenge_id]
    );
    const today = await pool.query(
      `SELECT * FROM challenge_progress
       WHERE user_id = $1 AND challenge_id = $2 AND logged_at = CURRENT_DATE`,
      [req.user.id, challenge_id]
    );
    const user = await pool.query(
      `SELECT total_points FROM users WHERE id = $1`,
      [req.user.id]
    );
    res.json({
      history: result.rows,
      today: today.rows[0] || null,
      total_points: user.rows[0]?.total_points || 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const awardPoints = async (req, res) => {
  const { challenge_id, points } = req.body;
  try {
    // Vérifie si les points ont déjà été attribués aujourd'hui pour ce challenge
    if (challenge_id) {
      const alreadyAwarded = await pool.query(
        `SELECT * FROM challenge_progress
         WHERE user_id = $1 AND challenge_id = $2 
         AND logged_at = CURRENT_DATE
         AND points_awarded = TRUE`,
        [req.user.id, challenge_id]
      );

      if (alreadyAwarded.rows.length > 0) {
        return res.json({ message: "Points deja attribues aujourd'hui" });
      }

      // Marque les points comme attribués
      await pool.query(
        `UPDATE challenge_progress
         SET points_awarded = TRUE
         WHERE user_id = $1 AND challenge_id = $2 AND logged_at = CURRENT_DATE`,
        [req.user.id, challenge_id]
      );
    }

    await pool.query(
      `UPDATE users SET total_points = total_points + $1 WHERE id = $2`,
      [points, req.user.id]
    );

    res.json({ message: `+${points} points gagnes !` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const subtractProgress = async (req, res) => {
  const { challenge_id, value } = req.body;
  try {
    const existing = await pool.query(
      `SELECT * FROM challenge_progress
       WHERE user_id = $1 AND challenge_id = $2 AND logged_at = CURRENT_DATE`,
      [req.user.id, challenge_id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Aucune progression aujourd'hui" });
    }
    const newValue = Math.max(0, existing.rows[0].value - value);

    // Si on repasse sous l'objectif, reset points_awarded
    await pool.query(
      `UPDATE challenge_progress
       SET value = $1, points_awarded = FALSE
       WHERE user_id = $2 AND challenge_id = $3 AND logged_at = CURRENT_DATE
       RETURNING *`,
      [newValue, req.user.id, challenge_id]
    );

    const updated = await pool.query(
      `SELECT * FROM challenge_progress
       WHERE user_id = $1 AND challenge_id = $2 AND logged_at = CURRENT_DATE`,
      [req.user.id, challenge_id]
    );

    res.json({ progress: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = { logProgress, getProgress, awardPoints, subtractProgress };