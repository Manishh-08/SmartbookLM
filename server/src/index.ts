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


const allowedOrigins = Array.from(
  new Set([
    "http://localhost:3000",
    "http://localhost:3001",
    ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
  ]),
);

const PORT = process.env.PORT || 8081;
const app = express();

app.use(
  cors({
    origin: allowedOrigins,
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