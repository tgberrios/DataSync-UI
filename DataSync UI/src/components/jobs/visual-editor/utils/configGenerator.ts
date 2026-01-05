import type {
  PipelineGraph,
  TransformNodeData,
  FilterNodeData,
} from "../types";

export function generateTransformConfig(
  graph: PipelineGraph
): Record<string, any> {
  const { nodes } = graph;

  const config: Record<string, any> = {
    column_mapping: {},
    filters: [],
    column_transforms: [],
    validations: [],
  };

  nodes.forEach((node) => {
    switch (node.type) {
      case "transform": {
        const transformData = node.data as TransformNodeData;
        if (transformData.transforms && transformData.transforms.length > 0) {
          transformData.transforms.forEach((transform) => {
            config.column_transforms.push({
              target_column: transform.target_column,
              expression: transform.expression,
              columns: transform.columns,
              separator: transform.separator,
            });
          });
        }
        break;
      }

      case "filter": {
        const filterData = node.data as FilterNodeData;
        if (filterData.conditions && filterData.conditions.length > 0) {
          filterData.conditions.forEach((condition) => {
            config.filters.push({
              column: condition.column,
              op: condition.op,
              value: condition.value,
            });
          });
        }
        break;
      }
    }
  });

  return config;
}
