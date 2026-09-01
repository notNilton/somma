import { Redirect, Stack } from "expo-router";
import { View, ActivityIndicator } from "react-native";

import { useAuth } from "@/context/AuthContext";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#FACC15" />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/home" />;
  }

  return <Redirect href="/login/login" />;
}
