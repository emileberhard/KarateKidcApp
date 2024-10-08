import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";

export function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
}) {
  return (
    <Ionicons
      size={28}
      style={{ marginBottom: -3 }}
      name={props.name}
      color={props.color}
    />
  );
}
