import { FlatList, StyleSheet, View } from "react-native";

import { DEFAULT_ACTIONS } from "../config/defaultActions";
import type { Step } from "../types/protocol";
import { ActionButton } from "./ActionButton";

type ActionGridProps = {
  isEnabled: boolean;
  onActionPress: (action: Step) => void;
};

type ActionGridItem = (typeof DEFAULT_ACTIONS)[number];

export const ActionGrid = ({ isEnabled, onActionPress }: ActionGridProps) => {
  return (
    <FlatList<ActionGridItem>
      data={DEFAULT_ACTIONS}
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
