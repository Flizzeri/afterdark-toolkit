// Test fixture: basic types and interfaces

/**
 * @entity User
 */
export interface User {
        /**
         * @pk
         */
        id: string;

        /**
         * @unique
         */
        email: string;

        name: string;
        age: number;
}

export type UserId = string;

export type UserStatus = 'active' | 'inactive' | 'suspended';
