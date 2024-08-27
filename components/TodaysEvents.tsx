import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "./ThemedText";
import ICAL from "ical.js";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";

const ICAL_URL = "https://www.dsek.se/nollning/events/subscribe";

interface Event {
  summary: string;
  start: Date;
  end: Date;
}

export function TodaysEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const primaryColor = useThemeColor("primary");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(ICAL_URL);
      const icalData = await response.text();
      const jcalData = ICAL.parse(icalData);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents("vevent");

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todaysEvents = vevents
        .map((vevent) => {
          const event = new ICAL.Event(vevent);
          return {
            summary: event.summary,
            start: event.startDate.toJSDate(),
            end: event.endDate.toJSDate(),
          };
        })
        .filter((event) => {
          const eventDate = new Date(event.start);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate.getTime() === today.getTime();
        });

      setEvents(todaysEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: primaryColor }]}>
      <View style={styles.row}>
        <View style={styles.column}>
          <ThemedText style={[styles.idagText, { color: "white" }]}>
            IDAG
          </ThemedText>
          <View>
            <Ionicons name="calendar" size={40} color="white" />
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.eventsContainer}>
          {events.length === 0 ? (
            <ThemedText style={{ color: "white" }}>Inga event idag</ThemedText>
          ) : (
            events.map((event, index) => (
              <View key={index} style={styles.eventItem}>
                <ThemedText style={[styles.eventTitle, { color: "white" }]}>
                  {event.summary}
                </ThemedText>
                <ThemedText style={{ color: "white" }}>
                  {`${event.start.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })} - ${event.end.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`}
                </ThemedText>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    padding: 10,
    borderRadius: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  eventsContainer: {
    flex: 1,
  },
  idagText: {
    fontSize: 15,
    fontWeight: "bold",
  },
  eventItem: {
    marginBottom: 5,
  },
  eventTitle: {
    fontWeight: "bold",
    fontSize: 30,
  },
  column: {
    flexDirection: "column",
    alignItems: "center",
  },

  divider: {
    width: 1,
    height: "100%",
    backgroundColor: "white",
    marginHorizontal: 10,
  },
});
