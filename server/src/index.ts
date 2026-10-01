import express from 'express';
import 'dotenv/config';

const PORT = process.env.PORT;
const app = express();

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