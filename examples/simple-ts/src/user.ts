/**
 * A user record stored by the application.
 *
 * Implementations may keep additional internal state, but the public surface
 * is fixed by this interface.
 */
export interface User {
  /** Stable unique identifier. */
  id: string;
  /** Display name shown in the UI. */
  displayName: string;
  /** Optional contact email, if the user has verified one. */
  email?: string;
  /** ISO timestamp of account creation. */
  createdAt: string;
}

/**
 * Verification state of a user account.
 */
export enum UserStatus {
  /** Awaiting email verification. */
  Pending = 'pending',
  /** Active and verified. */
  Active = 'active',
  /** Disabled by an administrator. */
  Suspended = 'suspended',
}

/**
 * In-memory user repository for tests and demos.
 *
 * This is intentionally not thread-safe and not persistent. Replace with a
 * real store before shipping.
 */
export class UserRepository {
  private readonly users = new Map<string, User>();

  /** Insert or replace a user record. */
  put(user: User): void {
    this.users.set(user.id, user);
  }

  /**
   * Look up a user by ID.
   *
   * @param id - The user's stable identifier.
   * @returns The user record, or `undefined` if no such user exists.
   */
  get(id: string): User | undefined {
    return this.users.get(id);
  }

  /** Number of users currently held in memory. */
  get size(): number {
    return this.users.size;
  }
}

/**
 * Construct a fresh user with sensible defaults. Useful for tests.
 *
 * @param id - The user's identifier.
 * @param displayName - The display name.
 * @returns A new user record with `createdAt` set to the current time.
 */
export function makeUser(id: string, displayName: string): User {
  return {
    id,
    displayName,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Result of a user-creation attempt.
 *
 * Either holds the created user, or carries an error message describing why
 * creation failed.
 */
export type CreateUserResult = { ok: true; user: User } | { ok: false; error: string };
