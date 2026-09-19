// OnlyCats is discontinued. The site is kept online in a frozen, read-only
// state: existing accounts can still sign in and download a copy of their
// data, and nothing else. Every write path in the app is disabled, both in the
// UI and at the data layer, so a missed button cannot quietly post something.
export const READ_ONLY = true;

export const READ_ONLY_MESSAGE =
  'OnlyCats is discontinued. Posting, uploading, and every other change is permanently disabled. You can sign in to an existing account and download your data, and that is all.';

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
