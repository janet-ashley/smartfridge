import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import TopBar from "../../components/TopBar";
import {
  Sprout, Medal, Award, Gem, Crown, Refrigerator, UtensilsCrossed,
  Trophy, BarChart3, Pencil, Check, LogOut, ChevronDown, ChevronUp,
  PartyPopper, AlertTriangle, Bell, BellOff
} from "lucide-react";
import { isPushSupported, isStandalone, getCurrentSubscription, subscribeToPush, unsubscribeFromPush } from "../../utils/push";

const LEVELS = [
  { name: "Debutant", Icon: Sprout, min: 0, max: 49, color: "#757575", perks: "Acces a toutes les fonctionnalites de base" },
  { name: "Bronze", Icon: Medal, min: 50, max: 149, color: "#CD7F32", perks: "Badge Bronze sur votre profil" },
  { name: "Argent", Icon: Medal, min: 150, max: 299, color: "#9E9E9E", perks: "Recettes exclusives debloquees" },
  { name: "Or", Icon: Award, min: 300, max: 499, color: "#DBA800", perks: "Conseils nutrition personnalises" },
  { name: "Diamant", Icon: Gem, min: 500, max: 999, color: "#00BCD4", perks: "Mode Chef Expert dans les recettes" },
  { name: "Legende", Icon: Crown, min: 1000, max: 999999, color: "#9C27B0", perks: "Titre Legende affiche partout" }
];

