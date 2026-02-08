import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { sanitizeSearch } from "../server-utils/validation.js";

const router = express.Router();

const TERMS_TABLE = "metadata.business_glossary_terms";
const DICTIONARY_TABLE = "metadata.business_glossary_dictionary";
const TERM_TABLES_TABLE = "metadata.business_glossary_term_tables";

function safeText(val, maxLen = 500) {
  if (val == null) return null;
  const s = String(val).trim();
  return s.length === 0 ? null : s.substring(0, maxLen);
}

// GET /business-glossary/terms — list terms with optional domain, category, search
router.get("/terms", async (req, res) => {
  try {
    const domain = safeText(req.query.domain, 200);
    const category = safeText(req.query.category, 200);
    const search = safeText(req.query.search, 200);

    const whereConditions = [];
    const params = [];
    let n = 1;

    if (domain) {
      whereConditions.push(`business_domain = $${n}`);
      params.push(domain);
      n++;
    }
    if (category) {
      whereConditions.push(`category = $${n}`);
      params.push(category);
      n++;
    }
    if (search) {
      whereConditions.push(`(term ILIKE $${n} OR definition ILIKE $${n})`);
      params.push(`%${search}%`);
      n++;
    }

    const whereClause =
      whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    const result = await pool.query(
      `SELECT * FROM ${TERMS_TABLE} ${whereClause} ORDER BY term`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    if (err.message && err.message.includes("relation") && err.message.includes("does not exist")) {
      return res.json([]);
    }
    console.error("business-glossary getTerms:", err);
    res.status(500).json({
      error: sanitizeError(err, "Failed to get glossary terms"),
    });
  }
});

// GET /business-glossary/terms/search?q= — search terms
router.get("/terms/search", async (req, res) => {
  try {
    const q = safeText(req.query.q, 200);
    if (!q) {
      return res.json([]);
    }
    const result = await pool.query(
      `SELECT * FROM ${TERMS_TABLE} WHERE term ILIKE $1 OR definition ILIKE $1 ORDER BY term`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    if (err.message && err.message.includes("relation") && err.message.includes("does not exist")) {
      return res.json([]);
    }
    console.error("business-glossary searchTerms:", err);
    res.status(500).json({
      error: sanitizeError(err, "Failed to search glossary terms"),
    });
  }
});

// GET /business-glossary/terms/by-domain/:domain
router.get("/terms/by-domain/:domain", async (req, res) => {
  try {
    const domain = decodeURIComponent(req.params.domain || "").trim();
    if (!domain) {
      return res.json([]);
    }
    const result = await pool.query(
      `SELECT * FROM ${TERMS_TABLE} WHERE business_domain = $1 ORDER BY term`,
      [domain]
    );
    res.json(result.rows);
  } catch (err) {
    if (err.message && err.message.includes("relation") && err.message.includes("does not exist")) {
      return res.json([]);
    }
    console.error("business-glossary getTermsByDomain:", err);
    res.status(500).json({
      error: sanitizeError(err, "Failed to get terms by domain"),
    });
  }
});

// POST /business-glossary/terms
router.post("/terms", async (req, res) => {
  try {
    const body = req.body || {};
    const term = safeText(body.term, 300);
    const definition = safeText(body.definition, 5000);
    if (!term || !definition) {
      return res.status(400).json({ error: "term and definition are required" });
    }
    const result = await pool.query(
      `INSERT INTO ${TERMS_TABLE} (term, definition, category, business_domain, owner, steward, related_tables, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        term,
        definition,
        safeText(body.category, 200),
        safeText(body.business_domain, 200),
        safeText(body.owner, 200),
        safeText(body.steward, 200),
        safeText(body.related_tables, 1000),
        safeText(body.tags, 500),
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.message && err.message.includes("relation") && err.message.includes("does not exist")) {
      return res.status(503).json({
        error: "Business glossary tables are not installed. Run the metadata migration for business_glossary.",
      });
    }
    console.error("business-glossary createTerm:", err);
    res.status(500).json({
      error: sanitizeError(err, "Failed to create glossary term"),
    });
  }
});

// PUT /business-glossary/terms/:id
router.put("/terms/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid term id" });
    }
    const body = req.body || {};
    const term = safeText(body.term, 300);
    const definition = safeText(body.definition, 5000);
    if (!term || !definition) {
      return res.status(400).json({ error: "term and definition are required" });
    }
    const result = await pool.query(
      `UPDATE ${TERMS_TABLE}
       SET term = $1, definition = $2, category = $3, business_domain = $4, owner = $5, steward = $6, related_tables = $7, tags = $8, updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [
        term,
        definition,
        safeText(body.category, 200),
        safeText(body.business_domain, 200),
        safeText(body.owner, 200),
        safeText(body.steward, 200),
        safeText(body.related_tables, 1000),
        safeText(body.tags, 500),
        id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Term not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err.message && err.message.includes("relation") && err.message.includes("does not exist")) {
      return res.status(503).json({
        error: "Business glossary tables are not installed. Run the metadata migration for business_glossary.",
      });
    }
    console.error("business-glossary updateTerm:", err);
    res.status(500).json({
      error: sanitizeError(err, "Failed to update glossary term"),
    });
  }
});

// DELETE /business-glossary/terms/:id
router.delete("/terms/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid term id" });
    }
    const result = await pool.query(`DELETE FROM ${TERMS_TABLE} WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Term not found" });
    }
    res.status(204).send();
  } catch (err) {
    if (err.message && err.message.includes("relation") && err.message.includes("does not exist")) {
      return res.status(503).json({
        error: "Business glossary tables are not installed. Run the metadata migration for business_glossary.",
      });
    }
    console.error("business-glossary deleteTerm:", err);
    res.status(500).json({
      error: sanitizeError(err, "Failed to delete glossary term"),
    });
  }
});

// GET /business-glossary/terms/:termId/tables
router.get("/terms/:termId/tables", async (req, res) => {
  try {
    const termId = parseInt(req.params.termId, 10);
    if (!Number.isFinite(termId)) {
      return res.json([]);
    }
    const result = await pool.query(
      `SELECT schema_name, table_name FROM ${TERM_TABLES_TABLE} WHERE term_id = $1`,
      [termId]
    );
    res.json(result.rows);
  } catch (err) {
    if (err.message && err.message.includes("relation") && err.message.includes("does not exist")) {
      return res.json([]);
    }
    console.error("business-glossary getTablesForTerm:", err);
    res.status(500).json({
      error: sanitizeError(err, "Failed to get tables for term"),
    });
  }
});

// POST /business-glossary/terms/:termId/link-table
router.post("/terms/:termId/link-table", async (req, res) => {
  try {
    const termId = parseInt(req.params.termId, 10);
    if (!Number.isFinite(termId)) {
      return res.status(400).json({ error: "Invalid term id" });
    }
    const body = req.body || {};
    const schema_name = safeText(body.schema_name, 200);
    const table_name = safeText(body.table_name, 200);
    if (!schema_name || !table_name) {
      return res.status(400).json({ error: "schema_name and table_name are required" });
    }
    await pool.query(
      `INSERT INTO ${TERM_TABLES_TABLE} (term_id, schema_name, table_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (term_id, schema_name, table_name) DO NOTHING`,
      [termId, schema_name, table_name]
    );
    res.status(201).json({ schema_name, table_name });
  } catch (err) {
    if (err.message && err.message.includes("relation") && err.message.includes("does not exist")) {
      return res.status(503).json({
        error: "Business glossary tables are not installed. Run the metadata migration for business_glossary.",
      });
    }
    console.error("business-glossary linkTermToTable:", err);
    res.status(500).json({
      error: sanitizeError(err, "Failed to link term to table"),
    });
  }
});

// GET /business-glossary/dictionary
router.get("/dictionary", async (req, res) => {
  try {
    const schema_name = safeText(req.query.schema_name, 200);
    const table_name = safeText(req.query.table_name, 200);
    const search = safeText(req.query.search, 200);

    const whereConditions = [];
    const params = [];
    let n = 1;

    if (schema_name) {
      whereConditions.push(`schema_name = $${n}`);
      params.push(schema_name);
      n++;
    }
    if (table_name) {
      whereConditions.push(`table_name = $${n}`);
      params.push(table_name);
      n++;
    }
    if (search) {
      whereConditions.push(`(column_name ILIKE $${n} OR business_description ILIKE $${n} OR business_name ILIKE $${n})`);
      params.push(`%${search}%`);
      n++;
    }

    const whereClause =
      whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    const result = await pool.query(
      `SELECT * FROM ${DICTIONARY_TABLE} ${whereClause} ORDER BY schema_name, table_name, column_name`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    if (err.message && err.message.includes("relation") && err.message.includes("does not exist")) {
      return res.json([]);
    }
    console.error("business-glossary getDictionary:", err);
    res.status(500).json({
      error: sanitizeError(err, "Failed to get data dictionary"),
    });
  }
});

// POST /business-glossary/dictionary
router.post("/dictionary", async (req, res) => {
  try {
    const body = req.body || {};
    const schema_name = safeText(body.schema_name, 200);
    const table_name = safeText(body.table_name, 200);
    const column_name = safeText(body.column_name, 200);
    if (!schema_name || !table_name || !column_name) {
      return res.status(400).json({ error: "schema_name, table_name and column_name are required" });
    }
    const result = await pool.query(
      `INSERT INTO ${DICTIONARY_TABLE} (schema_name, table_name, column_name, business_description, business_name, data_type_business, business_rules, examples, glossary_term, owner, steward)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (schema_name, table_name, column_name) DO UPDATE SET
         business_description = EXCLUDED.business_description,
         business_name = EXCLUDED.business_name,
         data_type_business = EXCLUDED.data_type_business,
         business_rules = EXCLUDED.business_rules,
         examples = EXCLUDED.examples,
         glossary_term = EXCLUDED.glossary_term,
         owner = EXCLUDED.owner,
         steward = EXCLUDED.steward,
         updated_at = NOW()
       RETURNING *`,
      [
        schema_name,
        table_name,
        column_name,
        safeText(body.business_description, 2000),
        safeText(body.business_name, 300),
        safeText(body.data_type_business, 200),
        safeText(body.business_rules, 2000),
        safeText(body.examples, 1000),
        safeText(body.glossary_term, 300),
        safeText(body.owner, 200),
        safeText(body.steward, 200),
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.message && err.message.includes("relation") && err.message.includes("does not exist")) {
      return res.status(503).json({
        error: "Business glossary tables are not installed. Run the metadata migration for business_glossary.",
      });
    }
    console.error("business-glossary createDictionaryEntry:", err);
    res.status(500).json({
      error: sanitizeError(err, "Failed to create dictionary entry"),
    });
  }
});

// PUT /business-glossary/dictionary
router.put("/dictionary", async (req, res) => {
  try {
    const body = req.body || {};
    const schema_name = safeText(body.schema_name, 200);
    const table_name = safeText(body.table_name, 200);
    const column_name = safeText(body.column_name, 200);
    if (!schema_name || !table_name || !column_name) {
      return res.status(400).json({ error: "schema_name, table_name and column_name are required" });
    }
    const result = await pool.query(
      `UPDATE ${DICTIONARY_TABLE}
       SET business_description = $1, business_name = $2, data_type_business = $3, business_rules = $4, examples = $5, glossary_term = $6, owner = $7, steward = $8, updated_at = NOW()
       WHERE schema_name = $9 AND table_name = $10 AND column_name = $11 RETURNING *`,
      [
        safeText(body.business_description, 2000),
        safeText(body.business_name, 300),
        safeText(body.data_type_business, 200),
        safeText(body.business_rules, 2000),
        safeText(body.examples, 1000),
        safeText(body.glossary_term, 300),
        safeText(body.owner, 200),
        safeText(body.steward, 200),
        schema_name,
        table_name,
        column_name,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Dictionary entry not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err.message && err.message.includes("relation") && err.message.includes("does not exist")) {
      return res.status(503).json({
        error: "Business glossary tables are not installed. Run the metadata migration for business_glossary.",
      });
    }
    console.error("business-glossary updateDictionaryEntry:", err);
    res.status(500).json({
      error: sanitizeError(err, "Failed to update dictionary entry"),
    });
  }
});

export default router;
