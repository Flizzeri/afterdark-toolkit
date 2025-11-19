// packages/shared/src/utils/utilities.ts

// Exhaustiveness guard
export const assertNever = (x: never): never => {
        throw new Error(`Unexpected value: ${x}`);
};
