import { db } from './db';
import * as schema from '../shared/schema';
import { eq, count, sum, desc, and, or, gte, isNull, asc, ilike } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const chartColors = { palette: [ 'rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)', 'rgba(200, 200, 200, 1)' ], background: [ 'rgba(75, 192, 192, 0.2)', 'rgba(255, 99, 132, 0.2)', 'rgba(54, 162, 235, 0.2)', 'rgba(255, 206, 86, 0.2)', 'rgba(153, 102, 255, 0.2)', 'rgba(255, 159, 64, 0.2)', 'rgba(200, 200, 200, 0.2)' ] };
function generateSimulatedLineChartData(label: string, startValue: number, countNum: number, maxFluctuation: number, color: string): { labels: string[], datasets: { label: string, data: number[], borderColor: string, backgroundColor: string, fill: boolean, tension: number }[] } { const dataPoints: number[] = []; const labels: string[] = []; let currentValue = startValue; for (let i = 0; i < countNum; i++) { labels.push(`Dia ${i + 1}`); dataPoints.push(Math.round(currentValue)); currentValue += (Math.random() * maxFluctuation * 2) - maxFluctuation; if (currentValue < 0) currentValue = 0; } return { labels: labels, datasets: [ { label: label, data: dataPoints, borderColor: color, backgroundColor: color.replace('1)', '0.2)'), fill: true, tension: 0.4, }, ], }; }
function generateSimulatedBarChartData(label: string, categories: string[], baseValue: number, maxFluctuation: number, colors: string[]): { labels: string[], datasets: { label: string, data: number[], backgroundColor: string[] }[] } { const dataPoints: number[] = categories.map(() => Math.round(baseValue + (Math.random() * maxFluctuation * 2) - maxFluctuation)); return { labels: categories, datasets: [ { label: label, data: dataPoints, backgroundColor: colors, }, ], }; }
function generateSimulatedDoughnutChartData(chartLabels: string[], baseValue: number, maxFluctuation: number, colors: string[]): { labels: string[], datasets: { data: number[], backgroundColor: string[], borderWidth: number }[] } { const dataPoints: number[] = chartLabels.map(() => Math.round(baseValue + (Math.random() * maxFluctuation * 2) - maxFluctuation)); return { labels: chartLabels, datasets: [ { data: dataPoints, backgroundColor: colors.map(color => color.replace('1)', '0.8)')), borderWidth: 0, }, ], }; }

