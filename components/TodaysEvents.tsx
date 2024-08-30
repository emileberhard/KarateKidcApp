import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { ThemedText } from "./ThemedText";
import ICAL from "ical.js";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";

const ICAL_URL = "https://www.dsek.se/nollning/events/subscribe";

interface Event {
  summary: string;
  start: Date;
  end: Date;
  description: string;
}

export function TodaysEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<{ [key: number]: boolean }>({});
  const primaryColor = useThemeColor("primary");
  const accentColor = useThemeColor("accent");

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

      const now = new Date();
      const todaysEvents = vevents
        .map((vevent) => {
          const event = new ICAL.Event(vevent);
          return {
            summary: event.summary,
            start: event.startDate.toJSDate(),
            end: event.endDate.toJSDate(),
            description: event.description || 'No description available',
          };
        })
        .filter((event) => {
          const eventDate = new Date(event.start);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate.getTime() === today.getTime() && event.end > now;
        })
        .sort((a, b) => a.start.getTime() - b.start.getTime());

      setEvents(todaysEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const toggleEventExpansion = (index: number) => {
    setExpandedEvents(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const isEventActive = (event: Event) => {
    const now = new Date();
    return event.start <= now && event.end > now;
  };

  return (
    <View style={[styles.container, { backgroundColor: primaryColor, borderColor: accentColor }]}>
      <View style={styles.row}>
        <View style={styles.column}>
          <ThemedText style={[styles.idagText, { color: "white" }]}>
            IDAG
          </ThemedText>
          <View style={styles.iconContainer}>
            <Ionicons name="calendar" size={40} color="white" />
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.eventsContainer}>
          {events.length === 0 ? (
            <ThemedText style={{ color: "white" }}>Inga event idag</ThemedText>
          ) : (
            events.map((event, index) => (
              <React.Fragment key={index}>
                <TouchableOpacity onPress={() => toggleEventExpansion(index)}>
                  <View style={[
                    styles.eventItem,
                    isEventActive(event) && { borderColor: accentColor, borderWidth: 3, borderRadius: 8, padding: 10, backgroundColor: "rgba(255, 255, 255, 0.2)"}
                  ]}>
                    <View style={styles.eventHeader}>
                      <ThemedText style={[
                        styles.eventTitle,
                        { color: isEventActive(event) ? "yellow" : "white" }
                      ]}>
                        {event.summary}
                      </ThemedText>
                      <Ionicons
                        name={expandedEvents[index] ? "chevron-up" : "chevron-down"}
                        size={26}
                        color={isEventActive(event) ? "yellow" : "white"}
                      />
                    </View>
                    <View style={styles.eventTimeContainer}>
                      <ThemedText style={[
                        styles.eventTime,
                        { color: isEventActive(event) ? "yellow" : "white", fontWeight: isEventActive(event) ? 'bold' : 'normal' }
                      ]}>
                        {`${event.start.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })} - ${event.end.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`}
                      </ThemedText>
                      {isEventActive(event) && (
                        <View style={[styles.activeTag, { borderColor: "yellow" }]}>
                          <ThemedText style={[styles.activeTagText, { color: "yellow" }]}>NU</ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText
                      style={[
                        styles.eventDescription,
                        { color: isEventActive(event) ? "yellow" : "white" }
                      ]}
                      numberOfLines={expandedEvents[index] ? undefined : 2}
                    >
                      {event.description}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
                {index < events.length - 1 && <View style={styles.eventDivider} />}
              </React.Fragment>
            ))
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 5,
    padding: 10,
    borderRadius: 10,
    borderWidth: 2, // Add this line to create a border
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  eventsContainer: {
    flex: 1,
  },
  idagText: {
    fontSize: 15,
    fontWeight: "bold",
  },
  eventTitle: {
    fontWeight: "bold",
    fontSize: 20,
    marginBottom: 5,
    flex: 1,
  },
  column: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 3,
  },
  iconContainer: {
    marginTop: 5,
  },
  divider: {
    width: 1,
    height: "100%",
    backgroundColor: "white",
    marginHorizontal: 10,
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventDescription: {
    fontSize: 14,
    marginTop: 5,
    flex: 1,
    lineHeight: 15, 
  },
  eventItem: {
    marginBottom: 5,
    position: 'relative',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventDivider: {
    height: 1,
    paddingTop: 2,
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginVertical: 10,
  },
  eventTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 30,
  },
  activeTag: {
    backgroundColor: '#FF8C00',
    borderColor: 'white',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 10,
  },
  activeTagText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  eventTime: {
    color: "white",
    fontSize: 12,
    marginRight: 5,
  },
});
