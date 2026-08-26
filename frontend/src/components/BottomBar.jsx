import { useNavigate, useLocation } from "react-router-dom";
import { Refrigerator, UtensilsCrossed, Trophy, Bell, User } from "lucide-react";

const tabs = [
  { path: "/", Icon: Refrigerator, label: "Frigo" },
  { path: "/recipes", Icon: UtensilsCrossed, label: "Recettes" },
  { path: "/challenges", Icon: Trophy, label: "Défis" },
  { path: "/notifications", Icon: Bell, label: "Alertes" },
  { path: "/profile", Icon: User, label: "Profil" },
];

export default function BottomBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 430,
      background: "white",
      borderTop: "1px solid #EEEEEE",
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
      padding: "10px 0 calc(14px + env(safe-area-inset-bottom))",
      zIndex: 100,
      boxShadow: "0 -4px 10px rgba(0,0,0,0.05)"
    }}>
      {tabs.map(tab => {
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "4px 12px",
              borderRadius: 12,
              color: active ? "#4CAF50" : "#9E9E9E",
              fontWeight: active ? 600 : 400,
              fontSize: 11
            }}
          >
            <tab.Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}