import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Button, StyleSheet, Text, View } from "react-native";

import type { RootStackParamList } from "../app/AppNavigator";
import { useConnectionStore } from "../store/connectionStore";

type Props = NativeStackScreenProps<RootStackParamList, "Pair">;

export const PairScreen = ({ navigation }: Props) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isPairing, setIsPairing] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const error = useConnectionStore((state) => state.error);
  const pairFromQrPayload = useConnectionStore((state) => state.pairFromQrPayload);
  const isAuthenticated = useConnectionStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!permission) {
      return;
    }

    if (!permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace("Controller");
    }
  }, [isAuthenticated, navigation]);

  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (hasScanned || isPairing) {
        return;
      }

      setHasScanned(true);
      setIsPairing(true);
      await pairFromQrPayload(data);
      setIsPairing(false);
    },
    [hasScanned, isPairing, pairFromQrPayload],
  );

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Camera access denied.</Text>
        <Button
          title={permission.canAskAgain ? "Grant Access" : "Back"}
          onPress={() => {
            if (permission.canAskAgain) {
              void requestPermission();
              return;
            }
            navigation.goBack();
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan Desktop Pairing QR</Text>
      <View style={styles.scannerFrame}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={hasScanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />
      </View>
      {isPairing ? <ActivityIndicator size="small" color="#111827" /> : null}
      {error ? <Text style={styles.error}>{error.message}</Text> : null}
      <Button
        title={hasScanned ? "Scan Again" : "Cancel"}
        onPress={() => {
          if (hasScanned) {
            setHasScanned(false);
            return;
          }
          navigation.goBack();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  scannerFrame: {
    width: "100%",
    maxWidth: 320,
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: "#111827",
    borderRadius: 12,
    overflow: "hidden",
  },
  error: {
    color: "#b00020",
    textAlign: "center",
  },
});
