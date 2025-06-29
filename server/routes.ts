// server/routes.ts
import type { Express, Request, Response, NextFunction, ErrorRequestHandler } from "express";
import express from "express";
import { createServer, type Server as HttpServer } from "http";
import { storage } from "./storage";
import jwt from 'jsonwebtoken';
import * as schemaShared from "../shared/schema";
import { ZodError } from "zod";
import { OAuth2Client } from 'google-auth-library';
import { JWT_SECRET, UPLOADS_PATH, APP_BASE_URL, GOOGLE_CLIENT_ID } from './config';
import { handleMCPConversation } from "./mcp_handler";
import { googleDriveService } from './services/google-drive.service';
import { setupMulter } from "./multer.config";
import path from "path";
import fs from "fs";
import axios from "axios";
import { whatsappRouter } from './api/whatsapp.routes';
import { publicLpRouter, protectedLpRouter, setupLpAssetUpload } from './api/landingpages.routes';
import { campaignsRouter, tasksRouter } from "./api/campaigns.routes"; // ✅ IMPORTAÇÃO DAS NOVAS ROTAS

export interface AuthenticatedRequest extends Request {
  user?: schemaShared.User;
}

async function doRegisterRoutes(app: Express): Promise<HttpServer> {
    const { creativesUpload, lpAssetUpload, mcpAttachmentUpload } = setupMulter(UPLOADS_PATH);
    const UPLOADS_DIR_NAME = path.basename(UPLOADS_PATH);
    const CREATIVES_ASSETS_DIR = path.join(UPLOADS_PATH, 'creatives-assets');

    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    const publicRouter = express.Router();
    const apiRouter = express.Router();
    const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
    
    setupLpAssetUpload(lpAssetUpload);
    
    const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (process.env.FORCE_AUTH_BYPASS === 'true') {
            const user = await storage.getUser(1);
            if (!user) {
              const bypassUser = await storage.createUser({ username: 'admin_bypass', email: 'admin@example.com', password: 'password' });
              req.user = bypassUser;
              return next();
            }
            req.user = user;
            return next();
        }
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Token não fornecido.' });
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
            const user = await storage.getUser(decoded.userId);
            if (!user) return res.status(401).json({ error: 'Usuário não encontrado.' });
            req.user = user;
            next();
        } catch (error) {
            return res.status(403).json({ error: 'Token inválido ou expirado.' });
        }
    };

    const handleZodError: ErrorRequestHandler = (err, req, res, next) => {
      if (err instanceof ZodError) return res.status(400).json({ error: "Erro de validação.", details: err.errors });
      next(err);
    };
    const handleError: ErrorRequestHandler = (err, req, res, next) => {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message || "Erro interno do servidor." });
    };

    // --- ROTAS PÚBLICAS E DE AUTENTICAÇÃO ---
    publicRouter.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
    publicRouter.post('/auth/register', async (req, res, next) => {
      try {
        const data = schemaShared.insertUserSchema.parse(req.body);
        if (await storage.getUserByEmail(data.email)) {
          return res.status(409).json({ error: 'Email já cadastrado.' });
        }
        const user = await storage.createUser(data);
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ user: { id: user.id, username: user.username, email: user.email }, token });
      } catch (e) {
        next(e);
      }
    });
    publicRouter.post('/auth/login', async (req, res, next) => {
      try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
        const user = await storage.getUserByEmail(email);
        if (!user || !user.password) return res.status(401).json({ error: 'Credenciais inválidas.' });
        if (!await storage.validatePassword(password, user.password)) return res.status(401).json({ error: 'Credenciais inválidas.' });
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
      } catch (e) {
        next(e);
      }
    });
    publicRouter.post('/auth/google', async (req, res, next) => {
      try {
        const { credential } = req.body;
        if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: "Google Client ID não configurado." });
        const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        if (!payload?.email || !payload.name) return res.status(400).json({ error: 'Payload do Google inválido.' });
        let user = await storage.getUserByEmail(payload.email) || await storage.createUser({ email: payload.email, username: payload.name });
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
      } catch (error) {
        next(new Error("Falha na autenticação com Google."));
      }
    });
    
    publicRouter.use('/landingpages', publicLpRouter);

    // --- ROTAS PROTEGIDAS ---
    apiRouter.use(authenticateToken);
    
    // ✅ REGISTRO DOS MÓDULOS DE ROTAS
    apiRouter.use('/whatsapp', whatsappRouter);
    apiRouter.use('/landingpages', protectedLpRouter);
    apiRouter.use('/campaigns', campaignsRouter);
    apiRouter.use('/tasks', tasksRouter);
    
    apiRouter.get('/users', async (req: AuthenticatedRequest, res, next) => { try { res.json(await storage.getAllUsers()); } catch(e) { next(e); }});
    apiRouter.get('/dashboard', async (req: AuthenticatedRequest, res, next) => { try { const timeRange = req.query.timeRange as string | undefined; res.json(await storage.getDashboardData(req.user!.id, timeRange)); } catch (e) { next(e); }});
    
    // Rota de Criativos
    apiRouter.get('/creatives', async (req: AuthenticatedRequest, res, next) => { try { const campaignIdQuery = req.query.campaignId as string; const campaignId = campaignIdQuery === 'null' ? null : (campaignIdQuery ? parseInt(campaignIdQuery) : undefined); res.json(await storage.getCreatives(req.user!.id, campaignId)); } catch (e) { next(e); }});
    apiRouter.post('/creatives', creativesUpload.single('file'), async (req: AuthenticatedRequest, res, next) => { try { const data = schemaShared.insertCreativeSchema.parse(req.body); if (req.file) { data.fileUrl = `${APP_BASE_URL}/${UPLOADS_DIR_NAME}/creatives-assets/${req.file.filename}`; data.thumbnailUrl = data.fileUrl; } const creative = await storage.createCreative({ ...data, userId: req.user!.id }); res.status(201).json(creative); } catch (e) { next(e); } });
    apiRouter.put('/creatives/:id', creativesUpload.single('file'), async (req: AuthenticatedRequest, res, next) => { try { const id = parseInt(req.params.id); const userId = req.user!.id; const existingCreative = await storage.getCreative(id, userId); if (!existingCreative) return res.status(404).json({ error: "Criativo não encontrado." }); let updateData = schemaShared.insertCreativeSchema.partial().parse(req.body); if (req.file) { updateData.fileUrl = `${APP_BASE_URL}/${UPLOADS_DIR_NAME}/creatives-assets/${req.file.filename}`; } const updated = await storage.updateCreative(id, updateData, userId); res.json(updated); } catch(e) { next(e); }});
    apiRouter.delete('/creatives/:id', async (req: AuthenticatedRequest, res, next) => { try { await storage.deleteCreative(parseInt(req.params.id), req.user!.id); res.status(204).send(); } catch (e) { next(e); } });
    apiRouter.get('/creatives/from-drive/:folderId', async (req: AuthenticatedRequest, res, next) => { try { const files = await googleDriveService.listFilesFromFolder(req.params.folderId); res.json(files); } catch (error: any) { next(error); }});
    apiRouter.post('/creatives/import-from-drive', async (req: AuthenticatedRequest, res, next) => { try { const { campaignId, files } = req.body; if (!campaignId || !Array.isArray(files)) return res.status(400).json({ error: 'ID da campanha e lista de arquivos são obrigatórios.' }); const createdCreatives = []; for (const file of files) { if (!file.webContentLink) continue; const response = await axios({ method: 'get', url: file.webContentLink, responseType: 'stream' }); const newFilename = `gdrive-${Date.now()}${path.extname(file.name || '.jpg')}`; const localFilePath = path.join(CREATIVES_ASSETS_DIR, newFilename); const publicFileUrl = `${APP_BASE_URL}/${UPLOADS_DIR_NAME}/creatives-assets/${newFilename}`; response.data.pipe(fs.createWriteStream(localFilePath)); await new Promise((resolve, reject) => response.data.on('end', resolve).on('error', reject)); const type = file.mimeType?.startsWith('video') ? 'video' : 'image'; const data = schemaShared.insertCreativeSchema.parse({ campaignId, name: file.name, type, fileUrl: publicFileUrl, thumbnailUrl: file.thumbnailLink, status: 'pending' }); createdCreatives.push(await storage.createCreative({ ...data, userId: req.user!.id })); } res.status(201).json({ message: `${createdCreatives.length} criativo(s) importado(s).`, data: createdCreatives }); } catch (error) { next(error); }});
    
    // Rota de Copies
    apiRouter.get('/copies', async (req: AuthenticatedRequest, res, next) => { try { const { campaignId, phase, purpose, search } = req.query; res.json(await storage.getCopies(req.user!.id, campaignId ? Number(campaignId) : undefined, phase as string, purpose as string, search as string)); } catch (e) { next(e); } });
    apiRouter.post('/copies', async (req: AuthenticatedRequest, res, next) => { try { const data = schemaShared.insertCopySchema.parse(req.body); res.status(201).json(await storage.createCopy({ ...data, userId: req.user!.id })); } catch (e) { next(e); } });
    apiRouter.delete('/copies/:id', async (req: AuthenticatedRequest, res, next) => { try { await storage.deleteCopy(parseInt(req.params.id), req.user!.id); res.status(204).send(); } catch (e) { next(e); }});

    // Rotas de Funil
    apiRouter.get('/funnels', async (req: AuthenticatedRequest, res, next) => { try { const campaignIdQuery = req.query.campaignId as string | undefined; const campaignId = campaignIdQuery === 'null' ? null : (campaignIdQuery ? parseInt(campaignIdQuery) : undefined); res.json(await storage.getFunnels(req.user!.id, campaignId)); } catch (e) { next(e); }});
    apiRouter.get('/funnels/:id', async (req: AuthenticatedRequest, res, next) => { try { const funnel = await storage.getFunnel(parseInt(req.params.id), req.user!.id); if (!funnel) return res.status(404).json({ error: 'Funil não encontrado.'}); res.json(funnel); } catch(e) { next(e); }});
    apiRouter.post('/funnels', async (req: AuthenticatedRequest, res, next) => { try { const data = schemaShared.insertFunnelSchema.parse(req.body); const newFunnel = await storage.createFunnel(data, req.user!.id); res.status(201).json(newFunnel); } catch (e) { next(e); } });
    apiRouter.put('/funnels/:id', async (req: AuthenticatedRequest, res, next) => { try { const data = schemaShared.insertFunnelSchema.partial().parse(req.body); const updated = await storage.updateFunnel(parseInt(req.params.id), data, req.user!.id); if (!updated) return res.status(404).json({ error: "Funil não encontrado."}); res.json(updated); } catch (e) { next(e); } });
    apiRouter.delete('/funnels/:id', async (req: AuthenticatedRequest, res, next) => { try { await storage.deleteFunnel(parseInt(req.params.id), req.user!.id); res.status(204).send(); } catch (e) { next(e); } });
    apiRouter.post('/funnels/:funnelId/stages', async (req: AuthenticatedRequest, res, next) => { try { const funnel = await storage.getFunnel(parseInt(req.params.funnelId), req.user!.id); if (!funnel) return res.status(404).json({ error: "Funil não encontrado." }); const data = schemaShared.insertFunnelStageSchema.parse({ ...req.body, funnelId: funnel.id }); const newStage = await storage.createFunnelStage(data); res.status(201).json(newStage); } catch(e) { next(e); }});
    
    // Rotas do MCP (ubie)
    apiRouter.post('/mcp/converse', async (req: AuthenticatedRequest, res, next) => { try { const { message, sessionId, attachmentUrl } = req.body; const payload = await handleMCPConversation(req.user!.id, message, sessionId, attachmentUrl); res.json(payload); } catch(e) { next(e); }});
    apiRouter.post('/mcp/upload-attachment', mcpAttachmentUpload.single('attachment'), (req: AuthenticatedRequest, res, next) => { try { if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." }); const publicUrl = `${APP_BASE_URL}/${UPLOADS_DIR_NAME}/mcp-attachments/${req.file.filename}`; res.status(200).json({ url: publicUrl }); } catch (e) { next(e); } });
    
    // Rotas de Sessões de Chat
    apiRouter.get('/chat/sessions', async (req: AuthenticatedRequest, res, next) => { try { res.json(await storage.getChatSessions(req.user!.id)); } catch(e){ next(e); }});
    apiRouter.post('/chat/sessions', async (req: AuthenticatedRequest, res, next) => { try { const data = schemaShared.insertChatSessionSchema.parse(req.body); res.status(201).json(await storage.createChatSession(req.user!.id, data.title)); } catch(e){ next(e); }});
    apiRouter.get('/chat/sessions/:sessionId/messages', async (req: AuthenticatedRequest, res, next) => { try { res.json(await storage.getChatMessages(parseInt(req.params.sessionId), req.user!.id)); } catch(e){ next(e); }});
    apiRouter.put('/chat/sessions/:sessionId/title', async (req: AuthenticatedRequest, res, next) => { try { const updated = await storage.updateChatSessionTitle(parseInt(req.params.sessionId), req.user!.id, req.body.title); res.json(updated); } catch(e){ next(e); }});
    apiRouter.delete('/chat/sessions/:sessionId', async (req: AuthenticatedRequest, res, next) => { try { await storage.deleteChatSession(parseInt(req.params.sessionId), req.user!.id); res.status(204).send(); } catch(e){ next(e); }});
    
    // Rotas de Alertas
    apiRouter.get('/alerts', async (req: AuthenticatedRequest, res, next) => { try { const onlyUnread = req.query.unread === 'true'; res.json(await storage.getAlerts(req.user!.id, onlyUnread)); } catch (e) { next(e); } });
    apiRouter.put('/alerts/:id/read', async (req: AuthenticatedRequest, res, next) => { try { const alert = await storage.markAlertAsRead(parseInt(req.params.id), req.user!.id); res.json(alert); } catch (e) { next(e); } });
    apiRouter.patch('/alerts/read-all', async (req: AuthenticatedRequest, res, next) => { try { await storage.markAllAlertsAsRead(req.user!.id); res.status(204).send(); } catch (e) { next(e); } });
    
    // --- REGISTRO DOS ROUTERS ---
    app.use('/api', publicRouter, apiRouter);
    app.use(handleZodError);
    app.use(handleError);

    return createServer(app);
}

export const RouterSetup = {
    registerRoutes: doRegisterRoutes
};
