// packages/core/tests/extraction/circulars.ts

// 1. Direct self-reference — simplest cycle

export interface TreeNode {
        value: number;
        children: TreeNode[]; // ← creates cycle: TreeNode → TreeNode[]
}

export interface JsonValue {
        // JsonValue references itself through the array and object shapes
        value: string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };
}

// 2. Mutual two-hop cycle — A references B, B references A

export interface Employee {
        id: number;
        name: string;
        manager?: Manager; // ← Manager not yet declared → IRRef on first visit
}

export interface Manager {
        id: number;
        name: string;
        reports: Employee[]; // ← Employee already in visited set → IRRef
}

// 3. Three-hop cycle — A → B → C → A

export interface FileNode {
        name: string;
        parent?: DirectoryNode;
}

export interface DirectoryNode {
        name: string;
        children: Array<FileNode | DirectoryNode>;
        parent?: RootNode;
}

export interface RootNode {
        name: '/';
        children: DirectoryNode[];
        // no parent — terminates the chain
}

// 4. Self-referencing type alias

export type NestedArray = string | NestedArray[];

// 5. Cycle through a union — one union member is the type itself

export interface LinkedList {
        head: number;
        tail: LinkedList | null; // ← LinkedList in tail union member
}

// 6. Cycle through an intersection

export interface BaseNode {
        id: string;
}

export type CyclicNode = BaseNode & {
        children: CyclicNode[];
};

// 7. Mutual cycle via type aliases (not interfaces)

export type ExprA = string | { nested: ExprB };
export type ExprB = number | { nested: ExprA };

// 8. Cycle where the first occurrence is inlined, second is IRRef

export interface Category {
        id: number;
        name: string;
        parent?: Category; // ← back-reference
        children?: Category[]; // ← also back-reference
}
