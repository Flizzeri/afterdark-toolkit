// Uses built-in types from lib.d.ts
export function processArray(arr: Array<string>): number {
        return arr.length;
}

export function processPromise(p: Promise<number>): Promise<string> {
        return p.then((n) => String(n));
}
