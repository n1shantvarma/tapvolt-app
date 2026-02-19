import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { RootStackParamList } from "../app/AppNavigator";
import { ConnectionState } from "../services/connectionManager";
import { useConnectionStore } from "../store/connectionStore";

type Props = NativeStackScreenProps<RootStackParamList, "Connect">;

export const ConnectScreen = ({ navigation }: Props) => {
  const ipAddress = useConnectionStore((state) => state.ipAddress);
  const isConnected = useConnectionStore((state) => state.isConnected);
  const isConnecting = useConnectionStore((state) => state.isConnecting);
  const connectionState = useConnectionStore((state) => state.connectionState);
  const reconnectAttempt = useConnectionStore((state) => state.reconnectAttempt);
  const error = useConnectionStore((state) => state.error);
  const setIp = useConnectionStore((state) => state.setIp);
  const connect = useConnectionStore((state) => state.connect);

  useEffect(() => {
    if (isConnected) {
      navigation.replace("Controller");
    }
  }, [isConnected, navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect to Server</Text>
      <TextInput
        value={ipAddress}
        onChangeText={setIp}
        placeholder="ws://192.168.1.20:8080"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      <Button title="Connect" onPress={connect} disabled={isConnecting} />
      {isConnecting ? <ActivityIndicator size="small" color="#111827" /> : null}
      <Text>State: {connectionState}</Text>
      {connectionState === ConnectionState.RECONNECTING ? (
        <Text>Reconnect attempt: {reconnectAttempt}/10</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#b0b0b0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    color: "#b00020",
  },
});
