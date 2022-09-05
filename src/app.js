import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";
import {stripHtml} from "string-strip-html";

dotenv.config();

const participantSchema = joi.object({
	name: joi.string().min(1).required(),
});

const messageSchema = joi.object({
	to: joi.string().min(1).required(),
	text: joi.string().min(1).required(),
	type: joi.string().valid("message", "private_message").required(),
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
	return participants.filter((element) => element.name === name);
}

app.post("/participants", async (req, res) => {
	const registry = req.body;	
	const validationParticipant = participantSchema.validate(registry);	
	if (validationParticipant.error) {
		return res.sendStatus(422);
	}else{
		registry.name = stripHtml(registry.name).result.trim();
	}
	const isRepeat = await repeatName(registry.name).then((repeat) => {
		return repeat.length;
	});

	if (isRepeat != 0) {
		return res.sendStatus(409);
	}

	try {
		await db
			.collection("participants")
			.insertOne({ name: registry.name, lastStatus: Date.now() });

		await db.collection("messages").insertOne({
			from: registry.name,
			to: "Todos",
			text: "entra na sala...",
			type: "status",
			time: dayjs().locale("pt-br").format("HH:mm:ss"),
		});
		res.sendStatus(201);
	} catch {
		res.status(500);
	}
});

app.get("/participants", async (req, res) => {
	try {
		const participants = await db.collection("participants").find().toArray();
		res.send(participants);
	} catch {
		res.sendStatus(500);
	}
});

app.post("/messages", async (req, res) => {
	const message = req.body;
	const validationMessage = messageSchema.validate(message);
	if (validationMessage.error) {
		return res.sendStatus(422);
	}else{
		message.to = stripHtml(message.to).result.trim();
		message.text = stripHtml(message.text).result.trim();
		message.type = stripHtml(message.type).result.trim();
	}
	const user = req.headers.user;
	const userLogged = await db
		.collection("participants")
		.findOne({ name: user });
	if (!userLogged) {
		return res.sendStatus(422);
	}

	try {
		await db.collection("messages").insertOne({
			from: user,
			to: message.to,
			text: message.text,
			type: message.type,
			time: dayjs().locale("pt-br").format("HH:mm:ss"),
		});
		res.sendStatus(201);
	} catch {
		res.sendStatus(500);
	}
});

app.get("/messages", async (req, res) => {
	const limit = req.query.limit;
	const user = req.headers.user;
	const messages = await db.collection("messages").find().toArray();
	const userMessages = messages.filter(
		(message) =>
			message.to === user ||
			message.to === "Todos" ||
			message.from === user ||
			message.type === "message"
	);

	if (!limit) {
		return res.send(userMessages);
	}
	res.send(userMessages.splice(-limit, userMessages.length));
});

app.post("/status", async (req, res) => {
	const user = req.headers.user;
	const userLogged = await db
		.collection("participants")
		.findOne({ name: user });
	if (!userLogged) {
		return res.sendStatus(404);
	}
	try {
		await db
			.collection("participants")
			.updateOne({ _id: userLogged._id }, { $set: { lastStatus: Date.now() } });
		res.sendStatus(200);
	} catch {
		res.sendStatus(500);
	}
});

setInterval(() => participantsRemove(), 15000);

async function participantsRemove() {
	const participants = await db.collection("participants").find().toArray();
	const participantsInactive = participants.filter(
		(participant) => Date.now() - participant.lastStatus > 10000
	);
	if (participantsInactive.length > 0) {
		participantsInactive.map(async (participant) => {
			await db.collection("participants").deleteOne({ _id: participant._id });
			await db.collection("messages").insertOne({
				from: participant.name,
				to: "Todos",
				text: "sai da sala...",
				type: "status",
				time: dayjs().locale("pt-br").format("HH:mm:ss"),
			});
		});
	}
}

app.delete("/messages/:id_message", async (req, res) => {
	const user = req.headers.user;
	const { id_message } = req.params;
	try {
		const message = await db
			.collection("messages")
			.findOne({ _id: ObjectId(id_message) });
		if (message.from !== user) {
			return res.sendStatus(401);
		}
		await db.collection("messages").deleteOne({ _id: ObjectId(id_message) });
		res.sendStatus(200);
	} catch {
		return res.sendStatus(404);
	}
});

app.put("/messages/:id_message", async (req, res) => {
	const messageEdited = req.body;
	const { id_message } = req.params;
	const validationMessage = messageSchema.validate(messageEdited);
	if (validationMessage.error) {
		return res.sendStatus(422);
	}
	const user = req.headers.user;
	const userLogged = await db
		.collection("participants")
		.findOne({ name: user });
	if (!userLogged) {
		return res.sendStatus(422);
	}
	try {
		const message = await db
			.collection("messages")
			.findOne({ _id: ObjectId(id_message) });
		if (message.from != user) {
			return res.sendStatus(401);
		}
		await db.collection("messages").updateOne(
			{ _id: ObjectId(id_message) },
			{
				$set: {
					from: user,
					to: messageEdited.to,
					text: messageEdited.text,
					type: messageEdited.type,
					time: dayjs().locale("pt-br").format("HH:mm:ss"),
				},
			}
		);
		res.sendStatus(200);
	} catch {
		return res.sendStatus(404);
	}
});

export default app;