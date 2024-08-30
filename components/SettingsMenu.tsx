import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { ThemedText } from "./ThemedText";
import { getAuth, signOut } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "@/hooks/useThemeColor";
import * as Haptics from "expo-haptics";

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

  const darkerSecondaryColor = darkenColor(secondaryColor, 0.3);

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
    setIsOpen(false);
  };

  const iconColor = useThemeColor("accent");

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleOpenMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen(true);
  };

  const logoutButtonColor = "#FF3B30";

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleOpenMenu} style={styles.menuButton}>
        <View style={styles.iconContainer}>
          <Ionicons name="settings-outline" size={40} color={iconColor} />
        </View>
      </TouchableOpacity>
      <Modal
        transparent={true}
        visible={isOpen}
        onRequestClose={closeMenu}
        animationType="fade"
      >
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.dropdown,
                  { backgroundColor: darkerSecondaryColor },
                ]}
              >
                <View style={styles.headerContainer}>
                  <ThemedText style={styles.headerText}>
                    Inställningar
                  </ThemedText>
                  <TouchableOpacity
                    onPress={closeMenu}
                    style={styles.menuButton}
                  >
                    <Ionicons name="close" size={44} color="white" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleResetSlider}
                  style={[
                    styles.option,
                    { backgroundColor: secondaryColor, borderColor: iconColor },
                  ]}
                >
                  <ThemedText style={styles.optionText}>
                    Återställ hemkomst
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleLogout}
                  style={[
                    styles.option,
                    {
                      backgroundColor: logoutButtonColor,
                      borderColor: iconColor,
                    },
                  ]}
                >
                  <ThemedText style={styles.optionText}>Logga ut</ThemedText>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: -40,
    top: 5,
    zIndex: 1000,
  },
  menuButton: {
    alignSelf: "flex-end",
  },
  dropdown: {
    width: 250,
    borderRadius: 10,
    padding: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginTop: 50,
    marginRight: 10,
  },
  option: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderRadius: 10,
    marginBottom: 5,
  },
  optionText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
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
    fontSize: 22,
    marginLeft: 10,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  iconContainer: {
    position: "relative",
    right: 40,
    bottom: 5,
  },
});

export default SettingsMenu;
