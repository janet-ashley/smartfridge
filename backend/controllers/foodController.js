const pool = require("../config/db");
require("dotenv").config();
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");
const { readBarcodes, prepareZXingModule } = require("zxing-wasm/reader");

const wasmBinaryBuffer = fs.readFileSync(
  path.join(__dirname, "../node_modules/zxing-wasm/dist/reader/zxing_reader.wasm")
);
const wasmBinary = wasmBinaryBuffer.buffer.slice(
  wasmBinaryBuffer.byteOffset,
  wasmBinaryBuffer.byteOffset + wasmBinaryBuffer.byteLength
);
prepareZXingModule({ overrides: { wasmBinary } });

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const decodeBarcodeImage = async (req, res) => {
  const { image_base64 } = req.body;

  if (!image_base64) {
    return res.status(400).json({ message: "Aucune image fournie" });
  }

  try {
    const buffer = Buffer.from(image_base64, "base64");
    const results = await readBarcodes(buffer, {
      tryHarder: true,
      maxNumberOfSymbols: 1
    });

    if (!results || results.length === 0) {
      return res.status(404).json({ message: "Aucun code-barres detecte sur cette photo" });
    }

    res.json({ barcode: results[0].text, format: results[0].format });
  } catch (err) {
    console.error("Erreur decodage code-barres:", err);
    res.status(500).json({ message: "Erreur lors du decodage du code-barres" });
  }
};

const identifyFoodImage = async (req, res) => {
  const { image_base64, mime_type } = req.body;

  if (!image_base64) {
    return res.status(400).json({ message: "Aucune image fournie" });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "qwen/qwen3.6-27b",
      max_tokens: 1024,
      temperature: 0.2,
      reasoning_format: "hidden",
      messages: [{
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mime_type || "image/jpeg"};base64,${image_base64}`
            }
          },
          {
            type: "text",
            text: `Identifie l'aliment principal sur cette photo, meme si l'image est prise dans un frigo, un placard ou un environnement encombre.

Reponds UNIQUEMENT avec un objet JSON, sans aucun texte avant ou apres, avec exactement ces champs :
{"name": "nom de l'aliment en francais","category": "une de ces categories exactes: Fruits, Legumes, Laitages, Viandes, Poissons, Feculents, Boissons, Autres","confidence": "elevee ou moyenne ou faible"}

Ne montre aucun raisonnement, aucune analyse etape par etape : reponds directement avec le JSON final, rien d'autre.
Si l'aliment est difficile a identifier avec certitude, fais quand meme ta meilleure estimation et indique "confidence": "faible" plutot que de refuser de repondre. Utilise "name": "Inconnu" uniquement si aucun aliment n'est visible du tout sur la photo.`
          }
        ]
      }]
    });

    let text = completion.choices?.[0]?.message?.content;
    if (!text) {
      return res.status(500).json({ message: "Pas de reponse de l'IA" });
    }

    // Filet de securite : si le modele a quand meme inclus son raisonnement, on le retire
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    let identified;
    try {
      identified = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Reponse IA non-JSON:", text);
        return res.status(500).json({ message: "Impossible d'analyser la reponse" });
      }
      try {
        identified = JSON.parse(jsonMatch[0]);
      } catch {
        console.error("Reponse IA JSON invalide:", text);
        return res.status(500).json({ message: "Impossible d'analyser la reponse" });
      }
    }

    res.json(identified);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de l'analyse de l'image" });
  }
};

const addFood = async (req, res) => {
  const { name, expiration_date, quantity, unit, category_id, image_url } = req.body;
  try {
    await pool.query(
      `INSERT INTO foods (name, expiration_date, quantity, unit, category_id, user_id, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [name, expiration_date, quantity || 1, unit || null, category_id || null, req.user.id, image_url || null]
    );
    res.status(201).json({ message: "Aliment ajoute" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const getFoods = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT foods.*, categories.name AS category_name, categories.icon AS category_icon
       FROM foods
       LEFT JOIN categories ON foods.category_id = categories.id
       WHERE foods.user_id = $1
       ORDER BY expiration_date ASC`,
      [req.user.id]
    );
    const today = new Date();
    const foods = result.rows.map((item) => {
      const expDate = new Date(item.expiration_date);
      const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
      let status = "ok";
      if (diffDays < 0) status = "expired";
      else if (diffDays <= 3) status = "soon";
      return { ...item, status, daysLeft: diffDays };
    });
    res.json(foods);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const deleteFood = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      "DELETE FROM foods WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    res.json({ message: "Aliment supprime" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const updateFood = async (req, res) => {
  const { id } = req.params;
  const { name, expiration_date, quantity, unit, category_id } = req.body;
  try {
    await pool.query(
      `UPDATE foods SET name=$1, expiration_date=$2, quantity=$3, unit=$4, category_id=$5
       WHERE id=$6 AND user_id=$7`,
      [name, expiration_date, quantity || 1, unit || null, category_id || null, id, req.user.id]
    );
    res.json({ message: "Aliment modifie" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = { addFood, getFoods, deleteFood, updateFood, identifyFoodImage, decodeBarcodeImage };
