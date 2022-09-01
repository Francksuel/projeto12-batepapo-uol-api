import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect().then(()=>{
    db = mongoClient.db('UOLapi');
})

const app = express();
app.use(cors());
app.use(express.json());

app.post('/participants', async(req,res)=>{
const {name} = req.body;
const participants = await db.collection('participants').find().toArray();
let repetido=false;

participants.forEach(element => {  
    if (element.name===name){
        repetido=true;
    }
});
if (repetido){
    res.sendStatus(409);
    return
}
try {
   const participant = await db.collection('participants').insertOne({name}); 
   res.status(201).send('O participante foi criado com o ID:' + participant.insertedId);
}catch{
    res.status(500);
}
})

app.get('/', async(req,res)=>{
const teste = await db.collection('participants').find().toArray();
res.send(teste);
})

app.listen(5000,()=>{console.log('Listening on port 5000')});