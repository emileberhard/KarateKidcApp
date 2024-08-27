import React, { useState, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { ThemedText } from "./ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";

interface UnitPurchaseButtonProps {
  initialUnits?: number;
}

const UnitPurchaseButton: React.FC<UnitPurchaseButtonProps> = ({
  initialUnits = 1,
}) => {
  const [units, setUnits] = useState(initialUnits);
  const color = useThemeColor("primary");
  const borderColor = useThemeColor("accent");

  const incrementUnits = useCallback(() => {
    setUnits((prevUnits) => prevUnits + 1);
  }, []);

  const decrementUnits = useCallback(() => {
    setUnits((prevUnits) => Math.max(1, prevUnits - 1));
  }, []);

  const handleBuy = useCallback(() => {
    const amount = units * 15;
    const url = `https://app.swish.nu/1/p/sw/?sw=0729718923&amt=${amount}&cur=SEK&msg=${units}%20enheter&src=qr`;
    Linking.openURL(url);
  }, [units]);

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
          style={[
            styles.buyButton,
            { backgroundColor: color, borderColor: borderColor },
          ]}
        >
          <ThemedText style={styles.buyButtonText}>
            Köp {units}st ({units * 15}kr)
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    width: 130,
    marginBottom: 2,
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
    aspectRatio: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  buyButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    width: "100%",
  },
  buyButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
});

export default UnitPurchaseButton;
