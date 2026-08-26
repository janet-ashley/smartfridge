const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

jest.mock("../config/db", () => ({
  query: jest.fn()
}));

const pool = require("../config/db");
const { addFood, getFoods, deleteFood } = require("../controllers/foodController");
const auth = require("../middleware/auth");

const app = express();
app.use(express.json());
app.post("/foods", auth, addFood);
app.get("/foods", auth, getFoods);
app.delete("/foods/:id", auth, deleteFood);

// Génère un token valide pour les tests
const SECRET = "smartfridge_secret_key";
const token = jwt.sign({ id: 1, email: "test@test.com" }, SECRET);

describe("Food Controller", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TEST 1 : ajout aliment
  test("addFood - doit ajouter un aliment", async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .post("/foods")
      .set("authorization", token)
      .send({ name: "poulet", expiration_date: "2026-12-01" });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toContain("ajouté");
  });

  // TEST 2 : récupération aliments
  test("getFoods - doit retourner la liste des aliments", async () => {
    pool.query.mockResolvedValue({
      rows: [
        { id: 1, name: "lait", expiration_date: "2026-05-10", category_name: "Laitages", category_icon: "🥛" },
        { id: 2, name: "poulet", expiration_date: "2026-04-30", category_name: "Viandes", category_icon: "🍗" }
      ]
    });

    const res = await request(app)
      .get("/foods")
      .set("authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toHaveProperty("status");
    expect(res.body[0]).toHaveProperty("daysLeft");
  });

  // TEST 3 : statut expiration
  test("getFoods - doit calculer le bon statut d'expiration", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    pool.query.mockResolvedValue({
      rows: [{ 
        id: 1, 
        name: "yaourt", 
        expiration_date: tomorrow.toISOString().split("T")[0],
        category_name: null,
        category_icon: null
      }]
    });

    const res = await request(app)
      .get("/foods")
      .set("authorization", token);

    expect(res.body[0].status).toBe("soon");
  });

  // TEST 4 : suppression aliment
  test("deleteFood - doit supprimer un aliment", async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .delete("/foods/1")
      .set("authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain("supprimé");
  });

});