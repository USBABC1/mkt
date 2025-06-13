// server/api/campaigns.storage.ts
import { db } from '../db';
import * as schema from '../../shared/schema';
import { eq, and, desc, ilike } from 'drizzle-orm';

class CampaignsStorage {
    private db = db;

    // --- Métodos de Campanha ---
    async getCampaigns(userId: number): Promise<schema.Campaign[]> {
        return this.db.query.campaigns.findMany({
            where: and(eq(schema.campaigns.userId, userId), eq(schema.campaigns.isTemplate, false)),
            orderBy: [desc(schema.campaigns.updatedAt)],
        });
    }

    async searchCampaignsByName(userId: number, name: string): Promise<schema.Campaign[]> {
        return this.db.query.campaigns.findMany({
            where: and(
                eq(schema.campaigns.userId, userId),
                ilike(schema.campaigns.name, `%${name}%`)
            )
        });
    }

    async createCampaign(campaignData: schema.InsertCampaign): Promise<schema.Campaign> {
        const result = await this.db.insert(schema.campaigns).values(campaignData).returning();
        return result[0];
    }

    async getCampaignWithDetails(id: number, userId: number): Promise<schema.FullCampaignData | undefined> {
        return this.db.query.campaigns.findFirst({
            where: and(eq(schema.campaigns.id, id), eq(schema.campaigns.userId, userId)),
            with: {
                phases: {
                    orderBy: (phases, { asc }) => [asc(phases.order)],
                    with: {
                        tasks: {
                            orderBy: (tasks, { asc }) => [asc(tasks.startDate)],
                            with: {
                                assignee: { columns: { id: true, username: true } }
                            }
                        }
                    }
                }
            }
        });
    }

    async updateCampaign(id: number, userId: number, campaignData: Partial<schema.InsertCampaign>): Promise<schema.Campaign | undefined> {
        const result = await this.db.update(schema.campaigns)
            .set({ ...campaignData, updatedAt: new Date() })
            .where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.userId, userId)))
            .returning();
        return result[0];
    }

    async deleteCampaign(id: number, userId: number): Promise<void> {
        await this.db.delete(schema.campaigns).where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.userId, userId)));
    }

    async createCampaignFromTemplate(newCampaignData: schema.InsertCampaign, templateId: number): Promise<schema.Campaign> {
        const template = await this.db.query.campaigns.findFirst({
            where: and(eq(schema.campaigns.id, templateId), eq(schema.campaigns.isTemplate, true)),
            with: { phases: { with: { tasks: true } } }
        });

        if (!template) {
            throw new Error('Template não encontrado.');
        }

        const campaign = await this.createCampaign({ ...template, ...newCampaignData, isTemplate: false });

        for (const phase of template.phases) {
            const newPhase = await this.createPhase(campaign.id, { name: phase.name, order: phase.order });
            for (const task of phase.tasks) {
                await this.createTask({ ...task, phaseId: newPhase.id });
            }
        }
        return campaign;
    }

    async createPhase(campaignId: number, phaseData: Omit<schema.InsertCampaignPhase, 'campaignId'>): Promise<schema.CampaignPhase> {
        const result = await this.db.insert(schema.campaignPhases).values({ ...phaseData, campaignId }).returning();
        return result[0];
    }

    // --- Métodos de Tarefas ---
    async createTask(taskData: schema.InsertCampaignTask): Promise<schema.CampaignTask> {
        const result = await this.db.insert(schema.campaignTasks).values(taskData).returning();
        return result[0];
    }

    async updateTask(taskId: number, taskData: Partial<schema.InsertCampaignTask>): Promise<schema.CampaignTask | undefined> {
        const result = await this.db.update(schema.campaignTasks).set(taskData).where(eq(schema.campaignTasks.id, taskId)).returning();
        return result[0];
    }

    async deleteTask(taskId: number): Promise<void> {
        await this.db.delete(schema.campaignTasks).where(eq(schema.campaignTasks.id, taskId));
    }
}

export const campaignsStorage = new CampaignsStorage();
