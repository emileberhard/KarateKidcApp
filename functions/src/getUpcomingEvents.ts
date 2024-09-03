import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

interface Event {
  summary: string;
  start: string;
  end: string;
}

export const getUpcomingEvents = onCall({
  region: "europe-west1",
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  try {
    const db = admin.database();
    const eventsRef = db.ref('events');
    const snapshot = await eventsRef.once('value');
    const eventsData = snapshot.val() || {};

    const now = new Date();
    const fourDaysLater = new Date(now);
    fourDaysLater.setDate(now.getDate() + 4);

    const upcomingEvents: { [key: string]: Event } = {};

    Object.entries(eventsData).forEach(([key, event]: [string, any]) => {
      const eventStart = new Date(event.start);
      if (eventStart >= now && eventStart <= fourDaysLater) {
        upcomingEvents[key] = event as Event;
      }
    });

    return { events: upcomingEvents };
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    throw new HttpsError("internal", "Error fetching upcoming events");
  }
});