import express from "express";

const getParticipants = express.Router();
getParticipants.get("/participants", async (req, res) => {
	try {
		const participants = await db.collection("participants").find().toArray();
		res.send(participants);
	} catch {
		res.sendStatus(500);
	}
});
export default getParticipants;