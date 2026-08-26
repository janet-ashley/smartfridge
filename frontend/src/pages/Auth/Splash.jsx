import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Refrigerator, Image as ImageIcon } from "lucide-react";

export default function Splash() {
  const navigate = useNavigate();
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div style={{
      minHeight: "100vh",
      background: "white",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "60px 24px 48px"
    }}>
      {/* LOGO */}
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <div style={{
          width: 100,
          height: 100,
          background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
          borderRadius: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          boxShadow: "0 8px 20px rgba(76,175,80,0.3)"
        }}>
          <Refrigerator size={48} color="white" strokeWidth={1.75} />
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: "#1A1A1A" }}>
          SmartFridge
        </h1>
        <p style={{ color: "#757575", marginTop: 12, fontSize: 16, lineHeight: 1.5 }}>
          Gérez votre frigo, évitez le gaspillage{"\n"}
          et cuisinez mieux au quotidien.
        </p>
      </div>

      {/* ILLUSTRATION */}
      <div style={{
        width: "100%",
        maxWidth: 280,
        aspectRatio: "1 / 0.8",
        borderRadius: 24,
        overflow: "hidden",
        background: "#F1F8F2",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8
      }}>
        {!imgFailed && (
          <img
            src="/splash-vegetables.jpg"
            alt="Légumes frais"
            onError={() => setImgFailed(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        {imgFailed && (
          <>
            <ImageIcon size={32} strokeWidth={1.5} color="#A5D6A7" />
            <p style={{ fontSize: 12, color: "#81C784", padding: "0 20px", textAlign: "center" }}>
              Ajoute ta photo dans public/splash-vegetables.jpg
            </p>
          </>
        )}
      </div>

      {/* BOUTONS */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
        <button
          className="btn-primary"
          onClick={() => navigate("/register")}
        >
          Commencer
        </button>
        <button
          className="btn-outline"
          onClick={() => navigate("/login")}
        >
          Se connecter
        </button>
      </div>
    </div>
  );
}