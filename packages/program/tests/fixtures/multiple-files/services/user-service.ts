// packages/program/tests/fixtures/multiple-files/services/user-service.ts

import type { User } from '../models/user';

export class UserService {
        getUser(id: string): User {
                return { id, name: 'Unknown' };
        }
}
