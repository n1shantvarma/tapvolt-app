import { StyleSheet, Text, TouchableOpacity } from "react-native";

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled: boolean;
};

export const ActionButton = ({ label, onPress, disabled }: ActionButtonProps) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#1f2937",
    padding: 8,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
