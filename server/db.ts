import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser,
  users,
  conversations,
  messages,
  attachments,
  plans,
  subscriptions,
  usage,
  invoices,
  auditLogs,
  adminAlerts,
  stripeEvents,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL);
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _client = null;
    }
  }
  return _db;
}

export async function closeDb() {
  if (_client) {
    await _client.end();
    _client = null;
    _db = null;
  }
}

// User operations
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.accessKey) {
    throw new Error("User accessKey is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.accessKey, user.accessKey))
      .limit(1);

    if (existingUser.length > 0) {
      // Update existing user
      await db
        .update(users)
        .set({
          email: user.email,
          name: user.name,
          passwordHash: user.passwordHash,
          role: user.role || "user",
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.accessKey, user.accessKey));
    } else {
      // Insert new user
      await db.insert(users).values({
        ...user,
        role: user.role || "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByAccessKey(accessKey: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.accessKey, accessKey))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Conversation operations
export async function createConversation(
  userId: number,
  title: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .insert(conversations)
    .values({
      userId,
      title,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return result[0];
}

export async function getConversationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(conversations.updatedAt);
}

// Message operations
export async function createMessage(
  conversationId: number,
  userId: number,
  role: string,
  content: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .insert(messages)
    .values({
      conversationId,
      userId,
      role,
      content,
      isEdited: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return result[0];
}

export async function getMessagesByConversationId(conversationId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

// Attachment operations
export async function createAttachment(
  messageId: number,
  userId: number,
  fileName: string,
  fileSize: number,
  mimeType: string,
  storageKey: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .insert(attachments)
    .values({
      messageId,
      userId,
      fileName,
      fileSize,
      mimeType,
      storageKey,
      createdAt: new Date(),
    })
    .returning();

  return result[0];
}

// Plan operations
export async function getPlanByType(type: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(plans)
    .where(eq(plans.type, type as any))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getAllPlans() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(plans).where(eq(plans.isActive, true));
}

// Subscription operations
export async function createSubscription(
  userId: number,
  planId: number,
  stripeSubscriptionId?: string,
  stripeCustomerId?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const result = await db
    .insert(subscriptions)
    .values({
      userId,
      planId,
      stripeSubscriptionId,
      stripeCustomerId,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return result[0];
}

export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// Usage operations
export async function createUsage(
  userId: number,
  subscriptionId: number,
  periodStart: Date,
  periodEnd: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .insert(usage)
    .values({
      userId,
      subscriptionId,
      messageCount: 0,
      excessMessageCount: 0,
      excessCharges: "0",
      periodStart,
      periodEnd,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return result[0];
}

export async function getUserUsage(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(usage)
    .where(eq(usage.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// Invoice operations
export async function createInvoice(
  userId: number,
  subscriptionId: number,
  amount: string,
  stripeInvoiceId?: string,
  description?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .insert(invoices)
    .values({
      userId,
      subscriptionId,
      stripeInvoiceId,
      amount,
      currency: "BRL",
      status: "draft",
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return result[0];
}

// Audit log operations
export async function createAuditLog(
  userId: number,
  action: string,
  resourceType: string,
  resourceId?: number,
  details?: string,
  ipAddress?: string,
  userAgent?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .insert(auditLogs)
    .values({
      userId,
      action: action as any,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent,
      createdAt: new Date(),
    })
    .returning();

  return result[0];
}

// Admin alert operations
export async function createAdminAlert(
  adminId: number,
  alertType: string,
  title: string,
  message: string,
  relatedUserId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .insert(adminAlerts)
    .values({
      adminId,
      alertType,
      title,
      message,
      relatedUserId,
      isRead: false,
      createdAt: new Date(),
    })
    .returning();

  return result[0];
}

export async function getAdminAlerts(adminId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(adminAlerts)
    .where(eq(adminAlerts.adminId, adminId))
    .orderBy(adminAlerts.createdAt);
}

// Stripe event operations
export async function createStripeEvent(
  eventId: string,
  eventType: string,
  data: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .insert(stripeEvents)
    .values({
      eventId,
      eventType,
      data,
      processed: false,
      createdAt: new Date(),
    })
    .returning();

  return result[0];
}

export async function getStripeEventByEventId(eventId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(stripeEvents)
    .where(eq(stripeEvents.eventId, eventId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}
