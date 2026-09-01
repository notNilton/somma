import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import { AvatarCropModal } from "@/components/AvatarCropModal";

const { width: SCREEN_W } = Dimensions.get("window");
const defaultAvatar = require("@/assets/images/avatar.png");

interface AvatarImageProps {
  readonly size?: number;
}

interface Transform {
  tx: number;
  ty: number;
  scale: number;
}

export function AvatarImage({ size = 80 }: AvatarImageProps) {
  const [uri, setUri] = useState<string | null>(null);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [showCrop, setShowCrop] = useState(false);
  const [transform, setTransform] = useState<Transform>({ tx: 0, ty: 0, scale: 1 });

  async function openPicker(useCamera: boolean) {
    try {
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"] })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] });

      if (!result.canceled) {
        setPendingUri(result.assets[0].uri);
        setShowCrop(true);
      }
    } catch {
      Alert.alert("Erro", "Não foi possível acessar a câmera ou galeria.");
    }
  }

  function handlePress() {
    Alert.alert("Foto de perfil", "Escolha uma opção", [
      { text: "Câmera", onPress: () => openPicker(true) },
      { text: "Galeria", onPress: () => openPicker(false) },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  function handleConfirm(tx: number, ty: number, scale: number) {
    setUri(pendingUri);
    setTransform({ tx, ty, scale });
    setShowCrop(false);
    setPendingUri(null);
  }

  function handleCropCancel() {
    setShowCrop(false);
    setPendingUri(null);
  }

  const ratio = size / SCREEN_W;

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
      >
        {uri ? (
          <Animated.Image
            source={{ uri }}
            style={[
              styles.image,
              {
                width: size,
                height: size,
                transform: [
                  { translateX: transform.tx * ratio },
                  { translateY: transform.ty * ratio },
                  { scale: transform.scale },
                ],
              },
            ]}
            resizeMode="cover"
          />
        ) : (
          <Image
            source={defaultAvatar}
            style={{ width: size, height: size }}
            resizeMode="cover"
          />
        )}
      </TouchableOpacity>

      {pendingUri && (
        <AvatarCropModal
          visible={showCrop}
          imageUri={pendingUri}
          onConfirm={handleConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  circle: {
    overflow: "hidden",
    backgroundColor: "#2a2a2a",
    alignSelf: "center",
  },
  image: {},
});
