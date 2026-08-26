import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import TopBar from "../../components/TopBar";
import {
  Carrot, Droplet, ChefHat, Recycle, Trophy, Target, Sparkles,
  CheckCircle2, RotateCcw, Undo2, AlertTriangle, XCircle
} from "lucide-react";

const CHALLENGE_CONFIG = {
  "5 fruits & légumes": {
    Icon: Carrot,
    type: "counter",
    unit: "portions",
    target: 5,
    steps: [1, 2, 3],
    color: "#4CAF50",
    infoNote: null
  },
  "Hydratation": {
    Icon: Droplet,
    type: "counter",
    unit: "L",
    target: 1.5,
    steps: [0.25, 0.5, 1],
    color: "#2196F3",
    infoNote: null
  },
  "Cuisiner maison": {
    Icon: ChefHat,
    type: "auto",
    unit: "recettes",
    target: 5,
    color: "#FF9800",
    infoNote: "Ce défi se met à jour automatiquement quand vous générez des recettes dans l'onglet Recettes !"
  },
  "Zéro gaspillage": {
    Icon: Recycle,
    type: "auto",
    unit: "jours",
    target: 14,
    color: "#9C27B0",
    infoNote: "Ce défi surveille automatiquement votre frigo. Si aucun aliment n'expire, vous progressez !"
  }
};

