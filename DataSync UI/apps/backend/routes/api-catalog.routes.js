import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { validatePage, validateLimit, validateEnum, validateBoolean, validateIdentifier, sanitizeSearch } from "../server-utils/validation.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const api_type = validateEnum(
      req.query.api_type,
      ["REST", "GraphQL", "SOAP", ""],
      ""
    );
    const target_db_engine = validateEnum(
      req.query.target_db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", ""],
      ""
    );
    const status = validateEnum(
      req.query.status,
      ["SUCCESS", "ERROR", "IN_PROGRESS", "PENDING", ""],
      ""
    );
    const active = req.query.active !== undefined 
      ? validateBoolean(req.query.active) 
      : undefined;
    const search = sanitizeSearch(req.query.search, 100);

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (api_type) {
      paramCount++;
      whereConditions.push(`api_type = $${paramCount}`);
      queryParams.push(api_type);
    }

    if (target_db_engine) {
      paramCount++;
      whereConditions.push(`target_db_engine = $${paramCount}`);
      queryParams.push(target_db_engine);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(status);
    }

    if (active !== undefined) {
      paramCount++;
      whereConditions.push(`active = $${paramCount}`);
      queryParams.push(active);
    }

    if (search) {
      paramCount++;
      whereConditions.push(
        `(api_name ILIKE $${paramCount} OR endpoint ILIKE $${paramCount} OR target_schema ILIKE $${paramCount} OR target_table ILIKE $${paramCount})`
      );
      queryParams.push(`%${search}%`);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.api_catalog ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    const dataQuery = `SELECT * FROM metadata.api_catalog ${whereClause}
      ORDER BY 
        CASE status
          WHEN 'SUCCESS' THEN 1
          WHEN 'IN_PROGRESS' THEN 2
          WHEN 'ERROR' THEN 3
          WHEN 'PENDING' THEN 4
          ELSE 5
        END,
        active DESC,
        api_name
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await pool.query(dataQuery, queryParams);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    console.error("Error getting API catalog:", err);
    res.status(500).json({
      error: "Error al obtener catálogo de APIs",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.patch("/active", async (req, res) => {
  const { api_name, active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE metadata.api_catalog 
       SET active = $1, updated_at = NOW()
       WHERE api_name = $2
       RETURNING *`,
      [active, api_name]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "API not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating API active status:", err);
    res.status(500).json({
      error: "Error al actualizar estado de API",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});
