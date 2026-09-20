require('dotenv').config();

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { generateRegistrationOptions, verifyRegistrationResponse } = require('@simplewebauthn/server');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_COOKIE = 'spendora_session';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_WALLET_PHOTO_BYTES = 8 * 1024 * 1024;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ==================== REACT FRONTEND (pure-React migration) ====================
// Serves the React production build (frontend/dist) when present. Additive only:
// - No API, auth, database, or business-logic behavior is changed below.
// - Legacy standalone files (analytics.html, app.js, styles.css, ...) remain on
//   disk and stay directly reachable via the existing static middleware, so
//   removing frontend/dist restores the legacy frontend (rollback safety).
//   (Note: /index.html resolves to the React entry when a build exists, since
//   both define that filename; the legacy file itself is untouched on disk.)
// - React's hashed asset filenames cannot collide with legacy files.
const REACT_DIST_DIR = path.join(__dirname, '..', 'frontend', 'dist');
const REACT_INDEX_FILE = path.join(REACT_DIST_DIR, 'index.html');
const hasReactBuild = fs.existsSync(REACT_INDEX_FILE);
if (hasReactBuild) {
  app.use(express.static(REACT_DIST_DIR));
}
app.use(express.static(path.join(__dirname, '..')));

// MongoDB Connection String - 
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://pranavbidkar24_db_user:Pranav241010@expensecluster.dnh0jqe.mongodb.net/?appName=ExpenseCluster";

const client = new MongoClient(MONGODB_URI);

let db;
let expensesCollection;
let categoriesCollection;
let usersCollection;
const oauthStates = new Map();
const sessions = new Map();
const signupChallenges = new Map();

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

function normalizeUsername(username = '') {
  return String(username).trim().toLowerCase();
}

function normalizeDisplayName(displayName = '') {
  return String(displayName).trim().toLowerCase();
}

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getLocalUserId(displayNameLower) {
  return `local-${base64Url(sha256(displayNameLower)).slice(0, 14)}`;
}

function hashPassword(password, salt = randomToken(16)) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash = '') {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;

  const incoming = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const saved = Buffer.from(hash, 'hex');
  return saved.length === incoming.length && crypto.timingSafeEqual(saved, incoming);
}

