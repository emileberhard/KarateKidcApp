import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { cloudFunctions } from '../firebaseConfig';
import { useThemeColor } from '@/hooks/useThemeColor';
import { update, ref, query, orderByChild, equalTo, get, onValue, set } from 'firebase/database';
import { database } from '../firebaseConfig';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/theme';
import { Animated } from 'react-native';

interface Event {
  summary: string;
  start: string;
}

type AttendanceStatus = 'initial' | 'yes' | 'no' | 'maybe';

const UpcomingEvents = () => {
  const [events, setEvents] = useState<{ [key: string]: Event }>({});
  const [attendanceStatus, setAttendanceStatus] = useState<{ [key: string]: AttendanceStatus }>({});
  const [animatedOpacities, setAnimatedOpacities] = useState<{ [key: string]: Animated.Value }>({});
  const primaryColor = useThemeColor('primary');
  const user = useAuth().user; 

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const result = await cloudFunctions.getUpcomingEvents();
        const fetchedEvents = (result.data as { events: { [key: string]: Event } }).events;
        setEvents(fetchedEvents);

        // Initialize animated opacities for each event
        const newAnimatedOpacities: { [key: string]: Animated.Value } = {};
        Object.keys(fetchedEvents).forEach((eventId) => {
          newAnimatedOpacities[eventId] = new Animated.Value(1);
        });
        setAnimatedOpacities(newAnimatedOpacities);

        // Fetch attendance status for each event
        Object.keys(fetchedEvents).forEach((eventId) => {
          const eventRef = ref(database, `events/${eventId}/attendance/${user.userId}`);
          onValue(eventRef, (snapshot) => {
            if (snapshot.exists()) {
              const status = snapshot.val() as AttendanceStatus;
              setAttendanceStatus((prevStatus) => ({
                ...prevStatus,
                [eventId]: status,
              }));
            }
          });
        });
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    if (user) {
      fetchEvents();
    }
  }, [user]);

  const handleAttendanceUpdate = async (eventDate: string, newStatus: AttendanceStatus) => {
    if (!user) return;

    const eventId = Object.keys(events).find(key => events[key].start === eventDate);
    if (eventId && animatedOpacities[eventId]) {
      // Animate the opacity change for the specific event
      Animated.sequence([
        Animated.timing(animatedOpacities[eventId], { toValue: 0.5, duration: 100, useNativeDriver: true }),
        Animated.timing(animatedOpacities[eventId], { toValue: 1, duration: 100, useNativeDriver: true })
      ]).start();

      // Update local state immediately
      setAttendanceStatus((prevStatus) => ({
        ...prevStatus,
        [eventId]: newStatus,
      }));
    }

    // Perform the database update asynchronously
    try {
      const eventsRef = ref(database, 'events');
      const eventQuery = query(eventsRef, orderByChild('start'), equalTo(eventDate));
      const snapshot = await get(eventQuery);

      if (snapshot.exists()) {
        const [eventId] = Object.keys(snapshot.val());
        const eventRef = ref(database, `events/${eventId}`);

        // Check if attendance property exists
        const eventSnapshot = await get(eventRef);
        const eventData = eventSnapshot.val();

        if (!eventData.attendance) {
          // Create attendance property if it doesn't exist
          await update(eventRef, { attendance: {} });
        }

        // Update the attendance status
        const userAttendanceRef = ref(database, `events/${eventId}/attendance/${user.userId}`);
        await set(userAttendanceRef, newStatus);
      } else {
        console.error("Event not found for date:", eventDate);
      }
    } catch (error) {
      console.error("Error updating attendance:", error);
      // Revert local state if database update fails
      if (eventId) {
        setAttendanceStatus((prevStatus) => ({
          ...prevStatus,
          [eventId]: prevStatus[eventId],
        }));
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: primaryColor }]}>
      <Text style={styles.headerText}>Vilka events kommer du på?</Text>
      {Object.keys(events).map((eventKey) => {
        const event = events[eventKey];
        const status = attendanceStatus[eventKey] || 'initial';
        const weekday = new Date(event.start).toLocaleDateString('sv-SE', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase());

        return (
          <Animated.View key={eventKey} style={[styles.eventContainer, { opacity: animatedOpacities[eventKey] || 1 }]}>
            <View style={styles.eventInfo}>
              <View style={styles.weekdayContainer}>
                <AntDesign name="calendar" size={13} color="white" style={styles.calendarIcon} />
                <Text style={styles.weekdayText}>{weekday}</Text>
              </View>
              <Text style={styles.eventText}>{event.summary}</Text>
            </View>
            <View style={styles.optionsContainer}>
              {['yes', 'maybe', 'no'].map((option) => {
                const isSelected = status === option;
                const isGreyedOut = status !== 'initial' && !isSelected;
                const newStatus: AttendanceStatus = option === 'yes' ? 'yes' : option === 'no' ? 'no' : 'maybe';

                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      styles[`${option}Button`],
                      isSelected && styles.selectedButton,
                      isGreyedOut && styles.greyedOutButton,
                      option === 'no' && styles.lastOptionButton // Add this line
                    ]}
                    onPress={() => handleAttendanceUpdate(event.start, newStatus)}
                  >
                    <Text style={styles.optionText}>
                      {option === 'yes' ? 'Ja' : option === 'no' ? 'Nej' : 'Kanske'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFD700',
    marginVertical: 10,
    fontFamily: theme.fonts.regular,
  },
  eventContainer: {
    marginBottom: 10,
    paddingLeft: 10,
    backgroundColor: 'rgb(255 126 208)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFD900',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  eventText: {
    fontSize: 15,
    color: 'white',
    fontFamily: theme.fonts.bold,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  optionButton: {
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 60,
  },
  lastOptionButton: {
    paddingVertical: 12,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
    minWidth: 60,
  },
  yesButton: {
    backgroundColor: 'green',
  },
  noButton: {
    backgroundColor: 'red',
  },
  maybeButton: {
    backgroundColor: 'orange',
  },
  selectedButton: {
    borderWidth: 3,
    borderRadius: 3,
    borderColor: '#FFEA71',
    opacity: 1,
  },
  greyedOutButton: {
    opacity: 0.3,
  },
  optionText: {
    color: 'white',
    fontFamily: theme.fonts.bold,
  },
  weekdayText: {
    fontSize: 13,
    color: 'white',
    fontFamily: theme.fonts.regular,
  },
  headerText: {
    paddingTop: 2,
    paddingHorizontal: 4,
    fontSize: 22,
    color: 'white',
    marginBottom: 10,
    textAlign: 'left',
    fontFamily: theme.fonts.bold,
  },
  weekdayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  calendarIcon: {
    marginRight: 3,
  },
});

export default UpcomingEvents;