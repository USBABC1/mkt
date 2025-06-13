// server/api/campaigns.routes.ts
import express from 'express';
import { campaignsStorage } from './campaigns.storage';
import * as schemaShared from '../../shared/schema';
import type { AuthenticatedRequest } from '../routes';

export const campaignsRouter = express.Router();
export const tasksRouter = express.Router();

// --- Rotas de Campanhas ---
campaignsRouter.get('/', async (req: AuthenticatedRequest, res, next) => {
    try {
        res.json(await campaignsStorage.getCampaigns(req.user!.id));
    } catch (e) {
        next(e);
    }
});

campaignsRouter.post('/', async (req: AuthenticatedRequest, res, next) => {
    try {
        const data = schemaShared.insertCampaignSchema.parse(req.body);
        res.status(201).json(await campaignsStorage.createCampaign({ ...data, userId: req.user!.id }));
    } catch (e) {
        next(e);
    }
});

campaignsRouter.get('/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
        const campaign = await campaignsStorage.getCampaignWithDetails(parseInt(req.params.id), req.user!.id);
        if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada.' });
        res.json(campaign);
    } catch (e) {
        next(e);
    }
});

campaignsRouter.put('/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
        const data = schemaShared.insertCampaignSchema.partial().parse(req.body);
        const updated = await campaignsStorage.updateCampaign(parseInt(req.params.id), req.user!.id, data);
        if (!updated) return res.status(404).json({ error: "Campanha não encontrada." });
        res.json(updated);
    } catch (e) {
        next(e);
    }
});

campaignsRouter.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
        await campaignsStorage.deleteCampaign(parseInt(req.params.id), req.user!.id);
        res.status(204).send();
    } catch (e) {
        next(e);
    }
});

campaignsRouter.post('/from-template/:templateId', async (req: AuthenticatedRequest, res, next) => {
    try {
        const templateId = parseInt(req.params.templateId, 10);
        const data = schemaShared.insertCampaignSchema.parse(req.body);
        const newCampaign = await campaignsStorage.createCampaignFromTemplate({ ...data, userId: req.user!.id }, templateId);
        res.status(201).json(newCampaign);
    } catch (e) {
        next(e);
    }
});

// --- Rota de Tarefas aninhada em Campanhas ---
campaignsRouter.post('/:campaignId/tasks', async (req: AuthenticatedRequest, res, next) => {
    try {
        const data = schemaShared.insertCampaignTaskSchema.parse(req.body);
        const task = await campaignsStorage.createTask(data);
        res.status(201).json(task);
    } catch (e) {
        next(e);
    }
});

// --- Rotas de Tarefas (nível superior) ---
tasksRouter.put('/:taskId', async (req: AuthenticatedRequest, res, next) => {
    try {
        const taskId = parseInt(req.params.taskId, 10);
        const data = schemaShared.insertCampaignTaskSchema.partial().parse(req.body);
        const task = await campaignsStorage.updateTask(taskId, data);
        res.json(task);
    } catch (e) {
        next(e);
    }
});

tasksRouter.delete('/:taskId', async (req: AuthenticatedRequest, res, next) => {
    try {
        const taskId = parseInt(req.params.taskId, 10);
        await campaignsStorage.deleteTask(taskId);
        res.status(204).send();
    } catch (e) {
        next(e);
    }
});
