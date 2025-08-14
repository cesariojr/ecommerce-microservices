const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const { initDatabase } = require('./database/init');
const { authenticateToken, authorizeScopes } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});
app.use(limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);

// Reports endpoint (requires reports scope)
app.get('/reports/sales', authenticateToken, authorizeScopes(['reports']), (req, res) => {
  // Simple sales report
  res.json({
    total_sales: 125000,
    total_orders: 450,
    avg_order_value: 277.78,
    top_products: [
      { name: 'Smartphone Pro', sales: 25000 },
      { name: 'Laptop Ultra', sales: 18000 },
      { name: 'Headphones Premium', sales: 12000 }
    ],
    period: 'Last 30 days'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'product-service',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Product Service Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Initialize database and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🛍️  Product Service running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
}).catch(err => {
  console.error('Failed to initialize product database:', err);
  process.exit(1);
});

module.exports = app;
