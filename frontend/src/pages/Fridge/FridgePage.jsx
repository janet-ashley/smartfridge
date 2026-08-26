import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import TopBar from "../../components/TopBar";
import FoodCard from "../../components/FoodCard";
import AddFood from "./AddFood";
import { LogOut, Refrigerator, Search, X, ArrowUpDown } from "lucide-react";

const FILTERS = ["Tous", "Légumes", "Fruits", "Laitages", "Viandes", "Autres"];

const SORT_OPTIONS = [
  { value: "default", label: "Par défaut" },
  { value: "date", label: "Date d'expiration" },
  { value: "alpha", label: "Alphabétique (A-Z)" },
  { value: "added", label: "Ajouté récemment" }
];

export default function FridgePage() {
  const { authFetch, logout } = useAuth();
  const navigate = useNavigate();
  const [foods, setFoods] = useState([]);
  const [filter, setFilter] = useState("Tous");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchFoods = async () => {
    try {
      const res = await authFetch("/foods");
      const data = await res.json();
      setFoods(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoods();
  }, []);

  const filteredFoods = foods
    .filter(f => {
      if (filter === "Tous") return true;
      return f.category_name === filter;
    })
    .filter(f => {
      if (!search.trim()) return true;
      return f.name.toLowerCase().includes(search.trim().toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === "alpha") return a.name.localeCompare(b.name, "fr");
      if (sortBy === "date") return new Date(a.expiration_date) - new Date(b.expiration_date);
      if (sortBy === "added") return b.id - a.id;
      return 0; // "default" : garde l'ordre renvoyé par le serveur
    });

  const expiredCount = foods.filter(f => f.status === "expired").length;
  const soonCount = foods.filter(f => f.status === "soon").length;

  if (showAdd) {
    return <AddFood onBack={() => { setShowAdd(false); fetchFoods(); }} />;
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#F9F9F9", paddingBottom: "calc(100px + env(safe-area-inset-bottom))" }}>
      <TopBar
        title="Mon Frigo"
        rightIcon={<LogOut size={20} strokeWidth={1.75} />}
        onRightClick={logout}
      />

      {/* ALERTES */}
      {(expiredCount > 0 || soonCount > 0) && (
        <div style={{ padding: "12px 20px 0" }}>
          {expiredCount > 0 && (
            <div style={{
              background: "#FFEBEE",
              color: "#FF5252",
              padding: "10px 16px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 8
            }}>
              🔴 {expiredCount} aliment{expiredCount > 1 ? "s" : ""} expiré{expiredCount > 1 ? "s" : ""}
            </div>
          )}
          {soonCount > 0 && (
            <div style={{
              background: "#FFF3E0",
              color: "#FF9800",
              padding: "10px 16px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600
            }}>
              🟠 {soonCount} aliment{soonCount > 1 ? "s" : ""} expire{soonCount > 1 ? "nt" : ""} bientôt
            </div>
          )}
        </div>
      )}

      {/* RECHERCHE + TRI */}
      <div style={{ padding: "16px 20px 0", display: "flex", gap: 10 }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 8,
          background: "white", borderRadius: 14, padding: "10px 14px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
        }}>
          <Search size={17} strokeWidth={2} color="#9E9E9E" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un aliment..."
            style={{
              flex: 1, border: "none", outline: "none",
              fontSize: 14, background: "transparent"
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ border: "none", background: "none", padding: 2, display: "flex", cursor: "pointer" }}
            >
              <X size={15} color="#9E9E9E" />
            </button>
          )}
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "white", borderRadius: 14, padding: "0 10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)", flexShrink: 0
        }}>
          <ArrowUpDown size={15} strokeWidth={2} color="#9E9E9E" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              border: "none", outline: "none", background: "transparent",
              fontSize: 13, color: "#1A1A1A", padding: "10px 4px 10px 0",
              maxWidth: 90
            }}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* FILTRES */}
      <div style={{
        display: "flex",
        gap: 8,
        padding: "16px 20px",
        overflowX: "auto",
        scrollbarWidth: "none"
      }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "8px 16px",
              borderRadius: 20,
              border: "none",
              background: filter === f ? "#4CAF50" : "white",
              color: filter === f ? "white" : "#757575",
              fontWeight: filter === f ? 600 : 400,
              fontSize: 13,
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              cursor: "pointer"
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* GRILLE */}
      <div style={{ padding: "0 20px 100px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#757575" }}>
            Chargement...
          </div>
        ) : filteredFoods.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: 60,
            color: "#757575"
          }}>
            <Refrigerator size={52} strokeWidth={1.25} color="#BDBDBD" style={{ marginBottom: 16 }} />
            {foods.length === 0 ? (
              <>
                <p style={{ fontWeight: 600, fontSize: 16 }}>Frigo vide !</p>
                <p style={{ fontSize: 14, marginTop: 8 }}>
                  Appuyez sur + pour ajouter des aliments
                </p>
              </>
            ) : (
              <>
                <p style={{ fontWeight: 600, fontSize: 16 }}>Aucun résultat</p>
                <p style={{ fontSize: 14, marginTop: 8 }}>
                  Essayez une autre recherche ou un autre filtre
                </p>
              </>
            )}
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12
          }}>
            {filteredFoods.map(food => (
              <FoodCard
  key={food.id}
  food={food}
  onDelete={() => fetchFoods()}
  onEdit={() => fetchFoods()}
/>
            ))}
          </div>
        )}
      </div>

      {/* FAB BOUTON + */}
      <button
        onClick={() => setShowAdd(true)}
        style={{
          position: "fixed",
          bottom: 90,
          left: "50%",
          transform: "translateX(-50%)",
          width: 60,
          height: 60,
          borderRadius: 30,
          background: "#4CAF50",
          color: "white",
          fontSize: 32,
          border: "none",
          boxShadow: "0 4px 20px rgba(76,175,80,0.4)",
          cursor: "pointer",
          zIndex: 99,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        +
      </button>
    </div>
  );
}