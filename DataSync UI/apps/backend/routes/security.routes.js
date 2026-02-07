import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";
import { executeSecurityCommand } from "../services/cppCommands.service.js";

const router = express.Router();

// Helper functions for database security
async function getMariaDBSecurity(connectionString) {
  try {
    const mysql = await import("mysql2/promise");
    const conn = await mysql.default.createConnection(connectionString);
    
    const [users] = await conn.execute(`
      SELECT 
        User as username,
        Host as host,
        CASE 
          WHEN Super_priv = 'Y' THEN 'SUPERUSER'
          WHEN Create_db_priv = 'Y' THEN 'CREATEDB'
          WHEN Create_user_priv = 'Y' THEN 'CREATEROLE'
          WHEN Select_priv = 'Y' THEN 'SELECT'
          ELSE 'OTHER'
        END as role_type,
        CASE 
          WHEN account_locked = 'N' THEN 'ACTIVE'
          ELSE 'INACTIVE'
        END as status
      FROM mysql.user
      LIMIT 50
    `);
    
    const [processList] = await conn.execute(`SHOW PROCESSLIST`);
    
    const [grants] = await conn.execute(`
      SELECT 
        COUNT(*) as total_grants,
        COUNT(DISTINCT table_schema) as schemas_with_access,
        COUNT(DISTINCT table_name) as tables_with_access
      FROM information_schema.table_privileges
      WHERE table_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
    `);
    
    await conn.end();
    
    return {
      users: users || [],
      activeConnections: processList?.length || 0,
      permissions: grants?.[0] || { total_grants: 0, schemas_with_access: 0, tables_with_access: 0 },
    };
  } catch (err) {
    console.error("Error getting MariaDB security:", err);
    return { users: [], activeConnections: 0, permissions: { total_grants: 0, schemas_with_access: 0, tables_with_access: 0 }, error: err.message };
  }
}

async function getMSSQLSecurity(connectionString) {
  try {
    const sql = await import("mssql");
    
    let config = {};
    
    if (connectionString.includes("DRIVER=") || connectionString.includes("SERVER=")) {
      const params = {};
      connectionString.split(";").forEach((part) => {
        const [key, ...valueParts] = part.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").trim();
          const keyUpper = key.trim().toUpperCase();
          if (keyUpper === "SERVER") {
            if (value.includes(",")) {
              const [server, port] = value.split(",").map(s => s.trim());
              params.server = server;
              params.port = parseInt(port) || 1433;
            } else {
              params.server = value;
            }
          } else if (keyUpper === "DATABASE" || keyUpper === "INITIAL CATALOG") {
            params.database = value;
          } else if (keyUpper === "UID" || keyUpper === "USER ID" || keyUpper === "USER") {
            params.user = value;
          } else if (keyUpper === "PWD" || keyUpper === "PASSWORD") {
            params.password = value;
          } else if (keyUpper === "PORT") {
            params.port = parseInt(value);
          } else if (keyUpper === "TRUSTSERVERCERTIFICATE" || keyUpper === "TRUST SERVER CERTIFICATE") {
            params.trustServerCertificate = value.toLowerCase() === "yes" || value === "true";
          } else if (keyUpper === "ENCRYPT") {
            params.encrypt = value.toLowerCase() === "yes" || value === "true";
          }
        }
      });
      
      if (!params.server) {
        throw new Error("SERVER not found in connection string");
      }
      
      config = {
        server: params.server,
        database: params.database || "master",
        user: params.user,
        password: params.password,
        port: params.port || 1433,
        options: {
          encrypt: params.encrypt !== false,
          trustServerCertificate: params.trustServerCertificate !== false,
        },
      };
    } else {
      config = {
        connectionString: connectionString,
        options: { encrypt: true, trustServerCertificate: true },
      };
    }
    
    const pool = await sql.default.connect(config);
    
    const usersResult = await pool.request().query(`
      SELECT 
        name as username,
        CASE 
          WHEN is_srvrolemember('sysadmin', name) = 1 THEN 'SUPERUSER'
          WHEN is_srvrolemember('dbcreator', name) = 1 THEN 'CREATEDB'
          WHEN is_srvrolemember('securityadmin', name) = 1 THEN 'CREATEROLE'
          ELSE 'OTHER'
        END as role_type,
        CASE 
          WHEN is_disabled = 0 THEN 'ACTIVE'
          ELSE 'INACTIVE'
        END as status
      FROM sys.server_principals
      WHERE type IN ('S', 'U')
      ORDER BY name
    `);
    
    const connectionsResult = await pool.request().query(`
      SELECT COUNT(*) as current_connections
      FROM sys.dm_exec_sessions
      WHERE is_user_process = 1
    `);
    
    const permissionsResult = await pool.request().query(`
      SELECT 
        COUNT(*) as total_grants,
        COUNT(DISTINCT OBJECT_SCHEMA_NAME(major_id)) as schemas_with_access,
        COUNT(DISTINCT OBJECT_NAME(major_id)) as tables_with_access
      FROM sys.database_permissions
      WHERE class = 1
    `);
    
    await pool.close();
    
    return {
      users: usersResult.recordset || [],
      activeConnections: connectionsResult.recordset[0]?.current_connections || 0,
      permissions: permissionsResult.recordset[0] || { total_grants: 0, schemas_with_access: 0, tables_with_access: 0 },
    };
  } catch (err) {
    console.error("Error getting MSSQL security:", err);
    return { users: [], activeConnections: 0, permissions: { total_grants: 0, schemas_with_access: 0, tables_with_access: 0 }, error: err.message };
  }
}

