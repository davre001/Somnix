function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const serverEnv = {
  get DREAMDEX_INDEXER_URL() {
    return required("DREAMDEX_INDEXER_URL");
  },
  /** Hasura role/admin-secret for privileged server-only indexer reads (e.g. `_aggregate` fields). Optional. */
  get DREAMDEX_INDEXER_ADMIN_SECRET() {
    return process.env.DREAMDEX_INDEXER_ADMIN_SECRET;
  },
};
