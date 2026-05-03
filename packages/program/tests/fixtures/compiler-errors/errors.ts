// packages/program/tests/fixtures/compiler-errors/errors.ts
//
// Type errors intentionally
export interface User {
        name: string;
        age: number;
}

// TS2322: Type 'string' is not assignable to type 'number'
export const user: User = {
        name: 'Alice',
        age: 'twenty-five', // Error: should be number
};

// TS2339: Property 'foo' does not exist on type 'User'
export function getUser(): User {
        const u: User = { name: 'Bob', age: 30 };
        return u.foo; // Error: 'foo' doesn't exist
}

// TS2304: Cannot find name 'NonExistent'
export type MyType = NonExistent; // Error: type doesn't exist
