import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BarCodeScanner, type BarCodeScannedEvent } from "expo-barcode-scanner";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Button, StyleSheet, Text, View } from "react-native";

import type { RootStackParamList } from "../app/AppNavigator";
import { useConnectionStore } from "../store/connectionStore";

type Props = NativeStackScreenProps<RootStackParamList, "Pair">;

export const PairScreen = ({ navigation }: Props) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isPairing, setIsPairing] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const error = useConnectionStore((state) => state.error);
  const pairFromQrPayload = useConnectionStore((state) => state.pairFromQrPayload);
  const isAuthenticated = useConnectionStore((state) => state.isAuthenticated);

  useEffect(() => {
    void (async () => {
      const permission = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(permission.status === "granted");
    })();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace("Controller");
    }
  }, [isAuthenticated, navigation]);

  const handleBarCodeScanned = useCallback(
    async ({ data }: BarCodeScannedEvent) => {
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

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Camera access denied.</Text>
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan Desktop Pairing QR</Text>
      <View style={styles.scannerFrame}>
        <BarCodeScanner
          onBarCodeScanned={hasScanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
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
