import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from 'drizzle-orm';

// --- Enums do Banco de Dados ---
export const campaignStatusEnum = pgEnum('campaign_status', ['active', 'paused', 'completed', 'draft']);
export const chatSenderEnum = pgEnum('chat_sender', ['user', 'agent']);
export const launchPhaseEnum = pgEnum('launch_phase', ['pre_launch', 'launch', 'post_launch']);
export const flowStatusEnum = pgEnum('flow_status', ['active', 'inactive', 'draft']);
export const integrationPlatformEnum = pgEnum('integration_platform', ['shopify', 'hotmart', 'meta', 'google']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed', 'on_hold']);

// --- Interfaces e Tipos ---
export interface FlowElementData { nodes: any[]; edges: any[]; }
export interface BaseGeneratorFormState { product: string; audience: string; objective: 'sales' | 'leads' | 'engagement' | 'awareness'; tone: 'professional' | 'casual' | 'urgent' | 'inspirational' | 'educational' | 'empathetic' | 'divertido' | 'sofisticado';}
export type LaunchPhase = z.infer<typeof launchPhaseEnum.enumValues[number]>;
export interface FieldDefinition { name: string; label: string; type: 'text' | 'textarea' | 'select' | 'number' | 'date'; placeholder?: string; tooltip: string; required?: boolean; options?: Array<{ value: string; label: string }>; defaultValue?: string | number | boolean; dependsOn?: string; showIf?: (formData: Record<string, any>, baseData?: BaseGeneratorFormState) => boolean;}
export interface CopyPurposeConfig { key: string; label: string; phase: LaunchPhase; fields: FieldDefinition[]; category: string; description?: string; promptEnhancer?: (basePrompt: string, details: Record<string, any>, baseForm: BaseGeneratorFormState) => string;}

// --- Definições de Tabelas ---
export const users = pgTable("users", { id: serial("id").primaryKey(), username: text("username").notNull().unique(), email: text("email").notNull().unique(), password: text("password"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),});
export const campaigns = pgTable("campaigns", { id: serial("id").primaryKey(), userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), name: text("name").notNull(), description: text("description"), status: campaignStatusEnum("status").default("draft").notNull(), platforms: jsonb("platforms").$type<string[]>().default([]).notNull(), objectives: jsonb("objectives").$type<string[]>().default([]).notNull(), budget: decimal("budget", { precision: 10, scale: 2 }), dailyBudget: decimal("daily_budget", { precision: 10, scale: 2 }), startDate: timestamp("start_date", { withTimezone: true }), endDate: timestamp("end_date", { withTimezone: true }), targetAudience: text("target_audience"), industry: text("industry"), avgTicket: decimal("avg_ticket", { precision: 10, scale: 2 }), isTemplate: boolean("is_template").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),});
export const campaignPhases = pgTable("campaign_phases", { id: serial("id").primaryKey(), campaignId: integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: 'cascade' }), name: text("name").notNull(), startDate: timestamp("start_date", { withTimezone: true }), endDate: timestamp("end_date", { withTimezone: true }), order: integer("order").default(0).notNull(),});
export const campaignTasks = pgTable("campaign_tasks", { id: serial("id").primaryKey(), phaseId: integer("phase_id").notNull().references(() => campaignPhases.id, { onDelete: 'cascade' }), name: text("name").notNull(), description: text("description"), status: taskStatusEnum("status").default("pending").notNull(), startDate: timestamp("start_date", { withTimezone: true }), endDate: timestamp("end_date", { withTimezone: true }), assigneeId: integer("assignee_id").references(() => users.id, { onDelete: 'set null' }),});
export const copies = pgTable("copies", { id: serial("id").primaryKey(), userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: 'set null' }), title: text("title").notNull(), content: text("content").notNull(), purposeKey: text("purpose_key").notNull(), launchPhase: launchPhaseEnum("launch_phase").notNull(), details: jsonb("details").$type<Record<string, any>>().default({}).notNull(), baseInfo: jsonb("base_info").$type<BaseGeneratorFormState | any>().default({}).notNull(), fullGeneratedResponse: jsonb("full_generated_response").$type<any>().default({}).notNull(), platform: text("platform"), isFavorite: boolean("is_favorite").default(false).notNull(), tags: jsonb("tags").$type<string[]>().default([]).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).defaultNow().notNull(),});
export const creatives = pgTable("creatives", { id: serial("id").primaryKey(), userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: 'set null' }), name: text("name").notNull(), type: text("type", { enum: ["image", "video", "text", "carousel"] }).notNull(), fileUrl: text("file_url"), content: text("content"), status: text("status", { enum: ["approved", "pending", "rejected"] }).default("pending").notNull(), platforms: jsonb("platforms").$type<string[]>().default([]).notNull(), thumbnailUrl: text("thumbnail_url"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),});
export const metrics = pgTable("metrics", { id: serial("id").primaryKey(), campaignId: integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: 'cascade' }), userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), date: timestamp("date", { withTimezone: true }).notNull(), impressions: integer("impressions").default(0).notNull(), clicks: integer("clicks").default(0).notNull(), conversions: integer("conversions").default(0).notNull(), cost: decimal("cost", { precision: 10, scale: 2 }).default("0").notNull(), revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0").notNull(), leads: integer("leads").default(0).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),});
export const whatsappMessages = pgTable("whatsapp_messages", { id: serial("id").primaryKey(), userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), contactNumber: text("contact_number").notNull(), contactName: text("contact_name"), message: text("message").notNull(), direction: text("direction", { enum: ["incoming", "outgoing"] }).notNull(), timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(), isRead: boolean("is_read").default(false).notNull(),});
export const alerts = pgTable("alerts", { id: serial("id").primaryKey(), userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: 'set null' }), type: text("type", { enum: ["budget", "performance", "approval", "system"] }).notNull(), title: text("title").notNull(), message: text("message").notNull(), isRead: boolean("is_read").default(false).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),});
export const budgets = pgTable("budgets", { id: serial("id").primaryKey(), userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: 'cascade' }), totalBudget: decimal("total_budget", { precision: 10, scale: 2 }).notNull(), spentAmount: decimal("spent_amount", { precision: 10, scale: 2 }).default("0").notNull(), period: text("period", { enum: ["daily", "weekly", "monthly", "total"] }).notNull(), startDate: timestamp("start_date", { withTimezone: true }).notNull(), endDate: timestamp("end_date", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),});
export const landingPages = pgTable("landing_pages", { id: serial("id").primaryKey(), userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), name: text("name").notNull(), studioProjectId: varchar("studio_project_id", { length: 255 }).unique(), slug: varchar("slug", { length: 255 }).notNull().unique(), description: text("description"), grapesJsData: jsonb("grapes_js_data"), status: text("status", { enum: ["draft", "published", "archived"] }).default("draft").notNull(), publicUrl: text("public_url"), publishedAt: timestamp("published_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),});
export const chatSessions = pgTable('chat_sessions', { id: serial('id').primaryKey(), userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), title: text('title').notNull().default('Nova Conversa'), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),});
export const chatMessages = pgTable('chat_messages', { id: serial('id').primaryKey(), sessionId: integer('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }), sender: chatSenderEnum('sender').notNull(), text: text('text').notNull(), attachmentUrl: text('attachment_url'), timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),});
export const funnels = pgTable("funnels", { id: serial("id").primaryKey(), userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: 'set null' }), name: text("name").notNull(), description: text("description"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),});
export const funnelStages = pgTable("funnel_stages", { id: serial("id").primaryKey(), funnelId: integer("funnel_id").notNull().references(() => funnels.id, { onDelete: 'cascade' }), name: text("name").notNull(), description: text("description"), order: integer("order").notNull().default(0), config: jsonb("config").$type<Record<string, any>>().default({}), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),});
export const flows = pgTable("flows", { id: serial("id").primaryKey(), userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: 'set null' }), name: text("name").notNull(), status: flowStatusEnum("status").default("draft").notNull(), elements: jsonb("elements").$type<FlowElementData>().default({'nodes': [], 'edges': []}).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),});
export const integrations = pgTable("integrations", { id: serial("id").primaryKey(), userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), platform: integrationPlatformEnum("platform").notNull(), credentials: jsonb("credentials").$type<Record<string, any>>().notNull(), metadata: jsonb("metadata").$type<Record<string, any>>(), status: text("status", { enum: ["connected", "disconnected", "error"] }).default("disconnected").notNull(), lastSync: timestamp("last_sync", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()});

