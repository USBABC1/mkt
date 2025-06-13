import { Router } from 'express';
import { storage } from '../storage';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken } from '../middleware/auth.middleware';
import type { AuthenticatedRequest } from '../types/request';

const router = Router();
router.use(authenticateToken);

// Rota para buscar todos os usuários (geralmente para admin)
router.get('/users', asyncHandler(async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
}));

// Rota para buscar dados do dashboard
router.get('/dashboard', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const timeRange = req.query.timeRange as string | undefined;
    const dashboardData = await storage.getDashboardData(req.user!.id, timeRange);
    res.json(dashboardData);
}));

export default router;
