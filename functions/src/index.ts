import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import OpenAI from "openai";
import {defineSecret} from "firebase-functions/params";

// Define the secret but don't access its value immediately
const openaiApiKey = defineSecret("OPENAI_API_KEY");

export const getChatCompletion = onRequest({
  secrets: [openaiApiKey],
}, async (req, res) => {
  try {
    const prompt = req.body.prompt;
    if (!prompt) {
      res.status(400).send("Prompt is required");
      return;
    }

    // Access the secret's value at runtime
    const openai = new OpenAI({
      apiKey: openaiApiKey.value(), // Access the value here
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06", // Adjust the model as needed
      messages: [{role: "user", content: prompt}],
    });

    const messageContent = completion.choices[0].message.content;
    res.status(200).send({completion: messageContent});
  } catch (error) {
    logger.error("Error getting chat completion:", error);
    res.status(500).send("Error getting chat completion");
  }
});
