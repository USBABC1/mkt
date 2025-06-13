// server/api/whatsapp.routes.ts
import express from 'express';
import { whatsappStorage } from './whatsapp.storage';
import { WhatsappConnectionService } from '../services/whatsapp-connection.service';
import type { AuthenticatedRequest } from '../routes';

export const whatsappRouter = express.Router();

const whatsappServiceInstances = new Map<number, WhatsappConnectionService>();

function getWhatsappServiceForUser(userId: number): WhatsappConnectionService {
    if (!whatsappServiceInstances.has(userId)) {
        whatsappServiceInstances.set(userId, new WhatsappConnectionService(userId));
    }
    return whatsappServiceInstances.get(userId)!;
}

// --- Rotas do WhatsApp ---
whatsappRouter.get('/status', (req: AuthenticatedRequest, res) => {
    res.json(WhatsappConnectionService.getStatus(req.user!.id));
});

whatsappRouter.post('/connect', async (req: AuthenticatedRequest, res, next) => {
    try {
        getWhatsappServiceForUser(req.user!.id).connectToWhatsApp();
        res.status(202).json({ message: "Iniciando conexão..." });
    } catch (e) {
        next(e);
    }
});

whatsappRouter.post('/disconnect', async (req: AuthenticatedRequest, res, next) => {
    try {
        await getWhatsappServiceForUser(req.user!.id).disconnectWhatsApp();
        res.json({ message: "Desconexão solicitada." });
    } catch (e) {
        next(e);
    }
});

// ✅ Rota que estava faltando no seu arquivo de rotas original
whatsappRouter.get('/contacts', async (req: AuthenticatedRequest, res, next) => {
    try {
        const contacts = await whatsappStorage.getContacts(req.user!.id);
        res.json(contacts);
    } catch(e) {
        next(e);
    }
});

// ✅ Rota que estava faltando no seu arquivo de rotas original
whatsappRouter.get('/messages', async (req: AuthenticatedRequest, res, next) => {
    try {
        const contactNumber = req.query.contactNumber as string | undefined;
        const messages = await whatsappStorage.getMessages(req.user!.id, contactNumber);
        res.json(messages);
    } catch(e) {
        next(e);
    }
});
