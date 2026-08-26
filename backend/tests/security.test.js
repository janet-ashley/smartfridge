const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

jest.mock("../config/db", () => ({
  query: jest.fn()
}));

const pool = require("../config/db");
const { register, login } = require("../controllers/authController");
const { addFood, getFoods, deleteFood } = require("../controllers/foodController");
const auth = require("../middleware/auth");

const app = express();
app.use(express.json());
app.post("/auth/register", register);
app.post("/auth/login", login);
app.post("/foods", auth, addFood);
app.get("/foods", auth, getFoods);
app.delete("/foods/:id", auth, deleteFood);

const SECRET = "smartfridge_secret_key";

describe("Tests de securite", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("SECURITE - doit bloquer acces sans token", async () => {
    const res = await request(app).get("/foods");
    expect(res.statusCode).toBe(401);
  });

  test("SECURITE - doit bloquer token expire", async () => {
    const expiredToken = jwt.sign(
      { id: 1, email: "test@test.com" },
      SECRET,
      { expiresIn: "1ms" }
    );
    await new Promise(resolve => setTimeout(resolve, 10));
    const res = await request(app)
      .get("/foods")
      .set("authorization", expiredToken);
    expect(res.statusCode).toBe(401);
  });

  test("SECURITE - doit bloquer token falsifie", async () => {
    const fakeToken = jwt.sign(
      { id: 1, email: "hacker@test.com" },
      "mauvaise_cle_secrete"
    );
    const res = await request(app)
      .get("/foods")
      .set("authorization", fakeToken);
    expect(res.statusCode).toBe(401);
  });

  test("SECURITE - doit bloquer token malforme", async () => {
    const res = await request(app)
      .get("/foods")
      .set("authorization", "ceciNestPasUnToken");
    expect(res.statusCode).toBe(401);
  });

  test("SECURITE - resistance injection SQL login", async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .post("/auth/login")
      .send({
        email: "' OR '1'='1",
        password: "' OR '1'='1"
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Utilisateur introuvable");
  });

  test("SECURITE - resistance injection SQL aliments", async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const token = jwt.sign({ id: 1, email: "test@test.com" }, SECRET);
    const res = await request(app)
      .post("/foods")
      .set("authorization", token)
      .send({
        name: "'; DROP TABLE foods; --",
        expiration_date: "2026-12-01"
      });
    expect(res.statusCode).toBe(201);
  });

  test("SECURITE - isolation donnees entre utilisateurs", async () => {
    const tokenUser1 = jwt.sign({ id: 1, email: "user1@test.com" }, SECRET);
    const tokenUser2 = jwt.sign({ id: 2, email: "user2@test.com" }, SECRET);
    pool.query.mockResolvedValue({ rows: [] });
    const resUser1 = await request(app)
      .get("/foods")
      .set("authorization", tokenUser1);
    const resUser2 = await request(app)
      .get("/foods")
      .set("authorization", tokenUser2);
    expect(resUser1.statusCode).toBe(200);
    expect(resUser2.statusCode).toBe(200);
    const callsUser1 = pool.query.mock.calls[0][1];
    const callsUser2 = pool.query.mock.calls[1][1];
    expect(callsUser1[0]).toBe(1);
    expect(callsUser2[0]).toBe(2);
  });

  test("SECURITE - user ne peut pas supprimer aliment d un autre", async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const tokenUser2 = jwt.sign({ id: 2, email: "user2@test.com" }, SECRET);
    const res = await request(app)
      .delete("/foods/1")
      .set("authorization", tokenUser2);
    expect(res.statusCode).toBe(200);
    const deleteCall = pool.query.mock.calls[0];
    expect(deleteCall[1]).toEqual(["1", 2]);
  });

  test("RGPD - mot de passe ne doit pas etre stocke en clair", async () => {
    let savedPassword = null;
    pool.query.mockImplementation((query, params) => {
      if (query.includes("INSERT INTO users")) {
        savedPassword = params[1];
      }
      return Promise.resolve({ rows: [] });
    });
    await request(app)
      .post("/auth/register")
      .send({ email: "test@test.com", password: "monmotdepasse123" });
    expect(savedPassword).not.toBe("monmotdepasse123");
    expect(savedPassword).toMatch(/^\$2b\$/);
  });

  test("RGPD - token JWT ne doit pas contenir le mot de passe", async () => {
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash("password123", 10);
    pool.query.mockResolvedValue({
      rows: [{ id: 1, email: "test@test.com", password: hashedPassword }]
    });
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "test@test.com", password: "password123" });
    const token = res.body.token;
    const decoded = jwt.decode(token);
    expect(decoded.password).toBeUndefined();
    expect(decoded.email).toBe("test@test.com");
  });

});
