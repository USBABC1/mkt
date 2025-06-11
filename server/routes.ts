// server/routes.ts
import type { Express, Request, Response, NextFunction, ErrorRequestHandler } from "express";
import express from "express";
import { createServer, type Server as HttpServer } from "http";
import { storage } from "./storage";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import * as schemaShared from "../shared/schema";
import { ZodError } from "zod";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { OAuth2Client } from 'google-auth-library';
import { JWT_SECRET, GEMINI_API_KEY, UPLOADS_DIR_NAME, UPLOADS_PATH, APP_BASE_URL, GOOGLE_CLIENT_ID } from './config';
import { WhatsappConnectionService } from './services/whatsapp-connection.service';
import { handleMCPConversation } from "./mcp_handler";
import { googleDriveService } from './services/google-drive.service';

// --- Configuração de Upload ---
const LP_ASSETS_DIR = path.join(UPLOADS_PATH, 'lp-assets');
const CREATIVES_ASSETS_DIR = path.join(UPLOADS_PATH, 'creatives-assets');
const MCP_ATTACHMENTS_DIR = path.join(UPLOADS_PATH, 'mcp-attachments');

[LP_ASSETS_DIR, CREATIVES_ASSETS_DIR, MCP_ATTACHMENTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const creativesUpload = multer({ storage: multer.diskStorage({ destination: (req, file, cb) => cb(null, CREATIVES_ASSETS_DIR), filename: (req, file, cb) => { const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)); } }), limits: { fileSize: 15 * 1024 * 1024 } });
const lpAssetUpload = multer({ storage: multer.diskStorage({ destination: (req, file, cb) => cb(null, LP_ASSETS_DIR), filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_').toLowerCase()) }), limits: { fileSize: 5 * 1024 * 1024 } });
const mcpAttachmentUpload = multer({ storage: multer.diskStorage({ destination: (req, file, cb) => cb(null, MCP_ATTACHMENTS_DIR), filename: (req, file, cb) => { const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); cb(null, 'mcp-attachment-' + uniqueSuffix + path.extname(file.originalname)); } }), limits: { fileSize: 5 * 1024 * 1024 } });


// --- Tipos e Middlewares ---
export interface AuthenticatedRequest extends Request { user?: schemaShared.User; }

const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (process.env.FORCE_AUTH_BYPASS === 'true') {
        const user = await storage.getUser(1) || await storage.createUser({ username: 'admin_bypass', email: 'admin@example.com', password: 'password' });
        req.user = user;
        return next();
    }
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token não fornecido.' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const user = await storage.getUser(decoded.userId);
        if (!user) return res.status(401).json({ error: 'Usuário não encontrado ou token inválido.' });
        req.user = user;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) return res.status(401).json({ error: 'Token expirado.' });
        if (error instanceof jwt.JsonWebTokenError) return res.status(403).json({ error: 'Token inválido.' });
        next(error);
    }
};

const whatsappServiceInstances = new Map<number, WhatsappConnectionService>();
function getWhatsappServiceForUser(userId: number): WhatsappConnectionService {
    if (!whatsappServiceInstances.has(userId)) {
        whatsappServiceInstances.set(userId, new WhatsappConnectionService(userId));
    }
    return whatsappServiceInstances.get(userId)!;
}

let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY) {
    try { genAI = new GoogleGenerativeAI(GEMINI_API_KEY); }
    catch (error) { console.error("Falha ao inicializar GoogleGenerativeAI:", error); }
}

