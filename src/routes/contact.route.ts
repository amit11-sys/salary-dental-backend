import { Router } from "express";
import { Contact } from "../config/models/contact.model";
import { Email } from "../config/models/email.model";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { email } = req.body;
    const createContact = await Contact.create(req.body)
      if (email && createContact) {
          await Email.updateOne(
            { email },
            { $setOnInsert: { email } },
            { upsert: true }
          );
        }
    res.status(201).json(createContact);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;