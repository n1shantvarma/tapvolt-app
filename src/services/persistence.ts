import AsyncStorage from "@react-native-async-storage/async-storage";

import type { StoredTrustedDevice } from "../types/pairing";

export const STORAGE_KEYS = {
  IP_ADDRESS: "tapvolt_ip",
  ACTIVE_PROFILE: "tapvolt_profile",
  TRUSTED_DEVICE: "tapvolt_trusted_device",
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

function parseStoredObject(raw: string | null): Record<string, unknown> | null {
  if (raw === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
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

export async function saveTrustedDevice(device: StoredTrustedDevice): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TRUSTED_DEVICE, JSON.stringify(device));
  } catch (error: unknown) {
    console.warn("Failed to save trusted device", error);
  }
}

export async function loadTrustedDevice(): Promise<Record<string, unknown> | null> {
  try {
    const rawValue: string | null = await AsyncStorage.getItem(
      STORAGE_KEYS.TRUSTED_DEVICE,
    );
    return parseStoredObject(rawValue);
  } catch (error: unknown) {
    console.warn("Failed to load trusted device", error);
    return null;
  }
}

export async function clearTrustedDevice(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.TRUSTED_DEVICE);
  } catch (error: unknown) {
    console.warn("Failed to clear trusted device", error);
  }
}
