const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const auth = require("./middleware/auth");

const app = express();
const PORT = 5000;

const SECRET = "smartfridge_secret_key";

app.use(cors());
app.use(express.json());


// ======================
// TEST API
// ======================
app.get("/", (req, res) => {
  res.send("API SmartFridge fonctionne 🧊");
});


// ======================
// INSCRIPTION
// ======================
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2)",
      [email, hashedPassword]
    );

    res.json({ message: "Utilisateur créé avec succès ✅" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


// ======================
// LOGIN
// ======================
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: "Utilisateur introuvable" });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(400).json({ message: "Mot de passe incorrect" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Connexion réussie 🔓",
      token
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


// ======================
// FRIDGE (PROTÉGÉ)
// ======================
app.get("/fridge", auth, (req, res) => {
  res.json({
    message: "Accès autorisé 🧊",
    user: req.user
  });
});


// ======================
// FOODS - AJOUT
// ======================
app.post("/foods", auth, async (req, res) => {
  const { name, expiration_date } = req.body;

  try {
    await pool.query(
      "INSERT INTO foods (name, expiration_date, user_id) VALUES ($1, $2, $3)",
      [name, expiration_date, req.user.id]
    );

    res.json({ message: "Aliment ajouté 🧊" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


// ======================
// FOODS - LISTE + LOGIQUE
// ======================
app.get("/foods", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM foods WHERE user_id = $1",
      [req.user.id]
    );

    const today = new Date();

    const foods = result.rows.map((item) => {
      const expDate = new Date(item.expiration_date);
      const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

      let status = "ok";

      if (diffDays < 0) status = "expired";
      else if (diffDays <= 3) status = "soon";

      return {
        ...item,
        status,
        daysLeft: diffDays
      };
    });

    res.json(foods);

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


// ======================
// RECETTES
// ======================
app.get("/recipes", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM foods WHERE user_id = $1",
      [req.user.id]
    );

    const ingredients = result.rows.map(i => i.name);

    let recipe = "Riz aux légumes";

    if (ingredients.includes("poulet")) {
      recipe = "Poulet grillé + légumes";
    }

    if (ingredients.includes("œufs")) {
      recipe = "Omelette healthy";
    }

    res.json({
      ingredients,
      recipe
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


// ======================
// NOTIFICATIONS
// ======================
app.get("/notifications", auth, async (req, res) => {
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
    console.log(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


// ======================
// START SERVER
// ======================
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});