import { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import type {
  Node,
  Edge,
  Connection,
  NodeTypes
} from 'reactflow';
import { asciiColors } from '../../../ui/theme/asciiTheme';
import type { PipelineGraph, NodeType } from './types';
import { SourceNode } from './nodes/SourceNode';
import { JoinNode } from './nodes/JoinNode';
import { FilterNode } from './nodes/FilterNode';
import { AggregateNode } from './nodes/AggregateNode';
import { TransformNode } from './nodes/TransformNode';
import { LookupNode } from './nodes/LookupNode';
import { TargetNode } from './nodes/TargetNode';
import { NodeConfigModal } from './modals/NodeConfigModal';

const nodeTypes: NodeTypes = {
  source: SourceNode,
  join: JoinNode,
  filter: FilterNode,
  aggregate: AggregateNode,
  transform: TransformNode,
  lookup: LookupNode,
  target: TargetNode
};

interface VisualPipelineEditorProps {
  initialGraph?: PipelineGraph;
  onGraphChange?: (graph: PipelineGraph) => void;
  sourceConnectionString?: string;
  sourceDbEngine?: string;
  targetConnectionString?: string;
  targetDbEngine?: string;
  targetSchema?: string;
  targetTable?: string;
}

export const VisualPipelineEditor = ({
  initialGraph,
  onGraphChange,
  sourceConnectionString,
  sourceDbEngine,
  targetConnectionString,
  targetDbEngine,
  targetSchema,
  targetTable
}: VisualPipelineEditorProps) => {
  const initialNodes: Node[] = useMemo(() => {
    if (initialGraph?.nodes) {
      return initialGraph.nodes.map(n => ({
        id: n.id,
        type: n.type,
        data: n.data,
        position: n.position
      }));
    }
    return [];
  }, [initialGraph]);

  const initialEdges: Edge[] = useMemo(() => {
    if (initialGraph?.edges) {
      return initialGraph.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle
      }));
    }
    return [];
  }, [initialGraph]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = addEdge(params, edges);
      setEdges(newEdge);
      if (onGraphChange) {
        onGraphChange({
          nodes: nodes.map(n => ({
            id: n.id,
            type: n.type as NodeType,
            data: n.data as any,
            position: n.position
          })),
          edges: newEdge.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle || undefined,
            targetHandle: e.targetHandle || undefined
          }))
        });
      }
    },
    [edges, nodes, onGraphChange, setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setConfigModalOpen(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setConfigModalOpen(false);
  }, []);

  const addNode = useCallback((type: NodeType, position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: {
        type,
        ...(type === 'source' && {
          connectionString: sourceConnectionString,
          dbEngine: sourceDbEngine
        }),
        ...(type === 'target' && {
          schema: targetSchema,
          table: targetTable,
          connectionString: targetConnectionString,
          dbEngine: targetDbEngine,
          loadStrategy: 'TRUNCATE'
        }),
        ...(type === 'join' && { joinType: 'inner' }),
        ...(type === 'filter' && { conditions: [] }),
        ...(type === 'aggregate' && { aggregations: [] }),
        ...(type === 'transform' && { transforms: [] }),
        ...(type === 'lookup' && { sourceColumns: [], lookupColumns: [], returnColumns: [] })
      }
    };

    setNodes((nds) => {
      const newNodes = [...nds, newNode];
      if (onGraphChange) {
        onGraphChange({
          nodes: newNodes.map(n => ({
            id: n.id,
            type: n.type as NodeType,
            data: n.data as any,
            position: n.position
          })),
          edges: edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle || undefined,
            targetHandle: e.targetHandle || undefined
          }))
        });
      }
      return newNodes;
    });
  }, [sourceConnectionString, sourceDbEngine, targetConnectionString, targetDbEngine, targetSchema, targetTable, edges, onGraphChange, setNodes]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter(n => n.id !== nodeId));
    setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (onGraphChange) {
      const newNodes = nodes.filter(n => n.id !== nodeId);
      const newEdges = edges.filter(e => e.source !== nodeId && e.target !== nodeId);
      onGraphChange({
        nodes: newNodes.map(n => ({
          id: n.id,
          type: n.type as NodeType,
          data: n.data as any,
          position: n.position
        })),
        edges: newEdges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle || undefined,
          targetHandle: e.targetHandle || undefined
        }))
      });
    }
  }, [nodes, edges, onGraphChange, setNodes, setEdges]);

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: asciiColors.background,
        border: `1px solid ${asciiColors.border}`,
        borderRadius: 4,
        padding: 12,
        fontFamily: 'Consolas',
        fontSize: 11
      }}>
        <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 4 }}>
          Add Component
        </div>
        {(['source', 'join', 'filter', 'aggregate', 'transform', 'lookup', 'target'] as NodeType[]).map(type => (
          <button
            key={type}
            onClick={() => addNode(type, { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 })}
            style={{
              padding: '6px 12px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              cursor: 'pointer',
              fontSize: 10,
              textTransform: 'uppercase',
              fontFamily: 'Consolas'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = asciiColors.accent;
              e.currentTarget.style.color = asciiColors.background;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = asciiColors.backgroundSoft;
              e.currentTarget.style.color = asciiColors.foreground;
            }}
          >
            + {type}
          </button>
        ))}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        style={{ background: asciiColors.background }}
      >
        <Controls style={{ background: asciiColors.backgroundSoft, border: `1px solid ${asciiColors.border}` }} />
        <MiniMap 
          style={{ background: asciiColors.backgroundSoft, border: `1px solid ${asciiColors.border}` }}
          nodeColor={asciiColors.accent}
        />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} color={asciiColors.border} />
      </ReactFlow>

      {configModalOpen && selectedNode && (
        <NodeConfigModal
          nodeId={selectedNode.id}
          nodeType={selectedNode.type as string}
          nodeData={selectedNode.data as any}
          onClose={() => {
            setConfigModalOpen(false);
            setSelectedNode(null);
          }}
          onSave={(nodeId, data) => {
            setNodes((nds) => {
              const newNodes = nds.map((n) =>
                n.id === nodeId ? { ...n, data } : n
              );
              if (onGraphChange) {
                onGraphChange({
                  nodes: newNodes.map((n) => ({
                    id: n.id,
                    type: n.type as NodeType,
                    data: n.data as any,
                    position: n.position,
                  })),
                  edges: edges.map((e) => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    sourceHandle: e.sourceHandle || undefined,
                    targetHandle: e.targetHandle || undefined,
                  })),
                });
              }
              return newNodes;
            });
            setConfigModalOpen(false);
            setSelectedNode(null);
          }}
          onDelete={(nodeId) => {
            deleteNode(nodeId);
            setConfigModalOpen(false);
            setSelectedNode(null);
          }}
          targetSchema={targetSchema}
          targetTable={targetTable}
        />
      )}
    </div>
  );
};

