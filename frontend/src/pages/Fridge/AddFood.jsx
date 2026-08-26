import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import TopBar from "../../components/TopBar";
import Scanner from "./Scanner";

export default function AddFood({ onBack }) {
  const { authFetch } = useAuth();
  const [name, setName] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [success, setSuccess] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);

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

  const [imageError, setImageError] = useState("");

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageError("");
    setImagePreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/upload`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error(`Upload échoué (${res.status})`);
      const uploadData = await res.json();
      if (!uploadData.url) throw new Error("Pas d'URL retournée par le serveur");
      setImageUrl(uploadData.url);
    } catch (err) {
      console.error("Erreur upload image", err);
      setImageError("La photo n'a pas pu être envoyée. Vérifie ta connexion et réessaie.");
      setImagePreview("");
    }
  };

  const handleSubmit = async () => {
    if (!name || !expirationDate) {
      alert("Nom et date d'expiration obligatoires");
      return;
    }
    setLoading(true);
    try {
      await authFetch("/foods", {
        method: "POST",
        body: JSON.stringify({
          name,
          expiration_date: expirationDate,
          quantity: parseInt(quantity) || 1,
          unit,
          category_id: categoryId || null,
          image_url: imageUrl || null
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

  const handleScanResult = (productName, category, productImage) => {
    setName(productName);
    if (category) setCategoryId(category);
    if (productImage) setImageUrl(productImage);
    if (productImage) setImagePreview(productImage);
    setShowScanner(false);
  };

  if (showScanner) {
    return <Scanner onResult={handleScanResult} onBack={() => setShowScanner(false)} />;
  }

  return (
    <div style={{ minHeight: "100dvh", background: "white", paddingBottom: "calc(100px + env(safe-area-inset-bottom))" }}>
      <TopBar title="Ajouter un aliment" showBack onBack={onBack} />

      <div style={{ padding: "24px 20px" }}>

        <button
          onClick={() => setShowScanner(true)}
          style={{
            width: "100%", padding: "16px", borderRadius: 16,
            border: "2px dashed #4CAF50", background: "#E8F5E9",
            color: "#4CAF50", fontWeight: 600, fontSize: 15,
            marginBottom: 24, cursor: "pointer",
            display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8
          }}
        >
          📦 Scanner / Photo IA
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* PHOTO */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#757575", display: "block", marginBottom: 8 }}>
              PHOTO (optionnel)
            </label>

            {imagePreview ? (
              <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", height: 120 }}>
                <img
                  src={imagePreview}
                  alt="preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <button
                  onClick={() => { setImagePreview(""); setImageUrl(""); }}
                  style={{
                    position: "absolute", top: 8, right: 8,
                    background: "rgba(0,0,0,0.5)", color: "white",
                    border: "none", borderRadius: 20,
                    width: 28, height: 28, fontSize: 14,
                    cursor: "pointer"
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => {
                    fileInputRef.current.removeAttribute("capture");
                    fileInputRef.current.click();
                  }}
                  style={{
                    flex: 1, padding: "14px 8px", borderRadius: 14,
                    border: "2px dashed #EEEEEE", background: "#F9F9F9",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 6, cursor: "pointer"
                  }}
                >
                  <span style={{ fontSize: 24 }}>🖼️</span>
                  <p style={{ fontSize: 12, color: "#757575", fontWeight: 600 }}>Mes fichiers</p>
                </button>

                <button
                  onClick={() => {
                    fileInputRef.current.setAttribute("capture", "environment");
                    fileInputRef.current.click();
                  }}
                  style={{
                    flex: 1, padding: "14px 8px", borderRadius: 14,
                    border: "2px dashed #EEEEEE", background: "#F9F9F9",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 6, cursor: "pointer"
                  }}
                >
                  <span style={{ fontSize: 24 }}>📷</span>
                  <p style={{ fontSize: 12, color: "#757575", fontWeight: 600 }}>Prendre photo</p>
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: "none" }}
            />

            {imageError && (
              <p style={{ color: "#FF5252", fontSize: 12, marginTop: 8 }}>
                {imageError}
              </p>
            )}
          </div>

          {/* NOM */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#757575", display: "block", marginBottom: 8 }}>
              NOM DE L'ALIMENT *
            </label>
            <input
              placeholder="Ex: Lait, Poulet, Tomates..."
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* CATÉGORIE */}
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
                fontSize: 15, background: "white",
                color: categoryId ? "#1A1A1A" : "#757575",
                outline: "none"
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

          {/* DATE EXPIRATION */}
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

          {/* QUANTITÉ */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#757575", display: "block", marginBottom: 8 }}>
                QUANTITÉ
              </label>
              <input
                type="number"
                placeholder="1"
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
              textAlign: "center", fontWeight: 600, fontSize: 16
            }}>
              ✅ Aliment ajouté !
            </div>
          ) : (
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading}
              style={{ marginTop: 8, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Ajout en cours..." : "Ajouter au frigo 🧊"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}