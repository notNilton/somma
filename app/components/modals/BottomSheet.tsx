import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CloseIcon from "@/assets/icons/close.svg";

const SCREEN_H = Dimensions.get("window").height;
const DURATION = 300;

interface BottomSheetProps {
  readonly visible: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly children?: React.ReactNode;
  readonly contentGap?: number;
}

export function BottomSheet({ visible, title, onClose, children, contentGap = 20 }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_H);
      overlayOpacity.setValue(0);
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Keyboard.dismiss();
      keyboardOffset.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_H,
          duration: DURATION,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible, translateY, overlayOpacity, keyboardOffset]);

  useEffect(() => {
    if (!mounted) return;

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === "ios" ? e.duration : 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: Platform.OS === "ios" ? e.duration : 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [mounted, keyboardOffset]);

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlayWrapper, { opacity: overlayOpacity }]}>
        <Pressable style={styles.overlay} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.kvContainer, { paddingBottom: keyboardOffset }]}>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 24, transform: [{ translateY }] },
          ]}
        >
          <Animated.View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
              <CloseIcon width={18} height={18} color="#ffffff" />
            </TouchableOpacity>
          </Animated.View>
          <Animated.View style={styles.divider} />

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, { gap: contentGap }]}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  overlay: {
    flex: 1,
  },
  kvContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: "85%",
  },
  content: {
    gap: 12,
    paddingTop: 20,
    paddingBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  divider: {
    height: 1,
    backgroundColor: "#2a2a2a",
    marginTop: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
  closeBtn: {
    padding: 4,
  },
});
