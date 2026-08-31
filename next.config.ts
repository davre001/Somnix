import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// `dev`/`build`/`start` run against ./backend (see package.json), so Next's
// automatic .env discovery looks there instead of here. Load the repo-root
// env files explicitly so DREAMDEX_INDEXER_URL etc. stay defined at the root
// alongside the other project config, per the layout in README.md.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production", undefined, true);

const nextConfig: NextConfig = {};

export default nextConfig;
