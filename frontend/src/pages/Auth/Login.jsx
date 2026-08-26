import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import TopBar from "../../components/TopBar";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) {
      setError(result.message);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>
      <TopBar title="Connexion" showBack />

      <div style={{ padding: "32px 24px" }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
          Bon retour !
        </h2>
        <p style={{ color: "#757575", marginBottom: 32 }}>
          Connectez-vous à votre compte
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#757575", display: "block", marginBottom: 8 }}>
              EMAIL
            </label>
            <input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#757575", display: "block", marginBottom: 8 }}>
              MOT DE PASSE
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div style={{
              background: "#FFEBEE",
              color: "#FF5252",
              padding: "12px 16px",
              borderRadius: 12,
              fontSize: 14
            }}>
              {error}
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleLogin}
            disabled={loading}
            style={{ marginTop: 8, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          <p style={{ textAlign: "center", color: "#757575", fontSize: 14 }}>
            Pas encore de compte ?{" "}
            <span
              onClick={() => navigate("/register")}
              style={{ color: "#4CAF50", fontWeight: 600, cursor: "pointer" }}
            >
              S'inscrire
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}