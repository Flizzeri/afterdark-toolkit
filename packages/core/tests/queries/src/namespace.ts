// packages/core/tests/queries/src/namespace.ts

// A symbol declared inside an exported namespace is considered exported;

export namespace Shapes {
        /** @shape */
        export interface Circle {
                radius: number;
        }

        /** @shape */
        export interface Rectangle {
                width: number;
                height: number;
        }

        // Not exported from the namespace — should not survive exports-only
        export interface Triangle {
                base: number;
                height: number;
        }
}

// A symbol declafred inside an unexported namespace is not considered exported.
namespace Internal {
        export interface Secret {
                key: string;
        }
}
