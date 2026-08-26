const jwt = require("jsonwebtoken");

const SECRET = "smartfridge_secret_key";

function auth(req, res, next) {
  const authHeader = req.headers["authorization"];

  // ❌ PAS DE TOKEN
  if (!authHeader || authHeader === "null") {
    return res.status(401).json({ message: "Accès refusé, pas de token" });
  }

  try {
    const decoded = jwt.verify(authHeader, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalide" });
  }
}

module.exports = auth;