// --- RELAÇÕES ---
export const userRelations = relations(users, ({ many }) => ({ campaigns: many(campaigns), creatives: many(creatives), metrics: many(metrics), whatsappMessages: many(whatsappMessages), copies: many(copies), alerts: many(alerts), budgets: many(budgets), landingPages: many(landingPages), chatSessions: many(chatSessions), funnels: many(funnels), flows: many(flows), integrations: many(integrations), assignedTasks: many(campaignTasks)}));
export const campaignRelations = relations(campaigns, ({ one, many }) => ({ user: one(users, { fields: [campaigns.userId], references: [users.id] }), creatives: many(creatives), metrics: many(metrics), copies: many(copies), alerts: many(alerts), budgets: many(budgets), funnels: many(funnels), flows: many(flows), phases: many(campaignPhases) }));
export const campaignPhaseRelations = relations(campaignPhases, ({ one, many }) => ({ campaign: one(campaigns, { fields: [campaignPhases.campaignId], references: [campaigns.id] }), tasks: many(campaignTasks) }));
export const campaignTaskRelations = relations(campaignTasks, ({ one }) => ({ phase: one(campaignPhases, { fields: [campaignTasks.phaseId], references: [campaignPhases.id] }), assignee: one(users, { fields: [campaignTasks.assigneeId], references: [users.id] })}));
export const creativeRelations = relations(creatives, ({ one }) => ({ user: one(users, { fields: [creatives.userId], references: [users.id] }), campaign: one(campaigns, { fields: [creatives.campaignId], references: [campaigns.id] }), }));
export const metricRelations = relations(metrics, ({ one }) => ({ campaign: one(campaigns, { fields: [metrics.campaignId], references: [campaigns.id] }), user: one(users, { fields: [metrics.userId], references: [users.id] }), }));
export const whatsappMessageRelations = relations(whatsappMessages, ({ one }) => ({ user: one(users, { fields: [whatsappMessages.userId], references: [users.id] }), }));
export const copyRelations = relations(copies, ({ one }) => ({ user: one(users, { fields: [copies.userId], references: [users.id] }), campaign: one(campaigns, { fields: [copies.campaignId], references: [campaigns.id] }), }));
export const alertRelations = relations(alerts, ({ one }) => ({ user: one(users, { fields: [alerts.userId], references: [users.id] }), campaign: one(campaigns, { fields: [alerts.campaignId], references: [campaigns.id] }), }));
export const budgetRelations = relations(budgets, ({ one }) => ({ user: one(users, { fields: [budgets.userId], references: [users.id] }), campaign: one(campaigns, { fields: [budgets.campaignId], references: [campaigns.id] }), }));
export const landingPageRelations = relations(landingPages, ({ one }) => ({ user: one(users, { fields: [landingPages.userId], references: [users.id] }), }));
export const chatSessionRelations = relations(chatSessions, ({ one, many }) => ({ user: one(users, { fields: [chatSessions.userId], references: [users.id] }), messages: many(chatMessages), }));
export const chatMessageRelations = relations(chatMessages, ({ one }) => ({ session: one(chatSessions, { fields: [chatMessages.sessionId], references: [chatSessions.id] }), }));
export const funnelRelations = relations(funnels, ({ one, many }) => ({ user: one(users, { fields: [funnels.userId], references: [users.id] }), campaign: one(campaigns, { fields: [funnels.campaignId], references: [campaigns.id] }), stages: many(funnelStages), }));
export const funnelStageRelations = relations(funnelStages, ({ one }) => ({ funnel: one(funnels, { fields: [funnelStages.funnelId], references: [funnels.id] }), }));
export const flowRelations = relations(flows, ({ one }) => ({ user: one(users, { fields: [flows.userId], references: [users.id] }), campaign: one(campaigns, { fields: [flows.campaignId], references: [campaigns.id] }),}));
export const integrationRelations = relations(integrations, ({ one }) => ({ user: one(users, { fields: [integrations.userId], references: [users.id] }),}));

