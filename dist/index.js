var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import dotenv2 from "dotenv";
import express3 from "express";

// server/routes.ts
import express from "express";
import { createServer } from "http";

// server/db.ts
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  alertRelations: () => alertRelations,
  alerts: () => alerts,
  budgetRelations: () => budgetRelations,
  budgets: () => budgets,
  campaignRelations: () => campaignRelations,
  campaignStatusEnum: () => campaignStatusEnum,
  campaigns: () => campaigns,
  chatMessageRelations: () => chatMessageRelations,
  chatMessages: () => chatMessages,
  chatSenderEnum: () => chatSenderEnum,
  chatSessionRelations: () => chatSessionRelations,
  chatSessions: () => chatSessions,
  copies: () => copies,
  copyRelations: () => copyRelations,
  creativeRelations: () => creativeRelations,
  creatives: () => creatives,
  insertAlertSchema: () => insertAlertSchema,
  insertBudgetSchema: () => insertBudgetSchema,
  insertCampaignSchema: () => insertCampaignSchema,
  insertChatMessageSchema: () => insertChatMessageSchema,
  insertChatSessionSchema: () => insertChatSessionSchema,
  insertCopySchema: () => insertCopySchema,
  insertCreativeSchema: () => insertCreativeSchema,
  insertLandingPageSchema: () => insertLandingPageSchema,
  insertMetricSchema: () => insertMetricSchema,
  insertUserSchema: () => insertUserSchema,
  insertWhatsappMessageSchema: () => insertWhatsappMessageSchema,
  landingPageRelations: () => landingPageRelations,
  landingPages: () => landingPages,
  metricRelations: () => metricRelations,
  metrics: () => metrics,
  userRelations: () => userRelations,
  users: () => users,
  whatsappMessageRelations: () => whatsappMessageRelations,
  whatsappMessages: () => whatsappMessages
});
import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
var campaignStatusEnum = pgEnum("campaign_status", ["active", "paused", "completed", "draft"]);
var chatSenderEnum = pgEnum("chat_sender", ["user", "agent"]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var userRelations = relations(users, ({ many }) => ({
  campaigns: many(campaigns),
  creatives: many(creatives),
  metrics: many(metrics),
  whatsappMessages: many(whatsappMessages),
  copies: many(copies),
  alerts: many(alerts),
  budgets: many(budgets),
  landingPages: many(landingPages),
  chatSessions: many(chatSessions)
}));
var campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: campaignStatusEnum("status").default("draft").notNull(),
  // Usando o enum
  platforms: jsonb("platforms").$type().default([]).notNull(),
  // Array de strings
  objectives: jsonb("objectives").$type().default([]),
  budget: text("budget"),
  // String para compatibilidade
  dailyBudget: text("daily_budget"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  targetAudience: text("target_audience"),
  industry: text("industry"),
  avgTicket: text("avg_ticket"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var campaignRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id]
  }),
  creatives: many(creatives),
  metrics: many(metrics),
  copies: many(copies),
  alerts: many(alerts),
  budgets: many(budgets)
}));
var creatives = pgTable("creatives", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  type: text("type", { enum: ["image", "video", "text", "carousel"] }).notNull(),
  fileUrl: text("file_url"),
  // fileUrl é TEXT
  content: text("content"),
  status: text("status", { enum: ["approved", "pending", "rejected"] }).default("pending").notNull(),
  platforms: jsonb("platforms").$type().default([]).notNull(),
  // Isso é JSONB no DB
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var creativeRelations = relations(creatives, ({ one }) => ({
  user: one(users, { fields: [creatives.userId], references: [users.id] }),
  campaign: one(campaigns, { fields: [creatives.campaignId], references: [campaigns.id] })
}));
var metrics = pgTable("metrics", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull(),
  impressions: integer("impressions").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  conversions: integer("conversions").default(0).notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).default("0").notNull(),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0").notNull(),
  leads: integer("leads").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
var metricRelations = relations(metrics, ({ one }) => ({
  campaign: one(campaigns, { fields: [metrics.campaignId], references: [campaigns.id] }),
  user: one(users, { fields: [metrics.userId], references: [users.id] })
}));
var whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contactNumber: text("contact_number").notNull(),
  contactName: text("contact_name"),
  message: text("message").notNull(),
  direction: text("direction", { enum: ["incoming", "outgoing"] }).notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  isRead: boolean("is_read").default(false).notNull()
});
var whatsappMessageRelations = relations(whatsappMessages, ({ one }) => ({
  user: one(users, { fields: [whatsappMessages.userId], references: [users.id] })
}));
var copies = pgTable("copies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type", { enum: ["headline", "body", "cta", "description"] }).notNull(),
  platform: text("platform"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
var copyRelations = relations(copies, ({ one }) => ({
  user: one(users, { fields: [copies.userId], references: [users.id] }),
  campaign: one(campaigns, { fields: [copies.campaignId], references: [campaigns.id] })
}));
var alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  type: text("type", { enum: ["budget", "performance", "approval", "system"] }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
var alertRelations = relations(alerts, ({ one }) => ({
  user: one(users, { fields: [alerts.userId], references: [users.id] }),
  campaign: one(campaigns, { fields: [alerts.campaignId], references: [campaigns.id] })
}));
var budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
  totalBudget: text("total_budget").notNull(),
  spentAmount: text("spent_amount").default("0").notNull(),
  period: text("period", { enum: ["daily", "weekly", "monthly", "total"] }).notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
var budgetRelations = relations(budgets, ({ one }) => ({
  user: one(users, { fields: [budgets.userId], references: [users.id] }),
  campaign: one(campaigns, { fields: [budgets.campaignId], references: [campaigns.id] })
}));
var landingPages = pgTable("landing_pages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  studioProjectId: varchar("studio_project_id", { length: 255 }).unique(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  grapesJsData: jsonb("grapes_js_data"),
  status: text("status", { enum: ["draft", "published", "archived"] }).default("draft").notNull(),
  publicUrl: text("public_url"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var landingPageRelations = relations(landingPages, ({ one }) => ({
  user: one(users, {
    fields: [landingPages.userId],
    references: [users.id]
  })
}));
var chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Nova Conversa"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var chatSessionRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, { fields: [chatSessions.userId], references: [users.id] }),
  messages: many(chatMessages)
}));
var chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  sender: chatSenderEnum("sender").notNull(),
  text: text("text").notNull(),
  attachmentUrl: text("attachment_url"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull()
});
var chatMessageRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, { fields: [chatMessages.sessionId], references: [chatSessions.id] })
}));
var insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Email inv\xE1lido."),
  username: z.string().min(3, "Nome de usu\xE1rio deve ter pelo menos 3 caracteres."),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres.")
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCampaignSchema = createInsertSchema(campaigns, {
  name: z.string().min(1, "Nome da campanha \xE9 obrigat\xF3rio."),
  // platforms agora é array de strings, o Zod já inferiu corretamente de jsonb
  budget: z.preprocess(
    (val) => val === "" || val === null || val === void 0 ? null : String(val),
    z.string().nullable().optional()
  ),
  dailyBudget: z.preprocess(
    (val) => val === "" || val === null || val === void 0 ? null : String(val),
    z.string().nullable().optional()
  ),
  avgTicket: z.preprocess(
    (val) => val === "" || val === null || val === void 0 ? null : String(val),
    z.string().nullable().optional()
  ),
  startDate: z.preprocess(
    (arg) => {
      if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
      return void 0;
    },
    z.date().optional().nullable()
  ),
  endDate: z.preprocess(
    (arg) => {
      if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
      return void 0;
    },
    z.date().optional().nullable()
  )
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCreativeSchema = createInsertSchema(creatives, {
  name: z.string().min(1, "Nome do criativo \xE9 obrigat\xF3rio."),
  type: z.enum(["image", "video", "text", "carousel"]),
  platforms: z.preprocess(
    (val) => {
      if (Array.isArray(val)) {
        return val;
      }
      if (typeof val === "string") {
        return val.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
      }
      return [];
    },
    z.array(z.string()).optional()
  ),
  fileUrl: z.string().nullable().optional(),
  // CORREÇÃO AQUI: Pré-processamento para campaignId
  campaignId: z.preprocess(
    (val) => {
      if (val === "null" || val === "") {
        return null;
      }
      if (typeof val === "number" || val === null) {
        return val;
      }
      if (typeof val === "string") {
        const parsed = parseInt(val);
        return isNaN(parsed) ? void 0 : parsed;
      }
      return void 0;
    },
    z.number().nullable().optional()
    // Opcional e pode ser null
  )
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertMetricSchema = createInsertSchema(metrics).omit({
  id: true,
  createdAt: true
});
var insertWhatsappMessageSchema = createInsertSchema(whatsappMessages, {
  contactNumber: z.string().min(1, "N\xFAmero de contato \xE9 obrigat\xF3rio."),
  message: z.string().min(1, "Mensagem \xE9 obrigat\xF3ria.")
}).omit({
  id: true,
  timestamp: true
});
var insertCopySchema = createInsertSchema(copies, {
  title: z.string().min(1, "T\xEDtulo da copy \xE9 obrigat\xF3rio."),
  content: z.string().min(1, "Conte\xFAdo da copy \xE9 obrigat\xF3rio.")
}).omit({
  id: true,
  createdAt: true
});
var insertAlertSchema = createInsertSchema(alerts, {
  title: z.string().min(1, "T\xEDtulo do alerta \xE9 obrigat\xF3rio."),
  message: z.string().min(1, "Mensagem do alerta \xE9 obrigat\xF3ria.")
}).omit({
  id: true,
  createdAt: true
});
var insertBudgetSchema = createInsertSchema(budgets, {
  totalBudget: z.preprocess(
    (val) => String(val),
    z.string({ invalid_type_error: "Or\xE7amento total deve ser um texto" })
  ),
  spentAmount: z.preprocess(
    (val) => String(val),
    z.string({ invalid_type_error: "Valor gasto deve ser um texto" }).optional()
  ),
  startDate: z.preprocess(
    (arg) => {
      if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
      return void 0;
    },
    z.date()
  ),
  endDate: z.preprocess(
    (arg) => {
      if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
      return void 0;
    },
    z.date().optional().nullable()
  )
}).omit({
  id: true,
  createdAt: true
});
var insertLandingPageSchema = createInsertSchema(landingPages, {
  name: z.string().min(1, "Nome da landing page \xE9 obrigat\xF3rio."),
  slug: z.string().min(1, "Slug \xE9 obrigat\xF3rio.").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inv\xE1lido (letras min\xFAsculas, n\xFAmeros, h\xEDfens)."),
  studioProjectId: z.string().optional().nullable(),
  grapesJsData: z.any().optional().nullable(),
  publicUrl: z.string().url("URL p\xFAblica inv\xE1lida").optional().nullable()
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true
});
var insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true
});

// server/db.ts
dotenv.config();
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL n\xE3o est\xE1 definida nas vari\xE1veis de ambiente.");
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, count, sum, desc, and } from "drizzle-orm";
import * as bcrypt from "bcrypt";
function convertBudgetData(data) {
  const converted = { ...data };
  if (typeof converted.totalBudget === "number") {
    converted.totalBudget = String(converted.totalBudget);
  }
  if (typeof converted.spentAmount === "number") {
    converted.spentAmount = String(converted.spentAmount);
  }
  if (typeof converted.budget === "number") {
    converted.budget = String(converted.budget);
  }
  if (typeof converted.dailyBudget === "number") {
    converted.dailyBudget = String(converted.dailyBudget);
  }
  if (typeof converted.avgTicket === "number") {
    converted.avgTicket = String(converted.avgTicket);
  }
  return converted;
}
var chartColors = {
  palette: [
    "rgba(75, 192, 192, 1)",
    // Verde-água
    "rgba(255, 99, 132, 1)",
    // Vermelho
    "rgba(54, 162, 235, 1)",
    // Azul
    "rgba(255, 206, 86, 1)",
    // Amarelo
    "rgba(153, 102, 255, 1)",
    // Roxo
    "rgba(255, 159, 64, 1)",
    // Laranja
    "rgba(200, 200, 200, 1)"
    // Cinza
  ],
  background: [
    "rgba(75, 192, 192, 0.2)",
    "rgba(255, 99, 132, 0.2)",
    "rgba(54, 162, 235, 0.2)",
    "rgba(255, 206, 86, 0.2)",
    "rgba(153, 102, 255, 0.2)",
    "rgba(255, 159, 64, 0.2)",
    "rgba(200, 200, 200, 0.2)"
  ]
};
function generateSimulatedLineChartData(label, startValue, count2, maxFluctuation, color) {
  const data = [];
  const labels = [];
  let currentValue = startValue;
  for (let i = 0; i < count2; i++) {
    labels.push(`Dia ${i + 1}`);
    data.push(Math.round(currentValue));
    currentValue += Math.random() * maxFluctuation * 2 - maxFluctuation;
    if (currentValue < 0) currentValue = 0;
  }
  return {
    labels,
    datasets: [
      {
        label,
        data,
        borderColor: color,
        backgroundColor: color.replace("1)", "0.2)"),
        // Cor de fundo com opacidade
        fill: true,
        tension: 0.4
      }
    ]
  };
}
function generateSimulatedBarChartData(label, categories, baseValue, maxFluctuation, colors) {
  const data = categories.map(() => Math.round(baseValue + Math.random() * maxFluctuation * 2 - maxFluctuation));
  return {
    labels: categories,
    datasets: [
      {
        label,
        data,
        backgroundColor: colors
      }
    ]
  };
}
function generateSimulatedDoughnutChartData(labels, baseValue, maxFluctuation, colors) {
  const data = labels.map(() => Math.round(baseValue + Math.random() * maxFluctuation * 2 - maxFluctuation));
  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: colors.map((color) => color.replace("1)", "0.8)")),
        // Fundo com opacidade para Doughnut
        borderWidth: 0
      }
    ]
  };
}
var DatabaseStorage = class {
  async getUser(id) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }
  async getUserByUsername(username) {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }
  async getUserByEmail(email) {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }
  async createUser(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const [newUser] = await db.insert(users).values({
      ...userData,
      password: hashedPassword
    }).returning();
    if (!newUser) throw new Error("Falha ao criar usu\xE1rio.");
    return newUser;
  }
  async validatePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }
  async getCampaigns(userId, limit) {
    let query = db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.createdAt));
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }
  async getCampaign(id, userId) {
    const [campaign] = await db.select().from(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.userId, userId))).limit(1);
    return campaign;
  }
  async createCampaign(campaignData) {
    const convertedData = convertBudgetData(campaignData);
    const [newCampaign] = await db.insert(campaigns).values(convertedData).returning();
    if (!newCampaign) throw new Error("Falha ao criar campanha.");
    return newCampaign;
  }
  async updateCampaign(id, campaignData, userId) {
    const convertedData = convertBudgetData(campaignData);
    const [updatedCampaign] = await db.update(campaigns).set({ ...convertedData, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(campaigns.id, id), eq(campaigns.userId, userId))).returning();
    return updatedCampaign;
  }
  async deleteCampaign(id, userId) {
    const result = await db.delete(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }
  async getCreatives(userId, campaignId) {
    const conditions = [eq(creatives.userId, userId)];
    if (campaignId !== void 0) {
      conditions.push(eq(creatives.campaignId, campaignId));
    }
    return db.select().from(creatives).where(and(...conditions)).orderBy(desc(creatives.createdAt));
  }
  async getCreative(id, userId) {
    const [creative] = await db.select().from(creatives).where(and(eq(creatives.id, id), eq(creatives.userId, userId))).limit(1);
    return creative;
  }
  async createCreative(creativeData) {
    const [newCreative] = await db.insert(creatives).values(creativeData).returning();
    if (!newCreative) throw new Error("Falha ao criar criativo.");
    return newCreative;
  }
  async updateCreative(id, creativeData, userId) {
    const [updatedCreative] = await db.update(creatives).set({ ...creativeData, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(creatives.id, id), eq(creatives.userId, userId))).returning();
    return updatedCreative;
  }
  async deleteCreative(id, userId) {
    const result = await db.delete(creatives).where(and(eq(creatives.id, id), eq(creatives.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }
  async getMetricsForCampaign(campaignId, userId) {
    const campaign = await this.getCampaign(campaignId, userId);
    if (!campaign) {
      throw new Error("Campanha n\xE3o encontrada ou n\xE3o pertence ao usu\xE1rio.");
    }
    return db.select().from(metrics).where(eq(metrics.campaignId, campaignId)).orderBy(desc(metrics.date));
  }
  async createMetric(metricData) {
    const [newMetric] = await db.insert(metrics).values(metricData).returning();
    if (!newMetric) throw new Error("Falha ao criar m\xE9trica.");
    return newMetric;
  }
  async getMessages(userId, contactNumber) {
    const conditions = [eq(whatsappMessages.userId, userId)];
    if (contactNumber) {
      conditions.push(eq(whatsappMessages.contactNumber, contactNumber));
    }
    return db.select().from(whatsappMessages).where(and(...conditions)).orderBy(desc(whatsappMessages.timestamp));
  }
  async createMessage(messageData) {
    const [newMessage] = await db.insert(whatsappMessages).values(messageData).returning();
    if (!newMessage) throw new Error("Falha ao criar mensagem.");
    return newMessage;
  }
  async markMessageAsRead(id, userId) {
    const result = await db.update(whatsappMessages).set({ isRead: true }).where(and(eq(whatsappMessages.id, id), eq(whatsappMessages.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }
  async getContacts(userId) {
    const allMessages = await db.select().from(whatsappMessages).where(eq(whatsappMessages.userId, userId)).orderBy(desc(whatsappMessages.timestamp));
    const contactsMap = /* @__PURE__ */ new Map();
    for (const msg of allMessages) {
      if (!contactsMap.has(msg.contactNumber)) {
        contactsMap.set(msg.contactNumber, {
          contactNumber: msg.contactNumber,
          contactName: msg.contactName || null,
          lastMessage: msg.message,
          timestamp: new Date(msg.timestamp),
          unreadCount: 0
        });
      }
      const contact = contactsMap.get(msg.contactNumber);
      if (!msg.isRead && msg.direction === "incoming") {
        contact.unreadCount++;
      }
    }
    return Array.from(contactsMap.values()).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  async getCopies(userId, campaignId) {
    const conditions = [eq(copies.userId, userId)];
    if (campaignId !== void 0) {
      conditions.push(eq(copies.campaignId, campaignId));
    }
    return db.select().from(copies).where(and(...conditions)).orderBy(desc(copies.createdAt));
  }
  async createCopy(copyData) {
    const [newCopy] = await db.insert(copies).values(copyData).returning();
    if (!newCopy) throw new Error("Falha ao criar copy.");
    return newCopy;
  }
  async updateCopy(id, copyData, userId) {
    const existingCopy = await db.select().from(copies).where(and(eq(copies.id, id), eq(copies.userId, userId))).limit(1);
    if (!existingCopy || existingCopy.length === 0) {
      return void 0;
    }
    const [updatedCopy] = await db.update(copies).set(copyData).where(and(eq(copies.id, id), eq(copies.userId, userId))).returning();
    return updatedCopy;
  }
  async deleteCopy(id, userId) {
    const result = await db.delete(copies).where(and(eq(copies.id, id), eq(copies.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }
  async getAlerts(userId, onlyUnread) {
    const conditions = [eq(alerts.userId, userId)];
    if (onlyUnread) {
      conditions.push(eq(alerts.isRead, false));
    }
    return db.select().from(alerts).where(and(...conditions)).orderBy(desc(alerts.createdAt));
  }
  async createAlert(alertData) {
    const [newAlert] = await db.insert(alerts).values(alertData).returning();
    if (!newAlert) throw new Error("Falha ao criar alerta.");
    return newAlert;
  }
  async markAlertAsRead(id, userId) {
    const result = await db.update(alerts).set({ isRead: true }).where(and(eq(alerts.id, id), eq(alerts.userId, userId), eq(alerts.isRead, false)));
    return (result.rowCount ?? 0) > 0;
  }
  async getBudgets(userId, campaignId) {
    const conditions = [eq(budgets.userId, userId)];
    if (campaignId !== void 0) {
      conditions.push(eq(budgets.campaignId, campaignId));
    }
    return db.select().from(budgets).where(and(...conditions)).orderBy(desc(budgets.createdAt));
  }
  async createBudget(budgetData) {
    const convertedData = convertBudgetData(budgetData);
    const [newBudget] = await db.insert(budgets).values(convertedData).returning();
    if (!newBudget) throw new Error("Falha ao criar or\xE7amento.");
    return newBudget;
  }
  async updateBudget(id, budgetData, userId) {
    const existingBudget = await db.select().from(budgets).where(and(eq(budgets.id, id), eq(budgets.userId, userId))).limit(1);
    if (!existingBudget || existingBudget.length === 0) {
      return void 0;
    }
    const convertedData = convertBudgetData(budgetData);
    const [updatedBudget] = await db.update(budgets).set(convertedData).where(and(eq(budgets.id, id), eq(budgets.userId, userId))).returning();
    return updatedBudget;
  }
  async getLandingPages(userId) {
    return db.select().from(landingPages).where(eq(landingPages.userId, userId)).orderBy(desc(landingPages.createdAt));
  }
  async getLandingPage(id, userId) {
    const [lp] = await db.select().from(landingPages).where(and(eq(landingPages.id, id), eq(landingPages.userId, userId))).limit(1);
    return lp;
  }
  async getLandingPageBySlug(slug) {
    const [lp] = await db.select().from(landingPages).where(eq(landingPages.slug, slug)).limit(1);
    return lp;
  }
  async getLandingPageByStudioProjectId(studioProjectId, userId) {
    const [lp] = await db.select().from(landingPages).where(and(eq(landingPages.studioProjectId, studioProjectId), eq(landingPages.userId, userId))).limit(1);
    return lp;
  }
  async createLandingPage(lpData) {
    const [newLP] = await db.insert(landingPages).values(lpData).returning();
    if (!newLP) throw new Error("Falha ao criar landing page.");
    return newLP;
  }
  async updateLandingPage(id, lpData, userId) {
    const [updatedLP] = await db.update(landingPages).set({ ...lpData, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(landingPages.id, id), eq(landingPages.userId, userId))).returning();
    return updatedLP;
  }
  async deleteLandingPage(id, userId) {
    const result = await db.delete(landingPages).where(and(eq(landingPages.id, id), eq(landingPages.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }
  async createChatSession(userId, title = "Nova Conversa") {
    const [newSession] = await db.insert(chatSessions).values({ userId, title, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).returning();
    if (!newSession) throw new Error("Falha ao criar nova sess\xE3o de chat.");
    return newSession;
  }
  async getChatSession(sessionId, userId) {
    const [session] = await db.select().from(chatSessions).where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId))).limit(1);
    return session;
  }
  async getChatSessions(userId) {
    return db.select().from(chatSessions).where(eq(chatSessions.userId, userId)).orderBy(desc(chatSessions.updatedAt));
  }
  async updateChatSessionTitle(sessionId, userId, newTitle) {
    const [updatedSession] = await db.update(chatSessions).set({ title: newTitle, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId))).returning();
    return updatedSession;
  }
  async deleteChatSession(sessionId, userId) {
    const [deletedSession] = await db.delete(chatSessions).where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId))).returning();
    return !!deletedSession;
  }
  async addChatMessage(messageData) {
    const [newMessage] = await db.insert(chatMessages).values({ ...messageData, timestamp: /* @__PURE__ */ new Date() }).returning();
    if (!newMessage) throw new Error("Falha ao adicionar mensagem ao chat.");
    await db.update(chatSessions).set({ updatedAt: /* @__PURE__ */ new Date() }).where(eq(chatSessions.id, messageData.sessionId));
    return newMessage;
  }
  async getChatMessages(sessionId, userId) {
    const sessionExists = await db.select({ id: chatSessions.id }).from(chatSessions).where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId))).limit(1);
    if (!sessionExists.length) {
      return [];
    }
    return db.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId)).orderBy(chatMessages.timestamp);
  }
  // --- Funções para o Dashboard ---
  async getDashboardData(userId, timeRange = "30d") {
    const activeCampaignsResult = await db.select({ count: count() }).from(campaigns).where(and(eq(campaigns.userId, userId), eq(campaigns.status, "active")));
    const activeCampaigns = activeCampaignsResult[0]?.count || 0;
    const totalSpentResult = await db.select({ total: sum(budgets.spentAmount) }).from(budgets).where(eq(budgets.userId, userId));
    const totalSpent = parseFloat(totalSpentResult[0]?.total || "0") || 0;
    const totalConversionsResult = await db.select({ total: sum(metrics.conversions) }).from(metrics).where(eq(metrics.userId, userId));
    const conversions = parseFloat(totalConversionsResult[0]?.total || "0") || 0;
    const totalRevenueResult = await db.select({ total: sum(metrics.revenue) }).from(metrics).where(eq(metrics.userId, userId));
    const totalRevenue = parseFloat(totalRevenueResult[0]?.total || "0") || 0;
    const totalCostResult = await db.select({ total: sum(metrics.cost) }).from(metrics).where(eq(metrics.userId, userId));
    const totalCost = parseFloat(totalCostResult[0]?.total || "0") || 0;
    const avgROI = totalCost > 0 ? parseFloat(((totalRevenue - totalCost) / totalCost * 100).toFixed(2)) : 0;
    const totalImpressionsResult = await db.select({ total: sum(metrics.impressions) }).from(metrics).where(eq(metrics.userId, userId));
    const impressions = parseFloat(totalImpressionsResult[0]?.total || "0") || 0;
    const totalClicksResult = await db.select({ total: sum(metrics.clicks) }).from(metrics).where(eq(metrics.userId, userId));
    const clicks = parseFloat(totalClicksResult[0]?.total || "0") || 0;
    const ctr = clicks > 0 && impressions > 0 ? parseFloat((clicks / impressions * 100).toFixed(2)) : 0;
    const cpc = clicks > 0 && totalSpent > 0 ? parseFloat((totalSpent / clicks).toFixed(2)) : 0;
    const metricsData = {
      activeCampaigns,
      totalSpent,
      conversions,
      avgROI,
      impressions,
      clicks,
      ctr,
      cpc
    };
    const campaignsChange = parseFloat((Math.random() * 20 - 10).toFixed(1));
    const spentChange = parseFloat((Math.random() * 20 - 10).toFixed(1));
    const conversionsChange = parseFloat((Math.random() * 30 - 15).toFixed(1));
    const roiChange = parseFloat((Math.random() * 10 - 5).toFixed(1));
    const trends = {
      campaignsChange,
      spentChange,
      conversionsChange,
      roiChange
    };
    const recentCampaignsRaw = await db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.createdAt)).limit(3);
    const recentCampaigns = recentCampaignsRaw.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || "Nenhuma descri\xE7\xE3o",
      status: c.status,
      platforms: c.platforms || [],
      // Já é JSONB, então deve ser array
      budget: parseFloat(c.budget ? c.budget.toString() : "0") || 0,
      // Converter Decimal para Number
      spent: parseFloat(c.dailyBudget ? c.dailyBudget.toString() : "0") || 0,
      // Usando dailyBudget como "spent" para o mock
      performance: Math.floor(Math.random() * (95 - 60 + 1)) + 60
      // Performance aleatória entre 60-95%
    }));
    const timeSeriesData = generateSimulatedLineChartData("Desempenho Geral", 1e3, timeRange === "30d" ? 30 : 7, 50, chartColors.palette[0]);
    const channelPerformanceData = generateSimulatedDoughnutChartData(["Meta Ads", "Google Ads", "LinkedIn", "TikTok"], 20, 10, chartColors.palette);
    const conversionData = generateSimulatedLineChartData("Convers\xF5es", 200, timeRange === "30d" ? 30 : 7, 30, chartColors.palette[1]);
    const roiData = generateSimulatedBarChartData("ROI (%)", ["Meta Ads", "Google Ads", "LinkedIn", "TikTok"], 250, 100, chartColors.palette);
    return {
      metrics: metricsData,
      recentCampaigns,
      alertCount: (await db.select({ count: count() }).from(alerts).where(and(eq(alerts.userId, userId), eq(alerts.isRead, false))))[0]?.count || 0,
      trends,
      timeSeriesData,
      channelPerformanceData,
      conversionData,
      roiData
    };
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { ZodError } from "zod";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// server/config.ts
var JWT_SECRET = process.env.JWT_SECRET || "sua-chave-secreta-super-segura-para-jwt";
var GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
var PORT = process.env.PORT || 5e3;

