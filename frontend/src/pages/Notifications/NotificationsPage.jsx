import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import TopBar from "../../components/TopBar";
import { Bell, AlertCircle, Clock, CheckCircle2, Apple, Carrot, Milk, Drumstick, Fish, Wheat, CupSoda, Package } from "lucide-react";

const CATEGORY_ICONS = {
  "Fruits": Apple, "Légumes": Carrot, "Laitages": Milk, "Viandes": Drumstick,
  "Poissons": Fish, "Féculents": Wheat, "Boissons": CupSoda, "Autres": Package
};

export default function NotificationsPage() {
  const { authFetch } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [notifRes, foodsRes] = await Promise.all([
        authFetch("/notifications"),
        authFetch("/foods")
      ]);
      const notifData = await notifRes.json();
      const foodsData = await foodsRes.json();
      setNotifications(Array.isArray(notifData) ? notifData : []);
      setFoods(Array.isArray(foodsData) ? foodsData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const expiredFoods = foods.filter(f => f.status === "expired");
  const soonFoods = foods.filter(f => f.status === "soon");
  const okFoods = foods.filter(f => f.status === "ok");

  return (
    <div style={{ minHeight: "100dvh", background: "#F9F9F9", paddingBottom: "calc(100px + env(safe-area-inset-bottom))" }}>
      <TopBar title="Alertes" />

      <div style={{ padding: "20px 20px 100px" }}>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#757575" }}>
            Chargement...
          </div>
        ) : (
          <>
            {/* RÉSUMÉ */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              marginBottom: 24
            }}>
              <div style={{
                background: "white",
                borderRadius: 16,
                padding: "16px 12px",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 5,
                  background: "#FF5252", margin: "0 auto 8px"
                }} />
                <p style={{ fontSize: 22, fontWeight: 700, color: "#FF5252" }}>
                  {expiredFoods.length}
                </p>
                <p style={{ fontSize: 11, color: "#757575" }}>Expirés</p>
              </div>
              <div style={{
                background: "white",
                borderRadius: 16,
                padding: "16px 12px",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 5,
                  background: "#FF9800", margin: "0 auto 8px"
                }} />
                <p style={{ fontSize: 22, fontWeight: 700, color: "#FF9800" }}>
                  {soonFoods.length}
                </p>
                <p style={{ fontSize: 11, color: "#757575" }}>Bientôt</p>
              </div>
              <div style={{
                background: "white",
                borderRadius: 16,
                padding: "16px 12px",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 5,
                  background: "#4CAF50", margin: "0 auto 8px"
                }} />
                <p style={{ fontSize: 22, fontWeight: 700, color: "#4CAF50" }}>
                  {okFoods.length}
                </p>
                <p style={{ fontSize: 11, color: "#757575" }}>Frais</p>
              </div>
            </div>

            {/* EXPIRÉS */}
            {expiredFoods.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{
                  fontSize: 15,
                  fontWeight: 700,
                  marginBottom: 12,
                  color: "#FF5252",
                  display: "flex", alignItems: "center", gap: 8
                }}>
                  <AlertCircle size={17} strokeWidth={1.75} />
                  Expirés — À jeter
                </h3>
                {expiredFoods.map(food => (
                  <div key={food.id} style={{
                    background: "white",
                    borderRadius: 16,
                    padding: "14px 16px",
                    marginBottom: 8,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    borderLeft: "4px solid #FF5252",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 15, textTransform: "capitalize" }}>
                        {food.name}
                      </p>
                      <p style={{ fontSize: 12, color: "#FF5252", marginTop: 2 }}>
                        Expiré depuis {Math.abs(food.daysLeft)} jour{Math.abs(food.daysLeft) > 1 ? "s" : ""}
                      </p>
                    </div>
                    <span>
                      {(() => { const Icon = CATEGORY_ICONS[food.category_name] || Package; return <Icon size={22} strokeWidth={1.5} color="#9E9E9E" />; })()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* BIENTÔT */}
            {soonFoods.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{
                  fontSize: 15,
                  fontWeight: 700,
                  marginBottom: 12,
                  color: "#FF9800",
                  display: "flex", alignItems: "center", gap: 8
                }}>
                  <Clock size={17} strokeWidth={1.75} />
                  Expirent bientôt
                </h3>
                {soonFoods.map(food => (
                  <div key={food.id} style={{
                    background: "white",
                    borderRadius: 16,
                    padding: "14px 16px",
                    marginBottom: 8,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    borderLeft: "4px solid #FF9800"
                  }}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8
                    }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 15, textTransform: "capitalize" }}>
                          {food.name}
                        </p>
                        <p style={{ fontSize: 12, color: "#FF9800", marginTop: 2 }}>
                          {food.daysLeft === 0
                            ? "Expire aujourd'hui !"
                            : `${food.daysLeft} jour${food.daysLeft > 1 ? "s" : ""} restant${food.daysLeft > 1 ? "s" : ""}`}
                        </p>
                      </div>
                      <span>
                        {(() => { const Icon = CATEGORY_ICONS[food.category_name] || Package; return <Icon size={22} strokeWidth={1.5} color="#9E9E9E" />; })()}
                      </span>
                    </div>
                    {/* BARRE PROGRESSION */}
                    <div style={{
                      background: "#EEEEEE",
                      borderRadius: 4,
                      height: 4,
                      overflow: "hidden"
                    }}>
                      <div style={{
                        background: "#FF9800",
                        height: "100%",
                        width: `${Math.max(0, (food.daysLeft / 3) * 100)}%`,
                        borderRadius: 4
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FRAIS */}
            {okFoods.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{
                  fontSize: 15,
                  fontWeight: 700,
                  marginBottom: 12,
                  color: "#4CAF50",
                  display: "flex", alignItems: "center", gap: 8
                }}>
                  <CheckCircle2 size={17} strokeWidth={1.75} />
                  Frais — Tout va bien
                </h3>
                {okFoods.map(food => (
                  <div key={food.id} style={{
                    background: "white",
                    borderRadius: 16,
                    padding: "14px 16px",
                    marginBottom: 8,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    borderLeft: "4px solid #4CAF50",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 15, textTransform: "capitalize" }}>
                        {food.name}
                      </p>
                      <p style={{ fontSize: 12, color: "#4CAF50", marginTop: 2 }}>
                        {food.daysLeft} jour{food.daysLeft > 1 ? "s" : ""} restant{food.daysLeft > 1 ? "s" : ""}
                      </p>
                    </div>
                    <span>
                      {(() => { const Icon = CATEGORY_ICONS[food.category_name] || Package; return <Icon size={22} strokeWidth={1.5} color="#9E9E9E" />; })()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* VIDE */}
            {foods.length === 0 && (
              <div style={{
                textAlign: "center",
                padding: 60,
                color: "#757575"
              }}>
                <Bell size={48} strokeWidth={1.25} color="#BDBDBD" style={{ marginBottom: 16 }} />
                <p style={{ fontWeight: 600, fontSize: 16 }}>
                  Aucune alerte
                </p>
                <p style={{ fontSize: 14, marginTop: 8 }}>
                  Ajoutez des aliments pour recevoir des alertes
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}