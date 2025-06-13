import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { ZodError } from "zod";

import { storage } from '../storage';
import * as schemaShared from '../../shared/schema';
import { JWT_SECRET, GOOGLE_CLIENT_ID } from '../config';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Rota para registrar um novo usuário
router.post('/auth/register', asyncHandler(async (req, res) => {
    const data = schemaShared.insertUserSchema.parse(req.body);
    
    const existingUser = await storage.getUserByEmail(data.email);
    if (existingUser) {
        return res.status(409).json({ error: 'Email já cadastrado.' });
    }

    const user = await storage.createUser(data);
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ user: { id: user.id, username: user.username, email: user.email }, token });
}));

// Rota para fazer login
router.post('/auth/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    const user = await storage.getUserByEmail(email);
    if (!user || !user.password) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const isPasswordValid = await storage.validatePassword(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
}));

// Rota para autenticar com Google
router.post('/auth/google', asyncHandler(async (req, res) => {
    const { credential } = req.body;
    if (!GOOGLE_CLIENT_ID) {
        return res.status(500).json({ error: "Google Client ID não configurado." });
    }

    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.name) {
        return res.status(400).json({ error: 'Payload do Google inválido.' });
    }

    let user = await storage.getUserByEmail(payload.email);
    if (!user) {
        user = await storage.createUser({ email: payload.email, username: payload.name });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
}));

export default router;
