import * as React from "react";
import { View, type ViewProps } from "react-native";

// import { useThemeColor } from "@/hooks/useThemeColor";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({
  style,
  lightColor: _lightColor,
  darkColor: _darkColor,
  ...otherProps
}: ThemedViewProps) {
  return (
    <View
      style={[
        {
          backgroundColor: "transparent",
          borderWidth: 0,
          borderColor: "transparent",
        },
        style,
      ]}
      {...otherProps}
    />
  );
}
