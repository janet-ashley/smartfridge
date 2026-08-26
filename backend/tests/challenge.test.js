const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

jest.mock("../config/db", () => ({
  query: jest.fn()
}));

const pool = require("../config/db");
const {
  getChallenges,
  getMyChallenges,
  joinChallenge,
  completeChallenge,
  leaveChallenge
} = require("../controllers/challengeController");
const auth = require("../middleware/auth");

const app = express();
app.use(express.json());
app.get("/challenges", auth, getChallenges);
app.get("/challenges/my", auth, getMyChallenges);
app.post("/challenges/:id/join", auth, joinChallenge);
app.patch("/challenges/:id/complete", auth, completeChallenge);
app.delete("/challenges/:id/leave", auth, leaveChallenge);

const SECRET = "smartfridge_secret_key";
const token = jwt.sign({ id: 1, email: "test@test.com" }, SECRET);

describe("Challenge Controller", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TEST 1 : liste des challenges
  test("getChallenges - doit retourner tous les challenges", async () => {
    pool.query.mockResolvedValue({
      rows: [
        { id: 1, title: "5 fruits & légumes", points: 20 },
        { id: 2, title: "Zéro gaspillage", points: 50 }
      ]
    });

    const res = await request(app)
      .get("/challenges")
      .set("authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  // TEST 2 : mes challenges
  test("getMyChallenges - doit retourner les challenges de l utilisateur", async () => {
    pool.query.mockResolvedValue({
      rows: [
        { id: 1, title: "5 fruits & légumes", status: "active" }
      ]
    });

    const res = await request(app)
      .get("/challenges/my")
      .set("authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body[0].status).toBe("active");
  });

  // TEST 3 : rejoindre un challenge
  test("joinChallenge - doit rejoindre un challenge", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, title: "5 fruits & légumes" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/challenges/1/join")
      .set("authorization", token);

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toContain("rejoint");
  });

  // TEST 4 : challenge introuvable
  test("joinChallenge - doit refuser si challenge introuvable", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/challenges/99/join")
      .set("authorization", token);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Challenge introuvable");
  });

  // TEST 5 : déjà rejoint
  test("joinChallenge - doit refuser si déjà rejoint", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1 }] });

    const res = await request(app)
      .post("/challenges/1/join")
      .set("authorization", token);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain("déjà rejoint");
  });

  // TEST 6 : compléter un challenge
  test("completeChallenge - doit compléter un challenge", async () => {
    pool.query.mockResolvedValue({
      rows: [{ id: 1, status: "completed" }]
    });

    const res = await request(app)
      .patch("/challenges/1/complete")
      .set("authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain("Challenge");
  });

  // TEST 7 : quitter un challenge
  test("leaveChallenge - doit quitter un challenge", async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .delete("/challenges/1/leave")
      .set("authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain("quitté");
  });

});