export class DatabaseStorage {
  async getUser(id: number): Promise<schema.User | undefined> { const result = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1); return result[0]; }
  async getAllUsers(): Promise<Omit<schema.User, 'password'>[]> { return db.select({ id: schema.users.id, username: schema.users.username, email: schema.users.email, createdAt: schema.users.createdAt, updatedAt: schema.users.updatedAt }).from(schema.users).orderBy(asc(schema.users.username)); }
  async getUserByUsername(username: string): Promise<schema.User | undefined> { const result = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1); return result[0]; }
  async getUserByEmail(email: string): Promise<schema.User | undefined> { const result = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1); return result[0]; }
  async createUser(userData: schema.InsertUser): Promise<schema.User> { const passwordToSave = userData.password ? await bcrypt.hash(userData.password, 10) : null; const [newUser] = await db.insert(schema.users).values({ ...userData, password: passwordToSave, }).returning(); if (!newUser) throw new Error("Falha ao criar usuário."); return newUser; }
  async validatePassword(password: string, hashedPassword: string | null): Promise<boolean> { if (!hashedPassword) return false; return bcrypt.compare(password, hashedPassword); }
  async getCampaigns(userId: number, limit?: number): Promise<schema.Campaign[]> { let query = db.select().from(schema.campaigns).where(eq(schema.campaigns.userId, userId)).orderBy(desc(schema.campaigns.createdAt)); if (limit) { return query.limit(limit); } return query; }
  async getCampaignWithDetails(id: number, userId: number) { return await db.query.campaigns.findFirst({ where: and(eq(schema.campaigns.id, id), eq(schema.campaigns.userId, userId)), with: { phases: { orderBy: [asc(schema.campaignPhases.order)], with: { tasks: { orderBy: [asc(schema.campaignTasks.startDate), asc(schema.campaignTasks.id)], with: { assignee: { columns: { id: true, username: true } } } } } } } }); }
  async getCampaign(id: number, userId: number): Promise<schema.Campaign | undefined> { const [campaign] = await db.select().from(schema.campaigns).where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.userId, userId))).limit(1); return campaign; }
  
  async searchCampaignsByName(userId: number, nameFragment: string): Promise<schema.Campaign[]> {
    if (!nameFragment || nameFragment.trim() === '') return [];
    return db.select()
      .from(schema.campaigns)
      .where(
        and(
          eq(schema.campaigns.userId, userId),
          ilike(schema.campaigns.name, `%${nameFragment}%`)
        )
      )
      .orderBy(desc(schema.campaigns.createdAt));
  }

  async getPhaseByName(campaignId: number, phaseName: string): Promise<schema.CampaignPhase | undefined> {
    const result = await db.select()
      .from(schema.campaignPhases)
      .where(
        and(
          eq(schema.campaignPhases.campaignId, campaignId),
          ilike(schema.campaignPhases.name, `%${phaseName}%`)
        )
      )
      .limit(1);
    return result[0];
  }

  async createCampaign(campaignData: schema.InsertCampaign): Promise<schema.Campaign> {
    const [newCampaign] = await db.insert(schema.campaigns).values(campaignData).returning();
    if (!newCampaign) throw new Error("Falha ao criar campanha.");
    const defaultPhases = ['Planejamento', 'Aquisição', 'Aquecimento', 'Evento', 'Carrinho', 'Recuperação', 'Downsell', 'Debriefing'];
    for (let i = 0; i < defaultPhases.length; i++) {
        await db.insert(schema.campaignPhases).values({ campaignId: newCampaign.id, name: defaultPhases[i], order: i });
    }
    return newCampaign;
  }

    async createCampaignFromTemplate(campaignData: schema.InsertCampaign, templateId: number): Promise<schema.Campaign> {
    const template = await db.query.campaigns.findFirst({
        where: and(eq(schema.campaigns.id, templateId), eq(schema.campaigns.isTemplate, true)),
        with: { phases: { with: { tasks: true } } }
    });

    if (!template) throw new Error("Template não encontrado.");

    const newCampaignData = {
        ...campaignData,
        description: campaignData.description || template.description,
        platforms: campaignData.platforms && campaignData.platforms.length > 0 ? campaignData.platforms : template.platforms,
        objectives: campaignData.objectives && campaignData.objectives.length > 0 ? campaignData.objectives : template.objectives,
        targetAudience: campaignData.targetAudience || template.targetAudience,
        industry: campaignData.industry || template.industry,
        isTemplate: false,
    };
    
    const [newCampaign] = await db.insert(schema.campaigns).values(newCampaignData).returning();

    if (!newCampaign) throw new Error("Falha ao criar campanha a partir do template.");

    if (template.phases) {
        for (const phase of template.phases) {
            const [newPhase] = await db.insert(schema.campaignPhases).values({
                campaignId: newCampaign.id,
                name: phase.name,
                order: phase.order,
                startDate: newCampaign.startDate,
                endDate: newCampaign.endDate
            }).returning();

            if (phase.tasks) {
                for (const task of phase.tasks) {
                    await db.insert(schema.campaignTasks).values({
                        phaseId: newPhase.id,
                        name: task.name,
                        description: task.description,
                        status: 'pending',
                        assigneeId: task.assigneeId
                    });
                }
            }
        }
    }
    return newCampaign;
}

  async updateCampaign(id: number, userId: number, data: Partial<Omit<schema.InsertCampaign, 'userId'>> & { phases?: Partial<schema.InsertCampaignPhase>[] }) {
    const { phases, ...campaignData } = data;
    await db.transaction(async (tx) => {
        if (Object.keys(campaignData).length > 0) {
            await tx.update(schema.campaigns).set({ ...campaignData, updatedAt: new Date() }).where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.userId, userId)));
        }
        if (phases) {
            for (const phaseData of phases) {
                if (phaseData.id && phaseData.startDate && phaseData.endDate) {
                    await tx.update(schema.campaignPhases).set({ startDate: phaseData.startDate, endDate: phaseData.endDate }).where(eq(schema.campaignPhases.id, phaseData.id));
                }
            }
        }
    });
    return await this.getCampaignWithDetails(id, userId);
  }

  async deleteCampaign(id: number, userId: number): Promise<boolean> { const result = await db.delete(schema.campaigns).where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.userId, userId))); return (result.rowCount ?? 0) > 0; }
  async getCreatives(userId: number, campaignId?: number | null): Promise<schema.Creative[]> { const conditions = [eq(schema.creatives.userId, userId)]; if (campaignId !== undefined) { conditions.push(campaignId === null ? isNull(schema.creatives.campaignId) : eq(schema.creatives.campaignId, campaignId)); } return db.select().from(schema.creatives).where(and(...conditions)).orderBy(desc(schema.creatives.createdAt));}
  async getCreative(id: number, userId: number): Promise<schema.Creative | undefined> { const [creative] = await db.select().from(schema.creatives).where(and(eq(schema.creatives.id, id), eq(schema.creatives.userId, userId))).limit(1); return creative; }
  async createCreative(creativeData: schema.InsertCreative): Promise<schema.Creative> { const [newCreative] = await db.insert(schema.creatives).values(creativeData).returning(); if (!newCreative) throw new Error("Falha ao criar criativo."); return newCreative; }
  async updateCreative(id: number, creativeData: Partial<Omit<schema.InsertCreative, 'userId'>>, userId: number): Promise<schema.Creative | undefined> { const [updatedCreative] = await db.update(schema.creatives).set({ ...creativeData, updatedAt: new Date() }).where(and(eq(schema.creatives.id, id), eq(schema.creatives.userId, userId))).returning(); return updatedCreative; }
  async deleteCreative(id: number, userId: number): Promise<boolean> { const result = await db.delete(schema.creatives).where(and(eq(schema.creatives.id, id), eq(schema.creatives.userId, userId))); return (result.rowCount ?? 0) > 0; }
  async getMetricsForCampaign(campaignId: number, userId: number): Promise<schema.Metric[]> { return db.select().from(schema.metrics).where(and(eq(schema.metrics.campaignId, campaignId), eq(schema.metrics.userId, userId))).orderBy(desc(schema.metrics.date)); }
  async createMetric(metricData: z.infer<typeof schema.insertMetricSchema>): Promise<schema.Metric> { const [newMetric] = await db.insert(schema.metrics).values(metricData).returning(); if (!newMetric) throw new Error("Falha ao criar métrica."); return newMetric; }
  async getMessages(userId: number, contactNumber?: string): Promise<schema.WhatsappMessage[]> { const conditions = [eq(schema.whatsappMessages.userId, userId)]; if (contactNumber) { conditions.push(eq(schema.whatsappMessages.contactNumber, contactNumber)); } return db.select().from(schema.whatsappMessages).where(and(...conditions)).orderBy(asc(schema.whatsappMessages.timestamp)); }
  async createMessage(messageData: schema.InsertWhatsappMessage): Promise<schema.WhatsappMessage> { const [newMessage] = await db.insert(schema.whatsappMessages).values(messageData).returning(); if (!newMessage) throw new Error("Falha ao criar mensagem."); return newMessage; }
  async markMessageAsRead(id: number, userId: number): Promise<boolean> { const result = await db.update(schema.whatsappMessages).set({ isRead: true }).where(and(eq(schema.whatsappMessages.id, id), eq(schema.whatsappMessages.userId, userId), eq(schema.whatsappMessages.isRead, false))); return (result.rowCount ?? 0) > 0; }
  async getContacts(userId: number): Promise<{ contactNumber: string; contactName: string | null; lastMessage: string; timestamp: Date, unreadCount: number }[]> { const allMessages = await db.select().from(schema.whatsappMessages).where(eq(schema.whatsappMessages.userId, userId)).orderBy(desc(schema.whatsappMessages.timestamp)); const contactsMap = new Map<string, { contactNumber: string; contactName: string | null; lastMessage: string; timestamp: Date, unreadCount: number }>(); for (const msg of allMessages) { if (!contactsMap.has(msg.contactNumber)) { contactsMap.set(msg.contactNumber, { contactNumber: msg.contactNumber, contactName: msg.contactName || null, lastMessage: msg.message, timestamp: new Date(msg.timestamp), unreadCount: 0, }); } const contact = contactsMap.get(msg.contactNumber)!; if (!msg.isRead && msg.direction === 'incoming') { contact.unreadCount++; } } return Array.from(contactsMap.values()).sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()); }
  async getCopies(userId: number, campaignId?: number | null, phase?: string, purposeKey?: string, searchTerm?: string): Promise<schema.Copy[]> { const conditions: any[] = [eq(schema.copies.userId, userId)]; if (campaignId !== undefined) { conditions.push(campaignId === null ? isNull(schema.copies.campaignId) : eq(schema.copies.campaignId, campaignId)); } if (phase && phase !== 'all') { conditions.push(eq(schema.copies.launchPhase, phase as schema.LaunchPhase));} if (purposeKey && purposeKey !== 'all') { conditions.push(eq(schema.copies.purposeKey, purposeKey)); } if (searchTerm && searchTerm.trim() !== '') { const searchPattern = `%${searchTerm.toLowerCase()}%`; conditions.push( or( ilike(schema.copies.title, searchPattern), ilike(schema.copies.content, searchPattern) )); } return db.select().from(schema.copies).where(and(...conditions)).orderBy(desc(schema.copies.createdAt)); }
  async createCopy(copyData: schema.InsertCopy): Promise<schema.Copy> { const [newCopy] = await db.insert(schema.copies).values(copyData).returning(); if (!newCopy) throw new Error("Falha ao salvar a copy."); return newCopy; }
  async updateCopy(id: number, copyData: Partial<Omit<schema.InsertCopy, 'userId' | 'id' | 'createdAt'>>, userId: number): Promise<schema.Copy | undefined> { const [updatedCopy] = await db.update(schema.copies).set({ ...copyData, lastUpdatedAt: new Date() }).where(and(eq(schema.copies.id, id), eq(schema.copies.userId, userId))).returning(); return updatedCopy; }
  async deleteCopy(id: number, userId: number): Promise<boolean> { const result = await db.delete(schema.copies).where(and(eq(schema.copies.id, id), eq(schema.copies.userId, userId))); return (result.rowCount ?? 0) > 0; }
  async getAlerts(userId: number, onlyUnread?: boolean): Promise<schema.Alert[]> { const conditions = [eq(schema.alerts.userId, userId)]; if (onlyUnread) { conditions.push(eq(schema.alerts.isRead, false)); } return db.select().from(schema.alerts).where(and(...conditions)).orderBy(desc(schema.alerts.createdAt)); }
  async createAlert(alertData: schema.InsertAlert): Promise<schema.Alert> { const [newAlert] = await db.insert(schema.alerts).values(alertData).returning(); if (!newAlert) throw new Error("Falha ao criar alerta."); return newAlert; }
  async markAlertAsRead(id: number, userId: number): Promise<boolean> { const result = await db.update(schema.alerts).set({ isRead: true }).where(and(eq(schema.alerts.id, id), eq(schema.alerts.userId, userId), eq(schema.alerts.isRead, false))); return (result.rowCount ?? 0) > 0; }
  async markAllAlertsAsRead(userId: number): Promise<boolean> { const result = await db.update(schema.alerts).set({ isRead: true }).where(and(eq(schema.alerts.userId, userId), eq(schema.alerts.isRead, false))); return (result.rowCount ?? 0) > 0; }
  async getBudgets(userId: number, campaignId?: number | null): Promise<schema.Budget[]> { const conditions = [eq(schema.budgets.userId, userId)]; if (campaignId !== undefined) { conditions.push(campaignId === null ? isNull(schema.budgets.campaignId) : eq(schema.budgets.campaignId, campaignId)); } return db.select().from(schema.budgets).where(and(...conditions)).orderBy(desc(schema.budgets.createdAt)); }
  async createBudget(budgetData: schema.InsertBudget): Promise<schema.Budget> { const [newBudget] = await db.insert(schema.budgets).values(budgetData).returning(); if (!newBudget) throw new Error("Falha ao criar orçamento."); return newBudget; }
  async updateBudget(id: number, budgetData: Partial<Omit<schema.InsertBudget, 'userId' | 'campaignId'>>, userId: number): Promise<schema.Budget | undefined> { const [updatedBudget] = await db.update(schema.budgets).set(budgetData).where(and(eq(schema.budgets.id, id), eq(schema.budgets.userId, userId))).returning(); return updatedBudget; }
  async getLandingPages(userId: number): Promise<schema.LandingPage[]> { return db.select().from(schema.landingPages).where(eq(schema.landingPages.userId, userId)).orderBy(desc(schema.landingPages.createdAt)); }
  async getLandingPage(id: number, userId: number): Promise<schema.LandingPage | undefined> { const [lp] = await db.select().from(schema.landingPages).where(and(eq(schema.landingPages.id, id), eq(schema.landingPages.userId, userId))).limit(1); return lp; }
  async getLandingPageBySlug(slug: string): Promise<schema.LandingPage | undefined> { const [lp] = await db.select().from(schema.landingPages).where(eq(schema.landingPages.slug, slug)).limit(1); return lp; }
  async getLandingPageByStudioProjectId(studioProjectId: string, userId: number): Promise<schema.LandingPage | undefined> { const [lp] = await db.select().from(schema.landingPages).where(and(eq(schema.landingPages.studioProjectId, studioProjectId), eq(schema.landingPages.userId, userId))).limit(1); return lp; }
  async createLandingPage(lpData: schema.InsertLandingPage): Promise<schema.LandingPage> { const [newLP] = await db.insert(schema.landingPages).values(lpData).returning(); if (!newLP) throw new Error("Falha ao criar landing page."); return newLP; }
  async updateLandingPage(id: number, lpData: Partial<Omit<schema.InsertLandingPage, 'userId'>>, userId: number): Promise<schema.LandingPage | undefined> { const [updatedLP] = await db.update(schema.landingPages).set({ ...lpData, updatedAt: new Date() }).where(and(eq(schema.landingPages.id, id), eq(schema.landingPages.userId, userId))).returning(); return updatedLP; }
  async deleteLandingPage(id: number, userId: number): Promise<boolean> { const result = await db.delete(schema.landingPages).where(and(eq(schema.landingPages.id, id), eq(schema.landingPages.userId, userId))); return (result.rowCount ?? 0) > 0; }
  async createChatSession(userId: number, title: string = 'Nova Conversa'): Promise<schema.ChatSession> { const [newSession] = await db.insert(schema.chatSessions).values({ userId, title, createdAt: new Date(), updatedAt: new Date() }).returning(); if (!newSession) throw new Error("Falha ao criar sessão de chat."); return newSession; }
  async getChatSession(sessionId: number, userId: number): Promise<schema.ChatSession | undefined> { const [session] = await db.select().from(schema.chatSessions).where(and(eq(schema.chatSessions.id, sessionId), eq(schema.chatSessions.userId, userId))).limit(1); return session; }
  async getChatSessions(userId: number): Promise<schema.ChatSession[]> { return db.select().from(schema.chatSessions).where(eq(schema.chatSessions.userId, userId)).orderBy(desc(schema.chatSessions.updatedAt)); }
  async updateChatSessionTitle(sessionId: number, userId: number, newTitle: string): Promise<schema.ChatSession | undefined> { const [updatedSession] = await db.update(schema.chatSessions).set({ title: newTitle, updatedAt: new Date() }).where(and(eq(schema.chatSessions.id, sessionId), eq(schema.chatSessions.userId, userId))).returning(); return updatedSession; }
  async deleteChatSession(sessionId: number, userId: number): Promise<boolean> { const result = await db.delete(schema.chatSessions).where(and(eq(schema.chatSessions.id, sessionId), eq(schema.chatSessions.userId, userId))); return (result.rowCount ?? 0) > 0; }
  async addChatMessage(messageData: schema.InsertChatMessage): Promise<schema.ChatMessage> { const [newMessage] = await db.insert(schema.chatMessages).values({ ...messageData, timestamp: new Date() }).returning(); if (!newMessage) throw new Error("Falha ao adicionar mensagem."); await db.update(schema.chatSessions).set({ updatedAt: new Date() }).where(eq(schema.chatSessions.id, messageData.sessionId)); return newMessage; }
  async getChatMessages(sessionId: number, userId: number): Promise<schema.ChatMessage[]> { const sessionExists = await db.query.chatSessions.findFirst({ where: and(eq(schema.chatSessions.id, sessionId), eq(schema.chatSessions.userId, userId)) }); if (!sessionExists) return []; return db.select().from(schema.chatMessages).where(eq(schema.chatMessages.sessionId, sessionId)).orderBy(asc(schema.chatMessages.timestamp)); }
  async createTask(taskData: schema.InsertCampaignTask): Promise<schema.CampaignTask> { const [newTask] = await db.insert(schema.campaignTasks).values(taskData).returning(); if (!newTask) throw new Error("Falha ao criar tarefa."); return newTask; }
  async updateTask(id: number, taskData: Partial<Omit<schema.InsertCampaignTask, 'phaseId'>>): Promise<schema.CampaignTask | undefined> { const [updatedTask] = await db.update(schema.campaignTasks).set(taskData).where(eq(schema.campaignTasks.id, id)).returning(); return updatedTask; }
  async deleteTask(id: number): Promise<boolean> { const result = await db.delete(schema.campaignTasks).where(eq(schema.campaignTasks.id, id)); return (result.rowCount ?? 0) > 0; }
  async getDashboardData(userId: number, timeRange: string = '30d'): Promise<any> { const now = new Date(); let startDate = new Date(); if (timeRange === '7d') startDate.setDate(now.getDate() - 7); else startDate.setDate(now.getDate() - 30); const metricsTimeCondition = and(eq(schema.metrics.userId, userId), gte(schema.metrics.date, startDate)); const [activeCampaignsResult] = await db.select({ count: count() }).from(schema.campaigns).where(and(eq(schema.campaigns.userId, userId), eq(schema.campaigns.status, 'active'))); const [totalSpentResult] = await db.select({ total: sum(schema.budgets.spentAmount) }).from(schema.budgets).where(eq(schema.budgets.userId, userId)); const [totalConversionsResult] = await db.select({ total: sum(schema.metrics.conversions) }).from(schema.metrics).where(metricsTimeCondition); const [totalRevenueResult] = await db.select({ total: sum(schema.metrics.revenue) }).from(schema.metrics).where(metricsTimeCondition); const [totalCostResult] = await db.select({ total: sum(schema.metrics.cost) }).from(schema.metrics).where(metricsTimeCondition); const [totalImpressionsResult] = await db.select({ total: sum(schema.metrics.impressions) }).from(schema.metrics).where(metricsTimeCondition); const [totalClicksResult] = await db.select({ total: sum(schema.metrics.clicks) }).from(schema.metrics).where(metricsTimeCondition); const totalCost = parseFloat(String(totalCostResult?.total || '0')) || 0; const totalRevenue = parseFloat(String(totalRevenueResult?.total || '0')) || 0; const clicks = parseFloat(String(totalClicksResult?.total || '0')) || 0; const impressions = parseFloat(String(totalImpressionsResult?.total || '0')) || 0; const metricsData = { activeCampaigns: activeCampaignsResult?.count || 0, totalSpent: parseFloat(String(totalSpentResult?.total || "0")) || 0, conversions: parseFloat(String(totalConversionsResult?.total || '0')) || 0, avgROI: totalCost > 0 ? parseFloat((((totalRevenue - totalCost) / totalCost) * 100).toFixed(2)) : 0, impressions, clicks, ctr: clicks > 0 && impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0, cpc: clicks > 0 && totalCost > 0 ? parseFloat((totalCost / clicks).toFixed(2)) : 0, totalCostPeriod: totalCost, }; const recentCampaigns = await this.getCampaigns(userId, 3); return { metrics: metricsData, recentCampaigns, alertCount: (await db.select({ count: count() }).from(schema.alerts).where(and(eq(schema.alerts.userId, userId), eq(schema.alerts.isRead, false))))[0]?.count || 0, trends: { campaignsChange: (Math.random() * 20 - 10), spentChange: (Math.random() * 20 - 10), conversionsChange: (Math.random() * 30 - 15), roiChange: (Math.random() * 10 - 5) }, timeSeriesData: generateSimulatedLineChartData('Desempenho Geral', 1000, 30, 50, chartColors.palette[0]), channelPerformanceData: generateSimulatedDoughnutChartData(['Meta', 'Google', 'LinkedIn'], 20, 10, chartColors.palette), conversionData: generateSimulatedLineChartData('Conversões', 200, 30, 30, chartColors.palette[1]), roiData: generateSimulatedBarChartData('ROI (%)', ['Meta', 'Google', 'LinkedIn'], 250, 100, chartColors.palette), }; }
  async getFunnels(userId: number, campaignId?: number | null): Promise<schema.Funnel[]> { return db.query.funnels.findMany({ where: (funnels, { eq, and, isNull }) => and(eq(funnels.userId, userId), campaignId !== undefined ? (campaignId === null ? isNull(funnels.campaignId) : eq(funnels.campaignId, campaignId)) : undefined), with: { stages: { orderBy: [asc(schema.funnelStages.order)] } }, orderBy: [desc(schema.funnels.createdAt)] }); }
  async getFunnel(id: number, userId: number): Promise<schema.Funnel | undefined> { return db.query.funnels.findFirst({ where: and(eq(schema.funnels.id, id), eq(schema.funnels.userId, userId)), with: { stages: { orderBy: [asc(schema.funnelStages.order)] } } }); }
  async createFunnel(funnelData: schema.InsertFunnel): Promise<schema.Funnel> { const [newFunnel] = await db.insert(schema.funnels).values(funnelData).returning(); return newFunnel; }
  async updateFunnel(id: number, funnelData: Partial<Omit<schema.InsertFunnel, 'userId' | 'campaignId'>>, userId: number): Promise<schema.Funnel | undefined> { const [updatedFunnel] = await db.update(schema.funnels).set({ ...funnelData, updatedAt: new Date() }).where(and(eq(schema.funnels.id, id), eq(schema.funnels.userId, userId))).returning(); return updatedFunnel; }
  async deleteFunnel(id: number, userId: number): Promise<boolean> { const result = await db.delete(schema.funnels).where(and(eq(schema.funnels.id, id), eq(schema.funnels.userId, userId))); return (result.rowCount ?? 0) > 0; }
  async getFunnelStages(funnelId: number, userId: number): Promise<schema.FunnelStage[]> { const funnelOwner = await db.query.funnels.findFirst({ columns: { id: true }, where: and(eq(schema.funnels.id, funnelId), eq(schema.funnels.userId, userId)) }); if (!funnelOwner) return []; return db.select().from(schema.funnelStages).where(eq(schema.funnelStages.funnelId, funnelId)).orderBy(asc(schema.funnelStages.order), desc(schema.funnelStages.createdAt)); }
  async createFunnelStage(stageData: schema.InsertFunnelStage): Promise<schema.FunnelStage> { const [newStage] = await db.insert(schema.funnelStages).values(stageData).returning(); return newStage; }
  async updateFunnelStage(id: number, stageData: Partial<Omit<schema.InsertFunnelStage, 'funnelId'>>, userId: number): Promise<schema.FunnelStage | undefined> { const [updatedStage] = await db.update(schema.funnelStages).set({ ...stageData, updatedAt: new Date() }).where(eq(schema.funnelStages.id, id)).returning(); return updatedStage; }
  async deleteFunnelStage(id: number, userId: number): Promise<boolean> { const result = await db.delete(schema.funnelStages).where(eq(schema.funnelStages.id, id)); return (result.rowCount ?? 0) > 0; }
  async getActiveFlow(userId: number): Promise<schema.Flow | undefined> { const [activeFlow] = await db.select().from(schema.flows).where(and(eq(schema.flows.userId, userId), eq(schema.flows.status, 'active'))).orderBy(desc(schema.flows.updatedAt)).limit(1); return activeFlow; }
  async getFlows(userId: number, campaignId?: number | null): Promise<schema.Flow[]> { const conditions: any[] = [eq(schema.flows.userId, userId)]; if (campaignId !== undefined) { conditions.push(campaignId === null ? isNull(schema.flows.campaignId) : eq(schema.flows.campaignId, campaignId)); } return db.select().from(schema.flows).where(and(...conditions)).orderBy(desc(schema.flows.createdAt)); }
  async getFlow(id: number, userId: number): Promise<schema.Flow | undefined> { const [flow] = await db.select().from(schema.flows).where(and(eq(schema.flows.id, id), eq(schema.flows.userId, userId))).limit(1); return flow;}
  async createFlow(flowData: schema.InsertFlow): Promise<schema.Flow> { const [newFlow] = await db.insert(schema.flows).values(flowData).returning(); console.log('[DB_CREATE_FLOW] Fluxo criado no banco:', JSON.stringify(newFlow)); return newFlow; }
  async updateFlow(id: number, flowData: Partial<Omit<schema.InsertFlow, 'userId'>>, userId: number): Promise<schema.Flow | undefined> { const dataToSet = { ...flowData, updatedAt: new Date(), }; const [updatedFlow] = await db.update(schema.flows).set(dataToSet).where(and(eq(schema.flows.id, id), eq(schema.flows.userId, userId))).returning(); console.log('[DB_UPDATE_FLOW] Fluxo atualizado no banco. Retorno:', JSON.stringify(updatedFlow)); return updatedFlow; }
  async deleteFlow(id: number, userId: number): Promise<boolean> { const result = await db.delete(schema.flows).where(and(eq(schema.flows.id, id), eq(schema.flows.userId, userId))); return (result.rowCount ?? 0) > 0; }
}

export const storage = new DatabaseStorage();
