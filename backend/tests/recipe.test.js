const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

jest.mock("../config/db", () => ({
  query: jest.fn()
}));

jest.mock("groq-sdk", () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                title: "Poulet aux tomates",
                duration: "30 minutes",
                difficulty: "Facile",
                ingredients: ["poulet", "tomates"],
                steps: ["Etape 1", "Etape 2"],
                tip: "Conseil du chef"
              })
            }
          }]
        })
      }
    }
  }));
});

const pool = require("../config/db");
const { getRecipes, getRecipesHistory } = require("../controllers/recipeController");
const auth = require("../middleware/auth");

const app = express();
app.use(express.json());
app.get("/recipes", auth, getRecipes);
app.get("/recipes/history", auth, getRecipesHistory);

const SECRET = "smartfridge_secret_key";
const token = jwt.sign({ id: 1, email: "test@test.com" }, SECRET);

describe("Recipe Controller", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TEST 1 : génération recette IA
  test("getRecipes - doit générer une recette avec les ingrédients", async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          { name: "poulet", category: "Viandes" },
          { name: "tomates", category: "Légumes" }
        ]
      })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/recipes")
      .set("authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body.recipe).toBeDefined();
    expect(res.body.recipe.title).toBe("Poulet aux tomates");
    expect(res.body.ingredients_available).toContain("poulet");
  });

  // TEST 2 : frigo vide
  test("getRecipes - doit refuser si frigo vide", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/recipes")
      .set("authorization", token);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain("Aucun aliment");
  });

  // TEST 3 : historique recettes
  test("getRecipesHistory - doit retourner l historique", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 1,
        title: "Poulet aux tomates",
        content: JSON.stringify({ title: "Poulet aux tomates" }),
        ingredients_used: ["poulet", "tomates"],
        generated_at: new Date()
      }]
    });

    const res = await request(app)
      .get("/recipes/history")
      .set("authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("Poulet aux tomates");
  });

});