import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  View,
  SafeAreaView,
} from "react-native";
import { ImageSourcePropType } from "react-native";
import cuteNinjaImage from "@/assets/images/cute_ninja.png";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { getDatabase, ref, onValue, set, remove } from "firebase/database";
import { AntDesign } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import * as Notifications from "expo-notifications";

const DEBUG_MODE = process.env.EXPO_PUBLIC_DEBUG_MODE === "true";

interface User {
  firstName: string;
  userId: string;
  units: number;
  unitTakenTimestamps?: Record<string, number>;
}

interface HighPromilleNotification {
  id: string;
  userId: string;
  promille: number;
  timestamp: number;
}

export default function AdminScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const { user } = useAuth();
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

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
            <ThemedText style={styles.userName}>{item.firstName}</ThemedText>
            <ThemedText style={styles.userUnits}>{item.units} units</ThemedText>
            <ThemedText style={styles.userUnits}>
              BAC: {promille.toFixed(2)}
            </ThemedText>
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
                onPress={() => updateUnits(item.firstName, -1)}
                style={styles.unitButton}
              >
                <AntDesign name="arrowleft" size={20} color="white" />
              </TouchableOpacity>
              <ThemedText style={styles.unitText}>{item.units}</ThemedText>
              <TouchableOpacity
                onPress={() => updateUnits(item.firstName, 1)}
                style={styles.unitButton}
              >
                <AntDesign name="arrowright" size={20} color="white" />
              </TouchableOpacity>
            </ThemedView>
            {DEBUG_MODE && (
              <TouchableOpacity
                onPress={() => resetUserUnits(item.firstName)}
                style={styles.resetButton}
              >
                <ThemedText style={styles.resetButtonText}>RESET</ThemedText>
              </TouchableOpacity>
            )}
          </ThemedView>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>User Management</ThemedText>
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.userId}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  userContainer: {
    marginBottom: 10,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  userItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  userIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  userUnits: {
    fontSize: 16,
    color: "#666",
  },
  expandedContent: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    gap: 5,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  unitButton: {
    width: 70,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#007AFF",
  },
  unitText: {
    fontSize: 24,
    fontWeight: "bold",
    marginHorizontal: 15,
    width: 60,
    textAlign: "center",
  },
  resetButton: {
    backgroundColor: "#FF3B30",
    width: 230,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 8,
  },
  resetButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
