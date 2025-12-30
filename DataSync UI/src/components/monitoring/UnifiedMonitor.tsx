import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { theme } from '../../theme/theme';
import { monitorApi, queryPerformanceApi, dashboardApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideDown = keyframes`
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: 1000px;
    opacity: 1;
  }
`;

const slideUp = keyframes`
  from {
    max-height: 1000px;
    opacity: 1;
  }
  to {
    max-height: 0;
    opacity: 0;
  }
`;

const smoothUpdate = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
`;

const GlobalStyles = styled.div`
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes smoothUpdate {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
    100% {
      opacity: 1;
    }
  }
  
  @keyframes dataPulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }
`;

const MainLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 500px;
  gap: ${theme.spacing.lg};
  height: calc(100vh - 200px);
  min-height: 600px;
`;

const TreePanel = styled.div`
  background: ${theme.colors.background.main};
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  overflow-y: auto;
  box-shadow: ${theme.shadows.md};
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${theme.colors.background.secondary};
    border-radius: ${theme.borderRadius.sm};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.border.medium};
    border-radius: ${theme.borderRadius.sm};
    
    &:hover {
      background: ${theme.colors.primary.main};
    }
  }
`;

const DetailsPanel = styled.div`
  background: ${theme.colors.background.main};
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  overflow-y: auto;
  box-shadow: ${theme.shadows.md};
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${theme.colors.background.secondary};
    border-radius: ${theme.borderRadius.sm};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.border.medium};
    border-radius: ${theme.borderRadius.sm};
    
    &:hover {
      background: ${theme.colors.primary.main};
    }
  }
`;

const TabContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
  border-bottom: 2px solid ${theme.colors.border.light};
  padding-bottom: ${theme.spacing.sm};
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: none;
  background: ${props => props.$active ? theme.colors.primary.main : 'transparent'};
  color: ${props => props.$active ? theme.colors.text.white : theme.colors.text.secondary};
  border-radius: ${theme.borderRadius.md} ${theme.borderRadius.md} 0 0;
  cursor: pointer;
  font-weight: ${props => props.$active ? '600' : '500'};
  transition: all ${theme.transitions.normal};
  
  &:hover {
    background: ${props => props.$active ? theme.colors.primary.dark : theme.colors.background.secondary};
    color: ${props => props.$active ? theme.colors.text.white : theme.colors.text.primary};
  }
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

const StatCard = styled.div`
  background: linear-gradient(135deg, ${theme.colors.background.secondary} 0%, ${theme.colors.background.tertiary} 100%);
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  text-align: center;
  transition: all ${theme.transitions.normal};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.md};
    border-color: ${theme.colors.primary.main};
  }
`;

const StatValue = styled.div`
  font-size: 2em;
  font-weight: bold;
  color: ${theme.colors.primary.main};
  margin-bottom: ${theme.spacing.xs};
`;

const StatLabel = styled.div`
  font-size: 0.85em;
  color: ${theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
`;

const TreeContainer = styled.div`
  font-family: "Consolas";
  font-size: 0.95em;
`;

const TreeNode = styled.div`
  user-select: none;
  animation: ${fadeIn} 0.3s ease-out;
  margin-bottom: 2px;
`;

const TreeContent = styled.div<{ $level: number; $isExpanded?: boolean; $nodeType?: 'database' | 'schema' | 'table' | 'query' }>`
  display: flex;
  align-items: center;
  padding: ${props => props.$level === 0 ? '12px 8px' : props.$level === 1 ? '10px 8px' : '8px 8px'};
  padding-left: ${props => props.$level * 24 + 8}px;
  cursor: pointer;
  border-radius: ${theme.borderRadius.md};
  transition: all ${theme.transitions.normal};
  position: relative;
  margin: 2px 0;
  
  ${props => {
    if (props.$nodeType === 'database') {
      return `
        background: linear-gradient(135deg, ${theme.colors.primary.light}08 0%, ${theme.colors.primary.main}05 100%);
        border-left: 3px solid ${theme.colors.primary.main};
        font-weight: 600;
      `;
    }
    if (props.$nodeType === 'schema') {
      return `
        background: ${theme.colors.background.secondary};
        border-left: 2px solid ${theme.colors.border.medium};
      `;
    }
    return `
      border-left: 1px solid ${theme.colors.border.light};
    `;
  }}
  
  &:hover {
    background: ${props => {
      if (props.$nodeType === 'database') {
        return `linear-gradient(135deg, ${theme.colors.primary.light}15 0%, ${theme.colors.primary.main}10 100%)`;
      }
      return theme.colors.background.secondary;
    }};
    transform: translateX(2px);
    box-shadow: ${theme.shadows.sm};
  }
`;

