import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { pool } from "../services/database.service.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "datasync-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

async function initializeUsersTable() {
  try {
    console.log("Initializing users table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS metadata.users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login TIMESTAMP
      )
    `);
    console.log("Users table created/verified successfully");
    
    try {
      const constraintExists = await pool.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_schema = 'metadata' 
          AND table_name = 'users' 
          AND constraint_name = 'users_role_check'
      `);
      
      if (constraintExists.rows.length > 0) {
        await pool.query(`
          ALTER TABLE metadata.users 
          DROP CONSTRAINT users_role_check;
        `);
      }
    } catch (err) {
      if (err.code !== "42704") {
        console.error("Error checking/dropping constraint:", err);
      }
    }
    
    try {
      await pool.query(`
        ALTER TABLE metadata.users 
        ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user', 'viewer', 'analytics', 'reporting'));
      `);
    } catch (err) {
      if (err.code !== '42710') {
        console.error("Error adding constraint:", err);
      }
    }

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON metadata.users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON metadata.users(email);
      CREATE INDEX IF NOT EXISTS idx_users_active ON metadata.users(active);
    `);

    const existingAdmin = await pool.query(
      "SELECT id FROM metadata.users WHERE username = $1 OR email = $2",
      ["ADMIN", "admin@datasync.local"]
    );

    if (existingAdmin.rows.length === 0) {
      console.log("Creating default admin user...");
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "ADMIN";
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      try {
        await pool.query(
          `INSERT INTO metadata.users (username, email, password_hash, role, active)
           VALUES ($1, $2, $3, $4, $5)`,
          ["ADMIN", "admin@datasync.local", passwordHash, "admin", true]
        );
        console.log("Default admin user created");
      } catch (insertError) {
        if (insertError.code === '23505') {
          console.log("Admin user already exists");
        } else {
          console.error("Error creating admin user:", insertError);
          throw insertError;
        }
      }
    } else {
      console.log("Admin user already exists");
    }
    
    console.log("Users table initialization completed successfully");
  } catch (error) {
    console.error("Error initializing users table:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    throw error;
  }
}

async function authenticateUser(username, password) {
  console.log("authenticateUser called for username:", username);
  
  const HARDCODED_ADMIN_USERNAME = "admin";
  const HARDCODED_ADMIN_PASSWORD = "admin123";

  if (username === HARDCODED_ADMIN_USERNAME && password === HARDCODED_ADMIN_PASSWORD) {
    console.log("Using hardcoded admin credentials");
    const token = jwt.sign(
      {
        userId: 0,
        username: HARDCODED_ADMIN_USERNAME,
        role: "admin",
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      success: true,
      user: {
        id: 0,
        username: HARDCODED_ADMIN_USERNAME,
        email: "admin@datasync.local",
        role: "admin",
      },
      token,
    };
  }

  try {
    console.log("Querying database for user:", username);
    const result = await pool.query(
      "SELECT id, username, email, password_hash, role, active FROM metadata.users WHERE username = $1 OR email = $1",
      [username]
    );
    console.log("Database query result:", result.rows.length > 0 ? "User found" : "User not found");

    if (!result || !result.rows || result.rows.length === 0) {
      return { success: false, error: "Invalid credentials" };
    }

    const user = result.rows[0];

    if (!user) {
      return { success: false, error: "Invalid credentials" };
    }

    if (!user.active) {
      return { success: false, error: "User account is inactive" };
    }

    if (!user.password_hash) {
      console.error("User has no password hash:", user.username);
      return { success: false, error: "Invalid credentials" };
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return { success: false, error: "Invalid credentials" };
    }

    try {
      await pool.query(
        "UPDATE metadata.users SET last_login = NOW() WHERE id = $1",
        [user.id]
      );
    } catch (updateError) {
      console.error("Error updating last_login:", updateError);
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
    };
  } catch (error) {
    console.error("Error authenticating user:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    // Re-throw the error so it can be caught by the route handler
    throw error;
  }
}

function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { success: true, user: decoded };
  } catch (error) {
    return { success: false, error: "Invalid or expired token" };
  }
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.substring(7);
  const verification = verifyToken(token);

  if (!verification.success) {
    return res.status(401).json({ error: verification.error });
  }

  req.user = verification.user;
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

async function createUser(username, email, password, role = "user") {
  try {
    if (!["admin", "user", "viewer", "analytics", "reporting"].includes(role)) {
      return { success: false, error: "Invalid role" };
    }

    const existingUser = await pool.query(
      "SELECT id FROM metadata.users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return { success: false, error: "User already exists" };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO metadata.users (username, email, password_hash, role, active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, role, active, created_at`,
      [username, email, passwordHash, role, true]
    );

    return {
      success: true,
      user: result.rows[0],
    };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: "Failed to create user" };
  }
}

async function changePassword(userId, oldPassword, newPassword) {
  try {
    const result = await pool.query(
      "SELECT password_hash FROM metadata.users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: "User not found" };
    }

    const passwordMatch = await bcrypt.compare(
      oldPassword,
      result.rows[0].password_hash
    );

    if (!passwordMatch) {
      return { success: false, error: "Current password is incorrect" };
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE metadata.users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [newPasswordHash, userId]
    );

    return { success: true };
  } catch (error) {
    console.error("Error changing password:", error);
    return { success: false, error: "Failed to change password" };
  }
}

export {
  initializeUsersTable,
  authenticateUser,
  verifyToken,
  requireAuth,
  requireRole,
  createUser,
  changePassword,
};
