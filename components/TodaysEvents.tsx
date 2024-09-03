import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { ThemedText } from "./ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { cloudFunctions } from "../firebaseConfig";
import Markdown from 'react-native-markdown-display';

interface Event {
  summary: string;
  start: string;
  end: string;
  description: string;
  location: string;
}

interface TodaysEventsProps {
  debugMode: boolean;
}

export function TodaysEvents({ debugMode }: TodaysEventsProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [idagText, setIdagText] = useState("IDAG");
  const [expandedEvents, setExpandedEvents] = useState<{ [key: number]: boolean }>({});
  const [_, setClosestEventIndex] = useState<number | null>(null);
  const primaryColor = useThemeColor("primary");
  const accentColor = useThemeColor("accent");
  const [debugTime, setDebugTime] = useState<Date | null>(null);
  const [debugTimeInput, setDebugTimeInput] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const result = await cloudFunctions.getEvents();
        const data = result.data as { events: Event[], idagText: string };
        setEvents(data.events);
        setIdagText(data.idagText);

        const now = getCurrentTime();
        const closestEvent = data.events.findIndex(event => new Date(event.end) > now);
        setClosestEventIndex(closestEvent !== -1 ? closestEvent : null);

        if (closestEvent !== -1) {
          setExpandedEvents(prev => ({ ...prev, [closestEvent]: true }));
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    fetchEvents();
  }, []);

  const getCurrentTime = useCallback(() => {
    return debugTime || new Date();
  }, [debugTime]);

  const toggleEventExpansion = (index: number) => {
    setExpandedEvents(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const isEventActive = useCallback((event: Event) => {
    const now = getCurrentTime();
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return eventStart <= now && eventEnd > now;
  }, [getCurrentTime]);

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

  const handleDebugTimeChange = (text: string) => {
    setDebugTimeInput(text);
  };

  const setDebugTimeFromInput = () => {
    const date = new Date(debugTimeInput);
    if (!isNaN(date.getTime())) {
      setDebugTime(date);
    } else {
      alert("Invalid date format. Please use YYYY-MM-DD HH:MM format.");
    }
  };

  useEffect(() => {
    if (debugMode) {
      const now = new Date();
      const formattedTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setDebugTimeInput(formattedTime);
    } else {
      setDebugTime(null); // Reset debug time when debug mode is off
    }
  }, [debugMode]);

  return (
    <View style={[styles.container, { backgroundColor: primaryColor, borderColor: accentColor }]}>
      {debugMode && (
        <View style={styles.debugTimeContainer}>
          <ThemedText style={styles.debugTimeText}>Debug Time:</ThemedText>
          <TextInput
            style={styles.debugTimeInput}
            value={debugTimeInput}
            onChangeText={handleDebugTimeChange}
            placeholder="YYYY-MM-DD HH:MM"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
          />
          <TouchableOpacity onPress={setDebugTimeFromInput} style={styles.debugTimeButton}>
            <ThemedText style={styles.debugTimeButtonText}>Set</ThemedText>
          </TouchableOpacity>
        </View>
      )}
      {debugMode && debugTime && ( // Only show when debug mode is on
        <ThemedText style={styles.currentDebugTimeText}>
          Current Debug Time: {debugTime.toLocaleString()}
        </ThemedText>
      )}
      <View style={styles.row}>
        <View style={styles.column}>
          <ThemedText style={[
            styles.idagText,
            { color: "white" },
            idagText === "IMORGON" && styles.imorgenText
          ]}>
            {idagText}
          </ThemedText>
          <View style={styles.iconContainer}>
            <Ionicons name="calendar" size={40} color="white" />
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.eventsContainer}>
          {events.length === 0 ? (
            <ThemedText style={{ color: "white" }}>Inga events {idagText === "IMORGON" ? "imorgon" : "idag"}</ThemedText>
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
    color: 'rgba(255 255 255 / 0.39)',
    fontSize: 12,
    marginTop: 5,
    fontStyle: 'italic',
  },
  debugTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    padding: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 5,
  },
  debugTimeText: {
    fontSize: 14,
    color: 'yellow',
    marginRight: 5,
  },
  debugTimeInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    padding: 5,
    borderRadius: 5,
    marginRight: 5,
  },
  debugTimeButton: {
    backgroundColor: '#b40075',
    padding: 5,
    borderRadius: 5,
  },
  debugTimeButtonText: {
    color: 'white',
    fontSize: 12,
  },
  currentDebugTimeText: {
    color: 'yellow',
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
  },
});
