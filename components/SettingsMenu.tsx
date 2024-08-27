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

  const darkenColor = (color: string, factor: number): string => {
    const r = Math.max(0, parseInt(color.slice(1, 3), 16) * (1 - factor));
    const g = Math.max(0, parseInt(color.slice(3, 5), 16) * (1 - factor));
    const b = Math.max(0, parseInt(color.slice(5, 7), 16) * (1 - factor));
    return `rgba(${r}, ${g}, ${b}, 0.95)`;
  };

  const darkerSecondaryColor = darkenColor(secondaryColor, 0.3); // Darken by 30%

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

  const iconColor = useThemeColor("accent"); // Use accent color for the icon

  return (
    <View style={styles.container}>
      {isOpen ? (
        <View
          style={[styles.dropdown, { backgroundColor: darkerSecondaryColor }]}
        >
          <View style={styles.headerContainer}>
            <ThemedText style={styles.headerText}>Inställningar</ThemedText>
            <TouchableOpacity
              onPress={() => setIsOpen(!isOpen)}
              style={styles.menuButton}
            >
              <Ionicons name="close" size={44} color="white" />
            </TouchableOpacity>
          </View>
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
      ) : (
        <TouchableOpacity
          onPress={() => setIsOpen(!isOpen)}
          style={styles.menuButton}
        >
          <Ionicons name="settings-outline" size={44} color={iconColor} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 0,
    zIndex: 1000,
  },
  menuButton: {
    alignSelf: "flex-end",
  },
  dropdown: {
    width: 200,
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
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderBottomWidth: 1,
  },
  headerText: {
    color: "white",
    fontSize: 20,
    marginLeft: 10,
    fontWeight: "bold",
  },
});

export default SettingsMenu;