const ExpandIconContainer = styled.div<{ $isExpanded: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 8px;
  border-radius: ${theme.borderRadius.sm};
  background: ${props => props.$isExpanded 
    ? `linear-gradient(135deg, ${theme.colors.primary.main} 0%, ${theme.colors.primary.light} 100%)`
    : theme.colors.background.secondary
  };
  color: ${props => props.$isExpanded ? theme.colors.text.white : theme.colors.primary.main};
  font-size: 0.7em;
  font-weight: bold;
  transition: all ${theme.transitions.normal};
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: ${theme.shadows.sm};
  }
  
  svg {
    transition: transform ${theme.transitions.normal};
    transform: ${props => props.$isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'};
  }
`;

const NodeLabel = styled.span<{ $isDatabase?: boolean; $isSchema?: boolean }>`
  font-weight: ${props => props.$isDatabase ? '700' : props.$isSchema ? '600' : '500'};
  font-size: ${props => props.$isDatabase ? '1.05em' : props.$isSchema ? '0.98em' : '0.92em'};
  color: ${props => {
    if (props.$isDatabase) return theme.colors.primary.main;
    if (props.$isSchema) return theme.colors.text.primary;
    return theme.colors.text.secondary;
  }};
  margin-right: 12px;
  transition: color ${theme.transitions.normal};
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CountBadge = styled.span`
  padding: 4px 10px;
  border-radius: ${theme.borderRadius.md};
  font-size: 0.8em;
  font-weight: 500;
  background: linear-gradient(135deg, ${theme.colors.background.secondary} 0%, ${theme.colors.background.tertiary} 100%);
  color: ${theme.colors.text.secondary};
  border: 1px solid ${theme.colors.border.light};
  margin-left: auto;
  transition: all ${theme.transitions.normal};
  
  &:hover {
    background: linear-gradient(135deg, ${theme.colors.primary.light}10 0%, ${theme.colors.primary.main}08 100%);
    border-color: ${theme.colors.primary.main};
    color: ${theme.colors.primary.main};
    transform: translateY(-1px);
  }
`;

const ExpandableContent = styled.div<{ $isExpanded: boolean; $level: number }>`
  overflow: hidden;
  animation: ${props => props.$isExpanded ? slideDown : slideUp} 0.3s ease-out;
  padding-left: ${props => props.$level * 24 + 36}px;
`;

const QueryItem = styled.div<{ $selected: boolean }>`
  padding: 10px 8px;
  margin: 4px 0;
  border-radius: ${theme.borderRadius.md};
  border-left: 2px solid ${props => props.$selected ? theme.colors.primary.main : theme.colors.border.light};
  background: ${props => props.$selected ? theme.colors.primary.light + '15' : 'transparent'};
  cursor: pointer;
  transition: all ${theme.transitions.normal};
  
  &:hover {
    background: ${theme.colors.background.secondary};
    border-left-color: ${theme.colors.primary.main};
  }
`;

const QueryPreview = styled.div`
  font-size: 0.85em;
  color: ${theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 4px;
  font-family: "Consolas";
`;

const KillButton = styled.button`
  padding: 4px 8px;
  border: none;
  border-radius: ${theme.borderRadius.sm};
  background: ${theme.colors.status.error.bg};
  color: ${theme.colors.status.error.text};
  cursor: pointer;
  font-size: 0.75em;
  font-weight: 500;
  transition: all ${theme.transitions.normal};
  
  &:hover {
    background: ${theme.colors.status.error.text};
    color: ${theme.colors.background.main};
    transform: translateY(-1px);
    box-shadow: ${theme.shadows.sm};
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: 4px 10px;
  border-radius: ${theme.borderRadius.md};
  font-size: 0.75em;
  font-weight: 500;
  display: inline-block;
  margin-left: 8px;
  background-color: ${props => {
    switch (props.$status) {
      case 'active': return theme.colors.status.success.bg;
      case 'idle in transaction': return theme.colors.status.warning.bg;
      case 'idle in transaction (aborted)': return theme.colors.status.error.bg;
      case 'FULL_LOAD': return theme.colors.status.info.bg;
      case 'LISTENING_CHANGES': return theme.colors.status.success.bg;
      case 'ERROR': return theme.colors.status.error.bg;
      case 'EXCELLENT': return theme.colors.status.success.bg;
      case 'GOOD': return theme.colors.status.info.bg;
      case 'FAIR': return theme.colors.status.warning.bg;
      case 'POOR': return theme.colors.status.error.bg;
      default: return theme.colors.background.secondary;
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'active': return theme.colors.status.success.text;
      case 'idle in transaction': return theme.colors.status.warning.text;
      case 'idle in transaction (aborted)': return theme.colors.status.error.text;
      case 'FULL_LOAD': return theme.colors.status.info.text;
      case 'LISTENING_CHANGES': return theme.colors.status.success.text;
      case 'ERROR': return theme.colors.status.error.text;
      case 'EXCELLENT': return theme.colors.status.success.text;
      case 'GOOD': return theme.colors.status.info.text;
      case 'FAIR': return theme.colors.status.warning.text;
      case 'POOR': return theme.colors.status.error.text;
      default: return theme.colors.text.secondary;
    }
  }};
`;

const DetailsCard = styled.div`
  background: ${theme.colors.background.secondary};
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.md};
`;

const DetailsTitle = styled.h3`
  font-size: 1.1em;
  font-weight: 600;
  color: ${theme.colors.text.primary};
  margin: 0 0 ${theme.spacing.md} 0;
  padding-bottom: ${theme.spacing.sm};
  border-bottom: 2px solid ${theme.colors.border.light};
`;

const DetailsGrid = styled.div`
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: ${theme.spacing.md};
  font-size: 0.9em;
`;

const DetailLabel = styled.div`
  color: ${theme.colors.text.secondary};
  font-weight: 500;
`;

const DetailValue = styled.div`
  color: ${theme.colors.text.primary};
  word-break: break-word;
`;

const QueryText = styled.pre`
  margin: ${theme.spacing.md} 0 0 0;
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.background.main};
  border-radius: ${theme.borderRadius.md};
  overflow-x: auto;
  font-size: 0.85em;
  border: 1px solid ${theme.colors.border.light};
  font-family: "Consolas";
  white-space: pre-wrap;
  word-wrap: break-word;
`;

const EmptyState = styled.div`
  padding: 60px 40px;
  text-align: center;
  color: ${theme.colors.text.secondary};
  animation: ${fadeIn} 0.5s ease-out;
  
  &::before {
    content: '📊';
    font-size: 3em;
    display: block;
    margin-bottom: ${theme.spacing.md};
    opacity: 0.5;
  }
`;

const EmptyDetails = styled.div`
  padding: 60px 40px;
  text-align: center;
  color: ${theme.colors.text.secondary};
  animation: ${fadeIn} 0.5s ease-out;
  
  &::before {
    content: '👈';
    font-size: 3em;
    display: block;
    margin-bottom: ${theme.spacing.md};
    opacity: 0.5;
  }
`;

const ChartContainer = styled.div`
  width: 100%;
  margin-top: 20px;
  padding: 25px;
  background: ${theme.colors.background.main};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.md};
  color: ${theme.colors.text.primary};
  overflow: visible;
  position: relative;
  animation: ${fadeIn} 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
  
  &:hover {
    box-shadow: ${theme.shadows.lg};
    transform: translateY(-2px);
  }
`;

const ChartTitle = styled.div`
  font-weight: bold;
  margin-bottom: 20px;
  color: ${theme.colors.text.primary};
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
`;

const LegendItem = styled.label<{ $lineStyle: string; $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: ${(props) => (props.$active ? theme.colors.text.primary : theme.colors.text.secondary)};
  transition: all 0.3s ease;
  padding: 6px 10px;
  border-radius: ${theme.borderRadius.sm};
  cursor: pointer;
  user-select: none;
  border: 1px solid ${(props) => (props.$active ? theme.colors.border.medium : "transparent")};
  background: ${(props) => (props.$active ? theme.colors.background.secondary : "transparent")};
  
  &:hover {
    background: ${theme.colors.background.secondary};
    color: ${theme.colors.text.primary};
    transform: translateY(-1px);
    border-color: ${theme.colors.border.medium};
  }
`;

const Checkbox = styled.input`
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: ${theme.colors.status.info.text};
  
  &:checked {
    accent-color: ${theme.colors.status.info.text};
  }
`;

const ShowAllButton = styled.button`
  margin-left: auto;
  padding: 6px 12px;
  font-size: 10px;
  background: ${theme.colors.background.secondary};
  border: 1px solid ${theme.colors.border.medium};
  border-radius: ${theme.borderRadius.sm};
  color: ${theme.colors.text.primary};
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
  
  &:hover {
    background: ${theme.colors.primary.main};
    color: ${theme.colors.text.white};
    border-color: ${theme.colors.primary.main};
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const LegendLine = styled.span<{ $color: string; $active: boolean }>`
  display: inline-block;
  width: 24px;
  height: 0;
  opacity: ${(props) => (props.$active ? 1 : 0.4)};
  transition: opacity 0.3s ease;
  border-top: 2px solid;
  border-color: ${(props) => props.$color};
`;

const ChartPath = styled.path`
  transition: d 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: d;
  opacity: 1;
  vector-effect: non-scaling-stroke;
`;

const ChartAreaPath = styled.path`
  transition: d 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: d;
  opacity: 1;
`;

const SVGChart = styled.svg`
  width: 100%;
  height: 100%;
  display: block;
  min-height: 400px;
`;

const ChartArea = styled.div`
  width: 100%;
  height: 500px;
  min-height: 400px;
  position: relative;
  background: ${theme.colors.background.main};
  border-radius: ${theme.borderRadius.md};
  padding: 20px;
  overflow: visible;
`;

const GridLine = styled.line`
  stroke: ${theme.colors.border.light};
  stroke-width: 1;
  opacity: 0.2;
`;

const AxisLabel = styled.text`
  font-size: 10px;
  fill: ${theme.colors.text.secondary};
  font-family: "Consolas";
`;

const AxisLine = styled.line`
  stroke: ${theme.colors.border.medium};
  stroke-width: 1.5;
  opacity: 0.6;
`;

const Tooltip = styled.div<{ $x: number; $y: number; $visible: boolean }>`
  position: absolute;
  left: ${props => props.$x}px;
  top: ${props => props.$y}px;
  background: ${theme.colors.background.secondary};
  border: 1px solid ${theme.colors.border.medium};
  border-radius: ${theme.borderRadius.md};
  padding: 8px 12px;
  font-size: 0.85em;
  pointer-events: none;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.2s ease;
  z-index: 1000;
  box-shadow: ${theme.shadows.md};
  transform: translate(-50%, -100%);
  margin-top: -8px;
  white-space: nowrap;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid ${theme.colors.background.secondary};
  }
`;

const TooltipLabel = styled.div`
  font-weight: 600;
  color: ${theme.colors.text.primary};
  margin-bottom: 4px;
`;

const TooltipValue = styled.div`
  color: ${theme.colors.text.secondary};
  font-size: 0.9em;
`;

const AsciiSparkline: React.FC<{
  data: number[];
  color: string;
  height?: number;
  width?: number;
  labels?: string[];
}> = ({ data, color, height = 4, width = 30, labels }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return <span style={{ color: asciiColors.muted }}>{ascii.dot.repeat(width)}</span>;
  }

  const sparklineData = data.slice(-width);
  const sparklineLabels = labels ? labels.slice(-width) : [];
  const min = Math.min(...sparklineData);
  const max = Math.max(...sparklineData);
  const range = max - min || 1;

  const sparklineChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  
  const getChar = (value: number) => {
    if (range === 0) return sparklineChars[0];
    const normalized = (value - min) / range;
    const index = Math.floor(normalized * (sparklineChars.length - 1));
    return sparklineChars[Math.max(0, Math.min(sparklineChars.length - 1, index))];
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLSpanElement>, index: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 30
      });
      setHoveredIndex(index);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setTooltipPosition(null);
  };

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: "relative",
        display: "inline-block"
      }}
      onMouseLeave={handleMouseLeave}
    >
      <span style={{ 
        color, 
        fontFamily: "Consolas",
        fontSize: 11,
        letterSpacing: 0,
        lineHeight: 1,
        display: "inline-block"
      }}>
        {sparklineData.map((val, idx) => (
          <span
            key={idx}
            onMouseMove={(e) => handleMouseMove(e, idx)}
            style={{
              cursor: "pointer",
              transition: "all 0.2s ease",
              transform: hoveredIndex === idx ? "scale(1.2)" : "scale(1)",
              display: "inline-block",
              position: "relative"
            }}
          >
            {getChar(val)}
          </span>
        ))}
      </span>
      {hoveredIndex !== null && tooltipPosition && (
        <div
          style={{
            position: "absolute",
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: "translateX(-50%)",
            backgroundColor: asciiColors.background,
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            padding: "6px 10px",
            fontSize: 10,
            fontFamily: "Consolas",
            color: asciiColors.foreground,
            whiteSpace: "nowrap",
            zIndex: 1000,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            pointerEvents: "none",
            animation: "fadeInUp 0.15s ease-out",
            transition: "opacity 0.15s ease, transform 0.15s ease"
          }}
        >
          <div style={{ color: asciiColors.accent, fontWeight: 600, marginBottom: 2 }}>
            {sparklineData[hoveredIndex].toFixed(2)}
          </div>
          {sparklineLabels[hoveredIndex] && (
            <div style={{ color: asciiColors.muted, fontSize: 9 }}>
              {new Date(sparklineLabels[hoveredIndex]).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const RecentEventsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const RecentEventCard = styled.div`
  background: ${theme.colors.background.secondary};
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  transition: all ${theme.transitions.normal};
  animation: ${fadeIn} 0.3s ease-out;
  
  &:hover {
    border-color: ${theme.colors.primary.main};
    box-shadow: ${theme.shadows.sm};
    transform: translateX(4px);
  }
`;

const EventHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.sm};
`;

const EventTime = styled.div`
  font-size: 0.75em;
  color: ${theme.colors.text.secondary};
  font-family: "Consolas";
`;

const EventInfo = styled.div`
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: ${theme.spacing.sm};
  font-size: 0.9em;
  margin-top: ${theme.spacing.xs};
`;

const EventLabel = styled.div`
  color: ${theme.colors.text.secondary};
  font-weight: 500;
`;

const EventValue = styled.div`
  color: ${theme.colors.text.primary};
`;

const SectionTitle = styled.h3`
  font-size: 1.1em;
  font-weight: 600;
  color: ${theme.colors.text.primary};
  margin: 0 0 ${theme.spacing.md} 0;
  padding-bottom: ${theme.spacing.sm};
  border-bottom: 2px solid ${theme.colors.border.light};
`;

const UnifiedMonitor: React.FC = () => {
  const location = useLocation();
  const getInitialTab = (): 'monitor' | 'live' | 'performance' | 'system' | 'transfer' => {
    if (location.pathname.includes('live-changes')) return 'live';
    if (location.pathname.includes('query-performance')) return 'performance';
    return 'monitor';
  };
  const [activeTab, setActiveTab] = useState<'monitor' | 'live' | 'performance' | 'system' | 'transfer'>(getInitialTab());
  
  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location.pathname]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  
  const [activeQueries, setActiveQueries] = useState<any[]>([]);
  const [processingLogs, setProcessingLogs] = useState<any[]>([]);
  const [processingStats, setProcessingStats] = useState<any>({});
  const [queryPerformance, setQueryPerformance] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({});
  const [transferMetrics, setTransferMetrics] = useState<any[]>([]);
  const [transferStats, setTransferStats] = useState<any>({});
  
  const [resourceHistory, setResourceHistory] = useState<{
    timestamp: string[];
    cpuUsage: number[];
    memoryPercentage: number[];
    network: number[];
    throughput: number[];
    dbConnections: number[];
    dbQueriesPerSecond: number[];
    dbQueryEfficiency: number[];
  }>({
    timestamp: [],
    cpuUsage: [],
    memoryPercentage: [],
    network: [],
    throughput: [],
    dbConnections: [],
    dbQueriesPerSecond: [],
    dbQueryEfficiency: [],
  });
  const [visibleLines, setVisibleLines] = useState<{
    cpu: boolean;
    memory: boolean;
    network: boolean;
    throughput: boolean;
    dbConnections: boolean;
    dbQueriesPerSecond: boolean;
    dbQueryEfficiency: boolean;
  }>({
    cpu: true,
    memory: true,
    network: true,
    throughput: true,
    dbConnections: true,
    dbQueriesPerSecond: true,
    dbQueryEfficiency: true,
  });
  const [dbHealth, setDbHealth] = useState<any>({});
  
  const isMountedRef = useRef(true);

  const extractSchemaTable = useCallback((query: string) => {
    if (!query) return { schema: 'N/A', table: 'N/A' };
    
    const schemaMatch = query.match(/(?:FROM|JOIN|INTO|UPDATE)\s+(?:(\w+)\.)?(\w+)/i);
    if (schemaMatch) {
      return {
        schema: schemaMatch[1] || 'public',
        table: schemaMatch[2] || 'N/A'
      };
    }
    return { schema: 'N/A', table: 'N/A' };
  }, []);

  const fetchMonitorData = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const [queries, logs, stats] = await Promise.all([
        monitorApi.getActiveQueries(),
        monitorApi.getProcessingLogs(1, 100),
        monitorApi.getProcessingStats()
      ]);
      if (isMountedRef.current) {
        const enrichedQueries = (queries || []).map((q: any) => {
          const { schema, table } = extractSchemaTable(q.query || '');
          return {
            ...q,
            schema_name: q.schema_name || schema,
            table_name: q.table_name || table
          };
        });
        setActiveQueries(enrichedQueries);
        setProcessingLogs(logs.data || []);
        setProcessingStats(stats || {});
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [extractSchemaTable]);

  const fetchPerformanceData = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const [queries, metrics] = await Promise.all([
        queryPerformanceApi.getQueries({ page: 1, limit: 100 }),
        queryPerformanceApi.getMetrics()
      ]);
      if (isMountedRef.current) {
        setQueryPerformance(queries.data || []);
        setPerformanceMetrics(metrics || {});
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, []);

  const fetchTransferMetrics = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const [metrics, stats] = await Promise.all([
        monitorApi.getTransferMetrics({ page: 1, limit: 100, days: 7 }),
        monitorApi.getTransferMetricsStats({ days: 7 })
      ]);
      if (isMountedRef.current) {
        setTransferMetrics(metrics.data || []);
        setTransferStats(stats || {});
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, []);

  const fetchSystemResources = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const dashboardData = await dashboardApi.getDashboardStats();
      if (isMountedRef.current) {
        setDbHealth(dashboardData.dbHealth || {});
        const now = new Date();
        const timeLabel = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
        const networkValue = dashboardData.metricsCards?.currentIops || 0;
        const throughputValue = dashboardData.metricsCards?.currentThroughput?.avgRps || 0;
        const dbConnectionsValue = parseFloat(dashboardData.dbHealth?.connectionPercentage || "0") || 0;
        const dbQueriesPerSecondValue = dashboardData.dbHealth?.totalQueries24h 
          ? (dashboardData.dbHealth.totalQueries24h / (24 * 3600)) 
          : 0;
        const dbQueryEfficiencyValue = parseFloat(dashboardData.dbHealth?.queryEfficiencyScore?.toString() || "0") || 0;
        
        setResourceHistory((prev) => {
          const maxPoints = 60;
          return {
            timestamp: [...prev.timestamp, timeLabel].slice(-maxPoints),
            cpuUsage: [
              ...prev.cpuUsage,
              parseFloat(dashboardData.systemResources?.cpuUsage || "0") || 0,
            ].slice(-maxPoints),
            memoryPercentage: [
              ...prev.memoryPercentage,
              parseFloat(dashboardData.systemResources?.memoryPercentage || "0") || 0,
            ].slice(-maxPoints),
            network: [
              ...prev.network,
              networkValue,
            ].slice(-maxPoints),
            throughput: [
              ...prev.throughput,
              throughputValue,
            ].slice(-maxPoints),
            dbConnections: [
              ...prev.dbConnections,
              dbConnectionsValue,
            ].slice(-maxPoints),
            dbQueriesPerSecond: [
              ...prev.dbQueriesPerSecond,
              dbQueriesPerSecondValue,
            ].slice(-maxPoints),
            dbQueryEfficiency: [
              ...prev.dbQueryEfficiency,
              dbQueryEfficiencyValue,
            ].slice(-maxPoints),
          };
        });
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error("Error fetching system resources:", err);
      }
    }
  }, []);

  const fetchSystemLogsHistory = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;
      const logs = await dashboardApi.getSystemLogs(60);
      const dashboardData = await dashboardApi.getDashboardStats();
      if (isMountedRef.current && logs.length > 0) {
        setResourceHistory({
          timestamp: logs.map((log: any) => log.timestamp),
          cpuUsage: logs.map((log: any) => log.cpuUsage),
          memoryPercentage: logs.map((log: any) => log.memoryPercentage),
          network: logs.map((log: any) => log.network),
          throughput: logs.map((log: any) => log.throughput),
          dbConnections: logs.map(() => parseFloat(dashboardData.dbHealth?.connectionPercentage || "0") || 0),
          dbQueriesPerSecond: logs.map(() => dashboardData.dbHealth?.totalQueries24h 
            ? (dashboardData.dbHealth.totalQueries24h / (24 * 3600)) 
            : 0),
          dbQueryEfficiency: logs.map(() => parseFloat(dashboardData.dbHealth?.queryEfficiencyScore?.toString() || "0") || 0),
        });
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error("Error fetching system logs history:", err);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    setLoading(true);
    
    const loadData = async () => {
      await Promise.all([fetchMonitorData(), fetchPerformanceData()]);
      if (activeTab === 'system') {
        await fetchSystemLogsHistory();
      }
      if (activeTab === 'transfer') {
        await fetchTransferMetrics();
      }
      if (isMountedRef.current) {
        setLoading(false);
      }
    };
    
    loadData();
    
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchMonitorData();
        if (activeTab === 'performance') {
          fetchPerformanceData();
        }
        if (activeTab === 'system') {
          fetchSystemResources();
        }
        if (activeTab === 'transfer') {
          fetchTransferMetrics();
        }
      }
    }, 5000);
    
    const systemInterval = activeTab === 'system' ? setInterval(fetchSystemResources, 10000) : null;
    
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      if (systemInterval) {
        clearInterval(systemInterval);
      }
    };
  }, [fetchMonitorData, fetchPerformanceData, fetchSystemResources, fetchSystemLogsHistory, fetchTransferMetrics, activeTab]);

  const treeData = useMemo(() => {
    if (activeTab === 'monitor') {
      const databases = new Map<string, any[]>();
      activeQueries.forEach(query => {
        const db = query.datname || 'Unknown';
        if (!databases.has(db)) {
          databases.set(db, []);
        }
        databases.get(db)!.push(query);
      });
      return databases;
    } else if (activeTab === 'live') {
      const databases = new Map<string, Map<string, any[]>>();
      processingLogs.forEach(log => {
        const db = log.db_engine || 'Unknown';
        const schema = log.schema_name || 'public';
        if (!databases.has(db)) {
          databases.set(db, new Map());
        }
        const schemas = databases.get(db)!;
        if (!schemas.has(schema)) {
          schemas.set(schema, []);
        }
        schemas.get(schema)!.push(log);
      });
      return databases;
    } else if (activeTab === 'transfer') {
      const databases = new Map<string, any[]>();
      transferMetrics.forEach(metric => {
        const db = metric.db_engine || 'Unknown';
        if (!databases.has(db)) {
          databases.set(db, []);
        }
        databases.get(db)!.push(metric);
      });
      return databases;
    } else {
      const databases = new Map<string, any[]>();
      queryPerformance.forEach(query => {
        const db = query.dbname || 'Unknown';
        if (!databases.has(db)) {
          databases.set(db, []);
        }
        databases.get(db)!.push(query);
      });
      return databases;
    }
  }, [activeTab, activeQueries, processingLogs, queryPerformance, transferMetrics]);

  const toggleNode = useCallback((key: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const formatTime = useCallback((ms: number | string | null | undefined) => {
    if (!ms) return 'N/A';
    const numMs = Number(ms);
    if (isNaN(numMs)) return 'N/A';
    if (numMs < 1) return `${(numMs * 1000).toFixed(2)}μs`;
    if (numMs < 1000) return `${numMs.toFixed(2)}ms`;
    return `${(numMs / 1000).toFixed(2)}s`;
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString();
  }, []);

  const handleKillQuery = useCallback(async (pid: number) => {
    if (!confirm(`Are you sure you want to kill query with PID ${pid}?`)) {
      return;
    }
    try {
      const response = await fetch(`/api/monitor/queries/${pid}/kill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.details || 'Failed to kill query');
      }
      
      alert(`Query with PID ${pid} has been terminated.`);
      fetchMonitorData();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchMonitorData]);

  const renderTree = () => {
    if (treeData.size === 0) {
      return (
        <div style={{
          padding: 40,
          textAlign: "center",
          color: asciiColors.muted,
          fontSize: 12
        }}>
          {ascii.dot} No data available for {activeTab}
        </div>
      );
    }

    const getStatusColor = (status: string) => {
      const upperStatus = (status || '').toUpperCase();
      if (upperStatus.includes('ERROR') || upperStatus.includes('FAILED') || upperStatus === 'POOR') {
        return asciiColors.danger;
      }
      if (upperStatus.includes('WARNING') || upperStatus === 'FAIR') {
        return asciiColors.warning;
      }
      if (upperStatus.includes('SUCCESS') || upperStatus === 'EXCELLENT' || upperStatus === 'GOOD') {
        return asciiColors.success;
      }
      return asciiColors.muted;
    };

    const entries = Array.from(treeData.entries() as any) as [string, any][];
    return entries.map(([dbName, data]) => {
      const dbKey = `db-${dbName}`;
      const isDbExpanded = expandedNodes.has(dbKey);
      
      let items: any[];
      if (activeTab === 'live') {
        const schemas = data as Map<string, any[]>;
        items = Array.from(schemas.values()).flat();
      } else {
        items = data as any[];
      }
      
      const totalItems = items.length;

      return (
        <div key={dbKey} style={{ marginBottom: 4 }}>
          <div
            onClick={() => toggleNode(dbKey)}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 8px",
              cursor: "pointer",
              borderLeft: `2px solid ${asciiColors.accent}`,
              backgroundColor: isDbExpanded ? asciiColors.backgroundSoft : asciiColors.background,
              transition: "all 0.2s ease",
              marginBottom: 2
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
              e.currentTarget.style.transform = "translateX(2px)";
            }}
            onMouseLeave={(e) => {
              if (!isDbExpanded) {
                e.currentTarget.style.backgroundColor = asciiColors.background;
              }
              e.currentTarget.style.transform = "translateX(0)";
            }}
          >
            <span style={{
              marginRight: 8,
              color: isDbExpanded ? asciiColors.accent : asciiColors.muted,
              fontSize: 10,
              transition: "transform 0.2s ease",
              display: "inline-block",
              transform: isDbExpanded ? "rotate(90deg)" : "rotate(0deg)"
            }}>
              {ascii.arrowRight}
            </span>
            <span style={{
              fontWeight: 600,
              color: asciiColors.accent,
              fontSize: 12,
              flex: 1
            }}>
              {dbName}
            </span>
            <span style={{
              padding: "2px 8px",
              borderRadius: 2,
              fontSize: 10,
              fontWeight: 500,
              border: `1px solid ${asciiColors.border}`,
              backgroundColor: asciiColors.backgroundSoft,
              color: asciiColors.foreground
            }}>
              {totalItems}
            </span>
          </div>
          {isDbExpanded && (
            <div style={{
              paddingLeft: 24,
              animation: "slideDown 0.3s ease-out"
            }}>
              {items.map((item: any, idx: number) => {
                const isSelected = selectedItem === item;
                const isLast = idx === items.length - 1;
                
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedItem(item)}
                    style={{
                      padding: "8px 8px",
                      marginLeft: 8,
                      marginBottom: 2,
                      cursor: "pointer",
                      borderLeft: `2px solid ${isSelected ? asciiColors.accent : asciiColors.border}`,
                      backgroundColor: isSelected ? asciiColors.accentLight : "transparent",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                        e.currentTarget.style.borderLeftColor = asciiColors.accent;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.borderLeftColor = asciiColors.border;
                      }
                    }}
                  >
                    <span style={{ color: asciiColors.muted, fontSize: 10 }}>
                      {isLast ? ascii.bl : ascii.tRight}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {activeTab === 'monitor' && (
                        <>
                          <div style={{ fontWeight: 500, color: asciiColors.foreground, fontSize: 11 }}>
                            PID: {item.pid}
                          </div>
                          <div style={{ fontSize: 10, color: asciiColors.muted, marginTop: 4 }}>
                            Schema: {item.schema_name || 'N/A'} {ascii.v} Table: {item.table_name || 'N/A'}
                          </div>
                          <div style={{
                            fontSize: 10,
                            color: asciiColors.muted,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            marginTop: 4,
                            fontFamily: "Consolas"
                          }}>
                            {item.query?.substring(0, 60)}...
                          </div>
                        </>
                      )}
                      {activeTab === 'live' && (
                        <>
                          <div style={{ fontWeight: 500, color: asciiColors.foreground, fontSize: 11 }}>
                            {item.table_name || 'N/A'}
                          </div>
                          <div style={{
                            fontSize: 10,
                            color: asciiColors.muted,
                            marginTop: 4,
                            fontFamily: "Consolas"
                          }}>
                            {item.db_engine} {ascii.v} {formatDate(item.processed_at)}
                          </div>
                        </>
                      )}
                      {activeTab === 'performance' && (
                        <>
                          <div style={{ fontWeight: 500, color: asciiColors.foreground, fontSize: 11 }}>
                            {formatTime(item.mean_time_ms || item.query_duration_ms)}
                          </div>
                          <div style={{
                            fontSize: 10,
                            color: asciiColors.muted,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            marginTop: 4,
                            fontFamily: "Consolas"
                          }}>
                            {item.query_text?.substring(0, 60)}...
                          </div>
                        </>
                      )}
                      {activeTab === 'transfer' && (
                        <>
                          <div style={{ fontWeight: 500, color: asciiColors.foreground, fontSize: 11 }}>
                            {item.schema_name}.{item.table_name}
                          </div>
                          <div style={{
                            fontSize: 10,
                            color: asciiColors.muted,
                            marginTop: 4,
                            fontFamily: "Consolas"
                          }}>
                            {item.db_engine} {ascii.v} {formatDate(item.created_at)}
                          </div>
                        </>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {activeTab === 'monitor' && (
                        <>
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: 2,
                            fontSize: 10,
                            fontWeight: 500,
                            border: `1px solid ${getStatusColor(item.state)}`,
                            color: getStatusColor(item.state),
                            backgroundColor: getStatusColor(item.state) + "20"
                          }}>
                            {item.state}
                          </span>
                          <button
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleKillQuery(item.pid);
                            }}
                            style={{
                              padding: "4px 8px",
                              border: `1px solid ${asciiColors.danger}`,
                              backgroundColor: asciiColors.background,
                              color: asciiColors.danger,
                              cursor: "pointer",
                              fontSize: 10,
                              borderRadius: 2,
                              transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = asciiColors.danger;
                              e.currentTarget.style.color = "#ffffff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = asciiColors.background;
                              e.currentTarget.style.color = asciiColors.danger;
                            }}
                          >
                            Kill
                          </button>
                        </>
                      )}
                      {activeTab === 'live' && (
                        <span style={{
                          padding: "2px 6px",
                          borderRadius: 2,
                          fontSize: 10,
                          fontWeight: 500,
                          border: `1px solid ${getStatusColor(item.status)}`,
                          color: getStatusColor(item.status),
                          backgroundColor: getStatusColor(item.status) + "20"
                        }}>
                          {item.status}
                        </span>
                      )}
                      {activeTab === 'performance' && (
                        <span style={{
                          padding: "2px 6px",
                          borderRadius: 2,
                          fontSize: 10,
                          fontWeight: 500,
                          border: `1px solid ${getStatusColor(item.performance_tier || 'N/A')}`,
                          color: getStatusColor(item.performance_tier || 'N/A'),
                          backgroundColor: getStatusColor(item.performance_tier || 'N/A') + "20"
                        }}>
                          {item.performance_tier || 'N/A'}
                        </span>
                      )}
                      {activeTab === 'transfer' && (
                        <span style={{
                          padding: "2px 6px",
                          borderRadius: 2,
                          fontSize: 10,
                          fontWeight: 500,
                          border: `1px solid ${getStatusColor(item.status || 'PENDING')}`,
                          color: getStatusColor(item.status || 'PENDING'),
                          backgroundColor: getStatusColor(item.status || 'PENDING') + "20"
                        }}>
                          {item.status || 'PENDING'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  const renderCharts = () => {
    if (activeTab === 'performance') {
      const tierDistribution = {
        EXCELLENT: queryPerformance.filter((q: any) => q.performance_tier === 'EXCELLENT').length,
        GOOD: queryPerformance.filter((q: any) => q.performance_tier === 'GOOD').length,
        FAIR: queryPerformance.filter((q: any) => q.performance_tier === 'FAIR').length,
        POOR: queryPerformance.filter((q: any) => q.performance_tier === 'POOR').length,
      };
      
      const blockingQueries = queryPerformance.filter((q: any) => q.is_blocking).length;
      const nonBlockingQueries = queryPerformance.length - blockingQueries;
      
      const avgTime = queryPerformance.length > 0
        ? queryPerformance.reduce((sum: number, q: any) => sum + (Number(q.mean_time_ms) || 0), 0) / queryPerformance.length
        : 0;

      return (
        <div style={{
          fontFamily: "Consolas",
          fontSize: 12,
          color: asciiColors.foreground,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 16
        }}>
          <div style={{
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            padding: 16,
            backgroundColor: asciiColors.backgroundSoft
          }}>
            <h2 style={{
              fontSize: 14,
              fontFamily: "Consolas",
              fontWeight: 600,
              color: asciiColors.accent,
              margin: 0,
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: `1px solid ${asciiColors.border}`
            }}>
              {ascii.blockFull} DISTRIBUTION BY TIER
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(tierDistribution).map(([tier, count], idx, arr) => {
                const total = Object.values(tierDistribution).reduce((a: number, b: number) => a + b, 0);
                const percentage = total > 0 ? (count / total) * 100 : 0;
                const isLast = idx === arr.length - 1;
                const tierColors: Record<string, string> = {
                  EXCELLENT: asciiColors.success,
                  GOOD: asciiColors.accent,
                  FAIR: asciiColors.warning,
                  POOR: asciiColors.danger,
                };
                return (
                  <div key={tier} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 0',
                    fontFamily: "Consolas",
                    fontSize: 11
                  }}>
                    <span style={{ color: asciiColors.muted, width: 20 }}>
                      {isLast ? ascii.cornerBl : ascii.v}
                    </span>
                    <span style={{ color: tierColors[tier] || asciiColors.accent, width: 12 }}>
                      {ascii.blockFull}
                    </span>
                    <span style={{ flex: 1, color: asciiColors.foreground }}>
                      {tier}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: tierColors[tier] || asciiColors.accent, minWidth: '60px', textAlign: 'right' }}>
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
                <div style={{ 
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            padding: 16,
            backgroundColor: asciiColors.backgroundSoft
                }}>
                  <h2 style={{
              fontSize: 14,
              fontFamily: "Consolas",
              fontWeight: 600,
              color: asciiColors.accent,
              margin: 0,
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: `1px solid ${asciiColors.border}`
            }}>
              {ascii.blockFull} BLOCKING VS NON-BLOCKING
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 0',
                fontFamily: "Consolas",
                fontSize: 11
              }}>
                <span style={{ color: asciiColors.muted, width: 20 }}>
                  {ascii.v}
                </span>
                <span style={{ color: asciiColors.danger, width: 12 }}>
                  {ascii.blockFull}
                </span>
                <span style={{ flex: 1, color: asciiColors.foreground }}>
                  Blocking
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: asciiColors.danger, minWidth: '30px', textAlign: 'right' }}>
                  {blockingQueries}
                </span>
                </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 0',
                fontFamily: "Consolas",
                fontSize: 11
              }}>
                <span style={{ color: asciiColors.muted, width: 20 }}>
                  {ascii.cornerBl}
                </span>
                <span style={{ color: asciiColors.success, width: 12 }}>
                  {ascii.blockFull}
                </span>
                <span style={{ flex: 1, color: asciiColors.foreground }}>
                  Non-Blocking
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: asciiColors.success, minWidth: '30px', textAlign: 'right' }}>
                  {nonBlockingQueries}
                </span>
              </div>
            </div>
                <div style={{ 
              marginTop: 12,
              paddingTop: 12,
              borderTop: `1px solid ${asciiColors.border}`
            }}>
              <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: 4 }}>
                {ascii.v} Avg Execution Time
                </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, fontFamily: "Consolas" }}>
                {formatTime(avgTime)}
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    if (activeTab === 'monitor') {
      const queriesByDb = activeQueries.reduce((acc: Record<string, number>, q: any) => {
        const db = q.datname || 'Unknown';
        acc[db] = (acc[db] || 0) + 1;
        return acc;
      }, {});
      
      const queriesByState = activeQueries.reduce((acc: Record<string, number>, q: any) => {
        const state = q.state || 'Unknown';
        acc[state] = (acc[state] || 0) + 1;
        return acc;
      }, {});

      return (
        <div style={{
          fontFamily: "Consolas",
          fontSize: 12,
          color: asciiColors.foreground,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 16
        }}>
          <div style={{
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            padding: 16,
            backgroundColor: asciiColors.backgroundSoft
          }}>
            <h2 style={{
              fontSize: 14,
              fontFamily: "Consolas",
              fontWeight: 600,
              color: asciiColors.accent,
              margin: 0,
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: `1px solid ${asciiColors.border}`
            }}>
              {ascii.blockFull} QUERIES BY DATABASE
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(queriesByDb)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([db, count], idx, arr) => {
                  const max = Math.max(...Object.values(queriesByDb) as number[]);
                  const isLast = idx === arr.length - 1;
                  return (
                    <div key={db} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 0',
                      fontFamily: "Consolas",
                      fontSize: 11
                    }}>
                      <span style={{ color: asciiColors.muted, width: 20 }}>
                        {isLast ? ascii.cornerBl : ascii.v}
                      </span>
                      <span style={{ flex: 1, color: asciiColors.foreground, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {db}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: asciiColors.accent, minWidth: '30px', textAlign: 'right' }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
          
          <div style={{
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            padding: 16,
            backgroundColor: asciiColors.backgroundSoft
          }}>
            <h2 style={{
              fontSize: 14,
              fontFamily: "Consolas",
              fontWeight: 600,
              color: asciiColors.accent,
              margin: 0,
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: `1px solid ${asciiColors.border}`
            }}>
              {ascii.blockFull} QUERIES BY STATE
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(queriesByState)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([state, count], idx, arr) => {
                  const isLast = idx === arr.length - 1;
                  const stateColors: Record<string, string> = {
                    'active': asciiColors.success,
                    'idle': asciiColors.muted,
                    'idle in transaction': asciiColors.warning,
                    'idle in transaction (aborted)': asciiColors.danger,
                    'fastpath function call': asciiColors.accent,
                    'disabled': asciiColors.muted,
                  };
                  return (
                    <div key={state} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 0',
                      fontFamily: "Consolas",
                      fontSize: 11
                    }}>
                      <span style={{ color: asciiColors.muted, width: 20 }}>
                        {isLast ? ascii.cornerBl : ascii.v}
                      </span>
                      <span style={{ flex: 1, color: asciiColors.foreground, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {state.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: stateColors[state.toLowerCase()] || asciiColors.accent, minWidth: '30px', textAlign: 'right' }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      );
    }
    
    if (activeTab === 'live') {
      const eventsByType = processingLogs.reduce((acc: Record<string, number>, log: any) => {
        const type = log.pk_strategy || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      
      const eventsByStatus = processingLogs.reduce((acc: Record<string, number>, log: any) => {
        const status = log.status || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      return (
        <div style={{
          fontFamily: "Consolas",
          fontSize: 12,
          color: asciiColors.foreground,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 16
        }}>
          <div style={{
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            padding: 16,
            backgroundColor: asciiColors.backgroundSoft
          }}>
            <h2 style={{
              fontSize: 14,
              fontFamily: "Consolas",
              fontWeight: 600,
              color: asciiColors.accent,
              margin: 0,
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: `1px solid ${asciiColors.border}`
            }}>
              {ascii.blockFull} EVENTS BY TYPE
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(eventsByType)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([type, count], idx, arr) => {
                  const isLast = idx === arr.length - 1;
                  return (
                    <div key={type} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 0',
                      fontFamily: "Consolas",
                      fontSize: 11
                    }}>
                      <span style={{ color: asciiColors.muted, width: 20 }}>
                        {isLast ? ascii.cornerBl : ascii.v}
                      </span>
                      <span style={{ flex: 1, color: asciiColors.foreground, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {type === 'Unknown' ? 'N/A' : type}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: asciiColors.accent, minWidth: '30px', textAlign: 'right' }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
          
          <div style={{
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            padding: 16,
            backgroundColor: asciiColors.backgroundSoft
          }}>
            <h2 style={{
              fontSize: 14,
              fontFamily: "Consolas",
              fontWeight: 600,
              color: asciiColors.accent,
              margin: 0,
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: `1px solid ${asciiColors.border}`
            }}>
              {ascii.blockFull} EVENTS BY STATUS
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(eventsByStatus)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([status, count], idx, arr) => {
                  const isLast = idx === arr.length - 1;
                  const statusColors: Record<string, string> = {
                    'SUCCESS': asciiColors.success,
                    'ERROR': asciiColors.danger,
                    'PENDING': asciiColors.warning,
                    'IN_PROGRESS': asciiColors.accent,
                    'LISTENING_CHANGES': asciiColors.success,
                  };
                  return (
                    <div key={status} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 0',
                      fontFamily: "Consolas",
                      fontSize: 11
                    }}>
                      <span style={{ color: asciiColors.muted, width: 20 }}>
                        {isLast ? ascii.cornerBl : ascii.v}
                      </span>
                      <span style={{ flex: 1, color: asciiColors.foreground, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {status}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: statusColors[status] || asciiColors.accent, minWidth: '30px', textAlign: 'right' }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      );
    }
    
    if (activeTab === 'transfer') {
      const metricsByStatus = transferMetrics.reduce((acc: Record<string, number>, metric: any) => {
        const status = metric.status || 'PENDING';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      
      const metricsByType = transferMetrics.reduce((acc: Record<string, number>, metric: any) => {
        const type = metric.transfer_type || 'UNKNOWN';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      const metricsByEngine = transferMetrics.reduce((acc: Record<string, number>, metric: any) => {
        const engine = metric.db_engine || 'Unknown';
        acc[engine] = (acc[engine] || 0) + 1;
        return acc;
      }, {});

      const totalRecords = transferMetrics.reduce((sum: number, m: any) => sum + (parseInt(m.records_transferred) || 0), 0);
      const totalBytes = transferMetrics.reduce((sum: number, m: any) => sum + (parseInt(m.bytes_transferred) || 0), 0);
      const avgMemory = transferMetrics.length > 0 
        ? transferMetrics.reduce((sum: number, m: any) => sum + (parseFloat(m.memory_used_mb) || 0), 0) / transferMetrics.length
        : 0;
      const avgIOPS = transferMetrics.length > 0
        ? transferMetrics.reduce((sum: number, m: any) => sum + (parseInt(m.io_operations_per_second) || 0), 0) / transferMetrics.length
        : 0;

      return (
        <div style={{
          fontFamily: "Consolas",
          fontSize: 12,
          color: asciiColors.foreground,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 16
        }}>
          <div style={{
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            padding: 16,
            backgroundColor: asciiColors.backgroundSoft
          }}>
            <h2 style={{
              fontSize: 14,
              fontFamily: "Consolas",
              fontWeight: 600,
              color: asciiColors.accent,
              margin: 0,
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: `1px solid ${asciiColors.border}`
            }}>
              {ascii.blockFull} TRANSFERS BY STATUS
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(metricsByStatus)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([status, count], idx, arr) => {
                  const isLast = idx === arr.length - 1;
                  const statusColors: Record<string, string> = {
                    'SUCCESS': asciiColors.success,
                    'FAILED': asciiColors.danger,
                    'PENDING': asciiColors.warning,
                  };
                  return (
                    <div key={status} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 0',
                      fontFamily: "Consolas",
                      fontSize: 11
                    }}>
                      <span style={{ color: asciiColors.muted, width: 20 }}>
                        {isLast ? ascii.cornerBl : ascii.v}
                      </span>
                      <span style={{ flex: 1, color: asciiColors.foreground, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {status}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: statusColors[status] || asciiColors.accent, minWidth: '30px', textAlign: 'right' }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
          
          <div style={{
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            padding: 16,
            backgroundColor: asciiColors.backgroundSoft
          }}>
            <h2 style={{
              fontSize: 14,
              fontFamily: "Consolas",
              fontWeight: 600,
              color: asciiColors.accent,
              margin: 0,
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: `1px solid ${asciiColors.border}`
            }}>
              {ascii.blockFull} TRANSFERS BY TYPE
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(metricsByType)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([type, count], idx, arr) => {
                  const isLast = idx === arr.length - 1;
                  return (
                    <div key={type} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 0',
                      fontFamily: "Consolas",
                      fontSize: 11
                    }}>
                      <span style={{ color: asciiColors.muted, width: 20 }}>
                        {isLast ? ascii.cornerBl : ascii.v}
                      </span>
                      <span style={{ flex: 1, color: asciiColors.foreground, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {type}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: asciiColors.accent, minWidth: '30px', textAlign: 'right' }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          <div style={{
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            padding: 16,
            backgroundColor: asciiColors.backgroundSoft
          }}>
            <h2 style={{
              fontSize: 14,
              fontFamily: "Consolas",
              fontWeight: 600,
              color: asciiColors.accent,
              margin: 0,
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: `1px solid ${asciiColors.border}`
            }}>
              {ascii.blockFull} TRANSFERS BY ENGINE
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(metricsByEngine)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([engine, count], idx, arr) => {
                  const isLast = idx === arr.length - 1;
                  return (
                    <div key={engine} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 0',
                      fontFamily: "Consolas",
                      fontSize: 11
                    }}>
                      <span style={{ color: asciiColors.muted, width: 20 }}>
                        {isLast ? ascii.cornerBl : ascii.v}
                      </span>
                      <span style={{ flex: 1, color: asciiColors.foreground, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {engine}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: asciiColors.accent, minWidth: '30px', textAlign: 'right' }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          <div style={{
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            padding: 16,
            backgroundColor: asciiColors.backgroundSoft
          }}>
            <h2 style={{
              fontSize: 14,
              fontFamily: "Consolas",
              fontWeight: 600,
              color: asciiColors.accent,
              margin: 0,
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: `1px solid ${asciiColors.border}`
            }}>
              {ascii.blockFull} SUMMARY STATISTICS
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                <span style={{ color: asciiColors.muted, fontSize: 11 }}>{ascii.v} Total Records</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: asciiColors.accent, fontFamily: "Consolas" }}>
                    {totalRecords.toLocaleString()}
                </span>
                  </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                <span style={{ color: asciiColors.muted, fontSize: 11 }}>{ascii.v} Total Bytes</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: asciiColors.accent, fontFamily: "Consolas" }}>
                    {(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB
                </span>
                  </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                <span style={{ color: asciiColors.muted, fontSize: 11 }}>{ascii.v} Avg Memory</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: asciiColors.accent, fontFamily: "Consolas" }}>
                    {avgMemory.toFixed(2)} MB
                </span>
                  </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                <span style={{ color: asciiColors.muted, fontSize: 11 }}>{ascii.cornerBl} Avg IOPS</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: asciiColors.accent, fontFamily: "Consolas" }}>
                    {avgIOPS.toFixed(0)}
                </span>
                  </div>
                </div>
              </div>
        </div>
      );
    }
    
    return null;
  };

  const renderDetails = () => {
    if (activeTab === 'live') {
      if (selectedItem) {
        const getStatusColor = (status: string) => {
          const upperStatus = (status || '').toUpperCase();
          if (upperStatus === 'SUCCESS') {
            return asciiColors.success;
          }
          if (upperStatus === 'ERROR' || upperStatus === 'FAILED') {
            return asciiColors.danger;
          }
          if (upperStatus === 'PENDING' || upperStatus === 'IN_PROGRESS') {
            return asciiColors.warning;
          }
          return asciiColors.muted;
        };

        return (
          <div style={{
            fontFamily: "Consolas",
            fontSize: 12,
            color: asciiColors.foreground
          }}>
            <div style={{
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              padding: 16,
              backgroundColor: asciiColors.backgroundSoft,
              marginBottom: 12
            }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: asciiColors.accent,
                marginBottom: 16,
                paddingBottom: 8,
                borderBottom: `1px solid ${asciiColors.border}`
              }}>
                {ascii.blockFull} LIVE CHANGE DETAILS
              </div>
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                fontFamily: "Consolas",
                fontSize: 11,
                lineHeight: 1.8
              }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: asciiColors.muted }}>├─ Database:</span>
                  <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.db_engine || 'N/A'}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: asciiColors.muted }}>├─ Schema:</span>
                  <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.schema_name || 'N/A'}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: asciiColors.muted }}>├─ Table:</span>
                  <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.table_name || 'N/A'}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: asciiColors.muted }}>├─ Status:</span>
                  <span style={{ 
                    marginLeft: 20,
                    padding: "2px 8px",
                    borderRadius: 2,
                    fontSize: 10,
                    fontWeight: 500,
                    border: `1px solid ${getStatusColor(selectedItem.status || 'PENDING')}`,
                    color: getStatusColor(selectedItem.status || 'PENDING'),
                    backgroundColor: getStatusColor(selectedItem.status || 'PENDING') + "20"
                  }}>
                    {selectedItem.status || 'PENDING'}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: asciiColors.muted }}>├─ Strategy:</span>
                  <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.pk_strategy || 'N/A'}</span>
                </div>
                {selectedItem.new_pk && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: asciiColors.muted }}>├─ Last PK:</span>
                    <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.new_pk}</span>
                  </div>
                )}
                {selectedItem.record_count !== null && selectedItem.record_count !== undefined && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: asciiColors.muted }}>├─ Records:</span>
                    <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.record_count.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: asciiColors.muted }}>└─ Processed At:</span>
                  <span style={{ fontWeight: 500, marginLeft: 20 }}>{formatDate(selectedItem.processed_at)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      }

      const recentEvents = [...processingLogs]
        .sort((a, b) => new Date(b.processed_at || 0).getTime() - new Date(a.processed_at || 0).getTime())
        .slice(0, 20);

      return (
        <>
          {renderCharts()}
          <h2 style={{
            fontSize: 14,
            fontFamily: "Consolas",
            fontWeight: 600,
            color: asciiColors.accent,
            margin: 0,
            marginBottom: 16,
            paddingBottom: 8,
            borderBottom: `1px solid ${asciiColors.border}`
          }}>
            {ascii.blockFull} CURRENT CHANGES
          </h2>
          {recentEvents.length === 0 ? (
            <div style={{
              padding: 60,
              textAlign: "center",
              color: asciiColors.muted,
              fontFamily: "Consolas",
              fontSize: 12
            }}>
              {ascii.dot} No recent events available
            </div>
          ) : (
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}>
              {recentEvents.map((event, idx) => {
                const getStatusColor = (status: string) => {
                  const upperStatus = (status || '').toUpperCase();
                  if (upperStatus === 'SUCCESS') {
                    return asciiColors.success;
                  }
                  if (upperStatus === 'ERROR' || upperStatus === 'FAILED') {
                    return asciiColors.danger;
                  }
                  if (upperStatus === 'PENDING' || upperStatus === 'IN_PROGRESS') {
                    return asciiColors.warning;
                  }
                  return asciiColors.muted;
                };

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedItem(event)}
                    style={{
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      padding: 12,
                      backgroundColor: asciiColors.backgroundSoft,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      fontFamily: "Consolas",
                      fontSize: 11
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.accent;
                      e.currentTarget.style.backgroundColor = asciiColors.background;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.border;
                      e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                    }}
                  >
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8
                    }}>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: 2,
                        fontSize: 10,
                        fontWeight: 500,
                        border: `1px solid ${getStatusColor(event.status)}`,
                        color: getStatusColor(event.status),
                        backgroundColor: getStatusColor(event.status) + "20"
                      }}>
                        {event.status}
                      </span>
                      <span style={{
                        fontSize: 10,
                        color: asciiColors.muted,
                        fontFamily: "Consolas"
                      }}>
                        {formatDate(event.processed_at)}
                      </span>
                    </div>
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      fontSize: 11,
                      color: asciiColors.foreground
                    }}>
                      <div>
                        <span style={{ color: asciiColors.muted }}>{ascii.v}</span>
                        <span style={{ fontWeight: 600, marginLeft: 8 }}>
                          {event.schema_name || 'N/A'}.{event.table_name || 'N/A'}
                        </span>
                        <span style={{ color: asciiColors.muted, marginLeft: 8 }}>
                          [{event.db_engine || 'N/A'}]
                        </span>
                      </div>
                      <div style={{ paddingLeft: 16, color: asciiColors.muted }}>
                        {ascii.tRight} Strategy: {event.pk_strategy || 'N/A'}
                    {event.record_count !== null && event.record_count !== undefined && (
                          <span style={{ marginLeft: 12 }}>
                            {ascii.v} Records: {event.record_count.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      );
    }

    if (!selectedItem) {
      return (
        <>
          {renderCharts()}
          <div style={{
            padding: 60,
            textAlign: "center",
            color: asciiColors.muted,
            fontFamily: "Consolas",
            fontSize: 12
          }}>
            {ascii.dot} Select an item to view details
          </div>
        </>
      );
    }

    if (activeTab === 'monitor') {
      if (!selectedItem) {
        return (
          <div style={{
            fontFamily: "Consolas",
            fontSize: 12,
            color: asciiColors.muted,
            textAlign: "center",
            padding: 20
          }}>
            {ascii.dot} Select a query to view details
          </div>
        );
      }

      const getStateColor = (state: string) => {
        const upperState = (state || '').toUpperCase();
        if (upperState.includes('ERROR') || upperState.includes('ABORTED')) {
          return asciiColors.danger;
        }
        if (upperState.includes('IDLE IN TRANSACTION')) {
          return asciiColors.warning;
        }
        if (upperState === 'ACTIVE') {
          return asciiColors.success;
        }
        return asciiColors.muted;
      };

      return (
        <div style={{
          fontFamily: "Consolas",
          fontSize: 12,
          color: asciiColors.foreground
        }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            fontFamily: "Consolas",
            fontSize: 11,
            lineHeight: 1.8
          }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ PID:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.pid}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ User:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.usename}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Database:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.datname}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ State:</span>
                <span style={{ 
                  marginLeft: 20,
                  padding: "2px 8px",
                  borderRadius: 2,
                  fontSize: 10,
                  fontWeight: 500,
                  border: `1px solid ${getStateColor(selectedItem.state)}`,
                  color: getStateColor(selectedItem.state),
                  backgroundColor: getStateColor(selectedItem.state) + "20"
                }}>
                  {selectedItem.state}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Duration:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.duration}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Application:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.application_name || '-'}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Client Address:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.client_addr || '-'}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Started At:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{formatDate(selectedItem.query_start)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>└─ Wait Event:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>
              {selectedItem.wait_event_type ? `${selectedItem.wait_event_type} (${selectedItem.wait_event})` : 'None'}
                </span>
              </div>
            </div>
        </div>
      );
    } else if (activeTab === 'transfer') {
      const getStatusColor = (status: string) => {
        const upperStatus = (status || '').toUpperCase();
        if (upperStatus === 'SUCCESS') {
          return asciiColors.success;
        }
        if (upperStatus === 'FAILED' || upperStatus === 'ERROR') {
          return asciiColors.danger;
        }
        if (upperStatus === 'PENDING' || upperStatus === 'IN_PROGRESS') {
          return asciiColors.warning;
        }
        return asciiColors.muted;
      };

      return (
        <div style={{
          fontFamily: "Consolas",
          fontSize: 12,
          color: asciiColors.foreground
        }}>
          <div style={{
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            padding: 16,
            backgroundColor: asciiColors.backgroundSoft,
            marginBottom: 12
          }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: asciiColors.accent,
              marginBottom: 16,
              paddingBottom: 8,
              borderBottom: `1px solid ${asciiColors.border}`
            }}>
              {ascii.blockFull} TRANSFER METRICS DETAILS
            </div>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontFamily: "Consolas",
              fontSize: 11,
              lineHeight: 1.8
            }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Schema:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.schema_name || 'N/A'}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Table:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.table_name || 'N/A'}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Database Engine:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.db_engine || 'N/A'}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Status:</span>
                <span style={{ 
                  marginLeft: 20,
                  padding: "2px 8px",
                  borderRadius: 2,
                  fontSize: 10,
                  fontWeight: 500,
                  border: `1px solid ${getStatusColor(selectedItem.status || 'PENDING')}`,
                  color: getStatusColor(selectedItem.status || 'PENDING'),
                  backgroundColor: getStatusColor(selectedItem.status || 'PENDING') + "20"
                }}>
                {selectedItem.status || 'PENDING'}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Transfer Type:</span>
                <span style={{ 
                  marginLeft: 20,
                  padding: "2px 8px",
                  borderRadius: 2,
                  fontSize: 10,
                  fontWeight: 500,
                  border: `1px solid ${asciiColors.accent}`,
                  color: asciiColors.accent,
                  backgroundColor: asciiColors.accent + "20"
                }}>
                {selectedItem.transfer_type || 'UNKNOWN'}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Records Transferred:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{(selectedItem.records_transferred || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Bytes Transferred:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>
              {selectedItem.bytes_transferred 
                ? `${(selectedItem.bytes_transferred / (1024 * 1024 * 1024)).toFixed(2)} GB`
                : '0 GB'}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Memory Used:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>
              {selectedItem.memory_used_mb 
                ? `${parseFloat(selectedItem.memory_used_mb).toFixed(2)} MB`
                : '0 MB'}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ IO Operations/sec:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.io_operations_per_second || 0}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Started At:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.started_at ? formatDate(selectedItem.started_at) : 'N/A'}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Completed At:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.completed_at ? formatDate(selectedItem.completed_at) : 'N/A'}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>{selectedItem.error_message ? '├─' : '└─'} Created At:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{formatDate(selectedItem.created_at)}</span>
              </div>
            {selectedItem.error_message && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: asciiColors.muted }}>└─ Error Message:</span>
                  <span style={{ 
                    fontWeight: 500, 
                    marginLeft: 20,
                    color: asciiColors.danger,
                    maxWidth: '60%',
                    textAlign: 'right',
                    wordBreak: 'break-word'
                  }}>
                    {selectedItem.error_message}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    } else {
      const getPerformanceTierColor = (tier: string) => {
        const upperTier = (tier || '').toUpperCase();
        if (upperTier === 'EXCELLENT') {
          return asciiColors.success;
        }
        if (upperTier === 'GOOD') {
          return asciiColors.accent;
        }
        if (upperTier === 'FAIR') {
          return asciiColors.warning;
        }
        if (upperTier === 'POOR') {
          return asciiColors.danger;
        }
        return asciiColors.muted;
      };

      return (
        <div style={{
          fontFamily: "Consolas",
          fontSize: 12,
          color: asciiColors.foreground
        }}>
          <div style={{
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            padding: 16,
            backgroundColor: asciiColors.backgroundSoft,
            marginBottom: 12
          }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: asciiColors.accent,
              marginBottom: 16,
              paddingBottom: 8,
              borderBottom: `1px solid ${asciiColors.border}`
            }}>
              {ascii.blockFull} QUERY PERFORMANCE DETAILS
            </div>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontFamily: "Consolas",
              fontSize: 11,
              lineHeight: 1.8
            }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Query ID:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.queryid || 'N/A'}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Database:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.dbname || 'N/A'}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Performance Tier:</span>
                <span style={{ 
                  marginLeft: 20,
                  padding: "2px 8px",
                  borderRadius: 2,
                  fontSize: 10,
                  fontWeight: 500,
                  border: `1px solid ${getPerformanceTierColor(selectedItem.performance_tier || 'N/A')}`,
                  color: getPerformanceTierColor(selectedItem.performance_tier || 'N/A'),
                  backgroundColor: getPerformanceTierColor(selectedItem.performance_tier || 'N/A') + "20"
                }}>
                {selectedItem.performance_tier || 'N/A'}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Operation Type:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.operation_type || 'N/A'}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Mean Time:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{formatTime(selectedItem.mean_time_ms)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Total Time:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{formatTime(selectedItem.total_time_ms)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Calls:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.calls?.toLocaleString() || 'N/A'}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Efficiency Score:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>
              {selectedItem.query_efficiency_score ? `${Number(selectedItem.query_efficiency_score).toFixed(2)}%` : 'N/A'}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Cache Hit Ratio:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>
              {selectedItem.cache_hit_ratio ? `${Number(selectedItem.cache_hit_ratio).toFixed(2)}%` : 'N/A'}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Rows Returned:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{selectedItem.rows_returned?.toLocaleString() || 'N/A'}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Long Running:</span>
                <span style={{ 
                  fontWeight: 500, 
                  marginLeft: 20,
                  color: selectedItem.is_long_running ? asciiColors.warning : asciiColors.muted
                }}>
                  {selectedItem.is_long_running ? 'Yes' : 'No'}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>├─ Blocking:</span>
                <span style={{ 
                  fontWeight: 500, 
                  marginLeft: 20,
                  color: selectedItem.is_blocking ? asciiColors.danger : asciiColors.muted
                }}>
                  {selectedItem.is_blocking ? 'Yes' : 'No'}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: asciiColors.muted }}>└─ Captured At:</span>
                <span style={{ fontWeight: 500, marginLeft: 20 }}>{formatDate(selectedItem.captured_at)}</span>
              </div>
            </div>
          </div>
          <div style={{
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            padding: 16,
            backgroundColor: asciiColors.backgroundSoft
          }}>
            <h2 style={{
              fontSize: 14,
              fontFamily: "Consolas",
              fontWeight: 600,
              color: asciiColors.accent,
              margin: 0,
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: `1px solid ${asciiColors.border}`
            }}>
              {ascii.blockFull} QUERY TEXT
            </h2>
            <pre style={{
              margin: 0,
              padding: 12,
              backgroundColor: asciiColors.background,
              borderRadius: 2,
              overflowX: "auto",
              fontSize: 11,
              border: `1px solid ${asciiColors.border}`,
              fontFamily: "Consolas",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              color: asciiColors.foreground
            }}>
              {selectedItem.query_text || 'N/A'}
            </pre>
          </div>
        </div>
      );
    }
  };

  const renderSystemResources = () => {
    return (
      <div style={{
        fontFamily: "Consolas",
        fontSize: 12,
        color: asciiColors.foreground
      }}>
        <div style={{
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          padding: 16,
          backgroundColor: asciiColors.backgroundSoft,
          marginBottom: 16
        }}>
          <h2 style={{
            fontSize: 14,
            fontFamily: "Consolas",
            fontWeight: 600,
            color: asciiColors.accent,
            margin: 0,
            marginBottom: 16,
            paddingBottom: 8,
            borderBottom: `1px solid ${asciiColors.border}`
          }}>
            {ascii.blockFull} SYSTEM RESOURCES
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12
          }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "12px",
              backgroundColor: asciiColors.background,
              borderRadius: 2,
              border: `1px solid ${asciiColors.border}`
            }}>
              <div style={{
                fontSize: 11,
                color: asciiColors.accent,
                marginBottom: 4
              }}>
                {ascii.blockFull} CPU Usage (%)
              </div>
              <AsciiSparkline 
                data={resourceHistory.cpuUsage} 
                color={asciiColors.accent}
                width={40}
                labels={resourceHistory.timestamp}
              />
              <div style={{
                fontSize: 10,
                color: asciiColors.muted,
                fontFamily: "Consolas",
                marginTop: 4
              }}>
                {resourceHistory.cpuUsage.length > 0 
                  ? resourceHistory.cpuUsage[resourceHistory.cpuUsage.length - 1].toFixed(1) + '%'
                  : 'N/A'}
              </div>
            </div>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "12px",
              backgroundColor: asciiColors.background,
              borderRadius: 2,
              border: `1px solid ${asciiColors.border}`
            }}>
              <div style={{
                fontSize: 11,
                color: asciiColors.accent,
                marginBottom: 4
              }}>
                {ascii.blockSemi} Memory (%)
              </div>
              <AsciiSparkline 
                data={resourceHistory.memoryPercentage} 
                color={asciiColors.accent}
                width={40}
                labels={resourceHistory.timestamp}
              />
              <div style={{
                fontSize: 10,
                color: asciiColors.muted,
                fontFamily: "Consolas",
                marginTop: 4
              }}>
                {resourceHistory.memoryPercentage.length > 0 
                  ? resourceHistory.memoryPercentage[resourceHistory.memoryPercentage.length - 1].toFixed(1) + '%'
                  : 'N/A'}
              </div>
            </div>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "12px",
              backgroundColor: asciiColors.background,
              borderRadius: 2,
              border: `1px solid ${asciiColors.border}`
            }}>
              <div style={{
                fontSize: 11,
                color: asciiColors.accent,
                marginBottom: 4
              }}>
                {ascii.blockLight} Network (IOPS)
              </div>
              <AsciiSparkline 
                data={resourceHistory.network} 
                color={asciiColors.accent}
                width={40}
                labels={resourceHistory.timestamp}
              />
              <div style={{
                fontSize: 10,
                color: asciiColors.muted,
                fontFamily: "Consolas",
                marginTop: 4
              }}>
                {resourceHistory.network.length > 0 
                  ? resourceHistory.network[resourceHistory.network.length - 1].toFixed(0)
                  : 'N/A'}
              </div>
            </div>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "12px",
              backgroundColor: asciiColors.background,
              borderRadius: 2,
              border: `1px solid ${asciiColors.border}`
            }}>
              <div style={{
                fontSize: 11,
                color: asciiColors.accent,
                marginBottom: 4
              }}>
                {ascii.dot} Throughput (RPS)
              </div>
              <AsciiSparkline 
                data={resourceHistory.throughput} 
                color={asciiColors.accent}
                width={40}
            labels={resourceHistory.timestamp}
          />
              <div style={{
                fontSize: 10,
                color: asciiColors.muted,
                fontFamily: "Consolas",
                marginTop: 4
              }}>
                {resourceHistory.throughput.length > 0 
                  ? resourceHistory.throughput[resourceHistory.throughput.length - 1].toFixed(0)
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          padding: 16,
          backgroundColor: asciiColors.backgroundSoft,
          marginBottom: 16
        }}>
          <h2 style={{
            fontSize: 14,
            fontFamily: "Consolas",
            fontWeight: 600,
            color: asciiColors.accent,
            margin: 0,
            marginBottom: 16,
            paddingBottom: 8,
            borderBottom: `1px solid ${asciiColors.border}`
          }}>
            {ascii.blockFull} DATABASE METRICS
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12
          }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "12px",
              backgroundColor: asciiColors.background,
              borderRadius: 2,
              border: `1px solid ${asciiColors.border}`
            }}>
              <div style={{
                fontSize: 11,
                color: asciiColors.accent,
                marginBottom: 4
              }}>
                {ascii.blockFull} DB Connections (%)
              </div>
              <AsciiSparkline 
                data={resourceHistory.dbConnections} 
                color={asciiColors.accent}
                width={40}
                labels={resourceHistory.timestamp}
              />
              <div style={{
                fontSize: 10,
                color: asciiColors.muted,
                fontFamily: "Consolas",
                marginTop: 4
              }}>
                {resourceHistory.dbConnections.length > 0 
                  ? resourceHistory.dbConnections[resourceHistory.dbConnections.length - 1].toFixed(1) + '%'
                  : 'N/A'}
              </div>
            </div>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "12px",
              backgroundColor: asciiColors.background,
              borderRadius: 2,
              border: `1px solid ${asciiColors.border}`
            }}>
              <div style={{
                fontSize: 11,
                color: asciiColors.accent,
                marginBottom: 4
              }}>
                {ascii.blockSemi} DB Queries/sec
              </div>
              <AsciiSparkline 
                data={resourceHistory.dbQueriesPerSecond} 
                color={asciiColors.accent}
                width={40}
            labels={resourceHistory.timestamp}
          />
              <div style={{
                fontSize: 10,
                color: asciiColors.muted,
                fontFamily: "Consolas",
                marginTop: 4
              }}>
                {resourceHistory.dbQueriesPerSecond.length > 0 
                  ? resourceHistory.dbQueriesPerSecond[resourceHistory.dbQueriesPerSecond.length - 1].toFixed(1)
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>

          <div style={{ 
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          padding: 16,
          backgroundColor: asciiColors.backgroundSoft
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: asciiColors.accent,
            marginBottom: 16,
            paddingBottom: 8,
            borderBottom: `1px solid ${asciiColors.border}`
          }}>
            {ascii.blockFull} DATABASE HEALTH
          </div>
          <div style={{ 
            fontFamily: "Consolas",
            fontSize: 11,
            lineHeight: 1.8,
            color: asciiColors.foreground
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Active Connections:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>{dbHealth.activeConnections || '0/0'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Connection Usage:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>{dbHealth.connectionPercentage || '0.0'}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Response Time:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>{dbHealth.responseTime || '< 1ms'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Buffer Hit Rate:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>{dbHealth.bufferHitRate || '0.0'}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Cache Hit Rate:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>{dbHealth.cacheHitRate || '0.0'}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Status:</span>
              <span style={{ marginLeft: '20px' }}>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 2,
                  fontSize: 10,
                  fontWeight: 500,
                  border: `1px solid ${dbHealth.status === 'Healthy' ? asciiColors.success : asciiColors.muted}`,
                  color: dbHealth.status === 'Healthy' ? asciiColors.success : asciiColors.muted,
                  backgroundColor: (dbHealth.status === 'Healthy' ? asciiColors.success : asciiColors.muted) + "20"
                }}>
                  {dbHealth.status || 'Unknown'}
                </span>
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Uptime:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>
                {dbHealth.uptimeSeconds 
                  ? `${Math.floor(dbHealth.uptimeSeconds / 86400)}d ${Math.floor((dbHealth.uptimeSeconds % 86400) / 3600)}h ${Math.floor((dbHealth.uptimeSeconds % 3600) / 60)}m`
                  : 'N/A'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Active Queries:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>{dbHealth.activeQueries || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Waiting Queries:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>{dbHealth.waitingQueries || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Avg Query Duration:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>
                {dbHealth.avgQueryDuration && typeof dbHealth.avgQueryDuration === 'number' 
                  ? `${dbHealth.avgQueryDuration.toFixed(2)}s` 
                  : 'N/A'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Query Efficiency:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>
                {dbHealth.queryEfficiencyScore && typeof dbHealth.queryEfficiencyScore === 'number'
                  ? `${dbHealth.queryEfficiencyScore.toFixed(1)}%`
                  : '0.0%'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Long Running Queries:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>{dbHealth.longRunningQueries || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Blocking Queries:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>{dbHealth.blockingQueries || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Total Queries (24h):</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>{dbHealth.totalQueries24h || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: asciiColors.muted }}>└─ Database Size:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>
                {dbHealth.databaseSizeBytes 
                  ? `${(dbHealth.databaseSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getStats = () => {
    const renderStatCard = (value: string | number, label: string) => (
      <div
        style={{
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          padding: "12px 16px",
          backgroundColor: asciiColors.backgroundSoft,
          transition: "all 0.2s ease",
          fontFamily: "Consolas"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
          e.currentTarget.style.borderColor = asciiColors.accent;
          e.currentTarget.style.backgroundColor = asciiColors.background;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.borderColor = asciiColors.border;
          e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
        }}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8
        }}>
          <span style={{ color: asciiColors.accent, fontSize: 12 }}>{ascii.blockFull}</span>
          <div style={{
            fontSize: "1.6em",
            fontWeight: 600,
            color: asciiColors.accent,
            fontFamily: "Consolas"
          }}>
            {value}
          </div>
        </div>
        <div style={{
          fontSize: 10,
          color: asciiColors.muted,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          fontWeight: 500,
          borderTop: `1px solid ${asciiColors.border}`,
          paddingTop: 8,
          marginTop: 8
        }}>
          {ascii.v} {label}
        </div>
      </div>
    );

    if (activeTab === 'monitor') {
      return (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 16,
          marginBottom: 20,
          animation: "fadeInUp 0.3s ease-out"
        }}>
          {renderStatCard(activeQueries.length, "Active Queries")}
          {renderStatCard(processingStats.total || 0, "Total Events")}
          {renderStatCard(processingStats.listeningChanges || 0, "Listening")}
          {renderStatCard(processingStats.errors || 0, "Errors")}
        </div>
      );
    } else if (activeTab === 'live') {
      return (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 16,
          marginBottom: 20,
          animation: "fadeInUp 0.3s ease-out"
        }}>
          {renderStatCard(processingStats.total || 0, "Total Events")}
          {renderStatCard(processingStats.last24h || 0, "Last 24h")}
          {renderStatCard(processingStats.listeningChanges || 0, "Listening")}
          {renderStatCard(processingStats.fullLoad || 0, "Full Load")}
          {renderStatCard(processingStats.errors || 0, "Errors")}
        </div>
      );
    } else if (activeTab === 'transfer') {
      return (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 16,
          marginBottom: 20,
          animation: "fadeInUp 0.3s ease-out"
        }}>
          {renderStatCard(transferStats.total_transfers || 0, "Total Transfers")}
          {renderStatCard(transferStats.successful || 0, "Successful")}
          {renderStatCard(transferStats.failed || 0, "Failed")}
          {renderStatCard(transferStats.pending || 0, "Pending")}
          {renderStatCard(
            transferStats.total_records 
              ? `${(transferStats.total_records / 1000000).toFixed(1)}M` 
              : '0',
            "Total Records"
          )}
          {renderStatCard(
            transferStats.total_bytes 
              ? `${(transferStats.total_bytes / (1024 * 1024 * 1024)).toFixed(1)} GB` 
              : '0 GB',
            "Total Bytes"
          )}
        </div>
      );
    } else {
      return (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 16,
          marginBottom: 20,
          animation: "fadeInUp 0.3s ease-out"
        }}>
          {renderStatCard(performanceMetrics.total_queries || 0, "Total Queries")}
          {renderStatCard(performanceMetrics.excellent_count || 0, "Excellent")}
          {renderStatCard(performanceMetrics.good_count || 0, "Good")}
          {renderStatCard(performanceMetrics.fair_count || 0, "Fair")}
          {renderStatCard(performanceMetrics.poor_count || 0, "Poor")}
          {renderStatCard(
            performanceMetrics.avg_efficiency 
              ? `${Number(performanceMetrics.avg_efficiency).toFixed(1)}%` 
              : 'N/A',
            "Avg Efficiency"
          )}
        </div>
      );
    }
  };

  if (loading && activeQueries.length === 0 && processingLogs.length === 0 && queryPerformance.length === 0) {
    return (
      <div style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Consolas",
        fontSize: 12,
        color: asciiColors.foreground,
        backgroundColor: asciiColors.background,
        gap: 12
      }}>
        <div style={{
          fontSize: 24,
          animation: "spin 1s linear infinite"
        }}>
          {ascii.blockFull}
        </div>
        <div style={{
          display: "flex",
          gap: 4,
          alignItems: "center"
        }}>
          <span>Loading monitor data</span>
          <span style={{ animation: "dots 1.5s steps(4, end) infinite" }}>
            {ascii.dot.repeat(3)}
          </span>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes dots {
            0%, 20% { opacity: 0; }
            50% { opacity: 1; }
            100% { opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      padding: "24px 32px",
      fontFamily: "Consolas",
      fontSize: 12,
      color: asciiColors.foreground,
      backgroundColor: asciiColors.background,
      display: "flex",
      flexDirection: "column",
      gap: 20
    }}>
      <h1 style={{
        fontSize: 18,
        fontFamily: "Consolas",
        fontWeight: 600,
        margin: 0,
        marginBottom: 8,
        padding: "12px 8px",
        borderBottom: `2px solid ${asciiColors.border}`
      }}>
        MONITOR
      </h1>

      {error && (
        <AsciiPanel title="ERROR">
          <div style={{ marginBottom: 10 }}>
            <span style={{ color: asciiColors.danger, fontWeight: 600 }}>
              {ascii.blockFull} {error}
            </span>
          </div>
        </AsciiPanel>
      )}
      
      <div style={{
        display: "flex",
        gap: 8,
        marginBottom: 16,
        borderBottom: `1px solid ${asciiColors.border}`,
        paddingBottom: 8
      }}>
        {(['monitor', 'live', 'performance', 'transfer', 'system'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 16px",
              border: `1px solid ${activeTab === tab ? asciiColors.accent : asciiColors.border}`,
              backgroundColor: activeTab === tab ? asciiColors.accent : asciiColors.background,
              color: activeTab === tab ? "#ffffff" : asciiColors.foreground,
              borderRadius: 2,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: activeTab === tab ? 600 : 500,
              transition: "all 0.2s ease",
              textTransform: "capitalize"
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab) {
                e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                e.currentTarget.style.borderColor = asciiColors.accent;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab) {
                e.currentTarget.style.backgroundColor = asciiColors.background;
                e.currentTarget.style.borderColor = asciiColors.border;
              }
            }}
          >
            {tab === 'live' ? 'Live Changes' : 
             tab === 'performance' ? 'Query Performance' :
             tab === 'transfer' ? 'Transfer Metrics' :
             tab === 'system' ? 'System Resources' : tab}
          </button>
        ))}
      </div>
      
      {activeTab !== 'system' && (
        <div style={{ marginBottom: 16 }}>
          {getStats()}
        </div>
      )}
      
      {activeTab === 'system' ? (
        <div style={{ 
          width: "100%"
        }}>
          {renderSystemResources()}
        </div>
      ) : activeTab === 'monitor' ? (
        <>
          <AsciiPanel title="TREE VIEW">
            <div style={{
              fontFamily: "Consolas",
              fontSize: 12,
              maxHeight: "calc(100vh - 200px)",
              overflowY: "auto",
              animation: "slideIn 0.3s ease-out"
            }}>
              {renderTree()}
            </div>
          </AsciiPanel>

          {selectedItem && (
            <>
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  backdropFilter: "blur(2px)",
                  zIndex: 999,
                  animation: "fadeInUp 0.2s ease-out"
                }}
                onClick={() => setSelectedItem(null)}
              />
              <div
                style={{
                  position: "fixed",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "85%",
                  height: "85%",
                  backgroundColor: asciiColors.background,
                  border: `2px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  zIndex: 1000,
                  display: "flex",
                  flexDirection: "column",
                  fontFamily: "Consolas",
                  fontSize: 12,
                  color: asciiColors.foreground,
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                  animation: "fadeInUp 0.3s ease-out"
                }}
              >
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 20px",
                  borderBottom: `2px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.backgroundSoft
                }}>
                  <h2 style={{
                    fontSize: 14,
                    fontFamily: "Consolas",
                    fontWeight: 600,
                    color: asciiColors.accent,
                    margin: 0
                  }}>
                    {ascii.blockFull} QUERY DETAILS
                  </h2>
                  <button
                    onClick={() => setSelectedItem(null)}
                    style={{
                      background: "transparent",
                      border: `1px solid ${asciiColors.border}`,
                      color: asciiColors.foreground,
                      padding: "4px 12px",
                      borderRadius: 2,
                      cursor: "pointer",
                      fontFamily: "Consolas",
                      fontSize: 11,
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = asciiColors.danger;
                      e.currentTarget.style.color = asciiColors.background;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = asciiColors.foreground;
                    }}
                  >
                    {ascii.blockFull} CLOSE
                  </button>
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "4fr 1fr",
                  gap: 20,
                  flex: 1,
                  padding: 20,
                  overflow: "hidden"
                }}>
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    overflow: "hidden"
                  }}>
                    <h3 style={{
                      fontSize: 13,
                      fontFamily: "Consolas",
                      fontWeight: 600,
                      color: asciiColors.accent,
                      margin: 0,
                      marginBottom: 12,
                      paddingBottom: 8,
                      borderBottom: `1px solid ${asciiColors.border}`
                    }}>
                      {ascii.blockFull} QUERY TEXT
                    </h3>
                    <pre style={{
                      margin: 0,
                      padding: 16,
                      backgroundColor: asciiColors.backgroundSoft,
                      borderRadius: 2,
                      overflowX: "auto",
                      overflowY: "auto",
                      fontSize: 11,
                      border: `1px solid ${asciiColors.border}`,
                      fontFamily: "Consolas",
                      whiteSpace: "pre-wrap",
                      wordWrap: "break-word",
                      color: asciiColors.foreground,
                      flex: 1
                    }}>
                      {selectedItem.query || 'N/A'}
                    </pre>
                  </div>

                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    overflow: "hidden"
                  }}>
                    <h3 style={{
                      fontSize: 13,
                      fontFamily: "Consolas",
                      fontWeight: 600,
                      color: asciiColors.accent,
                      margin: 0,
                      marginBottom: 12,
                      paddingBottom: 8,
                      borderBottom: `1px solid ${asciiColors.border}`
                    }}>
                      {ascii.blockFull} DETAILS
                    </h3>
                    <div style={{
                      overflowY: "auto",
                      flex: 1,
                      animation: "fadeInUp 0.4s ease-out"
                    }}>
                      {renderDetails()}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 500px",
          gap: 20,
          height: "calc(100vh - 300px)",
          minHeight: 600
        }}>
          <AsciiPanel title="TREE VIEW">
            <div style={{
              fontFamily: "Consolas",
              fontSize: 12,
              maxHeight: "calc(100vh - 400px)",
              overflowY: "auto",
              animation: "slideIn 0.3s ease-out"
            }}>
              {renderTree()}
            </div>
          </AsciiPanel>
          
          <AsciiPanel title="DETAILS">
            <div style={{
              maxHeight: "calc(100vh - 400px)",
              overflowY: "auto",
              animation: "fadeInUp 0.4s ease-out"
            }}>
              {renderDetails()}
            </div>
          </AsciiPanel>
        </div>
      )}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dots {
          0%, 20% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes smoothUpdate {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes dataPulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        * {
          transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }
      `}</style>
    </div>
  );
};

export default UnifiedMonitor;
