import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Defs, Mask, Rect } from "react-native-svg";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CIRCLE_SIZE = 280;
const FOOTER_HEIGHT = 130;
const CIRCLE_CY = (SCREEN_H - FOOTER_HEIGHT) / 2;

interface AvatarCropModalProps {
  readonly visible: boolean;
  readonly imageUri: string;
  readonly onConfirm: (translateX: number, translateY: number, scale: number) => void;
  readonly onCancel: () => void;
}

export function AvatarCropModal({
  visible,
  imageUri,
  onConfirm,
  onCancel,
}: AvatarCropModalProps) {
  const baseOffset = useRef({ x: 0, y: 0 });
  const currentOffset = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const initialPinchDistance = useRef<number | null>(null);
  const initialScale = useRef(1);

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const animatedScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    baseOffset.current = { x: 0, y: 0 };
    currentOffset.current = { x: 0, y: 0 };
    scaleRef.current = 1;
    initialPinchDistance.current = null;
    initialScale.current = 1;
    translateX.setValue(0);
    translateY.setValue(0);
    animatedScale.setValue(1);
  }, [visible, translateX, translateY, animatedScale]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        initialPinchDistance.current = null;
        initialScale.current = scaleRef.current;
      },

      onPanResponderMove: (evt, gestureState) => {
        const { touches } = evt.nativeEvent;

        if (touches.length >= 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (initialPinchDistance.current === null) {
            initialPinchDistance.current = distance;
          }

          const newScale = Math.max(
            0.5,
            Math.min(5, initialScale.current * (distance / initialPinchDistance.current))
          );
          scaleRef.current = newScale;
          animatedScale.setValue(newScale);
        } else {
          initialPinchDistance.current = null;
          const newX = baseOffset.current.x + gestureState.dx;
          const newY = baseOffset.current.y + gestureState.dy;
          currentOffset.current = { x: newX, y: newY };
          translateX.setValue(newX);
          translateY.setValue(newY);
        }
      },

      onPanResponderRelease: () => {
        baseOffset.current = { ...currentOffset.current };
        initialPinchDistance.current = null;
        initialScale.current = scaleRef.current;
      },

      onPanResponderTerminate: () => {
        baseOffset.current = { ...currentOffset.current };
      },
    })
  ).current;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        <View style={styles.imageArea} {...panResponder.panHandlers}>
          <Animated.Image
            source={{ uri: imageUri }}
            style={[
              styles.image,
              {
                transform: [
                  { translateX },
                  { translateY },
                  { scale: animatedScale },
                ],
              },
            ]}
            resizeMode="cover"
          />
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width={SCREEN_W} height={SCREEN_H - FOOTER_HEIGHT}>
              <Defs>
                <Mask id="cropHole">
                  <Rect width={SCREEN_W} height={SCREEN_H - FOOTER_HEIGHT} fill="white" />
                  <Circle cx={SCREEN_W / 2} cy={CIRCLE_CY} r={CIRCLE_SIZE / 2} fill="black" />
                </Mask>
              </Defs>
              <Rect
                width={SCREEN_W}
                height={SCREEN_H - FOOTER_HEIGHT}
                fill="rgba(0,0,0,0.65)"
                mask="url(#cropHole)"
              />
              <Circle
                cx={SCREEN_W / 2}
                cy={CIRCLE_CY}
                r={CIRCLE_SIZE / 2}
                fill="none"
                stroke="white"
                strokeWidth={2}
              />
            </Svg>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.hint}>Mova e use dois dedos para dar zoom</Text>
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.cancelLabel}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => onConfirm(currentOffset.current.x, currentOffset.current.y, scaleRef.current)}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmLabel}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  imageArea: {
    height: SCREEN_H - FOOTER_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_W,
  },
  footer: {
    height: FOOTER_HEIGHT,
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
    backgroundColor: "#111111",
  },
  hint: {
    color: "#888888",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#ffffff",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#FACC15",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmLabel: {
    color: "#000000",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
