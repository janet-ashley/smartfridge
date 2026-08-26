const request = require("supertest");
const express = require("express");
const bcrypt = require("bcrypt");

// Mock de la base de données
jest.mock("../config/db", () => ({
  query: jest.fn()
}));

const pool = require("../config/db");
const { register, login } = require("../controllers/authController");

// Mini app express pour les tests
const app = express();
app.use(express.json());
app.post("/auth/register", register);
app.post("/auth/login", login);

describe("Auth Controller", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TEST 1 : inscription réussie
  test("register - doit créer un utilisateur", async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .post("/auth/register")
      .send({ email: "test@test.com", password: "password123" });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toContain("succès");
  });

  // TEST 2 : login utilisateur introuvable
  test("login - doit refuser si utilisateur introuvable", async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "inconnu@test.com", password: "password123" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Utilisateur introuvable");
  });

  // TEST 3 : login mot de passe incorrect
  test("login - doit refuser si mot de passe incorrect", async () => {
    const hashedPassword = await bcrypt.hash("bonpassword", 10);

    pool.query.mockResolvedValue({
      rows: [{ id: 1, email: "test@test.com", password: hashedPassword }]
    });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "test@test.com", password: "mauvaispassword" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Mot de passe incorrect");
  });

  // TEST 4 : login réussi
  test("login - doit retourner un token si succès", async () => {
    const hashedPassword = await bcrypt.hash("password123", 10);

    pool.query.mockResolvedValue({
      rows: [{ id: 1, email: "test@test.com", password: hashedPassword }]
    });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "test@test.com", password: "password123" });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
  });

});