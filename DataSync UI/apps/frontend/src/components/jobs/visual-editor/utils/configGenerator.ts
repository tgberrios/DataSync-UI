import type {
  PipelineGraph,
  TransformNodeData,
  FilterNodeData,
  AggregateNodeData,
  JoinNodeData,
  LookupNodeData,
} from "../types";

export function generateTransformConfig(
  graph: PipelineGraph
): Record<string, any> {
  const { nodes } = graph;

  const config: Record<string, any> = {
    transformations: [],
  };

  // Process nodes in order (based on edges if available)
  nodes.forEach((node) => {
    switch (node.type) {
      case "transform": {
        const transformData = node.data as TransformNodeData;
        if (transformData.transforms && transformData.transforms.length > 0) {
          transformData.transforms.forEach((transform) => {
            const transformType = transform.transformationType || 'basic';
            
            if (transformType === 'basic') {
              config.transformations.push({
                type: "transform",
                config: {
                  target_column: transform.target_column,
                  expression: transform.expression,
                  columns: transform.columns,
                  separator: transform.separator,
                },
              });
            } else {
              const transformConfig = transform.config || {};
              
              switch (transformType) {
                case 'sorter':
                  config.transformations.push({
                    type: 'sorter',
                    config: {
                      sort_columns: transformConfig.sort_columns || []
                    }
                  });
                  break;
                case 'expression':
                  config.transformations.push({
                    type: 'expression',
                    config: {
                      expressions: transformConfig.expressions || []
                    }
                  });
                  break;
                case 'data_cleansing':
                  config.transformations.push({
                    type: 'data_cleansing',
                    config: {
                      rules: transformConfig.rules || []
                    }
                  });
                  break;
                case 'rank':
                  config.transformations.push({
                    type: 'rank',
                    config: {
                      rank_type: transformConfig.rank_type || 'top_n',
                      order_column: transformConfig.order_column || '',
                      n: transformConfig.n || 10,
                      partition_by: transformConfig.partition_by || []
                    }
                  });
                  break;
                case 'sequence_generator':
                  config.transformations.push({
                    type: 'sequence_generator',
                    config: {
                      target_column: transformConfig.target_column || '',
                      start_value: transformConfig.start_value || 1,
                      increment: transformConfig.increment || 1
                    }
                  });
                  break;
                case 'window_functions':
                  config.transformations.push({
                    type: 'window_functions',
                    config: {
                      windows: transformConfig.windows || []
                    }
                  });
                  break;
                case 'normalizer':
                  config.transformations.push({
                    type: 'normalizer',
                    config: {
                      columns_to_denormalize: transformConfig.columns_to_denormalize || [],
                      key_column_name: transformConfig.key_column_name || 'key',
                      value_column_name: transformConfig.value_column_name || 'value'
                    }
                  });
                  break;
                case 'json_parser':
                  config.transformations.push({
                    type: 'json_parser',
                    config: {
                      source_column: transformConfig.source_column || '',
                      format: transformConfig.format || 'json',
                      fields_to_extract: transformConfig.fields_to_extract || []
                    }
                  });
                  break;
                case 'geolocation':
                  config.transformations.push({
                    type: 'geolocation',
                    config: {
                      operation: transformConfig.operation || 'distance',
                      target_column: transformConfig.target_column || 'geolocation_result',
                      ...(transformConfig.operation === 'distance' ? {
                        point1_column: transformConfig.point1_column || '',
                        point2_column: transformConfig.point2_column || ''
                      } : {}),
                      ...(transformConfig.operation === 'point_in_polygon' ? {
                        point_column: transformConfig.point_column || '',
                        polygon: transformConfig.polygon || []
                      } : {})
                    }
                  });
                  break;
                case 'data_validation':
                  config.transformations.push({
                    type: 'data_validation',
                    config: {
                      validation_type: transformConfig.validation_type || 'email',
                      source_column: transformConfig.source_column || '',
                      target_column: transformConfig.target_column || '',
                      is_valid_column: transformConfig.is_valid_column || ''
                    }
                  });
                  break;
                case 'deduplication':
                  config.transformations.push({
                    type: 'deduplication',
                    config: {
                      key_columns: transformConfig.key_columns || [],
                      method: transformConfig.method || 'exact',
                      similarity_threshold: transformConfig.similarity_threshold || 0.8,
                      keep_strategy: transformConfig.keep_strategy || 'first'
                    }
                  });
                  break;
              }
            }
          });
        }
        break;
      }

      case "filter": {
        const filterData = node.data as FilterNodeData;
        if (filterData.conditions && filterData.conditions.length > 0) {
          config.transformations.push({
            type: "filter",
            config: {
              conditions: filterData.conditions.map((condition) => ({
                column: condition.column,
                op: condition.op,
                value: condition.value,
              })),
            },
          });
        }
        break;
      }

      case "aggregate": {
        const aggregateData = node.data as AggregateNodeData;
        if (aggregateData.aggregations && aggregateData.aggregations.length > 0) {
          config.transformations.push({
            type: "aggregate",
            config: {
              group_by: aggregateData.groupBy || [],
              aggregations: aggregateData.aggregations.map((agg) => ({
                column: agg.column,
                function: agg.function,
                alias: agg.alias || `${agg.column}_${agg.function}`,
              })),
            },
          });
        }
        break;
      }

      case "join": {
        const joinData = node.data as JoinNodeData;
        if (joinData.leftColumn && joinData.rightColumn) {
          // Note: right_data would need to come from another source node
          // For now, we'll structure it for the backend to handle
          config.transformations.push({
            type: "join",
            config: {
              join_type: joinData.joinType || "inner",
              left_columns: joinData.leftColumn ? [joinData.leftColumn] : [],
              right_columns: joinData.rightColumn ? [joinData.rightColumn] : [],
              // right_data will be populated from the right source node
            },
          });
        }
        break;
      }

      case "lookup": {
        const lookupData = node.data as LookupNodeData;
        if (lookupData.lookupTable && lookupData.sourceColumns.length > 0) {
          config.transformations.push({
            type: "lookup",
            config: {
              lookup_table: lookupData.lookupTable,
              lookup_schema: lookupData.lookupSchema || "",
              source_columns: lookupData.sourceColumns,
              lookup_columns: lookupData.lookupColumns,
              return_columns: lookupData.returnColumns,
              // connection_string and db_engine would come from lookup node config
            },
          });
        }
        break;
      }

      case "router": {
        // Router transformation - would need router node data type
        // For now, placeholder
        break;
      }

      case "union": {
        // Union transformation - would need union node data type
        // For now, placeholder
        break;
      }

      case "sorter": {
        // Sorter transformation
        const sorterData = node.data as any;
        if (sorterData.sortColumns && sorterData.sortColumns.length > 0) {
          config.transformations.push({
            type: "sorter",
            config: {
              sort_columns: sorterData.sortColumns.map((col: any) => ({
                column: col.column,
                order: col.order || "asc",
              })),
            },
          });
        }
        break;
      }

      case "expression": {
        // Expression transformation
        const exprData = node.data as any;
        if (exprData.expressions && exprData.expressions.length > 0) {
          config.transformations.push({
            type: "expression",
            config: {
              expressions: exprData.expressions.map((expr: any) => ({
                target_column: expr.target_column,
                expression: expr.expression,
                type: expr.type || "auto",
              })),
            },
          });
        }
        break;
      }

      case "data_cleansing": {
        // Data Cleansing transformation
        const cleansingData = node.data as any;
        if (cleansingData.rules && cleansingData.rules.length > 0) {
          config.transformations.push({
            type: "data_cleansing",
            config: {
              rules: cleansingData.rules.map((rule: any) => ({
                column: rule.column,
                operations: rule.operations || [],
              })),
            },
          });
        }
        break;
      }

      case "rank": {
        // Rank transformation
        const rankData = node.data as any;
        if (rankData.orderColumn) {
          config.transformations.push({
            type: "rank",
            config: {
              rank_type: rankData.rankType || "top_n",
              order_column: rankData.orderColumn,
              n: rankData.n || 10,
              partition_by: rankData.partitionBy || [],
            },
          });
        }
        break;
      }

      case "sequence_generator": {
        // Sequence Generator transformation
        const seqData = node.data as any;
        if (seqData.targetColumn) {
          config.transformations.push({
            type: "sequence_generator",
            config: {
              target_column: seqData.targetColumn,
              start_value: seqData.startValue || 1,
              increment: seqData.increment || 1,
            },
          });
        }
        break;
      }

      case "window_functions": {
        // Window Functions transformation
        const windowData = node.data as any;
        if (windowData.windows && windowData.windows.length > 0) {
          config.transformations.push({
            type: "window_functions",
            config: {
              windows: windowData.windows.map((win: any) => ({
                function: win.function,
                target_column: win.targetColumn,
                source_column: win.sourceColumn,
                partition_by: win.partitionBy || [],
                order_by: win.orderBy || [],
                offset: win.offset || 1,
                default_value: win.defaultValue || null,
              })),
            },
          });
        }
        break;
      }

      case "normalizer": {
        // Normalizer transformation
        const normalizerData = node.data as any;
        if (normalizerData.columnsToDenormalize && normalizerData.columnsToDenormalize.length > 0) {
          config.transformations.push({
            type: "normalizer",
            config: {
              columns_to_denormalize: normalizerData.columnsToDenormalize,
              key_column_name: normalizerData.keyColumnName || "key",
              value_column_name: normalizerData.valueColumnName || "value",
            },
          });
        }
        break;
      }

      case "json_parser": {
        // JSON/XML Parser transformation
        const parserData = node.data as any;
        if (parserData.sourceColumn && parserData.fieldsToExtract) {
          config.transformations.push({
            type: "json_parser",
            config: {
              source_column: parserData.sourceColumn,
              format: parserData.format || "json",
              fields_to_extract: parserData.fieldsToExtract || [],
            },
          });
        }
        break;
      }

      case "geolocation": {
        // Geolocation transformation
        const geoData = node.data as any;
        if (geoData.operation) {
          const geoConfig: any = {
            operation: geoData.operation,
            target_column: geoData.targetColumn || "geolocation_result",
          };
          
          if (geoData.operation === "distance") {
            geoConfig.point1_column = geoData.point1Column;
            geoConfig.point2_column = geoData.point2Column;
          } else if (geoData.operation === "point_in_polygon") {
            geoConfig.point_column = geoData.pointColumn;
            geoConfig.polygon = geoData.polygon;
          }
          
          config.transformations.push({
            type: "geolocation",
            config: geoConfig,
          });
        }
        break;
      }

      case "data_validation": {
        // Data Validation transformation
        const validationData = node.data as any;
        if (validationData.validationType && validationData.sourceColumn) {
          config.transformations.push({
            type: "data_validation",
            config: {
              validation_type: validationData.validationType,
              source_column: validationData.sourceColumn,
              target_column: validationData.targetColumn || validationData.sourceColumn + "_validated",
              is_valid_column: validationData.isValidColumn || validationData.sourceColumn + "_is_valid",
            },
          });
        }
        break;
      }

      case "deduplication": {
        // Deduplication transformation
        const dedupData = node.data as any;
        if (dedupData.keyColumns && dedupData.keyColumns.length > 0) {
          config.transformations.push({
            type: "deduplication",
            config: {
              key_columns: dedupData.keyColumns,
              method: dedupData.method || "exact",
              similarity_threshold: dedupData.similarityThreshold || 0.8,
              keep_strategy: dedupData.keepStrategy || "first",
            },
          });
        }
        break;
      }
    }
  });

  return config;
}
