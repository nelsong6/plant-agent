import { Router } from 'express';

/**
 * Photo routes — list photos for a plant from blob storage.
 * GET /api/plants/:plantId/photos  – list photo URLs
 *
 * Photos are stored in blob storage at: photos/{room}/{plantSlug}/{timestamp}.jpg
 * The backend returns public blob URLs (container has blob-level public access).
 */
export function createPhotoRoutes({ requireAuth, storageAccountEndpoint }) {
  const router = Router();

  router.get('/api/plants/:plantId/photos', async (req, res) => {
    // TODO: List blobs for this plant from Azure Blob Storage
    // For now, return empty array
    res.json([]);
  });

  return router;
}
