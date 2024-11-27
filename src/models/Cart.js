const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, min: 1 },
});

module.exports = mongoose.model("Cart", cartSchema);
