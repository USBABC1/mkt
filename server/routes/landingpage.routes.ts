import { Router } from 'express';
import { storage } from '../storage';
import * as schemaShared from '../../shared/schema';
import { geminiService } from '../services/gemini.service';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken } from '../middleware/auth.middleware';
import type { AuthenticatedRequest } from '../types/request';

const router = Router();

// --- ROTA PÚBLICA ---
// Busca uma LP pelo seu slug para exibição pública. Não precisa de token.
router.get('/landingpages/slug/:slug', asyncHandler(async (req, res) => {
    const lp = await storage.getLandingPageBySlug(req.params.slug);
    if (!lp) {
        return res.status(404).json({ error: 'Página não encontrada' });
    }
    res.json(lp);
}));

// A partir daqui, todas as rotas precisam de autenticação.
router.use(authenticateToken);

// --- ROTAS PROTEGIDAS ---
router.get('/landingpages', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const landingPages = await storage.getLandingPages(req.user!.id);
    res.json(landingPages);
}));

router.post('/landingpages', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { name } = req.body;
    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const finalSlug = await storage.generateUniqueSlug(slugBase);
    
    const lpData = schemaShared.insertLandingPageSchema.parse({ ...req.body, slug: finalSlug });
    const newLp = await storage.createLandingPage(lpData, req.user!.id);
    
    res.status(201).json(newLp);
}));

router.post('/landingpages/preview-advanced', asyncHandler(async (req, res) => {
    const { prompt, reference, options } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'O prompt é obrigatório.' });
    }
    const generatedHtml = await geminiService.createAdvancedLandingPage(prompt, options || {}, reference);
    res.status(200).json({ htmlContent: generatedHtml });
}));

router.get('/landingpages/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const lp = await storage.getLandingPage(parseInt(req.params.id), req.user!.id);
    if (!lp) {
        return res.status(404).json({ error: 'Página não encontrada.' });
    }
    res.json(lp);
}));

router.put('/landingpages/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const lpData = schemaShared.insertLandingPageSchema.partial().parse(req.body);
    const updated = await storage.updateLandingPage(parseInt(req.params.id), lpData, req.user!.id);
    if (!updated) {
        return res.status(404).json({ error: "Página não encontrada." });
    }
    res.json(updated);
}));

router.delete('/landingpages/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
    await storage.deleteLandingPage(parseInt(req.params.id), req.user!.id);
    res.status(204).send();
}));

router.post('/landingpages/:id/optimize', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const lp = await storage.getLandingPage(parseInt(req.params.id), req.user!.id);
    if (!lp || !lp.grapesJsData?.html) {
        return res.status(404).json({ error: 'Página ou seu conteúdo HTML não encontrado.' });
    }
    const optimizationGoals = req.body.goals;
    const optimizedHtml = await geminiService.optimizeLandingPage(lp.grapesJsData.html, optimizationGoals);
    res.json({ htmlContent: optimizedHtml });
}));

export default router;
