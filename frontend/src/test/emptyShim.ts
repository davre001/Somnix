// Test-only stand-in for `server-only` (and any similar build-time marker
// package). Next.js's own bundler intercepts `server-only` specially to
// enforce the server/client boundary at build time; outside that bundler
// (i.e. under plain vitest) the real package throws unconditionally on
// import. Aliased in vitest.config.ts so server-side unit tests can still
// import the modules that carry that marker.
export {};
