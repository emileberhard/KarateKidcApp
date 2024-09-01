import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, Linking, Image, ActivityIndicator, AppState } from "react-native";
import { ThemedText } from "./ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { ref, onValue, set, get } from "firebase/database";
import { database, auth, cloudFunctions } from "../firebaseConfig";
import swishLogo from "@/assets/images/swish_logo.png";
import { MaterialIcons } from "@expo/vector-icons";
import { useDebugSettings } from "@/hooks/useDebugSettings";

// TODO: Remove the temporary Swish URL and unit price
interface UnitPurchaseButtonProps {
  initialUnits?: number;
}

const UnitPurchaseButton: React.FC<UnitPurchaseButtonProps> = ({
  initialUnits = 1,
}) => {
  const [units, setUnits] = useState(initialUnits);
  const [unitPrice, setUnitPrice] = useState(1);
  const [swishUrl, setSwishUrl] = useState("");
  const color = useThemeColor("primary");
  const borderColor = useThemeColor("accent");
  const greenColor = "#4CAF50";
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isTemporaryGreen, setIsTemporaryGreen] = useState(false);
  const [transactionInitiated, setTransactionInitiated] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const [verificationTimer, setVerificationTimer] = useState(90);
  const { debugMode } = useDebugSettings();
  const orangeColor = "#FFAA00";

  const verifyTransaction = useCallback(async () => {
    setIsVerifying(true);
    setVerificationTimer(90);
    const startTime = Date.now();
    const timeout = 90000;
    const checkInterval = 5000;

    const timerInterval = setInterval(() => {
      setVerificationTimer((prevTime) => Math.max(0, prevTime - 1));
    }, 1000);

    const checkTransaction = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          console.error("User not authenticated");
          return false;
        }

        const idToken = await user.getIdToken();
        const result: any = await cloudFunctions.getTransactions({ idToken });

        if (result && result.data && result.data.booked) {
          const latestTransaction = result.data.booked[0];
          console.log("Latest transaction:", latestTransaction);
          
          if (latestTransaction && 
              Math.abs(parseFloat(latestTransaction.transactionAmount.amount)) === units * unitPrice &&
              latestTransaction.transactionAmount.currency === 'SEK') {
           
            setIsVerified(true);
            setIsTemporaryGreen(true);
            setTimeout(() => {
              setIsTemporaryGreen(false);
              setIsVerified(false);
            }, 5000);
           
            if (user && user.uid) {
              const userRef = ref(database, `users/${user.uid}/units`);
              const currentUnitsSnapshot = await get(userRef);
              const currentUnits = currentUnitsSnapshot.val() || 0;
              await set(userRef, currentUnits + units);

             
              const lastPurchaseRef = ref(database, `users/${user.uid}/lastPurchase`);
              await set(lastPurchaseRef, {
                timestamp: Date.now(),
                units: units
              });
            }
            setIsVerifying(false);
            clearInterval(timerInterval);
            return true;
          }
        }
      } catch (error) {
        console.error("Error verifying transaction:", error);
      }
      return false;
    };

    while (Date.now() - startTime < timeout) {
      const isVerified = await checkTransaction();
      if (isVerified) {
        clearInterval(timerInterval);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    clearInterval(timerInterval);
    setIsVerifying(false);
    setVerificationTimer(90);
    console.log("Transaction verification timed out");
  }, [units, unitPrice]);

  useEffect(() => {
    const unitPriceRef = ref(database, "unit_price");
    const swishUrlRef = ref(database, "swish_url");

    const unsubscribeUnitPrice = onValue(unitPriceRef, (snapshot) => {
      setUnitPrice(debugMode ? 1 : (snapshot.val() || 0));
    });

    const unsubscribeSwishUrl = onValue(swishUrlRef, (snapshot) => {
      const baseUrl = snapshot.val() || "";
      setSwishUrl(debugMode ? "https://app.swish.nu/1/p/sw/?sw=0723588533" : baseUrl);
    });

    return () => {
      unsubscribeUnitPrice();
      unsubscribeSwishUrl();
    };
  }, [debugMode]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", nextAppState => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === "active" && transactionInitiated) {
        console.log("App has come to the foreground! Verifying transaction...");
        verifyTransaction();
        setTransactionInitiated(false);
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [verifyTransaction, transactionInitiated]);

  const incrementUnits = useCallback(() => {
    setUnits((prevUnits) => prevUnits + 1);
  }, []);

  const decrementUnits = useCallback(() => {
    setUnits((prevUnits) => Math.max(1, prevUnits - 1));
  }, []);

  const handleBuy = useCallback(async () => {
    const user = auth.currentUser;
    console.log("User:", user);

    if (!user) {
      console.error("User not authenticated");
      return;
    }

    cloudFunctions.sendSwishReturnNotification({})
      .then(result => console.log("Function result:", result))
      .catch(error => {
        console.log("Error calling sendSwishReturnNotification:", error);
        if (error.code === 'unauthenticated') {
          console.error("Authentication error details:", error.details);
        }
      });

   
    const fullSwishUrl = `${swishUrl}&amt=${units * unitPrice}&cur=SEK`;
    Linking.openURL(fullSwishUrl);
    setTransactionInitiated(true);
  }, [units, unitPrice, swishUrl]);

  return (
    <View style={styles.container}>
      <View style={styles.unitsContainer}>
        <View style={styles.adjustUnitsContainer}>
          <TouchableOpacity
            onPress={decrementUnits}
            style={[
              styles.button,
              { backgroundColor: color, borderColor: borderColor },
            ]}
          >
            <Ionicons name="remove" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={incrementUnits}
            style={[
              styles.button,
              { backgroundColor: color, borderColor: borderColor },
            ]}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={handleBuy}
          disabled={isVerifying}
          style={[
            styles.buyButton,
            { 
              backgroundColor: isVerifying ? orangeColor : isTemporaryGreen ? greenColor : color, 
              borderColor: isVerifying ? orangeColor : isTemporaryGreen ? greenColor : borderColor 
            },
            isVerifying && styles.disabledButton,
          ]}
        >
          <View style={[
            styles.buyButtonContent,
            (isVerifying || isTemporaryGreen) && styles.centeredContent
          ]}>
            {!isVerifying && !isTemporaryGreen && (
              <View style={styles.swishLogoContainer}>
                <Image source={swishLogo} style={styles.swishLogo} resizeMode="contain" />
              </View>
            )}
            {isVerifying ? (
              <>
                <ActivityIndicator color="white" size="small" />
                <View style={styles.verifyingTextContainer}>
                  <ThemedText style={styles.verifyingText}>
                    Väntar på betalning...
                  </ThemedText>
                  <ThemedText style={styles.countdownTimer}>
                    {verificationTimer}s
                  </ThemedText>
                </View>
              </>
            ) : isVerified ? (
              <MaterialIcons name="check-circle" size={24} color="white" />
            ) : (
              <ThemedText style={styles.buyButtonText}>
                {units} för {units * unitPrice} kr
              </ThemedText>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 1,
    flex: 1,
  },
  unitsContainer: {
    alignItems: "center",
    width: "100%",
  },
  adjustUnitsContainer: {
    flexDirection: "row",
    marginBottom: 10,
    gap: 10,
    width: "100%",
  },
  button: {
    flex: 1,
    aspectRatio: 1.5,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  buyButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 15,
    borderWidth: 2,
    width: "100%",
  },
  buyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  buyButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  swishLogo: {
    width: 25,
    height: 25,
  },
  swishLogoContainer: {
    backgroundColor: 'white',
    borderRadius: 9,
    borderWidth: 0.5,
    borderColor: '#4400FF',
    padding: 5,
    marginRight: 15,
  },
  disabledButton: {
    opacity: 0.7,
  },
  centeredContent: {
    justifyContent: 'center',
  },
  verifyingTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 7,
  },
  verifyingText: {
    fontSize: 14,
    color: "white",
  },
  countdownTimer: {
    fontSize: 22,
    fontWeight: 'bold',
    color: "white",
    marginLeft: 5,
  },
});

export default UnitPurchaseButton;
