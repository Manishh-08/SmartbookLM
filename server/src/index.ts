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

const PORT = process.env.PORT || 8081;
const app = express();
const clientUrl = process.env.CLIENT_URL ?? "http://localhost:3001";

app.use(
  cors({
      origin: clientUrl,
      credentials: true,
  }),
);

app.all('/api/auth/{*any}', toNodeHandler(auth));

app.use(express.json());

app.set("trust proxy", 1);

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