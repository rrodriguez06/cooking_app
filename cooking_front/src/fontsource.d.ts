// Fontsource packages ship CSS-only entrypoints without TS types.
// These ambient declarations satisfy `noUncheckedSideEffectImports`.
// Vite resolves and injects the actual font CSS at build time.
declare module '@fontsource-variable/inter';
declare module '@fontsource-variable/fraunces';
