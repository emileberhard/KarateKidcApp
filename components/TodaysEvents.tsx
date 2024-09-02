import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { ThemedText } from "./ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { ref, onValue, off } from "firebase/database";
import { database } from "../firebaseConfig";
import localEvents from "../data/events.json";
import Markdown from 'react-native-markdown-display';

interface Event {
  summary: string;
  start: string;
  end: string;
  description: string;
  location: string;
}

export function TodaysEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isShowingTomorrow, setIsShowingTomorrow] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<{ [key: number]: boolean }>({});
  const [_, setClosestEventIndex] = useState<number | null>(null);
  const primaryColor = useThemeColor("primary");
  const accentColor = useThemeColor("accent");

  useEffect(() => {
    const eventsRef = ref(database, 'events');
    
    const handleData = (snapshot: any) => {
      const firebaseEvents = snapshot.val();
      if (firebaseEvents) {
        processEvents(firebaseEvents);
      } else {
        processEvents(localEvents);
      }
    };

    const handleError = (error: any) => {
      console.error("Error fetching events from Firebase:", error);
      processEvents(localEvents);
    };

    onValue(eventsRef, handleData, handleError);

    return () => {
      off(eventsRef, 'value', handleData);
    };
  }, []);

  const processEvents = (allEvents: Event[]) => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeAM = new Date(today);
    threeAM.setHours(3, 0, 0, 0);

    const isBeforeThreeAM = now < threeAM;
    const referenceDate = isBeforeThreeAM ? today : tomorrow;

    const relevantEvents = allEvents.filter((event) => {
      const eventStart = new Date(event.start);
      eventStart.setHours(0, 0, 0, 0);
      return eventStart.getTime() === referenceDate.getTime() && new Date(event.end) > now;
    });

    setEvents(relevantEvents);
    setIsShowingTomorrow(isBeforeThreeAM || relevantEvents.length === 0);

    const sortedEvents = relevantEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    setEvents(sortedEvents);

    const closestEvent = sortedEvents.findIndex(event => new Date(event.end) > now);
    setClosestEventIndex(closestEvent !== -1 ? closestEvent : null);

    if (closestEvent !== -1) {
      setExpandedEvents(prev => ({ ...prev, [closestEvent]: true }));
    }
  };

  const toggleEventExpansion = (index: number) => {
    setExpandedEvents(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const isEventActive = (event: Event) => {
    const now = new Date();
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return eventStart <= now && eventEnd > now;
  };

  const renderEventDescription = (description: string, isActive: boolean, isExpanded: boolean) => {
    const formattedDescription = description.replace(/\\n/g, ' ').trim();
    const displayedText = isExpanded 
      ? formattedDescription 
      : formattedDescription.length > 50 
        ? formattedDescription.substring(0, 50) + '...'
        : formattedDescription;
    
    return (
      <Markdown
        style={{
          body: {
            color: isActive ? "yellow" : "white",
            fontSize: 14,
            lineHeight: 16,
          },
          paragraph: {
            marginBottom: isExpanded ? 10 : 0,
          },
          strong: {
            fontWeight: 'bold',
          },
        }}
      >
        {displayedText}
      </Markdown>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: primaryColor, borderColor: accentColor }]}>
      <View style={styles.row}>
        <View style={styles.column}>
          <ThemedText style={[
            styles.idagText,
            { color: "white" },
            isShowingTomorrow && styles.imorgenText
          ]}>
            {isShowingTomorrow ? "IMORGON" : "IDAG"}
          </ThemedText>
          <View style={styles.iconContainer}>
            <Ionicons name="calendar" size={40} color="white" />
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.eventsContainer}>
          {events.length === 0 ? (
            <ThemedText style={{ color: "white" }}>Inga events {isShowingTomorrow ? "imorgon" : "idag"}</ThemedText>
          ) : (
            events.map((event, index) => (
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
                      <Ionicons name="time-outline" size={16} color={isEventActive(event) ? "yellow" : "white"} style={styles.icon} />
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
                      {event.location && (
                        <View style={styles.locationContainer}>
                          <Ionicons name="location-outline" size={16} color={isEventActive(event) ? "yellow" : "white"} style={styles.icon} />
                          <ThemedText style={[
                            styles.locationText,
                            { color: isEventActive(event) ? "yellow" : "white" }
                          ]}>
                            {event.location}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <View style={styles.eventDescriptionContainer}>
                      {renderEventDescription(event.description, isEventActive(event), expandedEvents[index])}
                    </View>
                    {!expandedEvents[index] && event.description.length > 50 && (
                      <ThemedText style={styles.showMoreText}>Tryck för att läsa mer...</ThemedText>
                    )}
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
  imorgenText: {
    fontSize: 10, 
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
    flexWrap: 'wrap',
  },
  icon: {
    marginRight: 2,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  locationText: {
    fontSize: 12,
  },
  eventDescriptionContainer: {
    marginTop: 5,
  },
  eventTime: {
    fontSize: 14,
    marginRight: 5,
  },
  showMoreText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
});
