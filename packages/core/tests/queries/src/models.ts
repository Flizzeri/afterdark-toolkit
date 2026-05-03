// packages/core/tests/queries/src/models.ts

/** @model */
export interface Address {
        street: string;
        city: string;
        country: string;
}

/** @model */
export interface Category {
        id: number;
        name: string;
}

/** No annotation */
export type Slug = string;

/** @model @validate */
export interface Product {
        id: number;
        name: string;
        slug: Slug;
        category: Category;
}
