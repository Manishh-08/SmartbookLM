import express from 'express';
import 'dotenv/config';
import { auth } from './lib/auth.js';
import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import { registerRoutes } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.middleware.js';
import { inngest } from "./inngest/client.js";
import { serve } from "inngest/express";
import {functions} from "./inngest/index.js"


const clientUrls = (process.env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  ...clientUrls,
];

const PORT = process.env.PORT || 8081;
const app = express();

// Trust reverse proxy headers from Render/Cloudflare/etc.
app.set("trust proxy", true);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.includes("localhost") ||
        (clientUrls.length > 0 && clientUrls.some((u) => origin === u));

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

app.all('/api/auth/{*any}', toNodeHandler(auth));

app.use(express.json());

app.use("/api/inngest", serve({ client: inngest, functions }));

app.get('/', (req, res) => {
  res.send("Hello World!");
})

app.get('/health', (req, res) => {
  res.json({
    status: "ok"
  })
})

registerRoutes(app);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})