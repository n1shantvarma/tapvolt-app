import { StatusBar } from "expo-status-bar";

import { AppNavigator } from "./src/app/AppNavigator";

export default function App() {
  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
}
