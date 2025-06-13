import type { Request, Response, NextFunction } from 'express';

// Definimos um tipo para a função de rota que vamos receber.
type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

/**
 * Envolve uma função de rota assíncrona.
 * Garante que qualquer erro lançado dentro da promessa seja capturado
 * e passado para o próximo middleware de erro do Express.
 * @param fn A função de rota assíncrona.
 * @returns Uma função de middleware padrão do Express.
 */
export const asyncHandler = (fn: AsyncRouteHandler) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
