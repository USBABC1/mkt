// server/api/landingpages.storage.ts
import { db } from '../db';
import * as schema from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

class LandingPagesStorage {
    private db = db;

    async getLandingPages(userId: number): Promise<schema.LandingPage[]> {
        return this.db.query.landingPages.findMany({
            where: eq(schema.landingPages.userId, userId),
            orderBy: [desc(schema.landingPages.createdAt)],
        });
    }

    async getLandingPage(id: number, userId: number): Promise<schema.LandingPage | undefined> {
        return this.db.query.landingPages.findFirst({
            where: and(eq(schema.landingPages.id, id), eq(schema.landingPages.userId, userId))
        });
    }

    async getLandingPageBySlug(slug: string): Promise<schema.LandingPage | undefined> {
        return this.db.query.landingPages.findFirst({ where: eq(schema.landingPages.slug, slug) });
    }

    async createLandingPage(lpData: schema.InsertLandingPage, userId: number): Promise<schema.LandingPage> {
        const result = await this.db.insert(schema.landingPages).values({ ...lpData, userId }).returning();
        return result[0];
    }
    
    async updateLandingPage(id: number, lpData: Partial<schema.InsertLandingPage>, userId: number): Promise<schema.LandingPage | undefined> {
        const result = await this.db.update(schema.landingPages)
            .set({ ...lpData, updatedAt: new Date() })
            .where(and(eq(schema.landingPages.id, id), eq(schema.landingPages.userId, userId)))
            .returning();
        return result[0];
    }

    async deleteLandingPage(id: number, userId: number): Promise<void> {
        await this.db.delete(schema.landingPages).where(and(eq(schema.landingPages.id, id), eq(schema.landingPages.userId, userId)));
    }

    async generateUniqueSlug(base: string): Promise<string> {
        let slug = base;
        let counter = 1;
        while (await this.getLandingPageBySlug(slug)) {
            slug = `${base}-${counter}`;
            counter++;
        }
        return slug;
    }
}

export const landingPagesStorage = new LandingPagesStorage();
