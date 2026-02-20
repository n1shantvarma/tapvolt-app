import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_ID_KEY = "tapvolt_device_id";

const createUuidV4 = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const randomNibble = Math.floor(Math.random() * 16);
    const value = char === "x" ? randomNibble : (randomNibble & 0x3) | 0x8;
    return value.toString(16);
  });
};

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  console.log("Existing device ID:", existing);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const created = createUuidV4();
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}
