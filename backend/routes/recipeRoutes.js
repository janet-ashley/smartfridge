const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { getRecipes, getRecipesHistory, rateRecipe, translateMealRecipe } = require("../controllers/recipeController");

router.get("/", auth, getRecipes);
router.get("/history", auth, getRecipesHistory);
router.patch("/:id/rate", auth, rateRecipe);
router.post("/translate-meal", auth, translateMealRecipe);

module.exports = router;