function publicLocalUser(record) {
  return record?.user || {
    id: record.userId,
    name: [record.firstName, record.secondName].filter(Boolean).join(' ') || record.username,
    email: record.username.includes('@') ? record.username : '',
    picture: ''
  };
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

function createMemoryCollection() {
  const docs = [];

  function matches(doc, query = {}) {
    return Object.entries(query).every(([key, expected]) => {
      const value = key === '_id' ? String(doc._id) : doc[key];
      if (expected && typeof expected === 'object' && !(expected instanceof ObjectId)) {
        if ('$gte' in expected && value < expected.$gte) return false;
        if ('$lte' in expected && value > expected.$lte) return false;
        return true;
      }
      return String(value || '') === String(expected || '');
    });
  }

  function cursor(items) {
    let rows = [...items];
    return {
      sort(sortSpec = {}) {
        const [[field, direction] = []] = Object.entries(sortSpec);
        if (field) {
          rows.sort((a, b) => {
            const left = a[field] || '';
            const right = b[field] || '';
            return left > right ? direction : left < right ? -direction : 0;
          });
        }
        return this;
      },
      async toArray() {
        return rows.map(row => ({ ...row }));
      }
    };
  }

  return {
    async createIndex() {},
    async countDocuments(query = {}) {
      return docs.filter(doc => matches(doc, query)).length;
    },
    async insertMany(items = []) {
      items.forEach(item => docs.push({ _id: new ObjectId(), ...item }));
      return { insertedCount: items.length };
    },
    async insertOne(item = {}) {
      const doc = { _id: new ObjectId(), ...item };
      docs.push(doc);
      return { insertedId: doc._id };
    },
    find(query = {}) {
      return cursor(docs.filter(doc => matches(doc, query)));
    },
    async findOne(query = {}) {
      return docs.find(doc => matches(doc, query)) || null;
    },
    async updateOne(query = {}, update = {}, options = {}) {
      let doc = docs.find(item => matches(item, query));
      if (!doc && options.upsert) {
        doc = { _id: new ObjectId(), ...query };
        docs.push(doc);
      }
      if (!doc) return { matchedCount: 0, modifiedCount: 0 };
      Object.assign(doc, update.$set || update);
      return { matchedCount: 1, modifiedCount: 1 };
    },
    async deleteOne(query = {}) {
      const index = docs.findIndex(doc => matches(doc, query));
      if (index === -1) return { deletedCount: 0 };
      docs.splice(index, 1);
      return { deletedCount: 1 };
    },
    aggregate() {
      return cursor([]);
    }
  };
}

function useMemoryDatabase() {
  expensesCollection = createMemoryCollection();
  categoriesCollection = createMemoryCollection();
  usersCollection = createMemoryCollection();
}
// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    console.log('âœ… Connected to MongoDB Atlas');
    
    db = client.db('expenseTrackerDB'); // Database name
    expensesCollection = db.collection('expenses');
    categoriesCollection = db.collection('categories');
    usersCollection = db.collection('users');
    await usersCollection.createIndex({ userId: 1 }, { unique: true });
    await usersCollection.createIndex({ displayNameLower: 1 }, { unique: true, sparse: true });
    await usersCollection.createIndex({ emailLower: 1 }, { unique: true, sparse: true });
    await usersCollection.createIndex({ usernameLower: 1 }, { unique: true, sparse: true });
    
    // Initialize default categories if they don't exist
    const categoryCount = await categoriesCollection.countDocuments();
    if (categoryCount === 0) {
      await categoriesCollection.insertMany([
        { name: 'Food', budget: 10000, color: '#16A34A', icon: '🍔' },
        { name: 'Transport', budget: 5000, color: '#EA580C', icon: '🚗' },
        { name: 'Shopping', budget: 8000, color: '#7C3AED', icon: '🛍️' },
        { name: 'Bills', budget: 7000, color: '#2563EB', icon: '💡' },
        { name: 'Entertainment', budget: 4000, color: '#D97706', icon: '🎬' },
        { name: 'Health', budget: 6000, color: '#DC2626', icon: '🏥' },
        { name: 'Other', budget: 3000, color: '#64748B', icon: '📦' }
      ]);
      console.log('âœ… Default categories created');
    }
    
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    console.warn('Starting Spendora with temporary in-memory storage.');
    useMemoryDatabase();
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

app.get(['/login', '/signup'], (req, res) => {
  if (hasReactBuild) {
    res.sendFile(REACT_INDEX_FILE);
    return;
  }
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/search', (req, res) => {
  if (hasReactBuild) {
    res.sendFile(REACT_INDEX_FILE);
    return;
  }
  res.sendFile(path.join(__dirname, 'search.html'));
});

app.get('/analytics', (req, res) => {
  if (hasReactBuild) {
    res.sendFile(REACT_INDEX_FILE);
    return;
  }
  res.sendFile(path.join(__dirname, 'analytics.html'));
});

app.get('/wallet', (req, res) => {
  if (hasReactBuild) {
    res.sendFile(REACT_INDEX_FILE);
    return;
  }
  res.sendFile(path.join(__dirname, 'wallet.html'));
});

app.get('/categories', (req, res) => {
  if (hasReactBuild) {
    res.sendFile(REACT_INDEX_FILE);
    return;
  }
  res.sendFile(path.join(__dirname, 'categories.html'));
});

app.get('/switch-user-mode', (req, res) => {
  if (hasReactBuild) {
    res.sendFile(REACT_INDEX_FILE);
    return;
  }
  res.sendFile(path.join(__dirname, 'switch-user-mode.html'));
});

app.get('/transactions', (req, res) => {
  if (hasReactBuild) {
    res.sendFile(REACT_INDEX_FILE);
    return;
  }
  res.status(404).send('Not found');
});

app.post('/api/auth/password-login', async (req, res) => {
  const displayName = String(req.body?.displayName || req.body?.username || '').trim();
  const displayNameLower = normalizeDisplayName(displayName);
  const password = String(req.body?.password || '');

  if (!displayNameLower || !password) {
    res.status(400).json({
      success: false,
      error: 'Enter your display name and password.'
    });
    return;
  }

  try {
    const record = await usersCollection.findOne({ displayNameLower }) || await usersCollection.findOne({ usernameLower: displayNameLower });
    if (!record || !record.passwordHash || !verifyPassword(password, record.passwordHash)) {
      res.status(401).json({
        success: false,
        error: 'Invalid display name or password.'
      });
      return;
    }

    const user = publicLocalUser(record);
    createSession(req, res, user);
    res.json({
      success: true,
      message: 'Welcome back.',
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Login failed. Try again.' });
  }
});

app.post('/api/auth/signup-challenge', async (req, res) => {
  const displayName = String(req.body?.displayName || '').trim();
  const displayNameLower = normalizeDisplayName(displayName);
  const email = String(req.body?.email || '').trim();
  const emailLower = normalizeEmail(email);

  if (!displayNameLower || !isValidEmail(emailLower)) {
    res.status(400).json({ success: false, error: 'Enter a valid display name and email address.' });
    return;
  }

  try {
    const rpID = req.hostname;
    const options = await generateRegistrationOptions({
      rpName: 'Spendora',
      rpID,
      userName: emailLower,
      userDisplayName: displayName,
      timeout: 60000,
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'required'
      }
    });

    const challengeId = randomToken(24);
    signupChallenges.set(challengeId, {
      challenge: options.challenge,
      displayNameLower,
      emailLower,
      rpID,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    res.json({ success: true, challengeId, options });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not prepare passkey verification.' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const firstName = String(req.body?.firstName || '').trim();
  const secondName = String(req.body?.secondName || '').trim();
  const displayName = String(req.body?.displayName || '').trim();
  const displayNameLower = normalizeDisplayName(displayName);
  const email = String(req.body?.email || '').trim();
  const emailLower = normalizeEmail(email);
  const password = String(req.body?.password || '');
  const confirmPassword = String(req.body?.confirmPassword || '');
  const challengeId = String(req.body?.challengeId || '');
  const credential = req.body?.credential;

  if (!firstName || !secondName || !displayNameLower || !emailLower || !password || !confirmPassword) {
    res.status(400).json({ success: false, error: 'Complete all signup fields.' });
    return;
  }

  if (!isValidEmail(emailLower)) {
    res.status(400).json({ success: false, error: 'Enter a valid email address.' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({ success: false, error: 'Passwords do not match.' });
    return;
  }

  const challengeRecord = signupChallenges.get(challengeId);
  signupChallenges.delete(challengeId);
  if (!challengeRecord || challengeRecord.expiresAt <= Date.now()) {
    res.status(400).json({ success: false, error: 'Verification expired. Try again.' });
    return;
  }

  if (challengeRecord.displayNameLower !== displayNameLower || challengeRecord.emailLower !== emailLower) {
    res.status(400).json({ success: false, error: 'Verification does not match this signup.' });
    return;
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin: `${req.protocol}://${req.get('host')}`,
      expectedRPID: challengeRecord.rpID,
      requireUserVerification: true
    });

    if (!verification.verified || !verification.registrationInfo) {
      res.status(400).json({ success: false, error: 'Fingerprint or passkey verification failed.' });
      return;
    }

    const existingName = await usersCollection.findOne({ displayNameLower });
    if (existingName) {
      res.status(409).json({ success: false, error: 'This display name is already registered.' });
      return;
    }

    const existingEmail = await usersCollection.findOne({ emailLower });
    if (existingEmail) {
      res.status(409).json({ success: false, error: 'This email address is already registered.' });
      return;
    }

    const user = {
      id: getLocalUserId(displayNameLower),
      name: displayName,
      email,
      picture: ''
    };
    const registration = verification.registrationInfo;

    await usersCollection.insertOne({
      userId: user.id,
      displayName,
      displayNameLower,
      username: displayName,
      usernameLower: displayNameLower,
      email,
      emailLower,
      firstName,
      secondName,
      passwordHash: hashPassword(password),
      authType: 'password-passkey',
      passkeyCredentialId: registration.credential.id,
      passkeyPublicKey: Buffer.from(registration.credential.publicKey),
      passkeyCounter: registration.credential.counter,
      emailVerifiedAt: new Date(),
      user,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    createSession(req, res, user);
    res.json({ success: true, message: 'Your Spendora account is ready.', user });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Fingerprint or passkey verification failed.' });
  }
});
app.post('/api/auth/forgot-password', (req, res) => {
  const displayName = String(req.body?.displayName || req.body?.username || '').trim();

  if (!displayName) {
    res.status(400).json({ success: false, error: 'Enter your display name first.' });
    return;
  }

  res.json({ success: true, message: 'Password recovery is ready for this account.' });
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

    const query = {
      $or: [
        ...(session.user?.id ? [{ userId: session.user.id }] : []),
        ...(session.user?.email ? [{ emailLower: normalizeEmail(session.user.email) }] : []),
        ...(session.user?.name ? [{ displayNameLower: normalizeDisplayName(session.user.name) }] : [])
      ]
    };

    const userRecord = query.$or.length
      ? await usersCollection.findOne(query, { projection: { walletPhoto: 1 } })
      : await usersCollection.findOne({ userId: session.user.id }, { projection: { walletPhoto: 1 } });

    res.json({
      authenticated: true,
      photo: userRecord?.walletPhoto || ''
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const handleSaveWalletPhoto = async (req, res) => {
  try {
    const session = requireSession(req, res);
    if (!session) return;

    const photo = String(req.body?.photo || '');
    const validationError = validateWalletPhoto(photo);
    if (validationError) {
      res.status(400).json({ success: false, error: validationError });
      return;
    }

    const query = {
      $or: [
        ...(session.user?.id ? [{ userId: session.user.id }] : []),
        ...(session.user?.email ? [{ emailLower: normalizeEmail(session.user.email) }] : []),
        ...(session.user?.name ? [{ displayNameLower: normalizeDisplayName(session.user.name) }] : [])
      ]
    };

    const existingUser = query.$or.length ? await usersCollection.findOne(query) : null;

    if (existingUser) {
      await usersCollection.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            walletPhoto: photo,
            walletPhotoUpdatedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );
    } else {
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
    }

    res.json({
      success: true,
      message: 'Wallet photo saved',
      photo
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

app.put('/api/wallet/photo', handleSaveWalletPhoto);
app.post('/api/wallet/photo', handleSaveWalletPhoto);

app.delete('/api/wallet/photo', async (req, res) => {
  try {
    const session = requireSession(req, res);
    if (!session) return;

    const query = {
      $or: [
        ...(session.user?.id ? [{ userId: session.user.id }] : []),
        ...(session.user?.email ? [{ emailLower: normalizeEmail(session.user.email) }] : []),
        ...(session.user?.name ? [{ displayNameLower: normalizeDisplayName(session.user.name) }] : [])
      ]
    };

    const existingUser = query.$or.length ? await usersCollection.findOne(query) : null;

    if (existingUser) {
      await usersCollection.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            updatedAt: new Date()
          },
          $unset: {
            walletPhoto: '',
            walletPhotoUpdatedAt: ''
          }
        }
      );
    } else {
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
    }

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
      color: req.body.color || '#8A9DA0',
      icon: req.body.icon || 'ðŸ“¦'
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
  console.log(`ðŸš€ Server running on http://localhost:${PORT}`);
  console.log(`ðŸ“Š API endpoints ready`);
});

