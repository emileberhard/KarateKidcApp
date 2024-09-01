import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { ThemedText } from "./ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import events from "../data/events.json";

interface Event {
  summary: string;
  start: string;
  end: string;
  description: string;
}

export function TodaysEvents() {
  const [todaysEvents, setTodaysEvents] = useState<Event[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<{ [key: number]: boolean }>({});
  const primaryColor = useThemeColor("primary");
  const accentColor = useThemeColor("accent");

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const filteredEvents = events
      .filter((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        eventStart.setHours(0, 0, 0, 0);
        return eventStart.getTime() === today.getTime() && eventEnd > now;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    setTodaysEvents(filteredEvents);
  }, []);

  const toggleEventExpansion = (index: number) => {
    setExpandedEvents(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const isEventActive = (event: Event) => {
    const now = new Date();
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return eventStart <= now && eventEnd > now;
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
          {todaysEvents.length === 0 ? (
            <ThemedText style={{ color: "white" }}>Inga fler events idag</ThemedText>
          ) : (
            todaysEvents.map((event, index) => (
              <React.Fragment key={index}>
                <TouchableOpacity onPress={() => toggleEventExpansion(index)}>
                  <View style={[
                    styles.eventItem,
                    isEventActive(event) && { borderColor: accentColor, borderWidth: 3, borderRadius: 15, padding: 10, backgroundColor: "rgba(255, 255, 255, 0.2)"}
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
                        {`${new Date(event.start).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })} - ${new Date(event.end).toLocaleTimeString([], {
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
                {index < todaysEvents.length - 1 && <View style={styles.eventDivider} />}
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
    marginVertical: 10,
    padding: 10,
    borderRadius: 15,
    borderWidth: 2, 
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
    borderRadius: 15,
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
