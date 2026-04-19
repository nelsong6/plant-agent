import { Router } from 'express';
import webpush from 'web-push';
import Anthropic from '@anthropic-ai/sdk';
import { computeTasks } from '../lib/computeTasks.js';

/**
 * Notification dispatch route — triggered by GitHub Actions daily cron.
 * POST /api/notifications/dispatch  – compute tasks, generate AI summary, send push
 *
 * Authenticated via X-API-Key header (not JWT).
 */

export function createNotifyRoutes({
  pushSubscriptionsContainer,
  plantsContainer,
  eventsContainer,
  anthropicApiKey,
  vapidPublicKey,
  vapidPrivateKey,
  notifyApiKey,
}) {
  const router = Router();

  // Configure web-push if VAPID keys are available
  if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
      'mailto:nelson-devops-project@outlook.com',
      vapidPublicKey,
      vapidPrivateKey,
    );
  }

  router.post('/api/notifications/dispatch', async (req, res) => {
    // API key auth
    if (!notifyApiKey || req.headers['x-api-key'] !== notifyApiKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return res.status(503).json({ error: 'Push notifications not configured — missing VAPID keys' });
    }

    try {
      // 1. Compute pending tasks
      const tasks = await computeTasks(plantsContainer, eventsContainer);

      if (tasks.length === 0) {
        return res.json({ sent: false, reason: 'no-tasks' });
      }

      // 2. Generate AI summary
      let summary = formatFallbackSummary(tasks);
      if (anthropicApiKey) {
        try {
          summary = await generateAISummary(anthropicApiKey, tasks);
        } catch (err) {
          console.error('AI summary failed, using fallback:', err.message);
        }
      }

      // 3. Fetch all push subscriptions
      const { resources: subscriptions } = await pushSubscriptionsContainer.items
        .query('SELECT * FROM c')
        .fetchAll();

      if (subscriptions.length === 0) {
        return res.json({ sent: false, reason: 'no-subscribers', taskCount: tasks.length });
      }

      // 4. Send push to each subscriber
      const payload = JSON.stringify({
        title: 'Plant Agent',
        body: summary,
        url: '/tasks',
      });

      const stale = [];
      let sentCount = 0;

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
          sentCount++;
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            stale.push(sub);
          } else {
            console.error(`Push failed for ${sub.endpoint}:`, err.message);
          }
        }
      }

      // 5. Clean up expired subscriptions
      for (const sub of stale) {
        try {
          await pushSubscriptionsContainer.item(sub.id, sub.userId).delete();
        } catch (err) {
          console.error('Failed to delete stale subscription:', err.message);
        }
      }

      res.json({ sent: true, sentCount, taskCount: tasks.length, staleRemoved: stale.length });
    } catch (error) {
      console.error('Notification dispatch error:', error);
      res.status(500).json({ error: 'Failed to dispatch notifications' });
    }
  });

  return router;
}

async function generateAISummary(apiKey, tasks) {
  const client = new Anthropic({ apiKey });

  const taskList = tasks.map((t) => {
    const ago = t.daysSinceLast !== null ? `${t.daysSinceLast}d ago` : 'never';
    return `- ${t.plantName} (${t.room}): ${t.action} — last: ${ago}, urgency: ${t.urgency}`;
  }).join('\n');

  const response = await client.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 256,
    system: `You are Plant Agent, a friendly plant care assistant. Write a short push notification summary (1-2 sentences, under 200 characters) of today's plant care agenda. Be conversational and opinionated — you have strong feelings about plant care. Don't use emoji.`,
    messages: [{
      role: 'user',
      content: `Here are today's pending plant care tasks:\n\n${taskList}\n\nWrite a brief, opinionated notification message.`,
    }],
  });

  return response.content[0].text;
}

function formatFallbackSummary(tasks) {
  const high = tasks.filter((t) => t.urgency === 'high');
  if (high.length > 0) {
    return `${high.length} urgent task${high.length > 1 ? 's' : ''} — ${high[0].plantName} needs ${high[0].action}.`;
  }
  return `${tasks.length} plant care task${tasks.length > 1 ? 's' : ''} pending.`;
}
