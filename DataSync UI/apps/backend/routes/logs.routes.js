import express from "express";
import fs from "fs";
import path from "path";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { validateLimit, validateEnum, sanitizeSearch } from "../server-utils/validation.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";

const router = express.Router();

// Endpoint para leer logs desde DB (metadata.logs)
router.get("/", async (req, res) => {
  try {
    const autoCleanup = req.query.autoCleanup === "true" || process.env.NODE_ENV === "production";
    const deleteDebug = req.query.deleteDebug === "true" || (process.env.NODE_ENV === "production" && req.query.deleteDebug !== "false");
    const deleteDuplicates = req.query.deleteDuplicates === "true";
    const deleteOlderThan = req.query.deleteOlderThan;

    if (autoCleanup || deleteDebug || deleteDuplicates || deleteOlderThan) {
      let deleteWhere = [];
      let deleteParams = [];
      let paramCount = 1;

      if (deleteDebug) {
        deleteWhere.push(`level = 'DEBUG'`);
      }

      if (deleteOlderThan) {
        const days = parseInt(deleteOlderThan);
        if (!isNaN(days) && days > 0) {
          deleteWhere.push(`ts < NOW() - INTERVAL '${days} days'`);
        }
      }

      if (deleteDuplicates) {
        const duplicateQuery = `
          DELETE FROM metadata.logs
          WHERE id IN (
            SELECT id FROM (
              SELECT id,
                     ROW_NUMBER() OVER (
                       PARTITION BY level, category, function, message 
                       ORDER BY ts DESC
                     ) as rn
              FROM metadata.logs
            ) t
            WHERE t.rn > 1
          )
        `;
        try {
          const dupResult = await pool.query(duplicateQuery);
        } catch (err) {
        }
      }

      if (deleteWhere.length > 0) {
        const deleteQuery = `DELETE FROM metadata.logs WHERE ${deleteWhere.join(" AND ")}`;
        try {
          const deleteResult = await pool.query(deleteQuery, deleteParams);
        } catch (err) {
        }
      }
    }

    const lines = validateLimit(req.query.lines, 1, 1000);
    
    // Support both single 'level' and multiple 'levels' parameter
    const levelParam = req.query.levels || req.query.level;
    const distinctMessages = req.query.distinct === "true" || req.query.distinct === true;
    
    // Parse levels: support array, comma-separated string, or single value
    let levels = [];
    if (levelParam) {
      if (Array.isArray(levelParam)) {
        levels = levelParam.filter(l => l && l !== "ALL");
      } else if (typeof levelParam === "string") {
        if (levelParam !== "ALL") {
          levels = levelParam.split(",").map(l => l.trim()).filter(l => l && l !== "ALL");
        }
      }
    }
    
    // Validate levels
    const validLevels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];
    levels = levels.filter(l => validLevels.includes(l.toUpperCase()));
    
    const category = validateEnum(
      req.query.category,
      [
        "ALL",
        "SYSTEM",
        "DATABASE",
        "TRANSFER",
        "CUSTOM_JOB",
        "API",
        "QUALITY",
        "GOVERNANCE",
      ],
      "ALL"
    );
    const func = sanitizeSearch(req.query.function, 100) || "ALL";
    const search = sanitizeSearch(req.query.search, 200);
    const startDate = sanitizeSearch(req.query.startDate, 50);
    const endDate = sanitizeSearch(req.query.endDate, 50);

    const params = [];
    let where = [];

    // Support multiple levels with IN clause
    if (levels.length > 0) {
      const placeholders = levels.map((_, i) => `$${params.length + i + 1}`).join(',');
      params.push(...levels.map(l => l.toUpperCase()));
      where.push(`level IN (${placeholders})`);
    }
    
    if (category && category !== "ALL") {
      params.push(category);
      where.push(`category = $${params.length}`);
    }
    
    if (func && func !== "ALL") {
      params.push(func);
      where.push(`function = $${params.length}`);
    }
    
    if (search && search.trim() !== "") {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      where.push(
        `(message ILIKE $${params.length - 1} OR function ILIKE $${
          params.length
        })`
      );
    }
    
    if (startDate) {
      params.push(startDate);
      where.push(`ts >= $${params.length}`);
    }
    
    if (endDate) {
      params.push(endDate);
      where.push(`ts <= $${params.length}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limit = lines;

    // Build query with optional DISTINCT ON for unique messages
    let query;
    if (distinctMessages) {
      // Use DISTINCT ON to get most recent entry per unique message
      // DISTINCT ON requires message to be first in ORDER BY
      query = `
        SELECT DISTINCT ON (message) ts, level, category, function, message
        FROM metadata.logs
        ${whereClause}
        ORDER BY message, ts DESC
        LIMIT $${params.length + 1}
      `;
    } else {
      // Standard query ordered by timestamp
      query = `
        SELECT ts, level, category, function, message
        FROM metadata.logs
        ${whereClause}
        ORDER BY ts DESC
        LIMIT $${params.length + 1}
      `;
    }
    
    const result = await pool.query(query, [...params, limit]);
    
    // If using DISTINCT ON, reorder results by timestamp DESC to show most recent first
    let sortedRows = result.rows;
    if (distinctMessages) {
      sortedRows = result.rows.sort((a, b) => {
        const tsA = a.ts ? new Date(a.ts).getTime() : 0;
        const tsB = b.ts ? new Date(b.ts).getTime() : 0;
        return tsB - tsA; // Most recent first
      });
    }

    const logs = sortedRows.map((r) => {
      const tsIso = r.ts ? new Date(r.ts).toISOString() : null;
      const lvl = (r.level || "").toUpperCase();
      const cat = (r.category || "").toUpperCase();
      return {
        timestamp: tsIso,
        level: lvl,
        category: cat,
        function: r.function || "",
        message: r.message || "",
        raw: `[${tsIso ?? ""}] [${lvl}] [${cat}] [${r.function || ""}] ${
          r.message || ""
        }`,
        parsed: true,
      };
    });

    res.json({
      logs,
      totalLines: logs.length,
      filePath: "metadata.logs",
      lastModified: new Date().toISOString(),
      filters: { level: levels.length > 0 ? levels.join(',') : 'ALL', category, function: func, search, startDate, endDate },
    });
  } catch (err) {
    console.error("Error reading logs from DB:", err);
    const safeError = sanitizeError(
      err,
      "Error al leer logs",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Endpoint para obtener logs de errores desde DB (niveles WARNING/ERROR/CRITICAL)
router.get("/errors", async (req, res) => {
  try {
    const lines = validateLimit(req.query.lines, 1, 1000);
    const category = validateEnum(
      req.query.category,
      [
        "ALL",
        "SYSTEM",
        "DATABASE",
        "TRANSFER",
        "CUSTOM_JOB",
        "API",
        "QUALITY",
        "GOVERNANCE",
      ],
      "ALL"
    );
    const search = sanitizeSearch(req.query.search, 200);
    const startDate = sanitizeSearch(req.query.startDate, 50);
    const endDate = sanitizeSearch(req.query.endDate, 50);
    const params = [];
    let where = ["level IN ('WARNING','ERROR','CRITICAL')"];
    if (category && category !== "ALL") {
      params.push(category);
      where.push(`category = $${params.length}`);
    }
    if (search && search.trim() !== "") {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      where.push(
        `(message ILIKE $${params.length - 1} OR function ILIKE $${
          params.length
        })`
      );
    }
    if (startDate) {
      params.push(startDate);
      where.push(`ts >= $${params.length}`);
    }
    if (endDate) {
      params.push(endDate);
      where.push(`ts <= $${params.length}`);
    }
    const whereClause = `WHERE ${where.join(" AND ")}`;
    const limit = lines;
    const q = `SELECT ts, level, category, function, message FROM metadata.logs ${whereClause} ORDER BY ts DESC LIMIT $${
      params.length + 1
    }`;
    const result = await pool.query(q, [...params, limit]);
    const logs = result.rows.map((r) => ({
      timestamp: r.ts,
      level: r.level,
      category: r.category,
      function: r.function,
      message: r.message,
      raw: `[${r.ts}] [${r.level}] [${r.category}] [${r.function}] ${r.message}`,
      parsed: true,
    }));
    res.json({
      logs,
      totalLines: logs.length,
      filePath: "metadata.logs",
      lastModified: new Date().toISOString(),
      filters: { category, search, startDate, endDate },
    });
  } catch (err) {
    console.error("Error reading error logs from DB:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error al leer logs de errores",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

// Información de logs desde DB
router.get("/info", async (req, res) => {
  try {
    const countRes = await pool.query(
      "SELECT COUNT(*) AS total FROM metadata.logs"
    );
    const lastRes = await pool.query(
      "SELECT MAX(ts) AS last_modified FROM metadata.logs"
    );
    res.json({
      exists: true,
      filePath: "metadata.logs",
      size: null,
      totalLines: parseInt(countRes.rows[0]?.total || 0),
      lastModified: lastRes.rows[0]?.last_modified || null,
      created: null,
    });
  } catch (err) {
    console.error("Error getting DB log info:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener información de logs",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/errors/info", async (req, res) => {
  try {
    const countRes = await pool.query(
      "SELECT COUNT(*) AS total FROM metadata.logs WHERE level IN ('WARNING','ERROR','CRITICAL')"
    );
    const lastRes = await pool.query(
      "SELECT MAX(ts) AS last_modified FROM metadata.logs WHERE level IN ('WARNING','ERROR','CRITICAL')"
    );
    res.json({
      exists: true,
      filePath: "metadata.logs",
      size: null,
      totalLines: parseInt(countRes.rows[0]?.total || 0),
      lastModified: lastRes.rows[0]?.last_modified || null,
      created: null,
    });
  } catch (err) {
    console.error("Error getting DB error log info:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener información de logs de errores",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Endpoints de filtros para logs desde DB
router.get("/levels", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT level FROM metadata.logs ORDER BY level"
    );
    res.json(result.rows.map((r) => r.level));
  } catch (err) {
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error al obtener niveles",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.get("/categories", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT category FROM metadata.logs ORDER BY category"
    );
    res.json(result.rows.map((r) => r.category));
  } catch (err) {
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error al obtener categorías",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.get("/functions", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT function FROM metadata.logs ORDER BY function"
    );
    res.json(result.rows.map((r) => r.function));
  } catch (err) {
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error al obtener funciones",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

// Chart data from metadata.logs: time series by category, counts by level/category/function
// period: 1h | 7h | 24h | 7d. levels: optional filter (comma or array).
router.get("/chart-data", async (req, res) => {
  try {
    const periodParam = req.query.period;
    const periodMap = {
      "1h": { interval: "1 hour", bucket: "5min", numBuckets: 12 },
      "7h": { interval: "7 hours", bucket: "hour", numBuckets: 7 },
      "24h": { interval: "24 hours", bucket: "hour", numBuckets: 24 },
      "7d": { interval: "7 days", bucket: "day", numBuckets: 7 },
    };
    const periodConfig = periodMap[periodParam] || periodMap["24h"];
    const period = periodConfig.interval;
    const bucket = periodConfig.bucket;
    const numBuckets = periodConfig.numBuckets;

    const validLevels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];
    let levelFilter = [];
    const levelParam = req.query.levels || req.query.level;
    if (levelParam) {
      const arr = Array.isArray(levelParam)
        ? levelParam
        : String(levelParam).split(",").map((l) => l.trim()).filter(Boolean);
      levelFilter = arr.map((l) => l.toUpperCase()).filter((l) => validLevels.includes(l));
    }
    const levelWhere =
      levelFilter.length > 0
        ? ` AND level IN (${levelFilter.map((_, i) => `$${i + 2}`).join(",")})`
        : "";
    const levelParams = levelFilter.length > 0 ? levelFilter : [];

    const bucketExpr =
      bucket === "day"
        ? "date_trunc('day', ts)"
        : bucket === "hour"
          ? "date_trunc('hour', ts)"
          : "to_timestamp(floor(extract(epoch from ts) / 300) * 300)::timestamptz";

    const timeSeriesByCategoryResult = await pool.query(
      `SELECT ${bucketExpr} AS bucket,
              UPPER(COALESCE(NULLIF(TRIM(category), ''), 'SYSTEM')) AS category,
              COUNT(*)::int AS cnt
       FROM metadata.logs
       WHERE ts >= NOW() - $1::interval${levelWhere}
       GROUP BY 1, 2
       ORDER BY 1`,
      [period, ...levelParams]
    );

    const baseWhere = levelFilter.length > 0 ? `WHERE level IN (${levelFilter.map((_, i) => `$${i + 1}`).join(",")})` : "";
    const byLevelResult = await pool.query(
      levelFilter.length > 0
        ? `SELECT UPPER(TRIM(level)) AS level, COUNT(*) AS cnt FROM metadata.logs ${baseWhere} GROUP BY UPPER(TRIM(level))`
        : `SELECT UPPER(TRIM(level)) AS level, COUNT(*) AS cnt FROM metadata.logs GROUP BY UPPER(TRIM(level))`,
      levelFilter
    );
    const byCategoryResult = await pool.query(
      levelFilter.length > 0
        ? `SELECT UPPER(COALESCE(NULLIF(TRIM(category), ''), 'SYSTEM')) AS category, COUNT(*) AS cnt
           FROM metadata.logs ${baseWhere} GROUP BY 1 ORDER BY cnt DESC LIMIT 15`
        : `SELECT UPPER(COALESCE(NULLIF(TRIM(category), ''), 'SYSTEM')) AS category, COUNT(*) AS cnt
           FROM metadata.logs GROUP BY 1 ORDER BY cnt DESC LIMIT 15`,
      levelFilter
    );
    const byFunctionResult = await pool.query(
      levelFilter.length > 0
        ? `SELECT COALESCE(NULLIF(TRIM(function), ''), '(empty)') AS name, COUNT(*) AS cnt
           FROM metadata.logs ${baseWhere} GROUP BY 1 ORDER BY cnt DESC LIMIT 10`
        : `SELECT COALESCE(NULLIF(TRIM(function), ''), '(empty)') AS name, COUNT(*) AS cnt
           FROM metadata.logs GROUP BY 1 ORDER BY cnt DESC LIMIT 10`,
      levelFilter
    );

    const categoryNames = byCategoryResult.rows.map((r) => (r.category || "SYSTEM").toUpperCase());

    const categoryBucketMap = new Map();
    for (const row of timeSeriesByCategoryResult.rows) {
      const raw = row.bucket;
      const key = raw ? new Date(raw).toISOString().replace(/\.\d{3}Z$/, "Z") : "";
      if (!key) continue;
      if (!categoryBucketMap.has(key)) {
        const obj = { bucket: key };
        categoryNames.forEach((c) => (obj[c] = 0));
        categoryBucketMap.set(key, obj);
      }
      const cat = (row.category || "SYSTEM").toUpperCase();
      if (categoryNames.includes(cat)) categoryBucketMap.get(key)[cat] = parseInt(row.cnt, 10) || 0;
    }

    const timeSeries = [];
    const now = new Date();
    for (let i = numBuckets - 1; i >= 0; i--) {
      let d;
      if (bucket === "day") {
        d = new Date(now);
        d.setUTCDate(d.getUTCDate() - i);
        d.setUTCHours(0, 0, 0, 0);
      } else if (bucket === "hour") {
        d = new Date(now);
        d.setUTCHours(d.getUTCHours() - i, 0, 0, 0);
      } else {
        const base = new Date(now);
        base.setUTCMinutes(Math.floor(base.getUTCMinutes() / 5) * 5, 0, 0);
        d = new Date(base.getTime() - (numBuckets - 1 - i) * 5 * 60 * 1000);
      }
      const key = d.toISOString().replace(/\.\d{3}Z$/, "Z");
      const obj = categoryBucketMap.get(key) || { bucket: key };
      categoryNames.forEach((c) => {
        if (obj[c] === undefined) obj[c] = 0;
      });
      timeSeries.push(obj);
    }

    const byLevel = {};
    validLevels.forEach((l) => (byLevel[l] = 0));
    for (const row of byLevelResult.rows) {
      const up = (row.level || "").toUpperCase().trim();
      if (validLevels.includes(up)) byLevel[up] = parseInt(row.cnt, 10) || 0;
    }

    const byCategory = byCategoryResult.rows.map((r) => ({
      category: (r.category || "SYSTEM").toUpperCase(),
      count: parseInt(r.cnt, 10) || 0,
    }));
    const byFunction = byFunctionResult.rows.map((r) => ({
      name: r.name || "(empty)",
      count: parseInt(r.cnt, 10) || 0,
    }));

    res.json({
      timeSeries,
      categoryNames,
      byLevel,
      byCategory,
      byFunction,
      period,
      bucket,
    });
  } catch (err) {
    console.error("Error getting log chart data:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener datos para gráficos de logs",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Endpoint para obtener estadísticas de logs
router.get("/stats", async (req, res) => {
  try {
    const logFilePath1 = path.join(process.cwd(), "..", "..", "DataSync.log");
    const logFilePath2 = path.join(process.cwd(), "..", "DataSync.log");
    const logFilePath = fs.existsSync(logFilePath1)
      ? logFilePath1
      : logFilePath2;

    if (!fs.existsSync(logFilePath)) {
      return res.json({
        stats: {},
        message: "Log file not found",
      });
    }

    const logContent = fs.readFileSync(logFilePath, "utf8");
    const allLines = logContent
      .split("\n")
      .filter((line) => line.trim() !== "");

    // Parsear logs para estadísticas
    const parsedLogs = allLines.map((line) => {
      const newMatch = line.match(
        /^\[([^\]]+)\] \[([^\]]+)\] \[([^\]]+)\] \[([^\]]+)\] (.+)$/
      );
      if (newMatch) {
        return {
          level: newMatch[2],
          category: newMatch[3],
          function: newMatch[4],
          timestamp: newMatch[1],
        };
      }
      const oldMatch = line.match(
        /^\[([^\]]+)\] \[([^\]]+)\](?: \[([^\]]+)\])? (.+)$/
      );
      if (oldMatch) {
        return {
          level: oldMatch[2],
          category: "SYSTEM",
          function: oldMatch[3] || "",
          timestamp: oldMatch[1],
        };
      }
      return {
        level: "UNKNOWN",
        category: "UNKNOWN",
        function: "",
        timestamp: "",
      };
    });

    // Calcular estadísticas
    const stats = {
      total: parsedLogs.length,
      byLevel: {},
      byCategory: {},
      byFunction: {},
      recent: parsedLogs.slice(-10).map((log) => ({
        timestamp: log.timestamp,
        level: log.level,
        category: log.category,
        function: log.function,
      })),
    };

    // Contar por nivel
    parsedLogs.forEach((log) => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
    });

    // Contar por categoría
    parsedLogs.forEach((log) => {
      stats.byCategory[log.category] =
        (stats.byCategory[log.category] || 0) + 1;
    });

    // Contar por función (top 10)
    parsedLogs.forEach((log) => {
      if (log.function) {
        stats.byFunction[log.function] =
          (stats.byFunction[log.function] || 0) + 1;
      }
    });

    // Convertir a array y ordenar
    stats.byFunction = Object.entries(stats.byFunction)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});

    res.json({
      stats,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error getting log stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de logs",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Endpoint para limpiar logs
router.delete("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const daysToKeep = parseInt(req.query.daysToKeep) || 30;
    const deleteAll = req.query.deleteAll === "true";

    let result;
    if (deleteAll) {
      await pool.query("TRUNCATE TABLE metadata.logs");
      result = { deleted: "all", message: "All logs deleted" };
    } else {
      const deleteResult = await pool.query(
        `DELETE FROM metadata.logs WHERE ts < NOW() - INTERVAL '${daysToKeep} days'`
      );
      result = {
        deleted: deleteResult.rowCount,
        message: `Logs older than ${daysToKeep} days deleted`,
        daysToKeep,
      };
    }

    res.json({
      success: true,
      ...result,
      clearedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error cleaning logs:", err);
    const safeError = sanitizeError(
      err,
      "Error al limpiar logs",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.post("/rotate", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const daysToKeep = parseInt(req.body.daysToKeep) || 30;
    const minLevel = req.body.minLevel || "INFO";

    const deleteResult = await pool.query(
      `DELETE FROM metadata.logs 
       WHERE ts < NOW() - INTERVAL '${daysToKeep} days' 
       OR (level = 'DEBUG' AND ts < NOW() - INTERVAL '7 days')
       OR (level = 'INFO' AND category = 'SYSTEM' AND ts < NOW() - INTERVAL '14 days')`
    );

    res.json({
      success: true,
      deleted: deleteResult.rowCount,
      message: `Log rotation completed. Deleted ${deleteResult.rowCount} old log entries.`,
      rotatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error rotating logs:", err);
    const safeError = sanitizeError(
      err,
      "Error al rotar logs",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

export default router;
