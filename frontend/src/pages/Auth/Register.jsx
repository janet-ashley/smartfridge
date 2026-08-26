import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import TopBar from "../../components/TopBar";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères");
      return;
    }
    setLoading(true);
    const result = await register(email, password, username);
    setLoading(false);
    if (result.message?.includes("succès")) {
      navigate("/login");
    } else {
      setError(result.message || "Erreur lors de l'inscription");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>
      <TopBar title="Inscription" showBack />

      <div style={{ padding: "32px 24px" }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
          Créer un compte
        </h2>
        <p style={{ color: "#757575", marginBottom: 32 }}>
          Rejoignez SmartFridge dès aujourd'hui
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#757575", display: "block", marginBottom: 8 }}>
              NOM
            </label>
            <input
              placeholder="Votre prénom"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>

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
            onClick={handleRegister}
            disabled={loading}
            style={{ marginTop: 8, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>

          <p style={{ textAlign: "center", color: "#757575", fontSize: 14 }}>
            Déjà un compte ?{" "}
            <span
              onClick={() => navigate("/login")}
              style={{ color: "#4CAF50", fontWeight: 600, cursor: "pointer" }}
            >
              Se connecter
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}