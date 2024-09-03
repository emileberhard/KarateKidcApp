import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Linking, Alert  } from "react-native";
import { ThemedText } from "./ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { getDatabase, ref, get } from "firebase/database";
import { Ionicons } from '@expo/vector-icons';
import { Event, ResponsiblePhadder, UserInfo } from '../types';
import { useAutoSizeText } from '@/hooks/useAutoSizeText';
import { theme } from "@/theme";

export function ResponsiblePhaddersPanel() {
  const [responsiblePhadders, setResponsiblePhadders] = useState<ResponsiblePhadder[]>([]);
  const [eventName, setEventName] = useState<string>("");
  const primaryColor = useThemeColor("primary");
  const accentColor = useThemeColor("accent");
  const { fontSize, onTextLayout, onContainerLayout } = useAutoSizeText(24, 12);

  useEffect(() => {
    const fetchPhadders = async () => {
      try {
        const db = getDatabase();
        const eventsRef = ref(db, 'events');
        const snapshot = await get(eventsRef);
        const eventsData = snapshot.val() as Record<string, Event>;

        const now = new Date();
        const relevantEvent = Object.values(eventsData).reduce((mostRecentEvent, event) => {
          const eventStart = new Date(event.start);
          const eventEnd = new Date(event.end);
          eventEnd.setDate(eventEnd.getDate() + 1);
          eventEnd.setHours(8, 0, 0, 0);

          if (eventStart <= now && now < eventEnd) {
            if (!mostRecentEvent || eventStart > new Date(mostRecentEvent.start)) {
              return event;
            }
          }
          return mostRecentEvent;
        }, null as Event | null);

        if (relevantEvent) {
          const phadders: ResponsiblePhadder[] = [];
          if (relevantEvent.Ansvarig) {
            const [firstName, lastName] = relevantEvent.Ansvarig.split(' ');
            phadders.push({ role: "Ansvarigphadder", name: relevantEvent.Ansvarig, userId: `${firstName}_${lastName}` });
          }
          if (relevantEvent.Nykter && Array.isArray(relevantEvent.Nykter)) {
            relevantEvent.Nykter.forEach((name) => {
              const [firstName, lastName] = name.split(' ');
              phadders.push({ role: "Nykterphadder", name, userId: `${firstName}_${lastName}` });
            });
          }
          setResponsiblePhadders(phadders);
          setEventName(relevantEvent.summary);
        } else {
          setResponsiblePhadders([]);
          setEventName("");
        }
      } catch (error) {
        console.error("Error fetching events from database:", error);
      }
    };

    fetchPhadders();
  }, []);

  const handlePhonePress = async (userId: string) => {
    try {
      const db = getDatabase();
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      const usersData = snapshot.val() as Record<string, UserInfo>;

      const [firstName, lastName] = userId.split('_');
      const user = Object.values(usersData).find((user) => 
        user.firstName.toLowerCase() === firstName.toLowerCase() && 
        user.lastName.toLowerCase() === lastName.toLowerCase()
      );

      if (user && user.phoneNumber) {
        const phoneNumber = user.phoneNumber.replace(/\s/g, '');
        const supported = await Linking.canOpenURL(`tel:${phoneNumber}`);

        if (supported) {
          await Linking.openURL(`tel:${phoneNumber}`);
        } else {
          Alert.alert("Error", "Phone calls are not supported on this device");
        }
      } else {
        Alert.alert("Sorry :(", `Inget telefonnummer inlagt för ${firstName}`);
      }
    } catch (error) {
      console.error("Error fetching phone number:", error);
      Alert.alert("Error", "Failed to fetch phone number");
    }
  };

  if (responsiblePhadders.length === 0) {
    return null;
  }

  const headerText = `${responsiblePhadders[0].role === "Nykterphadder" ? "Nykterphaddrar" : "Ansvarigphaddrar"} ${eventName}`;

  return (
    <View style={[styles.container, { backgroundColor: primaryColor, borderColor: accentColor }]}>
      <View style={styles.headerContainer} onLayout={onContainerLayout}>
        <ThemedText 
          style={[styles.headerText, { fontSize }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          onTextLayout={onTextLayout}
        >
          {headerText}
        </ThemedText>
      </View>
      <View style={styles.phadderBubbleContainer}>
        {responsiblePhadders.map((phadder, index) => (
          <TouchableOpacity
            key={index}
            style={styles.phadderBubbleWrapper}
            onPress={() => handlePhonePress(phadder.userId)}
          >
            <View style={styles.phadderBubble}>
              <View style={styles.phoneButton}>
                <Ionicons name="call" size={20} color="white" />
              </View>
              <ThemedText style={styles.phadderBubbleText}>
                {phadder.name.split(' ')[0]}
              </ThemedText>
            </View>
          </TouchableOpacity>
        ))}
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
    fontFamily: theme.fonts.bold,
  },
  headerText: {
    paddingHorizontal: 5,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
    textAlign: 'center',
  },
  headerContainer: {
    width: '100%',
  },
  phadderBubbleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  phadderBubbleWrapper: {
    flex: 1,
    minWidth: '40%',
    maxWidth: '45%',
    padding: 4,
  },
  phadderBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#A500CE86',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,  
    borderColor: '#F2C0FF',
    flex: 1,
  },
  phadderBubbleText: {
    fontSize: 23,
    fontWeight: 'bold',
    color: 'white',
    flexShrink: 1,
    marginLeft: 10,
  },
  phoneButton: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    backgroundColor: 'limegreen',
    borderRadius: 15,
  },
});