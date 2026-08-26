import { useNavigate } from "react-router-dom";

export default function TopBar({ title, showBack = false, rightIcon, onRightClick }) {
  const navigate = useNavigate();

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "calc(16px + env(safe-area-inset-top)) 20px 16px",
      background: "white",
      position: "sticky",
      top: 0,
      zIndex: 50,
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
    }}>
      <div style={{ width: 40 }}>
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "#F9F9F9",
              border: "none",
              borderRadius: 12,
              width: 36,
              height: 36,
              fontSize: 18,
              cursor: "pointer"
            }}
          >
            ←
          </button>
        )}
      </div>

      <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1A1A1A" }}>
        {title}
      </h2>

      <div style={{ width: 40, textAlign: "right" }}>
        {rightIcon && (
          <button
            onClick={onRightClick}
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer"
            }}
          >
            {rightIcon}
          </button>
        )}
      </div>
    </div>
  );
}