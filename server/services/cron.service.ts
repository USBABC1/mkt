// server/services/cron.service.ts
import { db } from '../db';
import * as schema from '../../shared/schema';
import { storage } from '../storage';
import { sql, and, gte, lte, ne } from 'drizzle-orm';

async function checkUpcomingDeadlines() {
    console.log(`[CRON_JOB] Verificando tarefas com prazo iminente... ${new Date().toISOString()}`);
    try {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);

        const upcomingTasks = await db.query.campaignTasks.findMany({
            where: and(
                gte(schema.campaignTasks.endDate, now),
                lte(schema.campaignTasks.endDate, tomorrow),
                ne(schema.campaignTasks.status, 'completed')
            ),
            with: {
                assignee: {
                    columns: {
                        id: true,
                    }
                },
                phase: {
                    with: {
                        campaign: {
                            columns: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });

        if (upcomingTasks.length === 0) {
            console.log('[CRON_JOB] Nenhuma tarefa com prazo nas próximas 24 horas.');
            return;
        }

        console.log(`[CRON_JOB] ${upcomingTasks.length} tarefa(s) encontrada(s). Criando alertas...`);

        for (const task of upcomingTasks) {
            if (task.assigneeId) {
                await storage.createAlert({
                    userId: task.assigneeId,
                    campaignId: task.phase?.campaign.id || null,
                    type: 'performance', // Usando um tipo existente, idealmente seria 'deadline' ou 'task'
                    title: `Prazo da Tarefa se Aproximando: "${task.name}"`,
                    message: `A tarefa "${task.name}" na campanha "${task.phase?.campaign.name}" vence em menos de 24 horas.`,
                });
            }
        }
        console.log('[CRON_JOB] Alertas criados com sucesso.');

    } catch (error) {
        console.error('[CRON_JOB] Erro ao verificar prazos de tarefas:', error);
    }
}

// Inicia a verificação periódica
export function startCronJobs() {
    // Roda a cada hora (3600000 ms)
    setInterval(checkUpcomingDeadlines, 3600000);
    // Roda uma vez na inicialização para teste
    setTimeout(checkUpcomingDeadlines, 5000); 
}