async function getOracleSecurity(connectionString) {
  try {
    const oracledb = await import("oracledb");
    const conn = await oracledb.default.getConnection(connectionString);
    
    const usersResult = await conn.execute(`
      SELECT 
        username,
        CASE 
          WHEN account_status = 'OPEN' THEN 'ACTIVE'
          ELSE 'INACTIVE'
        END as status,
        CASE 
          WHEN dba_role = 'YES' THEN 'SUPERUSER'
          ELSE 'OTHER'
        END as role_type
      FROM dba_users
      WHERE username NOT IN ('SYS', 'SYSTEM')
      ORDER BY username
      FETCH FIRST 50 ROWS ONLY
    `);
    
    const connectionsResult = await conn.execute(`
      SELECT COUNT(*) as current_connections
      FROM v$session
      WHERE username IS NOT NULL
    `);
    
    const permissionsResult = await conn.execute(`
      SELECT 
        COUNT(*) as total_grants,
        COUNT(DISTINCT owner) as schemas_with_access,
        COUNT(DISTINCT table_name) as tables_with_access
      FROM dba_tab_privs
      WHERE owner NOT IN ('SYS', 'SYSTEM')
    `);
    
    await conn.close();
    
    return {
      users: usersResult.rows?.map(r => ({ username: r[0], status: r[1], role_type: r[2] })) || [],
      activeConnections: connectionsResult.rows?.[0]?.[0] || 0,
      permissions: permissionsResult.rows?.[0] ? { total_grants: permissionsResult.rows[0][0], schemas_with_access: permissionsResult.rows[0][1], tables_with_access: permissionsResult.rows[0][2] } : { total_grants: 0, schemas_with_access: 0, tables_with_access: 0 },
    };
  } catch (err) {
    console.error("Error getting Oracle security:", err);
    return { users: [], activeConnections: 0, permissions: { total_grants: 0, schemas_with_access: 0, tables_with_access: 0 }, error: err.message };
  }
}

async function getMongoDBSecurity(connectionString) {
  try {
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(connectionString);
    await client.connect();
    const adminDb = client.db().admin();
    
    const usersResult = await adminDb.command({ usersInfo: 1 });
    const users = usersResult.users?.map(u => ({
      username: u.user,
      role_type: u.roles?.map(r => r.role).join(', ') || 'OTHER',
      status: 'ACTIVE',
    })) || [];
    
    const serverStatus = await adminDb.command({ serverStatus: 1 });
    const activeConnections = serverStatus.connections?.current || 0;
    
    await client.close();
    
    return {
      users: users.slice(0, 50),
      activeConnections: activeConnections,
      permissions: { total_grants: users.length, schemas_with_access: 0, tables_with_access: 0 },
    };
  } catch (err) {
    console.error("Error getting MongoDB security:", err);
    return { users: [], activeConnections: 0, permissions: { total_grants: 0, schemas_with_access: 0, tables_with_access: 0 }, error: err.message };
  }
}


