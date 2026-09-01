import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

export function LoadingDots({ color = "#ffffff" }: { color?: string }) {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -6, duration: 250, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.delay((dots.length - i - 1) * 150),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.row}>
      {dots.map((dot, i) => (
        <Animated.Text key={i} style={[styles.dot, { color, transform: [{ translateY: dot }] }]}>
          •
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 20,
  },
  dot: {
    fontSize: 20,
    lineHeight: 20,
  },
});
