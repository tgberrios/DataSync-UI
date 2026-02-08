/**
 * Compliance API routes: requests, consents, breaches.
 * Frontend ComplianceManager expects GET to return arrays; POST/PUT/DELETE return created/updated result or 204.
 * Stub implementation returns empty arrays until compliance tables exist in the data lake.
 */
import express from "express";
import { sanitizeError } from "../server-utils/errorHandler.js";

const router = express.Router();

// --- Compliance requests ---
router.get("/requests", async (req, res) => {
  try {
    // TODO: replace with pool.query when metadata.compliance_requests (or similar) exists
    const rows = [];
    res.json(rows);
  } catch (err) {
    console.error("Error getting compliance requests:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting compliance requests"),
    });
  }
});

router.post("/requests", async (req, res) => {
  try {
    // TODO: insert into compliance_requests when table exists
    const created = { id: null, ...req.body, request_status: "pending" };
    res.status(201).json(created);
  } catch (err) {
    console.error("Error creating compliance request:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error creating compliance request"),
    });
  }
});

router.put("/requests/:requestId", async (req, res) => {
  try {
    // TODO: update compliance_requests when table exists
    const updated = { id: req.params.requestId, ...req.body };
    res.json(updated);
  } catch (err) {
    console.error("Error updating compliance request:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error updating compliance request"),
    });
  }
});

router.post("/requests/:requestId/process-right-to-be-forgotten", async (req, res) => {
  try {
    // TODO: run RTBF workflow when implemented
    res.json({ requestId: req.params.requestId, status: "processed" });
  } catch (err) {
    console.error("Error processing right to be forgotten:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error processing right to be forgotten"),
    });
  }
});

router.post("/requests/:requestId/process-data-portability", async (req, res) => {
  try {
    // TODO: run data portability workflow when implemented
    res.json({ requestId: req.params.requestId, status: "processed" });
  } catch (err) {
    console.error("Error processing data portability:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error processing data portability"),
    });
  }
});

router.post("/requests/:requestId/process-access-request", async (req, res) => {
  try {
    // TODO: run access request workflow when implemented
    res.json({ requestId: req.params.requestId, status: "processed" });
  } catch (err) {
    console.error("Error processing access request:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error processing access request"),
    });
  }
});

// --- Consents ---
router.get("/consents", async (req, res) => {
  try {
    // TODO: replace with pool.query when consent table exists
    const rows = [];
    res.json(rows);
  } catch (err) {
    console.error("Error getting consents:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting consents"),
    });
  }
});

router.post("/consents", async (req, res) => {
  try {
    // TODO: insert when consent table exists
    const created = { id: null, ...req.body };
    res.status(201).json(created);
  } catch (err) {
    console.error("Error creating consent:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error creating consent"),
    });
  }
});

router.delete("/consents/:id", async (req, res) => {
  try {
    // TODO: delete/withdraw when consent table exists
    res.status(204).send();
  } catch (err) {
    console.error("Error withdrawing consent:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error withdrawing consent"),
    });
  }
});

// --- Breaches ---
router.get("/breaches", async (req, res) => {
  try {
    // TODO: replace with pool.query when breach table exists
    const rows = [];
    res.json(rows);
  } catch (err) {
    console.error("Error getting breaches:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting breaches"),
    });
  }
});

router.post("/breaches/check", async (req, res) => {
  try {
    // TODO: run breach check when implemented
    res.json({ checked: true, breach_detected: false });
  } catch (err) {
    console.error("Error checking breach:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error checking breach"),
    });
  }
});

export default router;
