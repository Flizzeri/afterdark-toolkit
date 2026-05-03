// packages/program/tests/fixtures/circular-refs/a.ts

import type { TypeB } from './b.js';

export interface TypeA {
        name: string;
        b: TypeB;
}
