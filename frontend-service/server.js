const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for demo purposes
}));
app.use(cors());
app.use(cookieParser());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Auth middleware
const requireAuth = async (req, res, next) => {
  const token = req.cookies.access_token;
  
  if (!token) {
    return res.redirect('/login');
  }

  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/auth/validate`, {
      token: token
    });

    if (response.data.valid) {
      req.user = response.data.user;
      res.locals.user = req.user;
      next();
    } else {
      res.clearCookie('access_token');
      res.redirect('/login');
    }
  } catch (error) {
    res.clearCookie('access_token');
    res.redirect('/login');
  }
};

// Routes

// Home page - redirect to login
app.get('/', (req, res) => {
  if (req.cookies.access_token) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

// Product catalog page
app.get('/products', async (req, res) => {
  try {
    const { category, search, page = 1, success, error } = req.query;
    
    // Get products
    const productsResponse = await axios.get(`${PRODUCT_SERVICE_URL}/products`, {
      params: { category, search, page, limit: 12 }
    });

    // Get categories
    const categoriesResponse = await axios.get(`${PRODUCT_SERVICE_URL}/products/meta/categories`);

    res.render('index', {
      title: 'E-commerce Demo',
      products: productsResponse.data.products,
      categories: categoriesResponse.data.categories,
      pagination: productsResponse.data.pagination,
      currentCategory: category,
      searchQuery: search,
      success: success,
      error: error,
      user: req.cookies.access_token ? await getUserFromToken(req.cookies.access_token) : null
    });
  } catch (error) {
    console.error('Error loading products page:', error.message);
    res.render('error', { 
      title: 'Error',
      message: 'Failed to load products',
      user: null
    });
  }
});

// Login page
app.get('/login', (req, res) => {
  if (req.cookies.access_token) {
    return res.redirect('/dashboard');
  }
  
  res.render('login', { 
    title: 'Login',
    error: req.query.error,
    user: null
  });
});

// Login handler
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/auth/login`, {
      email,
      password
    });

    res.cookie('access_token', response.data.access_token, {
      httpOnly: true,
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.redirect('/dashboard');
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Login failed';
    res.redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
  }
});

// Dashboard (protected)
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    let data = {};

    if (req.user.role === 'admin') {
      // Admin dashboard - get products and orders
      const [productsResponse, ordersResponse] = await Promise.all([
        axios.get(`${PRODUCT_SERVICE_URL}/products`, { params: { limit: 5 } }),
        axios.get(`${PRODUCT_SERVICE_URL}/orders`, {
          headers: { Authorization: `Bearer ${req.cookies.access_token}` }
        })
      ]);
      
      data = {
        products: productsResponse.data.products,
        orders: ordersResponse.data.orders.slice(0, 5)
      };
    } else if (req.user.role === 'viewer') {
      // Viewer dashboard - get reports
      const reportsResponse = await axios.get(`${PRODUCT_SERVICE_URL}/reports/sales`, {
        headers: { Authorization: `Bearer ${req.cookies.access_token}` }
      });
      
      data = {
        reports: reportsResponse.data
      };
    } else {
      // Customer dashboard - get orders and cart
      const [ordersResponse, cartResponse] = await Promise.all([
        axios.get(`${PRODUCT_SERVICE_URL}/orders`, {
          headers: { Authorization: `Bearer ${req.cookies.access_token}` }
        }),
        axios.get(`${PRODUCT_SERVICE_URL}/orders/cart`, {
          headers: { Authorization: `Bearer ${req.cookies.access_token}` }
        })
      ]);
      
      data = {
        orders: ordersResponse.data.orders,
        cart: cartResponse.data
      };
    }

    res.render('dashboard', {
      title: 'Dashboard',
      user: req.user,
      data
    });
  } catch (error) {
    console.error('Dashboard error:', error.message);
    res.render('dashboard', {
      title: 'Dashboard',
      user: req.user,
      data: {},
      error: 'Failed to load dashboard data'
    });
  }
});

