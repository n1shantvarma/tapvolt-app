import { Pressable, StyleSheet, Text } from "react-native";

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled: boolean;
};

export const ActionButton = ({ label, onPress, disabled }: ActionButtonProps) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      android_disableSound={false}
    >
      {({ pressed }) => (
        <Text style={[styles.label, pressed && !disabled && styles.labelPressed]}>
          {label.toUpperCase()}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 0,
    borderWidth: 3,
    borderColor: "#111111",
    backgroundColor: "#111111",
    padding: 8,
  },
  buttonPressed: {
    backgroundColor: "#F2F2F2",
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: "#F2F2F2",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  labelPressed: {
    color: "#111111",
  },
});
