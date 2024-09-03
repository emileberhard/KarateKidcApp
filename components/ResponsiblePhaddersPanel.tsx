import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Linking, Alert, Platform } from "react-native";
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
            const ansvarigArray = Array.isArray(relevantEvent.Ansvarig) ? relevantEvent.Ansvarig : [relevantEvent.Ansvarig];
            ansvarigArray.forEach((name) => {
              const [firstName, lastName] = name.split(' ');
              phadders.push({ role: "Ansvarigphadder", name, userId: `${firstName}_${lastName}` });
            });
          }
          if (relevantEvent.Nykter) {
            const nykterArray = Array.isArray(relevantEvent.Nykter) ? relevantEvent.Nykter : [relevantEvent.Nykter];
            nykterArray.forEach((name) => {
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

  const handlePhonePress = async (userId: string, action: 'call' | 'text') => {
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
        if (action === 'call') {
          handleCall(phoneNumber);
        } else {
          handleText(phoneNumber);
        }
      } else {
        Alert.alert("Sorry :(", `Inget telefonnummer inlagt för ${firstName}`);
      }
    } catch (error) {
      console.error("Error fetching phone number:", error);
      Alert.alert("Error", "Failed to fetch phone number");
    }
  };

  const handleCall = async (phoneNumber: string) => {
    const supported = await Linking.canOpenURL(`tel:${phoneNumber}`);
    if (supported) {
      await Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert("Error", "Phone calls are not supported on this device");
    }
  };

  const handleText = async (phoneNumber: string) => {
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${phoneNumber}${separator}body=`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", "SMS is not supported on this device");
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
          <View 
            key={index} 
            style={[
              styles.phadderBubbleWrapper, 
              responsiblePhadders.length === 1 && styles.singlePhadderWrapper
            ]}
          >
            <View style={[
              styles.phadderBubble,
              responsiblePhadders.length === 1 && styles.singlePhadderBubble
            ]}>
              <View style={responsiblePhadders.length === 1 ? styles.singlePhadderContent : styles.multiplePhadderContent}>
                <ThemedText style={styles.phadderBubbleText}>
                  {phadder.name.split(' ')[0]}
                </ThemedText>
                <View style={[
                  styles.iconContainer,
                  responsiblePhadders.length === 1 && styles.singlePhadderIconContainer
                ]}>
                  <TouchableOpacity
                    style={styles.phoneButton}
                    onPress={() => handlePhonePress(phadder.userId, 'call')}
                  >
                    <Ionicons name="call" size={30} color="white"/>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.textButton}
                    onPress={() => handlePhonePress(phadder.userId, 'text')}
                  >
                    <Ionicons name="chatbubble" size={30} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
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
    padding: 4,
  },
  singlePhadderWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  phadderBubble: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgb(255 126 208)',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,  
    borderColor: '#F2C0FF',
    flex: 1,
  },
  singlePhadderBubble: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '70%',
  },
  multiplePhadderContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  singlePhadderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  phadderBubbleText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  singlePhadderIconContainer: {
    marginTop: 0,
    marginLeft: 20,
  },
  phoneButton: {
    padding: 10,
    backgroundColor: 'limegreen',
    borderRadius: 15,
    marginRight: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  textButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 15,
    marginLeft: 5,
  },
});