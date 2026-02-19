import { FlatList, StyleSheet, View } from "react-native";

import type { Step as Action } from "../types/protocol";
import { ActionButton } from "./ActionButton";

type Props = {
  actions: {
    id: string;
    label: string;
    action: Action;
  }[];
  isEnabled: boolean;
  onActionPress: (action: Action) => void;
};

type ActionGridItem = Props["actions"][number];

export const ActionGrid = ({ actions, isEnabled, onActionPress }: Props) => {
  return (
    <FlatList<ActionGridItem>
      data={actions}
      keyExtractor={(item) => item.id}
      numColumns={3}
      scrollEnabled={false}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => (
        <View style={styles.cell}>
          <ActionButton
            label={item.label}
            disabled={!isEnabled}
            onPress={() => onActionPress(item.action)}
          />
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 10,
  },
  row: {
    gap: 10,
  },
  cell: {
    flex: 1,
  },
});
