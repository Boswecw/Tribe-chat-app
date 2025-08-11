// src/components/Avatar.jsx
import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";

const Avatar = ({ participant, size = 40 }) => {
  if (!participant) return null;

  const { name, avatarUrl = "" } = participant;

  const initials = name
    ?.split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return avatarUrl ? (
    <Image
      source={{ uri: avatarUrl }}
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    />
  ) : (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={styles.initials}>{initials || "?"}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    resizeMode: "cover",
  },
  fallback: {
    backgroundColor: "#aaa",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default Avatar;
