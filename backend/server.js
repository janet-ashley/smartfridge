require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const foodRoutes = require("./routes/foodRoutes");
const recipeRoutes = require("./routes/recipeRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const challengeRoutes = require("./routes/challengeRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const progressRoutes = require("./routes/challengeProgressRoutes");
const userRoutes = require("./routes/userRoutes");
const pushRoutes = require("./routes/pushRoutes");
const { startExpirationPushJob } = require("./jobs/expirationPush");

const app = express();
const PORT = process.env.PORT || 5000;

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "authorization", "ngrok-skip-browser-warning"]
}));
app.use(express.json({ limit: "15mb" }));

app.use("/uploads", express.static("uploads"));

app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Pas de fichier" });
  res.json({ url: `/uploads/${req.file.filename}` }); // URL relative
});

app.use("/auth", authRoutes);
app.use("/foods", foodRoutes);
app.use("/recipes", recipeRoutes);
app.use("/notifications", notificationRoutes);
app.use("/challenges", challengeRoutes);
app.use("/categories", categoryRoutes);
app.use("/progress", progressRoutes);
app.use("/user", userRoutes);
app.use("/push", pushRoutes);

app.get("/", (req, res) => {
  res.send("API SmartFridge fonctionne");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur lance sur http://localhost:${PORT}`);
  startExpirationPushJob();
});
