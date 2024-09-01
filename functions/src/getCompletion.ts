import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import OpenAI from "openai";
import {defineSecret} from "firebase-functions/params";

const openaiApiKey = defineSecret("OPENAI_API_KEY");

export const getCompletion = onCall({
  secrets: [openaiApiKey],
  region: "europe-west1",
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  try {
    const prompt = request.data.prompt;
    if (!prompt) {
      throw new HttpsError("invalid-argument", "Prompt is required");
    }
    
    const openai = new OpenAI({
      apiKey: openaiApiKey.value(), 
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06", 
      messages: [{role: "user", content: prompt}],
    });

    const messageContent = completion.choices[0].message.content;
    return {completion: messageContent};
  } catch (error) {
    logger.error("Error getting chat completion:", error);
    throw new HttpsError("internal", "Error getting chat completion");
  }
});