import type { Step } from "../types/protocol";

type ControllerGridItem = {
  id: string;
  label: string;
  action: Step;
};

export const DEFAULT_ACTIONS: readonly ControllerGridItem[] = [
  {
    id: "save",
    label: "Save",
    action: { type: "shortcut", keys: ["control", "s"] },
  },
  {
    id: "copy",
    label: "Copy",
    action: { type: "shortcut", keys: ["control", "c"] },
  },
  {
    id: "paste",
    label: "Paste",
    action: { type: "shortcut", keys: ["control", "v"] },
  },
  {
    id: "hello",
    label: "Hello",
    action: { type: "text", value: "Hello\n" },
  },
  {
    id: "build",
    label: "Build",
    action: { type: "text", value: "npm run build\n" },
  },
  {
    id: "terminal",
    label: "Terminal",
    action: { type: "shortcut", keys: ["control", "`"] },
  },
  {
    id: "delay-1s",
    label: "Delay 1s",
    action: { type: "delay", duration: 1000 },
  },
  {
    id: "lock",
    label: "Lock",
    action: { type: "shortcut", keys: ["meta", "l"] },
  },
  {
    id: "email",
    label: "Email",
    action: { type: "text", value: "nishant@example.com\n" },
  },
];
