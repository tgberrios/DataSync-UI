import { describe, it, expect } from '@jest/globals';
import { generateTransformConfig } from './configGenerator';
import type { PipelineGraph, AggregateNodeData, JoinNodeData, LookupNodeData, FilterNodeData, TransformNodeData } from '../types';

describe('configGenerator', () => {
  it('should generate empty config for empty graph', () => {
    const graph: PipelineGraph = {
      nodes: [],
      edges: []
    };
    
    const config = generateTransformConfig(graph);
    expect(config).toEqual({ transformations: [] });
  });

  it('should generate aggregate transformation config', () => {
    const aggregateData: AggregateNodeData = {
      type: 'aggregate',
      groupBy: ['category'],
      aggregations: [
        { column: 'value', function: 'sum', alias: 'total' },
        { column: 'value', function: 'avg', alias: 'average' }
      ]
    };

    const graph: PipelineGraph = {
      nodes: [
        {
          id: '1',
          type: 'aggregate',
          data: aggregateData,
          position: { x: 0, y: 0 }
        }
      ],
      edges: []
    };

    const config = generateTransformConfig(graph);
    expect(config.transformations).toHaveLength(1);
    expect(config.transformations[0].type).toBe('aggregate');
    expect(config.transformations[0].config.group_by).toEqual(['category']);
    expect(config.transformations[0].config.aggregations).toHaveLength(2);
  });

  it('should generate join transformation config', () => {
    const joinData: JoinNodeData = {
      type: 'join',
      joinType: 'inner',
      leftColumn: 'id',
      rightColumn: 'id'
    };

    const graph: PipelineGraph = {
      nodes: [
        {
          id: '1',
          type: 'join',
          data: joinData,
          position: { x: 0, y: 0 }
        }
      ],
      edges: []
    };

    const config = generateTransformConfig(graph);
    expect(config.transformations).toHaveLength(1);
    expect(config.transformations[0].type).toBe('join');
    expect(config.transformations[0].config.join_type).toBe('inner');
    expect(config.transformations[0].config.left_columns).toEqual(['id']);
  });

  it('should generate lookup transformation config', () => {
    const lookupData: LookupNodeData = {
      type: 'lookup',
      lookupTable: 'departments',
      lookupSchema: 'public',
      sourceColumns: ['id'],
      lookupColumns: ['id'],
      returnColumns: ['department']
    };

    const graph: PipelineGraph = {
      nodes: [
        {
          id: '1',
          type: 'lookup',
          data: lookupData,
          position: { x: 0, y: 0 }
        }
      ],
      edges: []
    };

    const config = generateTransformConfig(graph);
    expect(config.transformations).toHaveLength(1);
    expect(config.transformations[0].type).toBe('lookup');
    expect(config.transformations[0].config.lookup_table).toBe('departments');
    expect(config.transformations[0].config.source_columns).toEqual(['id']);
  });

  it('should generate filter transformation config', () => {
    const filterData: FilterNodeData = {
      type: 'filter',
      conditions: [
        { column: 'status', op: '=', value: 'active' },
        { column: 'age', op: '>', value: 18 }
      ]
    };

    const graph: PipelineGraph = {
      nodes: [
        {
          id: '1',
          type: 'filter',
          data: filterData,
          position: { x: 0, y: 0 }
        }
      ],
      edges: []
    };

    const config = generateTransformConfig(graph);
    expect(config.transformations).toHaveLength(1);
    expect(config.transformations[0].type).toBe('filter');
    expect(config.transformations[0].config.conditions).toHaveLength(2);
  });

  it('should generate multiple transformations in order', () => {
    const graph: PipelineGraph = {
      nodes: [
        {
          id: '1',
          type: 'filter',
          data: {
            type: 'filter',
            conditions: [{ column: 'status', op: '=', value: 'active' }]
          },
          position: { x: 0, y: 0 }
        },
        {
          id: '2',
          type: 'aggregate',
          data: {
            type: 'aggregate',
            aggregations: [{ column: 'value', function: 'sum' }]
          },
          position: { x: 0, y: 100 }
        }
      ],
      edges: []
    };

    const config = generateTransformConfig(graph);
    expect(config.transformations).toHaveLength(2);
    expect(config.transformations[0].type).toBe('filter');
    expect(config.transformations[1].type).toBe('aggregate');
  });
});
