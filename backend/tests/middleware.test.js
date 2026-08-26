const auth = require("../middleware/auth");

// Simule req, res, next
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Middleware Auth", () => {

  // TEST 1 : pas de token
  test("doit refuser si pas de token", () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // TEST 2 : token invalide
  test("doit refuser si token invalide", () => {
    const req = { headers: { authorization: "tokeninvalide123" } };
    const res = mockRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // TEST 3 : token valide
  test("doit accepter si token valide", () => {
    const jwt = require("jsonwebtoken");
    const SECRET = "smartfridge_secret_key";
    const token = jwt.sign({ id: 1, email: "test@test.com" }, SECRET);

    const req = { headers: { authorization: token } };
    const res = mockRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.email).toBe("test@test.com");
  });

});