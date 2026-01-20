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

  const updateTransformConfig = (idx: number, config: any) => {
    const data = formData as TransformNodeData;
    const transforms = data.transforms || [];
    const newTransforms = [...transforms];
    newTransforms[idx] = { ...newTransforms[idx], config: { ...newTransforms[idx].config, ...config } };
    setFormData({ ...formData, transforms: newTransforms });
  };

  const renderSorterConfig = (transform: any, idx: number, transforms: any[]) => {
    const config = transform.config || {};
    const sortColumns = config.sort_columns || [];
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Sort Columns</label>
        {sortColumns.map((col: any, colIdx: number) => (
          <div key={colIdx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8 }}>
            <input
              type="text"
              value={col.column || ''}
              onChange={(e) => {
                const newCols = [...sortColumns];
                newCols[colIdx] = { ...newCols[colIdx], column: e.target.value };
                updateTransformConfig(idx, { sort_columns: newCols });
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
              value={col.order || 'asc'}
              onChange={(e) => {
                const newCols = [...sortColumns];
                newCols[colIdx] = { ...newCols[colIdx], order: e.target.value };
                updateTransformConfig(idx, { sort_columns: newCols });
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
              <option value="asc">ASC</option>
              <option value="desc">DESC</option>
            </select>
            <button
              onClick={() => {
                const newCols = sortColumns.filter((_: any, i: number) => i !== colIdx);
                updateTransformConfig(idx, { sort_columns: newCols });
              }}
              style={{
                padding: '4px 8px',
                border: `1px solid ${asciiColors.danger}`,
                borderRadius: 2,
                background: asciiColors.danger,
                color: asciiColors.background,
                cursor: 'pointer',
                fontSize: 10,
                fontFamily: 'Consolas'
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => updateTransformConfig(idx, { sort_columns: [...sortColumns, { column: '', order: 'asc' }] })}
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
          + Add Sort Column
        </button>
      </div>
    );
  };

  const renderExpressionConfig = (transform: any, idx: number, transforms: any[]) => {
    const config = transform.config || {};
    const expressions = config.expressions || [];
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Expressions</label>
        {expressions.map((expr: any, exprIdx: number) => (
          <div key={exprIdx} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, border: `1px solid ${asciiColors.border}`, borderRadius: 2 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
              <input
                type="text"
                value={expr.target_column || ''}
                onChange={(e) => {
                  const newExprs = [...expressions];
                  newExprs[exprIdx] = { ...newExprs[exprIdx], target_column: e.target.value };
                  updateTransformConfig(idx, { expressions: newExprs });
                }}
                placeholder="target_column"
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
                value={expr.type || 'auto'}
                onChange={(e) => {
                  const newExprs = [...expressions];
                  newExprs[exprIdx] = { ...newExprs[exprIdx], type: e.target.value };
                  updateTransformConfig(idx, { expressions: newExprs });
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
                <option value="auto">Auto</option>
                <option value="math">Math</option>
                <option value="string">String</option>
                <option value="date">Date</option>
              </select>
              <button
                onClick={() => {
                  const newExprs = expressions.filter((_: any, i: number) => i !== exprIdx);
                  updateTransformConfig(idx, { expressions: newExprs });
                }}
                style={{
                  padding: '4px 8px',
                  border: `1px solid ${asciiColors.danger}`,
                  borderRadius: 2,
                  background: asciiColors.danger,
                  color: asciiColors.background,
                  cursor: 'pointer',
                  fontSize: 10,
                  fontFamily: 'Consolas'
                }}
              >
                ×
              </button>
            </div>
            <textarea
              value={expr.expression || ''}
              onChange={(e) => {
                const newExprs = [...expressions];
                newExprs[exprIdx] = { ...newExprs[exprIdx], expression: e.target.value };
                updateTransformConfig(idx, { expressions: newExprs });
              }}
              placeholder="UPPER({column1}), {column1} + {column2}, DATEADD({date}, 7)"
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
        <button
          onClick={() => updateTransformConfig(idx, { expressions: [...expressions, { target_column: '', expression: '', type: 'auto' }] })}
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
          + Add Expression
        </button>
      </div>
    );
  };

  const renderDataCleansingConfig = (transform: any, idx: number, transforms: any[]) => {
    const config = transform.config || {};
    const rules = config.rules || [];
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Cleansing Rules</label>
        {rules.map((rule: any, ruleIdx: number) => (
          <div key={ruleIdx} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, border: `1px solid ${asciiColors.border}`, borderRadius: 2 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <input
                type="text"
                value={rule.column || ''}
                onChange={(e) => {
                  const newRules = [...rules];
                  newRules[ruleIdx] = { ...newRules[ruleIdx], column: e.target.value };
                  updateTransformConfig(idx, { rules: newRules });
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
                  const newRules = rules.filter((_: any, i: number) => i !== ruleIdx);
                  updateTransformConfig(idx, { rules: newRules });
                }}
                style={{
                  padding: '4px 8px',
                  border: `1px solid ${asciiColors.danger}`,
                  borderRadius: 2,
                  background: asciiColors.danger,
                  color: asciiColors.background,
                  cursor: 'pointer',
                  fontSize: 10,
                  fontFamily: 'Consolas'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {['trim', 'uppercase', 'lowercase', 'remove_special', 'remove_whitespace', 'normalize_whitespace'].map(op => (
                <label key={op} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontFamily: 'Consolas' }}>
                  <input
                    type="checkbox"
                    checked={(rule.operations || []).includes(op)}
                    onChange={(e) => {
                      const newRules = [...rules];
                      const ops = newRules[ruleIdx].operations || [];
                      if (e.target.checked) {
                        newRules[ruleIdx] = { ...newRules[ruleIdx], operations: [...ops, op] };
                      } else {
                        newRules[ruleIdx] = { ...newRules[ruleIdx], operations: ops.filter((o: string) => o !== op) };
                      }
                      updateTransformConfig(idx, { rules: newRules });
                    }}
                  />
                  {op}
                </label>
              ))}
            </div>
          </div>
        ))}
        <button
          onClick={() => updateTransformConfig(idx, { rules: [...rules, { column: '', operations: [] }] })}
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
          + Add Rule
        </button>
      </div>
    );
  };

  const renderRankConfig = (transform: any, idx: number, transforms: any[]) => {
    const config = transform.config || {};
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Rank Type</label>
          <select
            value={config.rank_type || 'top_n'}
            onChange={(e) => updateTransformConfig(idx, { rank_type: e.target.value })}
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
            <option value="top_n">TOP N</option>
            <option value="bottom_n">BOTTOM N</option>
            <option value="rank">RANK</option>
            <option value="dense_rank">DENSE RANK</option>
            <option value="row_number">ROW NUMBER</option>
          </select>
        </div>
        {(config.rank_type === 'top_n' || config.rank_type === 'bottom_n') && (
          <div>
            <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>N</label>
            <input
              type="number"
              value={config.n || 10}
              onChange={(e) => updateTransformConfig(idx, { n: parseInt(e.target.value) || 10 })}
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
        )}
        <div>
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Order Column</label>
          <input
            type="text"
            value={config.order_column || ''}
            onChange={(e) => updateTransformConfig(idx, { order_column: e.target.value })}
            placeholder="column_name"
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
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Partition By (optional)</label>
          <input
            type="text"
            value={(config.partition_by || []).join(', ')}
            onChange={(e) => updateTransformConfig(idx, { partition_by: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s) })}
            placeholder="col1, col2, col3"
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

  const renderSequenceGeneratorConfig = (transform: any, idx: number, transforms: any[]) => {
    const config = transform.config || {};
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Target Column</label>
          <input
            type="text"
            value={config.target_column || ''}
            onChange={(e) => updateTransformConfig(idx, { target_column: e.target.value })}
            placeholder="id, sequence_id, etc."
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
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Start Value</label>
          <input
            type="number"
            value={config.start_value || 1}
            onChange={(e) => updateTransformConfig(idx, { start_value: parseInt(e.target.value) || 1 })}
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
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Increment</label>
          <input
            type="number"
            value={config.increment || 1}
            onChange={(e) => updateTransformConfig(idx, { increment: parseInt(e.target.value) || 1 })}
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

  const renderWindowFunctionsConfig = (transform: any, idx: number, transforms: any[]) => {
    const config = transform.config || {};
    const windows = config.windows || [];
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Window Functions</label>
        {windows.map((win: any, winIdx: number) => (
          <div key={winIdx} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, border: `1px solid ${asciiColors.border}`, borderRadius: 2 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <select
                value={win.function || 'row_number'}
                onChange={(e) => {
                  const newWins = [...windows];
                  newWins[winIdx] = { ...newWins[winIdx], function: e.target.value };
                  updateTransformConfig(idx, { windows: newWins });
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
                <option value="row_number">ROW_NUMBER</option>
                <option value="lag">LAG</option>
                <option value="lead">LEAD</option>
                <option value="first_value">FIRST_VALUE</option>
                <option value="last_value">LAST_VALUE</option>
                <option value="rank">RANK</option>
                <option value="dense_rank">DENSE_RANK</option>
              </select>
              <button
                onClick={() => {
                  const newWins = windows.filter((_: any, i: number) => i !== winIdx);
                  updateTransformConfig(idx, { windows: newWins });
                }}
                style={{
                  padding: '4px 8px',
                  border: `1px solid ${asciiColors.danger}`,
                  borderRadius: 2,
                  background: asciiColors.danger,
                  color: asciiColors.background,
                  cursor: 'pointer',
                  fontSize: 10,
                  fontFamily: 'Consolas'
                }}
              >
                ×
              </button>
            </div>
            <input
              type="text"
              value={win.target_column || ''}
              onChange={(e) => {
                const newWins = [...windows];
                newWins[winIdx] = { ...newWins[winIdx], target_column: e.target.value };
                updateTransformConfig(idx, { windows: newWins });
              }}
              placeholder="target_column"
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
            <input
              type="text"
              value={win.source_column || ''}
              onChange={(e) => {
                const newWins = [...windows];
                newWins[winIdx] = { ...newWins[winIdx], source_column: e.target.value };
                updateTransformConfig(idx, { windows: newWins });
              }}
              placeholder="source_column"
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
            {(win.function === 'lag' || win.function === 'lead') && (
              <input
                type="number"
                value={win.offset || 1}
                onChange={(e) => {
                  const newWins = [...windows];
                  newWins[winIdx] = { ...newWins[winIdx], offset: parseInt(e.target.value) || 1 };
                  updateTransformConfig(idx, { windows: newWins });
                }}
                placeholder="offset"
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
            )}
          </div>
        ))}
        <button
          onClick={() => updateTransformConfig(idx, { windows: [...windows, { function: 'row_number', target_column: '', source_column: '' }] })}
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
          + Add Window Function
        </button>
      </div>
    );
  };

  const renderNormalizerConfig = (transform: any, idx: number, transforms: any[]) => {
    const config = transform.config || {};
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Columns to Denormalize</label>
          <input
            type="text"
            value={(config.columns_to_denormalize || []).join(', ')}
            onChange={(e) => updateTransformConfig(idx, { columns_to_denormalize: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s) })}
            placeholder="col1, col2, col3"
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
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Key Column Name</label>
          <input
            type="text"
            value={config.key_column_name || 'key'}
            onChange={(e) => updateTransformConfig(idx, { key_column_name: e.target.value })}
            placeholder="key"
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
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Value Column Name</label>
          <input
            type="text"
            value={config.value_column_name || 'value'}
            onChange={(e) => updateTransformConfig(idx, { value_column_name: e.target.value })}
            placeholder="value"
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

  const renderJsonParserConfig = (transform: any, idx: number, transforms: any[]) => {
    const config = transform.config || {};
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Source Column</label>
          <input
            type="text"
            value={config.source_column || ''}
            onChange={(e) => updateTransformConfig(idx, { source_column: e.target.value })}
            placeholder="json_column"
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
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Format</label>
          <select
            value={config.format || 'json'}
            onChange={(e) => updateTransformConfig(idx, { format: e.target.value })}
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
            <option value="json">JSON</option>
            <option value="xml">XML</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Fields to Extract (optional, leave empty for all)</label>
          <input
            type="text"
            value={(config.fields_to_extract || []).join(', ')}
            onChange={(e) => updateTransformConfig(idx, { fields_to_extract: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s) })}
            placeholder="user.name, user.address.city (use dot notation for nested)"
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

  const renderGeolocationConfig = (transform: any, idx: number, transforms: any[]) => {
    const config = transform.config || {};
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Operation</label>
          <select
            value={config.operation || 'distance'}
            onChange={(e) => updateTransformConfig(idx, { operation: e.target.value })}
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
            <option value="distance">Distance</option>
            <option value="point_in_polygon">Point in Polygon</option>
          </select>
        </div>
        {config.operation === 'distance' && (
          <>
            <div>
              <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Point 1 Column</label>
              <input
                type="text"
                value={config.point1_column || ''}
                onChange={(e) => updateTransformConfig(idx, { point1_column: e.target.value })}
                placeholder="point1_column"
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
              <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Point 2 Column</label>
              <input
                type="text"
                value={config.point2_column || ''}
                onChange={(e) => updateTransformConfig(idx, { point2_column: e.target.value })}
                placeholder="point2_column"
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
          </>
        )}
        {config.operation === 'point_in_polygon' && (
          <>
            <div>
              <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Point Column</label>
              <input
                type="text"
                value={config.point_column || ''}
                onChange={(e) => updateTransformConfig(idx, { point_column: e.target.value })}
                placeholder="point_column"
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
              <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Polygon (JSON array of {lat, lng} objects)</label>
              <textarea
                value={typeof config.polygon === 'string' ? config.polygon : JSON.stringify(config.polygon || [], null, 2)}
                onChange={(e) => {
                  try {
                    const polygon = JSON.parse(e.target.value);
                    updateTransformConfig(idx, { polygon });
                  } catch {
                    updateTransformConfig(idx, { polygon: e.target.value });
                  }
                }}
                placeholder='[{"latitude": 40.7128, "longitude": -74.0060}, ...]'
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
          </>
        )}
        <div>
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Target Column</label>
          <input
            type="text"
            value={config.target_column || 'geolocation_result'}
            onChange={(e) => updateTransformConfig(idx, { target_column: e.target.value })}
            placeholder="geolocation_result"
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

  const renderDataValidationConfig = (transform: any, idx: number, transforms: any[]) => {
    const config = transform.config || {};
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Validation Type</label>
          <select
            value={config.validation_type || 'email'}
            onChange={(e) => updateTransformConfig(idx, { validation_type: e.target.value })}
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
            <option value="address">Address</option>
            <option value="phone">Phone</option>
            <option value="email">Email</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Source Column</label>
          <input
            type="text"
            value={config.source_column || ''}
            onChange={(e) => updateTransformConfig(idx, { source_column: e.target.value })}
            placeholder="column_name"
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
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Target Column</label>
          <input
            type="text"
            value={config.target_column || (config.source_column ? `${config.source_column}_validated` : '')}
            onChange={(e) => updateTransformConfig(idx, { target_column: e.target.value })}
            placeholder="column_validated"
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
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Is Valid Column</label>
          <input
            type="text"
            value={config.is_valid_column || (config.source_column ? `${config.source_column}_is_valid` : '')}
            onChange={(e) => updateTransformConfig(idx, { is_valid_column: e.target.value })}
            placeholder="column_is_valid"
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

  const renderDeduplicationConfig = (transform: any, idx: number, transforms: any[]) => {
    const config = transform.config || {};
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Method</label>
          <select
            value={config.method || 'exact'}
            onChange={(e) => updateTransformConfig(idx, { method: e.target.value })}
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
            <option value="exact">Exact Match</option>
            <option value="fuzzy">Fuzzy Match</option>
            <option value="similarity">Similarity Match</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Key Columns</label>
          <input
            type="text"
            value={(config.key_columns || []).join(', ')}
            onChange={(e) => updateTransformConfig(idx, { key_columns: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s) })}
            placeholder="col1, col2, col3"
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
        {(config.method === 'fuzzy' || config.method === 'similarity') && (
          <div>
            <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Similarity Threshold (0.0 - 1.0)</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={config.similarity_threshold || 0.8}
              onChange={(e) => updateTransformConfig(idx, { similarity_threshold: parseFloat(e.target.value) || 0.8 })}
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
        )}
        <div>
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas', display: 'block', marginBottom: 4 }}>Keep Strategy</label>
          <select
            value={config.keep_strategy || 'first'}
            onChange={(e) => updateTransformConfig(idx, { keep_strategy: e.target.value })}
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
            <option value="first">Keep First</option>
            <option value="last">Keep Last</option>
          </select>
        </div>
      </div>
    );
  };

  const renderTransformConfig = () => {
    const data = formData as TransformNodeData;
    const transforms = data.transforms || [];
    
    const transformationTypes: Array<{ value: string; label: string }> = [
      { value: 'basic', label: 'Basic (Expression)' },
      { value: 'sorter', label: 'Sorter (Sort)' },
      { value: 'expression', label: 'Expression (Advanced)' },
      { value: 'data_cleansing', label: 'Data Cleansing' },
      { value: 'rank', label: 'Rank (TOP N/BOTTOM N)' },
      { value: 'sequence_generator', label: 'Sequence Generator' },
      { value: 'window_functions', label: 'Window Functions' },
      { value: 'normalizer', label: 'Normalizer (Unpivot)' },
      { value: 'json_parser', label: 'JSON/XML Parser' },
      { value: 'geolocation', label: 'Geolocation' },
      { value: 'data_validation', label: 'Data Validation' },
      { value: 'deduplication', label: 'Deduplication' }
    ];
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>
            Transformations
          </label>
          <button
            onClick={() => setFormData({ ...formData, transforms: [...transforms, { target_column: '', expression: '', transformationType: 'basic' }] })}
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
        {transforms.map((transform: any, idx: number) => {
          const transformType = transform.transformationType || 'basic';
          
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, border: `1px solid ${asciiColors.border}`, borderRadius: 2 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <select
                  value={transformType}
                  onChange={(e) => {
                    const newTransforms = [...transforms];
                    newTransforms[idx] = { ...newTransforms[idx], transformationType: e.target.value, config: {} };
                    setFormData({ ...formData, transforms: newTransforms });
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
                  {transformationTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
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
              
              {transformType === 'basic' && (
                <>
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
                </>
              )}
              
              {transformType === 'sorter' && renderSorterConfig(transform, idx, transforms)}
              {transformType === 'expression' && renderExpressionConfig(transform, idx, transforms)}
              {transformType === 'data_cleansing' && renderDataCleansingConfig(transform, idx, transforms)}
              {transformType === 'rank' && renderRankConfig(transform, idx, transforms)}
              {transformType === 'sequence_generator' && renderSequenceGeneratorConfig(transform, idx, transforms)}
              {transformType === 'window_functions' && renderWindowFunctionsConfig(transform, idx, transforms)}
              {transformType === 'normalizer' && renderNormalizerConfig(transform, idx, transforms)}
              {transformType === 'json_parser' && renderJsonParserConfig(transform, idx, transforms)}
              {transformType === 'geolocation' && renderGeolocationConfig(transform, idx, transforms)}
              {transformType === 'data_validation' && renderDataValidationConfig(transform, idx, transforms)}
              {transformType === 'deduplication' && renderDeduplicationConfig(transform, idx, transforms)}
            </div>
          );
        })}
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
      case 'lookup':
        return renderLookupConfig();
      case 'target':
        return renderTargetConfig();
      default:
        return <div style={{ color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>No configuration available</div>;
    }
  };

  const renderLookupConfig = () => {
    const data = formData as LookupNodeData;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
            Lookup Schema (optional)
          </label>
          <input
            type="text"
            value={data.lookupSchema || ''}
            onChange={(e) => setFormData({ ...formData, lookupSchema: e.target.value })}
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
            Lookup Table *
          </label>
          <input
            type="text"
            value={data.lookupTable || ''}
            onChange={(e) => setFormData({ ...formData, lookupTable: e.target.value })}
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
        <div>
          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
            Source Columns (comma-separated) *
          </label>
          <input
            type="text"
            value={(data.sourceColumns || []).join(', ')}
            onChange={(e) => setFormData({ ...formData, sourceColumns: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
            placeholder="id, name"
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
            Lookup Columns (comma-separated) *
          </label>
          <input
            type="text"
            value={(data.lookupColumns || []).join(', ')}
            onChange={(e) => setFormData({ ...formData, lookupColumns: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
            placeholder="id, name"
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
            Return Columns (comma-separated) *
          </label>
          <input
            type="text"
            value={(data.returnColumns || []).join(', ')}
            onChange={(e) => setFormData({ ...formData, returnColumns: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
            placeholder="department, location"
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

