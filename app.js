"use strict";

/**
 * @fileoverview Prism - © Matt James 2025
 */

const startTime = process.hrtime();
const { spawn } = require('child_process');
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const nocache = require('nocache');
const cookieParser = require('cookie-parser');
const path = require('path');

// Redis
const Redis = require('ioredis');
const RedisStore = require('connect-redis').default;

const app = express();

require("./handlers/console.js")();

const loadConfig = require("./handlers/config");
const Database = require("./db.js");

const settings = loadConfig("./config.toml");

// Initialize database
const db = new Database(settings.database);

// Setup Redis
const redisClient = new Redis({
  host: settings.redis?.host || 'localhost',
  port: settings.redis?.port || 6379,
  password: settings.redis?.password || undefined,
  db: settings.redis?.database || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  // console.log('Connected to Redis successfully');
});

// Version information
const VERSION = "0.5.0-alpha2";
const PLATFORM_CODENAME = "Adelante";
const PLATFORM_LEVEL = 'release 120';

console.log(`Prism ${VERSION} (${PLATFORM_CODENAME} ${PLATFORM_LEVEL})`);

// Set up Express
app.set('view engine', 'ejs');
require("express-ws")(app);

// Configure middleware
app.use(cookieParser());
app.use(express.text());
app.use(nocache());
app.use(express.json({
  limit: "500kb"
}));

const sessionConfig = {
  store: new RedisStore({ 
    client: redisClient,
    prefix: 'prism_sess:',
  }),
  secret: settings.website.secret,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  },
  proxy: true
};

app.use(session(sessionConfig));
app.use((req, res, next) => {
  if (!req.session) {
    console.error('Session store error occurred');
    return req.session.regenerate((err) => {
      if (err) {
        console.error('Failed to regenerate session:', err);
        return res.status(500).send('Internal Server Error');
      }
      next();
    });
  }
  next();
});

// Headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader("X-Powered-By", `1st Gen Prism (${PLATFORM_CODENAME} ${VERSION})`);
  res.setHeader("X-Heliactyl", `prism v${VERSION} - "${PLATFORM_CODENAME}"`);
  res.setHeader("X-Prism", `v${VERSION} - "${PLATFORM_CODENAME}"`);
  next();
});

const moduleExports = {
  app,
  db,
};

module.exports = moduleExports;

global.__rootdir = __dirname;
(async () => {
  const apifiles = fs.readdirSync("./modules")
    .filter(file => file.endsWith(".js"));

  for (const file of apifiles) {
    try {
      const moduleFile = require(`./modules/${file}`);
      if (moduleFile.load && moduleFile.PrismModule) {
        await moduleFile.load(app, db);
        //console.log(`Loaded module: ${file}`);
      }
    } catch (error) {
      console.error(`Error loading module ${file}:`, error);
    }
  }

  // Serve assets under the /assets/* route
  app.use('/assets', express.static(path.join(__dirname, 'assets')));

  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/app/')) return next();
    if (req.path.startsWith('/assets/')) return next();
    const appPath = '/app' + req.path;
    const fullPath = appPath + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
    
    res.redirect(301, fullPath);
  });

  const server = app.listen(settings.website.port, () => {
    const bootTime = process.hrtime(startTime);
    const bootTimeMs = (bootTime[0] * 1000 + bootTime[1] / 1000000).toFixed(2);
    console.log(`Systems operational - booted in ${bootTimeMs > 1000 ? (bootTimeMs/1000).toFixed(2) + 's' : bootTimeMs + 'ms'}`);
  });

  // Store it globally for access during reboot
  global.server = server;
})();

// Error handling
process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);