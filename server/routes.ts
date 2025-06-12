// server/routes.ts
import { Hono } from 'hono';
import { serveStatic } from 'hono/node-server/serve-static';
import { bearerAuth } from 'hono/bearer-auth';
import { jwt } from 'hono/jwt';
import {
  getLandingPages,
  createLandingPage,
  getLandingPageById,
  updateLandingPage,
  deleteLandingPage,
  getPublicLandingPage,
  getCampaigns,
  createCampaign,
  getCampaignWithDetails,
  updateCampaign,
  deleteCampaign,
  createTask,
  updateTask,
  deleteTask,
  getCreatives,
  createCreative,
  updateCreative,
  deleteCreative,
  getCopies,
  createCopy,
  deleteCopy,
  getDashboardData,
  getUserById,
} from './db';
import { upload } from './multer.config';
import { generateVariations, previewAdvanced } from './services/gemini.service';

const api = new Hono();

// --- Autenticação e Middleware ---
// TODO: Substituir 'your-secret-key' pela sua chave secreta real vinda das configurações
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authMiddleware = jwt({
  secret: JWT_SECRET,
});

// Middleware para carregar dados do usuário autenticado
const loadUser = async (c, next) => {
  const payload = c.get('jwtPayload');
  if (!payload || !payload.userId) {
    return c.json({ error: 'User not found in token' }, 401);
  }
  const user = await getUserById(payload.userId);
  if (!user) {
    return c.json({ error: 'User not found in database' }, 401);
  }
  c.set('user', user);
  await next();
};


// --- Rotas Públicas ---
// (Não precisam de autenticação)
api.get('/landingpages/public/:slug', async (c) => {
  try {
    const { slug } = c.req.param();
    const page = await getPublicLandingPage(slug);
    return page ? c.json(page) : c.json({ error: 'Page not found' }, 404);
  } catch (error) {
    return c.json({ error: 'Failed to fetch public landing page' }, 500);
  }
});


// --- Rotas Protegidas ---
// (Requerem autenticação JWT)
const protectedApi = new Hono();
protectedApi.use('*', authMiddleware, loadUser);


// Rota para upload de arquivos
protectedApi.post('/upload', upload.single('file'), (c) => {
  const file = c.req.file;
  if (!file) {
    return c.json({ error: 'No file uploaded' }, 400);
  }
  const filePath = `/uploads/${file.filename}`;
  return c.json({ filePath });
});


// Rotas de Landing Page (CRUD)
protectedApi.get('/landingpages', async (c) => {
  try {
    const landingPages = await getLandingPages();
    return c.json(landingPages);
  } catch (error) {
    return c.json({ error: 'Failed to fetch landing pages' }, 500);
  }
});

protectedApi.get('/landingpages/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'));
    const page = await getLandingPageById(id);
    return page ? c.json(page) : c.json({ error: 'Landing page not found' }, 404);
  } catch (error) {
    return c.json({ error: 'Failed to fetch landing page' }, 500);
  }
});

protectedApi.post('/landingpages', async (c) => {
  try {
    const body = await c.req.json();
    const newPage = await createLandingPage({ ...body });
    return c.json(newPage, 201);
  } catch (error) {
    return c.json({ error: 'Failed to create landing page' }, 500);
  }
});

protectedApi.put('/landingpages/:id', async (c) => {
    try {
        const id = Number(c.req.param('id'));
        const body = await c.req.json();
        const updatedPage = await updateLandingPage(id, body);
        return c.json(updatedPage);
    } catch (error) {
        return c.json({ error: 'Failed to update landing page' }, 500);
    }
});

protectedApi.delete('/landingpages/:id', async (c) => {
    try {
        const id = Number(c.req.param('id'));
        await deleteLandingPage(id);
        return c.json({ message: 'Landing page deleted successfully' });
    } catch (error) {
        return c.json({ error: 'Failed to delete landing page' }, 500);
    }
});


