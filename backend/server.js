// Per-app backend for plants.romaine.life. Serves the Vite-built React
// frontend, the plant-agent route package, and Microsoft OAuth on the same
// origin. Replaces the shared `api` mount at /plant.
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import {
  createPlantRoutes,
  createEventRoutes,
  createPhotoRoutes,
  createCaptureRoutes,
  createAnalysisRoutes,
  createTaskRoutes,
  createChatRoutes,
  createPushRoutes,
  createNotifyRoutes,
} from './routes/index.js';
import { createRequireAuth } from './auth.js';
import { createMicrosoftRoutes } from './microsoft-routes.js';
import { fetchConfig } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'dist');

const app = express();
const PORT = process.env.PORT || 3000;
let serverReady = false;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
// multer inside the routes package handles multipart; everything else is JSON.
app.use(express.json({ limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(morgan('combined'));

app.use((req, res, next) => {
  if (serverReady || req.path === '/health') return next();
  res.status(503).json({ error: 'Starting' });
});

app.get('/health', (req, res) => {
  if (!serverReady) return res.status(503).json({ status: 'starting' });
  res.json({ status: 'healthy' });
});

async function start() {
  const config = await fetchConfig();

  const credential = new DefaultAzureCredential();
  const cosmosClient = new CosmosClient({
    endpoint: config.cosmosDbEndpoint,
    aadCredentials: credential,
  });

  // plant-agent uses 5 containers in PlantAgentDB. Account records for MS
  // OIDC → JWT exchange still go to the shared WorkoutTrackerDB/workouts.
  const plantDb = cosmosClient.database('PlantAgentDB');
  const plantsContainer = plantDb.container('plants');
  const eventsContainer = plantDb.container('events');
  const analysesContainer = plantDb.container('analyses');
  const chatsContainer = plantDb.container('chats');
  const pushSubscriptionsContainer = plantDb.container('push-subscriptions');
  const accountContainer = cosmosClient.database('WorkoutTrackerDB').container('workouts');

  const requireAuth = createRequireAuth({ jwtSecret: config.jwtSigningSecret });
  const msAuth = createMicrosoftRoutes({
    jwtSecret: config.jwtSigningSecret,
    microsoftClientIds: config.microsoftClientIds,
    accountContainer,
  });

  app.use(msAuth);
  app.use(createPlantRoutes({
    plantsContainer,
    requireAuth,
    anthropicApiKey: config.anthropicApiKey,
    storageAccountEndpoint: config.storageAccountEndpoint,
  }));
  app.use(createEventRoutes({ eventsContainer, requireAuth }));
  app.use(createPhotoRoutes({
    requireAuth,
    storageAccountEndpoint: config.storageAccountEndpoint,
    plantsContainer,
  }));
  app.use(createCaptureRoutes({ requireAuth }));
  app.use(createAnalysisRoutes({ analysesContainer, requireAuth }));
  app.use(createTaskRoutes({ plantsContainer, eventsContainer, requireAuth }));
  app.use(createChatRoutes({
    plantsContainer,
    eventsContainer,
    chatsContainer,
    requireAuth,
    anthropicApiKey: config.anthropicApiKey,
    storageAccountEndpoint: config.storageAccountEndpoint,
  }));
  app.use(createPushRoutes({
    pushSubscriptionsContainer,
    requireAuth,
    vapidPublicKey: config.vapidPublicKey,
  }));
  app.use(createNotifyRoutes({
    pushSubscriptionsContainer,
    plantsContainer,
    eventsContainer,
    anthropicApiKey: config.anthropicApiKey,
    vapidPublicKey: config.vapidPublicKey,
    vapidPrivateKey: config.vapidPrivateKey,
    notifyApiKey: config.notifyApiKey,
  }));

  app.use(express.static(FRONTEND_DIR));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });

  serverReady = true;
  console.log(`[plant-agent] ready on port ${PORT}`);
}

app.listen(PORT, () => {
  start().catch((err) => {
    console.error('[plant-agent] fatal startup error:', err);
    process.exit(1);
  });
});

export default app;