// Get security data
router.get("/data", async (req, res) => {
  try {
    const postgresSecurity = {
      users: { total: 0, active: 0, superusers: 0, withLogin: 0 },
      connections: { current: 0, max: 0, idle: 0, active: 0 },
      permissions: { totalGrants: 0, schemasWithAccess: 0, tablesWithAccess: 0 },
      activeUsers: [],
    };

    const users = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE rolcanlogin = true) as users_with_login,
        COUNT(*) FILTER (WHERE rolsuper = true) as superusers
      FROM pg_roles
    `);

    const activeUsersCount = await pool.query(`
      SELECT COUNT(DISTINCT usename) as active_users
      FROM pg_stat_activity
      WHERE usename IS NOT NULL
    `);

    const connections = await pool.query(`
      SELECT 
        COUNT(*) as current_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
        COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
        COUNT(*) FILTER (WHERE state = 'active') as active_connections
      FROM pg_stat_activity
    `);

    const activeUsers = await pool.query(`
      SELECT 
        sa.usename as username,
        sa.datname as database,
        CASE 
          WHEN r.rolsuper THEN 'SUPERUSER'
          WHEN r.rolcreatedb THEN 'CREATEDB'
          WHEN r.rolcreaterole THEN 'CREATEROLE'
          WHEN r.rolcanlogin THEN 'LOGIN'
          ELSE 'OTHER'
        END as role_type,
        CASE 
          WHEN sa.state = 'active' THEN 'ACTIVE'
          WHEN sa.state = 'idle' THEN 'IDLE'
          ELSE 'INACTIVE'
        END as status,
        COALESCE(sa.query_start, sa.backend_start) as last_activity,
        sa.client_addr,
        sa.application_name,
        sa.backend_start,
        sa.state_change,
        CASE 
          WHEN sa.state = 'active' AND sa.query_start IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (NOW() - sa.query_start)) * 1000
          ELSE NULL
        END as query_duration,
        sa.wait_event_type,
        sa.wait_event,
        CASE 
          WHEN sa.query IS NOT NULL AND LENGTH(sa.query) > 0
          THEN LEFT(sa.query, 500)
          ELSE NULL
        END as query
      FROM pg_stat_activity sa
      JOIN pg_roles r ON sa.usename = r.rolname
      WHERE sa.usename IS NOT NULL
      ORDER BY last_activity DESC
      LIMIT 50
    `);

    const permissionsOverview = await pool.query(`
      SELECT 
        COUNT(*) as total_grants,
        COUNT(DISTINCT table_schema) as schemas_with_access,
        COUNT(DISTINCT table_name) as tables_with_access
      FROM information_schema.table_privileges
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
    `);

    postgresSecurity.users = {
      total: parseInt(users.rows[0]?.total_users || 0),
      active: parseInt(activeUsersCount.rows[0]?.active_users || 0),
      superusers: parseInt(users.rows[0]?.superusers || 0),
      withLogin: parseInt(users.rows[0]?.users_with_login || 0),
    };
    postgresSecurity.connections = {
      current: parseInt(connections.rows[0]?.current_connections || 0),
      max: parseInt(connections.rows[0]?.max_connections || 0),
      idle: parseInt(connections.rows[0]?.idle_connections || 0),
      active: parseInt(connections.rows[0]?.active_connections || 0),
    };
    postgresSecurity.permissions = {
      totalGrants: parseInt(permissionsOverview.rows[0]?.total_grants || 0),
      schemasWithAccess: parseInt(
        permissionsOverview.rows[0]?.schemas_with_access || 0
      ),
      tablesWithAccess: parseInt(
        permissionsOverview.rows[0]?.tables_with_access || 0
      ),
    };
    postgresSecurity.activeUsers = activeUsers.rows;

    // Obtener todas las conexiones activas usando available_connections
    const availableConnections = await pool.query(`
      SELECT 
        db_engine,
        connection_string,
        connection_string_masked,
        COUNT(*) OVER (PARTITION BY db_engine) as total_by_engine
      FROM metadata.available_connections
      ORDER BY db_engine, connection_string
    `);

    // Agrupar conexiones por motor
    const connectionsByEngine = {};
    availableConnections.rows.forEach(row => {
      if (!connectionsByEngine[row.db_engine]) {
        connectionsByEngine[row.db_engine] = {
          engine: row.db_engine,
          total_connections: 0,
          connections: []
        };
      }
      connectionsByEngine[row.db_engine].total_connections++;
      connectionsByEngine[row.db_engine].connections.push({
        connection_string: row.connection_string,
        connection_string_masked: row.connection_string_masked
      });
    });

    // Obtener estadísticas de auditoría DDL por motor
    const ddlAuditStats = await pool.query(`
      SELECT 
        db_engine,
        COUNT(*) as total_changes,
        COUNT(*) FILTER (WHERE change_type = 'DROP') as drop_operations,
        COUNT(*) FILTER (WHERE change_type = 'ALTER') as alter_operations,
        COUNT(*) FILTER (WHERE change_type = 'CREATE') as create_operations,
        COUNT(DISTINCT executed_by) as unique_users,
        MAX(execution_timestamp) as last_change,
        MIN(execution_timestamp) as first_change
      FROM metadata.schema_change_audit
      WHERE execution_timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY db_engine
      ORDER BY db_engine
    `);

    // Obtener cambios DDL recientes (últimos 7 días) para alertas
    const recentDDLChanges = await pool.query(`
      SELECT 
        id,
        db_engine,
        server_name,
        database_name,
        schema_name,
        object_name,
        object_type,
        change_type,
        executed_by,
        execution_timestamp,
        ddl_statement
      FROM metadata.schema_change_audit
      WHERE execution_timestamp >= NOW() - INTERVAL '7 days'
      ORDER BY execution_timestamp DESC
      LIMIT 50
    `);

    // Calcular niveles de riesgo por motor
    const riskLevels = {};
    ddlAuditStats.rows.forEach(row => {
      let riskLevel = 'NORMAL';
      if (row.drop_operations > 5) {
        riskLevel = 'HIGH_RISK';
      } else if (row.drop_operations > 0) {
        riskLevel = 'MEDIUM_RISK';
      } else if (row.total_changes > 50) {
        riskLevel = 'ELEVATED_ACTIVITY';
      }
      riskLevels[row.db_engine] = riskLevel;
    });

    // Obtener información de seguridad para otras bases de datos
    const otherDatabases = {};
    for (const [engine, engineData] of Object.entries(connectionsByEngine)) {
      if (engine !== 'PostgreSQL') {
        if (!otherDatabases[engine]) {
          otherDatabases[engine] = [];
        }
        
        // Para cada conexión, intentar obtener datos de seguridad
        for (const conn of engineData.connections.slice(0, 5)) { // Limitar a 5 por motor
          let securityData = null;
          try {
            if (engine === 'MariaDB') {
              securityData = await getMariaDBSecurity(conn.connection_string);
            } else if (engine === 'MSSQL') {
              securityData = await getMSSQLSecurity(conn.connection_string);
            } else if (engine === 'Oracle') {
              securityData = await getOracleSecurity(conn.connection_string);
            } else if (engine === 'MongoDB') {
              securityData = await getMongoDBSecurity(conn.connection_string);
            }
          } catch (err) {
            console.error(`Error getting security for ${engine}:`, err);
            securityData = { error: err.message };
          }
          
          otherDatabases[engine].push({
            connection: conn.connection_string_masked || conn.connection_string.substring(0, 50) + '...',
            connection_string: conn.connection_string,
            security: securityData,
          });
        }
      }
    }

    const securityData = {
      postgres: postgresSecurity,
      otherDatabases: otherDatabases,
      summary: {
        users: postgresSecurity.users,
        connections: postgresSecurity.connections,
        permissions: postgresSecurity.permissions,
      },
      activeUsers: postgresSecurity.activeUsers,
      // Nuevos datos para Blue Team
      availableConnections: connectionsByEngine,
      ddlAuditStats: ddlAuditStats.rows.map(row => ({
        ...row,
        risk_level: riskLevels[row.db_engine] || 'NORMAL'
      })),
      recentDDLChanges: recentDDLChanges.rows,
      securityAlerts: recentDDLChanges.rows
        .filter(row => row.change_type === 'DROP')
        .map(row => ({
          severity: 'CRITICAL',
          db_engine: row.db_engine,
          object_name: row.object_name,
          executed_by: row.executed_by,
          execution_timestamp: row.execution_timestamp,
          message: `DROP operation detected on ${row.object_type} ${row.schema_name}.${row.object_name}`
        }))
    };

    res.json(securityData);
  } catch (err) {
    console.error("Error getting security data:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener datos de seguridad",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});


// Advanced Security Endpoints
router.post("/masking/apply", requireAuth, async (req, res) => {
  try {
    const { value, schema_name, table_name, column_name } = req.body;
    const username = req.user?.username || "anonymous";
    const userRoles = req.user?.roles || [];

    if (!value || !schema_name || !table_name || !column_name) {
      return res.status(400).json({ error: "value, schema_name, table_name, and column_name required" });
    }

    const result = await executeSecurityCommand("masking_apply", {
      value,
      schema_name,
      table_name,
      column_name,
      username,
      user_roles: userRoles
    });
    
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error applying masking", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/masking/policies", requireAuth, async (req, res) => {
  try {
    const { schema, table, column } = req.query;
    
    let query = "SELECT * FROM metadata.masking_policies WHERE 1=1";
    const params = [];
    let paramCount = 0;

    if (schema) {
      paramCount++;
      query += ` AND schema_name = $${paramCount}`;
      params.push(schema);
    }
    if (table) {
      paramCount++;
      query += ` AND table_name = $${paramCount}`;
      params.push(table);
    }
    if (column) {
      paramCount++;
      query += ` AND column_name = $${paramCount}`;
      params.push(column);
    }

    query += " ORDER BY policy_name";

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting masking policies", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/masking/policies", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { policy_name, schema_name, table_name, column_name, masking_type, masking_function, masking_params, role_whitelist, active = true } = req.body;

    if (!policy_name || !schema_name || !table_name || !column_name || !masking_type) {
      return res.status(400).json({ error: "policy_name, schema_name, table_name, column_name, and masking_type required" });
    }

    const result = await pool.query(
      `INSERT INTO metadata.masking_policies 
       (policy_name, schema_name, table_name, column_name, masking_type, masking_function, masking_params, role_whitelist, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::text[], $9, NOW(), NOW())
       RETURNING *`,
      [policy_name, schema_name, table_name, column_name, masking_type, masking_function || null, JSON.stringify(masking_params || {}), role_whitelist || [], active]
    );

    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating masking policy", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.put("/masking/policies/:id", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const policyId = parseInt(req.params.id);
    const { policy_name, masking_type, masking_function, masking_params, role_whitelist, active } = req.body;

    const result = await pool.query(
      `UPDATE metadata.masking_policies 
       SET policy_name = COALESCE($1, policy_name),
           masking_type = COALESCE($2, masking_type),
           masking_function = COALESCE($3, masking_function),
           masking_params = COALESCE($4::jsonb, masking_params),
           role_whitelist = COALESCE($5::text[], role_whitelist),
           active = COALESCE($6, active),
           updated_at = NOW()
       WHERE policy_id = $7
       RETURNING *`,
      [policy_name, masking_type, masking_function, masking_params ? JSON.stringify(masking_params) : null, role_whitelist, active, policyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Policy not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating masking policy", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.delete("/masking/policies/:id", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const policyId = parseInt(req.params.id);

    const result = await pool.query(
      `DELETE FROM metadata.masking_policies WHERE policy_id = $1 RETURNING *`,
      [policyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Policy not found" });
    }

    res.json({ message: "Policy deleted successfully", policy: result.rows[0] });
  } catch (err) {
    const safeError = sanitizeError(err, "Error deleting masking policy", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Tokenization
router.post("/tokenization/tokenize", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { value, schema_name, table_name, column_name, reversible = true, token_type = "REVERSIBLE" } = req.body;

    if (!value || !schema_name || !table_name || !column_name) {
      return res.status(400).json({ error: "value, schema_name, table_name, and column_name required" });
    }

    const tokenType = req.body.token_type || "reversible";
    const result = await executeSecurityCommand("tokenize", {
      value,
      token_type: tokenType,
      schema_name,
      table_name,
      column_name
    });
    
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error tokenizing value", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/tokenization/detokenize", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { token, schema_name, table_name, column_name, reason } = req.body;
    const username = req.user?.username || "anonymous";

    if (!token || !schema_name || !table_name || !column_name) {
      return res.status(400).json({ error: "token, schema_name, table_name, and column_name required" });
    }

    const result = await executeSecurityCommand("detokenize", {
      token,
      username
    });
    
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error detokenizing", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/tokenization/tokens", requireAuth, async (req, res) => {
  try {
    const { schema, table, column, limit = 100 } = req.query;
    
    let query = "SELECT token_id, schema_name, table_name, column_name, token_value, token_type, created_at, access_count FROM metadata.tokenization_tokens WHERE 1=1";
    const params = [];
    let paramCount = 0;

    if (schema) {
      paramCount++;
      query += ` AND schema_name = $${paramCount}`;
      params.push(schema);
    }
    if (table) {
      paramCount++;
      query += ` AND table_name = $${paramCount}`;
      params.push(table);
    }
    if (column) {
      paramCount++;
      query += ` AND column_name = $${paramCount}`;
      params.push(column);
    }

    paramCount++;
    query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting tokens", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/tokenization/rotate", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { schema_name, table_name, column_name } = req.body;

    if (!schema_name || !table_name || !column_name) {
      return res.status(400).json({ error: "schema_name, table_name, and column_name required" });
    }

    await executeSecurityCommand("rotate_tokens", {
      schema_name,
      table_name,
      column_name
    });
    
    res.json({ success: true, message: "Tokens rotated successfully" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error rotating tokens", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/tokenization/keys", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT key_id, algorithm, created_at, rotated_at, active FROM metadata.tokenization_keys ORDER BY created_at DESC"
    );
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting encryption keys", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/tokenization/keys/rotate", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { key_id } = req.body;

    await executeSecurityCommand("rotate_encryption_keys", {
      key_id: key_id || ""
    });
    
    res.json({ success: true, message: "Encryption keys rotated successfully" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error rotating encryption keys", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Anonymization
router.post("/anonymization/anonymize", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { dataset, profile_name } = req.body;

    if (!dataset || !profile_name) {
      return res.status(400).json({ error: "dataset and profile_name required" });
    }

    const result = await executeSecurityCommand("anonymize", {
      profile_name: profile_name,
      data: dataset
    });
    
    const anonymizedData = result.anonymized_data || [];
    res.json({
      anonymized_dataset: anonymizedData,
      original_count: Array.isArray(dataset) ? dataset.length : 0,
      anonymized_count: Array.isArray(anonymizedData) ? anonymizedData.length : 0,
      information_loss: result.information_loss || 0
    });
  } catch (err) {
    const safeError = sanitizeError(err, "Error anonymizing dataset", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/anonymization/profiles", requireAuth, async (req, res) => {
  try {
    const { schema, table } = req.query;
    
    let query = "SELECT * FROM metadata.anonymization_profiles WHERE active = true";
    const params = [];
    let paramCount = 0;

    if (schema) {
      paramCount++;
      query += ` AND schema_name = $${paramCount}`;
      params.push(schema);
    }
    if (table) {
      paramCount++;
      query += ` AND table_name = $${paramCount}`;
      params.push(table);
    }

    query += " ORDER BY profile_name";

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting anonymization profiles", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/anonymization/profiles", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { profile_name, schema_name, table_name, anonymization_type, k_value, l_value, t_value, epsilon, quasi_identifiers, sensitive_attributes, generalization_levels, suppression_threshold, active = true } = req.body;

    if (!profile_name || !schema_name || !table_name || !anonymization_type || !quasi_identifiers) {
      return res.status(400).json({ error: "profile_name, schema_name, table_name, anonymization_type, and quasi_identifiers required" });
    }

    const result = await pool.query(
      `INSERT INTO metadata.anonymization_profiles 
       (profile_name, schema_name, table_name, anonymization_type, k_value, l_value, t_value, epsilon, 
        quasi_identifiers, sensitive_attributes, generalization_levels, suppression_threshold, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10::text[], $11::jsonb, $12, $13, NOW(), NOW())
       RETURNING *`,
      [profile_name, schema_name, table_name, anonymization_type, k_value || null, l_value || null, t_value || null, epsilon || null,
       quasi_identifiers, sensitive_attributes || [], JSON.stringify(generalization_levels || {}), suppression_threshold || 0.0, active]
    );

    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating anonymization profile", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.put("/anonymization/profiles/:id", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const profileId = parseInt(req.params.id);
    const { profile_name, anonymization_type, k_value, l_value, t_value, epsilon, quasi_identifiers, sensitive_attributes, generalization_levels, suppression_threshold, active } = req.body;

    const result = await pool.query(
      `UPDATE metadata.anonymization_profiles 
       SET profile_name = COALESCE($1, profile_name),
           anonymization_type = COALESCE($2, anonymization_type),
           k_value = COALESCE($3, k_value),
           l_value = COALESCE($4, l_value),
           t_value = COALESCE($5, t_value),
           epsilon = COALESCE($6, epsilon),
           quasi_identifiers = COALESCE($7::text[], quasi_identifiers),
           sensitive_attributes = COALESCE($8::text[], sensitive_attributes),
           generalization_levels = COALESCE($9::jsonb, generalization_levels),
           suppression_threshold = COALESCE($10, suppression_threshold),
           active = COALESCE($11, active),
           updated_at = NOW()
       WHERE profile_id = $12
       RETURNING *`,
      [profile_name, anonymization_type, k_value, l_value, t_value, epsilon, quasi_identifiers, sensitive_attributes,
       generalization_levels ? JSON.stringify(generalization_levels) : null, suppression_threshold, active, profileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating anonymization profile", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/anonymization/validate", requireAuth, async (req, res) => {
  try {
    const { dataset, k, l, quasi_identifiers, sensitive_attribute } = req.body;

    if (!dataset || !quasi_identifiers) {
      return res.status(400).json({ error: "dataset and quasi_identifiers required" });
    }

    const result = await executeSecurityCommand("validate_anonymization", {
      dataset,
      k: k || 0,
      l: l || 0,
      quasi_identifiers: quasi_identifiers || [],
      sensitive_attribute: sensitive_attribute || ""
    });
    
    res.json({
      k_anonymity_achieved: result.k_anonymity_achieved || false,
      l_diversity_achieved: result.l_diversity_achieved || false
    });
  } catch (err) {
    const safeError = sanitizeError(err, "Error validating anonymization", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Fine-Grained Permissions
router.get("/permissions/policies", requireAuth, async (req, res) => {
  try {
    const { schema, table, policy_type } = req.query;
    
    let query = "SELECT * FROM metadata.permission_policies WHERE 1=1";
    const params = [];
    let paramCount = 0;

    if (schema) {
      paramCount++;
      query += ` AND schema_name = $${paramCount}`;
      params.push(schema);
    }
    if (table) {
      paramCount++;
      query += ` AND table_name = $${paramCount}`;
      params.push(table);
    }
    if (policy_type) {
      paramCount++;
      query += ` AND policy_type = $${paramCount}`;
      params.push(policy_type);
    }

    query += " ORDER BY priority DESC, policy_id";

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting permission policies", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/permissions/policies", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { policy_name, policy_type, schema_name, table_name, column_name, role_name, username, operation, condition_expression, attribute_conditions, priority = 0, active = true } = req.body;

    if (!policy_name || !policy_type || !operation) {
      return res.status(400).json({ error: "policy_name, policy_type, and operation required" });
    }

    const result = await pool.query(
      `INSERT INTO metadata.permission_policies 
       (policy_name, policy_type, schema_name, table_name, column_name, role_name, username, 
        operation, condition_expression, attribute_conditions, priority, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, NOW(), NOW())
       RETURNING *`,
      [policy_name, policy_type, schema_name || null, table_name || null, column_name || null, role_name || null, username || null,
       operation, condition_expression || null, JSON.stringify(attribute_conditions || {}), priority, active]
    );

    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating permission policy", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.put("/permissions/policies/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const policyId = parseInt(req.params.id);
    const { policy_name, policy_type, schema_name, table_name, column_name, role_name, username, operation, condition_expression, attribute_conditions, priority, active } = req.body;

    const result = await pool.query(
      `UPDATE metadata.permission_policies 
       SET policy_name = COALESCE($1, policy_name),
           policy_type = COALESCE($2, policy_type),
           schema_name = COALESCE($3, schema_name),
           table_name = COALESCE($4, table_name),
           column_name = COALESCE($5, column_name),
           role_name = COALESCE($6, role_name),
           username = COALESCE($7, username),
           operation = COALESCE($8, operation),
           condition_expression = COALESCE($9, condition_expression),
           attribute_conditions = COALESCE($10::jsonb, attribute_conditions),
           priority = COALESCE($11, priority),
           active = COALESCE($12, active),
           updated_at = NOW()
       WHERE policy_id = $13
       RETURNING *`,
      [policy_name, policy_type, schema_name, table_name, column_name, role_name, username, operation,
       condition_expression, attribute_conditions ? JSON.stringify(attribute_conditions) : null, priority, active, policyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Policy not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating permission policy", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.delete("/permissions/policies/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const policyId = parseInt(req.params.id);

    const result = await pool.query(
      `DELETE FROM metadata.permission_policies WHERE policy_id = $1 RETURNING *`,
      [policyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Policy not found" });
    }

    res.json({ message: "Policy deleted successfully", policy: result.rows[0] });
  } catch (err) {
    const safeError = sanitizeError(err, "Error deleting permission policy", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/permissions/check", requireAuth, async (req, res) => {
  try {
    const { schema_name, table_name, column_name, operation } = req.query;
    const username = req.user?.username || "anonymous";
    const userRoles = req.user?.roles || [];

    if (!schema_name || !table_name || !operation) {
      return res.status(400).json({ error: "schema_name, table_name, and operation required" });
    }

    const columnName = req.query.column_name || "";
    
    const result = await executeSecurityCommand("check_permission", {
      username,
      user_roles: userRoles,
      schema_name,
      table_name,
      column_name: columnName,
      operation_type: operation
    });
    
    res.json({ allowed: result.allowed });
  } catch (err) {
    const safeError = sanitizeError(err, "Error checking permissions", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/permissions/accessible-columns", requireAuth, async (req, res) => {
  try {
    const { schema_name, table_name } = req.query;
    const username = req.user?.username || "anonymous";
    const userRoles = req.user?.roles || [];

    if (!schema_name || !table_name) {
      return res.status(400).json({ error: "schema_name and table_name required" });
    }
    
    const result = await executeSecurityCommand("get_accessible_columns", {
      username,
      user_roles: userRoles,
      schema_name,
      table_name
    });
    
    res.json({ columns: result.columns });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting accessible columns", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/permissions/row-filter", requireAuth, async (req, res) => {
  try {
    const { schema_name, table_name } = req.query;
    const username = req.user?.username || "anonymous";
    const userRoles = req.user?.roles || [];

    if (!schema_name || !table_name) {
      return res.status(400).json({ error: "schema_name and table_name required" });
    }
    
    const result = await executeSecurityCommand("get_row_filter", {
      username,
      user_roles: userRoles,
      schema_name,
      table_name
    });
    
    res.json({ filter: result.filter });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting row filter", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/permissions/user-attributes", requireAuth, async (req, res) => {
  try {
    const { user_id } = req.query;
    const userId = user_id || req.user?.username || "anonymous";

    const result = await pool.query(
      "SELECT * FROM metadata.user_attributes WHERE user_id = $1",
      [userId]
    );

    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting user attributes", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/permissions/user-attributes", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { user_id, attribute_name, attribute_value } = req.body;

    if (!user_id || !attribute_name || !attribute_value) {
      return res.status(400).json({ error: "user_id, attribute_name, and attribute_value required" });
    }

    const result = await pool.query(
      `INSERT INTO metadata.user_attributes (user_id, attribute_name, attribute_value, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (user_id, attribute_name)
       DO UPDATE SET attribute_value = EXCLUDED.attribute_value, updated_at = NOW()
       RETURNING *`,
      [user_id, attribute_name, attribute_value]
    );

    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error setting user attribute", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

export default router;
