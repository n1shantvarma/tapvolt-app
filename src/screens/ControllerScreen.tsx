import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

import type { RootStackParamList } from "../app/AppNavigator";
import { ActionGrid } from "../components/ActionGrid";
import { ConnectionState } from "../services/connectionManager";
import { useConnectionStore } from "../store/connectionStore";

type Props = NativeStackScreenProps<RootStackParamList, "Controller">;

export const ControllerScreen = ({ navigation }: Props) => {
  const isConnected = useConnectionStore((state) => state.isConnected);
  const connectionState = useConnectionStore((state) => state.connectionState);
  const reconnectAttempt = useConnectionStore((state) => state.reconnectAttempt);
  const isAuthenticated = useConnectionStore((state) => state.isAuthenticated);
  const lastResult = useConnectionStore((state) => state.lastResult);
  const lastHeartbeat = useConnectionStore((state) => state.lastHeartbeat);
  const error = useConnectionStore((state) => state.error);
  const authenticate = useConnectionStore((state) => state.authenticate);
  const sendAction = useConnectionStore((state) => state.sendAction);
  const disconnect = useConnectionStore((state) => state.disconnect);

  useEffect(() => {
    if (connectionState === ConnectionState.DISCONNECTED) {
      navigation.replace("Connect");
    }
  }, [connectionState, navigation]);

  const handleDisconnect = () => {
    disconnect();
    navigation.replace("Connect");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Controller</Text>
      <Text>Connected: {isConnected ? "Yes" : "No"}</Text>
      <Text>State: {connectionState}</Text>
      {connectionState === ConnectionState.RECONNECTING ? (
        <Text>Reconnecting: attempt {reconnectAttempt}/10</Text>
      ) : null}
      <Text>Authenticated: {isAuthenticated ? "Yes" : "No"}</Text>
      <Text>
        Last heartbeat:{" "}
        {lastHeartbeat ? new Date(lastHeartbeat).toLocaleTimeString() : "N/A"}
      </Text>

      <View style={styles.actions}>
        {!isAuthenticated ? (
          <>
            <Text style={styles.authPrompt}>Authenticate first</Text>
            <Button title="Authenticate" onPress={authenticate} />
          </>
        ) : null}
        <Button title="Disconnect" onPress={handleDisconnect} />
      </View>

      <ActionGrid isEnabled={isAuthenticated} onActionPress={sendAction} />

      {lastResult ? (
        <View style={styles.resultBlock}>
          <Text style={styles.subtitle}>Last Result</Text>
          <Text>Action ID: {lastResult.id}</Text>
          <Text>Status: {lastResult.status}</Text>
          <Text>Execution Time: {lastResult.executionTime} ms</Text>
          {lastResult.error ? <Text>Error: {lastResult.error}</Text> : null}
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  actions: {
    gap: 10,
  },
  authPrompt: {
    color: "#6b7280",
  },
  resultBlock: {
    paddingTop: 12,
    gap: 6,
  },
  error: {
    color: "#b00020",
  },
});
