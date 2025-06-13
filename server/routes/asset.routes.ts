import { Router } from 'express';
import path from "path";
import fs from "fs";
import axios from "axios";
import { storage } from '../storage';
import * as schemaShared from '../../shared/schema';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken } from '../middleware/auth.middleware';
import type { AuthenticatedRequest } from '../types/request';
import { googleDriveService } from '../services/google-drive.service';
import { setupMulter } from "../multer.config";
import { UPLOADS_PATH, APP_BASE_URL } from '../config';

const router = Router();
const { creativesUpload } = setupMulter(UPLOADS_PATH);
const UPLOADS_DIR_NAME = path.basename(UPLOADS_PATH);
const CREATIVES_ASSETS_DIR = path.join(UPLOADS_PATH, 'creatives-assets');

// Todas as rotas neste arquivo também exigem autenticação.
router.use(authenticateToken);

// --- Rotas de Criativos (Creatives) ---

router.get('/creatives', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const campaignIdQuery = req.query.campaignId as string;
    const campaignId = campaignIdQuery === 'null' ? null : (campaignIdQuery ? parseInt(campaignIdQuery) : undefined);
    const creatives = await storage.getCreatives(req.user!.id, campaignId);
    res.json(creatives);
}));

// A rota de POST usa o middleware 'creativesUpload' para processar o upload do arquivo ANTES da lógica da rota.
router.post('/creatives', creativesUpload.single('file'), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = schemaShared.insertCreativeSchema.parse(req.body);
    if (req.file) {
        data.fileUrl = `${APP_BASE_URL}/${UPLOADS_DIR_NAME}/creatives-assets/${req.file.filename}`;
        data.thumbnailUrl = data.fileUrl; // Simplificação, pode ser melhorado
    }
    const creative = await storage.createCreative({ ...data, userId: req.user!.id });
    res.status(201).json(creative);
}));

router.put('/creatives/:id', creativesUpload.single('file'), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = parseInt(req.params.id);
    const userId = req.user!.id;

    const existingCreative = await storage.getCreative(id, userId);
    if (!existingCreative) {
        return res.status(404).json({ error: "Criativo não encontrado." });
    }

    const updateData = schemaShared.insertCreativeSchema.partial().parse(req.body);
    if (req.file) {
        updateData.fileUrl = `${APP_BASE_URL}/${UPLOADS_DIR_NAME}/creatives-assets/${req.file.filename}`;
    }
    const updated = await storage.updateCreative(id, updateData, userId);
    res.json(updated);
}));

router.delete('/creatives/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
    await storage.deleteCreative(parseInt(req.params.id), req.user!.id);
    res.status(204).send();
}));

// --- Rotas de Criativos (Google Drive) ---

router.get('/creatives/from-drive/:folderId', asyncHandler(async (req, res) => {
    const files = await googleDriveService.listFilesFromFolder(req.params.folderId);
    res.json(files);
}));

router.post('/creatives/import-from-drive', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { campaignId, files } = req.body;
    if (!campaignId || !Array.isArray(files)) {
        return res.status(400).json({ error: 'ID da campanha e lista de arquivos são obrigatórios.' });
    }

    const createdCreatives = [];
    for (const file of files) {
        if (!file.webContentLink) continue;

        const response = await axios({ method: 'get', url: file.webContentLink, responseType: 'stream' });
        const newFilename = `gdrive-${Date.now()}${path.extname(file.name || '.jpg')}`;
        const localFilePath = path.join(CREATIVES_ASSETS_DIR, newFilename);
        const publicFileUrl = `${APP_BASE_URL}/${UPLOADS_DIR_NAME}/creatives-assets/${newFilename}`;

        response.data.pipe(fs.createWriteStream(localFilePath));
        await new Promise((resolve, reject) => response.data.on('end', resolve).on('error', reject));

        const type = file.mimeType?.startsWith('video') ? 'video' : 'image';
        const data = { campaignId, name: file.name, type, fileUrl: publicFileUrl, thumbnailUrl: file.thumbnailLink, status: 'pending' };
        
        const parsedData = schemaShared.insertCreativeSchema.parse(data);
        const newCreative = await storage.createCreative({ ...parsedData, userId: req.user!.id });
        createdCreatives.push(newCreative);
    }
    res.status(201).json({ message: `${createdCreatives.length} criativo(s) importado(s).`, data: createdCreatives });
}));


// --- Rotas de Copies ---

router.get('/copies', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { campaignId, phase, purpose, search } = req.query;
    const copies = await storage.getCopies(req.user!.id, campaignId ? Number(campaignId) : undefined, phase as string, purpose as string, search as string);
    res.json(copies);
}));

router.post('/copies', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = schemaShared.insertCopySchema.parse(req.body);
    const newCopy = await storage.createCopy({ ...data, userId: req.user!.id });
    res.status(201).json(newCopy);
}));

router.delete('/copies/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
    await storage.deleteCopy(parseInt(req.params.id), req.user!.id);
    res.status(204).send();
}));

export default router;
