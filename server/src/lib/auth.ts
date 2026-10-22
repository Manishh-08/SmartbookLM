import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./db.js";

const trustedOrigins = Array.from(
  new Set([
    "http://localhost:3000",
    "http://localhost:3001",
    "https://smartbook-lm.vercel.app",
  ]),
);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:8081",
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  advanced: {
    // Required for cross-domain cookies between Vercel and Render
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
      partitioned: true, // Helps with modern browser third-party cookie restrictions
    },
  }
});