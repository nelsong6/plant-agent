import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

const ALLOWED_EMAIL = 'fullnelsongrip@gmail.com';

/**
 * Google OAuth auth routes.
 *
 * POST /auth/google/login – verify Google ID token, issue app JWT
 */
export function createGoogleRoutes({ jwtSecret, googleClientId, container }) {
  const router = Router();
  const oauthClient = new OAuth2Client(googleClientId);

  function issueToken(user) {
    return jwt.sign(
      { sub: user.id, email: user.email, name: user.name, role: user.role },
      jwtSecret,
      { expiresIn: '7d' },
    );
  }

  router.post('/auth/google/login', async (req, res) => {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'credential required' });
    }

    try {
      const ticket = await oauthClient.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
      const payload = ticket.getPayload();

      if (payload.email !== ALLOWED_EMAIL) {
        return res.status(403).json({ error: 'Unauthorized account' });
      }

      const id = `google|${payload.sub}`;
      const account = {
        id,
        userId: id,
        type: 'account',
        provider: 'google',
        name: payload.name,
        email: payload.email,
        role: 'admin',
        updatedAt: new Date().toISOString(),
      };

      // Upsert — create on first login, update on subsequent
      await container.items.upsert(account);

      const token = issueToken(account);
      res.json({ token, user: { id, name: account.name, email: account.email, role: account.role } });
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(401).json({ error: 'Invalid Google credential' });
    }
  });

  return router;
}
