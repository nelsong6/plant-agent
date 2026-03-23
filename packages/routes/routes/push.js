import { Router } from 'express';
import crypto from 'crypto';

/**
 * Push subscription routes — manage Web Push subscriptions per user.
 *
 * GET    /api/push/vapid-key  – public VAPID key (no auth)
 * POST   /api/push/subscribe  – register a push subscription
 * DELETE /api/push/subscribe  – remove a push subscription
 */

export function createPushRoutes({ pushSubscriptionsContainer, requireAuth, vapidPublicKey }) {
  const router = Router();

  router.get('/api/push/vapid-key', (req, res) => {
    if (!vapidPublicKey) {
      return res.status(503).json({ error: 'Push notifications are not configured' });
    }
    res.json({ publicKey: vapidPublicKey });
  });

  router.post('/api/push/subscribe', requireAuth, async (req, res) => {
    try {
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: 'Invalid subscription: endpoint and keys (p256dh, auth) are required' });
      }

      const subscription = {
        id: crypto.randomUUID(),
        userId: req.user.sub,
        endpoint,
        keys,
        createdAt: new Date().toISOString(),
      };

      // Upsert by endpoint — check if this endpoint already exists for this user
      const { resources: existing } = await pushSubscriptionsContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.userId = @userId AND c.endpoint = @endpoint',
          parameters: [
            { name: '@userId', value: req.user.sub },
            { name: '@endpoint', value: endpoint },
          ],
        })
        .fetchAll();

      if (existing.length > 0) {
        // Update existing subscription (keys may have rotated)
        const doc = existing[0];
        doc.keys = keys;
        doc.createdAt = subscription.createdAt;
        await pushSubscriptionsContainer.item(doc.id, doc.userId).replace(doc);
      } else {
        await pushSubscriptionsContainer.items.create(subscription);
      }

      res.status(201).json({ ok: true });
    } catch (error) {
      console.error('Error saving push subscription:', error);
      res.status(500).json({ error: 'Failed to save subscription' });
    }
  });

  router.delete('/api/push/subscribe', requireAuth, async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: 'endpoint is required' });
      }

      const { resources: existing } = await pushSubscriptionsContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.userId = @userId AND c.endpoint = @endpoint',
          parameters: [
            { name: '@userId', value: req.user.sub },
            { name: '@endpoint', value: endpoint },
          ],
        })
        .fetchAll();

      for (const doc of existing) {
        await pushSubscriptionsContainer.item(doc.id, doc.userId).delete();
      }

      res.json({ ok: true });
    } catch (error) {
      console.error('Error removing push subscription:', error);
      res.status(500).json({ error: 'Failed to remove subscription' });
    }
  });

  return router;
}
