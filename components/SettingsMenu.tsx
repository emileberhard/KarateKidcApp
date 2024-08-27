import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { getAuth, signOut } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "@/hooks/useThemeColor";

interface SettingsMenuProps {
  onResetSlider: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ onResetSlider }) => {
  const [isOpen, setIsOpen] = useState(false);
  const secondaryColor = useThemeColor("primary");

  const secondaryColorWithOpacity = `rgba(${parseInt(
    secondaryColor.slice(1, 3),
    16
  )}, ${parseInt(secondaryColor.slice(3, 5), 16)}, ${parseInt(
    secondaryColor.slice(5, 7),
    16
  )}, 0.8)`;

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleResetSlider = () => {
    onResetSlider();
    setIsOpen(false); // Close the menu after resetting
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
        <View
          style={[
            styles.dropdown,
            { backgroundColor: secondaryColorWithOpacity },
          ]}
        >
          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.option, { backgroundColor: secondaryColor }]}
          >
            <ThemedText style={styles.optionText}>Logga ut</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleResetSlider}
            style={[styles.option, { backgroundColor: secondaryColor }]}
          >
            <ThemedText style={styles.optionText}>
              Återställ hemkomst
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    right: 0,
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
    borderRadius: 10,
    padding: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  option: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 5,
  },
  optionText: {
    color: "white",
    fontSize: 16,
  },
});

export default SettingsMenu;
