import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, Image } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { getDatabase, ref, onValue, set } from 'firebase/database';

interface User {
  id: string;
  firstName?: string;
  units: number;
}

interface FirebaseUser {
  firstName?: string;
  units: number;
}

export default function AdminScreen() {
  const [users, setUsers] = useState<User[]>([]);

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

    return () => unsubscribe();
  }, []);

  const updateUnits = (userId: string, change: number) => {
    const db = getDatabase();
    const userRef = ref(db, `users/${userId}/units`);
    const newUnits = Math.max(0, users.find(u => u.id === userId)!.units + change);
    set(userRef, newUnits);
  };

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
        <Button title="-" onPress={() => updateUnits(item.id, -1)} />
        <Button title="+" onPress={() => updateUnits(item.id, 1)} />
      </ThemedView>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>User Management</ThemedText>
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
  },
});