import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import OpenAI from "openai";
import {defineSecret} from "firebase-functions/params";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Define the secret but don't access its value immediately
const openaiApiKey = defineSecret("OPENAI_API_KEY");

export const getCompletion = onCall({
  secrets: [openaiApiKey],
  region: "europe-west1",
}, async (request) => {
  // Check if the user is authenticated
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

    // Access the secret's value at runtime
    const openai = new OpenAI({
      apiKey: openaiApiKey.value(), // Access the value here
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06", // Adjust the model as needed
      messages: [{role: "user", content: prompt}],
    });

    const messageContent = completion.choices[0].message.content;
    return {completion: messageContent};
  } catch (error) {
    logger.error("Error getting chat completion:", error);
    throw new HttpsError("internal", "Error getting chat completion");
  }
});