// Product management (admin only)
app.get('/admin/products', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).render('error', {
      title: 'Access Denied',
      message: 'Admin access required',
      user: req.user
    });
  }

  try {
    const response = await axios.get(`${PRODUCT_SERVICE_URL}/products`, {
      params: { limit: 50 }
    });

    res.render('admin/products', {
      title: 'Product Management',
      products: response.data.products,
      user: req.user
    });
  } catch (error) {
    res.render('error', {
      title: 'Error',
      message: 'Failed to load products',
      user: req.user
    });
  }
});

// API: Add product (admin only)
app.post('/api/admin/products', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const response = await axios.post(`${PRODUCT_SERVICE_URL}/products`, req.body, {
      headers: { Authorization: `Bearer ${req.cookies.access_token}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to add product' });
  }
});

// API: Delete product (admin only)
app.delete('/api/admin/products/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const response = await axios.delete(`${PRODUCT_SERVICE_URL}/products/${req.params.id}`, {
      headers: { Authorization: `Bearer ${req.cookies.access_token}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to delete product' });
  }
});

// Shopping cart
app.get('/cart', requireAuth, async (req, res) => {
  try {
    const { success, error } = req.query;
    const response = await axios.get(`${PRODUCT_SERVICE_URL}/orders/cart`, {
      headers: { Authorization: `Bearer ${req.cookies.access_token}` }
    });

    res.render('cart', {
      title: 'Shopping Cart',
      cart: response.data,
      success: success,
      error: error,
      user: req.user
    });
  } catch (error) {
    res.render('error', {
      title: 'Error',
      message: 'Failed to load cart',
      user: req.user
    });
  }
});

// Add to cart
app.post('/cart/add/:productId', requireAuth, async (req, res) => {
  try {
    await axios.post(`${PRODUCT_SERVICE_URL}/orders/cart/add`, {
      product_id: req.params.productId,
      quantity: 1
    }, {
      headers: { Authorization: `Bearer ${req.cookies.access_token}` }
    });

    res.redirect('/products?success=Item added to cart');
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to add item to cart';
    res.redirect(`/products?error=${encodeURIComponent(errorMessage)}`);
  }
});

// API: Update cart item quantity
app.put('/api/cart/update/:itemId', requireAuth, async (req, res) => {
  try {
    const response = await axios.put(`${PRODUCT_SERVICE_URL}/orders/cart/update/${req.params.itemId}`, req.body, {
      headers: { Authorization: `Bearer ${req.cookies.access_token}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to update item' });
  }
});

// API: Remove cart item
app.delete('/api/cart/remove/:itemId', requireAuth, async (req, res) => {
  try {
    const response = await axios.delete(`${PRODUCT_SERVICE_URL}/orders/cart/remove/${req.params.itemId}`, {
      headers: { Authorization: `Bearer ${req.cookies.access_token}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to remove item' });
  }
});

// Checkout
app.post('/checkout', requireAuth, async (req, res) => {
  try {
    await axios.post(`${PRODUCT_SERVICE_URL}/orders/checkout`, {}, {
      headers: { Authorization: `Bearer ${req.cookies.access_token}` }
    });

    res.redirect('/dashboard?success=Order placed successfully');
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Checkout failed';
    res.redirect(`/cart?error=${encodeURIComponent(errorMessage)}`);
  }
});

// Logout
app.post('/logout', (req, res) => {
  res.clearCookie('access_token');
  res.redirect('/login');
});

// Helper function
const getUserFromToken = async (token) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/auth/validate`, { token });
    return response.data.valid ? response.data.user : null;
  } catch (error) {
    return null;
  }
};

// Architecture documentation page
app.get('/architecture', (req, res) => {
  res.render('architecture', {
    title: 'Arquitetura do Sistema',
    user: req.user || null
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Frontend Service Error:', err);
  res.status(500).render('error', {
    title: 'Error',
    message: 'Something went wrong',
    user: req.user || null
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist',
    user: req.user || null
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Frontend Service running on port ${PORT}`);
  console.log(`🔗 Open: http://localhost:${PORT}`);
});

module.exports = app;
