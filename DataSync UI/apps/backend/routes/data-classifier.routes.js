/**
 * Data Classifier API routes: rules and classification results.
 * Frontend DataClassifier expects GET /rules and GET /results to return arrays;
 * POST/PUT/DELETE rules and POST classify/batch-classify return created/updated result or 204.
 * In-memory store for rules until metadata.data_classifier_rules (and results table) exist.
 */
import express from "express";
import { sanitizeError } from "../server-utils/errorHandler.js";

const router = express.Router();

// In-memory store for classification rules (replaced when metadata.data_classifier_rules exists)
let _rulesStore = [];
let _nextId = 1;

// --- Rules ---
router.get("/rules", async (req, res) => {
  try {
    const ruleType = req.query.rule_type;
    const active = req.query.active;
    let rows = [..._rulesStore];
    if (ruleType) {
      rows = rows.filter((r) => r.rule_type === ruleType);
    }
    if (active !== undefined && active !== "") {
      const wantActive = active === "true";
      rows = rows.filter((r) => r.active === wantActive);
    }
    res.json(rows);
  } catch (err) {
    console.error("Error getting classification rules:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting classification rules"),
    });
  }
});

router.post("/rules", async (req, res) => {
  try {
    const { rule_name, rule_type, patterns, priority = 0, active = true } = req.body ?? {};
    const id = _nextId++;
    const created = {
      id,
      rule_name: rule_name ?? "",
      rule_type: rule_type ?? "",
      patterns: patterns ?? {},
      priority,
      active: !!active,
    };
    _rulesStore.push(created);
    res.status(201).json(created);
  } catch (err) {
    console.error("Error creating classification rule:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error creating classification rule"),
    });
  }
});

router.put("/rules/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid rule ID" });
    }
    const idx = _rulesStore.findIndex((r) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Rule not found" });
    }
    const { rule_name, rule_type, patterns, priority, active } = req.body ?? {};
    const updated = {
      ..._rulesStore[idx],
      rule_name: rule_name ?? _rulesStore[idx].rule_name,
      rule_type: rule_type ?? _rulesStore[idx].rule_type,
      patterns: patterns !== undefined ? patterns : _rulesStore[idx].patterns,
      priority: priority !== undefined ? priority : _rulesStore[idx].priority,
      active: active !== undefined ? !!active : _rulesStore[idx].active,
    };
    _rulesStore[idx] = updated;
    res.json(updated);
  } catch (err) {
    console.error("Error updating classification rule:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error updating classification rule"),
    });
  }
});

router.delete("/rules/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid rule ID" });
    }
    const idx = _rulesStore.findIndex((r) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Rule not found" });
    }
    _rulesStore.splice(idx, 1);
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting classification rule:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error deleting classification rule"),
    });
  }
});

// --- Classify (single) ---
router.post("/classify", async (req, res) => {
  try {
    const { schema_name, table_name, column_name } = req.body ?? {};
    // TODO: run classification against catalog/column when metadata and rules are persisted
    res.json({
      schema_name: schema_name ?? "",
      table_name: table_name ?? "",
      column_name: column_name ?? null,
      classification: null,
      matched_rules: [],
    });
  } catch (err) {
    console.error("Error classifying data:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error classifying data"),
    });
  }
});

// --- Results (list) ---
router.get("/results", async (req, res) => {
  try {
    // TODO: replace with pool.query when metadata.data_classifier_results (or similar) exists
    const rows = [];
    res.json(rows);
  } catch (err) {
    console.error("Error getting classification results:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting classification results"),
    });
  }
});

// --- Batch classify ---
router.post("/batch-classify", async (req, res) => {
  try {
    const { schema_name } = req.body ?? {};
    // TODO: run batch classification when metadata and rules are persisted
    res.json({
      schema_name: schema_name ?? "",
      job_id: null,
      status: "pending",
      total_columns: 0,
      classified: 0,
    });
  } catch (err) {
    console.error("Error batch classifying:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error batch classifying"),
    });
  }
});

export default router;
