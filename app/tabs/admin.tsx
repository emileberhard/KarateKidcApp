import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { ImageSourcePropType } from "react-native";
import cuteNinjaImage from "@/assets/images/cute_ninja.png";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { getDatabase, ref, onValue, set, remove, push } from "firebase/database";
import { AntDesign } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import * as Notifications from "expo-notifications";
import { cloudFunctions } from "@/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome5 } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';

interface User {
  firstName: string;
  lastName: string;
  userId: string;
  units: number;
  unitTakenTimestamps?: Record<string, number>;
  safeArrival?: string | null;
  admin: boolean;
}

type ListItem = User | { type: "header"; title: string } | { type: "tools" };

interface UnitLogEvent {
  userId: string;
  oldUnits: number;
  newUnits: number;
  change: number;
  timestamp: number;
}

const getUserFullName = (userId: string, users: User[]): string => {
  const user = users.find(u => u.userId === userId);
  return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
};

export default function AdminScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const { user } = useAuth();
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [announcementSent, setAnnouncementSent] = useState(false);
  const [unitLogEvents, setUnitLogEvents] = useState<UnitLogEvent[]>([]);

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    const db = getDatabase();
    const usersRef = ref(db, "users");

    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      const userList: User[] = Object.entries(data).map(
        ([userId, userData]: [string, Record<string, unknown>]) => ({
          firstName: userData.firstName as string,
          lastName: userData.lastName as string,
          userId: userId,
          units: Number(userData.units),
          unitTakenTimestamps: userData.unitTakenTimestamps as
            | Record<string, number>
            | undefined,
          safeArrival: userData.safeArrival as string | null | undefined,
          admin: userData.admin as boolean,
        })
      );
      setUsers(userList);
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification response:", response);
      });

    return () => {
      unsubscribe();
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user]);

  useEffect(() => {
    const db = getDatabase();
    const logRef = ref(db, 'unit_log');
    const unsubscribe = onValue(logRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const events = Object.values(data) as UnitLogEvent[];
        setUnitLogEvents(events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10));
      }
    });

    return () => unsubscribe();
  }, []);

  const calculateBAC = (
    unitTakenTimestamps: Record<string, number> | undefined
  ): number => {
    if (!unitTakenTimestamps) return 0;

    const weight = 70;
    const gender = "male";
    const metabolismRate = gender === "male" ? 0.015 : 0.017;
    const bodyWaterConstant = gender === "male" ? 0.68 : 0.55;

    const now = Date.now();
    const last24Hours = now - 24 * 60 * 60 * 1000;

    let totalAlcohol = 0;
    Object.values(unitTakenTimestamps).forEach((timestamp) => {
      if (timestamp > last24Hours) {
        const hoursAgo = (now - timestamp) / (60 * 60 * 1000);
        const remainingAlcohol = Math.max(0, 10 - hoursAgo * metabolismRate);
        totalAlcohol += remainingAlcohol;
      }
    });

    const bac = (totalAlcohol / (weight * 1000 * bodyWaterConstant)) * 100;
    const promille = Math.max(0, bac) * 10;
    return promille;
  };

  const logUnitChange = (userId: string, oldUnits: number, newUnits: number) => {
    const db = getDatabase();
    const logRef = ref(db, 'unit_log');
    const change = newUnits - oldUnits;
    const event = {
      userId,
      oldUnits,
      newUnits,
      change,
      timestamp: Date.now()
    };
    push(logRef, event);
  };

  const updateUnits = (userId: string, change: number) => {
    const db = getDatabase();
    const userRef = ref(db, `users/${userId}/units`);
    const user = users.find((u) => u.userId === userId);
    if (user) {
      const oldUnits = user.units;
      const newUnits = Math.max(0, oldUnits + change);
      set(userRef, newUnits);
      logUnitChange(userId, oldUnits, newUnits);
    }
  };

  const resetUserUnits = (userId: string) => {
    Alert.alert(
      "Återställ enheter",
      "Är du säker på att du vill återställa användarens enheter till 0?",
      [
        {
          text: "Avbryt",
          style: "cancel"
        },
        {
          text: "Återställ",
          onPress: () => {
            const db = getDatabase();
            const userRef = ref(db, `users/${userId}/units`);
            const unitTakenTimestampsRef = ref(
              db,
              `users/${userId}/unitTakenTimestamps`
            );
            const user = users.find((u) => u.userId === userId);
            if (user) {
              const oldUnits = user.units;
              set(userRef, 0);
              remove(unitTakenTimestampsRef);
              logUnitChange(userId, oldUnits, 0);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const toggleExpandUser = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  const sendAnnouncement = async () => {
    if (!announcement.trim()) {
      return;
    }

    setSendingAnnouncement(true);
    try {
      const result = await cloudFunctions.sendAnnouncement({
        message: announcement.trim(),
      });
      console.log("Announcement sent:", result);
      setAnnouncement("");
      setAnnouncementSent(true);
      setTimeout(() => {
        setAnnouncementSent(false);
      }, 2000);
    } catch (error) {
      console.error("Error sending announcement:", error);
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const handleAnnouncementSubmit = () => {
    if (announcement.trim()) {
      sendAnnouncement();
    }
  };

  const isDisplayTime = () => {
    const now = new Date();
    const hours = now.getHours();
    return hours >= 8 && hours < 15;
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if ("type" in item) {
      if (item.type === "header") {
        return isDisplayTime() ? null : (
          <ThemedText style={styles.sectionHeader}>{item.title}</ThemedText>
        );
      } else if (item.type === "tools") {
        return renderTools();
      }
    }
    return renderUser({ item: item as User });
  };

  const renderUser = ({ item }: { item: User }) => {
    const displayTime = isDisplayTime();
    const isHome = !!item.safeArrival;

    return (
      <View
        style={[
          styles.userContainer,
          displayTime ? styles.notHomeUserContainer : (isHome ? styles.homeUserContainer : styles.notHomeUserContainer),
        ]}
      >
        <TouchableOpacity
          style={[
            styles.userItem,
            displayTime ? styles.notHomeUserItem : (isHome ? styles.homeUserItem : styles.notHomeUserItem),
          ]}
          onPress={() => toggleExpandUser(item.userId)}
        >
          <Image
            source={cuteNinjaImage as ImageSourcePropType}
            style={styles.userIcon}
          />
          <ThemedView style={styles.userInfo}>
            <View style={styles.userTextContainer}>
              <View style={styles.userNameContainer}>
                <ThemedText style={styles.userName}>{item.firstName}</ThemedText>
                <View style={[
                  styles.roleTag,
                  item.admin ? styles.adminTag : styles.userTag
                ]}>
                  <ThemedText style={styles.roleTagText}>
                    {item.admin ? 'Phadder' : 'Nolla'}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={styles.userDetails}>
                {item.units} enheter
                {!displayTime && ` • BAC: ${calculateBAC(item.unitTakenTimestamps).toFixed(2)}`}
              </ThemedText>
            </View>
          </ThemedView>
          <AntDesign
            name={expandedUser === item.userId ? "up" : "down"}
            size={24}
            color="gray"
          />
        </TouchableOpacity>
        {expandedUser === item.userId && (
          <ThemedView
            style={[
              styles.expandedContent,
              displayTime ? styles.notHomeExpandedContent : (isHome ? styles.homeExpandedContent : styles.notHomeExpandedContent),
            ]}
          >
            <ThemedView style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={() => updateUnits(item.userId, -10)}
                style={styles.unitButton}
              >
                <AntDesign name="doubleleft" size={16} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => updateUnits(item.userId, -1)}
                style={styles.unitButton}
              >
                <AntDesign name="minus" size={16} color="white" />
              </TouchableOpacity>
              <View style={styles.unitTextContainer}>
                <ThemedText style={styles.unitText}>{item.units}</ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => updateUnits(item.userId, 1)}
                style={styles.unitButton}
              >
                <AntDesign name="plus" size={16} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => updateUnits(item.userId, 10)}
                style={styles.unitButton}
              >
                <AntDesign name="doubleright" size={16} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => resetUserUnits(item.userId)}
                style={[styles.unitButton, styles.resetButton]}
              >
                <Ionicons name="refresh" size={16} color="white" />
              </TouchableOpacity>
            </ThemedView>
            {!displayTime && (
              <>
                <View style={styles.divider} />
                <ThemedView style={styles.safeArrivalContainer}>
                  <FontAwesome5
                    name={isHome ? "home" : "walking"}
                    size={20}
                    color={isHome ? "green" : "orange"}
                  />
                  <ThemedText style={styles.safeArrivalText}>
                    {isHome
                      ? `Hemma ${new Date(item.safeArrival!).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : "Inte hemma än"}
                  </ThemedText>
                </ThemedView>
                <View style={styles.divider} />
                <View style={styles.bacMeterContainer}>
                  <ThemedText style={styles.bacMeterLabel}>Promillemätare (grov uppskattning):</ThemedText>
                  <View style={styles.bacMeterBackground}>
                    <LinearGradient
                      colors={['#4CAF50', '#FFEB3B', '#FF5252']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.bacMeterFill,
                        { width: `${calculateBAC(item.unitTakenTimestamps) / 1.5 * 100}%` },
                      ]}
                    />
                  </View>
                  <ThemedText style={styles.bacMeterValue}>
                    {calculateBAC(item.unitTakenTimestamps).toFixed(2)} promille = {getBACLabelAndEmoji(calculateBAC(item.unitTakenTimestamps)).label} {getBACLabelAndEmoji(calculateBAC(item.unitTakenTimestamps)).emoji}
                  </ThemedText>
                </View>
              </>
            )}
          </ThemedView>
        )}
      </View>
    );
  };

  const renderTools = () => (
    <>
      <ThemedText style={styles.sectionHeader}>Verktyg</ThemedText>
      <View style={styles.announcementContainer}>
        <ThemedText style={styles.announcementHeader}>
          Skicka notis till nollor
        </ThemedText>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.announcementInput}
            placeholder="Skriv meddelande"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={announcement}
            onChangeText={setAnnouncement}
            onSubmitEditing={handleAnnouncementSubmit}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              announcementSent && styles.sentButton,
            ]}
            onPress={sendAnnouncement}
            disabled={sendingAnnouncement || announcementSent}
          >
            {sendingAnnouncement ? (
              <ActivityIndicator color="white" size="small" />
            ) : announcementSent ? (
              <MaterialIcons name="check" size={30} color="white" />
            ) : (
              <Ionicons name="send" size={30} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.logContainer}>
        <ThemedText style={styles.logHeader}>Enhetslogg</ThemedText>
        <View>
          {unitLogEvents.map((event, index) => (
            <ThemedText key={index} style={styles.logEntry}>
              {`[${new Date(event.timestamp).toLocaleTimeString()}] ${getUserFullName(event.userId, users)}: ${event.oldUnits} -> ${event.newUnits} (${event.change > 0 ? '+' : ''}${event.change})`}
            </ThemedText>
          ))}
        </View>
      </View>
    </>
  );

  const getBACLabelAndEmoji = (bac: number) => {
    if (bac < 0.2) return { label: 'Nykter', emoji: '😊' };
    if (bac < 0.6) return { label: 'Salongsberusad', emoji: '🍷' };
    if (bac < 1.2) return { label: 'PARTYMODE!', emoji: '🕺💃🍻' };
    return { label: 'Pukemode', emoji: '🤢' };
  };

  const sortUsers = (users: User[]) => {
    return users.sort((a, b) => {
      if (a.admin !== b.admin) {
        return a.admin ? 1 : -1;
      }
      return b.units - a.units; // Sort by units in descending order
    });
  };

  const getListData = () => {
    const allUsers = sortUsers(users);
    if (isDisplayTime()) {
      return [...allUsers, { type: "tools" as const }];
    } else {
      return [
        { type: "header" as const, title: "Kvar på event" },
        ...users.filter((user) => !user.safeArrival),
        { type: "header" as const, title: "Hemma" },
        ...users.filter((user) => !!user.safeArrival),
        { type: "tools" as const },
      ];
    }
  };

  return (

        <View style={styles.blackBackground}>
          <FlatList
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            data={getListData()}
            renderItem={renderItem}
            keyExtractor={(item) => {
              if ("type" in item) {
                return item.type === "header" ? item.title : "tools";
              }
              return item.userId;
            }}
          />
        </View>

  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  blackBackground: {
    flex: 1,
    backgroundColor: 'black',
  },
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  contentContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'black',
  },
  userContainer: {
    marginBottom: 10,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#41002A",
  },
  userItem: {
    flexDirection: "row",
    borderRadius: 2,
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#48002f",
  },
  expandedContent: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 3,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    gap: 5,
    backgroundColor: "#1A0011",
  },
  userIcon: {
    width: 30,
    height: 30,
    borderRadius: 20,
  },
  userInfo: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: "transparent",
  },
  userTextContainer: {
    flexDirection: "column",
    justifyContent: "center",
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  adminTag: {
    backgroundColor: '#007AFF',
  },
  userTag: {
    backgroundColor: '#FF1493', 
  },
  roleTagText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: 'white',
  },
  userName: {
    fontSize: 25,
    fontWeight: "bold",
    color: "white",
  },
  userDetails: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.7)",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 40,
    backgroundColor: "transparent",
  },
  unitButton: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#007AFF",
    marginHorizontal: 3,
  },
  unitTextContainer: {
    width: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  unitText: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "white",
  },
  resetButton: {
    backgroundColor: "red",
  },
  safeArrivalContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "transparent",
  },
  safeArrivalText: {
    marginLeft: 10,
    fontSize: 14,
    color: "white",
  },
  announcementContainer: {
    padding: 10,
    backgroundColor: "#48002f",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#b40075",
  },
  announcementHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
    textAlign: "left",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "black",
    borderRadius: 5,
    paddingRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  announcementInput: {
    flex: 1,
    padding: 10,
    color: "white",
  },
  sendButton: {
    padding: 10,
    marginVertical: 10,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 25,
    backgroundColor: "#b40075",
  },
  sentButton: {
    backgroundColor: "green",
  },
  sectionHeader: {
    fontSize: 33,
    fontWeight: "bold",
    color: "white",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "left",
  },
  bacMeterContainer: {
    marginTop: 10,
  },
  bacMeterLabel: {
    fontSize: 14,
    color: 'white',
    marginBottom: 5,
  },
  bacMeterBackground: {
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  bacMeterFill: {
    height: '100%',
    borderRadius: 10,
  },
  bacMeterValue: {
    fontSize: 14,
    color: 'white',
    marginTop: 5,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 10,
  },
  logContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#000',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#333',
  },
  logHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f0',
    marginBottom: 5,
  },

  logEntry: {
    fontSize: 12,
    color: '#0f0',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  homeUserContainer: {
    borderRadius: 10,
    borderColor: "rgba(0, 255, 0, 0.3)",
    backgroundColor: "#015101",
  },
  notHomeUserContainer: {
    borderRadius: 10,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#41002A",
  },
  homeUserItem: {
    backgroundColor: "rgba(0, 100, 0, 0.8)",
  },
  notHomeUserItem: {
    backgroundColor: "#48002f",
  },
  homeExpandedContent: {
    backgroundColor: "rgb(0 77 0)",
  },
  notHomeExpandedContent: {
    backgroundColor: "#1A0011",
  },
});
