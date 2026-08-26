const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { addFood, getFoods, deleteFood, updateFood, identifyFoodImage, decodeBarcodeImage } = require("../controllers/foodController");

router.post("/", auth, addFood);
router.get("/", auth, getFoods);
router.delete("/:id", auth, deleteFood);
router.patch("/:id", auth, updateFood);
router.post("/identify-image", auth, identifyFoodImage);
router.post("/decode-barcode", auth, decodeBarcodeImage);

module.exports = router;
