const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/init');
const { authenticateToken, authorizeScopes, authorizeResourceOwner } = require('../middleware/auth');

const router = express.Router();

// Get user's shopping cart
router.get('/cart', authenticateToken, (req, res) => {
  const userId = req.user.user_id;

  const db = getDatabase();
  
  db.all(
    `SELECT ci.*, p.name, p.description, p.price, p.image_url,
            (ci.quantity * p.price) as total_price
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     WHERE ci.user_id = ?`,
    [userId],
    (err, cartItems) => {
      db.close();
      
      if (err) {
        return res.status(500).json({
          error: 'database_error',
          message: 'Failed to fetch cart items'
        });
      }

      const totalAmount = cartItems.reduce((sum, item) => sum + item.total_price, 0);

      res.json({
        cart_items: cartItems,
        total_amount: totalAmount,
        item_count: cartItems.length
      });
    }
  );
});

// Add item to cart
router.post('/cart/add', authenticateToken, authorizeScopes(['purchase']), (req, res) => {
  const userId = req.user.user_id;
  const { product_id, quantity = 1 } = req.body;

  if (!product_id) {
    return res.status(400).json({
      error: 'invalid_request',
      message: 'Product ID is required'
    });
  }

  const db = getDatabase();
  
  // Check if product exists and has sufficient stock
  db.get('SELECT * FROM products WHERE id = ?', [product_id], (err, product) => {
    if (err || !product) {
      db.close();
      return res.status(404).json({
        error: 'product_not_found',
        message: 'Product not found'
      });
    }

    if (product.stock_quantity < quantity) {
      db.close();
      return res.status(400).json({
        error: 'insufficient_stock',
        message: 'Not enough stock available'
      });
    }

    // Check if item already in cart
    db.get(
      'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?',
      [userId, product_id],
      (err, existingItem) => {
        if (existingItem) {
          // Update quantity
          db.run(
            'UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
            [quantity, userId, product_id],
            function(err) {
              db.close();
              
              if (err) {
                return res.status(500).json({
                  error: 'database_error',
                  message: 'Failed to update cart'
                });
              }

              res.json({
                message: 'Cart updated successfully'
              });
            }
          );
        } else {
          // Add new item
          db.run(
            'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
            [userId, product_id, quantity],
            function(err) {
              db.close();
              
              if (err) {
                return res.status(500).json({
                  error: 'database_error',
                  message: 'Failed to add item to cart'
                });
              }

              res.status(201).json({
                message: 'Item added to cart successfully'
              });
            }
          );
        }
      }
    );
  });
});

// Remove item from cart
router.delete('/cart/:product_id', authenticateToken, (req, res) => {
  const userId = req.user.user_id;
  const { product_id } = req.params;

  const db = getDatabase();
  
  db.run(
    'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?',
    [userId, product_id],
    function(err) {
      db.close();
      
      if (err) {
        return res.status(500).json({
          error: 'database_error',
          message: 'Failed to remove item from cart'
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          error: 'item_not_found',
          message: 'Item not found in cart'
        });
      }

      res.json({
        message: 'Item removed from cart successfully'
      });
    }
  );
});

// Checkout - create order from cart
router.post('/checkout', authenticateToken, authorizeScopes(['purchase']), (req, res) => {
  const userId = req.user.user_id;
  const userEmail = req.user.email;

  const db = getDatabase();
  
  // Get cart items
  db.all(
    `SELECT ci.*, p.name, p.price, p.stock_quantity,
            (ci.quantity * p.price) as total_price
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     WHERE ci.user_id = ?`,
    [userId],
    (err, cartItems) => {
      if (err || cartItems.length === 0) {
        db.close();
        return res.status(400).json({
          error: 'empty_cart',
          message: 'Cart is empty'
        });
      }

      // Check stock availability
      for (const item of cartItems) {
        if (item.stock_quantity < item.quantity) {
          db.close();
          return res.status(400).json({
            error: 'insufficient_stock',
            message: `Not enough stock for ${item.name}`
          });
        }
      }

      const totalAmount = cartItems.reduce((sum, item) => sum + item.total_price, 0);

      // Create order
      db.run(
        'INSERT INTO orders (user_id, user_email, total_amount, status) VALUES (?, ?, ?, ?)',
        [userId, userEmail, totalAmount, 'pending'],
        function(err) {
          if (err) {
            db.close();
            return res.status(500).json({
              error: 'database_error',
              message: 'Failed to create order'
            });
          }

          const orderId = this.lastID;

          // Add order items and update stock
          let itemsProcessed = 0;
          const totalItems = cartItems.length;

          cartItems.forEach(item => {
            // Add order item
            db.run(
              `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) 
               VALUES (?, ?, ?, ?, ?)`,
              [orderId, item.product_id, item.quantity, item.price, item.total_price],
              (err) => {
                if (err) {
                  console.error('Failed to add order item:', err);
                  return;
                }

                // Update product stock
                db.run(
                  'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
                  [item.quantity, item.product_id]
                );

                itemsProcessed++;
                
                if (itemsProcessed === totalItems) {
                  // Clear cart
                  db.run('DELETE FROM cart_items WHERE user_id = ?', [userId]);
                  
                  db.close();
                  
                  res.status(201).json({
                    message: 'Order created successfully',
                    order: {
                      id: orderId,
                      total_amount: totalAmount,
                      status: 'pending',
                      items: cartItems.length
                    }
                  });
                }
              }
            );
          });
        }
      );
    }
  );
});

// Get user's orders
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.user_id;
  const isAdmin = req.user.role === 'admin';

  let query = 'SELECT * FROM orders';
  let params = [];

  if (!isAdmin) {
    query += ' WHERE user_id = ?';
    params.push(userId);
  }

  query += ' ORDER BY created_at DESC';

  const db = getDatabase();
  
  db.all(query, params, (err, orders) => {
    db.close();
    
    if (err) {
      return res.status(500).json({
        error: 'database_error',
        message: 'Failed to fetch orders'
      });
    }

    res.json({ orders });
  });
});

// Get order details
router.get('/:id', authenticateToken, authorizeResourceOwner, (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;
  const isAdmin = req.user.role === 'admin';

  const db = getDatabase();
  
  let orderQuery = 'SELECT * FROM orders WHERE id = ?';
  let orderParams = [id];

  if (!isAdmin) {
    orderQuery += ' AND user_id = ?';
    orderParams.push(userId);
  }

  db.get(orderQuery, orderParams, (err, order) => {
    if (err || !order) {
      db.close();
      return res.status(404).json({
        error: 'order_not_found',
        message: 'Order not found'
      });
    }

    // Get order items
    db.all(
      `SELECT oi.*, p.name, p.description, p.image_url
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [id],
      (err, orderItems) => {
        db.close();
        
        if (err) {
          return res.status(500).json({
            error: 'database_error',
            message: 'Failed to fetch order items'
          });
        }

        res.json({
          order: {
            ...order,
            items: orderItems
          }
        });
      }
    );
  });
});

module.exports = router;
