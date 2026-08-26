const pool = require("../config/db");

const getChallenges = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM challenges ORDER BY points ASC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const getMyChallenges = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        user_challenges.id,
        user_challenges.status,
        user_challenges.started_at,
        user_challenges.completed_at,
        challenges.id AS challenge_id,
        challenges.title,
        challenges.description,
        challenges.duration_days,
        challenges.points
       FROM user_challenges
       JOIN challenges ON user_challenges.challenge_id = challenges.id
       WHERE user_challenges.user_id = $1
       ORDER BY user_challenges.started_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const joinChallenge = async (req, res) => {
  const { id } = req.params;
  try {
    const challenge = await pool.query(`SELECT * FROM challenges WHERE id = $1`, [id]);
    if (challenge.rows.length === 0) {
      return res.status(404).json({ message: "Challenge introuvable" });
    }
    const existing = await pool.query(
      `SELECT * FROM user_challenges WHERE user_id = $1 AND challenge_id = $2`,
      [req.user.id, id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Vous avez deja rejoint ce challenge" });
    }
    await pool.query(
      `INSERT INTO user_challenges (user_id, challenge_id, status) VALUES ($1, $2, 'active')`,
      [req.user.id, id]
    );
    res.status(201).json({ message: "Challenge rejoint avec succes !" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const completeChallenge = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE user_challenges 
       SET status = 'completed', completed_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'active'
       RETURNING *`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Challenge introuvable ou deja termine" });
    }
    res.json({ message: "Challenge complete !", challenge: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const leaveChallenge = async (req, res) => {
  const { id } = req.params;
  try {
    // Récupère le challenge_id avant de supprimer
    const uc = await pool.query(
      `SELECT challenge_id FROM user_challenges WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (uc.rows.length > 0) {
      await pool.query(
        `DELETE FROM challenge_progress WHERE user_id = $1 AND challenge_id = $2`,
        [req.user.id, uc.rows[0].challenge_id]
      );
    }
    await pool.query(
      `DELETE FROM user_challenges WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    res.json({ message: "Challenge quitte" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const restartChallenge = async (req, res) => {
  const { id } = req.params;
  try {
    // Récupère le challenge_id
    const uc = await pool.query(
      `SELECT challenge_id FROM user_challenges WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    // Remet à zéro toute la progression
    if (uc.rows.length > 0) {
      await pool.query(
        `DELETE FROM challenge_progress 
         WHERE user_id = $1 AND challenge_id = $2`,
        [req.user.id, uc.rows[0].challenge_id]
      );
    }

    // Remet le challenge à actif
    await pool.query(
      `UPDATE user_challenges 
       SET status = 'active', completed_at = NULL, started_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    res.json({ message: "Defi recommence !" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const checkExpiredChallenges = async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE user_challenges 
       SET status = 'failed'
       WHERE status = 'active' 
       AND started_at + (
         SELECT (duration_days || ' days')::INTERVAL
         FROM challenges 
         WHERE challenges.id = user_challenges.challenge_id
       ) < NOW()`
    );
    next();
  } catch (err) {
    console.error(err);
    next();
  }
};

const getLevels = async (req, res) => {
  try {
    const user = await pool.query(
      `SELECT total_points, username, email FROM users WHERE id = $1`,
      [req.user.id]
    );

    const points = user.rows[0]?.total_points || 0;

    const levels = [
      { name: "Debutant", icon: "🌱", min: 0, max: 49, color: "#757575" },
      { name: "Bronze", icon: "🥉", min: 50, max: 149, color: "#CD7F32" },
      { name: "Argent", icon: "🥈", min: 150, max: 299, color: "#C0C0C0" },
      { name: "Or", icon: "🥇", min: 300, max: 499, color: "#FFD700" },
      { name: "Diamant", icon: "💎", min: 500, max: 999, color: "#00BCD4" },
      { name: "Legende", icon: "👑", min: 1000, max: 999999, color: "#9C27B0" }
    ];

    const currentLevel = levels.find(l => points >= l.min && points <= l.max) || levels[0];
    const nextLevel = levels[levels.indexOf(currentLevel) + 1] || null;
    const progress = nextLevel
      ? Math.round(((points - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100)
      : 100;

    res.json({
      points,
      currentLevel,
      nextLevel,
      progress,
      username: user.rows[0]?.username,
      email: user.rows[0]?.email
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = {
  getChallenges,
  getMyChallenges,
  joinChallenge,
  completeChallenge,
  leaveChallenge,
  restartChallenge,
  checkExpiredChallenges,
  getLevels
};