// Copies the static swagger-ui-dist bundle into backend/public/docs/ and
// points its initializer at our OpenAPI spec. Runs before dev/build/start
// (see package.json) so the generated files never need to be committed.
const fs = require("fs");
const path = require("path");

const srcDir = path.dirname(require.resolve("swagger-ui-dist/package.json"));
const outDir = path.join(__dirname, "..", "backend", "public", "docs");

fs.mkdirSync(outDir, { recursive: true });

const assets = [
  "swagger-ui.css",
  "swagger-ui.css.map",
  "swagger-ui-bundle.js",
  "swagger-ui-bundle.js.map",
  "swagger-ui-standalone-preset.js",
  "index.css",
  "favicon-16x16.png",
  "favicon-32x32.png",
];

for (const asset of assets) {
  fs.copyFileSync(path.join(srcDir, asset), path.join(outDir, asset));
}

fs.writeFileSync(
  path.join(outDir, "swagger-initializer.js"),
  `window.onload = function() {
  window.ui = SwaggerUIBundle({
    url: "/openapi.json",
    dom_id: "#swagger-ui",
    deepLinking: true,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    plugins: [SwaggerUIBundle.plugins.DownloadUrl],
    layout: "StandaloneLayout",
  });
};
`
);

fs.writeFileSync(
  path.join(outDir, "index.html"),
  `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>SOMNIX backend docs</title>
    <link rel="stylesheet" type="text/css" href="/docs/swagger-ui.css" />
    <link rel="stylesheet" type="text/css" href="/docs/index.css" />
    <link rel="icon" type="image/png" href="/docs/favicon-32x32.png" sizes="32x32" />
    <link rel="icon" type="image/png" href="/docs/favicon-16x16.png" sizes="16x16" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/docs/swagger-ui-bundle.js" charset="UTF-8"></script>
    <script src="/docs/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
    <script src="/docs/swagger-initializer.js" charset="UTF-8"></script>
  </body>
</html>
`
);

console.log(`Swagger UI written to ${path.relative(process.cwd(), outDir)}`);
