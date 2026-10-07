import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { openapi } from "../docs/openapi.js";
export const docsRouter = Router();
docsRouter.get("/openapi.json", (_request, response) => {
  response.json(openapi);
});
docsRouter.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    customSiteTitle: "Doctor Tracker · API Reference",
    swaggerOptions: {
      url: "/openapi.json",
      withCredentials: true,
      validatorUrl: null,
      displayRequestDuration: true,
      filter: true,
      docExpansion: "list",
      defaultModelsExpandDepth: 0,
    },
    customCss:
      ".swagger-ui .topbar { display: none } .swagger-ui .auth-wrapper { display: none }",
  }),
);
