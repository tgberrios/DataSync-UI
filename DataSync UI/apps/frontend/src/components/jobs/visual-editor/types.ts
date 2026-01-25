export type NodeType =
  | "source"
  | "join"
  | "filter"
  | "aggregate"
  | "transform"
  | "lookup"
  | "target";

export type JoinType = "inner" | "left" | "right" | "full";

export type AggregateFunction = "sum" | "count" | "avg" | "min" | "max";

export interface FilterCondition {
  column: string;
  op:
    | "="
    | "!="
    | ">"
    | "<"
    | ">="
    | "<="
    | "LIKE"
    | "IN"
    | "NOT IN"
    | "IS NULL"
    | "IS NOT NULL";
  value: any;
}

export interface AggregateConfig {
  column: string;
  function: AggregateFunction;
  alias?: string;
}

export type TransformationType =
  | "sorter"
  | "expression"
  | "data_cleansing"
  | "rank"
  | "sequence_generator"
  | "window_functions"
  | "normalizer"
  | "json_parser"
  | "geolocation"
  | "data_validation"
  | "deduplication"
  | "basic";

export interface TransformConfig {
  target_column: string;
  expression: string;
  columns?: string[];
  separator?: string;
  transformationType?: TransformationType;
  config?: any;
}

export interface SourceNodeData {
  type: "source";
  table?: string;
  schema?: string;
  query?: string;
  connectionString?: string;
  dbEngine?: string;
}

export interface JoinNodeData {
  type: "join";
  joinType: JoinType;
  leftTable?: string;
  rightTable?: string;
  leftColumn?: string;
  rightColumn?: string;
  joinCondition?: string;
}

export interface FilterNodeData {
  type: "filter";
  conditions: FilterCondition[];
}

export interface AggregateNodeData {
  type: "aggregate";
  groupBy?: string[];
  aggregations: AggregateConfig[];
}

export interface TransformNodeData {
  type: "transform";
  transforms: TransformConfig[];
}

export interface LookupNodeData {
  type: "lookup";
  lookupTable?: string;
  lookupSchema?: string;
  sourceColumns: string[];
  lookupColumns: string[];
  returnColumns: string[];
}

export interface TargetNodeData {
  type: "target";
  schema?: string;
  table?: string;
  connectionString?: string;
  dbEngine?: string;
  loadStrategy?: "TRUNCATE" | "APPEND" | "UPSERT";
}

export type PipelineNodeData =
  | SourceNodeData
  | JoinNodeData
  | FilterNodeData
  | AggregateNodeData
  | TransformNodeData
  | LookupNodeData
  | TargetNodeData;

export interface PipelineNode {
  id: string;
  type: NodeType;
  data: PipelineNodeData;
  position: { x: number; y: number };
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface PipelineGraph {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}
