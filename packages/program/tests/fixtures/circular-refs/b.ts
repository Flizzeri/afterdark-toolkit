// packages/program/tests/fixtures/circular-refs/b.ts

import type { TypeA } from './a.js';

export interface TypeB {
        id: number;
        a: TypeA;
}
