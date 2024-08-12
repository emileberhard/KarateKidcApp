import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, Image, TouchableOpacity, View, Button } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { getDatabase, ref, onValue, set, remove } from 'firebase/database';
import { AntDesign } from '@expo/vector-icons';
import { getMessaging, getToken } from 'firebase/messaging';
import { useAuth } from '@/hooks/useAuth';

const DEBUG_MODE = process.env.EXPO_PUBLIC_DEBUG_MODE === 'true';

interface User {
  id: string;
  firstName?: string;
  units: number;
}

interface FirebaseUser {
  firstName?: string;
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
  const [notifications, setNotifications] = useState<HighPromilleNotification[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const db = getDatabase();
    const usersRef = ref(db, 'users');
    
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      const userList: User[] = [];
      for (const [id, user] of Object.entries(data)) {
        const typedUser = user as FirebaseUser;
        if (typedUser && 'units' in typedUser) {
          userList.push({
            id,
            firstName: typedUser.firstName || 'Unknown',
            units: Number(typedUser.units)
          });
        }
      }
      setUsers(userList);
    });

    const notificationsRef = ref(getDatabase(), 'notifications/highPromille');
    const notificationsUnsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notificationList: HighPromilleNotification[] = Object.entries(data).map(([id, notification]: [string, any]) => ({
          id,
          userId: notification.userId,
          promille: notification.promille,
          timestamp: notification.timestamp,
        }));
        setNotifications(notificationList);
      } else {
        setNotifications([]);
      }
    });

    // Store FCM token for admin users
    if (user && user.admin) {
      const messaging = getMessaging();
      getToken(messaging).then((token) => {
        if (token) {
          const adminTokenRef = ref(db, `adminFCMTokens/${user.uid}`);
          set(adminTokenRef, token);
        }
      }).catch((error) => {
        console.error("Error getting FCM token:", error);
      });
    }

    return () => {
      unsubscribe();
      notificationsUnsubscribe();
    };
  }, [user]);

  const updateUnits = (userId: string, change: number) => {
    const db = getDatabase();
    const userRef = ref(db, `users/${userId}/units`);
    const newUnits = Math.max(0, users.find(u => u.id === userId)!.units + change);
    set(userRef, newUnits);
  };

  const resetUserUnits = (userId: string) => {
    const db = getDatabase();
    const userRef = ref(db, `users/${userId}/units`);
    const drinksRef = ref(db, `users/${userId}/drinks`);
    set(userRef, 0);
    remove(drinksRef);
  };

  const dismissNotification = (notificationId: string) => {
    const db = getDatabase();
    const notificationRef = ref(db, `notifications/highPromille/${notificationId}`);
    remove(notificationRef);
  };

  const renderNotification = ({ item }: { item: HighPromilleNotification }) => (
    <ThemedView style={styles.notificationItem}>
      <ThemedText style={styles.notificationText}>
        User {item.userId} has a dangerous promille level of {item.promille.toFixed(2)}‰
      </ThemedText>
      <TouchableOpacity onPress={() => dismissNotification(item.id)} style={styles.dismissButton}>
        <AntDesign name="close" size={24} color="white" />
      </TouchableOpacity>
    </ThemedView>
  );

  const renderUser = ({ item }: { item: User }) => (
    <ThemedView style={styles.userItem}>
      <Image
        source={require('@/assets/images/cute_ninja.png')}
        style={styles.userIcon}
      />
      <ThemedView style={styles.userInfo}>
        <ThemedText style={styles.userName}>{item.firstName}</ThemedText>
        <ThemedText style={styles.userUnits}>{item.units} units</ThemedText>
      </ThemedView>
      <ThemedView style={styles.buttonContainer}>
        <TouchableOpacity 
          onPress={() => updateUnits(item.id, -1)} 
          style={styles.unitButton}
        >
          <AntDesign name="minus" size={30} color="white" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => updateUnits(item.id, 1)} 
          style={styles.unitButton}
        >
          <AntDesign name="plus" size={30} color="white" />
        </TouchableOpacity>
      </ThemedView>
      {DEBUG_MODE && (
        <Button
          title="Reset Units"
          onPress={() => resetUserUnits(item.id)}
          color="#FF0000"
        />
      )}
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>User Management</ThemedText>
      {notifications.length > 0 && (
        <View style={styles.notificationsContainer}>
          <ThemedText style={styles.notificationsTitle}>High Promille Alerts</ThemedText>
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
        keyExtractor={(item) => item.id}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 60,
    paddingHorizontal: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
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
    fontWeight: 'bold',
  },
  userUnits: {
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    backgroundColor: '#007AFF',
  },
  notificationsContainer: {
    marginBottom: 20,
  },
  notificationsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#FF9800',
    borderRadius: 5,
  },
  notificationText: {
    flex: 1,
    color: 'white',
  },
  dismissButton: {
    padding: 5,
  },
});