import { Router } from 'express';
import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const CONTAINER = 'photos';

/**
 * Photo routes.
 * GET  /api/plants/:plantId/photos  – list photo URLs
 * POST /api/plants/:plantId/photos  – upload photo (file or URL)
 */
export function createPhotoRoutes({ requireAuth, storageAccountEndpoint, plantsContainer }) {
  const router = Router();
  const blobService = new BlobServiceClient(storageAccountEndpoint, new DefaultAzureCredential());
  const containerClient = blobService.getContainerClient(CONTAINER);

  router.get('/api/plants/:plantId/photos', async (req, res) => {
    try {
      const { resource: plant } = await plantsContainer.item(req.params.plantId, req.params.plantId).read();
      if (!plant) return res.status(404).json({ error: 'Plant not found' });

      const prefix = `${plant.slug || plant.id}/`;
      const photos = [];
      for await (const blob of containerClient.listBlobsFlat({ prefix })) {
        photos.push({
          name: blob.name,
          url: `${storageAccountEndpoint}${CONTAINER}/${blob.name}`,
          createdAt: blob.properties.createdOn?.toISOString(),
        });
      }
      photos.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      res.json(photos);
    } catch (error) {
      console.error('Error listing photos:', error);
      res.status(500).json({ error: 'Failed to list photos' });
    }
  });

  router.post('/api/plants/:plantId/photos', requireAuth, upload.single('photo'), async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    try {
      const { resource: plant } = await plantsContainer.item(req.params.plantId, req.params.plantId).read();
      if (!plant) return res.status(404).json({ error: 'Plant not found' });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let buffer, contentType, ext;

      if (req.body.url) {
        // Fetch image from URL
        const response = await fetch(req.body.url);
        if (!response.ok) return res.status(400).json({ error: 'Failed to fetch image from URL' });
        contentType = response.headers.get('content-type') || 'image/jpeg';
        ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        buffer = Buffer.from(await response.arrayBuffer());
      } else if (req.file) {
        // File upload
        buffer = req.file.buffer;
        contentType = req.file.mimetype;
        ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      } else {
        return res.status(400).json({ error: 'Provide a photo file or url' });
      }

      const blobName = `${plant.slug || plant.id}/${timestamp}.${ext}`;
      const blockBlob = containerClient.getBlockBlobClient(blobName);
      await blockBlob.upload(buffer, buffer.length, {
        blobHTTPHeaders: { blobContentType: contentType },
      });

      const url = `${storageAccountEndpoint}${CONTAINER}/${blobName}`;

      // Set as plant thumbnail if not already set
      if (!plant.thumbnailUrl) {
        plant.thumbnailUrl = url;
        plant.updatedAt = new Date().toISOString();
        await plantsContainer.items.upsert(plant);
      }

      res.status(201).json({ url, name: blobName });
    } catch (error) {
      console.error('Error uploading photo:', error);
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  });

  return router;
}
