require('dotenv').config();

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_COOKIE = 'spendora_session';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_WALLET_PHOTO_BYTES = 8 * 1024 * 1024;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// MongoDB Connection String - REPLACE WITH YOUR OWN
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://pranavbidkar24_db_user:Pranav241010@expensecluster.dnh0jqe.mongodb.net/?appName=ExpenseCluster";

const client = new MongoClient(MONGODB_URI);

let db;
let expensesCollection;
let categoriesCollection;
let usersCollection;
const oauthStates = new Map();
const sessions = new Map();

function base64Url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function randomToken(bytes = 32) {
  return base64Url(crypto.randomBytes(bytes));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest();
}

function getOAuthConfig(req) {
  const origin = `${req.protocol}://${req.get('host')}`;

  return {
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    authorizationUrl: process.env.OAUTH_AUTH_URL,
    tokenUrl: process.env.OAUTH_TOKEN_URL,
    userInfoUrl: process.env.OAUTH_USERINFO_URL,
    origin,
    redirectUri: process.env.OAUTH_REDIRECT_URI || `${origin}/auth/callback`,
    scope: process.env.OAUTH_SCOPE || 'openid email profile',
    providerName: process.env.OAUTH_PROVIDER_NAME || 'OAuth2'
  };
}

function isOAuthConfigured(config) {
  return Boolean(config.clientId && config.authorizationUrl && config.tokenUrl);
}

