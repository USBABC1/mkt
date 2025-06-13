// server/storage.ts
import { db } from './db';
import * as schema from '../shared/schema';
import { eq, and, desc, sql, gte, lte, isNull, ilike, or } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { subDays } from 'date-fns';

export class DatabaseStorage {
    private db = db;

    // --- Métodos de Usuário ---
    async getUser(id: number): Promise<schema.User | undefined> {
        return this.db.query.users.findFirst({ where: eq(schema.users.id, id) });
    }

    async getUserByEmail(email: string): Promise<schema.User | undefined> {
        return this.db.query.users.findFirst({ where: eq(schema.users.email, email) });
    }

    async createUser(userData: schema.InsertUser): Promise<schema.User> {
        const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 10) : null;
        const result = await this.db.insert(schema.users).values({ ...userData, password: hashedPassword }).returning();
        return result[0];
    }

    async validatePassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }
    
    async getAllUsers(): Promise<Pick<schema.User, 'id' | 'username'>[]> {
        return this.db.select({ id: schema.users.id, username: schema.users.username }).from(schema.users);
    }

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


    // --- Métodos de Criativos ---
    async getCreatives(userId: number, campaignId?: number | null): Promise<schema.Creative[]> {
        const whereClause = campaignId === null 
            ? and(eq(schema.creatives.userId, userId), isNull(schema.creatives.campaignId))
            : campaignId !== undefined
                ? and(eq(schema.creatives.userId, userId), eq(schema.creatives.campaignId, campaignId))
                : eq(schema.creatives.userId, userId);
        return this.db.select().from(schema.creatives).where(whereClause);
    }

    async createCreative(creativeData: schema.InsertCreative): Promise<schema.Creative> {
        const result = await this.db.insert(schema.creatives).values(creativeData).returning();
        return result[0];
    }
    
    async getCreative(id: number, userId: number): Promise<schema.Creative | undefined> {
        return this.db.query.creatives.findFirst({ where: and(eq(schema.creatives.id, id), eq(schema.creatives.userId, userId)) });
    }

    async updateCreative(id: number, creativeData: Partial<schema.InsertCreative>, userId: number): Promise<schema.Creative | undefined> {
        const result = await this.db.update(schema.creatives)
            .set({ ...creativeData, updatedAt: new Date() })
            .where(and(eq(schema.creatives.id, id), eq(schema.creatives.userId, userId)))
            .returning();
        return result[0];
    }

    async deleteCreative(id: number, userId: number): Promise<void> {
        await this.db.delete(schema.creatives).where(and(eq(schema.creatives.id, id), eq(schema.creatives.userId, userId)));
    }
    
    // Métodos de Landing Pages foram movidos para server/api/landingpages.storage.ts

    // --- Métodos de Copies ---
    async getCopies(userId: number, campaignId?: number, phase?: string, purpose?: string, search?: string) {
        let query = this.db.select().from(schema.copies).where(eq(schema.copies.userId, userId)).$dynamic();
        
        if (campaignId) query = query.where(eq(schema.copies.campaignId, campaignId));
        if (phase) query = query.where(eq(schema.copies.launchPhase, phase as any));
        if (purpose) query = query.where(eq(schema.copies.purposeKey, purpose));
        if (search) {
          query = query.where(or(
            ilike(schema.copies.title, `%${search}%`),
            ilike(schema.copies.content, `%${search}%`)
          ));
        }

        return query.orderBy(desc(schema.copies.lastUpdatedAt));
    }
    
    async createCopy(copyData: schema.InsertCopy): Promise<schema.Copy> {
        const result = await this.db.insert(schema.copies).values(copyData).returning();
        return result[0];
    }
    
    async deleteCopy(id: number, userId: number): Promise<void> {
        await this.db.delete(schema.copies).where(and(eq(schema.copies.id, id), eq(schema.copies.userId, userId)));
    }
    
    // --- Métodos de Chat ---
    async getChatSessions(userId: number) {
        return this.db.query.chatSessions.findMany({ where: eq(schema.chatSessions.userId, userId), orderBy: [desc(schema.chatSessions.updatedAt)] });
    }

    async getChatSession(sessionId: number, userId: number): Promise<schema.ChatSession | undefined> {
        return this.db.query.chatSessions.findFirst({ where: and(eq(schema.chatSessions.id, sessionId), eq(schema.chatSessions.userId, userId)) });
    }
    
    async createChatSession(userId: number, title: string = 'Nova Conversa') {
        const result = await this.db.insert(schema.chatSessions).values({ userId, title }).returning();
        return result[0];
    }
    
    async getChatMessages(sessionId: number, userId: number) {
        const session = await this.db.query.chatSessions.findFirst({ where: and(eq(schema.chatSessions.id, sessionId), eq(schema.chatSessions.userId, userId)) });
        if (!session) return [];
        return this.db.query.chatMessages.findMany({ where: eq(schema.chatMessages.sessionId, sessionId), orderBy: (schema.chatMessages.timestamp) });
    }

    async addChatMessage(messageData: schema.InsertChatMessage): Promise<schema.ChatMessage> {
        const result = await this.db.insert(schema.chatMessages).values(messageData).returning();
        await this.db.update(schema.chatSessions).set({ updatedAt: new Date() }).where(eq(schema.chatSessions.id, messageData.sessionId));
        return result[0];
    }
    
    async updateChatSessionTitle(sessionId: number, userId: number, newTitle: string) {
        const result = await this.db.update(schema.chatSessions)
            .set({ title: newTitle, updatedAt: new Date() })
            .where(and(eq(schema.chatSessions.id, sessionId), eq(schema.chatSessions.userId, userId)))
            .returning();
        return result[0];
    }
    
    async deleteChatSession(sessionId: number, userId: number) {
        await this.db.delete(schema.chatSessions).where(and(eq(schema.chatSessions.id, sessionId), eq(schema.chatSessions.userId, userId)));
    }

    // --- Métodos de Funil ---
    async getFunnels(userId: number, campaignId?: number | null) {
      const conditions = [eq(schema.funnels.userId, userId)];
      if (campaignId !== undefined) {
        conditions.push(campaignId === null ? isNull(schema.funnels.campaignId) : eq(schema.funnels.campaignId, campaignId));
      }
      return this.db.query.funnels.findMany({ where: and(...conditions), with: { stages: true } });
    }
    async getFunnel(funnelId: number, userId: number) {
      return this.db.query.funnels.findFirst({ where: and(eq(schema.funnels.id, funnelId), eq(schema.funnels.userId, userId)), with: { stages: { orderBy: (stages, { asc }) => [asc(stages.order)] } }});
    }
    async createFunnel(funnelData: schema.InsertFunnel, userId: number) {
      const result = await this.db.insert(schema.funnels).values({ ...funnelData, userId }).returning();
      return result[0];
    }
    async updateFunnel(funnelId: number, funnelData: Partial<schema.InsertFunnel>, userId: number) {
      const result = await this.db.update(schema.funnels).set({ ...funnelData, updatedAt: new Date() }).where(and(eq(schema.funnels.id, funnelId), eq(schema.funnels.userId, userId))).returning();
      return result[0];
    }
    async deleteFunnel(funnelId: number, userId: number) {
      await this.db.delete(schema.funnels).where(and(eq(schema.funnels.id, funnelId), eq(schema.funnels.userId, userId)));
    }
    async createFunnelStage(stageData: schema.InsertFunnelStage) {
        const result = await this.db.insert(schema.funnelStages).values(stageData).returning();
        return result[0];
    }

    // --- Métodos de Alertas ---
    async getAlerts(userId: number, onlyUnread: boolean) {
        const conditions = [eq(schema.alerts.userId, userId)];
        if (onlyUnread) {
            conditions.push(eq(schema.alerts.isRead, false));
        }
        return this.db.query.alerts.findMany({ where: and(...conditions) });
    }
    async createAlert(alertData: schema.InsertAlert) {
        const result = await this.db.insert(schema.alerts).values(alertData).returning();
        return result[0];
    }
    async markAlertAsRead(alertId: number, userId: number) {
        const result = await this.db.update(schema.alerts).set({ isRead: true }).where(and(eq(schema.alerts.id, alertId), eq(schema.alerts.userId, userId))).returning();
        return result[0];
    }
    async markAllAlertsAsRead(userId: number) {
        await this.db.update(schema.alerts).set({ isRead: true }).where(eq(schema.alerts.userId, userId));
    }

    // --- Métodos de Fluxo (WhatsApp) ---
    async getActiveFlow(userId: number): Promise<schema.Flow | undefined> {
        return this.db.query.flows.findFirst({
            where: and(
                eq(schema.flows.userId, userId),
                eq(schema.flows.status, 'active')
            )
        });
    }
    
    // --- Métodos de Dashboard/Métricas ---
    async getDashboardData(userId: number, timeRange: string = '30d') {
        const days = parseInt(timeRange.replace('d', ''));
        const startDate = subDays(new Date(), days);

        const metricsData = await this.db.select({
            impressions: sql<number>`sum(${schema.metrics.impressions})`.mapWith(Number),
            clicks: sql<number>`sum(${schema.metrics.clicks})`.mapWith(Number),
            conversions: sql<number>`sum(${schema.metrics.conversions})`.mapWith(Number),
            cost: sql<number>`sum(${schema.metrics.cost})`.mapWith(Number),
            revenue: sql<number>`sum(${schema.metrics.revenue})`.mapWith(Number),
        })
        .from(schema.metrics)
        .where(and(
            eq(schema.metrics.userId, userId),
            gte(schema.metrics.date, startDate)
        ));

        const activeCampaigns = await this.db.select({
            count: sql<number>`count(*)`
        })
        .from(schema.campaigns)
        .where(and(
            eq(schema.campaigns.userId, userId),
            eq(schema.campaigns.status, 'active')
        ));
        
        const metrics = metricsData[0] || {};
        const totalSpent = metrics.cost || 0;
        const totalRevenue = metrics.revenue || 0;
        const avgROI = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;
        
        return {
            metrics: {
                activeCampaigns: activeCampaigns[0].count,
                totalSpent: totalSpent,
                conversions: metrics.conversions || 0,
                avgROI: avgROI,
                impressions: metrics.impressions || 0,
                clicks: metrics.clicks || 0,
            }
        };
    }
}

export const storage = new DatabaseStorage();
