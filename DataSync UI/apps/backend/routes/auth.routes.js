import express from "express";
import { requireAuth, requireRole, authenticateUser, changePassword, createUser, initializeUsersTable } from "../server-utils/auth.js";
import { authLimiter } from "../server-utils/rateLimiter.js";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { validatePage, validateLimit, validateBoolean, sanitizeSearch } from "../server-utils/validation.js";
import bcrypt from "bcryptjs";

const router = express.Router();

// Variable global para el estado de la tabla de usuarios
let usersTableReady = false;

(async () => {
  try {
    console.log("Auth router: Initializing users table...");
    await initializeUsersTable();
    usersTableReady = true;
    console.log("Auth router: Users table ready");
  } catch (err) {
    console.error("Auth router: Failed to initialize users table:", err);
    console.error("Error details:", {
      message: err.message,
      code: err.code,
      name: err.name,
      stack: err.stack
    });
    usersTableReady = false;
  }
})();

router.post("/login", authLimiter, async (req, res) => {
  try {
    console.log("Login attempt - usersTableReady:", usersTableReady);
    
    if (!usersTableReady) {
      console.error("Users table not ready, initialization may have failed");
      return res.status(503).json({
        error: "Server is initializing. Please try again in a moment.",
      });
    }

    const { username, password } = req.body;
    console.log("Login attempt for username:", username);

    if (!username || !password) {
      return res.status(400).json({
        error: "Username and password are required",
      });
    }

    let result;
    try {
      console.log("Calling authenticateUser...");
      result = await authenticateUser(username, password);
      console.log("authenticateUser result:", result ? { success: result.success, hasUser: !!result.user } : "null");
    } catch (authError) {
      console.error("Authentication error:", authError);
      console.error("Auth error details:", {
        message: authError.message,
        code: authError.code,
        name: authError.name,
        stack: authError.stack
      });
      // Return more detailed error in development
      return res.status(500).json({
        error: process.env.NODE_ENV === "production" 
          ? "Authentication failed" 
          : `Authentication error: ${authError.message}`,
        details: process.env.NODE_ENV !== "production" ? {
          message: authError.message,
          code: authError.code,
          name: authError.name
        } : undefined
      });
    }

    if (!result || !result.success) {
      console.log("Authentication failed:", result?.error || "Unknown error");
      return res.status(401).json({ 
        error: result?.error || "Invalid credentials" 
      });
    }

    console.log("Login successful for user:", result.user.username);
    res.json({
      user: result.user,
      token: result.token,
    });
  } catch (err) {
    console.error("Login error:", err);
    console.error("Login error stack:", err.stack);
    const safeError = sanitizeError(
      err,
      "Login failed",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ 
      error: safeError,
      details: process.env.NODE_ENV !== "production" ? {
        message: err.message,
        name: err.name,
        stack: err.stack
      } : undefined
    });
  }
});

router.post("/logout", requireAuth, async (req, res) => {
  res.json({ message: "Logged out successfully" });
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        error: "Old password and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "New password must be at least 8 characters long",
      });
    }

    const result = await changePassword(
      req.user.userId,
      oldPassword,
      newPassword
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    const safeError = sanitizeError(
      err,
      "Failed to change password",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get(
  "/users",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const page = validatePage(req.query.page);
      const limit = validateLimit(req.query.limit, 1, 100);
      const roleFilter = req.query.role || "";
      const activeFilter = req.query.active;
      const search = sanitizeSearch(req.query.search, 100) || "";
      const offset = (page - 1) * limit;

      let whereClause = "WHERE 1=1";
      const countParams = [];
      let paramCount = 0;

      if (roleFilter) {
        paramCount++;
        whereClause += ` AND role = $${paramCount}`;
        countParams.push(roleFilter);
      }

      if (activeFilter !== undefined) {
        paramCount++;
        whereClause += ` AND active = $${paramCount}`;
        countParams.push(activeFilter === "true");
      }

      if (search) {
        paramCount++;
        whereClause += ` AND (username ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
        countParams.push(`%${search}%`);
      }

      const countQuery = `SELECT COUNT(*) as total FROM metadata.users ${whereClause}`;
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0]?.total || 0);

      const dataParams = [...countParams];
      let query = `SELECT id, username, email, role, active, created_at, updated_at, last_login FROM metadata.users ${whereClause} ORDER BY created_at DESC`;

      paramCount++;
      query += ` LIMIT $${paramCount}`;
      dataParams.push(limit);
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      dataParams.push(offset);

      const result = await pool.query(query, dataParams);

      res.json({
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error("List users error:", err);
      const safeError = sanitizeError(
        err,
        "Failed to list users",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.post(
  "/users",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { username, email, password, role } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({
          error: "Username, email, and password are required",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          error: "Password must be at least 8 characters long",
        });
      }

      const result = await createUser(
        username,
        email,
        password,
        role || "user"
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.status(201).json({ user: result.user });
    } catch (err) {
      console.error("Create user error:", err);
      const safeError = sanitizeError(
        err,
        "Failed to create user",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.patch(
  "/users/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { username, email, role, active } = req.body;

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const updates = [];
      const params = [];
      let paramCount = 0;

      if (username !== undefined) {
        paramCount++;
        updates.push(`username = $${paramCount}`);
        params.push(username);
      }

      if (email !== undefined) {
        paramCount++;
        updates.push(`email = $${paramCount}`);
        params.push(email);
      }

      if (role !== undefined) {
        if (!["admin", "user", "viewer"].includes(role)) {
          return res.status(400).json({ error: "Invalid role" });
        }
        paramCount++;
        updates.push(`role = $${paramCount}`);
        params.push(role);
      }

      if (active !== undefined) {
        paramCount++;
        updates.push(`active = $${paramCount}`);
        params.push(validateBoolean(active, true));
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      paramCount++;
      updates.push(`updated_at = NOW()`);
      paramCount++;
      params.push(userId);

      const query = `UPDATE metadata.users SET ${updates.join(
        ", "
      )} WHERE id = $${paramCount} RETURNING id, username, email, role, active, created_at, updated_at, last_login`;

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user: result.rows[0] });
    } catch (err) {
      console.error("Update user error:", err);
      const safeError = sanitizeError(
        err,
        "Failed to update user",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.delete(
  "/users/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const userCheck = await pool.query(
        "SELECT id, username FROM metadata.users WHERE id = $1",
        [userId]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      if (userCheck.rows[0].username === req.user.username) {
        return res
          .status(400)
          .json({ error: "Cannot delete your own account" });
      }

      await pool.query("DELETE FROM metadata.users WHERE id = $1", [userId]);

      res.json({ message: "User deleted successfully" });
    } catch (err) {
      console.error("Delete user error:", err);
      const safeError = sanitizeError(
        err,
        "Failed to delete user",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.post(
  "/users/:id/reset-password",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { newPassword } = req.body;

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({
          error: "Password must be at least 8 characters long",
        });
      }

      const userCheck = await pool.query(
        "SELECT id FROM metadata.users WHERE id = $1",
        [userId]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await pool.query(
        "UPDATE metadata.users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
        [passwordHash, userId]
      );

      res.json({ message: "Password reset successfully" });
    } catch (err) {
      console.error("Reset password error:", err);
      const safeError = sanitizeError(
        err,
        "Failed to reset password",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

export default router;
