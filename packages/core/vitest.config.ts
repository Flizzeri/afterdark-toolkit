// packages/program/vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig(() => {
        const isCoverage = process.argv.includes('--coverage');
        const isCI = process.env.CI === 'true';

        return {
                test: {
                        testTimeout: isCoverage || isCI ? 20000 : 10000,
                },
        };
});
