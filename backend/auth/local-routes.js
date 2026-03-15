import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

/**
 * Local username/password auth routes.
 *
 * POST /auth/local/login    – login with username + password
 * POST /auth/local/register – create account (admin only)
 */
export function createLocalRoutes({ jwtSecret, container, requireAuth }) {
  const router = Router();

  function issueToken(user) {
    return jwt.sign(
      { sub: user.id, email: user.email, name: user.name, role: user.role },
      jwtSecret,
      { expiresIn: '7d' },
    );
  }

  router.post('/auth/local/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }

    try {
      const { resources } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.type = @type AND c.username = @username',
        parameters: [
          { name: '@type', value: 'account' },
          { name: '@username', value: username },
        ],
      }).fetchAll();

      if (resources.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const account = resources[0];
      const valid = await bcrypt.compare(password, account.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = issueToken(account);
      res.json({ token, user: { id: account.id, name: account.name, email: account.email, role: account.role } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  router.post('/auth/local/register', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { username, password, name, email, role = 'member' } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'username, password, and name required' });
    }

    try {
      const id = `local|${crypto.randomUUID()}`;
      const passwordHash = await bcrypt.hash(password, 12);

      const account = {
        id,
        userId: id,
        type: 'account',
        username,
        passwordHash,
        name,
        email: email || '',
        role,
        createdAt: new Date().toISOString(),
      };

      await container.items.create(account);
      res.status(201).json({ id, name, email: account.email, role });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  return router;
}
