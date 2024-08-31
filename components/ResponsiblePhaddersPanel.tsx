import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "./ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import events from "../data/events.json";

interface ResponsiblePhadder {
  role: string;
  name: string;
}

export function ResponsiblePhaddersPanel() {
  const [responsiblePhadders, setResponsiblePhadders] = useState<ResponsiblePhadder[]>([]);
  const [eventName, setEventName] = useState<string>("");
  const primaryColor = useThemeColor("primary");
  const accentColor = useThemeColor("accent");

  useEffect(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const relevantEvent = events.find((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return (
        (eventStart >= yesterday && eventStart < today && now < eventEnd) || 
        (eventStart >= today && eventStart < tomorrow && now >= eventStart && now < eventEnd)
      );
    });

    if (relevantEvent) {
      const phadders: ResponsiblePhadder[] = [];
      if (relevantEvent.Ansvarig) {
        phadders.push({ role: "Ansvarigphadder", name: relevantEvent.Ansvarig });
      }
      if (relevantEvent.Nykter && Array.isArray(relevantEvent.Nykter)) {
        relevantEvent.Nykter.forEach((name) => {
          phadders.push({ role: "Nykterphadder", name });
        });
      }
      setResponsiblePhadders(phadders);
      setEventName(relevantEvent.summary);
    } else {
      setResponsiblePhadders([]);
      setEventName("");
    }
  }, []);

  if (responsiblePhadders.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: primaryColor, borderColor: accentColor }]}>
      {responsiblePhadders.length > 0 && (
        <ThemedText style={styles.headerText}>
          {`${responsiblePhadders[0].role === "Nykterphadder" ? "Nykterphaddrar" : "Ansvarigphaddrar"} ${eventName}`}
        </ThemedText>
      )}
      <View style={styles.phadderBubbleContainer}>
        {responsiblePhadders.map((phadder, index) => (
          <View key={index} style={styles.phadderBubble}>
            <ThemedText style={styles.phadderBubbleText}>
              {phadder.name.split(' ')[0]}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
  },
  headerText: {
    fontSize: 20,
    paddingHorizontal: 5,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
  phadderBubbleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  phadderBubble: {
    backgroundColor: '#FFAD4F',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    margin: 4,
  },
  phadderBubbleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
});