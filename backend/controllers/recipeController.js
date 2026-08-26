require("dotenv").config();
const Groq = require("groq-sdk");
const pool = require("../config/db");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const translateMealRecipe = async (req, res) => {
  const { idMeal, title, ingredients, instructions } = req.body;

  if (!idMeal || !title) {
    return res.status(400).json({ message: "Donnees de recette manquantes" });
  }

  try {
    // Deja traduit avant (par n'importe quel utilisateur) -> on renvoie direct, aucun appel Groq
    const cached = await pool.query(
      `SELECT title, ingredients, instructions FROM recipe_translations WHERE id_meal = $1`,
      [idMeal]
    );
    if (cached.rows.length > 0) {
      return res.json({
        title: cached.rows[0].title,
        ingredients: cached.rows[0].ingredients,
        instructions: cached.rows[0].instructions,
        cached: true
      });
    }

    const prompt = `Traduis ce contenu de recette de cuisine de l'anglais vers le francais. Garde un ton naturel et culinaire, adapte les tournures si besoin (ne traduis pas mot a mot de facon robotique).

Titre : ${title}
Ingredients : ${JSON.stringify(ingredients || [])}
Instructions (etapes) : ${JSON.stringify(instructions || [])}

Reponds UNIQUEMENT en JSON avec ce format exact, sans texte avant/apres, sans balise de reflexion : {"title": "titre traduit","ingredients": ["ingredient 1 traduit", "ingredient 2 traduit"],"instructions": ["etape 1 traduite", "etape 2 traduite"]}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "openai/gpt-oss-120b",
      temperature: 0.3,
      max_tokens: 2000,
      reasoning_format: "hidden"
    });

    const raw = (completion.choices[0].message.content || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    let translated;
    try {
      translated = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Reponse IA non exploitable");
      translated = JSON.parse(match[0]);
    }

    // Mise en cache pour que personne d'autre n'ait jamais besoin de retraduire cette recette
    await pool.query(
      `INSERT INTO recipe_translations (id_meal, title, ingredients, instructions)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id_meal) DO UPDATE SET title = $2, ingredients = $3, instructions = $4`,
      [idMeal, translated.title, JSON.stringify(translated.ingredients), JSON.stringify(translated.instructions)]
    );

    res.json({ ...translated, cached: false });
  } catch (err) {
    console.error("Erreur traduction recette:", err);
    res.status(500).json({ message: "Erreur lors de la traduction" });
  }
};

const getRecipes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT foods.name, foods.quantity, foods.unit, categories.name AS category
       FROM foods
       LEFT JOIN categories ON foods.category_id = categories.id
       WHERE foods.user_id = $1
       AND foods.expiration_date >= CURRENT_DATE
       ORDER BY foods.expiration_date ASC`,
      [req.user.id]
    );

    // Fusionne les doublons (ex: deux entrées "Poulet" -> une seule ligne avec la quantité totale)
    const merged = {};
    for (const row of result.rows) {
      const key = row.name.trim().toLowerCase();
      const qty = Number(row.quantity) || 1;
      if (merged[key]) {
        merged[key].quantity += qty;
      } else {
        merged[key] = { name: row.name, quantity: qty, unit: row.unit || "", category: row.category };
      }
    }
    const ingredientList = Object.values(merged);

    // Les boissons ne comptent pas comme des ingredients de cuisine :
    // on les exclut completement de ce qui est propose a l'IA pour une recette.
    const cookableList = ingredientList.filter(i => i.category !== "Boissons");
    const ingredients = cookableList.map(i => i.name);
    const ingredientsWithQty = cookableList
      .map(i => `${i.name} (${i.quantity}${i.unit ? " " + i.unit : ""} disponible)`)
      .join(", ");

    // Pas assez d'ingredients exploitables -> on ne force pas l'IA a inventer une recette,
    // on redirige plutot vers les recettes "Pour toi".
    if (cookableList.length === 0) {
      return res.status(200).json({
        not_enough_ingredients: true,
        message: "Il n'y a pas assez d'ingrédients exploitables dans votre frigo pour une recette cohérente."
      });
    }

    const fewIngredients = cookableList.length <= 2;

    const prompt = `Tu es un chef cuisinier professionnel. Voici les ingredients disponibles dans le frigo de l'utilisateur, avec leur quantite reelle : ${ingredientsWithQty}.

Genere UNE recette complete, realiste, equilibree et APPETISSANTE en utilisant certains de ces ingredients (tu peux aussi supposer que l'utilisateur a les bases de placard courantes : sel, poivre, huile, eau, farine).

Regles de bon sens culinaire, tres importantes :
- Tu n'es PAS oblige d'utiliser tous les ingredients de la liste. Choisis uniquement une combinaison qui a reellement du sens dans un plat normal, comme le ferait un vrai chef.
- N'utilise JAMAIS de boissons (sodas, jus, sirops) comme ingredient de cuisine.
- Ne mets jamais deux ingredients tres similaires ensemble (ex: Coca et Coke) : ce sont probablement le meme produit ajoute deux fois par erreur, choisis-en un seul si besoin ou aucun.
- La recette doit rester quelque chose qu'une personne aurait normalement envie de manger.
${fewIngredients ? `- L'utilisateur n'a que tres peu d'ingredients (${cookableList.length}). Tu peux proposer une recette qui necessite 2 a 4 ingredients supplementaires qu'il n'a pas, MAIS tu dois absolument les lister separement dans le champ JSON "to_buy" (liste de strings, ex: ["200g de riz", "1 oignon"]). N'INVENTE JAMAIS un ingredient supplementaire sans le declarer dans "to_buy" : tout ce qui n'est pas dans le frigo de l'utilisateur doit y apparaitre.` : `- Base-toi uniquement sur les ingredients du frigo listes ci-dessus et les bases de placard courantes ; le champ "to_buy" doit rester un tableau vide [].`}

Contraintes de format :
- Chaque ingredient de la liste "ingredients" doit inclure une quantite precise et realiste (ex: "200g de poulet", "1 cuillere a soupe d'huile d'olive", "2 tomates"), jamais juste le nom seul.
- N'utilise pas plus que la quantite reellement disponible indiquee entre parentheses pour les ingredients du frigo que tu decides d'utiliser.
- Les etapes doivent etre detaillees et actionnables (temps de cuisson, temperature, technique), avec au minimum 4 a 6 etapes.

Reponds UNIQUEMENT en JSON avec ce format exact sans aucun texte avant ou apres, et sans balise de reflexion : {"title": "Nom de la recette","duration": "Temps de preparation total","difficulty": "Facile ou Moyen ou Difficile","servings": "Nombre de portions","ingredients": ["200g de poulet", "1 cuillere a soupe d'huile d'olive"],"to_buy": [],"steps": ["etape 1 detaillee", "etape 2 detaillee"],"tip": "Conseil du chef"}`;

    const callGroq = () => groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "openai/gpt-oss-120b",
      temperature: 0.6,
      max_tokens: 2000,
      reasoning_format: "hidden"
    });

    const parseRecipe = (text) => {
      const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      try {
        return JSON.parse(cleaned);
      } catch {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          return null;
        }
      }
    };

    let completion = await callGroq();
    let recipe = parseRecipe(completion.choices[0].message.content || "");

    // Filet de securite : si le parsing echoue, on retente une fois avant d'abandonner
    if (!recipe) {
      console.error("Premier essai de generation echoue, nouvelle tentative...");
      completion = await callGroq();
      recipe = parseRecipe(completion.choices[0].message.content || "");
    }

    if (!recipe) {
      console.error("Reponse IA non exploitable:", completion.choices[0].message.content);
      return res.status(500).json({
        message: "Erreur parsing recette"
      });
    }

    // Sauvegarde et récupère l'ID
    const saved = await pool.query(
      `INSERT INTO recipes (user_id, title, content, ingredients_used)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.user.id, recipe.title, JSON.stringify(recipe), ingredients]
    );

    res.json({
      id: saved.rows[0].id,
      ingredients_available: ingredients,
      recipe
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const getRecipesHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM recipes 
       WHERE user_id = $1 
       ORDER BY generated_at DESC 
       LIMIT 10`,
      [req.user.id]
    );

    const recipes = result.rows.map(r => ({
      id: r.id,
      title: r.title,
      recipe: JSON.parse(r.content),
      ingredients_used: r.ingredients_used,
      generated_at: r.generated_at,
      rating: r.rating
    }));

    res.json(recipes);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const rateRecipe = async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  try {
    await pool.query(
      `UPDATE recipes SET rating = $1 WHERE id = $2 AND user_id = $3`,
      [rating, id, req.user.id]
    );
    res.json({ message: "Note sauvegardée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = { getRecipes, getRecipesHistory, rateRecipe, translateMealRecipe };