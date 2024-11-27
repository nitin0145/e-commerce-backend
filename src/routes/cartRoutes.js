const express = require('express');
const Cart = require('../models/Cart'); // Cart model
const Product = require('../models/Product'); // Product model
const router = express.Router();

let io; // Declare io globally to use it in routes

// Set Socket.IO instance
function setSocketIoInstance(socketIoInstance) {
  io = socketIoInstance;
}

// Get all cart items
router.get('/', async (req, res) => {
  try {
    const cartItems = await Cart.find().populate('product');
    res.json(cartItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add item to cart
router.post('/add-cart', async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (quantity > product.stock) {
      return res.status(400).json({ error: 'Requested quantity exceeds available stock' });
    }

    let cartItem = await Cart.findOne({ product: productId });

    if (cartItem) {
      cartItem.quantity += quantity;
      if (cartItem.quantity > product.stock) {
        cartItem.quantity = product.stock;
      }
    } else {
      cartItem = new Cart({
        product: productId,
        quantity,
      });
    }

    await cartItem.save();

    // Update stock and save the product
    product.stock -= quantity;
    await product.save();

    // Emit an event to all connected clients about the stock update
    io.emit('stockUpdated', {
      productId: product._id,
      updatedStock: product.stock,
    });

    res.status(200).json({
      message: 'Product added to cart successfully',
      cartItem,
      updatedStock: product.stock,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update cart item quantity
router.patch('/:id', async (req, res) => {
  const { quantity } = req.body;

  try {
    const cartItem = await Cart.findById(req.params.id).populate('product');

    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    if (quantity > cartItem.product.stock) {
      return res.status(400).json({ error: 'Quantity exceeds stock' });
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    // Emit an event to update the stock in real-time
    io.emit('stockUpdated', {
      productId: cartItem.product._id,
      updatedStock: cartItem.product.stock,
    });

    res.status(200).json(cartItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove item from cart
router.delete('/:id', async (req, res) => {
  try {
    const cartItem = await Cart.findById(req.params.id).populate('product');

    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    await Cart.findByIdAndDelete(req.params.id);

    // Emit an event when an item is removed
    io.emit('cartUpdated', {
      message: 'Cart item removed',
      cartItem: null,
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export setSocketIoInstance so it can be used in the index.js
module.exports = { router, setSocketIoInstance };
