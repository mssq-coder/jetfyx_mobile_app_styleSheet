import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { EditScreenInfo } from "./EditScreenInfo";

type ScreenContentProps = {
  title: string;
  path: string;
  children?: React.ReactNode;
};

export const ScreenContent = ({
  title,
  path,
  children,
}: ScreenContentProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.separator} />
      <EditScreenInfo path={path} />
      {children}
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 28,
    width: "80%",
    backgroundColor: "#e5e7eb",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
});
