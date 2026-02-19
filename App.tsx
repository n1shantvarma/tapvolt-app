import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { AppNavigator } from "./src/app/AppNavigator";
import { useConnectionStore } from "./src/store/connectionStore";

export default function App() {
  const isHydrated = useConnectionStore((state) => state.isHydrated);

  useEffect(() => {
    void useConnectionStore.getState().hydrate();
  }, []);

  if (!isHydrated) {
    return null;
  }

  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
}
