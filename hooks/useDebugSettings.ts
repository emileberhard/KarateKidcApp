import { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, set } from 'firebase/database';

export function useDebugSettings() {
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    const db = getDatabase();
    const debugModeRef = ref(db, 'debugMode');

    const unsubscribe = onValue(debugModeRef, (snapshot) => {
      setDebugMode(snapshot.val() || false);
    });

    return () => unsubscribe();
  }, []);

  const toggleDebugMode = () => {
    const db = getDatabase();
    const debugModeRef = ref(db, 'debugMode');
    set(debugModeRef, !debugMode);
  };

  return { debugMode, toggleDebugMode };
}