import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { metadataApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const LineageGraphView: React.FC = () => {
  const [graphData, setGraphData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchGraphData = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setError(null);
      const data = await metadataApi.getLineageGraph();
      if (isMountedRef.current) {
        setGraphData(data);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        if (err?.response?.status === 404) {
          setGraphData({ nodes: [], edges: [] });
          return;
        }
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    setLoading(true);
    fetchGraphData();

    refreshIntervalRef.current = setInterval(() => {
      fetchGraphData();
    }, 30000);

    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchGraphData]);

  // Convert graph data to ReactFlow format
  const { nodes, edges } = useMemo(() => {
    if (!graphData || !graphData.nodes || !graphData.edges) {
      return { nodes: [], edges: [] };
    }

    const flowNodes: Node[] = graphData.nodes.map((node: any, index: number) => {
      // Calculate position using a simple grid layout
      const cols = Math.ceil(Math.sqrt(graphData.nodes.length));
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      return {
        id: node.id || `node-${index}`,
        type: 'default',
        position: { x: col * 250, y: row * 150 },
        data: {
          label: node.label || `${node.schema || ''}.${node.table || ''}`,
          type: node.type,
          schema: node.schema,
          table: node.table,
          column: node.column,
          dbEngine: node.dbEngine,
        },
        style: {
          background: node.type === 'table' ? asciiColors.accent : 
                     node.type === 'transformation' ? '#4a5568' :
                     node.type === 'workflow' ? '#2d3748' : asciiColors.background,
          color: '#ffffff',
          border: `2px solid ${asciiColors.border}`,
          borderRadius: '4px',
          padding: '10px',
          fontSize: '12px',
          fontFamily: 'Consolas, monospace',
          minWidth: '150px',
        },
      };
    });

    const flowEdges: Edge[] = graphData.edges.map((edge: any, index: number) => ({
      id: edge.id || `edge-${index}`,
      source: edge.source || edge.sourceId,
      target: edge.target || edge.targetId,
      type: 'smoothstep',
      animated: edge.type === 'transform' || edge.type === 'output',
      label: edge.label || edge.type,
      style: {
        stroke: edge.type === 'input' ? '#48bb78' :
               edge.type === 'output' ? '#ed8936' :
               edge.type === 'transform' ? '#9f7aea' : asciiColors.border,
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edge.type === 'input' ? '#48bb78' :
               edge.type === 'output' ? '#ed8936' :
               edge.type === 'transform' ? '#9f7aea' : asciiColors.border,
      },
    }));

    return { nodes: flowNodes, edges: flowEdges };
  }, [graphData]);

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: theme.spacing.md 
      }}>
        <h3 style={{ fontSize: 14, margin: 0 }}>Lineage Graph</h3>
        {graphData && (
          <div style={{ fontSize: 11, color: asciiColors.muted }}>
            Nodes: {graphData.nodes?.length || 0} | Edges: {graphData.edges?.length || 0}
          </div>
        )}
      </div>

      {error && (
        <div style={{
          padding: theme.spacing.md,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          backgroundColor: asciiColors.backgroundSoft,
          color: asciiColors.foreground,
          marginBottom: theme.spacing.md
        }}>
          {error}
        </div>
      )}

      {graphData && nodes.length > 0 ? (
        <div style={{
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          backgroundColor: asciiColors.background,
          height: '600px',
          width: '100%'
        }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            connectionMode={ConnectionMode.Loose}
            fitView
            style={{ background: asciiColors.background }}
          >
            <Background color={asciiColors.border} gap={16} />
            <Controls 
              style={{
                button: {
                  backgroundColor: asciiColors.backgroundSoft,
                  border: `1px solid ${asciiColors.border}`,
                  color: asciiColors.foreground,
                }
              }}
            />
            <MiniMap
              nodeColor={(node) => {
                const nodeType = node.data?.type;
                return nodeType === 'table' ? asciiColors.accent : 
                       nodeType === 'transformation' ? '#4a5568' :
                       nodeType === 'workflow' ? '#2d3748' : asciiColors.background;
              }}
              style={{
                backgroundColor: asciiColors.backgroundSoft,
                border: `1px solid ${asciiColors.border}`,
              }}
            />
          </ReactFlow>
        </div>
      ) : graphData && nodes.length === 0 ? (
        <div style={{
          padding: theme.spacing.lg,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          backgroundColor: asciiColors.backgroundSoft,
          textAlign: 'center',
          color: asciiColors.muted,
          fontSize: 12
        }}>
          No lineage data available. The graph will populate as lineage is extracted from your databases.
        </div>
      ) : null}
    </div>
  );
};

export default LineageGraphView;
