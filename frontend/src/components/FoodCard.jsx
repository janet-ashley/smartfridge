import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import EditFood from "../pages/Fridge/EditFood";
import { Apple, Carrot, Milk, Drumstick, Fish, Wheat, CupSoda, Package, Trash2, Pencil, X } from "lucide-react";

const STATUS_COLORS = {
  ok: "#4CAF50",
  soon: "#FF9800",
  expired: "#FF5252"
};

const STATUS_BG = {
  ok: "#E8F5E9",
  soon: "#FFF3E0",
  expired: "#FFEBEE"
};

const CATEGORY_ICONS = {
  "Fruits": Apple,
  "Légumes": Carrot,
  "Laitages": Milk,
  "Viandes": Drumstick,
  "Poissons": Fish,
  "Féculents": Wheat,
  "Boissons": CupSoda,
  "Autres": Package
};

export default function FoodCard({ food, onDelete, onEdit }) {
  const { authFetch } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);

  const handleDelete = async () => {
    await authFetch(`/foods/${food.id}`, { method: "DELETE" });
    setShowConfirm(false);
    onDelete();
  };

  const CategoryIcon = food.category_icon ? null : (CATEGORY_ICONS[food.category_name] || Package);

  if (showEdit) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0,
        width: "100%", height: "100%",
        zIndex: 200, background: "white",
        overflowY: "auto"
      }}>
        <EditFood
          food={food}
          onBack={() => {
            setShowEdit(false);
            if (onEdit) onEdit();
          }}
        />
      </div>
    );
  }

  return (
    <>
      {/* MODAL SUPPRESSION */}
      {showConfirm && (
        <div style={{
          position: "fixed", top: 0, left: 0,
          width: "100%", height: "100%",
          background: "rgba(0,0,0,0.5)",
          zIndex: 300, display: "flex",
          alignItems: "center", justifyContent: "center",
          padding: "0 20px"
        }}>
          <div style={{
            background: "white", borderRadius: 24,
            padding: "28px 24px", width: "100%",
            maxWidth: 340, textAlign: "center"
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "#FFEBEE", display: "flex",
              alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px"
            }}>
              <Trash2 size={30} strokeWidth={1.75} color="#FF5252" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Supprimer {food.name} ?
            </h3>
            <p style={{ color: "#757575", fontSize: 14, marginBottom: 24 }}>
              Cette action est irréversible
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1, padding: "14px", borderRadius: 14,
                  border: "1.5px solid #EEEEEE", background: "white",
                  color: "#757575", fontWeight: 600, fontSize: 15,
                  cursor: "pointer"
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                style={{
                  flex: 1, padding: "14px", borderRadius: 14,
                  border: "none", background: "#FF5252",
                  color: "white", fontWeight: 600, fontSize: 15,
                  cursor: "pointer"
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CARTE */}
      <div style={{
        background: "white",
        borderRadius: 20,
        padding: 16,
        boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
        position: "relative"
      }}>
        {/* IMAGE ou ICÔNE */}
        <div style={{
          width: "100%", height: 80,
          background: STATUS_BG[food.status] || "#F9F9F9",
          borderRadius: 16,
          display: "flex", alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
          overflow: "hidden"
        }}>
          {food.image_url && !imgBroken ? (
            <img
              src={
                food.image_url.startsWith("/uploads")
                  ? `${import.meta.env.VITE_API_URL}${food.image_url}`
                  : food.image_url
              }
              alt={food.name}
              style={{
                width: "100%", height: "100%",
                objectFit: "cover", borderRadius: 16
              }}
              onError={() => setImgBroken(true)}
            />
          ) : food.category_icon ? (
            <span style={{ fontSize: 36 }}>{food.category_icon}</span>
          ) : (
            <CategoryIcon size={32} strokeWidth={1.5} color={STATUS_COLORS[food.status] || "#757575"} />
          )}
        </div>

        {/* NOM */}
        <p style={{
          fontWeight: 600, fontSize: 14,
          color: "#1A1A1A", marginBottom: 6,
          textTransform: "capitalize",
          paddingRight: 50
        }}>
          {food.name}
        </p>

        {/* STATUT */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: 4,
            background: STATUS_COLORS[food.status]
          }} />
          <span style={{
            fontSize: 12,
            color: STATUS_COLORS[food.status],
            fontWeight: 500
          }}>
            {food.status === "expired"
              ? "Expiré"
              : `${food.daysLeft}j restants`}
          </span>
        </div>

        {/* QUANTITÉ */}
        {food.quantity && (
          <p style={{ fontSize: 12, color: "#757575", marginTop: 4 }}>
            {food.quantity} {food.unit || ""}
          </p>
        )}

        {/* BOUTONS ACTION */}
        <div style={{
          position: "absolute", top: 10, right: 10,
          display: "flex", gap: 4
        }}>
          <button
            onClick={() => setShowEdit(true)}
            style={{
              background: "white", border: "none",
              cursor: "pointer", borderRadius: 8,
              opacity: 0.7, padding: 6, lineHeight: 1,
              display: "flex", boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
            }}
          >
            <Pencil size={14} strokeWidth={2} color="#616161" />
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            style={{
              background: "white", border: "none",
              cursor: "pointer", borderRadius: 8,
              opacity: 0.7, padding: 6, lineHeight: 1,
              display: "flex", boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
            }}
          >
            <X size={14} strokeWidth={2} color="#616161" />
          </button>
        </div>
      </div>
    </>
  );
}