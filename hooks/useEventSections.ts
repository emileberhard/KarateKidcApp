import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebaseConfig';

export function useEventSections() {
  const [isPartyMode, setIsPartyMode] = useState(false);

  useEffect(() => {
    const eventsRef = ref(database, 'events');
    const unsubscribe = onValue(eventsRef, (snapshot) => {
      const events = snapshot.val();
      if (events) {
        const now = new Date();
        const currentEvent = Object.values(events).find((event: any) => {
          const startTime = new Date(event.start);
          const endTime = new Date(event.end);
          const extendedTime = endTime.getHours() >= 22 ? 4 : 1;
          const extendedEndTime = new Date(endTime.getTime() + extendedTime * 60 * 60 * 1000);
          return now >= startTime && now <= extendedEndTime && (event.ansvarig || event.nykter);
        });
        setIsPartyMode(!!currentEvent);
      }
    });

    return () => unsubscribe();
  }, []);

  return { isPartyMode };
}