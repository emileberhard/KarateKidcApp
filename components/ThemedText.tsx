import React from "react";
import { Text, TextProps } from "react-native";
import { theme } from "../theme";

interface ThemedTextProps extends TextProps {
  bold?: boolean;
}

export const ThemedText: React.FC<ThemedTextProps> = ({ style, bold, ...props }) => {
  return (
    <Text
      style={[
        { fontFamily: bold ? theme.fonts.bold : theme.fonts.regular },
        style
      ]}
      {...props}
    />
  );
};
