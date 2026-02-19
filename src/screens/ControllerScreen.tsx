import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Button,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { RootStackParamList } from "../app/AppNavigator";
import { ActionGrid } from "../components/ActionGrid";
import { PROFILES } from "../config/profiles";
import { ConnectionState } from "../services/connectionManager";
import { useConnectionStore } from "../store/connectionStore";

type Props = NativeStackScreenProps<RootStackParamList, "Controller">;

export const ControllerScreen = ({ navigation }: Props) => {
  const isConnected = useConnectionStore((state) => state.isConnected);
  const isConnecting = useConnectionStore((state) => state.isConnecting);
  const connectionState = useConnectionStore((state) => state.connectionState);
  const reconnectAttempt = useConnectionStore((state) => state.reconnectAttempt);
  const isAuthenticated = useConnectionStore((state) => state.isAuthenticated);
  const lastResult = useConnectionStore((state) => state.lastResult);
  const lastHeartbeat = useConnectionStore((state) => state.lastHeartbeat);
  const activeProfileId = useConnectionStore((state) => state.activeProfileId);
  const setActiveProfile = useConnectionStore((state) => state.setActiveProfile);
  const getActiveProfile = useConnectionStore((state) => state.getActiveProfile);
  const error = useConnectionStore((state) => state.error);
  const authenticate = useConnectionStore((state) => state.authenticate);
  const sendAction = useConnectionStore((state) => state.sendAction);
  const disconnect = useConnectionStore((state) => state.disconnect);
  const activeProfile = getActiveProfile();
  const isReconnectInProgress =
    isConnecting || connectionState === ConnectionState.RECONNECTING;
  const isGridEnabled = isAuthenticated && !isConnecting;
  const visibleError = isReconnectInProgress ? null : error;

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
      {isConnecting ? <ActivityIndicator size="small" color="#111827" /> : null}
      <Text>Authenticated: {isAuthenticated ? "Yes" : "No"}</Text>
      <Text>
        Last heartbeat:{" "}
        {lastHeartbeat ? new Date(lastHeartbeat).toLocaleTimeString() : "N/A"}
      </Text>

      <View style={styles.profileSection}>
        <Text style={styles.subtitle}>Profiles</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.profileRow}
        >
          {PROFILES.map((profile) => {
            const isActive = profile.id === activeProfileId;
            return (
              <Pressable
                key={profile.id}
                style={[styles.profileButton, isActive && styles.profileButtonActive]}
                onPress={() => setActiveProfile(profile.id)}
              >
                <Text style={[styles.profileButtonText, isActive && styles.profileButtonTextActive]}>
                  {profile.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.actions}>
        {!isAuthenticated ? <Text style={styles.authPrompt}>Authenticate first</Text> : null}
        <Button
          title="Authenticate"
          onPress={authenticate}
          disabled={isAuthenticated || isConnecting}
        />
        <Button title="Disconnect" onPress={handleDisconnect} />
      </View>

      <ActionGrid
        isEnabled={isGridEnabled}
        actions={activeProfile.actions}
        onActionPress={sendAction}
      />

      {lastResult ? (
        <View style={styles.resultBlock}>
          <Text style={styles.subtitle}>Last Result</Text>
          <Text>Action ID: {lastResult.id}</Text>
          <Text>Status: {lastResult.status}</Text>
          <Text>Execution Time: {lastResult.executionTime} ms</Text>
          {lastResult.error ? <Text>Error: {lastResult.error}</Text> : null}
        </View>
      ) : null}

      {visibleError ? <Text style={styles.error}>{visibleError}</Text> : null}
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
  profileSection: {
    gap: 8,
  },
  profileRow: {
    gap: 8,
  },
  profileButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
  },
  profileButtonActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  profileButtonText: {
    color: "#111827",
    fontWeight: "500",
  },
  profileButtonTextActive: {
    color: "#ffffff",
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
