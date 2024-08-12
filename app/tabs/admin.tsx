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
}

interface HighPromilleNotification {
  id: string;
  userId: string;
  promille: number;
  timestamp: number;
}

export default function AdminScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<
    HighPromilleNotification[]
  >([]);
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
          userId: userData.userId as string, // Cast to string
          units: Number(userData.units),
        })
      );
      setUsers(userList);
    });

    const notificationsRef = ref(getDatabase(), "notifications/highPromille");
    const notificationsUnsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notificationList: HighPromilleNotification[] = Object.entries(
          data
        ).map(([id, notification]: [string, Record<string, unknown>]) => ({
          id,
          userId: notification.userId as string, // Cast to string
          promille: notification.promille as number, // Cast to number
          timestamp: notification.timestamp as number, // Cast to number
        }));
        setNotifications(notificationList);
      } else {
        setNotifications([]);
      }
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);
        // Handle the received notification
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification response:", response);
        // Handle the notification response (e.g., when user taps on the notification)
      });

    return () => {
      unsubscribe();
      notificationsUnsubscribe();
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

  const dismissNotification = (notificationId: string) => {
    const db = getDatabase();
    const notificationRef = ref(
      db,
      `notifications/highPromille/${notificationId}`
    );
    remove(notificationRef);
  };

  const toggleExpandUser = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  const renderNotification = ({ item }: { item: HighPromilleNotification }) => (
    <ThemedView style={styles.notificationItem}>
      <ThemedText style={styles.notificationText}>
        User {item.userId} has a dangerous promille level of{" "}
        {item.promille.toFixed(2)}‰
      </ThemedText>
      <TouchableOpacity
        onPress={() => dismissNotification(item.id)}
        style={styles.dismissButton}
      >
        <AntDesign name="close" size={24} color="white" />
      </TouchableOpacity>
    </ThemedView>
  );

  const renderUser = ({ item }: { item: User }) => (
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>User Management</ThemedText>
        {notifications.length > 0 && (
          <View style={styles.notificationsContainer}>
            <ThemedText style={styles.notificationsTitle}>
              High Promille Alerts
            </ThemedText>
            <FlatList
              data={notifications}
              renderItem={renderNotification}
              keyExtractor={(item) => item.id}
            />
          </View>
        )}
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
    borderColor: "rgba(255, 255, 255, 0.1)", // Add a subtle border
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
    borderTopColor: "rgba(255, 255, 255, 0.1)", // Adds a subtle separator
    gap: 5, // Decreased from 10 to 5
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  unitButton: {
    width: 70, // Increased from 60 to 70
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#007AFF",
  },
  unitText: {
    fontSize: 24,
    fontWeight: "bold",
    marginHorizontal: 15, // Decreased from 20 to 15
    width: 60,
    textAlign: "center",
  },
  resetButton: {
    backgroundColor: "#FF3B30",
    width: 230, // Increased from 220 to 230 to match the new total width
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 8, // Decreased from 10 to 8
  },
  resetButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  notificationsContainer: {
    marginBottom: 20,
  },
  notificationsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  notificationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#FF9800",
    borderRadius: 5,
  },
  notificationText: {
    flex: 1,
    color: "white",
  },
  dismissButton: {
    padding: 5,
  },
});
