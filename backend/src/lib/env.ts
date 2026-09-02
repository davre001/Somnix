function getEnv(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const serverEnv = {
  get DREAMDEX_INDEXER_URL() {
    return getEnv(
      "DREAMDEX_INDEXER_URL",
      "https://indexer-testnet.somnia.network/v1/graphql"
    );
  },
  /** Hasura role/admin-secret for privileged server-only indexer reads. Optional. */
  get DREAMDEX_INDEXER_ADMIN_SECRET() {
    return process.env.DREAMDEX_INDEXER_ADMIN_SECRET;
  },
};
