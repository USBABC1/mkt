import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';
import * as schemaShared from '../../shared/schema';
import { JWT_SECRET } from '../config';
import type { AuthenticatedRequest } from '../types/request';

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Se o modo de bypass de autenticação estiver ativo, busca o primeiro usuário como admin.
    // Ideal para ambientes de desenvolvimento e teste.
    if (process.env.FORCE_AUTH_BYPASS === 'true') {
        try {
            const user = await storage.getUser(1);
            if (!user) {
                // Se nenhum usuário existir, cria um usuário de bypass para evitar erros.
                const bypassUser = await storage.createUser({ username: 'admin_bypass', email: 'admin@example.com', password: 'password' });
                req.user = bypassUser;
                return next();
            }
            req.user = user;
            return next();
        } catch (error) {
            return next(error);
        }
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // 401 Unauthorized: O cliente não forneceu credenciais.
        return res.status(401).json({ error: 'Token não fornecido.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const user = await storage.getUser(decoded.userId);

        if (!user) {
            // 401 Unauthorized: O usuário associado ao token não existe mais.
            return res.status(401).json({ error: 'Usuário não encontrado.' });
        }

        req.user = user; // Anexa o objeto do usuário à requisição
        next(); // Passa para a próxima função (a rota em si)
    } catch (error) {
        // 403 Forbidden: O token é inválido ou expirou.
        return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
};

// É uma boa prática criar um tipo customizado para a requisição
// que pode ser usado em todo o projeto.
// Crie um arquivo server/types/request.d.ts
/*
import * as schemaShared from '../../shared/schema';

declare global {
  namespace Express {
    export interface Request {
      user?: schemaShared.User;
    }
  }
}

export interface AuthenticatedRequest extends Express.Request {
  user: schemaShared.User;
}
*/