// --- Função Principal de Setup das Rotas ---
async function doRegisterRoutes(app: Express): Promise<HttpServer> {
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    const publicRouter = express.Router();
    const apiRouter = express.Router();
    const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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
    publicRouter.post('/auth/register', async (req, res, next) => { try { const data = schemaShared.insertUserSchema.parse(req.body); const existing = await storage.getUserByEmail(data.email); if (existing) return res.status(409).json({ error: 'Email já cadastrado.' }); const user = await storage.createUser(data); const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' }); res.status(201).json({ user: { id: user.id, username: user.username, email: user.email }, token }); } catch (e) { next(e); } });
    publicRouter.post('/auth/login', async (req, res, next) => { try { const { email, password } = req.body; if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios.' }); const user = await storage.getUserByEmail(email); if (!user || !user.password) return res.status(401).json({ error: 'Credenciais inválidas.' }); const isValid = await storage.validatePassword(password, user.password); if (!isValid) return res.status(401).json({ error: 'Credenciais inválidas.' }); const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' }); res.json({ user: { id: user.id, username: user.username, email: user.email }, token }); } catch (e) { next(e); } });
    
    publicRouter.post('/auth/google', async (req, res, next) => {
      try {
        const { credential } = req.body;
        if (!credential) return res.status(400).json({ error: "Credencial do Google não fornecida." });
        if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: "Google Client ID não configurado no servidor." });

        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email || !payload.name) {
          return res.status(400).json({ error: 'Não foi possível obter informações do perfil do Google.' });
        }

        let user = await storage.getUserByEmail(payload.email);
        if (!user) { user = await storage.createUser({ email: payload.email, username: payload.name, password: '' }); }
        
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ user: { id: user.id, username: user.username, email: user.email }, token });

      } catch (error) {
        console.error("Erro na autenticação com Google:", error);
        next(new Error("Falha na autenticação com Google. Token inválido ou expirado."));
      }
    });
    publicRouter.get('/landingpages/slug/:slug', async (req, res, next) => { try { const lp = await storage.getLandingPageBySlug(req.params.slug); if (!lp) return res.status(404).json({ error: 'Página não encontrada' }); res.json(lp); } catch(e) { next(e); }});

    // MIDDLEWARE DE AUTENTICAÇÃO PARA AS ROTAS ABAIXO
    apiRouter.use(authenticateToken);

    // --- ROTAS PROTEGIDAS ---
    apiRouter.get('/users', async (req: AuthenticatedRequest, res, next) => { try { res.json(await storage.getAllUsers()); } catch(e) { next(e); }});
    apiRouter.get('/dashboard', async (req: AuthenticatedRequest, res, next) => { try { const timeRange = req.query.timeRange as string | undefined; res.json(await storage.getDashboardData(req.user!.id, timeRange)); } catch (e) { next(e); }});
    apiRouter.get('/campaigns', async (req: AuthenticatedRequest, res, next) => { try { res.json(await storage.getCampaigns(req.user!.id)); } catch (e) { next(e); }});
    apiRouter.post('/campaigns', async (req: AuthenticatedRequest, res, next) => { try { const data = schemaShared.insertCampaignSchema.parse(req.body); res.status(201).json(await storage.createCampaign({ ...data, userId: req.user!.id })); } catch (e) { next(e); }});
    
    apiRouter.get('/campaigns/:id', async (req: AuthenticatedRequest, res, next) => { try { const campaign = await storage.getCampaignWithDetails(parseInt(req.params.id), req.user!.id); if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada.'}); res.json(campaign); } catch(e) { next(e); }});
    
    apiRouter.put('/campaigns/:id', async (req: AuthenticatedRequest, res, next) => { try { const data = schemaShared.insertCampaignSchema.partial().parse(req.body); const updated = await storage.updateCampaign(parseInt(req.params.id), req.user!.id, data); if (!updated) return res.status(404).json({ error: "Campanha não encontrada."}); res.json(updated); } catch (e) { next(e); } });
    apiRouter.delete('/campaigns/:id', async (req: AuthenticatedRequest, res, next) => { try { await storage.deleteCampaign(parseInt(req.params.id), req.user!.id); res.status(204).send(); } catch (e) { next(e); } });
    
    apiRouter.post('/campaigns/from-template/:templateId', async (req: AuthenticatedRequest, res, next) => {
        try {
            const templateId = parseInt(req.params.templateId, 10);
            const data = schemaShared.insertCampaignSchema.parse(req.body);
            const newCampaignData = { ...data, userId: req.user!.id };
            const newCampaign = await storage.createCampaignFromTemplate(newCampaignData, templateId);
            res.status(201).json(newCampaign);
        } catch (e) {
            next(e);
        }
    });

    apiRouter.post('/campaigns/:campaignId/tasks', async (req: AuthenticatedRequest, res, next) => {
        try {
            const data = schemaShared.insertCampaignTaskSchema.parse(req.body);
            const task = await storage.createTask(data);
            res.status(201).json(task);
        } catch (e) { next(e); }
    });
    apiRouter.put('/tasks/:taskId', async (req: AuthenticatedRequest, res, next) => {
        try {
            const taskId = parseInt(req.params.taskId, 10);
            const data = schemaShared.insertCampaignTaskSchema.partial().parse(req.body);
            const task = await storage.updateTask(taskId, data);
            res.json(task);
        } catch(e) { next(e); }
    });
    apiRouter.delete('/tasks/:taskId', async (req: AuthenticatedRequest, res, next) => {
        try {
            const taskId = parseInt(req.params.taskId, 10);
            await storage.deleteTask(taskId);
            res.status(204).send();
        } catch (e) { next(e); }
    });

    apiRouter.get('/creatives', async (req: AuthenticatedRequest, res, next) => { try { const campaignIdQuery = req.query.campaignId as string; const campaignId = campaignIdQuery === 'null' ? null : (campaignIdQuery ? parseInt(campaignIdQuery) : undefined); res.json(await storage.getCreatives(req.user!.id, campaignId)); } catch (e) { next(e); }});
    apiRouter.post('/creatives', creativesUpload.single('file'), async (req: AuthenticatedRequest, res, next) => { try { const data = schemaShared.insertCreativeSchema.parse(req.body); if (req.file) { const publicFileUrl = `/${UPLOADS_DIR_NAME}/creatives-assets/${req.file.filename}`; data.fileUrl = publicFileUrl; data.thumbnailUrl = publicFileUrl; } const creativeData = { ...data, userId: req.user!.id }; const creative = await storage.createCreative(creativeData); res.status(201).json(creative); } catch (e) { if (req.file) { fs.unlink(req.file.path, (err) => { if (err) console.error("Erro ao limpar arquivo de criativo após falha na rota:", err); });} next(e); } });
    apiRouter.put('/creatives/:id', creativesUpload.single('file'), async (req: AuthenticatedRequest, res, next) => { try { const id = parseInt(req.params.id); const userId = req.user!.id; const existingCreative = await storage.getCreative(id, userId); if (!existingCreative) { return res.status(404).json({ error: "Criativo não encontrado ou não pertence ao usuário." }); } const { userId: _, ...updateDataRaw } = req.body; let updateData = schemaShared.insertCreativeSchema.partial().parse(updateDataRaw); if (req.file) { updateData.fileUrl = `/${UPLOADS_DIR_NAME}/creatives-assets/${req.file.filename}`; if (existingCreative.fileUrl) { const oldFilePath = path.join(UPLOADS_PATH, 'creatives-assets', path.basename(existingCreative.fileUrl)); if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath); } } else if (updateData.fileUrl === null && existingCreative.fileUrl) { const oldFilePath = path.join(UPLOADS_PATH, 'creatives-assets', path.basename(existingCreative.fileUrl)); if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath); } const updatedCreative = await storage.updateCreative(id, updateData, userId); if (!updatedCreative) return res.status(404).json({error: "Falha ao atualizar criativo"}); res.json(updatedCreative); } catch(e) { if (req.file) { fs.unlink(req.file.path, (err) => { if (err) console.error("Erro ao limpar arquivo após falha no PUT:", err); });} next(e); }});
    apiRouter.delete('/creatives/:id', async (req: AuthenticatedRequest, res, next) => { try { await storage.deleteCreative(parseInt(req.params.id), req.user!.id); res.status(204).send(); } catch (e) { next(e); } });
    apiRouter.get('/creatives/from-drive/:folderId', async (req: AuthenticatedRequest, res, next) => { try { const { folderId } = req.params; if (!folderId) { return res.status(400).json({ error: 'O ID da pasta do Google Drive é obrigatório.' }); } const files = await googleDriveService.listFilesFromFolder(folderId); res.json(files); } catch (error: any) { if (error.message.includes('não encontrada') || error.message.includes('Acesso negado')) { return res.status(403).json({ error: error.message }); } next(error); }});
    apiRouter.post('/creatives/import-from-drive', async (req: AuthenticatedRequest, res, next) => {
        try {
          const { campaignId, files } = req.body;
          const userId = req.user!.id;
      
          if (!campaignId || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({ error: 'ID da campanha e lista de arquivos são obrigatórios.' });
          }
      
          const createdCreatives = [];
          for (const file of files) {
            const downloadUrl = file.webContentLink;
            if (!downloadUrl) { continue; }
      
            const response = await axios({ method: 'get', url: downloadUrl, responseType: 'stream' });
      
            const ext = path.extname(file.name || '').toLowerCase() || '.jpg';
            const newFilename = `gdrive-import-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
            const localFilePath = path.join(CREATIVES_ASSETS_DIR, newFilename);
            const publicFileUrl = `/${UPLOADS_DIR_NAME}/creatives-assets/${newFilename}`;
      
            const writer = fs.createWriteStream(localFilePath);
            response.data.pipe(writer);
      
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            
            let type: 'image' | 'video' | 'text' | 'carousel' = 'image';
            if (['.mp4', '.mov', '.avi', '.webm'].includes(ext)) { type = 'video'; }
      
            const dataToValidate = {
              campaignId: parseInt(campaignId),
              name: file.name.replace(/\.[^/.]+$/, "") || 'Criativo importado',
              type,
              fileUrl: publicFileUrl,
              thumbnailUrl: file.thumbnailLink,
              status: 'pending',
            };
            
            const validatedData = schemaShared.insertCreativeSchema.parse(dataToValidate);
            
            const newCreative = await storage.createCreative({ ...validatedData, userId });
            createdCreatives.push(newCreative);
          }
      
          res.status(201).json({
            message: `${createdCreatives.length} criativo(s) importado(s) com sucesso!`,
            data: createdCreatives,
          });
        } catch (error) {
          console.error("Erro no processo de importação do Google Drive:", error);
          next(error);
        }
    });
    
    apiRouter.get('/funnels', async (req: AuthenticatedRequest, res, next) => { try { res.json(await storage.getFunnels(req.user!.id, req.query.campaignId ? Number(req.query.campaignId) : undefined)); } catch (e) { next(e); }});
    apiRouter.post('/funnels', async (req: AuthenticatedRequest, res, next) => { try { const data = schemaShared.insertFunnelSchema.parse(req.body); res.status(201).json(await storage.createFunnel({ ...data, userId: req.user!.id })); } catch(e){ next(e); }});
    apiRouter.delete('/funnels/:id', async (req: AuthenticatedRequest, res, next) => { try { await storage.deleteFunnel(parseInt(req.params.id), req.user!.id); res.status(204).send(); } catch (e) { next(e); }});
    apiRouter.get('/metrics/campaign/:campaignId', async (req: AuthenticatedRequest, res, next) => { try { res.json(await storage.getMetricsForCampaign(parseInt(req.params.campaignId), req.user!.id)); } catch(e){ next(e); }});
    apiRouter.get('/copies', async (req: AuthenticatedRequest, res, next) => { try { const { campaignId, phase, purpose, search } = req.query; res.json(await storage.getCopies(req.user!.id, campaignId ? Number(campaignId) : undefined, phase as string, purpose as string, search as string)); } catch (e) { next(e); } });
    
    // ROTA /api/copies AJUSTADA
    apiRouter.post('/copies', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
        try {
            // Valida os dados que vêm do cliente, omitindo o userId que será adicionado pelo servidor
            const clientDataSchema = schemaShared.insertCopySchema.omit({ userId: true });
            const clientData = clientDataSchema.parse(req.body);
            
            // Adiciona o userId do usuário autenticado e então salva no banco
            const completeData = { ...clientData, userId: req.user!.id };
            const newCopy = await storage.createCopy(completeData);
            
            res.status(201).json(newCopy);
        } catch (e) {
            next(e);
        }
    });

    apiRouter.delete('/copies/:id', async (req: AuthenticatedRequest, res, next) => { try { await storage.deleteCopy(parseInt(req.params.id), req.user!.id); res.status(204).send(); } catch (e) { next(e); }});
    apiRouter.get('/landingpages', async (req: AuthenticatedRequest, res, next) => { try { res.json(await storage.getLandingPages(req.user!.id)); } catch (e) { next(e); }});
    apiRouter.post('/landingpages', async (req: AuthenticatedRequest, res, next) => { try { const lpData = schemaShared.insertLandingPageSchema.parse({ ...req.body, userId: req.user!.id }); res.status(201).json(await storage.createLandingPage(lpData)); } catch(e){ next(e); }});
    apiRouter.get('/landingpages/studio-project/:studioProjectId', async (req: AuthenticatedRequest, res, next) => { try { const lp = await storage.getLandingPageByStudioProjectId(req.params.studioProjectId, req.user!.id); if (!lp) return res.status(404).json({ error: 'Projeto não encontrado.' }); res.json({ project: lp.grapesJsData || {} }); } catch(e){ next(e); }});
    apiRouter.put('/landingpages/:id', async (req: AuthenticatedRequest, res, next) => { try { const lpData = schemaShared.insertLandingPageSchema.partial().parse(req.body); const updated = await storage.updateLandingPage(parseInt(req.params.id), lpData, req.user!.id); if (!updated) return res.status(404).json({ error: "Landing Page não encontrada." }); res.json(updated); } catch(e){ next(e); }});
    apiRouter.delete('/landingpages/:id', async (req: AuthenticatedRequest, res, next) => { try { await storage.deleteLandingPage(parseInt(req.params.id), req.user!.id); res.status(204).send(); } catch(e){ next(e); }});
    apiRouter.post('/assets/lp-upload', lpAssetUpload.single('file'), (req: AuthenticatedRequest, res, next) => { try { if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." }); const publicUrl = `${APP_BASE_URL}/${UPLOADS_DIR_NAME}/lp-assets/${req.file.filename}`; res.status(200).json([{ src: publicUrl }]); } catch(e){ next(e); }});
    apiRouter.post('/assets/lp-delete', async (req: AuthenticatedRequest, res, next) => { try { const { assets } = req.body; if (Array.isArray(assets)) { assets.forEach(asset => { try { const filename = path.basename(new URL(asset.src).pathname); const filePath = path.join(LP_ASSETS_DIR, filename); if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { console.warn(`Erro ao deletar asset: ${asset.src}`, e); } }); } res.status(200).json({ message: "Solicitação processada." }); } catch(e){ next(e); }});
    apiRouter.get('/budgets', async (req: AuthenticatedRequest, res, next) => { try { res.json(await storage.getBudgets(req.user!.id, req.query.campaignId ? Number(req.query.campaignId) : undefined)); } catch (e) { next(e); }});
    apiRouter.post('/budgets', async (req: AuthenticatedRequest, res, next) => { try { const data = schemaShared.insertBudgetSchema.parse(req.body); res.status(201).json(await storage.createBudget({ ...data, userId: req.user!.id })); } catch (e) { next(e); }});
    apiRouter.get('/alerts', async (req: AuthenticatedRequest, res, next) => { try { res.json(await storage.getAlerts(req.user!.id, req.query.unread === 'true')); } catch(e){ next(e); }});
    apiRouter.put('/alerts/:id/read', async (req: AuthenticatedRequest, res, next) => { try { await storage.markAlertAsRead(parseInt(req.params.id), req.user!.id); res.status(200).json({ success: true }); } catch (e) { next(e); }});
    apiRouter.patch('/alerts/read-all', async (req: AuthenticatedRequest, res, next) => { try { await storage.markAllAlertsAsRead(req.user!.id); res.status(200).json({ success: true }); } catch (e) { next(e); }});
    apiRouter.get('/flows', async (req: AuthenticatedRequest, res, next) => { try { const userId = req.user!.id; const campaignIdQuery = req.query.campaignId as string | undefined; const campaignId = campaignIdQuery === 'null' ? null : (campaignIdQuery ? parseInt(campaignIdQuery, 10) : undefined); res.json(await storage.getFlows(userId, campaignId)); } catch (e) { next(e); }});
    apiRouter.get('/flows/:id', async (req: AuthenticatedRequest, res, next) => { try { const flow = await storage.getFlow(parseInt(req.params.id), req.user!.id); return flow ? res.json(flow) : res.status(404).json({ error: 'Fluxo não encontrado.' }); } catch (e) { next(e); }});
    apiRouter.post('/flows', async (req: AuthenticatedRequest, res, next) => { try { const data = schemaShared.insertFlowSchema.parse(req.body); res.status(201).json(await storage.createFlow({ ...data, userId: req.user!.id })); } catch(e){ next(e); }});
    apiRouter.put('/flows/:id', async (req: AuthenticatedRequest, res, next) => { try { const data = schemaShared.insertFlowSchema.partial().parse(req.body); const updated = await storage.updateFlow(parseInt(req.params.id), data, req.user!.id); if (!updated) return res.status(404).json({error: "Fluxo não encontrado."}); res.json(updated); } catch(e) { next(e); }});
    apiRouter.delete('/flows/:id', async (req: AuthenticatedRequest, res, next) => { try { await storage.deleteFlow(parseInt(req.params.id), req.user!.id); res.status(204).send(); } catch(e){ next(e); }});
    apiRouter.post('/whatsapp/connect', async (req: AuthenticatedRequest, res, next) => { try { const service = getWhatsappServiceForUser(req.user!.id); await service.connectToWhatsApp(); res.status(202).json({ message: "Iniciando conexão." }); } catch(e) { next(e); }});
    apiRouter.get('/whatsapp/status', async (req: AuthenticatedRequest, res, next) => { try { const status = WhatsappConnectionService.getStatus(req.user!.id); res.json(status); } catch(e){ next(e); }});
    apiRouter.post('/whatsapp/disconnect', async (req: AuthenticatedRequest, res, next) => { try { const service = getWhatsappServiceForUser(req.user!.id); await service.disconnectWhatsApp(); res.json({ message: "Desconexão solicitada." }); } catch(e){ next(e); }});
    apiRouter.post('/whatsapp/reload-flow', (req, res) => res.json({ message: "Recarga solicitada." }));
    apiRouter.get('/whatsapp/contacts', async (req: AuthenticatedRequest, res, next) => { try { res.json(await storage.getContacts(req.user!.id)); } catch(e){ next(e); }});
    apiRouter.get('/whatsapp/messages', async (req: AuthenticatedRequest, res, next) => { try { const contactNumber = req.query.contactNumber as string; if(!contactNumber) return res.status(400).json({ error: "Número do contato é obrigatório."}); res.json(await storage.getMessages(req.user!.id, contactNumber)); } catch(e){ next(e); }});
    apiRouter.post('/whatsapp/messages', async (req: AuthenticatedRequest, res, next) => { try { const { contactNumber, message } = schemaShared.insertWhatsappMessageSchema.pick({contactNumber: true, message: true}).parse(req.body); const service = getWhatsappServiceForUser(req.user!.id); const fullJid = contactNumber.endsWith('@s.whatsapp.net') ? contactNumber : `${contactNumber}@s.whatsapp.net`; await service.sendMessage(fullJid, { text: message }); const savedMessage = await storage.createMessage({ contactNumber, message, direction: 'outgoing', userId: req.user!.id }); res.status(201).json(savedMessage); } catch (e) { next(e); } });
    apiRouter.post('/mcp/converse', async (req: AuthenticatedRequest, res, next) => { try { const { message, sessionId, attachmentUrl } = req.body; const payload = await handleMCPConversation(req.user!.id, message, sessionId, attachmentUrl); res.json(payload); } catch(e) { next(e); }});
    
    apiRouter.post('/mcp/upload-attachment', mcpAttachmentUpload.single('attachment'), (req: AuthenticatedRequest, res, next) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: "Nenhum arquivo enviado." });
            }
            const publicUrl = `${APP_BASE_URL}/${UPLOADS_DIR_NAME}/mcp-attachments/${req.file.filename}`;
            res.status(200).json({ url: publicUrl });
        } catch (e) {
            next(e);
        }
    });

    apiRouter.post('/chat/sessions', async (req: AuthenticatedRequest, res, next) => { try { const data = schemaShared.insertChatSessionSchema.parse(req.body); res.status(201).json(await storage.createChatSession(req.user!.id, data.title)); } catch(e){ next(e); }});
    apiRouter.get('/chat/sessions', async (req: AuthenticatedRequest, res, next) => { try { res.json(await storage.getChatSessions(req.user!.id)); } catch(e){ next(e); }});
    apiRouter.get('/chat/sessions/:sessionId/messages', async (req: AuthenticatedRequest, res, next) => { try { res.json(await storage.getChatMessages(parseInt(req.params.sessionId), req.user!.id)); } catch(e){ next(e); }});
    apiRouter.put('/chat/sessions/:sessionId/title', async (req: AuthenticatedRequest, res, next) => { try { const updated = await storage.updateChatSessionTitle(parseInt(req.params.sessionId), req.user!.id, req.body.title); res.json(updated); } catch(e){ next(e); }});
    apiRouter.delete('/chat/sessions/:sessionId', async (req: AuthenticatedRequest, res, next) => { try { await storage.deleteChatSession(parseInt(req.params.sessionId), req.user!.id); res.status(204).send(); } catch(e){ next(e); }});
    
    // --- REGISTRO DOS ROUTERS ---
    app.use('/api', publicRouter);
    app.use('/api', apiRouter);
    app.use(handleZodError);
    app.use(handleError);

    return createServer(app);
}

export const RouterSetup = {
    registerRoutes: doRegisterRoutes
};