export default function ChallengesPage() {
  const { authFetch } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [myChallenges, setMyChallenges] = useState([]);
  const [progress, setProgress] = useState({});
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("discover");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        authFetch("/challenges"),
        authFetch("/challenges/my")
      ]);
      const allData = await allRes.json();
      const myData = await myRes.json();
      setChallenges(Array.isArray(allData) ? allData : []);
      setMyChallenges(Array.isArray(myData) ? myData : []);

      const activeOnes = Array.isArray(myData) ? myData.filter(c => c.status === "active") : [];
      const progressData = {};
      for (const c of activeOnes) {
        if (c.challenge_id) {
          const res = await authFetch(`/progress/${c.challenge_id}`);
          const data = await res.json();
          progressData[c.title] = data;
        }
      }
      setProgress(progressData);

      // Charge les points depuis l'API levels
      const levelRes = await authFetch("/challenges/levels");
      const levelData = await levelRes.json();
      setTotalPoints(levelData.points || 0);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getChallengeId = (title) => {
    const found = challenges.find(c => c.title === title);
    return found?.id;
  };

  const logProgress = async (challengeTitle, value) => {
    const challengeId = getChallengeId(challengeTitle);
    if (!challengeId) return;
    try {
      await authFetch("/progress/log", {
        method: "POST",
        body: JSON.stringify({ challenge_id: challengeId, value })
      });
      const res = await authFetch(`/progress/${challengeId}`);
      const data = await res.json();
      setProgress(prev => ({ ...prev, [challengeTitle]: data }));
      setTotalPoints(data.total_points || 0);

      const config = CHALLENGE_CONFIG[challengeTitle];
      const todayValue = data.today?.value || 0;
      if (todayValue >= config.target) {
        const challenge = challenges.find(c => c.title === challengeTitle);
        if (challenge) {
          await authFetch("/progress/award", {
            method: "POST",
            body: JSON.stringify({
              challenge_id: challengeId,
              points: Math.round(challenge.points / 7)
            })
          });
          showSuccess(`Objectif du jour atteint ! +${Math.round(challenge.points / 7)} points !`);
          // Recharge les points
          const levelRes = await authFetch("/challenges/levels");
          const levelData = await levelRes.json();
          setTotalPoints(levelData.points || 0);
        }
      } else {
        showSuccess(`+${value} ${config.unit} enregistré !`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const subtractProgress = async (challengeTitle, value) => {
    const challengeId = getChallengeId(challengeTitle);
    if (!challengeId) return;
    try {
      await authFetch("/progress/subtract", {
        method: "PATCH",
        body: JSON.stringify({ challenge_id: challengeId, value })
      });
      const res = await authFetch(`/progress/${challengeId}`);
      const data = await res.json();
      setProgress(prev => ({ ...prev, [challengeTitle]: data }));
      showSuccess(`-${value} ${CHALLENGE_CONFIG[challengeTitle].unit} annulé`);
    } catch (err) {
      console.error(err);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const joinChallenge = async (id) => {
    try {
      await authFetch(`/challenges/${id}/join`, { method: "POST" });
      fetchData();
      showSuccess("Défi rejoint !");
      setActiveTab("active");
    } catch (err) {
      console.error(err);
    }
  };

  const completeChallenge = async (challenge) => {
    const config = CHALLENGE_CONFIG[challenge.title];
    if (config?.type === "counter") {
      const todayValue = progress[challenge.title]?.today?.value || 0;
      if (todayValue < config.target) {
        showSuccess(`Objectif non atteint ! (${todayValue}/${config.target} ${config.unit} aujourd'hui)`);
        return;
      }
    }
    try {
      await authFetch(`/challenges/${challenge.id}/complete`, { method: "PATCH" });
      await authFetch("/progress/award", {
        method: "POST",
        body: JSON.stringify({ challenge_id: challenge.challenge_id, points: challenge.points })
      });
      fetchData();
      showSuccess(`Défi terminé ! +${challenge.points} points !`);
    } catch (err) {
      console.error(err);
    }
  };

  const restartChallenge = async (id) => {
    try {
      await authFetch(`/challenges/${id}/restart`, { method: "POST" });
      fetchData();
      showSuccess("Défi recommencé !");
      setActiveTab("active");
    } catch (err) {
      console.error(err);
    }
  };

  const leaveChallenge = async (id) => {
    try {
      await authFetch(`/challenges/${id}/leave`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const activeChallenges = myChallenges.filter(c => c.status === "active");
  const completedChallenges = myChallenges.filter(c => c.status === "completed");
  const failedChallenges = myChallenges.filter(c => c.status === "failed");

  const renderProgressTracker = (challenge) => {
    const config = CHALLENGE_CONFIG[challenge.title];
    if (!config || config.type === "auto") {
      return config?.infoNote ? (
        <div style={{
          background: "#F3E5F5", borderRadius: 12,
          padding: "12px 14px", marginBottom: 16,
          borderLeft: "4px solid #9C27B0"
        }}>
          <p style={{ fontSize: 13, color: "#6A1B9A", lineHeight: 1.5 }}>
            {config.infoNote}
          </p>
        </div>
      ) : null;
    }

    const todayValue = progress[challenge.title]?.today?.value || 0;
    const percentage = Math.min((todayValue / config.target) * 100, 100);
    const goalReached = todayValue >= config.target;

    return (
      <div style={{ background: "#F9F9F9", borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ fontWeight: 600, fontSize: 14 }}>Aujourd'hui</p>
          <p style={{ fontWeight: 700, fontSize: 16, color: goalReached ? "#4CAF50" : config.color }}>
            {todayValue}/{config.target} {config.unit}
          </p>
        </div>

        <div style={{ background: "#EEEEEE", borderRadius: 8, height: 12, overflow: "hidden", marginBottom: 16 }}>
          <div style={{
            background: goalReached ? "#4CAF50" : config.color,
            height: "100%", width: `${percentage}%`,
            borderRadius: 8, transition: "width 0.3s"
          }} />
        </div>

        {goalReached ? (
          <div style={{
            background: "#E8F5E9", color: "#4CAF50",
            padding: "10px", borderRadius: 12,
            textAlign: "center", fontWeight: 600, fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8
          }}>
            <Target size={16} strokeWidth={2} />
            Objectif du jour atteint !
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 12, color: "#757575", marginBottom: 8 }}>Ajouter :</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              {config.steps.map(step => (
                <button
                  key={step}
                  onClick={() => logProgress(challenge.title, step)}
                  style={{
                    flex: 1, padding: "10px 8px", borderRadius: 12,
                    border: `2px solid ${config.color}`, background: "white",
                    color: config.color, fontWeight: 700, fontSize: 13, cursor: "pointer"
                  }}
                >
                  +{step} {config.unit}
                </button>
              ))}
            </div>
            {todayValue > 0 && (
              <button
                onClick={() => subtractProgress(challenge.title, config.steps[0])}
                style={{
                  width: "100%", padding: "8px", borderRadius: 12,
                  border: "1.5px solid #EEEEEE", background: "white",
                  color: "#757575", fontWeight: 600, fontSize: 12, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                }}
              >
                <Undo2 size={13} strokeWidth={2} />
                Annuler dernière saisie (-{config.steps[0]} {config.unit})
              </button>
            )}
          </div>
        )}

        {progress[challenge.title]?.history?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 12, color: "#757575", marginBottom: 8 }}>7 derniers jours</p>
            <div style={{ display: "flex", gap: 6 }}>
              {Array.from({ length: 7 }, (_, i) => {
                const dayProgress = progress[challenge.title]?.history?.find(h => {
                  const date = new Date(h.logged_at);
                  const today = new Date();
                  const diff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
                  return diff === i;
                });
                const reached = dayProgress && dayProgress.value >= config.target;
                return (
                  <div key={i} style={{
                    flex: 1, height: 32, borderRadius: 8,
                    background: reached ? config.color : "#EEEEEE",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: reached ? "white" : "#757575", fontWeight: 600
                  }}>
                    {i === 0 ? "Auj" : `J-${i}`}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const ChallengeCard = ({ challenge, isJoined }) => {
    const config = CHALLENGE_CONFIG[challenge.title];
    return (
      <div style={{
        background: "white", borderRadius: 20,
        padding: "20px", marginBottom: 12,
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16,
              background: "#E8F5E9", display: "flex",
              alignItems: "center", justifyContent: "center"
            }}>
              {(() => { const Icon = config?.Icon || Trophy; return <Icon size={22} strokeWidth={1.75} color="#4CAF50" />; })()}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15 }}>{challenge.title}</p>
              <p style={{ fontSize: 12, color: "#757575", marginTop: 2 }}>
                {challenge.duration_days} jours
                {config?.type === "counter" && ` • Objectif : ${config.target} ${config.unit}/jour`}
              </p>
            </div>
          </div>
          <div style={{
            background: "#E8F5E9", color: "#4CAF50",
            padding: "4px 10px", borderRadius: 20,
            fontSize: 12, fontWeight: 700
          }}>
            +{challenge.points} pts
          </div>
        </div>

        <p style={{ fontSize: 13, color: "#757575", lineHeight: 1.5, marginBottom: 12 }}>
          {challenge.description}
        </p>

        {config?.infoNote && (
          <div style={{
            background: "#F3E5F5", borderRadius: 12,
            padding: "10px 14px", marginBottom: 12,
            borderLeft: "4px solid #9C27B0"
          }}>
            <p style={{ fontSize: 12, color: "#6A1B9A", lineHeight: 1.5 }}>{config.infoNote}</p>
          </div>
        )}

        {isJoined ? (
          <div style={{
            background: "#E8F5E9", color: "#4CAF50",
            padding: "10px", borderRadius: 12,
            textAlign: "center", fontSize: 13, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6
          }}>
            <CheckCircle2 size={15} strokeWidth={2} />
            Déjà rejoint
          </div>
        ) : (
          <button
            onClick={() => joinChallenge(challenge.id)}
            style={{
              width: "100%", padding: "12px", borderRadius: 12,
              border: "none", background: "#4CAF50", color: "white",
              fontWeight: 600, fontSize: 14, cursor: "pointer"
            }}
          >
            Rejoindre ce défi
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#F9F9F9", paddingBottom: "calc(100px + env(safe-area-inset-bottom))" }}>
      <TopBar title="Défis" />

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

      <div style={{ padding: "20px 20px 100px" }}>

        {/* STATS */}
        <div style={{
          background: "linear-gradient(135deg, #4CAF50, #81C784)",
          borderRadius: 20, padding: "20px", marginBottom: 24,
          color: "white", display: "flex", justifyContent: "space-around"
        }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 28, fontWeight: 700 }}>{activeChallenges.length}</p>
            <p style={{ fontSize: 12, opacity: 0.9 }}>En cours</p>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.3)" }} />
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 28, fontWeight: 700 }}>{completedChallenges.length}</p>
            <p style={{ fontSize: 12, opacity: 0.9 }}>Terminés</p>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.3)" }} />
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 28, fontWeight: 700 }}>{totalPoints}</p>
            <p style={{ fontSize: 12, opacity: 0.9 }}>Points</p>
          </div>
        </div>

        {/* ONGLETS */}
        <div style={{
          display: "flex", background: "white",
          borderRadius: 16, padding: 4, marginBottom: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          overflowX: "auto"
        }}>
          {[
            { key: "discover", label: "Découvrir" },
            { key: "active", label: `En cours (${activeChallenges.length})` },
            { key: "done", label: `Terminés (${completedChallenges.length})` },
            { key: "failed", label: `Echoués (${failedChallenges.length})` }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: "10px 8px", borderRadius: 12,
                border: "none", whiteSpace: "nowrap",
                background: activeTab === tab.key
                  ? (tab.key === "failed" ? "#FF5252" : "#4CAF50")
                  : "transparent",
                color: activeTab === tab.key ? "white" : "#757575",
                fontWeight: activeTab === tab.key ? 700 : 400,
                fontSize: 11, cursor: "pointer"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#757575" }}>
            Chargement...
          </div>
        ) : (
          <>
            {/* DÉCOUVRIR */}
            {activeTab === "discover" && (
              <div>
                {challenges.map(challenge => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    isJoined={myChallenges.some(mc => mc.title === challenge.title)}
                  />
                ))}
              </div>
            )}

            {/* EN COURS */}
            {activeTab === "active" && (
              <div>
                {activeChallenges.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 60, color: "#757575" }}>
                    <Trophy size={48} strokeWidth={1.25} color="#BDBDBD" style={{ marginBottom: 16 }} />
                    <p style={{ fontWeight: 600 }}>Aucun défi en cours</p>
                    <p style={{ fontSize: 14, marginTop: 8 }}>Rejoignez un défi dans "Découvrir"</p>
                  </div>
                ) : (
                  activeChallenges.map(challenge => {
                    const config = CHALLENGE_CONFIG[challenge.title];
                    const todayValue = progress[challenge.title]?.today?.value || 0;
                    const canComplete = config?.type === "auto" || todayValue >= (config?.target || 0);
                    return (
                      <div key={challenge.id} style={{
                        background: "white", borderRadius: 20,
                        padding: "20px", marginBottom: 12,
                        boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
                      }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
                          <div style={{
                            width: 48, height: 48, borderRadius: 16,
                            background: "#E8F5E9", display: "flex",
                            alignItems: "center", justifyContent: "center"
                          }}>
                            {(() => { const Icon = config?.Icon || Trophy; return <Icon size={22} strokeWidth={1.75} color="#4CAF50" />; })()}
                          </div>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: 15 }}>{challenge.title}</p>
                            <p style={{ fontSize: 12, color: "#757575", marginTop: 2 }}>
                              Commencé le {new Date(challenge.started_at).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                        </div>

                        {renderProgressTracker(challenge)}

                        {!canComplete && (
                          <div style={{
                            background: "#FFF3E0", color: "#FF9800",
                            padding: "10px 14px", borderRadius: 12,
                            fontSize: 13, marginBottom: 12,
                            display: "flex", alignItems: "center", gap: 8
                          }}>
                            <AlertTriangle size={16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                            Atteignez l'objectif du jour avant de terminer ({todayValue}/{config?.target} {config?.unit})
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => completeChallenge(challenge)}
                            disabled={!canComplete}
                            style={{
                              flex: 1, padding: "12px", borderRadius: 12,
                              border: "none",
                              background: canComplete ? "#4CAF50" : "#EEEEEE",
                              color: canComplete ? "white" : "#757575",
                              fontWeight: 600, fontSize: 13,
                              cursor: canComplete ? "pointer" : "not-allowed",
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                            }}
                          >
                            <CheckCircle2 size={15} strokeWidth={2} />
                            Terminer le défi
                          </button>
                          <button
                            onClick={() => leaveChallenge(challenge.id)}
                            style={{
                              padding: "12px 16px", borderRadius: 12,
                              border: "1.5px solid #EEEEEE", background: "white",
                              color: "#757575", fontWeight: 600, fontSize: 13, cursor: "pointer"
                            }}
                          >
                            Quitter
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TERMINÉS */}
            {activeTab === "done" && (
              <div>
                {completedChallenges.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 60, color: "#757575" }}>
                    <Target size={48} strokeWidth={1.25} color="#BDBDBD" style={{ marginBottom: 16 }} />
                    <p style={{ fontWeight: 600 }}>Aucun défi terminé</p>
                  </div>
                ) : (
                  completedChallenges.map(challenge => {
                    const config = CHALLENGE_CONFIG[challenge.title];
                    return (
                      <div key={challenge.id} style={{
                        background: "white", borderRadius: 20,
                        padding: "20px", marginBottom: 12,
                        boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <div style={{
                              width: 48, height: 48, borderRadius: 16,
                              background: "#E8F5E9", display: "flex",
                              alignItems: "center", justifyContent: "center"
                            }}>
                              {(() => { const Icon = config?.Icon || Trophy; return <Icon size={22} strokeWidth={1.75} color="#4CAF50" />; })()}
                            </div>
                            <div>
                              <p style={{ fontWeight: 700, fontSize: 15 }}>{challenge.title}</p>
                              <p style={{ fontSize: 12, color: "#4CAF50", marginTop: 2 }}>
                                Terminé le {new Date(challenge.completed_at).toLocaleDateString("fr-FR")}
                              </p>
                            </div>
                          </div>
                          <div style={{
                            background: "#E8F5E9", color: "#4CAF50",
                            padding: "4px 10px", borderRadius: 20,
                            fontSize: 12, fontWeight: 700
                          }}>
                            +{challenge.points} pts
                          </div>
                        </div>
                        <button
                          onClick={() => restartChallenge(challenge.id)}
                          style={{
                            width: "100%", padding: "12px", borderRadius: 12,
                            border: "1.5px solid #4CAF50", background: "white",
                            color: "#4CAF50", fontWeight: 600, fontSize: 13, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                          }}
                        >
                          <RotateCcw size={14} strokeWidth={2} />
                          Recommencer ce défi
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ÉCHOUÉS */}
            {activeTab === "failed" && (
              <div>
                {failedChallenges.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 60, color: "#757575" }}>
                    <Sparkles size={48} strokeWidth={1.25} color="#BDBDBD" style={{ marginBottom: 16 }} />
                    <p style={{ fontWeight: 600 }}>Aucun défi échoué</p>
                    <p style={{ fontSize: 14, marginTop: 8 }}>Continuez comme ça !</p>
                  </div>
                ) : (
                  failedChallenges.map(challenge => {
                    const config = CHALLENGE_CONFIG[challenge.title];
                    return (
                      <div key={challenge.id} style={{
                        background: "white", borderRadius: 20,
                        padding: "20px", marginBottom: 12,
                        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                        borderLeft: "4px solid #FF5252"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <div style={{
                              width: 48, height: 48, borderRadius: 16,
                              background: "#FFEBEE", display: "flex",
                              alignItems: "center", justifyContent: "center"
                            }}>
                              {(() => { const Icon = config?.Icon || Trophy; return <Icon size={22} strokeWidth={1.75} color="#FF5252" />; })()}
                            </div>
                            <div>
                              <p style={{ fontWeight: 700, fontSize: 15 }}>{challenge.title}</p>
                              <p style={{ fontSize: 12, color: "#FF5252", marginTop: 2 }}>
                                Objectif non atteint
                              </p>
                            </div>
                          </div>
                        </div>

                        <div style={{
                          background: "#FFEBEE", borderRadius: 12,
                          padding: "12px 14px", marginBottom: 16
                        }}>
                          <p style={{ fontSize: 13, color: "#FF5252", fontWeight: 600 }}>
                            Vous n'avez pas pu terminer ce défi à temps
                          </p>
                          <p style={{ fontSize: 12, color: "#757575", marginTop: 4 }}>
                            Pas de panique, recommencez et vous y arriverez !
                          </p>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => restartChallenge(challenge.id)}
                            style={{
                              flex: 1, padding: "12px", borderRadius: 12,
                              border: "none", background: "#4CAF50",
                              color: "white", fontWeight: 600,
                              fontSize: 13, cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                            }}
                          >
                            <RotateCcw size={14} strokeWidth={2} />
                            Recommencer
                          </button>
                          <button
                            onClick={() => leaveChallenge(challenge.id)}
                            style={{
                              padding: "12px 16px", borderRadius: 12,
                              border: "1.5px solid #EEEEEE", background: "white",
                              color: "#757575", fontWeight: 600,
                              fontSize: 13, cursor: "pointer"
                            }}
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}