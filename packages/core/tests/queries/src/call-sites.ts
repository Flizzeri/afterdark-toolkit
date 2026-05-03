// packages/core/tests/queries/src/call-sites.ts

// Types used as call-site type arguments

export interface User {
        id: number;
        name: string;
}

export interface Post {
        id: number;
        title: string;
}

export interface Comment {
        id: number;
        body: string;
}

export interface Order {
        id: number;
        total: number;
}

// Stub functions

declare function validate<T, U = unknown>(data: unknown): T;
declare function transform<T>(data: unknown): T;

declare const validator: {
        run<T>(data: unknown): T;
};

// Call sites: should be found

const _a = validate<User>({});

const _b = validate<Post>({});

const _c = validator.run<Comment>({});

const _d = validate<Order, Post>({});

// Call sites: must NOT be found

const _e = validate({} as User);

const _f = transform<User>({});

const _g = JSON.stringify(validate<Comment>({}));