// Rotas Gemini AI
protectedApi.post('/landingpages/preview-advanced', async (c) => {
  try {
    const { html, css, businessDescription, conversionGoals } = await c.req.json();
    const preview = await previewAdvanced(html, css, businessDescription, conversionGoals);
    return c.json({ preview });
  } catch (error) {
    return c.json({ error: 'Failed to generate advanced preview' }, 500);
  }
});

protectedApi.post('/landingpages/generate-variations', async (c) => {
  try {
    const { html, css, businessDescription, conversionGoals } = await c.req.json();
    const variations = await generateVariations(html, css, businessDescription, conversionGoals);
    return c.json({ variations });
  } catch (error) {
    return c.json({ error: 'Failed to generate variations' }, 500);
  }
});

// Rota de Campanhas
protectedApi.get('/campaigns', async (c) => {
  const user = c.get('user');
  const campaigns = await getCampaigns(user.id);
  return c.json(campaigns);
});

protectedApi.post('/campaigns', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();
  const campaign = await createCampaign({ ...data, userId: user.id });
  return c.json(campaign, 201);
});

protectedApi.get('/campaigns/:id', async (c) => {
    const user = c.get('user');
    const id = Number(c.req.param('id'));
    const campaign = await getCampaignWithDetails(id, user.id);
    return campaign ? c.json(campaign) : c.json({ error: 'Campaign not found' }, 404);
});

protectedApi.put('/campaigns/:id', async (c) => {
    const user = c.get('user');
    const id = Number(c.req.param('id'));
    const data = await c.req.json();
    const updated = await updateCampaign(id, user.id, data);
    return updated ? c.json(updated) : c.json({ error: "Campaign not found" }, 404);
});

protectedApi.delete('/campaigns/:id', async (c) => {
    const user = c.get('user');
    const id = Number(c.req.param('id'));
    await deleteCampaign(id, user.id);
    return c.body(null, 204);
});

// Rotas de Tarefas
protectedApi.post('/campaigns/:campaignId/tasks', async (c) => {
  const data = await c.req.json();
  const task = await createTask(data);
  return c.json(task, 201);
});

protectedApi.put('/tasks/:taskId', async (c) => {
  const taskId = Number(c.req.param('taskId'));
  const data = await c.req.json();
  const task = await updateTask(taskId, data);
  return c.json(task);
});

protectedApi.delete('/tasks/:taskId', async (c) => {
  const taskId = Number(c.req.param('taskId'));
  await deleteTask(taskId);
  return c.body(null, 204);
});


// Rota de Criativos
protectedApi.get('/creatives', async (c) => {
  const user = c.get('user');
  const campaignId = c.req.query('campaignId');
  const creatives = await getCreatives(user.id, campaignId ? Number(campaignId) : undefined);
  return c.json(creatives);
});

protectedApi.post('/creatives', async (c) => {
    const user = c.get('user');
    const data = await c.req.json();
    const creative = await createCreative({ ...data, userId: user.id });
    return c.json(creative, 201);
});

// ... (Adicionar PUT e DELETE para criativos de forma similar)

// Rota de Copies
protectedApi.get('/copies', async (c) => {
    const user = c.get('user');
    const { campaignId, phase, purpose, search } = c.req.query();
    const copies = await getCopies(user.id, campaignId ? Number(campaignId) : undefined, phase, purpose, search);
    return c.json(copies);
});

protectedApi.post('/copies', async (c) => {
    const user = c.get('user');
    const data = await c.req.json();
    const copy = await createCopy({ ...data, userId: user.id });
    return c.json(copy, 201);
});

// ... (Adicionar DELETE para copies)

// Rota do Dashboard
protectedApi.get('/dashboard', async (c) => {
    const user = c.get('user');
    const timeRange = c.req.query('timeRange');
    const data = await getDashboardData(user.id, timeRange);
    return c.json(data);
});


// --- Montagem Final das Rotas ---
api.route('/api', protectedApi);

// Servir arquivos estáticos (build do cliente e uploads)
api.use('/uploads/*', serveStatic({ root: './' }));
api.use('/*', serveStatic({ root: './client/dist' }));


export { api };
