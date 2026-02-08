import pkg from "pg";
const { Pool } = pkg;
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Resolve config path relative to this file so it works regardless of process.cwd()
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// From apps/backend/services/ go up to DataSync UI app root (3 levels)
const APP_ROOT = path.join(__dirname, "..", "..", "..");
const DEFAULT_CONFIG_PATH = path.join(APP_ROOT, "config", "config.json");

/** Returns the path to config.json (DataSync UI/config/config.json). */
export function getConfigPath() {
  return DEFAULT_CONFIG_PATH;
}

// Load configuration from shared config file
function loadConfig() {
  try {
    const configPath = getConfigPath();
    const configData = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(configData);
    return config;
  } catch (error) {
    // Default configuration fallback - use environment variables if available
    return {
      database: {
        postgres: {
          host: process.env.POSTGRES_HOST || "localhost",
          port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
          database: process.env.POSTGRES_DATABASE || "DataLake",
          user: process.env.POSTGRES_USER || "postgres",
          password: process.env.POSTGRES_PASSWORD || "",
        },
      },
    };
  }
}

const config = loadConfig();

const pool = new Pool({
  host: config.database.postgres.host,
  port: config.database.postgres.port,
  database: config.database.postgres.database,
  user: config.database.postgres.user,
  password: config.database.postgres.password,
});

// Test connection
pool.connect((err, client, done) => {
  if (err) {
    console.error("Error connecting to the database:", err);
  } else {
    done();
  }
});

export { pool, config };
