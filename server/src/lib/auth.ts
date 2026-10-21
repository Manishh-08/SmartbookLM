import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./db.js";

const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.RENDER === "true" ||
  !!process.env.RENDER_EXTERNAL_URL ||
  (process.env.CLIENT_URL ? !process.env.CLIENT_URL.includes("localhost") : false);

const clientUrls = (process.env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const trustedOrigins = Array.from(
  new Set([
    "http://localhost:3000",
    "http://localhost:3001",
    ...clientUrls,
    "https://*.vercel.app",
  ]),
);

const betterAuthUrl = (
  process.env.BETTER_AUTH_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  "http://localhost:8081"
).replace(/\/+$/, "");

export const auth = betterAuth({
  baseURL: betterAuthUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  account: {
    storeStateStrategy: "database",
    skipStateCookieCheck: true,
  },
  advanced: {
    useSecureCookies: isProduction,
    defaultCookieAttributes: {
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});