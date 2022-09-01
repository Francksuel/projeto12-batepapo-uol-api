import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect().then(()=>{
    db = mongoClient.db('UOLapi');
})

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', async(req,res)=>{
const teste = await db.collection('participants').find().toArray();
console.log(teste);
res.send(teste);
})

app.listen(5000,()=>{console.log('Listening on port 5000')});