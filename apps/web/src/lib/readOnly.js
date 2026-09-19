// OnlyCats is discontinued. The site is kept online in a frozen, read-only
// state: existing accounts can still sign in and download a copy of their
// data, and nothing else. Every write path in the app is disabled, both in the
// UI and at the data layer, so a missed button cannot quietly post something.
export const READ_ONLY = true;

export const READ_ONLY_MESSAGE =
  'OnlyCats is discontinued. Posting, uploading, and every other change is permanently disabled. You can sign in to an existing account and download your data, and that is all.';

// The moment OnlyCats closed to new accounts. Discord sign-in is allowed, but
// only as a way back into an account that already existed: Supabase OAuth will
// happily create a user for an unknown Discord identity, so anything created
// from this point on is a signup wearing a login's clothes.
export const ACCOUNTS_FROZEN_AT = Date.parse('2026-09-19T00:00:00Z');

export const NEW_ACCOUNT_REJECTED_MESSAGE =
  'That Discord account has no OnlyCats account attached to it. OnlyCats is discontinued, so new accounts cannot be created and you have been signed out. Discord sign-in only works for an account that already existed.';

export const isPreExistingAccount = (user) => {
  if (!user) return false;
  const createdAt = Date.parse(user.created_at ?? '');
  // If the timestamp is unreadable we let the session through. Supabase always
  // sets created_at, so this is close to unreachable, and locking a real person
  // out of their own data export is the worse failure of the two.
  if (Number.isNaN(createdAt)) return true;
  return createdAt < ACCOUNTS_FROZEN_AT;
};

export class ReadOnlyError extends Error {
  constructor(action) {
    super(action ? `${READ_ONLY_MESSAGE} (blocked: ${action})` : READ_ONLY_MESSAGE);
    this.name = 'ReadOnlyError';
    this.code = 'READ_ONLY';
  }
}

// Wraps a query builder so the listed methods refuse to run while everything
// else, the read side, passes straight through and keeps chaining.
export const createReadOnlyProxy = (target, blockedMethods, label) =>
  new Proxy(target, {
    get(obj, prop, receiver) {
      if (typeof prop === 'string' && blockedMethods.includes(prop)) {
        return () => {
          throw new ReadOnlyError(`${label}.${prop}()`);
        };
      }
      const value = Reflect.get(obj, prop, receiver);
      return typeof value === 'function' ? value.bind(obj) : value;
    },
  });
