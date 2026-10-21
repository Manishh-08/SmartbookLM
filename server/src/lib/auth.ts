import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./db.js";

const trustedOrigins = Array.from(
  new Set([
    "http://localhost:3000",
    "http://localhost:3001",
    ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
  ]),
);
const betterAuthUrl = process.env.BETTER_AUTH_URL || `http://localhost:8081`;
export const auth = betterAuth({
  baseURL: betterAuthUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }
  }
});