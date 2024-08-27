import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  View,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { ImageSourcePropType } from "react-native";
import cuteNinjaImage from "@/assets/images/cute_ninja.png";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { getDatabase, ref, onValue, set, remove } from "firebase/database";
import { AntDesign } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import * as Notifications from "expo-notifications";
import { cloudFunctions } from "@/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome5 } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";

interface User {
  firstName: string;
  userId: string;
  units: number;
  unitTakenTimestamps?: Record<string, number>;
  safeArrival?: string | null;
}

type ListItem = User | { type: "header"; title: string };

export default function AdminScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const { user } = useAuth();
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [announcementSent, setAnnouncementSent] = useState(false);

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    const db = getDatabase();
    const usersRef = ref(db, "users");

    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      const userList: User[] = Object.entries(data).map(
        ([firstName, userData]: [string, Record<string, unknown>]) => ({
          firstName,
          userId: userData.userId as string,
          units: Number(userData.units),
          unitTakenTimestamps: userData.unitTakenTimestamps as
            | Record<string, number>
            | undefined,
          safeArrival: userData.safeArrival as string | null | undefined,
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

  const updateUnits = (firstName: string, change: number) => {
    const db = getDatabase();
    const userRef = ref(db, `users/${firstName}/units`);
    const newUnits = Math.max(
      0,
      users.find((u) => u.firstName === firstName)!.units + change
    );
    set(userRef, newUnits);
  };

  const resetUserUnits = (firstName: string) => {
    const db = getDatabase();
    const userRef = ref(db, `users/${firstName}/units`);
    const unitTakenTimestampsRef = ref(
      db,
      `users/${firstName}/unitTakenTimestamps`
    );
    set(userRef, 0);
    remove(unitTakenTimestampsRef);
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

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if ("type" in item && item.type === "header") {
      return <ThemedText style={styles.sectionHeader}>{item.title}</ThemedText>;
    }
    return renderUser({ item: item as User });
  };

  const renderUser = ({ item }: { item: User }) => {
    const promille = calculateBAC(item.unitTakenTimestamps);
    const isHome = !!item.safeArrival;

    return (
      <View
        style={[
          styles.userContainer,
          isHome ? styles.homeUserContainer : styles.notHomeUserContainer,
        ]}
      >
        <TouchableOpacity
          style={[
            styles.userItem,
            isHome ? styles.homeUserItem : styles.notHomeUserItem,
          ]}
          onPress={() => toggleExpandUser(item.userId)}
        >
          <Image
            source={cuteNinjaImage as ImageSourcePropType}
            style={styles.userIcon}
          />
          <ThemedView style={styles.userInfo}>
            <View style={styles.userTextContainer}>
              <ThemedText style={styles.userName}>{item.firstName}</ThemedText>
              <ThemedText style={styles.userDetails}>
                {item.units} units • BAC: {promille.toFixed(2)}
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
              isHome
                ? styles.homeExpandedContent
                : styles.notHomeExpandedContent,
            ]}
          >
            <ThemedView style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={() => updateUnits(item.firstName, -10)}
                style={styles.unitButton}
              >
                <AntDesign name="doubleleft" size={16} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => updateUnits(item.firstName, -1)}
                style={styles.unitButton}
              >
                <AntDesign name="minus" size={16} color="white" />
              </TouchableOpacity>
              <View style={styles.unitTextContainer}>
                <ThemedText style={styles.unitText}>{item.units}</ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => updateUnits(item.firstName, 1)}
                style={styles.unitButton}
              >
                <AntDesign name="plus" size={16} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => updateUnits(item.firstName, 10)}
                style={styles.unitButton}
              >
                <AntDesign name="doubleright" size={16} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => resetUserUnits(item.firstName)}
                style={[styles.unitButton, styles.resetButton]}
              >
                <Ionicons name="refresh" size={16} color="white" />
              </TouchableOpacity>
            </ThemedView>
            <ThemedView style={styles.safeArrivalContainer}>
              <FontAwesome5
                name={item.safeArrival ? "home" : "walking"}
                size={20}
                color={item.safeArrival ? "green" : "orange"}
              />
              <ThemedText style={styles.safeArrivalText}>
                {item.safeArrival
                  ? `Hemma ${new Date(item.safeArrival).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Inte hemma än"}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        )}
      </View>
    );
  };

  const homeUsers = users.filter((user) => !!user.safeArrival);
  const notHomeUsers = users.filter((user) => !user.safeArrival);

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <FlatList
        style={styles.container}
        data={[
          { type: "header", title: "Kvar på event" } as ListItem,
          ...notHomeUsers,
          { type: "header", title: "Hemma" } as ListItem,
          ...homeUsers,
        ]}
        renderItem={renderItem}
        keyExtractor={(item) => ("type" in item ? item.title : item.userId)}
        ListHeaderComponent={
          <View style={styles.announcementContainer}>
            <ThemedText style={styles.announcementHeader}>
              Skicka meddelande till nollor
            </ThemedText>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.announcementInput}
                placeholder="Skriv meddelande"
                placeholderTextColor="#666"
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
        }
      />
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  userContainer: {
    marginBottom: 10,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#b40075",
  },
  homeUserContainer: {
    borderRadius: 10,
    borderColor: "rgba(0, 255, 0, 0.3)",
    backgroundColor: "#b40075",
  },
  notHomeUserContainer: {},
  userItem: {
    flexDirection: "row",
    borderRadius: 2,
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#48002f",
  },
  homeUserItem: {
    backgroundColor: "rgba(0, 100, 0, 0.8)",
  },
  notHomeUserItem: {},
  expandedContent: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 3,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    gap: 5,
    backgroundColor: "#1A0011",
  },
  homeExpandedContent: {
    backgroundColor: "rgba(0, 100, 0, 0.6)",
  },
  notHomeExpandedContent: {},
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
    marginBottom: 20,
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
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 5,
    paddingRight: 10,
  },
  announcementInput: {
    flex: 1,
    padding: 10,
    color: "black",
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
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "left",
  },
});
