import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { getAuth, signOut } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "@/hooks/useThemeColor";

const SettingsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const secondaryColor = useThemeColor("primary");

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        style={styles.menuButton}
      >
        <Ionicons name="settings-outline" size={44} color={secondaryColor} />
      </TouchableOpacity>
      {isOpen && (
        <View style={[styles.dropdown, { backgroundColor: secondaryColor }]}>
          <TouchableOpacity onPress={handleLogout} style={styles.option}>
            <ThemedText style={styles.optionText}>Logga ut</ThemedText>
          </TouchableOpacity>
          {/* Add more options here as needed */}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1000,
  },
  menuButton: {
    padding: 10,
  },
  dropdown: {
    width: 200,
    position: "absolute",
    top: 55,
    right: 5,
    borderRadius: 8,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  option: {
    paddingVertical: 5,
    paddingHorizontal: 20,
  },
  optionText: {
    color: "white",
    fontSize: 16,
  },
});

export default SettingsMenu;