function parseCookies(req) {
  return (req.headers.cookie || '').split(';').reduce((cookies, cookie) => {
    const index = cookie.indexOf('=');
    if (index === -1) return cookies;

    const key = cookie.slice(0, index).trim();
    const value = cookie.slice(index + 1).trim();
    cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function setSessionCookie(req, res, sessionId) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_MAX_AGE_MS / 1000)}`
  ];

  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

function getSession(req) {
  const sessionId = parseCookies(req)[SESSION_COOKIE];
  if (!sessionId) return null;

  const session = sessions.get(sessionId);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return null;
  }

  return { id: sessionId, ...session };
}

function createSession(req, res, user) {
  const sessionId = randomToken(48);
  sessions.set(sessionId, {
    user,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_MAX_AGE_MS
  });
  setSessionCookie(req, res, sessionId);
}

function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(normalized, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function normalizeUser(profile = {}, tokens = {}) {
  const idTokenPayload = tokens.id_token ? decodeJwtPayload(tokens.id_token) : {};
  const data = { ...(idTokenPayload || {}), ...(profile || {}) };

  return {
    id: data.sub || data.id || data.email || randomToken(12),
    name: data.name || [data.given_name, data.family_name].filter(Boolean).join(' ') || data.email || 'OAuth User',
    email: data.email || '',
    picture: data.picture || data.avatar_url || ''
  };
}

function validateWalletPhoto(photo) {
  if (typeof photo !== 'string' || !photo.trim()) {
    return 'Choose an image before saving.';
  }

  if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(photo)) {
    return 'Wallet photo must be a PNG, JPG, WebP, or GIF image.';
  }

  if (Buffer.byteLength(photo, 'utf8') > MAX_WALLET_PHOTO_BYTES) {
    return 'Wallet photo is too large. Use an image under 8 MB.';
  }

  return '';
}

function requireSession(req, res) {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({
      success: false,
      error: 'Login required to save wallet data.'
    });
    return null;
  }

  return session;
}

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    db = client.db('expenseTrackerDB'); // Database name
    expensesCollection = db.collection('expenses');
    categoriesCollection = db.collection('categories');
    usersCollection = db.collection('users');
    await usersCollection.createIndex({ userId: 1 }, { unique: true });
    
    // Initialize default categories if they don't exist
    const categoryCount = await categoriesCollection.countDocuments();
    if (categoryCount === 0) {
      await categoriesCollection.insertMany([
        { name: 'Food', budget: 10000, color: '#FF6B6B', icon: '🍔' },
        { name: 'Transport', budget: 5000, color: '#4ECDC4', icon: '🚗' },
        { name: 'Shopping', budget: 8000, color: '#45B7D1', icon: '🛍️' },
        { name: 'Bills', budget: 7000, color: '#FFA07A', icon: '💡' },
        { name: 'Entertainment', budget: 4000, color: '#98D8C8', icon: '🎬' },
        { name: 'Health', budget: 6000, color: '#F7DC6F', icon: '🏥' },
        { name: 'Other', budget: 3000, color: '#BB8FCE', icon: '📦' }
      ]);
      console.log('✅ Default categories created');
    }
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

connectDB();

// ==================== AUTH ROUTES ====================

app.get('/api/auth/me', (req, res) => {
  const session = getSession(req);

  res.json({
    authenticated: Boolean(session),
    user: session?.user || {
      id: 'guest',
      name: 'Pranav',
      email: '',
      picture: ''
    }
  });
});

app.get('/api/auth/oauth-status', (req, res) => {
  const config = getOAuthConfig(req);

  res.json({
    configured: isOAuthConfigured(config),
    providerName: config.providerName,
    origin: config.origin,
    redirectUri: config.redirectUri
  });
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, 'search.html'));
});

app.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, 'analytics.html'));
});

app.get('/wallet', (req, res) => {
  res.sendFile(path.join(__dirname, 'wallet.html'));
});

app.get('/categories', (req, res) => {
  res.sendFile(path.join(__dirname, 'categories.html'));
});

app.post('/api/auth/password-login', (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');

  if (!username || !password) {
    res.status(400).json({
      success: false,
      error: 'Enter your username and password.'
    });
    return;
  }

  const user = {
    id: `local-${base64Url(sha256(username)).slice(0, 14)}`,
    name: username.includes('@') ? username.split('@')[0] : username,
    email: username.includes('@') ? username : '',
    picture: ''
  };

  createSession(req, res, user);
  res.json({
    success: true,
    message: 'Welcome back.',
    user
  });
});

app.post('/api/auth/signup', (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');

  if (!username || !password) {
    res.status(400).json({
      success: false,
      error: 'Enter a username and password to sign up.'
    });
    return;
  }

  const user = {
    id: `local-${base64Url(sha256(username)).slice(0, 14)}`,
    name: username.includes('@') ? username.split('@')[0] : username,
    email: username.includes('@') ? username : '',
    picture: ''
  };

  createSession(req, res, user);
  res.json({
    success: true,
    message: 'Your Spendora account is ready.',
    user
  });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const username = String(req.body?.username || '').trim();

  if (!username) {
    res.status(400).json({
      success: false,
      error: 'Enter your username first.'
    });
    return;
  }

  res.json({
    success: true,
    message: 'Password recovery is ready for this account.'
  });
});

app.get('/auth/login', (req, res) => {
  const config = getOAuthConfig(req);
  const switchUser = req.query.switch === '1';

  if (!isOAuthConfigured(config)) {
    res.redirect('/login?auth=setup-required');
    return;
  }

  const state = randomToken(24);
  const verifier = randomToken(64);
  const challenge = base64Url(sha256(verifier));

  oauthStates.set(state, {
    verifier,
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  const authorizationUrl = new URL(config.authorizationUrl);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('client_id', config.clientId);
  authorizationUrl.searchParams.set('redirect_uri', config.redirectUri);
  authorizationUrl.searchParams.set('scope', config.scope);
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set('code_challenge', challenge);
  authorizationUrl.searchParams.set('code_challenge_method', 'S256');
  if (switchUser) {
    authorizationUrl.searchParams.set('prompt', 'select_account');
  }

  res.redirect(authorizationUrl.toString());
});

async function handleOAuthCallback(req, res) {
  const config = getOAuthConfig(req);
  const { code, state, error, error_description } = req.query;

  if (error) {
    res.status(400).send(`OAuth2 login failed: ${error_description || error}`);
    return;
  }

  const savedState = oauthStates.get(state);
  oauthStates.delete(state);

  if (!code || !savedState || savedState.expiresAt <= Date.now()) {
    res.status(400).send('OAuth2 login failed: invalid or expired state.');
    return;
  }

  try {
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      code_verifier: savedState.verifier
    });

    if (config.clientSecret) {
      tokenBody.set('client_secret', config.clientSecret);
    }

    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenBody
    });

    const tokenText = await tokenResponse.text();
    let tokens;

    try {
      tokens = JSON.parse(tokenText);
    } catch {
      tokens = Object.fromEntries(new URLSearchParams(tokenText));
    }

    if (!tokenResponse.ok) {
      throw new Error(tokens.error_description || tokens.error || 'Token exchange failed');
    }

    let profile = {};
    if (config.userInfoUrl && tokens.access_token) {
      const profileResponse = await fetch(config.userInfoUrl, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${tokens.access_token}`
        }
      });

      if (profileResponse.ok) {
        profile = await profileResponse.json();
      }
    }

    const user = normalizeUser(profile, tokens);
    createSession(req, res, user);
    res.redirect('/');
  } catch (authError) {
    console.error(`${config.providerName} OAuth2 callback failed:`, authError);
    clearSessionCookie(res);
    res.status(500).send('OAuth2 login failed. Check the server console for details.');
  }
}

app.get('/auth/callback', handleOAuthCallback);
app.get('/oauth2callback', handleOAuthCallback);

