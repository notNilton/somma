import { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MenuIcon from "@/assets/icons/menu.svg";
import { SideMenu } from "@/components/SideMenu";

interface HeaderNavProps {
  readonly currentPage?: number;
  readonly onPageChange?: (index: number) => void;
}

export function HeaderNav({ currentPage, onPageChange }: HeaderNavProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.bar}>
          <TouchableOpacity
            style={styles.menu}
            onPress={() => setMenuOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <MenuIcon width={22} height={22} color="#000000" />
            </View>
          </TouchableOpacity>
          <Image
            source={require("@/assets/images/pagah-logo2.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.bell}
            onPress={() => router.push("/notifications")}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <Text style={styles.bellEmoji}>🔔</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} currentPage={currentPage} onPageChange={onPageChange} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FACC15",
    borderBottomWidth: 0,
  },
  bar: {
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  menu: {
    position: "absolute",
    left: 20,
  },
  bell: {
    position: "absolute",
    right: 20,
  },
  logo: {
    height: 28,
    width: 120,
  },
  iconWrapper: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  bellEmoji: {
    fontSize: 18,
  },
});
