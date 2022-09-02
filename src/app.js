import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

dotenv.config();

const participantSchema = joi.object({
	name: joi.string().min(1).required(),
});

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect().then(() => {
	db = mongoClient.db("UOLapi");
});

const app = express();
app.use(cors());
app.use(express.json());

async function repeatName(name) {
	const participants = await db.collection("participants").find().toArray();
	let repeat = false;
	participants.forEach((element) => {
		if (element.name === name) {
			repeat = true;
		}
	});
	return repeat;
}

app.post("/participants", async (req, res) => {
	const registry = req.body;
	const validationParticipant = participantSchema.validate(registry, {
		abortEarly: false,
	});
	if (validationParticipant.error) {
		res.sendStatus(422);
		return;
	}
	const isRepeat = await repeatName(registry.name).then((repeat) => {
		if (repeat) {
			return true;
		}
		return false;
	});

	if (isRepeat) {
		res.sendStatus(409);
		return;
	}

	try {
		await db
			.collection("participants")
			.insertOne({ name: registry.name, lastStatus: Date.now() });

		res.sendStatus(201);
	} catch {
		res.status(500);
	}
});

app.get("/", async (req, res) => {
	const teste = await db.collection("participants").find().toArray();
	res.send(teste);
});

export default app;