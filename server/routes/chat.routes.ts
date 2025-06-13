import { Router } from 'express';
import { storage } from '../storage';
import * as schemaShared from '../../shared/schema';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken } from '../middleware/auth.middleware';
import type { AuthenticatedRequest } from '../types/request';
import { handleMCPConversation } from '../mcp_handler';
import { setupMulter } from "../multer.config";
import { UPLOADS_PATH, APP_BASE_URL } from '../config';
import path from "path";

const router = Router();
const { mcpAttachmentUpload } = setupMulter(UPLOADS_PATH);
const UPLOADS_DIR_NAME = path.basename(UPLOADS_PATH);

// Todas as rotas aqui são protegidas
router.use(authenticateToken);

// --- Rotas do MCP (Ubie / Marketing Co-Pilot) ---

router.post('/mcp/converse', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { message, sessionId, attachmentUrl } = req.body;
    const payload = await handleMCPConversation(req.user!.id, message, sessionId, attachmentUrl);
    res.json(payload);
}));

router.post('/mcp/upload-attachment', mcpAttachmentUpload.single('attachment'), asyncHandler((req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }
    const publicUrl = `${APP_BASE_URL}/${UPLOADS_DIR_NAME}/mcp-attachments/${req.file.filename}`;
    res.status(200).json({ url: publicUrl });
}));

// --- Rotas de Sessões de Chat ---

router.get('/chat/sessions', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const sessions = await storage.getChatSessions(req.user!.id);
    res.json(sessions);
}));

router.post('/chat/sessions', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = schemaShared.insertChatSessionSchema.parse(req.body);
    const newSession = await storage.createChatSession(req.user!.id, data.title);
    res.status(201).json(newSession);
}));

router.get('/chat/sessions/:sessionId/messages', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const messages = await storage.getChatMessages(parseInt(req.params.sessionId), req.user!.id);
    res.json(messages);
}));

router.put('/chat/sessions/:sessionId/title', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const updated = await storage.updateChatSessionTitle(parseInt(req.params.sessionId), req.user!.id, req.body.title);
    res.json(updated);
}));

router.delete('/chat/sessions/:sessionId', asyncHandler(async (req: AuthenticatedRequest, res) => {
    await storage.deleteChatSession(parseInt(req.params.sessionId), req.user!.id);
    res.status(204).send();
}));

export default router;
