import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";

import { Stack } from "expo-router";
import { reloadAsync } from "expo-updates";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AppSplashScreen from "@/components/SplashScreen";
import { SaleBanner } from "@/components/SaleBanner";
import { useColorScheme } from "@/components/useColorScheme";
import { AuthProvider } from "@/context/AuthContext";
import { UpdateModal } from "@/components/UpdateModal";
import { UpdateProvider } from "@/context/UpdateContext";
import { useCheckForUpdates } from "@/hooks/useCheckForUpdates";
import { useNotificationSetup } from "@/hooks/useNotifications";
import { useSaleNotification } from "@/hooks/useSaleNotification";
import { useScreenTracking } from "@/hooks/useScreenTracking";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "login/login",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...FontAwesome.font,
  });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      const timer = setTimeout(() => setShowSplash(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [loaded]);

  if (!loaded || showSplash) {
    return <AppSplashScreen />;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  useNotificationSetup();
  useScreenTracking();
  const {
    updateAvailable,
    checking,
    checkNow,
    modalState,
    dismissModal,
    confirmUpdate,
    dismissSuccess,
  } = useCheckForUpdates();
  const { bannerData, dismiss } = useSaleNotification();

  return (
    <AuthProvider>
    <UpdateProvider
        updateAvailable={updateAvailable}
        checking={checking}
        checkNow={checkNow}
      >
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <SaleBanner data={bannerData} onDismiss={dismiss} />
        <UpdateModal
          state={modalState}
          onDismiss={dismissModal}
          onConfirm={confirmUpdate}
          onRestart={reloadAsync}
        />
        <Stack>
          <Stack.Screen name="login/index" options={{ headerShown: false }} />
          <Stack.Screen name="login/login" options={{ headerShown: false }} />
          <Stack.Screen name="home" options={{ headerShown: false }} />
          <Stack.Screen name="sales" options={{ headerShown: false }} />
          <Stack.Screen
            name="sales-success"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="wallet" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="withdrawal" options={{ headerShown: false }} />
          <Stack.Screen
            name="withdrawal-success"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="advance" options={{ headerShown: false }} />
          <Stack.Screen
            name="advance-success"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="wallet-history"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="metrics" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="releases-history" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
    </UpdateProvider>
    </AuthProvider>
  );
}
