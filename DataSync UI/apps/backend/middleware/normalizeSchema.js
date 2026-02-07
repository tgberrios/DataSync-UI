// Middleware: normalize schema/table identifiers to lowercase in body and query
export function normalizeSchema(req, res, next) {
  try {
    if (req.body) {
      if (typeof req.body.schema_name === "string") {
        req.body.schema_name = req.body.schema_name.toLowerCase();
      }
      if (typeof req.body.table_name === "string") {
        req.body.table_name = req.body.table_name.toLowerCase();
      }
    }
    if (req.query) {
      if (typeof req.query.schema_name === "string") {
        req.query.schema_name = req.query.schema_name.toLowerCase();
      }
      if (typeof req.query.table_name === "string") {
        req.query.table_name = req.query.table_name.toLowerCase();
      }
    }
  } catch {}
  next();
}
