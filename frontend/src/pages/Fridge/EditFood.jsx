import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import TopBar from "../../components/TopBar";

export default function EditFood({ food, onBack }) {
  const { authFetch } = useAuth();
  const [name, setName] = useState(food.name || "");
  const [expirationDate, setExpirationDate] = useState(
    food.expiration_date ? food.expiration_date.split("T")[0] : ""
  );
  const [quantity, setQuantity] = useState(food.quantity || 1);
  const [unit, setUnit] = useState(food.unit || "");
  const [categoryId, setCategoryId] = useState(food.category_id || "");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await authFetch("/categories");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    if (!name || !expirationDate) {
      alert("Nom et date obligatoires");
      return;
    }
    setLoading(true);
    try {
      await authFetch(`/foods/${food.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          expiration_date: expirationDate,
          quantity: parseInt(quantity) || 1,
          unit,
          category_id: categoryId || null
        })
      });
      setSuccess(true);
      setTimeout(() => onBack(), 1000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100dvh", background: "white", paddingBottom: "calc(100px + env(safe-area-inset-bottom))" }}>
      <TopBar title="Modifier l'aliment" showBack onBack={onBack} />
      <div style={{ padding: "24px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#757575", display: "block", marginBottom: 8 }}>
              NOM *
            </label>
            <input value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#757575", display: "block", marginBottom: 8 }}>
              CATÉGORIE
            </label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              style={{
                width: "100%", padding: "14px 16px",
                borderRadius: 12, border: "1.5px solid #EEEEEE",
                fontSize: 15, background: "white", outline: "none"
              }}
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#757575", display: "block", marginBottom: 8 }}>
              DATE D'EXPIRATION *
            </label>
            <input
              type="date"
              value={expirationDate}
              onChange={e => setExpirationDate(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#757575", display: "block", marginBottom: 8 }}>
                QUANTITÉ
              </label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                min="1"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#757575", display: "block", marginBottom: 8 }}>
                UNITÉ
              </label>
              <input
                placeholder="kg, L, pcs..."
                value={unit}
                onChange={e => setUnit(e.target.value)}
              />
            </div>
          </div>

          {success ? (
            <div style={{
              background: "#E8F5E9", color: "#4CAF50",
              padding: "16px", borderRadius: 16,
              textAlign: "center", fontWeight: 600
            }}>
              ✅ Aliment modifié !
            </div>
          ) : (
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Modification..." : "Sauvegarder les modifications"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}