// --- SCHEMAS ZOD PARA INSERÇÃO E SELEÇÃO ---
const FlowElementsSchema = z.object({ nodes: z.array(z.any()).default([]), edges: z.array(z.any()).default([]), }).nullable().optional().default({ nodes: [], edges: [] });
export const insertUserSchema = createInsertSchema(users, { email: z.string().email("Email inválido."), username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres."), password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres.").optional(), }).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCampaignSchema = createInsertSchema(campaigns, { name: z.string().min(1, "Nome da campanha é obrigatório."), budget: z.preprocess( (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val) : (typeof val === 'number' ? val : undefined)), z.number({ invalid_type_error: "Orçamento deve ser um número" }).nullable().optional() ), dailyBudget: z.preprocess( (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val) : (typeof val === 'number' ? val : undefined)), z.number({ invalid_type_error: "Orçamento diário deve ser um número" }).nullable().optional() ), avgTicket: z.preprocess( (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val) : (typeof val === 'number' ? val : undefined)), z.number({ invalid_type_error: "Ticket médio deve ser um número" }).nullable().optional() ), startDate: z.preprocess( (arg) => { if (typeof arg === "string" || arg instanceof Date) return new Date(arg); return undefined; }, z.date().optional().nullable() ), endDate: z.preprocess( (arg) => { if (typeof arg === "string" || arg instanceof Date) return new Date(arg); return undefined; }, z.date().optional().nullable() ), platforms: z.preprocess( (val) => { if (Array.isArray(val)) return val; if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(s => s); return []; }, z.array(z.string()).default([]) ), objectives: z.preprocess( (val) => { if (Array.isArray(val)) return val; if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(s => s); return []; }, z.array(z.string()).default([]) ), isTemplate: z.boolean().optional().default(false), }).omit({ id: true, createdAt: true, updatedAt: true, userId: true });
export const insertCreativeSchema = createInsertSchema(creatives, { name: z.string().min(1, "Nome do criativo é obrigatório."), type: z.enum(creatives.type.enumValues as [string, ...string[]]), status: z.enum(creatives.status.enumValues as [string, ...string[]]).optional(), platforms: z.preprocess((val) => { if (Array.isArray(val)) { return val; } if (typeof val === 'string') { try { const parsed = JSON.parse(val); if (Array.isArray(parsed)) return parsed; } catch (e) { return val.split(',').map(s => s.trim()).filter(Boolean); } } return []; }, z.array(z.string()).optional()), fileUrl: z.string().nullable().optional(), thumbnailUrl: z.string().nullable().optional(), campaignId: z.preprocess( (val) => { if (val === "NONE" || val === null || val === undefined || val === "") { return null; } const parsed = parseInt(String(val)); return isNaN(parsed) ? null : parsed; }, z.number().int().positive().nullable().optional() ),}).omit({ id: true, createdAt: true, updatedAt: true, userId: true });
export const insertCopySchema = createInsertSchema(copies, {
  userId: z.number().int().positive({ message: "ID do usuário é obrigatório e deve ser um número positivo." }),
  title: z.string().min(1, "Título da copy é obrigatório."),
  content: z.string().min(1, "Conteúdo (mainCopy) é obrigatório."),
  purposeKey: z.string().min(1, "Chave da finalidade (purposeKey) é obrigatória."),
  launchPhase: z.enum(launchPhaseEnum.enumValues, {
    required_error: "Fase de lançamento é obrigatória.",
    invalid_type_error: "Fase de lançamento inválida.",
  }),
  details: z.record(z.any()).optional().nullable().default({}),
  baseInfo: z.record(z.any()).optional().nullable().default({}),
  fullGeneratedResponse: z.record(z.any()).optional().nullable().default({}),
  platform: z.string().optional().nullable(),
  isFavorite: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().nullable().default([]),
  // ✅ CORREÇÃO: Lógica de pré-processamento do campaignId melhorada para ser mais robusta.
  campaignId: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === "" || String(val).toUpperCase() === "NONE") {
        return null;
      }
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? null : parsed;
      }
      if (typeof val === 'number') {
        return val;
      }
      return null;
    },
    z.number().int().positive().nullable().optional()
  ),
}).omit({ id: true, createdAt: true, lastUpdatedAt: true });
export const insertFunnelSchema = createInsertSchema(funnels, { name: z.string().min(1, "O nome do funil é obrigatório."), description: z.string().nullable().optional(), campaignId: z.preprocess( (val) => { if (val === undefined || val === null || val === "" || String(val).toUpperCase() === "NONE") { return null; } const parsed = parseInt(String(val)); return isNaN(parsed) ? null : parsed; }, z.number().int().positive().nullable().optional() ), }).omit({ id: true, createdAt: true, updatedAt: true, userId: true });
export const insertFunnelStageSchema = createInsertSchema(funnelStages, { name: z.string().min(1, "O nome da etapa é obrigatório."), description: z.string().nullable().optional(), order: z.number().int().min(0).default(0), config: z.record(z.any()).optional().nullable().default({}), funnelId: z.number().int().positive("ID do funil inválido."), }).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLandingPageSchema = createInsertSchema(landingPages, { name: z.string().min(1, "Nome da landing page é obrigatório."), slug: z.string().min(3, "Slug deve ter pelo menos 3 caracteres.").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido."), grapesJsData: z.record(z.any()).optional().nullable(), studioProjectId: z.string().optional().nullable(), status: z.enum(landingPages.status.enumValues as [string, ...string[]]).optional(), }).omit({ id: true, createdAt: true, updatedAt: true, userId: true, publicUrl: true, publishedAt: true });
export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages, { contactNumber: z.string().min(1, "Número de contato é obrigatório."), message: z.string().min(1, "Mensagem é obrigatória."), direction: z.enum(whatsappMessages.direction.enumValues as [string, ...string[]]), }).omit({ id: true, userId: true, timestamp: true, isRead: true });
export const insertAlertSchema = createInsertSchema(alerts, { type: z.enum(alerts.type.enumValues as [string, ...string[]]), title: z.string().min(1, "Título do alerta é obrigatório."), message: z.string().min(1, "Mensagem do alerta é obrigatória."), }).omit({ id: true, userId: true, createdAt: true, isRead: true });
export const insertBudgetSchema = createInsertSchema(budgets, { totalBudget: z.preprocess( (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val) : (typeof val === 'number' ? val : undefined)), z.number({ required_error: "Orçamento total é obrigatório.", invalid_type_error: "Orçamento total deve ser um número." }) ), spentAmount: z.preprocess( (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val) : (typeof val === 'number' ? val : undefined)), z.number({ invalid_type_error: "Valor gasto deve ser um número." }).default(0).optional() ), period: z.enum(budgets.period.enumValues as [string, ...string[]]), startDate: z.preprocess( (arg) => { if (typeof arg === "string" || arg instanceof Date) return new Date(arg); return undefined; }, z.date({ required_error: "Data de início é obrigatória." }) ), endDate: z.preprocess( (arg) => { if (typeof arg === "string" || arg instanceof Date) return new Date(arg); return undefined; }, z.date().optional().nullable() ), campaignId: z.preprocess( (val) => (val === undefined || val === null || val === "" || String(val).toUpperCase() === "NONE" ? null : parseInt(String(val))), z.number().int().positive().nullable().optional() ), }).omit({ id: true, createdAt: true, userId: true });
export const insertChatSessionSchema = createInsertSchema(chatSessions, { title: z.string().min(1, "Título da sessão é obrigatório.").default('Nova Conversa').optional(), }).omit({ id: true, createdAt: true, updatedAt: true, userId: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages, { text: z.string().min(1, "O texto da mensagem é obrigatório."), sender: z.enum(chatSenderEnum.enumValues), sessionId: z.number().int().positive(), attachmentUrl: z.string().url().optional().nullable(), }).omit({id: true, timestamp: true});
export const insertMetricSchema = createInsertSchema(metrics, { campaignId: z.number().int().positive(), userId: z.number().int().positive(), date: z.preprocess((arg) => { if (typeof arg === "string" || arg instanceof Date) return new Date(arg); return undefined; }, z.date()), impressions: z.number().int().min(0).default(0), clicks: z.number().int().min(0).default(0), conversions: z.number().int().min(0).default(0), cost: z.preprocess( (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val) : (typeof val === 'number' ? val : 0)), z.number().min(0).default(0) ), revenue: z.preprocess( (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val) : (typeof val === 'number' ? val : 0)), z.number().min(0).default(0) ), leads: z.number().int().min(0).default(0) }).omit({ id: true, createdAt: true });
export const insertFlowSchema = createInsertSchema(flows, { name: z.string().min(1, "Nome do fluxo é obrigatório."), status: z.enum(flowStatusEnum.enumValues).default('draft'), elements: FlowElementsSchema, campaignId: z.preprocess( (val) => (val === undefined || val === null || val === "" || String(val).toUpperCase() === "NONE" ? null : parseInt(String(val))), z.number().int().positive().nullable().optional() ), }).omit({ id: true, createdAt: true, updatedAt: true, userId: true });
export const insertIntegrationSchema = createInsertSchema(integrations).omit({ id: true, createdAt: true, updatedAt: true, userId: true });
export const insertCampaignPhaseSchema = createInsertSchema(campaignPhases).omit({ id: true });
export const insertCampaignTaskSchema = createInsertSchema(campaignTasks, {
  startDate: z.preprocess((arg) => { if (typeof arg === 'string' || arg instanceof Date) return new Date(arg); return undefined; }, z.date().optional().nullable()),
  endDate: z.preprocess((arg) => { if (typeof arg === 'string' || arg instanceof Date) return new Date(arg); return undefined; }, z.date().optional().nullable()),
}).omit({ id: true });

