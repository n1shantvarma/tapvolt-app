declare module "expo-barcode-scanner" {
  import type { ComponentType } from "react";
  import type { ViewProps } from "react-native";

  export type BarCodeScannedEvent = {
    type: string;
    data: string;
  };

  export type PermissionResponse = {
    status: "granted" | "denied" | "undetermined";
  };

  export const BarCodeScanner: ComponentType<
    ViewProps & {
      onBarCodeScanned?: ((event: BarCodeScannedEvent) => void) | undefined;
    }
  > & {
    requestPermissionsAsync: () => Promise<PermissionResponse>;
  };
}
