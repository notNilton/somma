import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";

const LOGO_WIDTH = 240;
const LOGO_HEIGHT = Math.round(LOGO_WIDTH * (110 / 450));
const ICON_WIDTH = Math.round(LOGO_WIDTH * 0.35);

export default function AppSplashScreen() {
  const clipWidth = useRef(new Animated.Value(ICON_WIDTH)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(clipWidth, {
        toValue: LOGO_WIDTH,
        duration: 600,
        useNativeDriver: false,
      }).start();
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.splash}>
      <Animated.View style={[styles.clip, { width: clipWidth }]}>
        <Image
          source={require("../assets/images/pagah-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  clip: {
    height: LOGO_HEIGHT,
    overflow: "hidden",
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
});
