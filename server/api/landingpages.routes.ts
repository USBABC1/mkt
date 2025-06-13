// server/api/landingpages.routes.ts
import express from 'express';
import { landingPagesStorage } from './landingpages.storage';
import * as schemaShared from '../../shared/schema';
import { geminiService } from '../services/gemini.service';
import type { AuthenticatedRequest } from '../routes';
import type { Multer } from 'multer';
import { APP_BASE_URL, UPLOADS_PATH } from '../config';
import path from 'path';

export const publicLpRouter = express.Router();
export const protectedLpRouter = express.Router();

// Rota pública para visualização da LP pelo slug
publicLpRouter.get('/slug/:slug', async (req, res, next) => {
    try {
      const lp = await landingPagesStorage.getLandingPageBySlug(req.params.slug);
      if (!lp) return res.status(404).json({ error: 'Página não encontrada' });
      res.json(lp);
    } catch(e) {
      next(e);
    }
});

// Injeção do 'multer' para upload de assets, pois ele é configurado no arquivo de rotas principal
export const setupLpAssetUpload = (lpAssetUpload: Multer) => {
    const UPLOADS_DIR_NAME = path.basename(UPLOADS_PATH);
    
    protectedLpRouter.post('/assets/lp-upload', lpAssetUpload.array('files'), (req: AuthenticatedRequest, res, next) => {
        try {
            if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
                return res.status(400).json({ error: "Nenhum arquivo enviado." });
            }
            const urls = req.files.map(file => `${APP_BASE_URL}/${UPLOADS_DIR_NAME}/lp-assets/${file.filename}`);
            res.status(200).json(urls);
        } catch(e) {
            next(e);
        }
    });
};

// Rotas protegidas (exigem autenticação)
protectedLpRouter.get('/', async (req: AuthenticatedRequest, res, next) => {
    try {
        res.json(await landingPagesStorage.getLandingPages(req.user!.id));
    } catch (e) {
        next(e);
    }
});

protectedLpRouter.post('/', async (req: AuthenticatedRequest, res, next) => {
    try {
        const { name } = req.body;
        const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const finalSlug = await landingPagesStorage.generateUniqueSlug(slugBase);
        const lpData = schemaShared.insertLandingPageSchema.parse({ ...req.body, slug: finalSlug });
        const newLp = await landingPagesStorage.createLandingPage(lpData, req.user!.id);
        res.status(201).json(newLp);
    } catch(e) {
        next(e);
    }
});

protectedLpRouter.post('/preview-advanced', async (req: AuthenticatedRequest, res, next) => {
    try {
        const { prompt, reference, options } = req.body;
        if (!prompt) return res.status(400).json({ error: 'O prompt é obrigatório.' });
        const generatedHtml = await geminiService.createAdvancedLandingPage(prompt, options || {}, reference);
        res.status(200).json({ htmlContent: generatedHtml });
    } catch (e) {
        next(e);
    }
});

protectedLpRouter.get('/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
        const lp = await landingPagesStorage.getLandingPage(parseInt(req.params.id), req.user!.id);
        if (!lp) return res.status(404).json({ error: 'Página não encontrada.' });
        res.json(lp);
    } catch (e) {
        next(e);
    }
});

protectedLpRouter.put('/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
        const lpData = schemaShared.insertLandingPageSchema.partial().parse(req.body);
        const updated = await landingPagesStorage.updateLandingPage(parseInt(req.params.id), lpData, req.user!.id);
        if (!updated) return res.status(404).json({ error: "Página não encontrada." });
        res.json(updated);
    } catch(e) {
        next(e);
    }
});

protectedLpRouter.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
        await landingPagesStorage.deleteLandingPage(parseInt(req.params.id), req.user!.id);
        res.status(204).send();
    } catch(e) {
        next(e);
    }
});

protectedLpRouter.post('/generate-variations', async (req: AuthenticatedRequest, res, next) => {
    try {
        const { prompt, count, options, reference } = req.body;
        if (!prompt) return res.status(400).json({ error: 'O prompt é obrigatório para gerar variações.' });
        const variations = await geminiService.generateVariations(prompt, count || 2, options || {}, reference);
        res.json({ variations });
    } catch (e) {
        next(e);
    }
});

protectedLpRouter.post('/optimize', async (req: AuthenticatedRequest, res, next) => {
    try {
        const { html, goals } = req.body;
        if (!html) return res.status(400).json({ error: 'O conteúdo HTML é obrigatório para otimização.' });
        const optimizedHtml = await geminiService.optimizeLandingPage(html, goals);
        res.json({ htmlContent: optimizedHtml });
    } catch (e) {
        next(e);
    }
});
