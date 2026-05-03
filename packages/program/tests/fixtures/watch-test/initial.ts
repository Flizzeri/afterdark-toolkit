// packages/program/tests/fixtures/watch-test/initial.ts

export interface User {
        id: string;
        name: string;
}

export function getUser(id: string): User {
        return { id, name: 'Test' };
}
