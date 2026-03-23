import { Router } from 'express';

/**
 * Capture routes — trigger the Raspberry Pi to take photos.
 * POST /api/capture  – trigger a capture session
 *
 * The Pi is accessible via Cloudflare Tunnel at a configured hostname.
 */
export function createCaptureRoutes({ requireAuth }) {
  const router = Router();

  router.post('/api/capture', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    // TODO: Call Pi HTTP API via Cloudflare Tunnel
    // 1. POST pi.romaine.life/servo/move
    // 2. POST pi.romaine.life/camera/capture
    // 3. GET  pi.romaine.life/camera/last → JPEG bytes
    // 4. Upload to blob storage
    res.status(501).json({ error: 'Not yet implemented' });
  });

  return router;
}
