import { Router } from 'express';
import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import Anthropic from '@anthropic-ai/sdk';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const PHOTO_CONTAINER = 'photos';

/**
 * Plant CRUD routes.
 * GET    /api/plants          – list all plants
 * GET    /api/plants/:id      – get single plant
 * POST   /api/plants          – create plant (admin) — accepts optional photo, enriches with Claude vision
 * PUT    /api/plants/:id      – update plant (admin)
 * DELETE /api/plants/:id      – delete plant (admin)
 */
export function createPlantRoutes({ plantsContainer, requireAuth, anthropicApiKey, storageAccountEndpoint }) {
  const router = Router();
  const blobService = new BlobServiceClient(storageAccountEndpoint, new DefaultAzureCredential());
  const containerClient = blobService.getContainerClient(PHOTO_CONTAINER);

  router.get('/api/plants', async (req, res) => {
    try {
      const { resources } = await plantsContainer.items
        .query('SELECT * FROM c')
        .fetchAll();
      res.json(resources);
    } catch (error) {
      console.error('Error fetching plants:', error);
      res.status(500).json({ error: 'Failed to fetch plants' });
    }
  });

  router.get('/api/plants/:id', async (req, res) => {
    try {
      const { resource } = await plantsContainer.item(req.params.id, req.params.id).read();
      if (!resource) return res.status(404).json({ error: 'Plant not found' });
      res.json(resource);
    } catch (error) {
      console.error('Error fetching plant:', error);
      res.status(500).json({ error: 'Failed to fetch plant' });
    }
  });

  router.post('/api/plants', requireAuth, upload.single('photo'), async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    try {
      const body = req.body;
      const now = new Date().toISOString();
      const plant = {
        id: body.id,
        name: body.name,
        slug: body.slug,
        notes: body.notes || '',
        createdAt: now,
        updatedAt: now,
      };

      // Upload photo to blob storage if provided
      let photoUrl = null;
      let photoBase64 = null;
      let photoMediaType = null;

      if (req.file) {
        const timestamp = now.replace(/[:.]/g, '-');
        const contentType = req.file.mimetype;
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        const blobName = `${plant.slug || plant.id}/${timestamp}.${ext}`;
        const blockBlob = containerClient.getBlockBlobClient(blobName);
        await blockBlob.upload(req.file.buffer, req.file.buffer.length, {
          blobHTTPHeaders: { blobContentType: contentType },
        });
        photoUrl = `${storageAccountEndpoint}${PHOTO_CONTAINER}/${blobName}`;
        photoBase64 = req.file.buffer.toString('base64');
        photoMediaType = contentType;
      } else if (body.photoUrl) {
        const response = await fetch(body.photoUrl);
        if (!response.ok) return res.status(400).json({ error: 'Failed to fetch image from URL' });
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        const buffer = Buffer.from(await response.arrayBuffer());
        const timestamp = now.replace(/[:.]/g, '-');
        const blobName = `${plant.slug || plant.id}/${timestamp}.${ext}`;
        const blockBlob = containerClient.getBlockBlobClient(blobName);
        await blockBlob.upload(buffer, buffer.length, {
          blobHTTPHeaders: { blobContentType: contentType },
        });
        photoUrl = `${storageAccountEndpoint}${PHOTO_CONTAINER}/${blobName}`;
        photoBase64 = buffer.toString('base64');
        photoMediaType = contentType;
      }

      // Enrich with Claude — use vision if photo available, otherwise name-only
      if (anthropicApiKey && plant.name) {
        const enrichment = await enrichPlantWithClaude(anthropicApiKey, plant.name, photoBase64, photoMediaType);
        if (enrichment.species) plant.species = enrichment.species;
        if (enrichment.claudeNotes) plant.claudeNotes = enrichment.claudeNotes;
      }

      const { resource } = await plantsContainer.items.create(plant);
      res.status(201).json(resource);
    } catch (error) {
      console.error('Error creating plant:', error);
      res.status(500).json({ error: 'Failed to create plant' });
    }
  });

  router.put('/api/plants/:id', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    try {
      const plant = {
        ...req.body,
        id: req.params.id,
        updatedAt: new Date().toISOString(),
      };
      const { resource } = await plantsContainer.items.upsert(plant);
      res.json(resource);
    } catch (error) {
      console.error('Error updating plant:', error);
      res.status(500).json({ error: 'Failed to update plant' });
    }
  });

  router.delete('/api/plants/:id', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    try {
      await plantsContainer.item(req.params.id, req.params.id).delete();
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting plant:', error);
      res.status(500).json({ error: 'Failed to delete plant' });
    }
  });

  return router;
}

async function enrichPlantWithClaude(apiKey, plantName, photoBase64, photoMediaType) {
  const client = new Anthropic({ apiKey });

  const prompt = `I'm adding a houseplant to my plant care app. The user called it "${plantName}". ${photoBase64 ? 'I\'ve attached a photo of the plant — use it to identify the species and assess its condition.' : ''} Reply in JSON only, no markdown fences:
{
  "species": "the botanical/scientific name (e.g. Ficus elastica)",
  "claudeNotes": "2-3 sentences: what this plant is, key care tips (light, water, humidity), and what a healthy one typically looks like. Be concise and practical."
}
If you're not sure of the exact species, give your best guess. Focus on the most common variety sold as a houseplant.`;

  const content = [];
  if (photoBase64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: photoMediaType, data: photoBase64 },
    });
  }
  content.push({ type: 'text', text: prompt });

  const msg = await client.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 500,
    messages: [{ role: 'user', content }],
  });

  const text = msg.content[0]?.text?.trim();
  return JSON.parse(text);
}
