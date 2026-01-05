import type {
  PipelineGraph,
  PipelineNode,
  PipelineEdge,
  SourceNodeData,
  FilterNodeData,
  AggregateNodeData,
} from "../types";

export function parseSQLToGraph(sql: string): PipelineGraph {
  const nodes: PipelineNode[] = [];
  const edges: PipelineEdge[] = [];
  let nodeIdCounter = 0;

  const sqlOriginal = sql;

  const fromMatch = sqlOriginal.match(/FROM\s+([^\s(]+(?:\.[^\s(]+)?)/i);
  if (fromMatch) {
    const tableRef = fromMatch[1].trim().replace(/"/g, "").replace(/'/g, "");
    const tableParts = tableRef.split(".");

    const sourceNode: PipelineNode = {
      id: `source-${nodeIdCounter++}`,
      type: "source",
      data: {
        type: "source",
        schema: tableParts.length > 1 ? tableParts[0] : undefined,
        table: tableParts[tableParts.length - 1],
        query:
          sqlOriginal.includes("(") && sqlOriginal.includes(")")
            ? sqlOriginal
            : undefined,
      } as SourceNodeData,
      position: { x: 100, y: 200 },
    };
    nodes.push(sourceNode);
    let lastNodeId = sourceNode.id;

    const whereMatch = sqlOriginal.match(
      /WHERE\s+(.+?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+HAVING|$)/is
    );
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();
      const conditions = parseWhereClause(whereClause);

      if (conditions.length > 0) {
        const filterNode: PipelineNode = {
          id: `filter-${nodeIdCounter++}`,
          type: "filter",
          data: {
            type: "filter",
            conditions: conditions,
          } as FilterNodeData,
          position: { x: 400, y: 200 },
        };
        nodes.push(filterNode);
        edges.push({
          id: `edge-${edges.length}`,
          source: lastNodeId,
          target: filterNode.id,
        });
        lastNodeId = filterNode.id;
      }
    }

    const groupByMatch = sqlOriginal.match(
      /GROUP\s+BY\s+(.+?)(?:\s+ORDER\s+BY|\s+HAVING|$)/is
    );
    const selectMatch = sqlOriginal.match(/SELECT\s+(.+?)\s+FROM/is);

    if (
      groupByMatch ||
      (selectMatch && hasAggregateFunctions(selectMatch[1]))
    ) {
      const groupByColumns = groupByMatch
        ? groupByMatch[1].split(",").map((col) => col.trim().replace(/"/g, ""))
        : [];

      const aggregations = extractAggregations(
        selectMatch ? selectMatch[1] : ""
      );

      const aggregateNode: PipelineNode = {
        id: `aggregate-${nodeIdCounter++}`,
        type: "aggregate",
        data: {
          type: "aggregate",
          groupBy: groupByColumns.length > 0 ? groupByColumns : undefined,
          aggregations: aggregations,
        } as AggregateNodeData,
        position: { x: 700, y: 200 },
      };
      nodes.push(aggregateNode);
      edges.push({
        id: `edge-${edges.length}`,
        source: lastNodeId,
        target: aggregateNode.id,
      });
      lastNodeId = aggregateNode.id;
    }

    const targetNode: PipelineNode = {
      id: `target-${nodeIdCounter++}`,
      type: "target",
      data: {
        type: "target",
        loadStrategy: "TRUNCATE",
      },
      position: { x: 1000, y: 200 },
    };
    nodes.push(targetNode);
    edges.push({
      id: `edge-${edges.length}`,
      source: lastNodeId,
      target: targetNode.id,
    });
  }

  return { nodes, edges };
}

function parseWhereClause(whereClause: string): Array<{
  column: string;
  op: string;
  value: any;
}> {
  const conditions: Array<{ column: string; op: string; value: any }> = [];

  const operators = [
    "!=",
    ">=",
    "<=",
    "=",
    ">",
    "<",
    "LIKE",
    "IN",
    "NOT IN",
    "IS NULL",
    "IS NOT NULL",
  ];

  const parts = whereClause.split(/\s+(?:AND|OR)\s+/i);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    for (const op of operators) {
      if (trimmed.toUpperCase().includes(op)) {
        const opIndex = trimmed.toUpperCase().indexOf(op);
        const column = trimmed.substring(0, opIndex).trim().replace(/"/g, "");
        const valuePart = trimmed.substring(opIndex + op.length).trim();

        let value: any = valuePart;
        if (valuePart.startsWith("'") && valuePart.endsWith("'")) {
          value = valuePart.slice(1, -1);
        } else if (!isNaN(Number(valuePart))) {
          value = Number(valuePart);
        } else if (
          valuePart.toUpperCase() === "TRUE" ||
          valuePart.toUpperCase() === "FALSE"
        ) {
          value = valuePart.toUpperCase() === "TRUE";
        } else if (op === "IN" || op === "NOT IN") {
          value = valuePart
            .replace(/[()]/g, "")
            .split(",")
            .map((v) => v.trim().replace(/['"]/g, ""));
        } else if (op === "IS NULL" || op === "IS NOT NULL") {
          value = null;
        }

        conditions.push({
          column,
          op: op as any,
          value,
        });
        break;
      }
    }
  }

  return conditions;
}

function hasAggregateFunctions(selectClause: string): boolean {
  const aggregateFunctions = ["SUM", "COUNT", "AVG", "MIN", "MAX"];
  return aggregateFunctions.some((func) =>
    selectClause.toUpperCase().includes(func + "(")
  );
}

function extractAggregations(selectClause: string): Array<{
  column: string;
  function: "sum" | "count" | "avg" | "min" | "max";
  alias?: string;
}> {
  const aggregations: Array<{
    column: string;
    function: "sum" | "count" | "avg" | "min" | "max";
    alias?: string;
  }> = [];

  const regex =
    /(SUM|COUNT|AVG|MIN|MAX)\s*\(\s*([^)]+)\s*\)(?:\s+AS\s+(\w+))?/gi;
  let match;

  while ((match = regex.exec(selectClause)) !== null) {
    const func = match[1].toLowerCase() as
      | "sum"
      | "count"
      | "avg"
      | "min"
      | "max";
    const column = match[2].trim().replace(/"/g, "");
    const alias = match[3]?.trim();

    aggregations.push({
      column,
      function: func,
      alias,
    });
  }

  return aggregations;
}
