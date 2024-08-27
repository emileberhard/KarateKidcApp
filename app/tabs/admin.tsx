import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  View,
  TextInput,
  Alert,
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

interface User {
  firstName: string;
  userId: string;
  units: number;
  unitTakenTimestamps?: Record<string, number>;
}

export default function AdminScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const { user } = useAuth();
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

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
      Alert.alert("Error", "Vad vill du meddela?");
      return;
    }

    try {
      const result = await cloudFunctions.sendAnnouncement({
        message: announcement.trim(),
      });
      console.log("Announcement sent:", result);
      Alert.alert("Success", "Announcement sent successfully!");
      setAnnouncement("");
    } catch (error) {
      console.error("Error sending announcement:", error);
      Alert.alert("Error", "Failed to send announcement. Please try again.");
    }
  };

  const renderUser = ({ item }: { item: User }) => {
    const promille = calculateBAC(item.unitTakenTimestamps);

    return (
      <View style={styles.userContainer}>
        <TouchableOpacity
          style={styles.userItem}
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
          <ThemedView style={styles.expandedContent}>
            <ThemedView style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={() => updateUnits(item.firstName, -10)}
                style={[styles.unitButton, styles.largeUnitButton]}
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
                style={[styles.unitButton, styles.largeUnitButton]}
              >
                <AntDesign name="doubleright" size={16} color="white" />
              </TouchableOpacity>
            </ThemedView>
            <TouchableOpacity
              onPress={() => resetUserUnits(item.firstName)}
              style={styles.resetButton}
            >
              <ThemedText style={styles.resetButtonText}>RESET</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
      </View>
    );
  };

  return (
    <FlatList
      style={styles.container}
      data={users}
      renderItem={renderUser}
      keyExtractor={(item) => item.userId}
      ListHeaderComponent={
        <View style={styles.announcementContainer}>
          <ThemedText style={styles.announcementHeader}>
            Skicka meddelande till nollor
          </ThemedText>
          <TextInput
            style={styles.announcementInput}
            placeholder="Skriv meddelande"
            placeholderTextColor="#666"
            value={announcement}
            onChangeText={setAnnouncement}
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendAnnouncement}
          >
            <ThemedText style={styles.sendButtonText}>Skicka</ThemedText>
          </TouchableOpacity>
        </View>
      }
    />
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
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#b40075",
  },
  userItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#48002f",
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
  userName: {
    fontSize: 25,
    fontWeight: "bold",
    color: "white",
  },
  userDetails: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.7)",
  },
  expandedContent: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    gap: 5,
    backgroundColor: "#1A0011",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 40,
    backgroundColor: "transparent",
  },
  unitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#007AFF",
  },
  largeUnitButton: {
    width: 44,
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
    backgroundColor: "#FF3B30",
    width: 180,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 5,
  },
  resetButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  announcementContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#48002f",
    borderRadius: 10,
  },
  announcementHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
    textAlign: "center",
  },
  announcementInput: {
    backgroundColor: "white",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    color: "black",
  },
  sendButton: {
    backgroundColor: "#007AFF",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: "center",
  },
  sendButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
