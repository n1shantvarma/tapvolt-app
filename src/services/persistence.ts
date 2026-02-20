import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEYS = {
  IP_ADDRESS: "tapvolt_ip",
  ACTIVE_PROFILE: "tapvolt_profile",
} as const;

function parseStoredString(raw: string | null): string | null {
  if (raw === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function serializeString(value: string): string {
  return JSON.stringify(value);
}

export async function saveIp(ip: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.IP_ADDRESS, serializeString(ip));
  } catch (error: unknown) {
    console.warn("Failed to save IP address", error);
  }
}

export async function loadIp(): Promise<string | null> {
  try {
    const rawValue: string | null = await AsyncStorage.getItem(
      STORAGE_KEYS.IP_ADDRESS
    );
    return parseStoredString(rawValue);
  } catch (error: unknown) {
    console.warn("Failed to load IP address", error);
    return null;
  }
}

export async function saveActiveProfile(profileId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.ACTIVE_PROFILE,
      serializeString(profileId)
    );
  } catch (error: unknown) {
    console.warn("Failed to save active profile", error);
  }
}

export async function loadActiveProfile(): Promise<string | null> {
  try {
    const rawValue: string | null = await AsyncStorage.getItem(
      STORAGE_KEYS.ACTIVE_PROFILE
    );
    return parseStoredString(rawValue);
  } catch (error: unknown) {
    console.warn("Failed to load active profile", error);
    return null;
  }
}
