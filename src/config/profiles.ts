import type { Step as Action } from "../types/protocol";

export type Profile = {
  id: string;
  name: string;
  actions: {
    id: string;
    label: string;
    action: Action;
  }[];
};

export const PROFILES: Profile[] = [
  {
    id: "coding",
    name: "Coding",
    actions: [
      { id: "save", label: "Save", action: { type: "shortcut", keys: ["control", "s"] } },
      { id: "copy", label: "Copy", action: { type: "shortcut", keys: ["control", "c"] } },
      { id: "paste", label: "Paste", action: { type: "shortcut", keys: ["control", "v"] } },
      { id: "build", label: "Build", action: { type: "text", value: "npm run build\n" } },
      {
        id: "terminal",
        label: "Terminal",
        action: { type: "shortcut", keys: ["control", "`"] },
      },
      { id: "hello", label: "Hello", action: { type: "text", value: "Hello\n" } },
      { id: "delay-1s", label: "Delay 1s", action: { type: "delay", duration: 1000 } },
      {
        id: "email",
        label: "Email",
        action: { type: "text", value: "nishant@example.com\n" },
      },
      { id: "lock", label: "Lock", action: { type: "shortcut", keys: ["meta", "l"] } },
    ],
  },
  {
    id: "writing",
    name: "Writing",
    actions: [
      { id: "copy", label: "Copy", action: { type: "shortcut", keys: ["control", "c"] } },
      { id: "paste", label: "Paste", action: { type: "shortcut", keys: ["control", "v"] } },
      {
        id: "select-all",
        label: "Select All",
        action: { type: "shortcut", keys: ["control", "a"] },
      },
      { id: "bold", label: "Bold", action: { type: "shortcut", keys: ["control", "b"] } },
      { id: "save", label: "Save", action: { type: "shortcut", keys: ["control", "s"] } },
      { id: "hello", label: "Hello", action: { type: "text", value: "Hello\n" } },
      {
        id: "email",
        label: "Email",
        action: { type: "text", value: "nishant@example.com\n" },
      },
      { id: "delay-1s", label: "Delay 1s", action: { type: "delay", duration: 1000 } },
      { id: "lock", label: "Lock", action: { type: "shortcut", keys: ["meta", "l"] } },
    ],
  },
  {
    id: "general",
    name: "General",
    actions: [
      { id: "save", label: "Save", action: { type: "shortcut", keys: ["control", "s"] } },
      { id: "copy", label: "Copy", action: { type: "shortcut", keys: ["control", "c"] } },
      { id: "paste", label: "Paste", action: { type: "shortcut", keys: ["control", "v"] } },
      { id: "lock", label: "Lock", action: { type: "shortcut", keys: ["meta", "l"] } },
      { id: "hello", label: "Hello", action: { type: "text", value: "Hello\n" } },
      { id: "delay-1s", label: "Delay 1s", action: { type: "delay", duration: 1000 } },
      {
        id: "email",
        label: "Email",
        action: { type: "text", value: "nishant@example.com\n" },
      },
      {
        id: "terminal",
        label: "Terminal",
        action: { type: "shortcut", keys: ["control", "`"] },
      },
      { id: "build", label: "Build", action: { type: "text", value: "npm run build\n" } },
    ],
  },
];