export default function ProfilePage() {
  const { authFetch, logout } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [levelData, setLevelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLevels, setShowLevels] = useState(false);
  const [editUsername, setEditUsername] = useState(false);
  const [editPassword, setEditPassword] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState("");
  const [bannerColor, setBannerColor] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const BANNER_COLORS = [
    "#4CAF50", "#2196F3", "#9C27B0", "#FF9800",
    "#E91E63", "#00BCD4", "#795548", "#607D8B"
  ];

  useEffect(() => {
    if (!isPushSupported()) return;
    getCurrentSubscription().then(sub => setPushEnabled(!!sub)).catch(() => {});
  }, []);

  const togglePush = async () => {
    setPushError("");
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush(authFetch);
        setPushEnabled(false);
        showSuccess("Notifications désactivées");
      } else {
        await subscribeToPush(authFetch);
        setPushEnabled(true);
        showSuccess("Notifications activées !");
      }
    } catch (err) {
      setPushError(err.message || "Erreur lors de l'activation des notifications");
    } finally {
      setPushLoading(false);
    }
  };

  const sendTestPush = async () => {
    try {
      await authFetch("/push/test", { method: "POST" });
      showSuccess("Notification de test envoyée !");
    } catch (err) {
      setPushError("Erreur lors de l'envoi du test");
    }
  };
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, levelRes] = await Promise.all([
        authFetch("/user/profile"),
        authFetch("/challenges/levels")
      ]);
      const profileD = await profileRes.json();
      const levelD = await levelRes.json();
      setProfileData(profileD);
      setLevelData(levelD);
      setNewUsername(profileD?.user?.username || "");
      setBannerColor(profileD?.user?.banner_color || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const chooseBannerColor = async (color) => {
    setBannerColor(color);
    setShowColorPicker(false);
    try {
      await authFetch("/user/banner-color", {
        method: "PATCH",
        body: JSON.stringify({ color })
      });
      showSuccess("Couleur mise à jour !");
    } catch (err) {
      console.error(err);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg("");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const getLevelIcon = (name) => LEVELS.find(l => l.name === name)?.Icon || Sprout;

  const showError = (msg) => {
    setErrorMsg(msg);
    setSuccessMsg("");
    setTimeout(() => setErrorMsg(""), 3000);
  };

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) {
      showError("Le nom ne peut pas être vide");
      return;
    }
    try {
      const res = await authFetch("/user/username", {
        method: "PATCH",
        body: JSON.stringify({ username: newUsername })
      });
      const data = await res.json();
      showSuccess("Nom mis à jour !");
      setEditUsername(false);
      fetchData();
    } catch (err) {
      showError("Erreur lors de la mise à jour");
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) {
      showError("Veuillez remplir tous les champs");
      return;
    }
    if (newPassword.length < 6) {
      showError("Le nouveau mot de passe doit faire au moins 6 caractères");
      return;
    }
    try {
      const res = await authFetch("/user/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess("Mot de passe mis à jour !");
        setEditPassword(false);
        setCurrentPassword("");
        setNewPassword("");
      } else {
        showError(data.message || "Erreur");
      }
    } catch (err) {
      showError("Erreur lors de la mise à jour");
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: "#F9F9F9", paddingBottom: "calc(100px + env(safe-area-inset-bottom))" }}>
        <TopBar title="Profil" />
        <div style={{ textAlign: "center", padding: 60, color: "#757575" }}>
          Chargement...
        </div>
      </div>
    );
  }

  const currentLevel = levelData?.currentLevel;
  const nextLevel = levelData?.nextLevel;
  const points = levelData?.points || 0;
  const progress = levelData?.progress || 0;
  const stats = profileData?.stats;
  const week = profileData?.week;

  return (
    <div style={{ minHeight: "100dvh", background: "#F9F9F9", paddingBottom: "calc(100px + env(safe-area-inset-bottom))" }}>
      <TopBar title="Profil" />

      {/* MESSAGES */}
      {successMsg && (
        <div style={{
          position: "fixed", top: 80,
          left: "50%", transform: "translateX(-50%)",
          background: "#4CAF50", color: "white",
          padding: "12px 24px", borderRadius: 20,
          fontWeight: 600, fontSize: 14, zIndex: 200,
          boxShadow: "0 4px 20px rgba(76,175,80,0.4)",
          whiteSpace: "nowrap"
        }}>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{
          position: "fixed", top: 80,
          left: "50%", transform: "translateX(-50%)",
          background: "#FF5252", color: "white",
          padding: "12px 24px", borderRadius: 20,
          fontWeight: 600, fontSize: 14, zIndex: 200,
          whiteSpace: "nowrap"
        }}>
          {errorMsg}
        </div>
      )}

      <div style={{ padding: "20px 20px 100px" }}>

        {/* CARTE PROFIL */}
        <div style={{
          background: `linear-gradient(135deg, ${bannerColor || currentLevel?.color || "#4CAF50"}, ${bannerColor || currentLevel?.color || "#4CAF50"}99)`,
          borderRadius: 24, padding: "28px 20px",
          marginBottom: showColorPicker ? 0 : 20, color: "white", textAlign: "center",
          position: "relative"
        }}>
          <button
            onClick={() => setShowColorPicker(v => !v)}
            style={{
              position: "absolute", top: 16, right: 16,
              width: 32, height: 32, borderRadius: 16,
              background: "rgba(255,255,255,0.25)", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", padding: 0
            }}
          >
            <Pencil size={14} strokeWidth={2} color="white" />
          </button>

          <div style={{
            width: 80, height: 80, borderRadius: 40,
            background: "rgba(255,255,255,0.3)",
            display: "flex", alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px"
          }}>
            {(() => {
              const CurrentIcon = getLevelIcon(currentLevel?.name);
              return <CurrentIcon size={38} color="white" strokeWidth={1.75} />;
            })()}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            {levelData?.username || levelData?.email?.split("@")[0] || "Utilisateur"}
          </h2>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.25)",
            padding: "4px 16px", borderRadius: 20,
            fontSize: 14, fontWeight: 600, marginBottom: 20
          }}>
            {(() => {
              const CurrentIcon = getLevelIcon(currentLevel?.name);
              return <CurrentIcon size={15} strokeWidth={2} />;
            })()}
            {currentLevel?.name} • {points} pts
          </div>

          {nextLevel ? (
            <div>
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontSize: 12, opacity: 0.9, marginBottom: 6
              }}>
                <span>{currentLevel?.name}</span>
                <span>{nextLevel?.name} ({nextLevel?.min} pts)</span>
              </div>
              <div style={{
                background: "rgba(255,255,255,0.3)",
                borderRadius: 8, height: 10, overflow: "hidden"
              }}>
                <div style={{
                  background: "white", height: "100%",
                  width: `${progress}%`, borderRadius: 8,
                  transition: "width 0.5s"
                }} />
              </div>
              <p style={{ fontSize: 12, opacity: 0.9, marginTop: 6 }}>
                {nextLevel.min - points} pts avant {nextLevel.name}
              </p>
            </div>
          ) : (
            <div style={{
              background: "rgba(255,255,255,0.2)",
              padding: "8px 16px", borderRadius: 12,
              fontSize: 14, fontWeight: 600
            }}>
              Niveau maximum atteint !
            </div>
          )}
        </div>

        {/* SÉLECTEUR DE COULEUR DE BANNIÈRE */}
        {showColorPicker && (
          <div style={{
            background: "white", borderRadius: "0 0 20px 20px",
            padding: "16px 20px", marginBottom: 20,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#757575", marginBottom: 12 }}>
              Choisis une couleur pour ta bannière
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {BANNER_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => chooseBannerColor(color)}
                  style={{
                    width: 40, height: 40, borderRadius: 20,
                    background: color, border: bannerColor === color ? "3px solid #1A1A1A" : "3px solid transparent",
                    cursor: "pointer", padding: 0
                  }}
                />
              ))}
              {bannerColor && (
                <button
                  onClick={() => chooseBannerColor(null)}
                  style={{
                    padding: "0 14px", height: 40, borderRadius: 20,
                    background: "#F5F5F5", border: "none",
                    color: "#757575", fontSize: 12, fontWeight: 600, cursor: "pointer"
                  }}
                >
                  Par défaut
                </button>
              )}
            </div>
          </div>
        )}

        {/* STATS */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12, marginBottom: 20
        }}>
          {[
            { label: "Aliments", value: stats?.foods || 0, Icon: Refrigerator },
            { label: "Recettes", value: stats?.recipes || 0, Icon: UtensilsCrossed },
            { label: "Défis", value: stats?.challenges || 0, Icon: Trophy }
          ].map((stat, i) => (
            <div key={i} style={{
              background: "white", borderRadius: 16,
              padding: "16px 12px", textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }}>
              <stat.Icon size={22} strokeWidth={1.75} color="#4CAF50" style={{ marginBottom: 4 }} />
              <p style={{ fontSize: 22, fontWeight: 700, color: "#1A1A1A" }}>{stat.value}</p>
              <p style={{ fontSize: 11, color: "#757575" }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* BILAN SEMAINE */}
        {week && (
          <div style={{
            background: "white", borderRadius: 20,
            padding: "20px", marginBottom: 20,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <BarChart3 size={18} strokeWidth={1.75} color="#4CAF50" />
              Bilan de la semaine
            </p>
            <div style={{
              background: week.expired_count === 0 ? "#E8F5E9" : week.expired_count <= 2 ? "#FFF3E0" : "#FFEBEE",
              borderRadius: 16, padding: "16px",
              borderLeft: `4px solid ${week.expired_count === 0 ? "#4CAF50" : week.expired_count <= 2 ? "#FF9800" : "#FF5252"}`
            }}>
              {week.expired_count === 0
                ? <PartyPopper size={26} strokeWidth={1.75} color="#4CAF50" style={{ marginBottom: 8 }} />
                : <AlertTriangle size={26} strokeWidth={1.75} color={week.expired_count <= 2 ? "#FF9800" : "#FF5252"} style={{ marginBottom: 8 }} />
              }
              <p style={{
                fontWeight: 700, fontSize: 15, marginBottom: 4,
                color: week.expired_count === 0 ? "#2E7D32" : week.expired_count <= 2 ? "#E65100" : "#C62828"
              }}>
                {week.expired_count === 0
                  ? "Zéro gaspillage cette semaine !"
                  : week.expired_count <= 2
                  ? `${week.expired_count} aliment(s) périmé(s)`
                  : `${week.expired_count} aliments périmés`}
              </p>
              <p style={{ fontSize: 13, color: "#757575", lineHeight: 1.5 }}>
                {week.message}
              </p>

              {week.money_lost > 0 && (
                <div style={{
                  marginTop: 14, paddingTop: 14,
                  borderTop: "1px solid rgba(0,0,0,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "space-between"
                }}>
                  <div>
                    <p style={{ fontSize: 11, color: "#757575", marginBottom: 2 }}>
                      Estimation gaspillée
                    </p>
                    <p style={{
                      fontSize: 20, fontWeight: 700,
                      color: week.expired_count === 0 ? "#2E7D32" : week.expired_count <= 2 ? "#E65100" : "#C62828"
                    }}>
                      ~{week.money_lost.toFixed(2)} €
                    </p>
                  </div>
                  {week.percent_change !== null && (
                    <div style={{
                      background: week.percent_change <= 0 ? "#E8F5E9" : "#FFEBEE",
                      color: week.percent_change <= 0 ? "#2E7D32" : "#C62828",
                      padding: "6px 12px", borderRadius: 20,
                      fontSize: 12, fontWeight: 700
                    }}>
                      {week.percent_change <= 0
                        ? `${Math.abs(week.percent_change)}% de moins`
                        : `${week.percent_change}% de plus`}
                    </div>
                  )}
                </div>
              )}
            </div>

            <p style={{ fontSize: 10, color: "#BDBDBD", marginTop: 10, textAlign: "center" }}>
              Estimation basée sur des prix moyens par catégorie, pas les prix réels payés
            </p>
          </div>
        )}

        {/* AVANTAGE NIVEAU */}
        <div style={{
          background: "white", borderRadius: 20,
          padding: "16px 20px", marginBottom: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          borderLeft: `4px solid ${currentLevel?.color}`
        }}>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
            {(() => {
              const CurrentIcon = getLevelIcon(currentLevel?.name);
              return <CurrentIcon size={17} strokeWidth={1.75} color={currentLevel?.color} />;
            })()}
            Votre avantage actuel
          </p>
          <p style={{ fontSize: 14, color: "#757575" }}>
            {LEVELS.find(l => l.name === currentLevel?.name)?.perks || "Acces de base"}
          </p>
        </div>

        {/* MODIFIER PROFIL */}
        <div style={{
          background: "white", borderRadius: 20,
          padding: "20px", marginBottom: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Pencil size={16} strokeWidth={1.75} color="#4CAF50" />
            Modifier mon profil
          </p>

          {/* MODIFIER NOM */}
          {!editUsername ? (
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 12,
              padding: "12px 16px", background: "#F9F9F9",
              borderRadius: 12
            }}>
              <div>
                <p style={{ fontSize: 12, color: "#757575", marginBottom: 2 }}>Nom</p>
                <p style={{ fontWeight: 600, fontSize: 15 }}>
                  {levelData?.username || "Non défini"}
                </p>
              </div>
              <button
                onClick={() => setEditUsername(true)}
                style={{
                  padding: "8px 16px", borderRadius: 10,
                  border: "1.5px solid #4CAF50", background: "white",
                  color: "#4CAF50", fontWeight: 600, fontSize: 13,
                  cursor: "pointer"
                }}
              >
                Modifier
              </button>
            </div>
          ) : (
            <div style={{ marginBottom: 12 }}>
              <input
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="Nouveau nom"
                style={{ marginBottom: 8 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleUpdateUsername}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 12,
                    border: "none", background: "#4CAF50",
                    color: "white", fontWeight: 600,
                    fontSize: 13, cursor: "pointer"
                  }}
                >
                  Sauvegarder
                </button>
                <button
                  onClick={() => setEditUsername(false)}
                  style={{
                    padding: "10px 16px", borderRadius: 12,
                    border: "1.5px solid #EEEEEE", background: "white",
                    color: "#757575", fontWeight: 600,
                    fontSize: 13, cursor: "pointer"
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* MODIFIER MOT DE PASSE */}
          {!editPassword ? (
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", padding: "12px 16px",
              background: "#F9F9F9", borderRadius: 12
            }}>
              <div>
                <p style={{ fontSize: 12, color: "#757575", marginBottom: 2 }}>Mot de passe</p>
                <p style={{ fontWeight: 600, fontSize: 15 }}>••••••••</p>
              </div>
              <button
                onClick={() => setEditPassword(true)}
                style={{
                  padding: "8px 16px", borderRadius: 10,
                  border: "1.5px solid #4CAF50", background: "white",
                  color: "#4CAF50", fontWeight: 600, fontSize: 13,
                  cursor: "pointer"
                }}
              >
                Modifier
              </button>
            </div>
          ) : (
            <div>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Mot de passe actuel"
                style={{ marginBottom: 8 }}
              />
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
                style={{ marginBottom: 8 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleUpdatePassword}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 12,
                    border: "none", background: "#4CAF50",
                    color: "white", fontWeight: 600,
                    fontSize: 13, cursor: "pointer"
                  }}
                >
                  Sauvegarder
                </button>
                <button
                  onClick={() => {
                    setEditPassword(false);
                    setCurrentPassword("");
                    setNewPassword("");
                  }}
                  style={{
                    padding: "10px 16px", borderRadius: 12,
                    border: "1.5px solid #EEEEEE", background: "white",
                    color: "#757575", fontWeight: 600,
                    fontSize: 13, cursor: "pointer"
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        {/* TOUS LES NIVEAUX */}
        <div style={{
          background: "white", borderRadius: 20,
          overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          marginBottom: 20
        }}>
          <button
            onClick={() => setShowLevels(!showLevels)}
            style={{
              width: "100%", padding: "16px 20px",
              background: "none", border: "none",
              display: "flex", justifyContent: "space-between",
              alignItems: "center", cursor: "pointer"
            }}
          >
            <p style={{ fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
              <Medal size={17} strokeWidth={1.75} color="#4CAF50" />
              Tous les niveaux
            </p>
            {showLevels
              ? <ChevronUp size={18} color="#757575" />
              : <ChevronDown size={18} color="#757575" />}
          </button>

          {showLevels && (
            <div style={{ padding: "0 20px 16px" }}>
              {LEVELS.map((level, i) => {
                const isUnlocked = points >= level.min;
                const isCurrent = currentLevel?.name === level.name;
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 0",
                    borderBottom: i < LEVELS.length - 1 ? "1px solid #EEEEEE" : "none",
                    opacity: isUnlocked ? 1 : 0.4
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 14,
                      background: isUnlocked ? `${level.color}22` : "#F5F5F5",
                      display: "flex", alignItems: "center",
                      justifyContent: "center",
                      border: isCurrent ? `2px solid ${level.color}` : "none",
                      flexShrink: 0
                    }}>
                      <level.Icon size={20} strokeWidth={1.75} color={isUnlocked ? level.color : "#BDBDBD"} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ fontWeight: 700, fontSize: 14, color: level.color }}>
                          {level.name}
                        </p>
                        {isCurrent && (
                          <span style={{
                            background: level.color, color: "white",
                            fontSize: 10, padding: "2px 8px",
                            borderRadius: 10, fontWeight: 600
                          }}>
                            ACTUEL
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: "#757575", marginTop: 2 }}>
                        {level.min === 0 ? "Des le debut" : `A partir de ${level.min} pts`} • {level.perks}
                      </p>
                    </div>
                    {isUnlocked && (
                      <Check size={18} strokeWidth={2.5} color="#4CAF50" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* NOTIFICATIONS */}
        {isPushSupported() && (
          <div style={{
            background: "white", borderRadius: 16, padding: 20,
            marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: pushEnabled ? 12 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {pushEnabled
                  ? <Bell size={18} strokeWidth={1.75} color="#4CAF50" />
                  : <BellOff size={18} strokeWidth={1.75} color="#9E9E9E" />}
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>Notifications</p>
                  <p style={{ fontSize: 12, color: "#757575" }}>
                    {pushEnabled ? "Activées sur cet appareil" : "Alertes d'expiration sur ton téléphone"}
                  </p>
                </div>
              </div>
              <button
                onClick={togglePush}
                disabled={pushLoading}
                style={{
                  width: 48, height: 28, borderRadius: 14,
                  border: "none", cursor: pushLoading ? "default" : "pointer",
                  background: pushEnabled ? "#4CAF50" : "#E0E0E0",
                  position: "relative", transition: "background 0.2s",
                  flexShrink: 0, opacity: pushLoading ? 0.6 : 1
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 11, background: "white",
                  position: "absolute", top: 3,
                  left: pushEnabled ? 23 : 3,
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                }} />
              </button>
            </div>

            {!isStandalone() && (
              <div style={{
                background: "#FFF3E0", color: "#E65100",
                padding: "10px 12px", borderRadius: 10,
                fontSize: 12, marginTop: 12, lineHeight: 1.5
              }}>
                ⚠️ Ouvre l'app depuis son icône sur l'écran d'accueil (pas depuis Safari) pour pouvoir activer les notifications.
              </div>
            )}

            {pushError && (
              <div style={{
                background: "#FFEBEE", color: "#FF5252",
                padding: "10px 12px", borderRadius: 10,
                fontSize: 12, marginTop: 12, lineHeight: 1.5
              }}>
                {pushError}
              </div>
            )}

            {pushEnabled && (
              <button
                onClick={sendTestPush}
                style={{
                  width: "100%", padding: "10px", borderRadius: 12,
                  border: "1.5px solid #EEEEEE", background: "white",
                  color: "#4CAF50", fontWeight: 600, fontSize: 13, cursor: "pointer"
                }}
              >
                Envoyer une notification de test
              </button>
            )}
          </div>
        )}

        {/* DÉCONNEXION */}
        <button
          onClick={logout}
          style={{
            width: "100%", padding: "16px", borderRadius: 16,
            border: "1.5px solid #FF5252", background: "white",
            color: "#FF5252", fontWeight: 600, fontSize: 15, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8
          }}
        >
          <LogOut size={17} strokeWidth={1.75} />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}