const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'products.db');

const initDatabase = async () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('📁 Connected to Product SQLite database');
    });

    db.serialize(async () => {
      // Products table
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          category TEXT NOT NULL,
          stock_quantity INTEGER DEFAULT 0,
          image_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Orders table
      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          user_email TEXT NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Order items table
      db.run(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders (id),
          FOREIGN KEY (product_id) REFERENCES products (id)
        )
      `);

      // Shopping cart table (for demo purposes)
      db.run(`
        CREATE TABLE IF NOT EXISTS cart_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products (id)
        )
      `);

      await insertDemoData(db);
      
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✅ Product database initialized successfully');
          resolve();
        }
      });
    });
  });
};

const insertDemoData = async (db) => {
  return new Promise((resolve) => {
    // Demo products
    const products = [
      {
        name: 'Smartphone Pro',
        description: 'Latest flagship smartphone with advanced features',
        price: 899.99,
        category: 'Electronics',
        stock_quantity: 50,
        image_url: 'https://via.placeholder.com/300x300?text=Smartphone'
      },
      {
        name: 'Laptop Ultra',
        description: 'High-performance laptop for professionals',
        price: 1299.99,
        category: 'Electronics',
        stock_quantity: 25,
        image_url: 'https://via.placeholder.com/300x300?text=Laptop'
      },
      {
        name: 'Headphones Premium',
        description: 'Noise-cancelling wireless headphones',
        price: 299.99,
        category: 'Electronics',
        stock_quantity: 100,
        image_url: 'https://via.placeholder.com/300x300?text=Headphones'
      },
      {
        name: 'Coffee Maker Deluxe',
        description: 'Programmable coffee maker with built-in grinder',
        price: 199.99,
        category: 'Home & Kitchen',
        stock_quantity: 30,
        image_url: 'https://via.placeholder.com/300x300?text=Coffee+Maker'
      },
      {
        name: 'Running Shoes Sport',
        description: 'Comfortable running shoes for all terrains',
        price: 129.99,
        category: 'Sports',
        stock_quantity: 75,
        image_url: 'https://via.placeholder.com/300x300?text=Running+Shoes'
      },
      {
        name: 'Backpack Travel',
        description: 'Durable travel backpack with multiple compartments',
        price: 79.99,
        category: 'Travel',
        stock_quantity: 40,
        image_url: 'https://via.placeholder.com/300x300?text=Backpack'
      },
      {
        name: 'Desk Chair Ergonomic',
        description: 'Ergonomic office chair with lumbar support',
        price: 249.99,
        category: 'Furniture',
        stock_quantity: 20,
        image_url: 'https://via.placeholder.com/300x300?text=Office+Chair'
      },
      {
        name: 'Water Bottle Steel',
        description: 'Insulated stainless steel water bottle',
        price: 24.99,
        category: 'Sports',
        stock_quantity: 150,
        image_url: 'https://via.placeholder.com/300x300?text=Water+Bottle'
      }
    ];

    for (const product of products) {
      db.run(
        `INSERT OR IGNORE INTO products 
         (name, description, price, category, stock_quantity, image_url) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [product.name, product.description, product.price, product.category, product.stock_quantity, product.image_url]
      );
    }

    // Demo orders
    const orders = [
      {
        user_id: 3, // customer
        user_email: 'customer@ecommerce.com',
        total_amount: 1199.98,
        status: 'completed'
      },
      {
        user_id: 3,
        user_email: 'customer@ecommerce.com',
        total_amount: 329.98,
        status: 'pending'
      }
    ];

    for (const order of orders) {
      db.run(
        `INSERT OR IGNORE INTO orders 
         (user_id, user_email, total_amount, status) 
         VALUES (?, ?, ?, ?)`,
        [order.user_id, order.user_email, order.total_amount, order.status]
      );
    }

    console.log('🛍️  Demo products and orders created');
    resolve();
  });
};

const getDatabase = () => {
  return new sqlite3.Database(DB_PATH);
};

module.exports = { initDatabase, getDatabase };
