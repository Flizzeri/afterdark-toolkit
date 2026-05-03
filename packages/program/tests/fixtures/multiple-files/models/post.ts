// packages/program/tests/fixtures/multiple-files/models/post.ts

import type { User } from './user';

export interface Post {
        id: string;
        author: User;
        title: string;
}
