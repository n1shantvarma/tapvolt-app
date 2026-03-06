declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;
declare function expect<T>(value: T): {
  toEqual(expected: unknown): void;
  toBe(expected: unknown): void;
  toBeNull(): void;
  not: {
    toBe(expected: unknown): void;
    toBeNull(): void;
  };
  toThrow(expected?: string | RegExp): void;
};
