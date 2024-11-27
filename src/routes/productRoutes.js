const express = require('express');
const Product = require('../models/Product');
const router = express.Router();

// GET: Fetch all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST: Checkout and update stock
router.post('/checkout', async (req, res) => {
  const { items } = req.body;

  try {
    for (let item of items) {
      const product = await Product.findById(item.productId);
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }
      product.stock -= item.quantity;
      await product.save();
      // Emit event to update stock in real-time
      io.emit('stockUpdated', { productId: item.productId, newStock: product.stock });
    }

    res.json({ success: true, message: 'Purchase successful' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
