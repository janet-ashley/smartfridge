import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import TopBar from "../../components/TopBar";
import { RefreshCw, Clock, Globe2, ChevronLeft } from "lucide-react";

export default function RecipesPage() {
  const { authFetch } = useAuth();
  const [recipe, setRecipe] = useState(null);
  const [recipeId, setRecipeId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [cookingMode, setCookingMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingDone, setRatingDone] = useState(false);

  const [forYou, setForYou] = useState([]);
  const [forYouLoading, setForYouLoading] = useState(true);
  const [selectedForYou, setSelectedForYou] = useState(null);
  const [translations, setTranslations] = useState({});
  const [translatingIds, setTranslatingIds] = useState({});

  const translateMeal = async (meal) => {
    setTranslatingIds(prev => ({ ...prev, [meal.idMeal]: true }));
    try {
      const res = await authFetch("/recipes/translate-meal", {
        method: "POST",
        body: JSON.stringify({
          idMeal: meal.idMeal,
          title: meal.strMeal,
          ingredients: parseMealIngredients(meal),
          instructions: parseMealSteps(meal)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTranslations(prev => ({ ...prev, [meal.idMeal]: data }));
      }
    } catch (err) {
      console.error("Erreur traduction", err);
    } finally {
      setTranslatingIds(prev => ({ ...prev, [meal.idMeal]: false }));
    }
  };

  const fetchForYou = async () => {
    setForYouLoading(true);
    try {
      const results = await Promise.all(
        Array.from({ length: 6 }).map(() =>
          fetch("https://www.themealdb.com/api/json/v1/1/random.php").then(r => r.json())
        )
      );
      const meals = results.map(r => r.meals?.[0]).filter(Boolean);
      // evite les doublons si l'API renvoie deux fois le meme plat
      const unique = Array.from(new Map(meals.map(m => [m.idMeal, m])).values());
      setForYou(unique);
      unique.forEach(meal => translateMeal(meal));
    } catch (err) {
      console.error("Erreur chargement recettes pour toi", err);
    } finally {
      setForYouLoading(false);
    }
  };

  useEffect(() => {
    fetchForYou();
  }, []);

  const parseMealIngredients = (meal) => {
    const list = [];
    for (let i = 1; i <= 20; i++) {
      const ing = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (ing && ing.trim()) {
        list.push(`${measure && measure.trim() ? measure.trim() + " " : ""}${ing.trim()}`);
      }
    }
    return list;
  };

  const parseMealSteps = (meal) => {
    return (meal.strInstructions || "")
      .split(/\r?\n+/)
      .map(s => s.trim())
      .filter(Boolean);
  };

  const [notEnoughIngredients, setNotEnoughIngredients] = useState(false);
  const [checkedToBuy, setCheckedToBuy] = useState({});

  const generateRecipe = async () => {
    setLoading(true);
    setError("");
    setRecipe(null);
    setRecipeId(null);
    setCookingMode(false);
    setCurrentStep(0);
    setFinished(false);
    setRatingDone(false);
    setRating(0);
    setShowHistory(false);
    setNotEnoughIngredients(false);
    setCheckedToBuy({});
    try {
      const res = await authFetch("/recipes");
      const data = await res.json();
      if (data.not_enough_ingredients) {
        setNotEnoughIngredients(true);
      } else if (data.recipe) {
        setRecipe(data.recipe);
        setRecipeId(data.id);
      } else {
        setError(data.message || "Erreur lors de la génération");
      }
    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await authFetch("/recipes/history");
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
      setShowHistory(true);
      setRecipe(null);
    } catch (err) {
      console.error(err);
    }
  };

  const saveRating = async (stars) => {
    if (!recipeId) return;
    try {
      await authFetch(`/recipes/${recipeId}/rate`, {
        method: "PATCH",
        body: JSON.stringify({ rating: stars })
      });
    } catch (err) {
      console.error(err);
    }
  };

  // DÉTAIL D'UNE RECETTE "POUR TOI"
  if (selectedForYou) {
    const meal = selectedForYou;
    const translation = translations[meal.idMeal];
    const isTranslating = translatingIds[meal.idMeal];
    const title = translation?.title || meal.strMeal;
    const ingredients = translation?.ingredients || parseMealIngredients(meal);
    const steps = translation?.instructions || parseMealSteps(meal);
    return (
      <div style={{ minHeight: "100dvh", background: "white", paddingBottom: "calc(100px + env(safe-area-inset-bottom))" }}>
        <TopBar title={title} showBack onBack={() => setSelectedForYou(null)} />
        <img
          src={meal.strMealThumb}
          alt={title}
          style={{ width: "100%", height: 220, objectFit: "cover" }}
        />
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            {meal.strCategory && (
              <div style={{
                background: "#E8F5E9", color: "#4CAF50",
                padding: "6px 14px", borderRadius: 20,
                fontSize: 12, fontWeight: 600
              }}>
                {meal.strCategory}
              </div>
            )}
            {meal.strArea && (
              <div style={{
                background: "#E3F2FD", color: "#1565C0",
                padding: "6px 14px", borderRadius: 20,
                fontSize: 12, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 5
              }}>
                <Globe2 size={13} strokeWidth={2} />
                Cuisine {meal.strArea}
              </div>
            )}
          </div>

          {isTranslating && !translation && (
            <div style={{
              background: "#F0F7FF", color: "#1565C0",
              padding: "10px 14px", borderRadius: 12,
              fontSize: 13, marginBottom: 16
            }}>
              Traduction en cours...
            </div>
          )}

          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            Ingrédients
          </h3>
          <div style={{
            background: "#F9F9F9", borderRadius: 12,
            padding: "12px 16px", marginBottom: 20
          }}>
            {ingredients.map((ing, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 0",
                borderBottom: i < ingredients.length - 1 ? "1px solid #EEEEEE" : "none"
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: 3,
                  background: "#4CAF50", flexShrink: 0
                }} />
                <span style={{ fontSize: 14 }}>{ing}</span>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            Préparation
          </h3>
          <div style={{ marginBottom: 8 }}>
            {steps.map((step, i) => (
              <div key={i} style={{
                display: "flex", gap: 12,
                marginBottom: 12, alignItems: "flex-start"
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 14,
                  background: "#E8F5E9", color: "#4CAF50",
                  fontWeight: 700, fontSize: 13,
                  display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0
                }}>
                  {i + 1}
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, paddingTop: 4 }}>
                  {step}
                </p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: "#BDBDBD", textAlign: "center", marginTop: 12 }}>
            Source TheMealDB, traduit automatiquement
          </p>
        </div>
      </div>
    );
  }

  // MODE CUISINE
  if (cookingMode && recipe) {
    const steps = recipe.steps || [];
    const isLast = currentStep === steps.length - 1;

    if (finished) {
      return (
        <div style={{ minHeight: "100dvh", background: "white", paddingBottom: "calc(100px + env(safe-area-inset-bottom))" }}>
          <TopBar
            title="Recette terminée !"
            showBack
            onBack={() => { setFinished(false); setCookingMode(false); }}
          />
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 80, marginBottom: 20 }}>🎉</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
              Bon appétit !
            </h2>
            <p style={{ color: "#757575", marginBottom: 32 }}>
              {recipe.title}
            </p>

            {!ratingDone ? (
              <div>
                <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>
                  Notez cette recette
                </p>
                <div style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  marginBottom: 24
                }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      onClick={() => setRating(star)}
                      style={{
                        fontSize: 40,
                        cursor: "pointer",
                        opacity: star <= rating ? 1 : 0.3,
                        transition: "opacity 0.2s"
                      }}
                    >
                      ⭐
                    </span>
                  ))}
                </div>
                {rating > 0 && (
                  <button
                    className="btn-primary"
                    onClick={async () => {
                      await saveRating(rating);
                      setRatingDone(true);
                    }}
                  >
                    Valider ma note
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div style={{
                  background: "#E8F5E9",
                  borderRadius: 16,
                  padding: "16px",
                  marginBottom: 24
                }}>
                  <p style={{ color: "#4CAF50", fontWeight: 600 }}>
                    {"⭐".repeat(rating)} Merci pour votre note !
                  </p>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setCookingMode(false);
                    setFinished(false);
                  }}
                >
                  Retour aux recettes
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: "100dvh", background: "white", paddingBottom: "calc(100px + env(safe-area-inset-bottom))" }}>
        <TopBar
          title={`Etape ${currentStep + 1}/${steps.length}`}
          showBack
          onBack={() => setCookingMode(false)}
        />
        <div style={{ padding: "24px 20px" }}>
          <div style={{
            background: "#EEEEEE",
            borderRadius: 4,
            height: 6,
            marginBottom: 24,
            overflow: "hidden"
          }}>
            <div style={{
              background: "#4CAF50",
              height: "100%",
              width: `${((currentStep + 1) / steps.length) * 100}%`,
              borderRadius: 4,
              transition: "width 0.3s"
            }} />
          </div>

          <div style={{
            background: "#F9F9F9",
            borderRadius: 20,
            padding: 24,
            marginBottom: 24,
            minHeight: 200,
            display: "flex",
            alignItems: "center"
          }}>
            <div>
              <div style={{
                width: 48, height: 48,
                borderRadius: 24,
                background: "#E8F5E9",
                color: "#4CAF50",
                fontWeight: 700,
                fontSize: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16
              }}>
                {currentStep + 1}
              </div>
              <p style={{ fontSize: 18, lineHeight: 1.7, color: "#1A1A1A", fontWeight: 500 }}>
                {steps[currentStep]}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {currentStep > 0 && (
              <button
                className="btn-outline"
                onClick={() => setCurrentStep(s => s - 1)}
                style={{ flex: 1 }}
              >
                Precedent
              </button>
            )}
            <button
              className="btn-primary"
              onClick={() => {
                if (isLast) setFinished(true);
                else setCurrentStep(s => s + 1);
              }}
              style={{ flex: 1 }}
            >
              {isLast ? "Terminer" : "Suivant"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F9F9F9" }}>
      <TopBar title="Recettes" />
      <div style={{ padding: "20px 20px 100px" }}>

        {/* POUR TOI */}
        <div id="for-you-section" style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Pour toi</h3>
            <button
              onClick={fetchForYou}
              disabled={forYouLoading}
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                color: "#4CAF50", fontSize: 12, fontWeight: 600
              }}
            >
              <RefreshCw size={14} strokeWidth={2} style={{
                animation: forYouLoading ? "spin 1s linear infinite" : "none"
              }} />
              Actualiser
            </button>
          </div>

          {forYouLoading ? (
            <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  minWidth: 160, height: 160, borderRadius: 18,
                  background: "#F0F0F0", flexShrink: 0
                }} />
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 12, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4 }}>
              {forYou.map(meal => (
                <button
                  key={meal.idMeal}
                  onClick={() => setSelectedForYou(meal)}
                  style={{
                    minWidth: 160, maxWidth: 160, flexShrink: 0,
                    border: "none", background: "white", borderRadius: 18,
                    overflow: "hidden", cursor: "pointer", textAlign: "left",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.06)", padding: 0
                  }}
                >
                  <img
                    src={meal.strMealThumb}
                    alt={translations[meal.idMeal]?.title || meal.strMeal}
                    style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }}
                  />
                  <div style={{ padding: "10px 12px" }}>
                    <p style={{
                      fontSize: 13, fontWeight: 600, lineHeight: 1.3,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}>
                      {translations[meal.idMeal]?.title || meal.strMeal}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <button
            onClick={generateRecipe}
            disabled={loading}
            style={{
              flex: 1, padding: "16px", borderRadius: 16,
              border: "none", background: "#4CAF50", color: "white",
              fontWeight: 700, fontSize: 15, cursor: "pointer",
              opacity: loading ? 0.7 : 1,
              boxShadow: "0 4px 15px rgba(76,175,80,0.3)"
            }}
          >
            {loading ? "Generation..." : recipe ? "Regenerer" : "Generer une recette"}
          </button>
          <button
            onClick={fetchHistory}
            style={{
              padding: "16px", borderRadius: 16,
              border: "1.5px solid #EEEEEE", background: "white",
              color: "#757575", fontWeight: 600, fontSize: 13, cursor: "pointer"
            }}
          >
            Historique
          </button>
        </div>

        {error && (
          <div style={{
            background: "#FFEBEE", color: "#FF5252",
            padding: "14px 16px", borderRadius: 12,
            fontSize: 14, marginBottom: 16
          }}>
            {error}
          </div>
        )}

        {notEnoughIngredients && !loading && (
          <div style={{
            textAlign: "center", padding: "32px 24px",
            background: "white", borderRadius: 20,
            boxShadow: "0 4px 10px rgba(0,0,0,0.05)", marginBottom: 16
          }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🍽️</p>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              Pas assez d'ingrédients pour une vraie recette
            </p>
            <p style={{ fontSize: 13, color: "#757575", marginBottom: 20, lineHeight: 1.5 }}>
              Ton frigo ne contient pas assez d'aliments cohérents pour cuisiner un plat complet en ce moment. Ajoute des ingrédients, ou jette un œil aux idées "Pour toi" en attendant.
            </p>
            <button
              onClick={() => document.getElementById("for-you-section")?.scrollIntoView({ behavior: "smooth" })}
              style={{
                background: "#4CAF50", color: "white", border: "none",
                borderRadius: 14, padding: "12px 20px",
                fontWeight: 600, fontSize: 14, cursor: "pointer"
              }}
            >
              Voir les recettes "Pour toi"
            </button>
          </div>
        )}

        {loading && (
          <div style={{
            textAlign: "center", padding: 40,
            background: "white", borderRadius: 20,
            boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
            <p style={{ fontWeight: 600 }}>L IA genere votre recette...</p>
          </div>
        )}

        {recipe && !loading && (
          <div style={{
            background: "white", borderRadius: 24,
            overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
          }}>
            <div style={{
              background: "linear-gradient(135deg, #4CAF50, #81C784)",
              padding: "24px 20px", color: "white"
            }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
                {recipe.title}
              </h2>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{
                  background: "rgba(255,255,255,0.2)",
                  padding: "6px 14px", borderRadius: 20,
                  fontSize: 13, fontWeight: 600
                }}>
                  {recipe.duration}
                </div>
                <div style={{
                  background: "rgba(255,255,255,0.2)",
                  padding: "6px 14px", borderRadius: 20,
                  fontSize: 13, fontWeight: 600
                }}>
                  {recipe.difficulty}
                </div>
              </div>
            </div>

            <div style={{ padding: "20px" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                Ingredients
              </h3>
              <div style={{
                background: "#F9F9F9", borderRadius: 12,
                padding: "12px 16px", marginBottom: 20
              }}>
                {recipe.ingredients?.map((ing, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 0",
                    borderBottom: i < recipe.ingredients.length - 1 ? "1px solid #EEEEEE" : "none"
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: 3,
                      background: "#4CAF50", flexShrink: 0
                    }} />
                    <span style={{ fontSize: 14 }}>{ing}</span>
                  </div>
                ))}
              </div>

              {recipe.to_buy?.length > 0 && (
                <>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    🛒 À acheter
                  </h3>
                  <div style={{
                    background: "#FFF8E1", borderRadius: 12,
                    padding: "12px 16px", marginBottom: 20
                  }}>
                    {recipe.to_buy.map((item, i) => (
                      <label key={i} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 0",
                        borderBottom: i < recipe.to_buy.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
                        cursor: "pointer"
                      }}>
                        <input
                          type="checkbox"
                          checked={!!checkedToBuy[i]}
                          onChange={() => setCheckedToBuy(prev => ({ ...prev, [i]: !prev[i] }))}
                          style={{ width: 18, height: 18, accentColor: "#4CAF50", flexShrink: 0 }}
                        />
                        <span style={{
                          fontSize: 14,
                          textDecoration: checkedToBuy[i] ? "line-through" : "none",
                          color: checkedToBuy[i] ? "#9E9E9E" : "#1A1A1A"
                        }}>
                          {item}
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}

              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                Preparation
              </h3>
              <div style={{ marginBottom: 20 }}>
                {recipe.steps?.map((step, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 12,
                    marginBottom: 12, alignItems: "flex-start"
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 14,
                      background: "#E8F5E9", color: "#4CAF50",
                      fontWeight: 700, fontSize: 13,
                      display: "flex", alignItems: "center",
                      justifyContent: "center", flexShrink: 0
                    }}>
                      {i + 1}
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, paddingTop: 4 }}>
                      {step}
                    </p>
                  </div>
                ))}
              </div>

              {recipe.tip && (
                <div style={{
                  background: "#FFF8E1", borderRadius: 12,
                  padding: "14px 16px", borderLeft: "4px solid #FF9800",
                  marginBottom: 20
                }}>
                  <p style={{ fontSize: 13, color: "#E65100", fontWeight: 600, marginBottom: 4 }}>
                    Conseil du chef
                  </p>
                  <p style={{ fontSize: 14, margin: 0 }}>{recipe.tip}</p>
                </div>
              )}

              <button
                className="btn-primary"
                onClick={() => { setCookingMode(true); setCurrentStep(0); }}
              >
                Commencer la recette
              </button>
            </div>
          </div>
        )}

        {/* HISTORIQUE */}
        {showHistory && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
              Historique des recettes
            </h3>
            {history.length === 0 ? (
              <div style={{
                textAlign: "center", padding: 40,
                background: "white", borderRadius: 20, color: "#757575"
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <p>Aucune recette generee</p>
              </div>
            ) : (
              history.map((item, i) => (
                <div key={i} style={{
                  background: "white", borderRadius: 16,
                  padding: "16px", marginBottom: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)", cursor: "pointer"
                }}
                onClick={() => {
                  setRecipe(item.recipe);
                  setRecipeId(item.id);
                  setShowHistory(false);
                  window.scrollTo(0, 0);
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                      {item.title}
                    </p>
                    {item.rating && (
                      <span style={{ fontSize: 14, color: "#FF9800" }}>
                        {"⭐".repeat(item.rating)}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "#757575" }}>
                    {new Date(item.generated_at).toLocaleDateString("fr-FR")}
                  </p>
                  {item.rating && (
                    <p style={{ fontSize: 12, color: "#4CAF50", marginTop: 4 }}>
                      Note : {item.rating}/5
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {!recipe && !loading && !error && !showHistory && (
          <div style={{ textAlign: "center", padding: 60, color: "#757575" }}>
            <div style={{ fontSize: 80, marginBottom: 16 }}>🍽️</div>
            <p style={{ fontWeight: 600, fontSize: 18, color: "#1A1A1A" }}>
              Qu est-ce qu on mange ?
            </p>
            <p style={{ fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
              L IA analyse vos ingredients et genere une recette personnalisee
            </p>
          </div>
        )}
      </div>
    </div>
  );
}