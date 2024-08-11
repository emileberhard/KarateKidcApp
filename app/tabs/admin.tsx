import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { getDatabase, ref, onValue, set } from 'firebase/database';

interface User {
  id: string;
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
        if (typeof user === 'object' && user !== null && 'units' in user) {
          userList.push({ id, units: Number(user.units) });
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
      <ThemedText>{item.id}</ThemedText>
      <ThemedText>Units: {item.units}</ThemedText>
      <ThemedView style={styles.buttonContainer}>
        <Button title="-" onPress={() => updateUnits(item.id, -1)} />
        <Button title="+" onPress={() => updateUnits(item.id, 1)} />
      </ThemedView>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
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
    padding: 20,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  buttonContainer: {
    flexDirection: 'row',
  },
});