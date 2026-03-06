import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ConnectScreen } from "../screens/ConnectScreen";
import { ControllerScreen } from "../screens/ControllerScreen";
import { PairScreen } from "../screens/PairScreen";

export type RootStackParamList = {
  Connect: undefined;
  Pair: undefined;
  Controller: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Connect"
      >
        <Stack.Screen name="Connect" component={ConnectScreen} />
        <Stack.Screen name="Pair" component={PairScreen} />
        <Stack.Screen name="Controller" component={ControllerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
