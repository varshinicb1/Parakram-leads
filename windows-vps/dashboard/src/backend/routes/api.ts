import { Router, type Request, type Response } from 'express';
import { getSystemStats } from '../services/system-stats.js';
import { getServiceStatus, toggleService } from '../services/service-manager.js';

export const apiRouter = Router();

// System stats endpoint
apiRouter.get('/s', async (_req: Request, res: Response) => {
  try {
    const stats = await getSystemStats();
    res.json(stats);
  } catch (e) {
    res.json({
      m: '0/0 GB', d: '0/0 GB', u: '0d 0h 0m',
      p: 9876, bak: 'na', t: false, s: false, neb: false, c: 0, l: 'unknown',
    });
  }
});

// Service toggle
apiRouter.get('/t/:service', async (req: Request, res: Response) => {
  const name = req.params.service as string;
  const result = await toggleService(name);
  res.json(result);
});

// Service statuses
apiRouter.get('/status', async (_req: Request, res: Response) => {
  const statuses = await Promise.all(
    ['ssh', 'tun', 'neb', 'leads', 'caddy', 'restic'].map(async (name) => ({
      name,
      status: await getServiceStatus(name),
    }))
  );
  res.json(statuses);
});

// Update check
apiRouter.get('/update-check', (_req: Request, res: Response) => {
  res.json({ available: false });
});

// Heartbeat
apiRouter.get('/s/h', (_req: Request, res: Response) => {
  res.send('OK');
});
