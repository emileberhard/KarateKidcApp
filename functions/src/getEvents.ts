import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

interface Event {
  summary: string;
  start: string;
  end: string;
  description: string;
  location: string;
}

export const getEvents = onCall({
  region: "europe-west1",
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  try {
    const db = admin.database();
    const eventsRef = db.ref('events');
    const snapshot = await eventsRef.once('value');
    const allEvents: Event[] = snapshot.val() || [];

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeAM = new Date(today);
    threeAM.setHours(3, 0, 0, 0);

    const isAfterThreeAM = now >= threeAM;
    const referenceDate = isAfterThreeAM ? today : new Date(today.getTime() - 86400000);

    const relevantEvents = allEvents.filter((event) => {
      const eventStart = new Date(event.start);
      eventStart.setHours(0, 0, 0, 0);
      return eventStart.getTime() === referenceDate.getTime() && new Date(event.end) > now;
    });

    let events: Event[];
    let idagText: string;

    if (relevantEvents.length === 0) {
      events = allEvents.filter((event) => {
        const eventStart = new Date(event.start);
        eventStart.setHours(0, 0, 0, 0);
        return eventStart.getTime() === tomorrow.getTime();
      });
      idagText = "IMORGON";
    } else {
      events = relevantEvents;
      idagText = isAfterThreeAM ? "IDAG" : "IMORGON";
    }

    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return { events, idagText };
  } catch (error) {
    console.error("Error fetching events:", error);
    throw new HttpsError("internal", "Error fetching events");
  }
});