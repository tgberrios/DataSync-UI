import type {
  PipelineGraph,
  PipelineNode,
  SourceNodeData,
  JoinNodeData,
  FilterNodeData,
  AggregateNodeData,
} from "../types";

export function generateSQL(graph: PipelineGraph): string {
  const { nodes, edges } = graph;

  const sourceNode = nodes.find((n) => n.type === "source") as
    | PipelineNode
    | undefined;
  if (!sourceNode) {
    throw new Error("Pipeline must have a source node");
  }

  const sourceData = sourceNode.data as SourceNodeData;
  let baseQuery = "";

  if (sourceData.query) {
    baseQuery = `(${sourceData.query}) AS source`;
  } else if (sourceData.table) {
    const tableName = sourceData.schema
      ? `"${sourceData.schema}"."${sourceData.table}"`
      : `"${sourceData.table}"`;
    baseQuery = tableName;
  } else {
    throw new Error("Source node must have either a table or query");
  }

  let currentAlias = "source";
  let query = `SELECT * FROM ${baseQuery} AS ${currentAlias}`;

  const processedNodes = new Set<string>([sourceNode.id]);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  function getNextNodes(nodeId: string): PipelineNode[] {
    return edges
      .filter((e) => e.source === nodeId)
      .map((e) => nodeMap.get(e.target))
      .filter(
        (n): n is PipelineNode => n !== undefined && !processedNodes.has(n.id)
      );
  }

  function processNode(node: PipelineNode): void {
    if (processedNodes.has(node.id)) return;
    processedNodes.add(node.id);

    switch (node.type) {
      case "join": {
        const joinData = node.data as JoinNodeData;
        const joinType = joinData.joinType
          .toUpperCase()
          .replace("FULL", "FULL OUTER");
        const leftTable = joinData.leftTable || "source";
        const rightTable = joinData.rightTable || "";
        const condition =
          joinData.joinCondition ||
          (joinData.leftColumn && joinData.rightColumn
            ? `${leftTable}.${joinData.leftColumn} = ${rightTable}.${joinData.rightColumn}`
            : "1=1");

        query += ` ${joinType} JOIN ${rightTable} ON ${condition}`;
        break;
      }

      case "filter": {
        const filterData = node.data as FilterNodeData;
        if (filterData.conditions && filterData.conditions.length > 0) {
          const conditions = filterData.conditions
            .map((cond) => {
              const value =
                typeof cond.value === "string"
                  ? `'${cond.value.replace(/'/g, "''")}'`
                  : cond.value;

              if (cond.op === "IS NULL" || cond.op === "IS NOT NULL") {
                return `${cond.column} ${cond.op}`;
              }

              return `${cond.column} ${cond.op} ${value}`;
            })
            .join(" AND ");

          query += ` WHERE ${conditions}`;
        }
        break;
      }

      case "aggregate": {
        const aggData = node.data as AggregateNodeData;
        const selectParts: string[] = [];

        if (aggData.groupBy && aggData.groupBy.length > 0) {
          selectParts.push(...aggData.groupBy.map((col) => `${col}`));
        }

        if (aggData.aggregations && aggData.aggregations.length > 0) {
          aggData.aggregations.forEach((agg) => {
            const alias = agg.alias || `${agg.function}_${agg.column}`;
            selectParts.push(
              `${agg.function.toUpperCase()}(${agg.column}) AS ${alias}`
            );
          });
        }

        if (selectParts.length > 0) {
          query = query.replace("SELECT *", `SELECT ${selectParts.join(", ")}`);
        }

        if (aggData.groupBy && aggData.groupBy.length > 0) {
          query += ` GROUP BY ${aggData.groupBy.join(", ")}`;
        }
        break;
      }
    }

    const nextNodes = getNextNodes(node.id);
    nextNodes.forEach(processNode);
  }

  const nextNodes = getNextNodes(sourceNode.id);
  nextNodes.forEach(processNode);

  return query;
}
