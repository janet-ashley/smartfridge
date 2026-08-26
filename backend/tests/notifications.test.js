const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

jest.mock("../config/db", () => ({
  query: jest.fn()
}));

const pool = require("../config/db");
const { getNotifications } = require("../controllers/notificationController");
const auth = require("../middleware/auth");

const app = express();
app.use(express.json());
app.get("/notifications", auth, getNotifications);

const SECRET = "smartfridge_secret_key";
const token = jwt.sign({ id: 1, email: "test@test.com" }, SECRET);

describe("Notifications Controller", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TEST 1 : aliment qui expire bientôt
  test("doit alerter pour un aliment expirant dans 2 jours", async () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);

    pool.query.mockResolvedValue({
      rows: [{ id: 1, name: "lait", expiration_date: soon.toISOString() }]
    });

    const res = await request(app)
      .get("/notifications")
      .set("authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toContain("lait");
  });

  // TEST 2 : aliment qui n'expire pas bientôt
  test("ne doit pas alerter pour un aliment expirant dans 30 jours", async () => {
    const later = new Date();
    later.setDate(later.getDate() + 30);

    pool.query.mockResolvedValue({
      rows: [{ id: 1, name: "confiture", expiration_date: later.toISOString() }]
    });

    const res = await request(app)
      .get("/notifications")
      .set("authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  // TEST 3 : aucun aliment
  test("doit retourner tableau vide si aucun aliment", async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get("/notifications")
      .set("authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(0);
  });

});