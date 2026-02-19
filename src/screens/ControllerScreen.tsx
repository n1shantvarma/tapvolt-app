import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
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
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isReconnectInProgress =
    isConnecting || connectionState === ConnectionState.RECONNECTING;
  const isGridEnabled = isAuthenticated && !isConnecting;
  const visibleError = isReconnectInProgress ? null : error;

  useEffect(() => {
    if (connectionState === ConnectionState.DISCONNECTED) {
      navigation.replace("Connect");
    }
  }, [connectionState, navigation]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulseAnim]);

  const handleDisconnect = () => {
    disconnect();
    navigation.replace("Connect");
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.prioritySection}>
          <View style={styles.priorityHeaderRow}>
            <Text style={styles.bottomSectionHeader}>PRIMARY CONTROLS</Text>
            <Animated.View
              style={[styles.priorityPulse, { transform: [{ scale: pulseAnim }] }]}
            />
          </View>

          <Text style={styles.sectionHeader}>PROFILES</Text>
          <View style={styles.profileRow}>
            {PROFILES.map((profile) => {
              const isActive = profile.id === activeProfileId;
              return (
                <Pressable
                  key={profile.id}
                  style={[styles.profileButton, isActive && styles.profileButtonActive]}
                  onPress={() => setActiveProfile(profile.id)}
                >
                  <Text
                    style={[
                      styles.profileButtonText,
                      isActive && styles.profileButtonTextActive,
                    ]}
                  >
                    {profile.name.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {!isAuthenticated ? (
            <Text style={styles.authPrompt}>AUTHENTICATE FIRST</Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              onPress={authenticate}
              disabled={isAuthenticated || isConnecting}
              style={({ pressed }) => [
                styles.actionButton,
                (isAuthenticated || isConnecting) && styles.actionButtonDisabled,
                pressed && !(isAuthenticated || isConnecting) && styles.actionButtonPressed,
              ]}
            >
              <Text style={styles.actionButtonText}>AUTHENTICATE</Text>
            </Pressable>
            <Pressable
              onPress={handleDisconnect}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.actionButtonPressed,
              ]}
            >
              <Text style={styles.actionButtonText}>DISCONNECT</Text>
            </Pressable>
          </View>

          <Text style={styles.bottomSectionHeader}>ACTIONS</Text>
          <ActionGrid
            isEnabled={isGridEnabled}
            actions={activeProfile.actions}
            onActionPress={sendAction}
          />

          {lastResult ? (
            <View style={styles.resultBlock}>
              <Text style={styles.bottomSectionHeader}>LAST RESULT</Text>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>ACTION ID</Text>
                <Text style={styles.resultValue}>{lastResult.id.toUpperCase()}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>STATUS</Text>
                <Text style={styles.resultValue}>{lastResult.status.toUpperCase()}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>EXECUTION</Text>
                <Text style={styles.resultValue}>{lastResult.executionTime} MS</Text>
              </View>
              {lastResult.error ? (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>ERROR</Text>
                  <Text style={styles.error}>{lastResult.error.toUpperCase()}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {visibleError ? (
            <Text style={styles.error}>{visibleError.toUpperCase()}</Text>
          ) : null}
        </View>

        <View style={styles.statusSection}>
          <Text style={styles.title}>CONTROLLER STATUS</Text>
          <View style={styles.statusBlock}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>CONNECTED</Text>
              <Text style={styles.statusValue}>{isConnected ? "YES" : "NO"}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>STATE</Text>
              <Text style={styles.statusValue}>{connectionState.toUpperCase()}</Text>
            </View>
            {connectionState === ConnectionState.RECONNECTING ? (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>RECONNECTING</Text>
                <Text style={styles.statusValue}>{reconnectAttempt}/10</Text>
              </View>
            ) : null}
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>AUTHENTICATED</Text>
              <Text style={styles.statusValue}>{isAuthenticated ? "YES" : "NO"}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>LAST HEARTBEAT</Text>
              <Text style={styles.statusValue}>
                {lastHeartbeat ? new Date(lastHeartbeat).toLocaleTimeString() : "N/A"}
              </Text>
            </View>
          </View>
          {isConnecting ? (
            <View style={styles.connectingRow}>
              <ActivityIndicator size="small" color="#00FF88" />
              <Text style={styles.connectingText}>CONNECTING</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F2",
  },
  scrollContent: {
    paddingBottom: 16,
  },
  prioritySection: {
    backgroundColor: "#F2F2F2",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statusSection: {
    backgroundColor: "#111111",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  priorityHeaderRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  priorityPulse: {
    width: 10,
    height: 10,
    backgroundColor: "#111111",
    borderRadius: 0,
  },
  title: {
    color: "#F2F2F2",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  sectionHeader: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  bottomSectionHeader: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  statusBlock: {
    borderWidth: 3,
    borderColor: "#F2F2F2",
    padding: 12,
    gap: 8,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    color: "#F2F2F2",
    fontSize: 12,
    letterSpacing: 0.8,
    fontWeight: "800",
  },
  statusValue: {
    color: "#00FF88",
    fontSize: 12,
    fontWeight: "800",
  },
  connectingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  connectingText: {
    color: "#00FF88",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  profileRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  profileButton: {
    borderWidth: 3,
    borderColor: "#111111",
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "transparent",
    minWidth: 110,
    alignItems: "center",
  },
  profileButtonActive: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },
  profileButtonText: {
    color: "#111111",
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  profileButtonTextActive: {
    color: "#00FF88",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderWidth: 3,
    borderColor: "#111111",
    borderRadius: 0,
    backgroundColor: "#111111",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonPressed: {
    backgroundColor: "#FFFFFF",
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: "#F2F2F2",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  authPrompt: {
    color: "#00FF88",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "800",
    letterSpacing: 1,
  },
  resultBlock: {
    borderWidth: 3,
    borderColor: "#111111",
    padding: 12,
    gap: 6,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultLabel: {
    color: "#111111",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.8,
  },
  resultValue: {
    color: "#111111",
    fontWeight: "800",
    fontSize: 12,
  },
  error: {
    color: "#111111",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.5,
    textAlign: "center",
  },
});
