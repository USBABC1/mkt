import { Router } from 'express';
import { storage } from '../storage';
import * as schemaShared from '../../shared/schema';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken } from '../middleware/auth.middleware';
import type { AuthenticatedRequest } from '../types/request';

const router = Router();

// Todas as rotas neste arquivo exigem autenticação.
// Ao colocar o middleware no início do arquivo, ele se aplica a todas as rotas definidas abaixo.
router.use(authenticateToken);

// --- Rotas de Campanhas (Campaigns) ---

router.get('/campaigns', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const campaigns = await storage.getCampaigns(req.user!.id);
    res.json(campaigns);
}));

router.post('/campaigns', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = schemaShared.insertCampaignSchema.parse(req.body);
    const newCampaign = await storage.createCampaign({ ...data, userId: req.user!.id });
    res.status(201).json(newCampaign);
}));

router.get('/campaigns/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const campaign = await storage.getCampaignWithDetails(parseInt(req.params.id), req.user!.id);
    if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada.' });
    }
    res.json(campaign);
}));

router.put('/campaigns/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = schemaShared.insertCampaignSchema.partial().parse(req.body);
    const updated = await storage.updateCampaign(parseInt(req.params.id), req.user!.id, data);
    if (!updated) {
        return res.status(404).json({ error: "Campanha não encontrada." });
    }
    res.json(updated);
}));

router.delete('/campaigns/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
    await storage.deleteCampaign(parseInt(req.params.id), req.user!.id);
    res.status(204).send();
}));

router.post('/campaigns/from-template/:templateId', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const templateId = parseInt(req.params.templateId, 10);
    const data = schemaShared.insertCampaignSchema.parse(req.body);
    const newCampaign = await storage.createCampaignFromTemplate({ ...data, userId: req.user!.id }, templateId);
    res.status(201).json(newCampaign);
}));

// --- Rotas de Tarefas (Tasks) ---

router.post('/campaigns/:campaignId/tasks', asyncHandler(async (req, res) => {
    // Validação pode ser adicionada aqui para garantir que campaignId é um número
    const data = schemaShared.insertCampaignTaskSchema.parse(req.body);
    const task = await storage.createTask(data);
    res.status(201).json(task);
}));

router.put('/tasks/:taskId', asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.taskId, 10);
    const data = schemaShared.insertCampaignTaskSchema.partial().parse(req.body);
    const task = await storage.updateTask(taskId, data);
    res.json(task);
}));

router.delete('/tasks/:taskId', asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.taskId, 10);
    await storage.deleteTask(taskId);
    res.status(204).send();
}));

export default router;
