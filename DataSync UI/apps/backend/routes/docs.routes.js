import express from "express";

const router = express.Router();

// Swagger JSON specification
router.get("/swagger.json", (req, res) => {
  try {
    const swaggerSpec = require("../swagger.json");
    res.json(swaggerSpec);
  } catch (err) {
    console.error("Error loading swagger.json:", err);
    res.status(500).json({
      error: "Swagger specification not available",
      message: err.message,
    });
  }
});

// Swagger UI HTML page
router.get("/api-docs", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>DataSync API Documentation</title>
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
      <script>
        SwaggerUIBundle({
          url: "/swagger.json",
          dom_id: "#swagger-ui"
        });
      </script>
    </body>
    </html>
  `);
});

export default router;
