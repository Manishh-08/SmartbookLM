import express from 'express';
import 'dotenv/config';
import { auth } from './lib/auth.js';
import { toNodeHandler } from 'better-auth/node';

const PORT = process.env.PORT || 8081 ;
const app = express();

app.all('/api/auth/{*any}', toNodeHandler(auth));

app.use(express.json());

app.get('/',(req,res)=> {
  res.send("Hello World!");
})
app.get('/health',(req,res)=> {
  res.json({
    status: "ok"
  })
})
app.listen(PORT,()=>{
  console.log(`Server is running on port ${PORT}`)
})