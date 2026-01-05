import { useState, useEffect } from 'react';
import { asciiColors, ascii } from '../../../../ui/theme/asciiTheme';
import type { PipelineNodeData, SourceNodeData, JoinNodeData, FilterNodeData, AggregateNodeData, TransformNodeData, TargetNodeData, FilterCondition, AggregateConfig } from '../types';

interface NodeConfigModalProps {
  nodeId: string;
  nodeType: string;
  nodeData: PipelineNodeData;
  onClose: () => void;
  onSave: (nodeId: string, data: PipelineNodeData) => void;
  onDelete?: (nodeId: string) => void;
  sourceConnectionString?: string;
  sourceDbEngine?: string;
  targetConnectionString?: string;
  targetDbEngine?: string;
  targetSchema?: string;
  targetTable?: string;
}

export const NodeConfigModal = ({
  nodeId,
  nodeType,
  nodeData,
  onClose,
  onSave,
  onDelete,
  targetSchema,
  targetTable
}: NodeConfigModalProps) => {
  const [formData, setFormData] = useState<any>(nodeData);

  useEffect(() => {
    setFormData(nodeData);
  }, [nodeData]);

  const handleSave = () => {
    onSave(nodeId, formData as PipelineNodeData);
    onClose();
  };

  const renderSourceConfig = () => {
    const data = formData as SourceNodeData;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
            Schema (optional)
          </label>
          <input
            type="text"
            value={data.schema || ''}
            onChange={(e) => setFormData({ ...formData, schema: e.target.value })}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 11
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
            Table *
          </label>
          <input
            type="text"
            value={data.table || ''}
            onChange={(e) => setFormData({ ...formData, table: e.target.value })}
            placeholder="table_name"
            style={{
              width: '100%',
              padding: '6px 10px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 11
            }}
          />
        </div>
        <div style={{ fontSize: 10, color: asciiColors.muted, fontFamily: 'Consolas' }}>
          OR
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
            Custom Query
          </label>
          <textarea
            value={data.query || ''}
            onChange={(e) => setFormData({ ...formData, query: e.target.value })}
            placeholder="SELECT * FROM ..."
            rows={4}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 11,
              resize: 'vertical'
            }}
          />
        </div>
      </div>
    );
  };

  const renderJoinConfig = () => {
    const data = formData as JoinNodeData;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
            Join Type *
          </label>
          <select
            value={data.joinType || 'inner'}
            onChange={(e) => setFormData({ ...formData, joinType: e.target.value })}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 11
            }}
          >
            <option value="inner">INNER JOIN</option>
            <option value="left">LEFT JOIN</option>
            <option value="right">RIGHT JOIN</option>
            <option value="full">FULL OUTER JOIN</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
            Left Table
          </label>
          <input
            type="text"
            value={data.leftTable || ''}
            onChange={(e) => setFormData({ ...formData, leftTable: e.target.value })}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 11
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
            Left Column
          </label>
          <input
            type="text"
            value={data.leftColumn || ''}
            onChange={(e) => setFormData({ ...formData, leftColumn: e.target.value })}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 11
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
            Right Table
          </label>
          <input
            type="text"
            value={data.rightTable || ''}
            onChange={(e) => setFormData({ ...formData, rightTable: e.target.value })}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 11
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
            Right Column
          </label>
          <input
            type="text"
            value={data.rightColumn || ''}
            onChange={(e) => setFormData({ ...formData, rightColumn: e.target.value })}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 11
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
            Custom Join Condition (optional)
          </label>
          <input
            type="text"
            value={data.joinCondition || ''}
            onChange={(e) => setFormData({ ...formData, joinCondition: e.target.value })}
            placeholder="table1.col1 = table2.col2"
            style={{
              width: '100%',
              padding: '6px 10px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 11
            }}
          />
        </div>
      </div>
    );
  };

  const renderFilterConfig = () => {
    const data = formData as FilterNodeData;
    const conditions = data.conditions || [];
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>
            Filter Conditions
          </label>
          <button
            onClick={() => setFormData({ ...formData, conditions: [...conditions, { column: '', op: '=' as const, value: '' }] })}
            style={{
              padding: '4px 8px',
              border: `1px solid ${asciiColors.accent}`,
              borderRadius: 2,
              background: asciiColors.accent,
              color: asciiColors.background,
              cursor: 'pointer',
              fontSize: 10,
              fontFamily: 'Consolas',
              fontWeight: 600
            }}
          >
            + Add Condition
          </button>
        </div>
        {conditions.map((cond: FilterCondition, idx: number) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={cond.column || ''}
              onChange={(e) => {
                const newConditions = [...conditions];
                newConditions[idx] = { ...newConditions[idx], column: e.target.value };
                setFormData({ ...formData, conditions: newConditions });
              }}
              placeholder="column_name"
              style={{
                padding: '6px 10px',
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                background: asciiColors.backgroundSoft,
                color: asciiColors.foreground,
                fontFamily: 'Consolas',
                fontSize: 11
              }}
            />
            <select
              value={cond.op || '='}
              onChange={(e) => {
                const newConditions = [...conditions];
                newConditions[idx] = { ...newConditions[idx], op: e.target.value as FilterCondition['op'] };
                setFormData({ ...formData, conditions: newConditions });
              }}
              style={{
                padding: '6px 10px',
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                background: asciiColors.backgroundSoft,
                color: asciiColors.foreground,
                fontFamily: 'Consolas',
                fontSize: 11
              }}
            >
              <option value="=">=</option>
              <option value="!=">!=</option>
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
              <option value=">=">&gt;=</option>
              <option value="<=">&lt;=</option>
              <option value="LIKE">LIKE</option>
              <option value="IN">IN</option>
              <option value="NOT IN">NOT IN</option>
              <option value="IS NULL">IS NULL</option>
              <option value="IS NOT NULL">IS NOT NULL</option>
            </select>
            <input
              type="text"
              value={cond.value !== null && cond.value !== undefined ? String(cond.value) : ''}
              onChange={(e) => {
                const newConditions = [...conditions];
                newConditions[idx] = { ...newConditions[idx], value: e.target.value };
                setFormData({ ...formData, conditions: newConditions });
              }}
              placeholder="value"
              disabled={cond.op === 'IS NULL' || cond.op === 'IS NOT NULL'}
              style={{
                padding: '6px 10px',
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                background: asciiColors.backgroundSoft,
                color: asciiColors.foreground,
                fontFamily: 'Consolas',
                fontSize: 11,
                opacity: (cond.op === 'IS NULL' || cond.op === 'IS NOT NULL') ? 0.5 : 1
              }}
            />
            <button
              onClick={() => {
                const newConditions = conditions.filter((_: any, i: number) => i !== idx);
                setFormData({ ...formData, conditions: newConditions });
              }}
              style={{
                padding: '4px 8px',
                border: `1px solid ${asciiColors.danger}`,
                borderRadius: 2,
                background: asciiColors.danger,
                color: asciiColors.background,
                cursor: 'pointer',
                fontSize: 10,
                fontFamily: 'Consolas',
                fontWeight: 600
              }}
            >
              ×
            </button>
          </div>
        ))}
        {conditions.length === 0 && (
          <div style={{ fontSize: 10, color: asciiColors.muted, fontFamily: 'Consolas', fontStyle: 'italic' }}>
            No conditions added. Click "Add Condition" to add filters.
          </div>
        )}
      </div>
    );
  };

  const renderAggregateConfig = () => {
    const data = formData as AggregateNodeData;
    const aggregations = data.aggregations || [];
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
            GROUP BY Columns (comma-separated)
          </label>
          <input
            type="text"
            value={data.groupBy?.join(', ') || ''}
            onChange={(e) => setFormData({ ...formData, groupBy: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="column1, column2"
            style={{
              width: '100%',
              padding: '6px 10px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 11
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>
            Aggregations
          </label>
          <button
            onClick={() => setFormData({ ...formData, aggregations: [...aggregations, { column: '', function: 'sum' as const }] })}
            style={{
              padding: '4px 8px',
              border: `1px solid ${asciiColors.accent}`,
              borderRadius: 2,
              background: asciiColors.accent,
              color: asciiColors.background,
              cursor: 'pointer',
              fontSize: 10,
              fontFamily: 'Consolas',
              fontWeight: 600
            }}
          >
            + Add Aggregation
          </button>
        </div>
        {aggregations.map((agg: AggregateConfig, idx: number) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8, alignItems: 'center' }}>
            <select
              value={agg.function || 'sum'}
              onChange={(e) => {
                const newAggs = [...aggregations];
                newAggs[idx] = { ...newAggs[idx], function: e.target.value as AggregateConfig['function'] };
                setFormData({ ...formData, aggregations: newAggs });
              }}
              style={{
                padding: '6px 10px',
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                background: asciiColors.backgroundSoft,
                color: asciiColors.foreground,
                fontFamily: 'Consolas',
                fontSize: 11
              }}
            >
              <option value="sum">SUM</option>
              <option value="count">COUNT</option>
              <option value="avg">AVG</option>
              <option value="min">MIN</option>
              <option value="max">MAX</option>
            </select>
            <input
              type="text"
              value={agg.column || ''}
              onChange={(e) => {
                const newAggs = [...aggregations];
                newAggs[idx] = { ...newAggs[idx], column: e.target.value };
                setFormData({ ...formData, aggregations: newAggs });
              }}
              placeholder="column_name"
              style={{
                padding: '6px 10px',
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                background: asciiColors.backgroundSoft,
                color: asciiColors.foreground,
                fontFamily: 'Consolas',
                fontSize: 11
              }}
            />
            <button
              onClick={() => {
                const newAggs = aggregations.filter((_: any, i: number) => i !== idx);
                setFormData({ ...formData, aggregations: newAggs });
              }}
              style={{
                padding: '4px 8px',
                border: `1px solid ${asciiColors.danger}`,
                borderRadius: 2,
                background: asciiColors.danger,
                color: asciiColors.background,
                cursor: 'pointer',
                fontSize: 10,
                fontFamily: 'Consolas',
                fontWeight: 600
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderTransformConfig = () => {
    const data = formData as TransformNodeData;
    const transforms = data.transforms || [];
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>
            Transformations
          </label>
          <button
            onClick={() => setFormData({ ...formData, transforms: [...transforms, { target_column: '', expression: '' }] })}
            style={{
              padding: '4px 8px',
              border: `1px solid ${asciiColors.accent}`,
              borderRadius: 2,
              background: asciiColors.accent,
              color: asciiColors.background,
              cursor: 'pointer',
              fontSize: 10,
              fontFamily: 'Consolas',
              fontWeight: 600
            }}
          >
            + Add Transform
          </button>
        </div>
        {transforms.map((transform: any, idx: number) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, border: `1px solid ${asciiColors.border}`, borderRadius: 2 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <input
                type="text"
                value={transform.target_column || ''}
                onChange={(e) => {
                  const newTransforms = [...transforms];
                  newTransforms[idx] = { ...newTransforms[idx], target_column: e.target.value };
                  setFormData({ ...formData, transforms: newTransforms });
                }}
                placeholder="target_column_name"
                style={{
                  padding: '6px 10px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  background: asciiColors.backgroundSoft,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 11
                }}
              />
              <button
                onClick={() => {
                  const newTransforms = transforms.filter((_: any, i: number) => i !== idx);
                  setFormData({ ...formData, transforms: newTransforms });
                }}
                style={{
                  padding: '4px 8px',
                  border: `1px solid ${asciiColors.danger}`,
                  borderRadius: 2,
                  background: asciiColors.danger,
                  color: asciiColors.background,
                  cursor: 'pointer',
                  fontSize: 10,
                  fontFamily: 'Consolas',
                  fontWeight: 600
                }}
              >
                ×
              </button>
            </div>
            <textarea
              value={transform.expression || ''}
              onChange={(e) => {
                const newTransforms = [...transforms];
                newTransforms[idx] = { ...newTransforms[idx], expression: e.target.value };
                setFormData({ ...formData, transforms: newTransforms });
              }}
              placeholder="column1 + column2, UPPER(column3), etc."
              rows={2}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                background: asciiColors.backgroundSoft,
                color: asciiColors.foreground,
                fontFamily: 'Consolas',
                fontSize: 11,
                resize: 'vertical'
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderTargetConfig = () => {
    const data = formData as TargetNodeData;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
            Schema
          </label>
          <input
            type="text"
            value={data.schema || targetSchema || ''}
            onChange={(e) => setFormData({ ...formData, schema: e.target.value })}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 11
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
            Table *
          </label>
          <input
            type="text"
            value={data.table || targetTable || ''}
            onChange={(e) => setFormData({ ...formData, table: e.target.value })}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 11
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
            Load Strategy
          </label>
          <select
            value={data.loadStrategy || 'TRUNCATE'}
            onChange={(e) => setFormData({ ...formData, loadStrategy: e.target.value })}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 11
            }}
          >
            <option value="TRUNCATE">TRUNCATE (Delete all, then insert)</option>
            <option value="APPEND">APPEND (Insert new rows only)</option>
            <option value="UPSERT">UPSERT (Update or insert)</option>
          </select>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (nodeType) {
      case 'source':
        return renderSourceConfig();
      case 'join':
        return renderJoinConfig();
      case 'filter':
        return renderFilterConfig();
      case 'aggregate':
        return renderAggregateConfig();
      case 'transform':
        return renderTransformConfig();
      case 'target':
        return renderTargetConfig();
      default:
        return <div style={{ color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>No configuration available</div>;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        background: asciiColors.background,
        padding: 24,
        borderRadius: 2,
        width: '90%',
        maxWidth: 600,
        maxHeight: '90vh',
        overflowY: 'auto',
        border: `2px solid ${asciiColors.accent}`,
        fontFamily: 'Consolas'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          paddingBottom: 12,
          borderBottom: `2px solid ${asciiColors.border}`
        }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 600,
            color: asciiColors.accent,
            margin: 0,
            fontFamily: 'Consolas',
            textTransform: 'uppercase'
          }}>
            {ascii.blockFull} CONFIGURE {nodeType.toUpperCase()} NODE
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: asciiColors.foreground,
              fontSize: 20,
              cursor: 'pointer',
              padding: '0 8px'
            }}
          >
            ×
          </button>
        </div>
        
        {renderContent()}
        
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'space-between',
          marginTop: 20,
          paddingTop: 12,
          borderTop: `1px solid ${asciiColors.border}`
        }}>
          {onDelete && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this node?')) {
                  onDelete(nodeId);
                  onClose();
                }
              }}
              style={{
                padding: '8px 16px',
                border: `1px solid ${asciiColors.danger}`,
                borderRadius: 2,
                background: asciiColors.danger,
                color: asciiColors.background,
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'Consolas',
                fontWeight: 600
              }}
            >
              DELETE
            </button>
          )}
          <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                background: asciiColors.backgroundSoft,
                color: asciiColors.foreground,
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'Consolas',
                fontWeight: 600
              }}
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                border: `1px solid ${asciiColors.accent}`,
                borderRadius: 2,
                background: asciiColors.accent,
                color: asciiColors.background,
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'Consolas',
                fontWeight: 600
              }}
            >
              SAVE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