router.post("/api-catalog",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    const {
      api_name,
      api_type,
      base_url,
      endpoint,
      http_method,
      auth_type,
      auth_config,
      target_db_engine,
      target_connection_string,
      target_schema,
      target_table,
      request_body,
      request_headers,
      query_params,
      sync_interval,
      status,
      active,
    } = req.body;

    if (
      !api_name ||
      !api_type ||
      !base_url ||
      !endpoint ||
      !http_method ||
      !auth_type ||
      !target_db_engine ||
      !target_connection_string ||
      !target_schema ||
      !target_table
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: api_name, api_type, base_url, endpoint, http_method, auth_type, target_db_engine, target_connection_string, target_schema, target_table",
      });
    }

    const validApiType = validateEnum(
      api_type,
      ["REST", "GraphQL", "SOAP"],
      null
    );
    if (!validApiType) {
      return res.status(400).json({ error: "Invalid api_type" });
    }

    const validHttpMethod = validateEnum(
      http_method,
      ["GET", "POST", "PUT", "PATCH", "DELETE"],
      null
    );
    if (!validHttpMethod) {
      return res.status(400).json({ error: "Invalid http_method" });
    }

    const validAuthType = validateEnum(
      auth_type,
      ["NONE", "BASIC", "BEARER", "API_KEY", "OAUTH2"],
      null
    );
    if (!validAuthType) {
      return res.status(400).json({ error: "Invalid auth_type" });
    }

    const validTargetEngine = validateEnum(
      target_db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
      null
    );
    if (!validTargetEngine) {
      return res.status(400).json({ error: "Invalid target_db_engine" });
    }

    const validStatus = validateEnum(
      status || "PENDING",
      ["SUCCESS", "ERROR", "IN_PROGRESS", "PENDING"],
      "PENDING"
    );

    const interval =
      sync_interval && sync_interval > 0 ? parseInt(sync_interval) : 3600;
    const isActive =
      active !== undefined ? validateBoolean(active, true) : true;

    try {
      const checkResult = await pool.query(
        `SELECT api_name FROM metadata.api_catalog WHERE LOWER(api_name) = LOWER($1)`,
        [api_name]
      );

      if (checkResult.rows.length > 0) {
        return res.status(409).json({
          error: "API with this name already exists",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.api_catalog 
       (api_name, api_type, base_url, endpoint, http_method, auth_type, auth_config,
        target_db_engine, target_connection_string, target_schema, target_table,
        request_body, request_headers, query_params, status, active, sync_interval)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15, $16, $17)
       RETURNING *`,
        [
          api_name,
          api_type,
          base_url,
          endpoint,
          http_method,
          auth_type,
          JSON.stringify(auth_config || {}),
          target_db_engine,
          target_connection_string,
          target_schema.toLowerCase(),
          target_table.toLowerCase(),
          request_body || null,
          JSON.stringify(request_headers || {}),
          JSON.stringify(query_params || {}),
          validStatus,
          isActive,
          interval,
        ]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error creating API entry",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);
router.put("/api-catalog",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    const {
      api_name,
      api_type,
      base_url,
      endpoint,
      http_method,
      auth_type,
      auth_config,
      target_db_engine,
      target_connection_string,
      target_schema,
      target_table,
      request_body,
      request_headers,
      query_params,
      sync_interval,
      status,
      active,
    } = req.body;

    if (!api_name) {
      return res.status(400).json({
        error: "api_name is required",
      });
    }

    const validApiType = api_type ? validateEnum(
      api_type,
      ["REST", "GraphQL", "SOAP"],
      null
    ) : null;
    if (api_type && !validApiType) {
      return res.status(400).json({ error: "Invalid api_type" });
    }

    const validHttpMethod = http_method ? validateEnum(
      http_method,
      ["GET", "POST", "PUT", "PATCH", "DELETE"],
      null
    ) : null;
    if (http_method && !validHttpMethod) {
      return res.status(400).json({ error: "Invalid http_method" });
    }

    const validAuthType = auth_type ? validateEnum(
      auth_type,
      ["NONE", "BASIC", "BEARER", "API_KEY", "OAUTH2"],
      null
    ) : null;
    if (auth_type && !validAuthType) {
      return res.status(400).json({ error: "Invalid auth_type" });
    }

    const validTargetEngine = target_db_engine ? validateEnum(
      target_db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
      null
    ) : null;
    if (target_db_engine && !validTargetEngine) {
      return res.status(400).json({ error: "Invalid target_db_engine" });
    }

    const validStatus = status ? validateEnum(
      status,
      ["SUCCESS", "ERROR", "IN_PROGRESS", "PENDING"],
      null
    ) : null;
    if (status && !validStatus) {
      return res.status(400).json({ error: "Invalid status" });
    }

    try {
      const checkResult = await pool.query(
        `SELECT api_name FROM metadata.api_catalog WHERE api_name = $1`,
        [api_name]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          error: "API not found",
        });
      }

      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (api_type !== undefined) {
        updateFields.push(`api_type = $${paramCount++}`);
        updateValues.push(api_type);
      }
      if (base_url !== undefined) {
        updateFields.push(`base_url = $${paramCount++}`);
        updateValues.push(base_url);
      }
      if (endpoint !== undefined) {
        updateFields.push(`endpoint = $${paramCount++}`);
        updateValues.push(endpoint);
      }
      if (http_method !== undefined) {
        updateFields.push(`http_method = $${paramCount++}`);
        updateValues.push(http_method);
      }
      if (auth_type !== undefined) {
        updateFields.push(`auth_type = $${paramCount++}`);
        updateValues.push(auth_type);
      }
      if (auth_config !== undefined) {
        updateFields.push(`auth_config = $${paramCount++}::jsonb`);
        updateValues.push(JSON.stringify(auth_config || {}));
      }
      if (target_db_engine !== undefined) {
        updateFields.push(`target_db_engine = $${paramCount++}`);
        updateValues.push(target_db_engine);
      }
      if (target_connection_string !== undefined) {
        updateFields.push(`target_connection_string = $${paramCount++}`);
        updateValues.push(target_connection_string);
      }
      if (target_schema !== undefined) {
        updateFields.push(`target_schema = $${paramCount++}`);
        updateValues.push(target_schema.toLowerCase());
      }
      if (target_table !== undefined) {
        updateFields.push(`target_table = $${paramCount++}`);
        updateValues.push(target_table.toLowerCase());
      }
      if (request_body !== undefined) {
        updateFields.push(`request_body = $${paramCount++}`);
        updateValues.push(request_body || null);
      }
      if (request_headers !== undefined) {
        updateFields.push(`request_headers = $${paramCount++}::jsonb`);
        updateValues.push(JSON.stringify(request_headers || {}));
      }
      if (query_params !== undefined) {
        updateFields.push(`query_params = $${paramCount++}::jsonb`);
        updateValues.push(JSON.stringify(query_params || {}));
      }
      if (sync_interval !== undefined) {
        const interval = sync_interval && sync_interval > 0 ? parseInt(sync_interval) : 3600;
        updateFields.push(`sync_interval = $${paramCount++}`);
        updateValues.push(interval);
      }
      if (status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        updateValues.push(validStatus);
      }
      if (active !== undefined) {
        const isActive = validateBoolean(active, true);
        updateFields.push(`active = $${paramCount++}`);
        updateValues.push(isActive);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(api_name);

      const updateQuery = `
        UPDATE metadata.api_catalog 
        SET ${updateFields.join(", ")}
        WHERE api_name = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(updateQuery, updateValues);

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error updating API entry",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);
router.delete("/api-catalog/:api_name",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    const { api_name } = req.params;

    if (!api_name) {
      return res.status(400).json({
        error: "api_name is required",
      });
    }

    try {
      const checkResult = await pool.query(
        `SELECT api_name FROM metadata.api_catalog WHERE api_name = $1`,
        [api_name]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          error: "API not found",
        });
      }

      await pool.query(
        `DELETE FROM metadata.api_catalog WHERE api_name = $1`,
        [api_name]
      );

      res.json({ message: "API deleted successfully" });
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error deleting API entry",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);


router.post("/",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    const {
      api_name,
      api_type,
      base_url,
      endpoint,
      http_method,
      auth_type,
      auth_config,
      target_db_engine,
      target_connection_string,
      target_schema,
      target_table,
      request_body,
      request_headers,
      query_params,
      sync_interval,
      status,
      active,
    } = req.body;

    if (
      !api_name ||
      !api_type ||
      !base_url ||
      !endpoint ||
      !http_method ||
      !auth_type ||
      !target_db_engine ||
      !target_connection_string ||
      !target_schema ||
      !target_table
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: api_name, api_type, base_url, endpoint, http_method, auth_type, target_db_engine, target_connection_string, target_schema, target_table",
      });
    }

    const validApiType = validateEnum(
      api_type,
      ["REST", "GraphQL", "SOAP"],
      null
    );
    if (!validApiType) {
      return res.status(400).json({ error: "Invalid api_type" });
    }

    const validHttpMethod = validateEnum(
      http_method,
      ["GET", "POST", "PUT", "PATCH", "DELETE"],
      null
    );
    if (!validHttpMethod) {
      return res.status(400).json({ error: "Invalid http_method" });
    }

    const validAuthType = validateEnum(
      auth_type,
      ["NONE", "BASIC", "BEARER", "API_KEY", "OAUTH2"],
      null
    );
    if (!validAuthType) {
      return res.status(400).json({ error: "Invalid auth_type" });
    }

    const validTargetEngine = validateEnum(
      target_db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
      null
    );
    if (!validTargetEngine) {
      return res.status(400).json({ error: "Invalid target_db_engine" });
    }

    const validStatus = validateEnum(
      status || "PENDING",
      ["SUCCESS", "ERROR", "IN_PROGRESS", "PENDING"],
      "PENDING"
    );

    const interval =
      sync_interval && sync_interval > 0 ? parseInt(sync_interval) : 3600;
    const isActive =
      active !== undefined ? validateBoolean(active, true) : true;

    try {
      const checkResult = await pool.query(
        `SELECT api_name FROM metadata.api_catalog WHERE LOWER(api_name) = LOWER($1)`,
        [api_name]
      );

      if (checkResult.rows.length > 0) {
        return res.status(409).json({
          error: "API with this name already exists",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.api_catalog 
       (api_name, api_type, base_url, endpoint, http_method, auth_type, auth_config,
        target_db_engine, target_connection_string, target_schema, target_table,
        request_body, request_headers, query_params, status, active, sync_interval)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15, $16, $17)
       RETURNING *`,
        [
          api_name,
          api_type,
          base_url,
          endpoint,
          http_method,
          auth_type,
          JSON.stringify(auth_config || {}),
          target_db_engine,
          target_connection_string,
          target_schema.toLowerCase(),
          target_table.toLowerCase(),
          request_body || null,
          JSON.stringify(request_headers || {}),
          JSON.stringify(query_params || {}),
          validStatus,
          isActive,
          interval,
        ]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error creating API entry",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.put("/",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    const {
      api_name,
      api_type,
      base_url,
      endpoint,
      http_method,
      auth_type,
      auth_config,
      target_db_engine,
      target_connection_string,
      target_schema,
      target_table,
      request_body,
      request_headers,
      query_params,
      sync_interval,
      status,
      active,
    } = req.body;

    if (!api_name) {
      return res.status(400).json({
        error: "api_name is required",
      });
    }

    const validApiType = api_type ? validateEnum(
      api_type,
      ["REST", "GraphQL", "SOAP"],
      null
    ) : null;
    if (api_type && !validApiType) {
      return res.status(400).json({ error: "Invalid api_type" });
    }

    const validHttpMethod = http_method ? validateEnum(
      http_method,
      ["GET", "POST", "PUT", "PATCH", "DELETE"],
      null
    ) : null;
    if (http_method && !validHttpMethod) {
      return res.status(400).json({ error: "Invalid http_method" });
    }

    const validAuthType = auth_type ? validateEnum(
      auth_type,
      ["NONE", "BASIC", "BEARER", "API_KEY", "OAUTH2"],
      null
    ) : null;
    if (auth_type && !validAuthType) {
      return res.status(400).json({ error: "Invalid auth_type" });
    }

    const validTargetEngine = target_db_engine ? validateEnum(
      target_db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
      null
    ) : null;
    if (target_db_engine && !validTargetEngine) {
      return res.status(400).json({ error: "Invalid target_db_engine" });
    }

    const validStatus = status ? validateEnum(
      status,
      ["SUCCESS", "ERROR", "IN_PROGRESS", "PENDING"],
      null
    ) : null;
    if (status && !validStatus) {
      return res.status(400).json({ error: "Invalid status" });
    }

    try {
      const checkResult = await pool.query(
        `SELECT api_name FROM metadata.api_catalog WHERE api_name = $1`,
        [api_name]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          error: "API not found",
        });
      }

      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (api_type !== undefined) {
        updateFields.push(`api_type = $${paramCount++}`);
        updateValues.push(api_type);
      }
      if (base_url !== undefined) {
        updateFields.push(`base_url = $${paramCount++}`);
        updateValues.push(base_url);
      }
      if (endpoint !== undefined) {
        updateFields.push(`endpoint = $${paramCount++}`);
        updateValues.push(endpoint);
      }
      if (http_method !== undefined) {
        updateFields.push(`http_method = $${paramCount++}`);
        updateValues.push(http_method);
      }
      if (auth_type !== undefined) {
        updateFields.push(`auth_type = $${paramCount++}`);
        updateValues.push(auth_type);
      }
      if (auth_config !== undefined) {
        updateFields.push(`auth_config = $${paramCount++}::jsonb`);
        updateValues.push(JSON.stringify(auth_config || {}));
      }
      if (target_db_engine !== undefined) {
        updateFields.push(`target_db_engine = $${paramCount++}`);
        updateValues.push(target_db_engine);
      }
      if (target_connection_string !== undefined) {
        updateFields.push(`target_connection_string = $${paramCount++}`);
        updateValues.push(target_connection_string);
      }
      if (target_schema !== undefined) {
        updateFields.push(`target_schema = $${paramCount++}`);
        updateValues.push(target_schema.toLowerCase());
      }
      if (target_table !== undefined) {
        updateFields.push(`target_table = $${paramCount++}`);
        updateValues.push(target_table.toLowerCase());
      }
      if (request_body !== undefined) {
        updateFields.push(`request_body = $${paramCount++}`);
        updateValues.push(request_body || null);
      }
      if (request_headers !== undefined) {
        updateFields.push(`request_headers = $${paramCount++}::jsonb`);
        updateValues.push(JSON.stringify(request_headers || {}));
      }
      if (query_params !== undefined) {
        updateFields.push(`query_params = $${paramCount++}::jsonb`);
        updateValues.push(JSON.stringify(query_params || {}));
      }
      if (sync_interval !== undefined) {
        const interval = sync_interval && sync_interval > 0 ? parseInt(sync_interval) : 3600;
        updateFields.push(`sync_interval = $${paramCount++}`);
        updateValues.push(interval);
      }
      if (status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        updateValues.push(validStatus);
      }
      if (active !== undefined) {
        const isActive = validateBoolean(active, true);
        updateFields.push(`active = $${paramCount++}`);
        updateValues.push(isActive);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(api_name);

      const updateQuery = `
        UPDATE metadata.api_catalog 
        SET ${updateFields.join(", ")}
        WHERE api_name = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(updateQuery, updateValues);

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error updating API entry",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.delete("/:api_name",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    const { api_name } = req.params;

    if (!api_name) {
      return res.status(400).json({
        error: "api_name is required",
      });
    }

    try {
      const checkResult = await pool.query(
        `SELECT api_name FROM metadata.api_catalog WHERE api_name = $1`,
        [api_name]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          error: "API not found",
        });
      }

      await pool.query(
        `DELETE FROM metadata.api_catalog WHERE api_name = $1`,
        [api_name]
      );

      res.json({ message: "API deleted successfully" });
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error deleting API entry",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.get("/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_apis,
        COUNT(*) FILTER (WHERE active = true) as active_apis,
        COUNT(*) FILTER (WHERE status = 'SUCCESS') as success_apis,
        COUNT(*) FILTER (WHERE status = 'ERROR') as error_apis,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress_apis,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_apis,
        COUNT(DISTINCT api_type) as api_types_count,
        COUNT(DISTINCT target_db_engine) as target_engines_count
      FROM metadata.api_catalog
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error getting API catalog metrics:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.get("/:apiName/history", async (req, res) => {
  try {
    const apiName = validateIdentifier(req.params.apiName);
    if (!apiName) {
      return res.status(400).json({ error: "Invalid apiName" });
    }
    const limit = validateLimit(req.query.limit, 1, 100, 50);

    const result = await pool.query(
      `SELECT 
        id,
        process_type,
        process_name,
        status,
        start_time,
        end_time,
        COALESCE(duration_seconds, EXTRACT(EPOCH FROM (end_time - start_time))::integer) as duration_seconds,
        total_rows_processed,
        error_message,
        metadata,
        created_at
       FROM metadata.process_log 
       WHERE process_type = 'API_SYNC' AND LOWER(process_name) = LOWER($1) 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [apiName, limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching API history:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener historial de la API",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/:apiName/table-structure", async (req, res) => {
  try {
    const apiName = validateIdentifier(req.params.apiName);
    if (!apiName) {
      return res.status(400).json({ error: "Invalid apiName" });
    }

    const apiResult = await pool.query(
      `SELECT target_db_engine, target_connection_string, target_schema, target_table 
       FROM metadata.api_catalog 
       WHERE LOWER(api_name) = LOWER($1)`,
      [apiName]
    );

    if (apiResult.rows.length === 0) {
      return res.status(404).json({ error: "API not found" });
    }

    const api = apiResult.rows[0];
    const {
      target_db_engine,
      target_connection_string,
      target_schema,
      target_table,
    } = api;

    if (
      !target_db_engine ||
      !target_connection_string ||
      !target_schema ||
      !target_table
    ) {
      return res.status(400).json({
        error:
          "API configuration incomplete. Missing target database information.",
      });
    }

    let columns = [];

    switch (target_db_engine) {
      case "PostgreSQL": {
        const { Pool } = await import("pg");
        let config;

        if (
          target_connection_string.includes("postgresql://") ||
          target_connection_string.includes("postgres://")
        ) {
          config = {
            connectionString: target_connection_string,
            connectionTimeoutMillis: 10000,
          };
        } else {
          const params = {};
          const parts = target_connection_string.split(";");
          for (const part of parts) {
            const [key, value] = part.split("=").map((s) => s.trim());
            if (key && value) {
              switch (key.toLowerCase()) {
                case "host":
                case "hostname":
                  params.host = value;
                  break;
                case "user":
                case "username":
                  params.user = value;
                  break;
                case "password":
                  params.password = value;
                  break;
                case "db":
                case "database":
                  params.database = value;
                  break;
                case "port":
                  params.port = parseInt(value, 10);
                  break;
              }
            }
          }
          config = {
            ...params,
            connectionTimeoutMillis: 10000,
          };
        }

        const tempPool = new Pool(config);
        let client;
        try {
          client = await tempPool.connect();
          console.log(
            `Querying table structure for ${target_schema}.${target_table}`
          );
          const result = await client.query(
            `
            SELECT 
              column_name,
              data_type,
              character_maximum_length,
              is_nullable,
              column_default
            FROM information_schema.columns
            WHERE table_schema = $1 AND table_name = $2
            ORDER BY ordinal_position
          `,
            [target_schema, target_table]
          );
          console.log(`Found ${result.rows.length} columns`);
          columns = result.rows.map((row) => ({
            name: row.column_name,
            type:
              row.data_type +
              (row.character_maximum_length
                ? `(${row.character_maximum_length})`
                : ""),
            nullable: row.is_nullable === "YES",
            default: row.column_default,
          }));
        } catch (pgErr) {
          console.error("PostgreSQL query error:", pgErr);
          console.error("Error details:", {
            message: pgErr.message,
            code: pgErr.code,
            schema: target_schema,
            table: target_table,
          });
          throw new Error(`Failed to query table structure: ${pgErr.message}`);
        } finally {
          if (client) {
            client.release();
          }
          await tempPool.end();
        }
        break;
      }
      case "MariaDB": {
        const mysql = (await import("mysql2/promise")).default;
        const connection = await mysql.createConnection(
          target_connection_string
        );
        const [rows] = await connection.execute(
          `
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH,
            IS_NULLABLE,
            COLUMN_DEFAULT
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION
        `,
          [target_schema, target_table]
        );
        columns = rows.map((row) => ({
          name: row.COLUMN_NAME,
          type:
            row.DATA_TYPE +
            (row.CHARACTER_MAXIMUM_LENGTH
              ? `(${row.CHARACTER_MAXIMUM_LENGTH})`
              : ""),
          nullable: row.IS_NULLABLE === "YES",
          default: row.COLUMN_DEFAULT,
        }));
        await connection.end();
        break;
      }
      case "MSSQL": {
        const sql = (await import("mssql")).default;
        const pool = await sql.connect(target_connection_string);
        const result = await pool
          .request()
          .input("schema", sql.VarChar, target_schema)
          .input("table", sql.VarChar, target_table).query(`
            SELECT 
              COLUMN_NAME,
              DATA_TYPE,
              CHARACTER_MAXIMUM_LENGTH,
              IS_NULLABLE,
              COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
            ORDER BY ORDINAL_POSITION
          `);
        columns = result.recordset.map((row) => ({
          name: row.COLUMN_NAME,
          type:
            row.DATA_TYPE +
            (row.CHARACTER_MAXIMUM_LENGTH
              ? `(${row.CHARACTER_MAXIMUM_LENGTH})`
              : ""),
          nullable: row.IS_NULLABLE === "YES",
          default: row.COLUMN_DEFAULT,
        }));
        await pool.close();
        break;
      }
      case "Oracle": {
        const oracledb = (await import("oracledb")).default;
        const connection = await oracledb.getConnection(
          target_connection_string
        );
        const result = await connection.execute(
          `
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            DATA_LENGTH,
            NULLABLE,
            DATA_DEFAULT
          FROM ALL_TAB_COLUMNS
          WHERE OWNER = :owner AND TABLE_NAME = :table
          ORDER BY COLUMN_ID
        `,
          {
            owner: target_schema.toUpperCase(),
            table: target_table.toUpperCase(),
          }
        );
        columns = result.rows.map((row) => ({
          name: row[0],
          type: row[1] + (row[2] ? `(${row[2]})` : ""),
          nullable: row[3] === "Y",
          default: row[4],
        }));
        await connection.close();
        break;
      }
      case "MongoDB": {
        const { MongoClient } = await import("mongodb");
        const client = new MongoClient(target_connection_string);
        await client.connect();
        const db = client.db();
        const collection = db.collection(target_table);
        const sample = await collection.findOne({});
        if (sample) {
          columns = Object.keys(sample).map((key) => ({
            name: key,
            type:
              typeof sample[key] === "object" ? "object" : typeof sample[key],
            nullable: true,
            default: null,
          }));
        }
        await client.close();
        break;
      }
      default:
        return res
          .status(400)
          .json({ error: `Unsupported database engine: ${target_db_engine}` });
    }

    res.json({
      db_engine: target_db_engine,
      schema: target_schema,
      table: target_table,
      columns: columns,
    });
  } catch (err) {
    console.error("Error fetching table structure:", err);
    console.error("Error stack:", err.stack);
    console.error("Error details:", {
      message: err.message,
      apiName: req.params.apiName,
    });
    const safeError = sanitizeError(
      err,
      `Error al obtener estructura de la tabla: ${err.message}`,
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({
      error: safeError,
      details: process.env.NODE_ENV !== "production" ? err.message : undefined,
    });
  }
});

router.post("/preview", async (req, res) => {
  try {
    const {
      base_url,
      endpoint,
      http_method,
      auth_type,
      auth_config,
      request_headers,
      query_params,
    } = req.body;

    if (!base_url || !endpoint) {
      return res
        .status(400)
        .json({ error: "base_url and endpoint are required" });
    }

    const url = new URL(endpoint, base_url);

    if (query_params) {
      try {
        const params =
          typeof query_params === "string"
            ? JSON.parse(query_params)
            : query_params;
        Object.keys(params).forEach((key) => {
          url.searchParams.append(key, params[key]);
        });
      } catch (err) {
        console.error("Error parsing query_params:", err);
      }
    }

    const headers = {
      Accept: "application/json, */*",
    };

    if (request_headers) {
      try {
        const parsedHeaders =
          typeof request_headers === "string"
            ? JSON.parse(request_headers)
            : request_headers;
        Object.assign(headers, parsedHeaders);
      } catch (err) {
        console.error("Error parsing request_headers:", err);
      }
    }

    if (auth_type === "BEARER" && auth_config) {
      try {
        const auth =
          typeof auth_config === "string"
            ? JSON.parse(auth_config)
            : auth_config;
        if (auth.bearer_token || auth.token) {
          headers["Authorization"] = `Bearer ${
            auth.bearer_token || auth.token
          }`;
        }
      } catch (err) {
        console.error("Error parsing auth_config:", err);
      }
    } else if (auth_type === "BASIC" && auth_config) {
      try {
        const auth =
          typeof auth_config === "string"
            ? JSON.parse(auth_config)
            : auth_config;
        if (auth.username && auth.password) {
          const credentials = Buffer.from(
            `${auth.username}:${auth.password}`
          ).toString("base64");
          headers["Authorization"] = `Basic ${credentials}`;
        }
      } catch (err) {
        console.error("Error parsing auth_config:", err);
      }
    } else if (auth_type === "API_KEY" && auth_config) {
      try {
        const auth =
          typeof auth_config === "string"
            ? JSON.parse(auth_config)
            : auth_config;
        if (auth.api_key && auth.api_key_header) {
          headers[auth.api_key_header] = auth.api_key;
        } else if (auth.api_key) {
          headers["X-API-Key"] = auth.api_key;
        }
      } catch (err) {
        console.error("Error parsing auth_config:", err);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url.toString(), {
        method: http_method || "GET",
        headers: headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(response.status).json({
          error: `API request failed with status ${response.status}`,
          status: response.status,
        });
      }

      const contentType = response.headers.get("content-type") || "";
      let data;
      let sampleData = [];

      if (contentType.includes("application/json")) {
        data = await response.json();

        if (Array.isArray(data)) {
          sampleData = data.slice(0, 10);
        } else if (typeof data === "object" && data !== null) {
          if (data.data && Array.isArray(data.data)) {
            sampleData = data.data.slice(0, 10);
          } else if (data.results && Array.isArray(data.results)) {
            sampleData = data.results.slice(0, 10);
          } else {
            sampleData = [data];
          }
        }
      } else {
        const text = await response.text();
        data = text;
        sampleData = [{ raw_response: text.substring(0, 500) }];
      }

      res.json({
        success: true,
        status: response.status,
        contentType: contentType,
        sampleData: sampleData,
        totalItems: Array.isArray(data)
          ? data.length
          : data.data?.length || data.results?.length || 1,
        fullData: data,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        return res.status(408).json({ error: "Request timeout" });
      }
      throw err;
    }
  } catch (err) {
    console.error("Error previewing API:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error previewing API",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});


export default router;
