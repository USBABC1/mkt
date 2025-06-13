import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken } from '../middleware/auth.middleware';
import type { AuthenticatedRequest } from '../types/request';
import { WhatsappConnectionService } from '../services/whatsapp-connection.service';

const router = Router();
router.use(authenticateToken);

// --- Mapa de Instâncias do Serviço WhatsApp ---
// Mantém uma instância do serviço por usuário para gerenciar múltiplas conexões
const whatsappServiceInstances = new Map<number, WhatsappConnectionService>();

function getWhatsappServiceForUser(userId: number): WhatsappConnectionService {
    if (!whatsappServiceInstances.has(userId)) {
        console.log(`Criando nova instância do WhatsappService para o usuário ${userId}`);
        whatsappServiceInstances.set(userId, new WhatsappConnectionService(userId));
    }
    return whatsappServiceInstances.get(userId)!;
}

// --- Rotas do WhatsApp ---

router.get('/whatsapp/status', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const status = WhatsappConnectionService.getStatus(req.user!.id);
    res.json(status);
}));

router.post('/whatsapp/connect', asyncHandler(async (req: AuthenticatedRequest, res) => {
    // A conexão é assíncrona e emite eventos via Socket.IO,
    // então a resposta aqui é imediata.
    getWhatsappServiceForUser(req.user!.id).connectToWhatsApp();
    res.status(202).json({ message: "Iniciando conexão..." });
}));

router.post('/whatsapp/disconnect', asyncHandler(async (req: AuthenticatedRequest, res) => {
    await getWhatsappServiceForUser(req.user!.id).disconnectWhatsApp();
    res.json({ message: "Desconexão solicitada." });
}));

export default router;