// server/routes.ts
var UPLOADS_ROOT_DIR = "uploads";
var LP_ASSETS_DIR = path.resolve(UPLOADS_ROOT_DIR, "lp-assets");
var CREATIVES_ASSETS_DIR = path.resolve(UPLOADS_ROOT_DIR, "creatives-assets");
var MCP_ATTACHMENTS_DIR = path.resolve(UPLOADS_ROOT_DIR, "mcp-attachments");
[UPLOADS_ROOT_DIR, LP_ASSETS_DIR, CREATIVES_ASSETS_DIR, MCP_ATTACHMENTS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Diret\xF3rio criado: ${dir}`);
  }
});
var genAI = null;
if (GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    console.log("[GEMINI] SDK do Gemini inicializado com sucesso.");
  } catch (error) {
    console.error("[GEMINI] Falha ao inicializar o SDK do Gemini:", error);
    genAI = null;
  }
} else {
  console.warn("[GEMINI] Chave da API do Gemini (GEMINI_API_KEY) n\xE3o configurada. O Agente MCP ter\xE1 funcionalidade limitada de IA.");
}
var creativesUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, CREATIVES_ASSETS_DIR),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error("Tipo de arquivo inv\xE1lido para criativos."));
  }
});
var lpAssetUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, LP_ASSETS_DIR),
    filename: (req, file, cb) => {
      cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_").toLowerCase());
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error("Tipo de arquivo inv\xE1lido para assets de landing page. Apenas imagens s\xE3o permitidas."));
  }
});
var mcpAttachmentUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, MCP_ATTACHMENTS_DIR),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, "mcp-attachment-" + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Tipo de arquivo n\xE3o permitido para anexos do MCP."));
  }
});
var authenticateToken = async (req, res, next) => {
  if (process.env.FORCE_AUTH_BYPASS === "true") {
    console.log("[AUTH] Bypass ativo - criando usu\xE1rio mock");
    req.user = {
      id: 1,
      username: "admin",
      email: "admin@usbmkt.com",
      password: "hashed_password",
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    return next();
  }
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Token n\xE3o fornecido." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded.userId !== "number") {
      return res.status(403).json({ error: "Token inv\xE1lido: userId n\xE3o \xE9 num\xE9rico." });
    }
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "Usu\xE1rio n\xE3o encontrado ou token inv\xE1lido." });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token expirado." });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ error: "Token inv\xE1lido." });
    }
    console.error("[AUTH_MIDDLEWARE] Erro inesperado na autentica\xE7\xE3o do token:", error);
    return res.status(500).json({ error: "Erro interno ao verificar token." });
  }
};
var handleZodError = (err, req, res, next) => {
  if (err instanceof ZodError) {
    console.warn(`[ZOD_ERROR] ${req.method} ${req.originalUrl}:`, err.errors);
    return res.status(400).json({
      error: "Erro de valida\xE7\xE3o",
      details: err.errors.map((e) => ({ path: e.path.join("."), message: e.message }))
    });
  }
  next(err);
};
var handleError = (err, req, res, next) => {
  console.error(`[HANDLE_ERROR] Unhandled error for ${req.method} ${req.originalUrl}:`, err.message);
  if (err.stack) {
    console.error(err.stack);
  }
  if (err instanceof multer.MulterError && err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ error: `Campo de arquivo inesperado: ${err.field}. Verifique o nome do campo esperado.` });
  }
  if (err.message && (err.message.includes("Tipo de arquivo inv\xE1lido") || err.code === "LIMIT_FILE_SIZE" || err.code === "ENOENT")) {
    return res.status(400).json({ error: err.message });
  }
  if (err.constructor && err.constructor.name === "GoogleGenerativeAIFetchError") {
    const generativeError = err;
    const status = generativeError.status || 500;
    const message2 = generativeError.message || "Erro ao comunicar com o servi\xE7o de IA.";
    console.error(`[GEMINI_API_ERROR] Status: ${status}, Message: ${message2}`, generativeError.errorDetails || generativeError);
    return res.status(status).json({ error: `Erro na IA: ${message2}` });
  }
  const statusCode = err.statusCode || 500;
  const message = err.message || "Erro interno do servidor.";
  res.status(statusCode).json({ error: message });
};
async function registerRoutes(app2) {
  app2.use(express.json({ limit: "10mb" }));
  app2.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app2.get("/api/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      service: "MKTV5",
      version: "1.0.0"
    });
  });
  app2.post("/api/auth/register", async (req, res, next) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ error: "Usu\xE1rio com este email j\xE1 existe." });
      }
      const user = await storage.createUser(userData);
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
      res.status(201).json({
        user: { id: user.id, username: user.username, email: user.email },
        token
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/auth/login", async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email e senha s\xE3o obrigat\xF3rios." });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Credenciais inv\xE1lidas." });
      }
      const isValidPassword = await storage.validatePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Credenciais inv\xE1lidas." });
      }
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
      res.json({
        user: { id: user.id, username: user.username, email: user.email },
        token
      });
    } catch (error) {
      console.error(`[LOGIN] Erro no handler de login:`, error);
      next(error);
    }
  });
  app2.get("/api/dashboard", authenticateToken, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const timeRange = req.query.timeRange || "30d";
      const dashboardData = await storage.getDashboardData(userId, timeRange);
      res.json(dashboardData);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/campaigns", authenticateToken, async (req, res, next) => {
    try {
      res.json(await storage.getCampaigns(req.user.id));
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/campaigns", authenticateToken, async (req, res, next) => {
    try {
      const campaignData = insertCampaignSchema.parse({ ...req.body, userId: req.user.id });
      res.status(201).json(await storage.createCampaign(campaignData));
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/campaigns/:id", authenticateToken, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "ID da campanha inv\xE1lido." });
      const campaign = await storage.getCampaign(id, req.user.id);
      if (!campaign) return res.status(404).json({ error: "Campanha n\xE3o encontrada." });
      res.json(campaign);
    } catch (error) {
      next(error);
    }
  });
  app2.put("/api/campaigns/:id", authenticateToken, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "ID da campanha inv\xE1lido." });
      const { userId, ...updateData } = req.body;
      const campaignData = insertCampaignSchema.partial().parse(updateData);
      const campaign = await storage.updateCampaign(id, campaignData, req.user.id);
      if (!campaign) return res.status(404).json({ error: "Campanha n\xE3o encontrada ou n\xE3o pertence ao usu\xE1rio." });
      res.json(campaign);
    } catch (error) {
      next(error);
    }
  });
  app2.delete("/api/campaigns/:id", authenticateToken, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "ID da campanha inv\xE1lido." });
      const success = await storage.deleteCampaign(id, req.user.id);
      if (!success) return res.status(404).json({ error: "Campanha n\xE3o encontrada ou n\xE3o pode ser exclu\xEDda." });
      res.status(200).json({ message: "Campanha exclu\xEDda com sucesso." });
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/creatives", authenticateToken, async (req, res, next) => {
    try {
      const campaignId = req.query.campaignId ? parseInt(req.query.campaignId) : void 0;
      if (req.query.campaignId && isNaN(campaignId)) return res.status(400).json({ error: "ID da campanha inv\xE1lido." });
      res.json(await storage.getCreatives(req.user.id, campaignId));
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/creatives", authenticateToken, creativesUpload.single("file"), async (req, res, next) => {
    try {
      const creativeData = insertCreativeSchema.parse({
        ...req.body,
        userId: req.user.id,
        fileUrl: req.file ? `/${UPLOADS_ROOT_DIR}/creatives-assets/${req.file.filename}` : req.body.fileUrl || null
      });
      const creative = await storage.createCreative(creativeData);
      res.status(201).json(creative);
    } catch (error) {
      if (req.file && error instanceof Error && (error.message.includes("Tipo de arquivo inv\xE1lido") || error.code === "LIMIT_FILE_SIZE")) {
        fs.unlink(path.join(CREATIVES_ASSETS_DIR, req.file.filename), (unlinkErr) => {
          if (unlinkErr) console.error("Erro ao deletar arquivo de criativo ap\xF3s falha:", unlinkErr);
        });
      }
      next(error);
    }
  });
  app2.delete("/api/creatives/:id", authenticateToken, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "ID do criativo inv\xE1lido." });
      const creative = await storage.getCreative(id, req.user.id);
      if (!creative) return res.status(404).json({ error: "Criativo n\xE3o encontrado." });
      const success = await storage.deleteCreative(id, req.user.id);
      if (!success) return res.status(404).json({ error: "Criativo n\xE3o encontrado ou n\xE3o pode ser exclu\xEDdo." });
      if (creative.fileUrl) {
        const filePath = path.join(process.cwd(), creative.fileUrl.startsWith("/") ? creative.fileUrl.substring(1) : creative.fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) console.error(`Erro ao deletar arquivo f\xEDsico ${filePath}:`, err);
          });
        }
      }
      res.status(200).json({ message: "Criativo exclu\xEDdo com sucesso." });
    } catch (error) {
      next(error);
    }
  });
  app2.put("/api/creatives/:id", authenticateToken, creativesUpload.single("file"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "ID do criativo inv\xE1lido." });
      const userId = req.user.id;
      const existingCreative = await storage.getCreative(id, userId);
      if (!existingCreative) {
        return res.status(404).json({ error: "Criativo n\xE3o encontrado ou n\xE3o pertence ao usu\xE1rio." });
      }
      const { userId: _, ...updateDataRaw } = req.body;
      const updateData = insertCreativeSchema.partial().parse(updateDataRaw);
      let newFileUrl = void 0;
      const appBaseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 5e3}`;
      if (req.file) {
        newFileUrl = `${appBaseUrl}/${UPLOADS_ROOT_DIR}/creatives-assets/${req.file.filename}`;
        if (existingCreative.fileUrl && existingCreative.fileUrl !== newFileUrl) {
          try {
            const oldFilePath = path.join(process.cwd(), existingCreative.fileUrl.startsWith("/") ? existingCreative.fileUrl.substring(1) : existingCreative.fileUrl);
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
              console.log(`[CREATIVE_UPDATE] Old file deleted: ${oldFilePath}`);
            }
          } catch (unlinkErr) {
            console.error(`[CREATIVE_UPDATE] Error deleting old file ${existingCreative.fileUrl}:`, unlinkErr);
          }
        }
      } else if (req.body.fileUrl === "null" && existingCreative.fileUrl) {
        try {
          const oldFilePath = path.join(process.cwd(), existingCreative.fileUrl.startsWith("/") ? existingCreative.fileUrl.substring(1) : existingCreative.fileUrl);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
            console.log(`[CREATIVE_UPDATE] Existing file removed: ${oldFilePath}`);
          }
        } catch (unlinkErr) {
          console.error(`[CREATIVE_UPDATE] Error deleting existing file ${existingCreative.fileUrl}:`, unlinkErr);
        }
        newFileUrl = null;
      } else {
        newFileUrl = existingCreative.fileUrl;
      }
      if (newFileUrl !== void 0) {
        updateData.fileUrl = newFileUrl;
      }
      const updatedCreative = await storage.updateCreative(id, updateData, userId);
      if (!updatedCreative) {
        return res.status(404).json({ error: "Criativo n\xE3o encontrado ou n\xE3o pertence ao usu\xE1rio." });
      }
      res.json(updatedCreative);
    } catch (error) {
      if (req.file) {
        fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) console.error("Erro ao deletar novo arquivo de criativo ap\xF3s falha:", unlinkErr);
        });
      }
      next(error);
    }
  });
  app2.get("/api/whatsapp/messages", authenticateToken, async (req, res, next) => {
    try {
      const contactNumber = req.query.contact;
      res.json(await storage.getMessages(req.user.id, contactNumber));
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/whatsapp/messages", authenticateToken, async (req, res, next) => {
    try {
      const messageData = insertWhatsappMessageSchema.parse({ ...req.body, userId: req.user.id });
      res.status(201).json(await storage.createMessage(messageData));
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/whatsapp/contacts", authenticateToken, async (req, res, next) => {
    try {
      res.json(await storage.getContacts(req.user.id));
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/copies", authenticateToken, async (req, res, next) => {
    try {
      const campaignId = req.query.campaignId ? parseInt(req.query.campaignId) : void 0;
      if (req.query.campaignId && isNaN(campaignId)) return res.status(400).json({ error: "ID da campanha inv\xE1lido." });
      res.json(await storage.getCopies(req.user.id, campaignId));
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/copies", authenticateToken, async (req, res, next) => {
    try {
      const copyData = insertCopySchema.parse({ ...req.body, userId: req.user.id, campaignId: req.body.campaignId ? parseInt(req.body.campaignId) : null });
      res.status(201).json(await storage.createCopy(copyData));
    } catch (error) {
      next(error);
    }
  });
  app2.delete("/api/copies/:id", authenticateToken, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "ID da copy inv\xE1lido." });
      const success = await storage.deleteCopy(id, req.user.id);
      if (!success) return res.status(404).json({ error: "Copy n\xE3o encontrada ou n\xE3o pode ser exclu\xEDda." });
      res.status(200).json({ message: "Copy exclu\xEDda com sucesso." });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/copies/generate", authenticateToken, async (req, res, next) => {
    try {
      const { product, audience, objective, tone } = req.body;
      if (!product || !audience || !objective || !tone) {
        return res.status(400).json({ error: "Campos obrigat\xF3rios ausentes." });
      }
      if (!genAI) {
        return res.status(500).json({ error: "Servi\xE7o de IA n\xE3o dispon\xEDvel." });
      }
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
      const prompts = [
        {
          type: "headline",
          platform: "Facebook",
          prompt: `Crie um headline persuasivo para Facebook sobre "${product}" direcionado para "${audience}" com objetivo de "${objective}" em tom "${tone}". M\xE1ximo 60 caracteres. Seja direto e impactante.`
        },
        {
          type: "cta",
          platform: "Google",
          prompt: `Crie um call-to-action (CTA) convincente para Google Ads sobre "${product}" direcionado para "${audience}" com objetivo de "${objective}" em tom "${tone}". M\xE1ximo 30 palavras.`
        },
        {
          type: "description",
          platform: "Instagram",
          prompt: `Crie uma descri\xE7\xE3o persuasiva para Instagram sobre "${product}" direcionado para "${audience}" com objetivo de "${objective}" em tom "${tone}". M\xE1ximo 125 caracteres.`
        }
      ];
      const generatedCopies = [];
      for (const promptData of prompts) {
        try {
          const result = await model.generateContent(promptData.prompt);
          const content = result.response.text().trim();
          generatedCopies.push({
            type: promptData.type,
            content,
            platform: promptData.platform
          });
        } catch (error) {
          console.error(`[GEMINI] Erro ao gerar ${promptData.type}:`, error);
          generatedCopies.push({
            type: promptData.type,
            content: `${promptData.type === "headline" ? "\u{1F680}" : promptData.type === "cta" ? "Clique aqui e descubra como" : "Solu\xE7\xE3o perfeita para"} ${audience} ${promptData.type === "headline" ? "com nossa solu\xE7\xE3o inovadora para" : promptData.type === "cta" ? "est\xE3o revolucionando seus resultados com" : "que buscam"} ${objective.toLowerCase()}${promptData.type === "headline" ? "!" : promptData.type === "cta" ? "!" : ". Com nosso"} ${promptData.type !== "headline" ? product + (promptData.type === "description" ? ", voc\xEA alcan\xE7a resultados extraordin\xE1rios em tempo recorde." : "!") : product + "!"}`,
            platform: promptData.platform
          });
        }
      }
      res.json(generatedCopies);
    } catch (error) {
      console.error("[COPIES] Erro na gera\xE7\xE3o:", error);
      next(error);
    }
  });
  app2.get("/api/alerts", authenticateToken, async (req, res, next) => {
    try {
      const onlyUnread = req.query.unread === "true";
      res.json(await storage.getAlerts(req.user.id, onlyUnread));
    } catch (error) {
      next(error);
    }
  });
  app2.put("/api/alerts/:id/read", authenticateToken, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "ID do alerta inv\xE1lido." });
      const success = await storage.markAlertAsRead(id, req.user.id);
      if (!success) return res.status(404).json({ error: "Alerta n\xE3o encontrado ou j\xE1 lido." });
      res.json({ success: true, message: "Alerta marcado como lido." });
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/budgets", authenticateToken, async (req, res, next) => {
    try {
      const campaignId = req.query.campaignId ? parseInt(req.query.campaignId) : void 0;
      if (req.query.campaignId && isNaN(campaignId)) return res.status(400).json({ error: "ID da campanha inv\xE1lido." });
      res.json(await storage.getBudgets(req.user.id, campaignId));
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/budgets", authenticateToken, async (req, res, next) => {
    try {
      const budgetData = insertBudgetSchema.parse({ ...req.body, userId: req.user.id });
      res.status(201).json(await storage.createBudget(budgetData));
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/landingpages", authenticateToken, async (req, res, next) => {
    try {
      res.json(await storage.getLandingPages(req.user.id));
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/landingpages", authenticateToken, async (req, res, next) => {
    try {
      const { grapesJsData, ...otherData } = req.body;
      const lpData = insertLandingPageSchema.parse({ ...otherData, userId: req.user.id, grapesJsData: grapesJsData || {} });
      if (lpData.slug) {
        const existingSlug = await storage.getLandingPageBySlug(lpData.slug);
        if (existingSlug) return res.status(409).json({ error: "Este slug j\xE1 est\xE1 em uso." });
      }
      res.status(201).json(await storage.createLandingPage(lpData));
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/landingpages/studio-project/:studioProjectId", authenticateToken, async (req, res, next) => {
    try {
      const { studioProjectId } = req.params;
      const landingPage = await storage.getLandingPageByStudioProjectId(studioProjectId, req.user.id);
      if (!landingPage) return res.status(404).json({ error: "Projeto de Landing Page n\xE3o encontrado." });
      res.json({ project: landingPage.grapesJsData || {} });
    } catch (error) {
      next(error);
    }
  });
  app2.put("/api/landingpages/:id", authenticateToken, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "ID da Landing Page inv\xE1lido." });
      const { userId: _, slug, grapesJsData, ...otherData } = req.body;
      const lpDataToValidate = { ...otherData, grapesJsData: grapesJsData || {} };
      const lpData = insertLandingPageSchema.partial().parse(lpDataToValidate);
      if (slug) {
        const existingSlugPage = await storage.getLandingPageBySlug(slug);
        if (existingSlugPage && existingSlugPage.id !== id) return res.status(409).json({ error: "Este slug j\xE1 est\xE1 em uso." });
        lpData.slug = slug;
      }
      const updatedLandingPage = await storage.updateLandingPage(id, lpData, req.user.id);
      if (!updatedLandingPage) return res.status(404).json({ error: "Landing Page n\xE3o encontrada." });
      res.json(updatedLandingPage);
    } catch (error) {
      next(error);
    }
  });
  app2.delete("/api/landingpages/:id", authenticateToken, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "ID da Landing Page inv\xE1lido." });
      const success = await storage.deleteLandingPage(id, req.user.id);
      if (!success) return res.status(404).json({ error: "Landing Page n\xE3o encontrada." });
      res.status(200).json({ message: "Landing Page exclu\xEDda com sucesso." });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/assets/lp-upload", authenticateToken, lpAssetUpload.single("file"), (req, res, next) => {
    try {
      if (!req.file) {
        console.log("[ASSET_UPLOAD_LP] Nenhum arquivo recebido.");
        return res.status(400).json({ error: "Nenhum arquivo enviado." });
      }
      const appBaseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 5e3}`;
      const publicUrl = `${appBaseUrl}/${UPLOADS_ROOT_DIR}/lp-assets/${req.file.filename}`;
      console.log(`[ASSET_UPLOAD_LP] Arquivo: ${req.file.originalname}, Salvo como: ${req.file.filename}, Campo: ${req.file.fieldname}, URL P\xFAblica: ${publicUrl}`);
      res.status(200).json([{ src: publicUrl }]);
    } catch (error) {
      console.error("[ASSET_UPLOAD_LP] Erro no handler:", error);
      next(error);
    }
  });
  app2.post("/api/assets/lp-delete", authenticateToken, async (req, res, next) => {
    try {
      const { assets } = req.body;
      if (!Array.isArray(assets) || assets.length === 0) return res.status(400).json({ error: "Nenhum asset para exclus\xE3o." });
      console.log("[ASSET_DELETE_LP] Solicitado para deletar:", assets);
      assets.forEach((asset) => {
        if (asset && typeof asset.src === "string") {
          try {
            const assetUrl = new URL(asset.src);
            const filename = path.basename(assetUrl.pathname);
            if (filename.includes("..") || !assetUrl.pathname.includes(`/${UPLOADS_ROOT_DIR}/lp-assets/`)) {
              console.warn(`[ASSET_DELETE_LP] Tentativa de path traversal ou URL inv\xE1lida: ${asset.src}`);
              return;
            }
            const filePath = path.join(LP_ASSETS_DIR, filename);
            console.log(`[ASSET_DELETE_LP] Tentando deletar: ${filePath}`);
            if (fs.existsSync(filePath)) {
              fs.unlink(filePath, (err) => {
                if (err) console.error(`[ASSET_DELETE_LP] Erro ao deletar: ${filePath}`, err);
                else console.log(`[ASSET_DELETE_LP] Deletado: ${filePath}`);
              });
            } else {
              console.warn(`[ASSET_DELETE_LP] N\xE3o encontrado: ${filePath}`);
            }
          } catch (e) {
            console.warn(`[ASSET_DELETE_LP] URL inv\xE1lida ou erro ao parsear: ${asset.src}`, e);
          }
        }
      });
      res.status(200).json({ message: "Solicita\xE7\xE3o de exclus\xE3o de assets processada." });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/mcp/upload-attachment", authenticateToken, mcpAttachmentUpload.single("attachment"), async (req, res, next) => {
    try {
      const userId = req.user.id;
      if (!req.file) {
        console.log("[MCP_ATTACHMENT_UPLOAD] Nenhum arquivo recebido.");
        return res.status(400).json({ error: "Nenhum arquivo de anexo enviado." });
      }
      const appBaseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 5e3}`;
      const attachmentUrl = `${appBaseUrl}/${UPLOADS_ROOT_DIR}/mcp-attachments/${req.file.filename}`;
      console.log(`[MCP_ATTACHMENT_UPLOAD] Arquivo: ${req.file.originalname}, Salvo como: ${req.file.filename}, URL P\xFAblica: ${attachmentUrl}`);
      res.status(200).json({ url: attachmentUrl });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/mcp/converse", authenticateToken, async (req, res, next) => {
    try {
      const { message, sessionId, attachmentUrl } = req.body;
      const userId = req.user.id;
      if (!message && !attachmentUrl) {
        return res.status(400).json({ error: "Mensagem ou anexo \xE9 obrigat\xF3rio." });
      }
      console.log(`[MCP_AGENT] User ${userId} disse: "${message || "[Anexo]"}" (Session: ${sessionId || "Nova"})`);
      let currentSession;
      if (sessionId) {
        currentSession = await storage.getChatSession(sessionId, userId);
      }
      if (!currentSession) {
        console.log(`[MCP_AGENT] Criando nova sess\xE3o de chat para o usu\xE1rio ${userId}`);
        currentSession = await storage.createChatSession(userId, `Conversa com IA ${(/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR")}`);
      }
      await storage.addChatMessage({
        sessionId: currentSession.id,
        sender: "user",
        text: message || (attachmentUrl ? "Anexo enviado." : ""),
        attachmentUrl: attachmentUrl || null
      });
      if (genAI && message) {
        const intentModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const promptForIntent = `O usu\xE1rio perguntou: "${message}". Ele est\xE1 pedindo para navegar para alguma se\xE7\xE3o da plataforma? Se sim, qual? Responda APENAS com a rota exata (ex: /dashboard, /campaigns, /creatives, /budget, /landingpages, /whatsapp, /copy, /funnel, /metrics, /alerts, /export, /integrations). Se n\xE3o for um pedido de navega\xE7\xE3o, responda "N\xC3O".
        Exemplos de inten\xE7\xE3o de navega\xE7\xE3o:
        - "Me leve para campanhas" -> /campaigns
        - "Quero ver o dashboard" -> /dashboard
        - "Abra a p\xE1gina de WhatsApp" -> /whatsapp
        - "Gerenciar criativos" -> /creatives
        - "Onde est\xE1 o or\xE7amento?" -> /budget
        - "Mostrar landing pages" -> /landingpages
        - "Ver alertas" -> /alerts
        - "Ir para funil" -> /funnel
        - "Eu quero exportar dados" -> /export
        - "Configura\xE7\xF5es de integra\xE7\xE3o" -> /integrations
        - "Preciso de copy" -> /copy
        `;
        const intentResult = await intentModel.generateContent(promptForIntent);
        const intentResponse = intentResult.response.text().trim();
        const validRoutes = [
          "/dashboard",
          "/campaigns",
          "/creatives",
          "/budget",
          "/landingpages",
          "/whatsapp",
          "/copy",
          "/funnel",
          "/metrics",
          "/alerts",
          "/export",
          "/integrations"
        ];
        if (validRoutes.includes(intentResponse)) {
          console.log(`[MCP_AGENT] Inten\xE7\xE3o de navega\xE7\xE3o detectada: ${intentResponse}`);
          const agentReplyText2 = `Claro! Te levarei para ${intentResponse.replace("/", "") || "o Dashboard"}...`;
          await storage.addChatMessage({
            sessionId: currentSession.id,
            sender: "agent",
            text: agentReplyText2
          });
          return res.json({
            reply: agentReplyText2,
            action: "navigate",
            payload: intentResponse,
            sessionId: currentSession.id
          });
        }
      }
      let agentReplyText;
      if (genAI) {
        const modelName = "gemini-1.5-flash-latest";
        console.log(`[MCP_AGENT] Usando modelo para resposta: "${modelName}"`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const messagesFromDb = await storage.getChatMessages(currentSession.id, userId);
        const historyForGemini = messagesFromDb.map((msg) => ({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }]
        }));
        const systemPrompt = { role: "user", parts: [{ text: "Voc\xEA \xE9 o Agente MCP, um assistente de IA para a plataforma de marketing digital USB MKT PRO V2. Sua principal fun\xE7\xE3o \xE9 auxiliar os usu\xE1rios com informa\xE7\xF5es sobre a plataforma e marketing digital. Responda sempre em Portugu\xEAs do Brasil. Mantenha as respostas concisas e \xFAteis." }] };
        const initialAgentResponse = { role: "model", parts: [{ text: "Ol\xE1! Eu sou o Agente MCP, seu assistente inteligente na plataforma USB MKT PRO V2. Como posso te ajudar com marketing digital hoje?" }] };
        const fullHistory = [systemPrompt, initialAgentResponse, ...historyForGemini];
        const chat = model.startChat({
          history: fullHistory,
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.7
          },
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }
          ]
        });
        const result = await chat.sendMessage(message || "Processar anexo");
        const response = result.response;
        agentReplyText = response.text();
        console.log(`[MCP_AGENT] Gemini respondeu (resposta geral): "${agentReplyText}"`);
      } else {
        agentReplyText = `Recebido: "${message}". O servi\xE7o de IA (Gemini) n\xE3o est\xE1 configurado corretamente no servidor.`;
        console.log(`[MCP_AGENT] Respondendo (sem IA): "${agentReplyText}"`);
      }
      await storage.addChatMessage({
        sessionId: currentSession.id,
        sender: "agent",
        text: agentReplyText
      });
      return res.json({ reply: agentReplyText, sessionId: currentSession.id });
    } catch (error) {
      console.error("[MCP_AGENT] Erro detalhado no endpoint /api/mcp/converse:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      next(error);
    }
  });
  app2.post("/api/chat/sessions", authenticateToken, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { title } = insertChatSessionSchema.partial().parse(req.body);
      const newSession = await storage.createChatSession(userId, title || "Nova Conversa");
      res.status(201).json(newSession);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/chat/sessions", authenticateToken, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const sessions = await storage.getChatSessions(userId);
      res.json(sessions);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/chat/sessions/:sessionId/messages", authenticateToken, async (req, res, next) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) return res.status(400).json({ error: "ID da sess\xE3o inv\xE1lido." });
      const userId = req.user.id;
      const messages = await storage.getChatMessages(sessionId, userId);
      res.json(messages);
    } catch (error) {
      next(error);
    }
  });
  app2.put("/api/chat/sessions/:sessionId/title", authenticateToken, async (req, res, next) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) return res.status(400).json({ error: "ID da sess\xE3o inv\xE1lido." });
      const userId = req.user.id;
      const { title } = req.body;
      if (!title || typeof title !== "string" || title.trim() === "") {
        return res.status(400).json({ error: "Novo t\xEDtulo inv\xE1lido." });
      }
      const updatedSession = await storage.updateChatSessionTitle(sessionId, userId, title);
      if (!updatedSession) return res.status(404).json({ error: "Sess\xE3o n\xE3o encontrada ou n\xE3o pertence ao usu\xE1rio." });
      res.json(updatedSession);
    } catch (error) {
      next(error);
    }
  });
  app2.delete("/api/chat/sessions/:sessionId", authenticateToken, async (req, res, next) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) return res.status(400).json({ error: "ID da sess\xE3o inv\xE1lido." });
      const userId = req.user.id;
      const success = await storage.deleteChatSession(sessionId, userId);
      if (!success) return res.status(404).json({ error: "Sess\xE3o n\xE3o encontrada ou n\xE3o pode ser exclu\xEDda." });
      res.status(200).json({ message: "Sess\xE3o de chat exclu\xEDda com sucesso." });
    } catch (error) {
      next(error);
    }
  });
  app2.use(`/${UPLOADS_ROOT_DIR}`, express.static(path.join(process.cwd(), UPLOADS_ROOT_DIR)));
  app2.use(handleZodError);
  app2.use(handleError);
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import { fileURLToPath } from "node:url";
var vite_config_default = defineConfig(({ command, mode }) => {
  const plugins = [
    react()
    // O runtimeErrorOverlay é útil para desenvolvimento, pode ser removido para produção final se desejado
    // runtimeErrorOverlay(), 
  ];
  return {
    plugins,
    define: {
      // Expor variáveis de ambiente para o frontend
      "import.meta.env.VITE_FORCE_AUTH_BYPASS": JSON.stringify(process.env.VITE_FORCE_AUTH_BYPASS || process.env.FORCE_AUTH_BYPASS || "false"),
      "import.meta.env.VITE_API_URL": JSON.stringify(process.env.VITE_API_URL || process.env.APP_BASE_URL || "")
    },
    resolve: {
      alias: {
        // Usando fileURLToPath para compatibilidade com ES modules
        "@": path2.resolve(path2.dirname(fileURLToPath(import.meta.url)), "client", "src"),
        "@shared": path2.resolve(path2.dirname(fileURLToPath(import.meta.url)), "shared"),
        "@assets": path2.resolve(path2.dirname(fileURLToPath(import.meta.url)), "attached_assets")
      }
    },
    // A raiz do projeto para o Vite (onde o index.html do cliente está)
    root: path2.resolve(path2.dirname(fileURLToPath(import.meta.url)), "client"),
    build: {
      // Diretório de saída para os assets do cliente, relativo à raiz do projeto (não à 'root' do Vite)
      outDir: path2.resolve(path2.dirname(fileURLToPath(import.meta.url)), "dist/public"),
      emptyOutDir: true,
      // Limpa o diretório de saída antes de cada build
      rollupOptions: {
        // external: [], // Use apenas se você explicitamente não quer empacotar uma lib
      }
      // commonjsOptions: { // Descomente se suspeitar de problemas com módulos CommonJS
      //   transformMixedEsModules: true,
      //   include: [/node_modules/], 
      // },
    },
    optimizeDeps: {
      include: [
        // Adicione aqui o nome EXATO do pacote que você está tentando importar
        // e que está causando o erro "Rollup failed to resolve import".
        // Se o erro for para "@grapesjs/studio", adicione-o.
        // Se o pacote real for "@grapesjs/studio-sdk", use esse.
        "@grapesjs/studio"
        // Exemplo, ajuste para o nome correto do pacote do GrapesJS Studio SDK
        // Adicione outros pacotes do SDK se forem importados diretamente e causarem problemas
        // Ex: '@grapesjs/studio-react' (se for um pacote separado e importado)
      ]
      // esbuildOptions: { // Raramente necessário, mas pode ajudar com alguns pacotes
      //   target: 'esnext', 
      // },
    },
    server: {
      // Configurações do servidor de desenvolvimento Vite
      port: 3e3,
      // Ou a porta que você preferir para desenvolvimento local
      host: "0.0.0.0",
      // Permite acesso de qualquer host
      allowedHosts: [
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "work-1-cixzsejsspdqlyvw.prod-runtime.all-hands.dev",
        "work-2-cixzsejsspdqlyvw.prod-runtime.all-hands.dev",
        ".all-hands.dev",
        ".prod-runtime.all-hands.dev"
      ]
      // proxy: { // Exemplo se você precisar de proxy para o backend em desenvolvimento
      //   '/api': {
      //     target: 'http://localhost:5000', // Seu servidor backend
      //     changeOrigin: true,
      //   },
      // },
    }
  };
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    host: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
dotenv2.config();
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  log(`Environment: NODE_ENV=${process.env.NODE_ENV}, app.get("env")=${app.get("env")}`);
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = process.env.PORT || 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
