import { defineConfig } from 'tsup';

export default defineConfig({
        entry: ['dist/index.js'],
        format: ['esm', 'cjs'],
        dts: false,
});
