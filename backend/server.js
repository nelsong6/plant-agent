import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { createRequireAuth } from './middleware/auth.js';
import { fetchAppConfig } from './startup/appConfig.js';
import { createMicrosoftRoutes } from './auth/microsoft-routes.js';
import { createPlantRoutes } from './routes/plants.js';
import { createEventRoutes } from './routes/events.js';
import { createPhotoRoutes } from './routes/photos.js';
import { createCaptureRoutes } from './routes/capture.js';
import { createAnalysisRoutes } from './routes/analysis.js';
import { createTaskRoutes } from './routes/tasks.js';
import { createChatRoutes } from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 3000;
let serverReady = false;

// Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('combined'));

// Gate requests until async init completes
app.use((req, res, next) => {
  if (serverReady) return next();
  res.status(503).json({ error: 'Server is starting up, please retry shortly.' });
});

async function startServer() {
  const config = await fetchAppConfig();

  const requireAuth = createRequireAuth({ jwtSecret: config.jwtSigningSecret });

  // Initialize Cosmos DB
  const DATABASE_NAME = 'PlantAgentDB';
  const credential = new DefaultAzureCredential();
  const cosmosClient = new CosmosClient({
    endpoint: config.cosmosDbEndpoint,
    aadCredentials: credential,
  });

  const database = cosmosClient.database(DATABASE_NAME);
  const plantsContainer = database.container('plants');
  const eventsContainer = database.container('events');
  const analysesContainer = database.container('analyses');
  console.log('Connected to Cosmos DB');

  // Auth routes
  app.use(createMicrosoftRoutes({ jwtSecret: config.jwtSigningSecret, microsoftClientId: config.microsoftClientId, container: plantsContainer }));

  // Health
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use(createPlantRoutes({ plantsContainer, requireAuth, anthropicApiKey: config.anthropicApiKey, storageAccountEndpoint: config.storageAccountEndpoint }));
  app.use(createEventRoutes({ eventsContainer, requireAuth }));
  app.use(createPhotoRoutes({ requireAuth, storageAccountEndpoint: config.storageAccountEndpoint, plantsContainer }));
  app.use(createCaptureRoutes({ requireAuth }));
  app.use(createAnalysisRoutes({ analysesContainer, requireAuth }));
  app.use(createTaskRoutes({ plantsContainer, eventsContainer, requireAuth }));
  app.use(createChatRoutes({ plantsContainer, eventsContainer, requireAuth, anthropicApiKey: config.anthropicApiKey }));

  // 404
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  serverReady = true;
  console.log('Server ready');
}

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}, initializing...`);
});

startServer().catch((error) => {
  console.error('Fatal startup error:', error);
  process.exit(1);
});

export default app;
