import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Application } from "express";
import swaggerUi from "swagger-ui-express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const setupSwagger = (app: Application): void => {
  const candidates = [
    path.join(__dirname, "swagger.json"),
    path.resolve(process.cwd(), "src/app/docs/swagger.json"),
    path.resolve(process.cwd(), "dist/src/app/docs/swagger.json"),
  ];

  let swaggerDoc: any = null;
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      try {
        swaggerDoc = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        break;
      } catch (err) {
        console.error("Failed to parse swagger.json:", err);
      }
    }
  }

  if (swaggerDoc) {
    app.get("/api-docs/swagger.json", (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.send(swaggerDoc);
    });

    app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerDoc, {
        customSiteTitle: "NestHive API Docs",
        customCssUrl: "https://cloudflare.com",
        customJs: ["https://cloudflare.com", "https://cloudflare.com"],
      }),
    );
  }
};
