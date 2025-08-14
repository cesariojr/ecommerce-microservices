const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const DB_PATH = path.join(__dirname, 'auth.db');

const initDatabase = async () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('📁 Connected to Auth SQLite database');
    });

    // Create tables
    db.serialize(async () => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'customer',
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // OAuth clients table
      db.run(`
        CREATE TABLE IF NOT EXISTS oauth_clients (
          client_id TEXT PRIMARY KEY,
          client_secret TEXT NOT NULL,
          name TEXT NOT NULL,
          redirect_uris TEXT NOT NULL,
          scopes TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Authorization codes table
      db.run(`
        CREATE TABLE IF NOT EXISTS auth_codes (
          code TEXT PRIMARY KEY,
          client_id TEXT NOT NULL,
          user_id INTEGER NOT NULL,
          scopes TEXT NOT NULL,
          redirect_uri TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (client_id) REFERENCES oauth_clients (client_id)
        )
      `);

      // Refresh tokens table
      db.run(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          token TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          client_id TEXT NOT NULL,
          scopes TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          revoked BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (client_id) REFERENCES oauth_clients (client_id)
        )
      `);

      // Insert demo data
      await insertDemoData(db);
      
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✅ Auth database initialized successfully');
          resolve();
        }
      });
    });
  });
};

const insertDemoData = async (db) => {
  return new Promise(async (resolve) => {
    // Demo users
    const users = [
      {
        email: 'admin@ecommerce.com',
        password: 'admin123',
        role: 'admin',
        name: 'System Administrator'
      },
      {
        email: 'viewer@ecommerce.com',
        password: 'viewer123',
        role: 'viewer',
        name: 'Sales Analyst'
      },
      {
        email: 'customer@ecommerce.com',
        password: 'customer123',
        role: 'customer',
        name: 'John Customer'
      }
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      db.run(
        'INSERT OR IGNORE INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)',
        [user.email, hashedPassword, user.role, user.name]
      );
    }

    // Demo OAuth client
    db.run(`
      INSERT OR IGNORE INTO oauth_clients 
      (client_id, client_secret, name, redirect_uris, scopes) 
      VALUES (?, ?, ?, ?, ?)
    `, [
      'ecommerce-frontend',
      'frontend-secret-key',
      'E-commerce Frontend',
      'http://localhost:3000/callback',
      'read write admin'
    ]);

    console.log('👥 Demo users and OAuth client created');
    resolve();
  });
};

const getDatabase = () => {
  return new sqlite3.Database(DB_PATH);
};

module.exports = { initDatabase, getDatabase };
