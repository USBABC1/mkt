// server/api/whatsapp.storage.ts
import { db } from '../db';
import * as schema from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

class WhatsappStorage {
    private db = db;

    async getMessages(userId: number, contactNumber?: string) {
        const conditions = [eq(schema.whatsappMessages.userId, userId)];
        if (contactNumber) {
            conditions.push(eq(schema.whatsappMessages.contactNumber, contactNumber));
        }
        return this.db.query.whatsappMessages.findMany({
            where: and(...conditions),
            orderBy: [desc(schema.whatsappMessages.timestamp)],
        });
    }

    async createMessage(messageData: schema.InsertWhatsappMessage, userId: number) {
        const result = await this.db.insert(schema.whatsappMessages).values({ ...messageData, userId }).returning();
        return result[0];
    }
    
    async markMessageAsRead(messageId: number, userId: number) {
        await this.db.update(schema.whatsappMessages)
            .set({ isRead: true })
            .where(and(eq(schema.whatsappMessages.id, messageId), eq(schema.whatsappMessages.userId, userId)));
    }

    async getContacts(userId: number) {
        // Esta query busca a mensagem mais recente de cada contato e conta as não lidas.
        const contactsWithDetails = await this.db.execute(schema.sql`
            WITH latest_messages AS (
                SELECT
                    contact_number,
                    MAX(timestamp) AS max_timestamp
                FROM whatsapp_messages
                WHERE user_id = ${userId}
                GROUP BY contact_number
            ),
            unread_counts AS (
                SELECT
                    contact_number,
                    COUNT(*) as unread_count
                FROM whatsapp_messages
                WHERE user_id = ${userId} AND is_read = false AND direction = 'incoming'
                GROUP BY contact_number
            )
            SELECT
                wm.contact_number as "contactNumber",
                wm.contact_name as "contactName",
                wm.message as "lastMessage",
                wm.timestamp,
                COALESCE(uc.unread_count, 0)::int as "unreadCount"
            FROM whatsapp_messages wm
            JOIN latest_messages lm ON wm.contact_number = lm.contact_number AND wm.timestamp = lm.max_timestamp
            LEFT JOIN unread_counts uc ON wm.contact_number = uc.contact_number
            WHERE wm.user_id = ${userId}
            ORDER BY wm.timestamp DESC;
        `);
        return contactsWithDetails.rows;
    }
}

export const whatsappStorage = new WhatsappStorage();
