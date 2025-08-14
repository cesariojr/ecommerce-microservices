const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken, authorizeScopes, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get all products (public endpoint)
router.get('/', (req, res) => {
  const { category, search, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM products WHERE 1=1';
  let params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const db = getDatabase();
  
  db.all(query, params, (err, products) => {
    if (err) {
      db.close();
      return res.status(500).json({
        error: 'database_error',
        message: 'Failed to fetch products'
      });
    }

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    let countParams = [];

    if (category) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }

    if (search) {
      countQuery += ' AND (name LIKE ? OR description LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    db.get(countQuery, countParams, (err, count) => {
      db.close();
      
      if (err) {
        return res.status(500).json({
          error: 'database_error',
          message: 'Failed to count products'
        });
      }

      res.json({
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count.total,
          pages: Math.ceil(count.total / limit)
        }
      });
    });
  });
});

// Get product categories (public endpoint)
router.get('/meta/categories', (req, res) => {
  const db = getDatabase();
  
  db.all('SELECT DISTINCT category FROM products ORDER BY category', (err, categories) => {
    db.close();
    
    if (err) {
      return res.status(500).json({
        error: 'database_error',
        message: 'Failed to fetch categories'
      });
    }

    res.json({
      categories: categories.map(row => row.category)
    });
  });
});

// Get product by ID (public endpoint)
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const db = getDatabase();
  
  db.get('SELECT * FROM products WHERE id = ?', [id], (err, product) => {
    db.close();
    
    if (err) {
      return res.status(500).json({
        error: 'database_error',
        message: 'Failed to fetch product'
      });
    }

    if (!product) {
      return res.status(404).json({
        error: 'product_not_found',
        message: 'Product not found'
      });
    }

    res.json({ product });
  });
});

// Create product (admin only)
router.post('/', authenticateToken, authorizeRole('admin'), (req, res) => {
  const { name, description, price, category, stock_quantity, image_url } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({
      error: 'invalid_request',
      message: 'Name, price, and category are required'
    });
  }

  const db = getDatabase();
  
  db.run(
    `INSERT INTO products (name, description, price, category, stock_quantity, image_url) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, description, price, category, stock_quantity || 0, image_url],
    function(err) {
      db.close();
      
      if (err) {
        return res.status(500).json({
          error: 'database_error',
          message: 'Failed to create product'
        });
      }

      res.status(201).json({
        message: 'Product created successfully',
        product_id: this.lastID
      });
    }
  );
});

// Update product (admin only)
router.put('/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, stock_quantity, image_url } = req.body;

  const db = getDatabase();
  
  db.run(
    `UPDATE products 
     SET name = ?, description = ?, price = ?, category = ?, 
         stock_quantity = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [name, description, price, category, stock_quantity, image_url, id],
    function(err) {
      db.close();
      
      if (err) {
        return res.status(500).json({
          error: 'database_error',
          message: 'Failed to update product'
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          error: 'product_not_found',
          message: 'Product not found'
        });
      }

      res.json({
        message: 'Product updated successfully'
      });
    }
  );
});

// Delete product (admin only)
router.delete('/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
  const { id } = req.params;

  const db = getDatabase();
  
  db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
    db.close();
    
    if (err) {
      return res.status(500).json({
        error: 'database_error',
        message: 'Failed to delete product'
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        error: 'product_not_found',
        message: 'Product not found'
      });
    }

    res.json({
      message: 'Product deleted successfully'
    });
  });
});

module.exports = router;
