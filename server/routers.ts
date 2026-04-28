import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { sdk } from "./_core/sdk";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import type { Message as LLMMessage } from "./_core/llm";
import { storagePut } from "./storage";

export const appRouter = router({
  system: systemRouter,

  // Authentication routes
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Chat routes
  chat: router({
    // Create a new conversation
    createConversation: protectedProcedure
      .input(z.object({ title: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const conversation = await db.createConversation(
          ctx.user.id,
          input.title
        );
        return conversation;
      }),

    // Get all conversations for a user
    getConversations: protectedProcedure.query(async ({ ctx }) => {
      const conversations = await db.getConversationsByUserId(ctx.user.id);
      return conversations;
    }),

    // Get messages for a conversation
    getMessages: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        const messages = await db.getMessagesByConversationId(
          input.conversationId
        );
        return messages;
      }),

    // Send a message and get AI response with streaming
    sendMessage: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          content: z.string(),
          attachments: z.array(z.object({
            fileName: z.string(),
            fileSize: z.number(),
            mimeType: z.string(),
            storageKey: z.string(),
          })).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Save user message
        const userMessage = await db.createMessage(
          input.conversationId,
          ctx.user.id,
          "user",
          input.content
        );

        // Save attachments if provided
        if (input.attachments && input.attachments.length > 0) {
          for (const attachment of input.attachments) {
            await db.createAttachment(
              userMessage.id,
              ctx.user.id,
              attachment.fileName,
              attachment.fileSize,
              attachment.mimeType,
              attachment.storageKey
            );
          }
        }

        // Get conversation history for context
        const messages = await db.getMessagesByConversationId(
          input.conversationId
        );

        // Prepare messages for OpenAI
        const conversationHistory = messages.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }));

        // Add current message
        conversationHistory.push({
          role: "user" as const,
          content: input.content,
        });

        // Call OpenAI API with streaming
        const response = await invokeLLM({
          messages: conversationHistory as any,
        });

        const aiContent = typeof response.choices[0]?.message?.content === 'string'
          ? response.choices[0].message.content
          : "";

        // Save AI response
        const aiMessage = await db.createMessage(
          input.conversationId,
          ctx.user.id,
          "assistant",
          aiContent
        );

        return {
          userMessage,
          aiMessage,
          content: aiContent,
        };
      }),

    // Upload file attachment
    uploadAttachment: protectedProcedure
      .input(
        z.object({
          fileName: z.string(),
          fileSize: z.number(),
          mimeType: z.string(),
          fileData: z.string(), // base64 encoded
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Validate file size (max 50MB)
        if (input.fileSize > 50 * 1024 * 1024) {
          throw new Error("File size exceeds 50MB limit");
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(input.fileData, "base64");

        // Upload to storage
        const storageKey = `attachments/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(storageKey, buffer, input.mimeType);

        return {
          storageKey,
          url,
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
        };
      }),
  }),

  // User routes
  user: router({
    // Get user profile
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      return user;
    }),

    // Update user profile
    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().optional(),
          email: z.string().email().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user) throw new Error("User not found");

        await db.upsertUser({
          accessKey: user.accessKey,
          email: input.email || user.email,
          name: input.name || user.name,
          passwordHash: user.passwordHash,
        });

        return { success: true };
      }),

    // Get usage statistics
    getUsage: protectedProcedure.query(async ({ ctx }) => {
      const usage = await db.getUserUsage(ctx.user.id);
      return usage;
    }),

    // Get subscription info
    getSubscription: protectedProcedure.query(async ({ ctx }) => {
      const subscription = await db.getUserSubscription(ctx.user.id);
      return subscription;
    }),
  }),

  // Plans and billing routes
  billing: router({
    // Get all available plans
    getPlans: publicProcedure.query(async () => {
      const plans = await db.getAllPlans();
      return plans;
    }),

    // Get invoices for current user
    getInvoices: protectedProcedure.query(async ({ ctx }) => {
      // TODO: Implement invoice retrieval from database
      return [];
    }),
  }),

  // Admin routes
  admin: router({
    // Get all users (admin only)
    getUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }
      // TODO: Implement user list retrieval
      return [];
    }),

    // Get audit logs (admin only)
    getAuditLogs: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }
      // TODO: Implement audit log retrieval
      return [];
    }),

    // Get admin alerts (admin only)
    getAlerts: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }
      const alerts = await db.getAdminAlerts(ctx.user.id);
      return alerts;
    }),

    // Mark alert as read (admin only)
    markAlertAsRead: protectedProcedure
      .input(z.object({ alertId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }
        // TODO: Implement alert update
        return { success: true };
      }),

    // Get system metrics (admin only)
    getMetrics: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }
      // TODO: Implement metrics retrieval
      return {
        totalUsers: 0,
        totalMessages: 0,
        totalRevenue: 0,
        activeSubscriptions: 0,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
