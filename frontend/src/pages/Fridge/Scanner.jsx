import { useRef, useState } from "react";
import TopBar from "../../components/TopBar";
import { useAuth } from "../../context/AuthContext";

export default function Scanner({ onResult, onBack }) {
  const { authFetch } = useAuth();
  const [mode, setMode] = useState("choice");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const barcodeCameraInputRef = useRef(null);
  const barcodeFileInputRef = useRef(null);

  const startScanner = () => {
    barcodeCameraInputRef.current?.click();
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleBarcodePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";

    setMode("barcode");
    setLoading(true);
    setError("");
    setNotFound(false);
    setProduct(null);

    try {
      const base64 = await fileToBase64(file);
      const response = await authFetch("/foods/decode-barcode", {
        method: "POST",
        body: JSON.stringify({ image_base64: base64 })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Aucun code-barres detecte");
      }

      await fetchProduct(data.barcode);
    } catch (err) {
      console.error("Erreur decodage code-barres", err);
      setError(`Erreur: ${err.message || "code-barres non detecte"}`);
      setNotFound(true);
      setLoading(false);
    }
  };

  const fetchProduct = async (barcode) => {
    setLoading(true);
    setError("");
    setMode("barcode");
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        setProduct({
          barcode,
          name: p.product_name_fr || p.product_name || "Produit inconnu",
          brand: p.brands || "",
          category: p.categories_tags?.[0]?.replace("en:", "") || "",
          image: p.image_url || "",
          nutriscore: p.nutriscore_grade || "",
          fromIA: false
        });
        setNotFound(false);
      } else {
        setNotFound(true);
        setProduct(null);
      }
    } catch (err) {
      setError("Erreur lors de la recherche du produit");
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset input pour permettre de resélectionner le même fichier
    e.target.value = "";

    setMode("camera");
    setLoading(true);
    setError("");
    setProduct(null);
    setNotFound(false);

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await authFetch("/foods/identify-image", {
        method: "POST",
        body: JSON.stringify({
          image_base64: base64,
          mime_type: file.type
        })
      });

      const identified = await response.json();

      if (!response.ok) {
        throw new Error(identified.message || "Erreur d'analyse");
      }

      if (identified.name && identified.name !== "Inconnu") {
        setProduct({
          name: identified.name,
          category: identified.category,
          image: URL.createObjectURL(file),
          fromIA: true,
          confidence: identified.confidence
        });
      } else {
        setNotFound(true);
      }

    } catch (err) {
      console.error(err);
      setError(`Erreur: ${err.message || "connexion au serveur impossible"}`);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (product) {
      onResult(product.name, product.category, product.image);
    }
  };

  const resetAll = () => {
    setMode("choice");
    setProduct(null);
    setError("");
    setNotFound(false);
    setLoading(false);
  };

  // =====================
  // ÉCRAN CHOIX
  // =====================
  const renderContent = () => {
  if (mode === "choice") {
    return (
      <div style={{ minHeight: "100dvh", background: "white", paddingBottom: "calc(100px + env(safe-area-inset-bottom))" }}>
        <TopBar title="Ajouter un aliment" showBack onBack={onBack} />
        <div style={{ padding: "32px 20px" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            Comment ajouter ?
          </h2>
          <p style={{ color: "#757575", marginBottom: 32, fontSize: 15 }}>
            Choisissez la méthode qui vous convient
          </p>

          {/* SCANNER CODE-BARRES */}
          <button
            onClick={startScanner}
            style={{
              width: "100%", padding: "20px", borderRadius: 20,
              border: "none",
              background: "linear-gradient(135deg, #4CAF50, #81C784)",
              color: "white", marginBottom: 16,
              display: "flex", alignItems: "center", gap: 16,
              cursor: "pointer", textAlign: "left"
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 28, flexShrink: 0
            }}>
              📦
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                Scanner un code-barres
              </p>
              <p style={{ fontSize: 13, opacity: 0.9 }}>
                Pour produits emballés (supermarché)
              </p>
            </div>
          </button>

          {/* PHOTO IA — deux options */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#757575", marginBottom: 10 }}>
              📸 Reconnaissance IA — choisissez une option
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  flex: 1, padding: "18px 8px", borderRadius: 20,
                  border: "none",
                  background: "linear-gradient(135deg, #2196F3, #64B5F6)",
                  color: "white",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 8,
                  cursor: "pointer"
                }}
              >
                <span style={{ fontSize: 28 }}>🖼️</span>
                <p style={{ fontWeight: 700, fontSize: 13 }}>Mes fichiers</p>
                <p style={{ fontSize: 11, opacity: 0.9 }}>Choisir une photo</p>
              </button>

              <button
                onClick={() => cameraInputRef.current?.click()}
                style={{
                  flex: 1, padding: "18px 8px", borderRadius: 20,
                  border: "none",
                  background: "linear-gradient(135deg, #9C27B0, #CE93D8)",
                  color: "white",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 8,
                  cursor: "pointer"
                }}
              >
                <span style={{ fontSize: 28 }}>📷</span>
                <p style={{ fontWeight: 700, fontSize: 13 }}>Prendre photo</p>
                <p style={{ fontSize: 11, opacity: 0.9 }}>Ouvrir la caméra</p>
              </button>
            </div>
          </div>

          {/* SAISIE MANUELLE */}
          <button
            onClick={onBack}
            style={{
              width: "100%", padding: "20px", borderRadius: 20,
              border: "2px solid #EEEEEE", background: "white",
              display: "flex", alignItems: "center", gap: 16,
              cursor: "pointer", textAlign: "left"
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: "#F9F9F9",
              display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 28, flexShrink: 0
            }}>
              ✍️
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: "#1A1A1A" }}>
                Saisie manuelle
              </p>
              <p style={{ fontSize: 13, color: "#757575" }}>
                Entrez le nom directement
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // =====================
  // CHARGEMENT
  // =====================
  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: "white", paddingBottom: "calc(100px + env(safe-area-inset-bottom))" }}>
        <TopBar title="Analyse en cours..." showBack onBack={resetAll} />
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>
            {mode === "camera" ? "📸" : "🔍"}
          </div>
          <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            {mode === "camera"
              ? "L'IA analyse votre photo..."
              : "Recherche du produit..."}
          </p>
          <p style={{ color: "#757575", fontSize: 14 }}>
            {mode === "camera"
              ? "Identification de l'aliment en cours"
              : "Consultation de la base Open Food Facts"}
          </p>
        </div>
      </div>
    );
  }

  // =====================
  // PRODUIT TROUVÉ
  // =====================
  if (product) {
    return (
      <div style={{ minHeight: "100dvh", background: "white", paddingBottom: "calc(100px + env(safe-area-inset-bottom))" }}>
        <TopBar
          title={product.fromIA ? "Aliment reconnu 📸" : "Produit trouvé 📦"}
          showBack onBack={resetAll}
        />
        <div style={{ padding: "24px 20px" }}>
          <div style={{
            background: "#F9F9F9", borderRadius: 20,
            padding: 24, marginBottom: 24, textAlign: "center"
          }}>
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                style={{
                  width: 120, height: 120,
                  objectFit: product.fromIA ? "cover" : "contain",
                  borderRadius: 16, marginBottom: 16
                }}
              />
            ) : (
              <div style={{ fontSize: 60, marginBottom: 16 }}>
                {product.fromIA ? "📸" : "📦"}
              </div>
            )}

            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              {product.name}
            </h3>

            {product.brand && (
              <p style={{ color: "#757575", fontSize: 14, marginBottom: 8 }}>
                {product.brand}
              </p>
            )}

            {product.category && (
              <div style={{
                display: "inline-block",
                background: "#E8F5E9", color: "#4CAF50",
                padding: "4px 14px", borderRadius: 20,
                fontSize: 13, fontWeight: 600, marginBottom: 8
              }}>
                {product.category}
              </div>
            )}

            {product.fromIA && product.confidence && (
              <div style={{
                background: "#E3F2FD", color: "#1565C0",
                padding: "8px 14px", borderRadius: 12,
                fontSize: 13, marginTop: 8
              }}>
                🤖 Confiance IA : {product.confidence}
              </div>
            )}

            {product.nutriscore && (
              <div style={{
                background: product.nutriscore === "a" ? "#4CAF50" :
                             product.nutriscore === "b" ? "#8BC34A" :
                             product.nutriscore === "c" ? "#FF9800" :
                             product.nutriscore === "d" ? "#FF5722" : "#FF5252",
                color: "white",
                padding: "4px 14px", borderRadius: 20,
                fontSize: 13, fontWeight: 700, marginTop: 8,
                display: "inline-block"
              }}>
                Nutri-Score {product.nutriscore.toUpperCase()}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button className="btn-primary" onClick={handleConfirm}>
              ✅ Utiliser cet aliment
            </button>
            <button className="btn-outline" onClick={resetAll}>
              🔄 Recommencer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =====================
  // PRODUIT NON TROUVÉ
  // =====================
  if (notFound) {
    return (
      <div style={{ minHeight: "100dvh", background: "white", paddingBottom: "calc(100px + env(safe-area-inset-bottom))" }}>
        <TopBar title="Non trouvé" showBack onBack={resetAll} />
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>😕</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Produit non reconnu
          </h3>
          <p style={{ color: "#757575", fontSize: 14, marginBottom: 8, lineHeight: 1.6 }}>
            Que souhaitez-vous faire ?
          </p>

          {error && (
            <div style={{
              background: "#FFEBEE", color: "#FF5252",
              padding: "10px 14px", borderRadius: 12,
              fontSize: 13, marginBottom: 24, textAlign: "left"
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              onClick={startScanner}
              style={{
                width: "100%", padding: "16px", borderRadius: 16,
                border: "none", background: "#4CAF50",
                color: "white", fontWeight: 600,
                fontSize: 15, cursor: "pointer",
                display: "flex", alignItems: "center",
                justifyContent: "center", gap: 8
              }}
            >
              📦 Rescanner le code-barres
            </button>

            {/* Deux boutons photo dans "non trouvé" */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  flex: 1, padding: "14px 8px", borderRadius: 16,
                  border: "none", background: "#2196F3",
                  color: "white", fontWeight: 600,
                  fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 6
                }}
              >
                🖼️ Mes fichiers
              </button>
              <button
                onClick={() => cameraInputRef.current?.click()}
                style={{
                  flex: 1, padding: "14px 8px", borderRadius: 16,
                  border: "none", background: "#9C27B0",
                  color: "white", fontWeight: 600,
                  fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 6
                }}
              >
                📷 Prendre photo
              </button>
            </div>

            <button
              onClick={onBack}
              style={{
                width: "100%", padding: "16px", borderRadius: 16,
                border: "2px solid #EEEEEE", background: "white",
                color: "#1A1A1A", fontWeight: 600,
                fontSize: 15, cursor: "pointer",
                display: "flex", alignItems: "center",
                justifyContent: "center", gap: 8
              }}
            >
              ✍️ Saisir manuellement
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =====================
  // ETAT INTERMEDIAIRE (rarement visible, la photo est traitee immediatement)
  // =====================
  return (
    <div style={{ minHeight: "100dvh", background: "white", paddingBottom: "calc(100px + env(safe-area-inset-bottom))" }}>
      <TopBar title="Scanner le code-barres" showBack onBack={resetAll} />
      <div style={{ padding: "20px" }}>
        {error && (
          <div style={{
            background: "#FFEBEE", color: "#FF5252",
            padding: "12px 16px", borderRadius: 12,
            fontSize: 14, marginBottom: 16
          }}>
            {error}
          </div>
        )}

        <button
          onClick={resetAll}
          style={{
            width: "100%", padding: "14px", borderRadius: 16,
            border: "1.5px solid #EEEEEE", background: "white",
            color: "#757575", fontWeight: 600,
            fontSize: 14, cursor: "pointer"
          }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
  };

  return (
    <>
      {renderContent()}

      {/* INPUTS CACHÉS — toujours montés, quel que soit l'écran affiché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: "none" }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageUpload}
        style={{ display: "none" }}
      />
      <input
        ref={barcodeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleBarcodePhoto}
        style={{ display: "none" }}
      />
      <input
        ref={barcodeFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleBarcodePhoto}
        style={{ display: "none" }}
      />
    </>
  );
}