type PendoMetadata = { id: string } & Record<
  string,
  string | number | boolean | string[]
>;

type PendoOptions = {
  visitor: PendoMetadata;
  account?: PendoMetadata;
};

declare global {
  // Defined by the install snippet in components/pendo-script.tsx. It can be
  // missing (for example when the snippet is blocked), so callers must guard.
  var pendo:
    | {
        initialize(options: PendoOptions): void;
        identify(options: PendoOptions): void;
      }
    | undefined;
}

export {};