// --- SCHEMAS ZOD PARA SELEÇÃO (SELECT) ---
const selectUserSchema = createSelectSchema(users);
const selectCampaignSchema = createSelectSchema(campaigns);
const selectCreativeSchema = createSelectSchema(creatives);
const selectCopySchema = createSelectSchema(copies);
const selectMetricSchema = createSelectSchema(metrics);
const selectWhatsappMessageSchema = createSelectSchema(whatsappMessages);
const selectAlertSchema = createSelectSchema(alerts);
const selectBudgetSchema = createSelectSchema(budgets);
const selectLandingPageSchema = createSelectSchema(landingPages);
const selectChatSessionSchema = createSelectSchema(chatSessions);
const selectChatMessageSchema = createSelectSchema(chatMessages);
const selectFunnelSchema = createSelectSchema(funnels);
const selectFunnelStageSchema = createSelectSchema(funnelStages);
const selectFlowSchema = createSelectSchema(flows);
const selectIntegrationSchema = createSelectSchema(integrations);
const selectCampaignPhaseSchema = createSelectSchema(campaignPhases);
const selectCampaignTaskSchema = createSelectSchema(campaignTasks);

// --- Tipos Inferidos ---
export type User = z.infer<typeof selectUserSchema>; export type InsertUser = z.infer<typeof insertUserSchema>;
export type Campaign = z.infer<typeof selectCampaignSchema>; export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Creative = z.infer<typeof selectCreativeSchema>; export type InsertCreative = z.infer<typeof insertCreativeSchema>;
export type Copy = z.infer<typeof selectCopySchema>;  export type InsertCopy = z.infer<typeof insertCopySchema>;
export type Metric = z.infer<typeof selectMetricSchema>; export type InsertMetric = z.infer<typeof insertMetricSchema>;
export type WhatsappMessage = z.infer<typeof selectWhatsappMessageSchema>; export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;
export type Alert = z.infer<typeof selectAlertSchema>; export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Budget = z.infer<typeof selectBudgetSchema>; export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type LandingPage = z.infer<typeof selectLandingPageSchema>; export type InsertLandingPage = z.infer<typeof insertLandingPageSchema>;
export type ChatSession = z.infer<typeof selectChatSessionSchema>; export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatMessage = z.infer<typeof selectChatMessageSchema>; export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Funnel = z.infer<typeof selectFunnelSchema>; export type InsertFunnel = z.infer<typeof insertFunnelSchema>;
export type FunnelStage = z.infer<typeof selectFunnelStageSchema>; export type InsertFunnelStage = z.infer<typeof insertFunnelStageSchema>;
export type Flow = z.infer<typeof selectFlowSchema>; export type InsertFlow = z.infer<typeof insertFlowSchema>;
export type Integration = z.infer<typeof selectIntegrationSchema>; export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type CampaignPhase = z.infer<typeof selectCampaignPhaseSchema>; export type InsertCampaignPhase = z.infer<typeof insertCampaignPhaseSchema>;
export type CampaignTask = z.infer<typeof selectCampaignTaskSchema>; export type InsertCampaignTask = z.infer<typeof insertCampaignTaskSchema>;
export type FullCampaignData = Campaign & { phases: (CampaignPhase & { tasks: (CampaignTask & { assignee: Pick<User, 'id' | 'username'> | null; })[]; })[]; };

// --- CONFIGURAÇÕES DE COPY ---
export const allCopyPurposesConfig: CopyPurposeConfig[] = [
];

// --- Tipos Relacionados a Copy ---
export type SpecificPurposeData = Record<string, string | number | boolean>;
export interface FullGeneratorPayload extends BaseGeneratorFormState {
  launchPhase: LaunchPhase;
  copyPurposeKey: string;
  details: SpecificPurposeData;
}
export interface BackendGeneratedCopyItem {
    mainCopy: string;
    alternativeVariation1?: string;
    alternativeVariation2?: string;
    platformSuggestion?: string;
    notes?: string;
}
export interface DisplayGeneratedCopy extends BackendGeneratedCopyItem {
    timestamp: Date;
    purposeKey: string;
}
export type SavedCopy = {
    id: number;
    title: string;
    content: string;
    purposeKey: string;
    launchPhase: LaunchPhase;
    details: Record<string, any>;
    baseInfo: BaseGeneratorFormState;
    platform?: string | null;
    isFavorite: boolean;
    tags: string[];
    createdAt: string;
    lastUpdatedAt: string;
    campaignId?: number | null;
    userId: number;
    fullGeneratedResponse: BackendGeneratedCopyItem;
}
