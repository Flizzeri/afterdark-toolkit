// packages/core/src/utils/serialize.ts

/**
 * Safely serializes a value to a string representation.
 *
 * @remarks
 * TypeScript literal types can contain values that `JSON.stringify` doesn't
 * handle correctly (bigint, -0, etc.). This function produces deterministic
 * string representations for all literal values.
 */
export function safeSerialize(value: unknown): string {
        // Handle bigint specially (JSON.stringify throws on bigint)
        if (typeof value === 'bigint') {
                return value.toString() + 'n';
        }

        // Handle -0 specially (JSON.stringify converts to "0")
        if (Object.is(value, -0)) {
                return '-0';
        }

        // Handle all other values with JSON.stringify
        // This correctly handles: string, number, boolean, null, objects, arrays
        return JSON.stringify(value);
}