app.post('/api/auth/logout', (req, res) => {
  const session = getSession(req);
  if (session) {
    sessions.delete(session.id);
  }

  clearSessionCookie(res);
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/auth/logout', (req, res) => {
  const session = getSession(req);
  if (session) {
    sessions.delete(session.id);
  }

  clearSessionCookie(res);
  res.redirect('/');
});

// ==================== WALLET USER DATA ROUTES ====================

app.get('/api/wallet/photo', async (req, res) => {
  try {
    const session = getSession(req);

    if (!session) {
      res.json({
        authenticated: false,
        photo: ''
      });
      return;
    }

    const userRecord = await usersCollection.findOne(
      { userId: session.user.id },
      { projection: { walletPhoto: 1 } }
    );

    res.json({
      authenticated: true,
      photo: userRecord?.walletPhoto || ''
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/wallet/photo', async (req, res) => {
  try {
    const session = requireSession(req, res);
    if (!session) return;

    const photo = String(req.body?.photo || '');
    const validationError = validateWalletPhoto(photo);
    if (validationError) {
      res.status(400).json({ success: false, error: validationError });
      return;
    }

    await usersCollection.updateOne(
      { userId: session.user.id },
      {
        $set: {
          userId: session.user.id,
          user: session.user,
          walletPhoto: photo,
          walletPhotoUpdatedAt: new Date(),
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    res.json({
      success: true,
      message: 'Wallet photo saved'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/wallet/photo', async (req, res) => {
  try {
    const session = requireSession(req, res);
    if (!session) return;

    await usersCollection.updateOne(
      { userId: session.user.id },
      {
        $set: {
          user: session.user,
          updatedAt: new Date()
        },
        $unset: {
          walletPhoto: '',
          walletPhotoUpdatedAt: ''
        }
      }
    );

    res.json({
      success: true,
      message: 'Wallet photo removed'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== EXPENSE ROUTES ====================

// CREATE - Add new expense
app.post('/api/expenses', async (req, res) => {
  try {
    const expense = {
      description: req.body.description,
      amount: parseFloat(req.body.amount),
      category: req.body.category,
      date: req.body.date,
      paymentMethod: req.body.paymentMethod,
      createdAt: new Date()
    };
    
    const result = await expensesCollection.insertOne(expense);
    res.json({ 
      success: true, 
      message: 'Expense added successfully',
      id: result.insertedId 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// READ - Get all expenses (with optional filters)
app.get('/api/expenses', async (req, res) => {
  try {
    const { category, startDate, endDate } = req.query;
    let query = {};
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Filter by date range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }
    
    const expenses = await expensesCollection
      .find(query)
      .sort({ date: -1, createdAt: -1 }) // Most recent first
      .toArray();
    
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ - Get single expense by ID
app.get('/api/expenses/:id', async (req, res) => {
  try {
    const expense = await expensesCollection.findOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (expense) {
      res.json(expense);
    } else {
      res.status(404).json({ error: 'Expense not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE - Edit existing expense
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const result = await expensesCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          description: req.body.description,
          amount: parseFloat(req.body.amount),
          category: req.body.category,
          date: req.body.date,
          paymentMethod: req.body.paymentMethod,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount > 0) {
      res.json({ 
        success: true, 
        message: 'Expense updated successfully',
        modified: result.modifiedCount 
      });
    } else {
      res.status(404).json({ success: false, error: 'Expense not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Remove expense
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const result = await expensesCollection.deleteOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (result.deletedCount > 0) {
      res.json({ 
        success: true, 
        message: 'Expense deleted successfully' 
      });
    } else {
      res.status(404).json({ success: false, error: 'Expense not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CATEGORY ROUTES ====================

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await categoriesCollection.find({}).toArray();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new category
app.post('/api/categories', async (req, res) => {
  try {
    const category = {
      name: req.body.name,
      budget: parseFloat(req.body.budget) || 0,
      color: req.body.color || '#3498db',
      icon: req.body.icon || '📦'
    };
    
    const result = await categoriesCollection.insertOne(category);
    res.json({ success: true, id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ANALYTICS ROUTES ====================

// Get spending summary for current month
app.get('/api/analytics/summary', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7); // Default: current month
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    
    // Total spending this month
    const monthlyTotal = await expensesCollection.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    // Category-wise breakdown
    const categoryBreakdown = await expensesCollection.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]).toArray();
    
    res.json({
      month: month,
      total: monthlyTotal[0]?.total || 0,
      transactionCount: monthlyTotal[0]?.count || 0,
      byCategory: categoryBreakdown
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get daily spending trend for a month
app.get('/api/analytics/daily-trend', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    
    const dailyData = await expensesCollection.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$date',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]).toArray();
    
    res.json(dailyData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints ready`);
});
