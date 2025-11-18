// tests/fixtures/e2e/simple-schema/src/entities.ts

/**
 * @entity User
 * @version 1.0.0
 */
export interface User {
        /**
         * @pk
         * @uuid
         */
        id: string;

        /**
         * @unique
         * @email
         * @maxLength 255
         */
        email: string;

        /**
         * @minLength 2
         * @maxLength 100
         */
        name: string;

        /**
         * @min 0
         * @max 150
         */
        age?: number;

        /**
         * @default CURRENT_TIMESTAMP
         */
        createdAt: string;

        role: 'admin' | 'user' | 'guest';
}

/**
 * @entity Post
 * @index userId
 * @index userId,createdAt
 */
export interface Post {
        /**
         * @pk
         * @uuid
         */
        id: string;

        /**
         * @fk User.id cascade:cascade
         * @uuid
         */
        userId: string;

        /**
         * @minLength 1
         * @maxLength 500
         */
        title: string;

        content: string;

        /**
         * @default CURRENT_TIMESTAMP
         */
        createdAt: string;

        published: boolean;

        tags: string[];

        metadata?: Record<string, string>;
}

/**
 * @entity Comment
 */
export interface Comment {
        /**
         * @pk
         * @uuid
         */
        id: string;

        /**
         * @fk Post.id cascade:cascade
         */
        postId: string;

        /**
         * @fk User.id cascade:set null
         */
        authorId: string | null;

        /**
         * @minLength 1
         * @maxLength 1000
         */
        text: string;

        createdAt: string;

        nested: {
                level: number;
                data: {
                        value: string;
                        count: number;
                };
        };
}

/**
 * @entity Product
 */
export interface Product {
        /**
         * @pk
         */
        id: number;

        /**
         * @minLength 1
         * @maxLength 200
         */
        name: string;

        /**
         * @decimal 10,2
         * @min 0
         */
        price: number;

        /**
         * @int
         * @min 0
         */
        stock: number;

        categories: readonly string[];

        dimensions: [number, number, number];

        status: 'active' | 'inactive' | 'discontinued';
}
