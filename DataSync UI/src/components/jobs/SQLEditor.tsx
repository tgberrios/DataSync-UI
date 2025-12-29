import React, { useEffect, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { sql } from '@codemirror/lang-sql';
import { autocompletion } from '@codemirror/autocomplete';
import { lineNumbers } from '@codemirror/view';
import { highlightSelectionMatches } from '@codemirror/search';
import { bracketMatching, foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { history, historyKeymap } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import styled from 'styled-components';
import { theme } from '../../theme/theme';

const EditorContainer = styled.div`
  border: 1px solid ${theme.colors.border.medium};
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
  font-size: 0.9em;
  
  .cm-editor {
    min-height: 150px;
  }
  
  .cm-scroller {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  }
`;

interface SQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  schemas?: string[];
  tables?: string[];
  columns?: string[];
}

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
  'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL', 'AS', 'ORDER',
  'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT', 'COUNT', 'SUM', 'AVG',
  'MAX', 'MIN', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE',
  'TABLE', 'ALTER', 'DROP', 'INDEX', 'UNIQUE', 'PRIMARY', 'KEY', 'FOREIGN',
  'REFERENCES', 'CONSTRAINT', 'DEFAULT', 'CHECK', 'UNION', 'ALL', 'EXCEPT',
  'INTERSECT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CAST', 'CONVERT',
  'EXISTS', 'ANY', 'SOME', 'EXTRACT', 'DATE', 'TIME', 'TIMESTAMP', 'INTERVAL'
];

export const SQLEditor: React.FC<SQLEditorProps> = ({
  value,
  onChange,
  placeholder = 'SELECT * FROM table_name WHERE condition...',
  schemas = [],
  tables = [],
  columns = [],
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const sqlCompletion = autocompletion({
      override: [
        (context) => {
          const word = context.matchBefore(/\w*/);
          if (!word) return null;

          const suggestions: Array<{ label: string; type: string; info: string }> = [];

          const text = context.state.doc.toString();
          const cursorPos = context.pos;
          const beforeCursor = text.substring(0, cursorPos);
          const afterWord = beforeCursor.match(/(\w+\.)*\w*$/)?.[0] || '';

          if (afterWord.includes('.')) {
            const parts = afterWord.split('.');
            if (parts.length === 1) {
              schemas.forEach(schema => {
                suggestions.push({
                  label: schema,
                  type: 'schema',
                  info: 'Schema',
                });
              });
            } else if (parts.length === 2) {
              const schemaName = parts[0];
              tables.forEach(table => {
                suggestions.push({
                  label: `${schemaName}.${table}`,
                  type: 'table',
                  info: 'Table',
                });
              });
            } else if (parts.length === 3) {
              const schemaTable = parts.slice(0, 2).join('.');
              columns.forEach(col => {
                suggestions.push({
                  label: `${schemaTable}.${col}`,
                  type: 'column',
                  info: 'Column',
                });
              });
            }
          } else {
            SQL_KEYWORDS.forEach(keyword => {
              if (keyword.toLowerCase().startsWith(word.text.toLowerCase())) {
                suggestions.push({
                  label: keyword,
                  type: 'keyword',
                  info: 'SQL Keyword',
                });
              }
            });

            schemas.forEach(schema => {
              if (schema.toLowerCase().startsWith(word.text.toLowerCase())) {
                suggestions.push({
                  label: schema,
                  type: 'schema',
                  info: 'Schema',
                });
              }
            });

            tables.forEach(table => {
              if (table.toLowerCase().startsWith(word.text.toLowerCase())) {
                suggestions.push({
                  label: table,
                  type: 'table',
                  info: 'Table',
                });
              }
            });

            columns.forEach(col => {
              if (col.toLowerCase().startsWith(word.text.toLowerCase())) {
                suggestions.push({
                  label: col,
                  type: 'column',
                  info: 'Column',
                });
              }
            });
          }

          return {
            from: word.from,
            options: suggestions.slice(0, 50),
          };
        },
      ],
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        foldGutter(),
        indentOnInput(),
        bracketMatching(),
        highlightSelectionMatches(),
        syntaxHighlighting(defaultHighlightStyle),
        sql(),
        sqlCompletion,
        keymap.of([...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString();
            onChange(newValue);
          }
        }),
        EditorView.theme({
          '&': {
            fontSize: '0.9em',
          },
          '.cm-content': {
            minHeight: '150px',
            padding: '8px',
          },
          '.cm-focused': {
            outline: `2px solid ${theme.colors.primary.main}33`,
            outlineOffset: '-2px',
          },
        }),
        EditorState.tabSize.of(2),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, []);

  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return <EditorContainer ref={editorRef} />;
};

