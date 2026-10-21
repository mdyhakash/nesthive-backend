import type { Application } from "express";
import swaggerDoc from "./swagger.json";

export const setupSwagger = (app: Application): void => {
  // Serve the raw OpenAPI JSON specification
  app.get("/api-docs/swagger.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerDoc);
  });

  // Self-contained, CDN-powered Swagger UI (100% compatible with Vercel serverless)
  const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>NestHive API Docs</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui.min.css" />
  <link rel="icon" type="image/png" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/favicon-32x32.png" />
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #fafafa;
    }
    .swagger-ui .topbar {
      display: none;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui-bundle.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui-standalone-preset.min.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: "/api-docs/swagger.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;

  app.get(["/api-docs", "/api-docs/"], (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(swaggerHtml);
  });
};
