import{m as K,f as g,t as r,u as Pe,r as h,h as te,q as Be,d as fe,j as e,b as t,e as d}from"./index-75d7470b.js";import{e as le}from"./errorHandler-5ea9ae85.js";import{A as O}from"./AsciiPanel-9f053981.js";import{A as re}from"./AsciiButton-446d8430.js";import{S as Me}from"./SkeletonLoader-530eacc4.js";const oe=K`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;K`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;const Oe=K`
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: 1000px;
    opacity: 1;
  }
`,Ue=K`
  from {
    max-height: 1000px;
    opacity: 1;
  }
  to {
    max-height: 0;
    opacity: 0;
  }
`;K`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
`;K`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
`;g.div`
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
`;g.div`
  display: grid;
  grid-template-columns: 1fr 500px;
  gap: ${r.spacing.lg};
  height: calc(100vh - 200px);
  min-height: 600px;
`;g.div`
  background: ${r.colors.background.main};
  border: 1px solid ${r.colors.border.light};
  border-radius: ${r.borderRadius.lg};
  padding: ${r.spacing.lg};
  overflow-y: auto;
  box-shadow: ${r.shadows.md};
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${r.colors.background.secondary};
    border-radius: ${r.borderRadius.sm};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${r.colors.border.medium};
    border-radius: ${r.borderRadius.sm};
    
    &:hover {
      background: ${r.colors.primary.main};
    }
  }
`;g.div`
  background: ${r.colors.background.main};
  border: 1px solid ${r.colors.border.light};
  border-radius: ${r.borderRadius.lg};
  padding: ${r.spacing.lg};
  overflow-y: auto;
  box-shadow: ${r.shadows.md};
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${r.colors.background.secondary};
    border-radius: ${r.borderRadius.sm};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${r.colors.border.medium};
    border-radius: ${r.borderRadius.sm};
    
    &:hover {
      background: ${r.colors.primary.main};
    }
  }
`;g.div`
  display: flex;
  gap: ${r.spacing.sm};
  margin-bottom: ${r.spacing.md};
  border-bottom: 2px solid ${r.colors.border.light};
  padding-bottom: ${r.spacing.sm};
`;g.button`
  padding: ${r.spacing.sm} ${r.spacing.md};
  border: none;
  background: ${c=>c.$active?r.colors.primary.main:"transparent"};
  color: ${c=>c.$active?r.colors.text.white:r.colors.text.secondary};
  border-radius: ${r.borderRadius.md} ${r.borderRadius.md} 0 0;
  cursor: pointer;
  font-weight: ${c=>c.$active?"600":"500"};
  transition: all ${r.transitions.normal};
  
  &:hover {
    background: ${c=>c.$active?r.colors.primary.dark:r.colors.background.secondary};
    color: ${c=>c.$active?r.colors.text.white:r.colors.text.primary};
  }
`;g.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: ${r.spacing.md};
  margin-bottom: ${r.spacing.lg};
`;g.div`
  background: linear-gradient(135deg, ${r.colors.background.secondary} 0%, ${r.colors.background.tertiary} 100%);
  border: 1px solid ${r.colors.border.light};
  border-radius: ${r.borderRadius.md};
  padding: ${r.spacing.md};
  text-align: center;
  transition: all ${r.transitions.normal};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${r.shadows.md};
    border-color: ${r.colors.primary.main};
  }
`;g.div`
  font-size: 2em;
  font-weight: bold;
  color: ${r.colors.primary.main};
  margin-bottom: ${r.spacing.xs};
`;g.div`
  font-size: 0.85em;
  color: ${r.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
`;g.div`
  font-family: "Consolas";
  font-size: 0.95em;
`;g.div`
  user-select: none;
  animation: ${oe} 0.3s ease-out;
  margin-bottom: 2px;
`;g.div`
  display: flex;
  align-items: center;
  padding: ${c=>c.$level===0?"12px 8px":c.$level===1?"10px 8px":"8px 8px"};
  padding-left: ${c=>c.$level*24+8}px;
  cursor: pointer;
  border-radius: ${r.borderRadius.md};
  transition: all ${r.transitions.normal};
  position: relative;
  margin: 2px 0;
  
  ${c=>c.$nodeType==="database"?`
        background: linear-gradient(135deg, ${r.colors.primary.light}08 0%, ${r.colors.primary.main}05 100%);
        border-left: 3px solid ${r.colors.primary.main};
        font-weight: 600;
      `:c.$nodeType==="schema"?`
        background: ${r.colors.background.secondary};
        border-left: 2px solid ${r.colors.border.medium};
      `:`
      border-left: 1px solid ${r.colors.border.light};
    `}
  
  &:hover {
    background: ${c=>c.$nodeType==="database"?`linear-gradient(135deg, ${r.colors.primary.light}15 0%, ${r.colors.primary.main}10 100%)`:r.colors.background.secondary};
    transform: translateX(2px);
    box-shadow: ${r.shadows.sm};
  }
`;g.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 8px;
  border-radius: ${r.borderRadius.sm};
  background: ${c=>c.$isExpanded?`linear-gradient(135deg, ${r.colors.primary.main} 0%, ${r.colors.primary.light} 100%)`:r.colors.background.secondary};
  color: ${c=>c.$isExpanded?r.colors.text.white:r.colors.primary.main};
  font-size: 0.7em;
  font-weight: bold;
  transition: all ${r.transitions.normal};
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: ${r.shadows.sm};
  }
  
  svg {
    transition: transform ${r.transitions.normal};
    transform: ${c=>c.$isExpanded?"rotate(0deg)":"rotate(-90deg)"};
  }
`;g.span`
  font-weight: ${c=>c.$isDatabase?"700":c.$isSchema?"600":"500"};
  font-size: ${c=>c.$isDatabase?"1.05em":c.$isSchema?"0.98em":"0.92em"};
  color: ${c=>c.$isDatabase?r.colors.primary.main:c.$isSchema?r.colors.text.primary:r.colors.text.secondary};
  margin-right: 12px;
  transition: color ${r.transitions.normal};
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;g.span`
  padding: 4px 10px;
  border-radius: ${r.borderRadius.md};
  font-size: 0.8em;
  font-weight: 500;
  background: linear-gradient(135deg, ${r.colors.background.secondary} 0%, ${r.colors.background.tertiary} 100%);
  color: ${r.colors.text.secondary};
  border: 1px solid ${r.colors.border.light};
  margin-left: auto;
  transition: all ${r.transitions.normal};
  
  &:hover {
    background: linear-gradient(135deg, ${r.colors.primary.light}10 0%, ${r.colors.primary.main}08 100%);
    border-color: ${r.colors.primary.main};
    color: ${r.colors.primary.main};
    transform: translateY(-1px);
  }
`;g.div`
  overflow: hidden;
  animation: ${c=>c.$isExpanded?Oe:Ue} 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  padding-left: ${c=>c.$level*24+36}px;
  will-change: max-height, opacity;
`;g.div`
  padding: 10px 8px;
  margin: 4px 0;
  border-radius: ${r.borderRadius.md};
  border-left: 2px solid ${c=>c.$selected?r.colors.primary.main:r.colors.border.light};
  background: ${c=>c.$selected?r.colors.primary.light+"15":"transparent"};
  cursor: pointer;
  transition: all ${r.transitions.normal};
  
  &:hover {
    background: ${r.colors.background.secondary};
    border-left-color: ${r.colors.primary.main};
  }
`;g.div`
  font-size: 0.85em;
  color: ${r.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 4px;
  font-family: "Consolas";
`;g.button`
  padding: 4px 8px;
  border: none;
  border-radius: ${r.borderRadius.sm};
  background: ${r.colors.status.error.bg};
  color: ${r.colors.status.error.text};
  cursor: pointer;
  font-size: 0.75em;
  font-weight: 500;
  transition: all ${r.transitions.normal};
  
  &:hover {
    background: ${r.colors.status.error.text};
    color: ${r.colors.background.main};
    transform: translateY(-1px);
    box-shadow: ${r.shadows.sm};
  }
  
  &:active {
    transform: translateY(0);
  }
`;g.span`
  padding: 4px 10px;
  border-radius: ${r.borderRadius.md};
  font-size: 0.75em;
  font-weight: 500;
  display: inline-block;
  margin-left: 8px;
  background-color: ${c=>{switch(c.$status){case"active":return r.colors.status.success.bg;case"idle in transaction":return r.colors.status.warning.bg;case"idle in transaction (aborted)":return r.colors.status.error.bg;case"FULL_LOAD":return r.colors.status.info.bg;case"LISTENING_CHANGES":return r.colors.status.success.bg;case"ERROR":return r.colors.status.error.bg;case"EXCELLENT":return r.colors.status.success.bg;case"GOOD":return r.colors.status.info.bg;case"FAIR":return r.colors.status.warning.bg;case"POOR":return r.colors.status.error.bg;default:return r.colors.background.secondary}}};
  color: ${c=>{switch(c.$status){case"active":return r.colors.status.success.text;case"idle in transaction":return r.colors.status.warning.text;case"idle in transaction (aborted)":return r.colors.status.error.text;case"FULL_LOAD":return r.colors.status.info.text;case"LISTENING_CHANGES":return r.colors.status.success.text;case"ERROR":return r.colors.status.error.text;case"EXCELLENT":return r.colors.status.success.text;case"GOOD":return r.colors.status.info.text;case"FAIR":return r.colors.status.warning.text;case"POOR":return r.colors.status.error.text;default:return r.colors.text.secondary}}};
`;g.div`
  background: ${r.colors.background.secondary};
  border: 1px solid ${r.colors.border.light};
  border-radius: ${r.borderRadius.md};
  padding: ${r.spacing.lg};
  margin-bottom: ${r.spacing.md};
`;g.h3`
  font-size: 1.1em;
  font-weight: 600;
  color: ${r.colors.text.primary};
  margin: 0 0 ${r.spacing.md} 0;
  padding-bottom: ${r.spacing.sm};
  border-bottom: 2px solid ${r.colors.border.light};
`;g.div`
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: ${r.spacing.md};
  font-size: 0.9em;
`;g.div`
  color: ${r.colors.text.secondary};
  font-weight: 500;
`;g.div`
  color: ${r.colors.text.primary};
  word-break: break-word;
`;g.pre`
  margin: ${r.spacing.md} 0 0 0;
  padding: ${r.spacing.md};
  background-color: ${r.colors.background.main};
  border-radius: ${r.borderRadius.md};
  overflow-x: auto;
  font-size: 0.85em;
  border: 1px solid ${r.colors.border.light};
  font-family: "Consolas";
  white-space: pre-wrap;
  word-wrap: break-word;
`;g.div`
  padding: 60px 40px;
  text-align: center;
  color: ${r.colors.text.secondary};
  animation: ${oe} 0.5s ease-out;
  
  &::before {
    content: '📊';
    font-size: 3em;
    display: block;
    margin-bottom: ${r.spacing.md};
    opacity: 0.5;
  }
`;g.div`
  padding: 60px 40px;
  text-align: center;
  color: ${r.colors.text.secondary};
  animation: ${oe} 0.5s ease-out;
  
  &::before {
    content: '👈';
    font-size: 3em;
    display: block;
    margin-bottom: ${r.spacing.md};
    opacity: 0.5;
  }
`;g.div`
  width: 100%;
  margin-top: 20px;
  padding: 25px;
  background: ${r.colors.background.main};
  border-radius: ${r.borderRadius.lg};
  box-shadow: ${r.shadows.md};
  color: ${r.colors.text.primary};
  overflow: visible;
  position: relative;
  animation: ${oe} 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
  
  &:hover {
    box-shadow: ${r.shadows.lg};
    transform: translateY(-2px);
  }
`;g.div`
  font-weight: bold;
  margin-bottom: 20px;
  color: ${r.colors.text.primary};
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
`;g.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: ${c=>c.$active?r.colors.text.primary:r.colors.text.secondary};
  transition: all 0.3s ease;
  padding: 6px 10px;
  border-radius: ${r.borderRadius.sm};
  cursor: pointer;
  user-select: none;
  border: 1px solid ${c=>c.$active?r.colors.border.medium:"transparent"};
  background: ${c=>c.$active?r.colors.background.secondary:"transparent"};
  
  &:hover {
    background: ${r.colors.background.secondary};
    color: ${r.colors.text.primary};
    transform: translateY(-1px);
    border-color: ${r.colors.border.medium};
  }
`;g.input`
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: ${r.colors.status.info.text};
  
  &:checked {
    accent-color: ${r.colors.status.info.text};
  }
`;g.button`
  margin-left: auto;
  padding: 6px 12px;
  font-size: 10px;
  background: ${r.colors.background.secondary};
  border: 1px solid ${r.colors.border.medium};
  border-radius: ${r.borderRadius.sm};
  color: ${r.colors.text.primary};
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
  
  &:hover {
    background: ${r.colors.primary.main};
    color: ${r.colors.text.white};
    border-color: ${r.colors.primary.main};
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;g.span`
  display: inline-block;
  width: 24px;
  height: 0;
  opacity: ${c=>c.$active?1:.4};
  transition: opacity 0.3s ease;
  border-top: 2px solid;
  border-color: ${c=>c.$color};
`;g.path`
  transition: d 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: d;
  opacity: 1;
  vector-effect: non-scaling-stroke;
`;g.path`
  transition: d 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: d;
  opacity: 1;
`;g.svg`
  width: 100%;
  height: 100%;
  display: block;
  min-height: 400px;
`;g.div`
  width: 100%;
  height: 500px;
  min-height: 400px;
  position: relative;
  background: ${r.colors.background.main};
  border-radius: ${r.borderRadius.md};
  padding: 20px;
  overflow: visible;
`;g.line`
  stroke: ${r.colors.border.light};
  stroke-width: 1;
  opacity: 0.2;
`;g.text`
  font-size: 10px;
  fill: ${r.colors.text.secondary};
  font-family: "Consolas";
`;g.line`
  stroke: ${r.colors.border.medium};
  stroke-width: 1.5;
  opacity: 0.6;
`;g.div`
  position: absolute;
  left: ${c=>c.$x}px;
  top: ${c=>c.$y}px;
  background: ${r.colors.background.secondary};
  border: 1px solid ${r.colors.border.medium};
  border-radius: ${r.borderRadius.md};
  padding: 8px 12px;
  font-size: 0.85em;
  pointer-events: none;
  opacity: ${c=>c.$visible?1:0};
  transition: opacity 0.2s ease;
  z-index: 1000;
  box-shadow: ${r.shadows.md};
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
    border-top: 6px solid ${r.colors.background.secondary};
  }
`;g.div`
  font-weight: 600;
  color: ${r.colors.text.primary};
  margin-bottom: 4px;
`;g.div`
  color: ${r.colors.text.secondary};
  font-size: 0.9em;
`;const Qe=({data:c,color:se,height:f=4,width:U=30,labels:ne})=>{const[N,J]=h.useState(null),[A,ie]=h.useState(null),Z=h.useRef(null);if(!c||c.length===0)return e.jsx("span",{style:{color:t.muted},children:d.dot.repeat(U)});const s=c.slice(-U),B=ne?ne.slice(-U):[],R=Math.min(...s),z=Math.max(...s)-R||1,Q=["▁","▂","▃","▄","▅","▆","▇","█"],L=W=>{if(z===0)return Q[0];const k=(W-R)/z,D=Math.floor(k*(Q.length-1));return Q[Math.max(0,Math.min(Q.length-1,D))]},de=(W,k)=>{if(Z.current){const D=Z.current.getBoundingClientRect();ie({x:W.clientX-D.left,y:W.clientY-D.top-30}),J(k)}},I=()=>{J(null),ie(null)};return e.jsxs("div",{ref:Z,style:{position:"relative",display:"inline-block"},onMouseLeave:I,children:[e.jsx("span",{style:{color:se,fontFamily:"Consolas",fontSize:11,letterSpacing:0,lineHeight:1,display:"inline-block"},children:s.map((W,k)=>e.jsx("span",{onMouseMove:D=>de(D,k),style:{cursor:"pointer",transition:"all 0.2s ease",transform:N===k?"scale(1.2)":"scale(1)",display:"inline-block",position:"relative"},children:L(W)},k))}),N!==null&&A&&e.jsxs("div",{style:{position:"absolute",left:`${A.x}px`,top:`${A.y}px`,transform:"translateX(-50%)",backgroundColor:t.background,border:`1px solid ${t.border}`,borderRadius:2,padding:"6px 10px",fontSize:10,fontFamily:"Consolas",color:t.foreground,whiteSpace:"nowrap",zIndex:1e3,boxShadow:"0 4px 12px rgba(0,0,0,0.2)",pointerEvents:"none",animation:"fadeInUp 0.15s ease-out",transition:"opacity 0.15s ease, transform 0.15s ease"},children:[e.jsx("div",{style:{color:t.accent,fontWeight:600,marginBottom:2},children:s[N].toFixed(2)}),B[N]&&e.jsx("div",{style:{color:t.muted,fontSize:9},children:new Date(B[N]).toLocaleTimeString()})]})]})};g.div`
  display: flex;
  flex-direction: column;
  gap: ${r.spacing.sm};
`;g.div`
  background: ${r.colors.background.secondary};
  border: 1px solid ${r.colors.border.light};
  border-radius: ${r.borderRadius.md};
  padding: ${r.spacing.md};
  transition: all ${r.transitions.normal};
  animation: ${oe} 0.3s ease-out;
  
  &:hover {
    border-color: ${r.colors.primary.main};
    box-shadow: ${r.shadows.sm};
    transform: translateX(4px);
  }
`;g.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${r.spacing.sm};
`;g.div`
  font-size: 0.75em;
  color: ${r.colors.text.secondary};
  font-family: "Consolas";
`;g.div`
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: ${r.spacing.sm};
  font-size: 0.9em;
  margin-top: ${r.spacing.xs};
`;g.div`
  color: ${r.colors.text.secondary};
  font-weight: 500;
`;g.div`
  color: ${r.colors.text.primary};
`;g.h3`
  font-size: 1.1em;
  font-weight: 600;
  color: ${r.colors.text.primary};
  margin: 0 0 ${r.spacing.md} 0;
  padding-bottom: ${r.spacing.sm};
  border-bottom: 2px solid ${r.colors.border.light};
`;const Ve=()=>{const c=Pe(),se=()=>c.pathname.includes("live-changes")?"live":c.pathname.includes("query-performance")?"performance":"monitor",[f,U]=h.useState(se());h.useEffect(()=>{U(se()),B(null)},[c.pathname]),h.useEffect(()=>{B(null)},[f]);const[ne,N]=h.useState(!0),[J,A]=h.useState(null),[ie,Z]=h.useState(new Set),[s,B]=h.useState(null),[R,me]=h.useState([]);h.useEffect(()=>{f==="monitor"&&s&&R.length>0&&(R.some(p=>p.id===s.id||p.pid===s.pid&&p.query===s.query)||B(null))},[f,R,s]);const[z,Q]=h.useState([]),[L,de]=h.useState({}),[I,W]=h.useState([]),[k,D]=h.useState({}),[G,Le]=h.useState([]),[P,_e]=h.useState({}),[v,he]=h.useState({timestamp:[],cpuUsage:[],memoryPercentage:[],network:[],throughput:[],dbConnections:[],dbQueriesPerSecond:[],dbQueryEfficiency:[]});h.useState({cpu:!0,memory:!0,network:!0,throughput:!0,dbConnections:!0,dbQueriesPerSecond:!0,dbQueryEfficiency:!0});const[j,Ne]=h.useState({}),[H,xe]=h.useState(""),[T,ye]=h.useState(""),[M,be]=h.useState(""),[Y,je]=h.useState(""),[q,ve]=h.useState(""),[X,Se]=h.useState(""),[Ae,ce]=h.useState(!1),S=h.useRef(!0),Ce=h.useCallback(o=>{if(!o)return{schema:"N/A",table:"N/A"};const p=o.match(/(?:FROM|JOIN|INTO|UPDATE)\s+(?:(\w+)\.)?(\w+)/i);return p?{schema:p[1]||"public",table:p[2]||"N/A"}:{schema:"N/A",table:"N/A"}},[]),ee=h.useCallback(async()=>{if(S.current)try{const[o,p,i]=await Promise.all([te.getActiveQueries(),te.getProcessingLogs(1,100),te.getProcessingStats()]);if(S.current){const n=(o||[]).map(l=>{const{schema:u,table:x}=Ce(l.query||"");return{...l,schema_name:l.schema_name||u,table_name:l.table_name||x}});me(n),Q(p.data||[]),de(i||{})}}catch(o){S.current&&A(le(o))}},[Ce]),pe=h.useCallback(async()=>{if(S.current)try{const[o,p]=await Promise.all([Be.getQueries({page:1,limit:100}),Be.getMetrics()]);S.current&&(W(o.data||[]),D(p||{}))}catch(o){S.current&&A(le(o))}},[]),ue=h.useCallback(async()=>{if(S.current)try{const[o,p]=await Promise.all([te.getTransferMetrics({page:1,limit:100,days:7}),te.getTransferMetricsStats({days:7})]);S.current&&(Le(o.data||[]),_e(p||{}))}catch(o){S.current&&A(le(o))}},[]),ge=h.useCallback(async()=>{var o,p,i,n,l,u,x;if(S.current)try{const y=await fe.getDashboardStats();if(S.current){Ne(y.dbHealth||{});const a=new Date,m=`${a.getHours().toString().padStart(2,"0")}:${a.getMinutes().toString().padStart(2,"0")}:${a.getSeconds().toString().padStart(2,"0")}`,b=((o=y.metricsCards)==null?void 0:o.currentIops)||0,$=((i=(p=y.metricsCards)==null?void 0:p.currentThroughput)==null?void 0:i.avgRps)||0,w=parseFloat(((n=y.dbHealth)==null?void 0:n.connectionPercentage)||"0")||0,F=(l=y.dbHealth)!=null&&l.totalQueries24h?y.dbHealth.totalQueries24h/(24*3600):0,C=parseFloat(((x=(u=y.dbHealth)==null?void 0:u.queryEfficiencyScore)==null?void 0:x.toString())||"0")||0;he(E=>{var Te,Fe;return{timestamp:[...E.timestamp,m].slice(-60),cpuUsage:[...E.cpuUsage,parseFloat(((Te=y.systemResources)==null?void 0:Te.cpuUsage)||"0")||0].slice(-60),memoryPercentage:[...E.memoryPercentage,parseFloat(((Fe=y.systemResources)==null?void 0:Fe.memoryPercentage)||"0")||0].slice(-60),network:[...E.network,b].slice(-60),throughput:[...E.throughput,$].slice(-60),dbConnections:[...E.dbConnections,w].slice(-60),dbQueriesPerSecond:[...E.dbQueriesPerSecond,F].slice(-60),dbQueryEfficiency:[...E.dbQueryEfficiency,C].slice(-60)}})}}catch(y){S.current&&console.error("Error fetching system resources:",y)}},[]),we=h.useCallback(async()=>{try{if(!S.current)return;const o=await fe.getSystemLogs(60),p=await fe.getDashboardStats();S.current&&o.length>0&&he({timestamp:o.map(i=>i.timestamp),cpuUsage:o.map(i=>i.cpuUsage),memoryPercentage:o.map(i=>i.memoryPercentage),network:o.map(i=>i.network),throughput:o.map(i=>i.throughput),dbConnections:o.map(()=>{var i;return parseFloat(((i=p.dbHealth)==null?void 0:i.connectionPercentage)||"0")||0}),dbQueriesPerSecond:o.map(()=>{var i;return(i=p.dbHealth)!=null&&i.totalQueries24h?p.dbHealth.totalQueries24h/(24*3600):0}),dbQueryEfficiency:o.map(()=>{var i,n;return parseFloat(((n=(i=p.dbHealth)==null?void 0:i.queryEfficiencyScore)==null?void 0:n.toString())||"0")||0})})}catch(o){S.current&&console.error("Error fetching system logs history:",o)}},[]);h.useEffect(()=>{S.current=!0,N(!0),(async()=>{await Promise.all([ee(),pe()]),f==="system"&&await we(),f==="transfer"&&await ue(),S.current&&N(!1)})();const p=setInterval(()=>{S.current&&(ee(),f==="performance"&&pe(),f==="system"&&ge(),f==="transfer"&&ue())},5e3),i=f==="system"?setInterval(ge,1e4):null;return()=>{S.current=!1,clearInterval(p),i&&clearInterval(i)}},[ee,pe,ge,we,ue,f]);const ke=h.useMemo(()=>{if(f==="monitor"){const o=new Map;return R.forEach(p=>{const i=p.datname||"Unknown";o.has(i)||o.set(i,[]),o.get(i).push(p)}),o}else if(f==="live"){const o=new Map;return z.filter(i=>{const n=!T||T==="N/A"&&!i.pk_strategy||i.pk_strategy===T,l=!M||i.status===M;return n&&l}).forEach(i=>{const n=i.db_engine||"Unknown",l=i.schema_name||"public";o.has(n)||o.set(n,new Map);const u=o.get(n);u.has(l)||u.set(l,[]),u.get(l).push(i)}),o}else if(f==="transfer"){const o=new Map;return G.filter(i=>{const n=!Y||i.status===Y,l=!q||i.transfer_type===q,u=!X||i.db_engine===X;return n&&l&&u}).forEach(i=>{const n=i.db_engine||"Unknown";o.has(n)||o.set(n,[]),o.get(n).push(i)}),o}else{const o=new Map;return(H?I.filter(i=>i.performance_tier===H):I).forEach(i=>{const n=i.dbname||"Unknown";o.has(n)||o.set(n,[]),o.get(n).push(i)}),o}},[f,R,z,I,G,H,T,M,Y,q,X]),ze=h.useCallback(o=>{Z(p=>{const i=new Set(p);return i.has(o)?i.delete(o):i.add(o),i})},[]),ae=h.useCallback(o=>{if(!o)return"N/A";const p=Number(o);return isNaN(p)?"N/A":p<1?`${(p*1e3).toFixed(2)}μs`:p<1e3?`${p.toFixed(2)}ms`:`${(p/1e3).toFixed(2)}s`},[]),_=h.useCallback(o=>new Date(o).toLocaleString(),[]),Ie=h.useCallback(async o=>{if(confirm(`Are you sure you want to kill query with PID ${o}?`))try{const p=await fetch(`/api/monitor/queries/${o}/kill`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("authToken")}`}});if(!p.ok){const i=await p.json();throw new Error(i.error||i.details||"Failed to kill query")}alert(`Query with PID ${o} has been terminated.`),ee()}catch(p){S.current&&A(le(p))}},[ee]),$e=()=>{if(ke.size===0)return e.jsxs("div",{style:{padding:40,textAlign:"center",color:t.muted,fontSize:12},children:[d.dot," No data available for ",f]});const o=i=>{const n=(i||"").toUpperCase();return n.includes("ERROR")||n.includes("FAILED")||n==="POOR"?t.danger:n.includes("WARNING")||n==="FAIR"?t.warning:n.includes("SUCCESS")||n==="EXCELLENT"||n==="GOOD"?t.success:t.muted};return Array.from(ke.entries()).map(([i,n])=>{const l=`db-${i}`,u=ie.has(l);let x;if(f==="live"){const a=n;x=Array.from(a.values()).flat()}else x=n;const y=x.length;return e.jsxs("div",{style:{marginBottom:4},children:[e.jsxs("div",{"data-first-level":"true",onClick:()=>ze(l),onMouseEnter:a=>{const m=a.currentTarget.closest(".tree-view-container");m&&m.classList.add("showing-scrollbar"),a.currentTarget.style.backgroundColor=t.backgroundSoft,a.currentTarget.style.transform="translateX(2px)"},onMouseLeave:a=>{const m=a.currentTarget.closest(".tree-view-container");if(m){const b=a.relatedTarget;if(b&&b instanceof Node&&m.contains(b))return;m.classList.remove("showing-scrollbar")}u||(a.currentTarget.style.backgroundColor=t.background),a.currentTarget.style.transform="translateX(0)"},style:{display:"flex",alignItems:"center",padding:"10px 8px",cursor:"pointer",borderLeft:`2px solid ${t.accent}`,backgroundColor:u?t.backgroundSoft:t.background,transition:"all 0.2s ease",marginBottom:2},children:[e.jsx("span",{style:{marginRight:8,color:u?t.accent:t.muted,fontSize:10,transition:"transform 0.2s ease",display:"inline-block",transform:u?"rotate(90deg)":"rotate(0deg)"},children:d.arrowRight}),e.jsx("span",{style:{fontWeight:600,color:t.accent,fontSize:12,flex:1},children:i}),e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${t.border}`,backgroundColor:t.backgroundSoft,color:t.foreground},children:y})]}),u&&e.jsx("div",{style:{paddingLeft:24,animation:"slideDown 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94)"},children:x.map((a,m)=>{var w,F;const b=s===a,$=m===x.length-1;return e.jsxs("div",{onClick:()=>B(a),onMouseEnter:C=>{const E=C.currentTarget.closest(".tree-view-container");E&&E.classList.remove("showing-scrollbar"),b||(C.currentTarget.style.backgroundColor=t.backgroundSoft,C.currentTarget.style.borderLeftColor=t.accent)},onMouseLeave:C=>{b||(C.currentTarget.style.backgroundColor="transparent",C.currentTarget.style.borderLeftColor=t.border)},style:{display:"flex",alignItems:"flex-start",padding:"8px 8px",marginLeft:8,marginBottom:2,cursor:"pointer",borderLeft:`2px solid ${b?t.accent:t.border}`,backgroundColor:b?t.accentLight:"transparent",transition:"all 0.2s ease",gap:8},children:[e.jsx("span",{style:{color:t.muted,fontSize:10,lineHeight:"1.5",paddingTop:"2px",flexShrink:0,width:"12px",fontFamily:"Consolas"},children:$?d.bl:d.tRight}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[f==="monitor"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{fontWeight:500,color:t.foreground,fontSize:11},children:["PID: ",a.pid]}),e.jsxs("div",{style:{fontSize:10,color:t.muted,marginTop:4},children:["Schema: ",a.schema_name||"N/A"," ",d.v," Table: ",a.table_name||"N/A"]}),e.jsxs("div",{style:{fontSize:10,color:t.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:4,fontFamily:"Consolas"},children:[(w=a.query)==null?void 0:w.substring(0,60),"..."]})]}),f==="live"&&e.jsxs(e.Fragment,{children:[e.jsx("div",{style:{fontWeight:500,color:t.foreground,fontSize:11},children:a.table_name||"N/A"}),e.jsxs("div",{style:{fontSize:10,color:t.muted,marginTop:4,fontFamily:"Consolas"},children:[a.db_engine," ",d.v," ",_(a.processed_at)]})]}),f==="performance"&&e.jsxs(e.Fragment,{children:[e.jsx("div",{style:{fontWeight:500,color:t.foreground,fontSize:11},children:ae(a.mean_time_ms||a.query_duration_ms)}),e.jsxs("div",{style:{fontSize:10,color:t.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:4,fontFamily:"Consolas"},children:[(F=a.query_text)==null?void 0:F.substring(0,60),"..."]})]}),f==="transfer"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{fontWeight:500,color:t.foreground,fontSize:11},children:[a.schema_name,".",a.table_name]}),e.jsxs("div",{style:{fontSize:10,color:t.muted,marginTop:4,fontFamily:"Consolas"},children:[a.db_engine," ",d.v," ",_(a.created_at)]})]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[f==="monitor"&&e.jsxs(e.Fragment,{children:[e.jsx("span",{style:{padding:"2px 6px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${o(a.state)}`,color:o(a.state),backgroundColor:o(a.state)+"20"},children:a.state}),e.jsx("button",{onClick:C=>{C.stopPropagation(),Ie(a.pid)},style:{padding:"4px 8px",border:`1px solid ${t.danger}`,backgroundColor:t.background,color:t.danger,cursor:"pointer",fontSize:10,borderRadius:2,transition:"all 0.2s ease"},onMouseEnter:C=>{C.currentTarget.style.backgroundColor=t.danger,C.currentTarget.style.color="#ffffff"},onMouseLeave:C=>{C.currentTarget.style.backgroundColor=t.background,C.currentTarget.style.color=t.danger},children:"Kill"})]}),f==="live"&&e.jsx("span",{style:{padding:"2px 6px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${o(a.status)}`,color:o(a.status),backgroundColor:o(a.status)+"20"},children:a.status}),f==="performance"&&e.jsx("span",{style:{padding:"2px 6px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${o(a.performance_tier||"N/A")}`,color:o(a.performance_tier||"N/A"),backgroundColor:o(a.performance_tier||"N/A")+"20"},children:a.performance_tier||"N/A"}),f==="transfer"&&e.jsx("span",{style:{padding:"2px 6px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${o(a.status||"PENDING")}`,color:o(a.status||"PENDING"),backgroundColor:o(a.status||"PENDING")+"20"},children:a.status||"PENDING"})]})]},m)})})]},l)})},Ee=()=>{if(f==="performance"){const o=H?I.filter(u=>u.performance_tier===H):I,p={EXCELLENT:o.filter(u=>u.performance_tier==="EXCELLENT").length,GOOD:o.filter(u=>u.performance_tier==="GOOD").length,FAIR:o.filter(u=>u.performance_tier==="FAIR").length,POOR:o.filter(u=>u.performance_tier==="POOR").length},i=o.filter(u=>u.is_blocking).length,n=o.length-i,l=o.length>0?o.reduce((u,x)=>u+(Number(x.mean_time_ms)||0),0)/o.length:0;return e.jsxs("div",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground,display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16},children:[e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," DISTRIBUTION BY TIER"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:Object.entries(p).map(([u,x],y,a)=>{const m=Object.values(p).reduce((F,C)=>F+C,0),b=m>0?x/m*100:0,$=y===a.length-1,w={EXCELLENT:t.success,GOOD:t.accent,FAIR:t.warning,POOR:t.danger};return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontFamily:"Consolas",fontSize:11},children:[e.jsx("span",{style:{color:t.muted,width:20},children:$?d.cornerBl:d.v}),e.jsx("span",{style:{color:w[u]||t.accent,width:12},children:d.blockFull}),e.jsx("span",{style:{flex:1,color:t.foreground},children:u}),e.jsxs("span",{style:{fontSize:11,fontWeight:600,color:w[u]||t.accent,minWidth:"60px",textAlign:"right"},children:[x," (",b.toFixed(1),"%)"]})]},u)})})]}),e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," BLOCKING VS NON-BLOCKING"]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8,marginBottom:12},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontFamily:"Consolas",fontSize:11},children:[e.jsx("span",{style:{color:t.muted,width:20},children:d.v}),e.jsx("span",{style:{color:t.danger,width:12},children:d.blockFull}),e.jsx("span",{style:{flex:1,color:t.foreground},children:"Blocking"}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:t.danger,minWidth:"30px",textAlign:"right"},children:i})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontFamily:"Consolas",fontSize:11},children:[e.jsx("span",{style:{color:t.muted,width:20},children:d.cornerBl}),e.jsx("span",{style:{color:t.success,width:12},children:d.blockFull}),e.jsx("span",{style:{flex:1,color:t.foreground},children:"Non-Blocking"}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:t.success,minWidth:"30px",textAlign:"right"},children:n})]})]}),e.jsxs("div",{style:{marginTop:12,paddingTop:12,borderTop:`1px solid ${t.border}`},children:[e.jsxs("div",{style:{fontSize:11,color:t.muted,marginBottom:4},children:[d.v," Avg Execution Time"]}),e.jsx("div",{style:{fontSize:14,fontWeight:600,color:t.accent,fontFamily:"Consolas"},children:ae(l)})]})]})]})}if(f==="monitor"){const o=R.reduce((i,n)=>{const l=n.datname||"Unknown";return i[l]=(i[l]||0)+1,i},{}),p=R.reduce((i,n)=>{const l=n.state||"Unknown";return i[l]=(i[l]||0)+1,i},{});return e.jsxs("div",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground,display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16},children:[e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," QUERIES BY DATABASE"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:Object.entries(o).sort(([,i],[,n])=>n-i).slice(0,5).map(([i,n],l,u)=>{Math.max(...Object.values(o));const x=l===u.length-1;return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontFamily:"Consolas",fontSize:11},children:[e.jsx("span",{style:{color:t.muted,width:20},children:x?d.cornerBl:d.v}),e.jsx("span",{style:{flex:1,color:t.foreground,overflow:"hidden",textOverflow:"ellipsis"},children:i}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:t.accent,minWidth:"30px",textAlign:"right"},children:n})]},i)})})]}),e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," QUERIES BY STATE"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:Object.entries(p).sort(([,i],[,n])=>n-i).map(([i,n],l,u)=>{const x=l===u.length-1,y={active:t.success,idle:t.muted,"idle in transaction":t.warning,"idle in transaction (aborted)":t.danger,"fastpath function call":t.accent,disabled:t.muted};return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontFamily:"Consolas",fontSize:11},children:[e.jsx("span",{style:{color:t.muted,width:20},children:x?d.cornerBl:d.v}),e.jsx("span",{style:{flex:1,color:t.foreground,overflow:"hidden",textOverflow:"ellipsis"},children:i.toUpperCase()}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:y[i.toLowerCase()]||t.accent,minWidth:"30px",textAlign:"right"},children:n})]},i)})})]})]})}if(f==="live"){const o=z.filter(n=>{const l=!T||T==="N/A"&&!n.pk_strategy||n.pk_strategy===T,u=!M||n.status===M;return l&&u}),p=o.reduce((n,l)=>{const u=l.pk_strategy||"Unknown";return n[u]=(n[u]||0)+1,n},{}),i=o.reduce((n,l)=>{const u=l.status||"Unknown";return n[u]=(n[u]||0)+1,n},{});return e.jsxs("div",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground,display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16},children:[e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," EVENTS BY TYPE"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:Object.entries(p).sort(([,n],[,l])=>l-n).slice(0,5).map(([n,l],u,x)=>{const y=u===x.length-1;return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontFamily:"Consolas",fontSize:11},children:[e.jsx("span",{style:{color:t.muted,width:20},children:y?d.cornerBl:d.v}),e.jsx("span",{style:{flex:1,color:t.foreground,overflow:"hidden",textOverflow:"ellipsis"},children:n==="Unknown"?"N/A":n}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:t.accent,minWidth:"30px",textAlign:"right"},children:l})]},n)})})]}),e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," EVENTS BY STATUS"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:Object.entries(i).sort(([,n],[,l])=>l-n).map(([n,l],u,x)=>{const y=u===x.length-1,a={SUCCESS:t.success,ERROR:t.danger,PENDING:t.warning,IN_PROGRESS:t.accent,LISTENING_CHANGES:t.success};return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontFamily:"Consolas",fontSize:11},children:[e.jsx("span",{style:{color:t.muted,width:20},children:y?d.cornerBl:d.v}),e.jsx("span",{style:{flex:1,color:t.foreground,overflow:"hidden",textOverflow:"ellipsis"},children:n}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:a[n]||t.accent,minWidth:"30px",textAlign:"right"},children:l})]},n)})})]})]})}if(f==="transfer"){const o=G.filter(a=>{const m=!Y||a.status===Y,b=!q||a.transfer_type===q,$=!X||a.db_engine===X;return m&&b&&$}),p=o.reduce((a,m)=>{const b=m.status||"PENDING";return a[b]=(a[b]||0)+1,a},{}),i=o.reduce((a,m)=>{const b=m.transfer_type||"UNKNOWN";return a[b]=(a[b]||0)+1,a},{}),n=o.reduce((a,m)=>{const b=m.db_engine||"Unknown";return a[b]=(a[b]||0)+1,a},{}),l=o.reduce((a,m)=>a+(parseInt(m.records_transferred)||0),0),u=o.reduce((a,m)=>a+(parseInt(m.bytes_transferred)||0),0),x=o.length>0?o.reduce((a,m)=>a+(parseFloat(m.memory_used_mb)||0),0)/o.length:0,y=o.length>0?o.reduce((a,m)=>a+(parseInt(m.io_operations_per_second)||0),0)/o.length:0;return e.jsxs("div",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground,display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16},children:[e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," TRANSFERS BY STATUS"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:Object.entries(p).sort(([,a],[,m])=>m-a).map(([a,m],b,$)=>{const w=b===$.length-1,F={SUCCESS:t.success,FAILED:t.danger,PENDING:t.warning};return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontFamily:"Consolas",fontSize:11},children:[e.jsx("span",{style:{color:t.muted,width:20},children:w?d.cornerBl:d.v}),e.jsx("span",{style:{flex:1,color:t.foreground,overflow:"hidden",textOverflow:"ellipsis"},children:a}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:F[a]||t.accent,minWidth:"30px",textAlign:"right"},children:m})]},a)})})]}),e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," TRANSFERS BY TYPE"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:Object.entries(i).sort(([,a],[,m])=>m-a).map(([a,m],b,$)=>{const w=b===$.length-1;return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontFamily:"Consolas",fontSize:11},children:[e.jsx("span",{style:{color:t.muted,width:20},children:w?d.cornerBl:d.v}),e.jsx("span",{style:{flex:1,color:t.foreground,overflow:"hidden",textOverflow:"ellipsis"},children:a}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:t.accent,minWidth:"30px",textAlign:"right"},children:m})]},a)})})]}),e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," TRANSFERS BY ENGINE"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:Object.entries(n).sort(([,a],[,m])=>m-a).slice(0,5).map(([a,m],b,$)=>{const w=b===$.length-1;return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontFamily:"Consolas",fontSize:11},children:[e.jsx("span",{style:{color:t.muted,width:20},children:w?d.cornerBl:d.v}),e.jsx("span",{style:{flex:1,color:t.foreground,overflow:"hidden",textOverflow:"ellipsis"},children:a}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:t.accent,minWidth:"30px",textAlign:"right"},children:m})]},a)})})]}),e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," SUMMARY STATISTICS"]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0"},children:[e.jsxs("span",{style:{color:t.muted,fontSize:11},children:[d.v," Total Records"]}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:t.accent,fontFamily:"Consolas"},children:l.toLocaleString()})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0"},children:[e.jsxs("span",{style:{color:t.muted,fontSize:11},children:[d.v," Total Bytes"]}),e.jsxs("span",{style:{fontSize:11,fontWeight:600,color:t.accent,fontFamily:"Consolas"},children:[(u/(1024*1024*1024)).toFixed(2)," GB"]})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0"},children:[e.jsxs("span",{style:{color:t.muted,fontSize:11},children:[d.v," Avg Memory"]}),e.jsxs("span",{style:{fontSize:11,fontWeight:600,color:t.accent,fontFamily:"Consolas"},children:[x.toFixed(2)," MB"]})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0"},children:[e.jsxs("span",{style:{color:t.muted,fontSize:11},children:[d.cornerBl," Avg IOPS"]}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:t.accent,fontFamily:"Consolas"},children:y.toFixed(0)})]})]})]})]})}return null},Re=()=>{var o,p;if(f==="live"){if(s){const l=u=>{const x=(u||"").toUpperCase();return x==="SUCCESS"?t.success:x==="ERROR"||x==="FAILED"?t.danger:x==="PENDING"||x==="IN_PROGRESS"?t.warning:t.muted};return e.jsx("div",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground},children:e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft,marginBottom:12},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:16,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," LIVE CHANGE DETAILS"]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8,fontFamily:"Consolas",fontSize:11,lineHeight:1.8},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Database:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.db_engine||"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Schema:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.schema_name||"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Table:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.table_name||"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Status:"}),e.jsx("span",{style:{marginLeft:20,padding:"2px 8px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${l(s.status||"PENDING")}`,color:l(s.status||"PENDING"),backgroundColor:l(s.status||"PENDING")+"20"},children:s.status||"PENDING"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Strategy:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.pk_strategy||"N/A"})]}),s.new_pk&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Last PK:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.new_pk})]}),s.record_count!==null&&s.record_count!==void 0&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Records:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.record_count.toLocaleString()})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"└─ Processed At:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:_(s.processed_at)})]})]})]})})}const n=[...z.filter(l=>{const u=!T||T==="N/A"&&!l.pk_strategy||l.pk_strategy===T,x=!M||l.status===M;return u&&x})].sort((l,u)=>new Date(u.processed_at||0).getTime()-new Date(l.processed_at||0).getTime()).slice(0,20);return e.jsxs(e.Fragment,{children:[Ee(),e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:16,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," CURRENT CHANGES"]}),n.length===0?e.jsxs("div",{style:{padding:60,textAlign:"center",color:t.muted,fontFamily:"Consolas",fontSize:12},children:[d.dot," No recent events available"]}):e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:12},children:n.map((l,u)=>{const x=y=>{const a=(y||"").toUpperCase();return a==="SUCCESS"?t.success:a==="ERROR"||a==="FAILED"?t.danger:a==="PENDING"||a==="IN_PROGRESS"?t.warning:t.muted};return e.jsxs("div",{onClick:()=>B(l),style:{border:`1px solid ${t.border}`,borderRadius:2,padding:12,backgroundColor:t.backgroundSoft,cursor:"pointer",transition:"all 0.2s ease",fontFamily:"Consolas",fontSize:11},onMouseEnter:y=>{y.currentTarget.style.borderColor=t.accent,y.currentTarget.style.backgroundColor=t.background},onMouseLeave:y=>{y.currentTarget.style.borderColor=t.border,y.currentTarget.style.backgroundColor=t.backgroundSoft},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8},children:[e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${x(l.status)}`,color:x(l.status),backgroundColor:x(l.status)+"20"},children:l.status}),e.jsx("span",{style:{fontSize:10,color:t.muted,fontFamily:"Consolas"},children:_(l.processed_at)})]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:4,fontSize:11,color:t.foreground},children:[e.jsxs("div",{children:[e.jsx("span",{style:{color:t.muted},children:d.v}),e.jsxs("span",{style:{fontWeight:600,marginLeft:8},children:[l.schema_name||"N/A",".",l.table_name||"N/A"]}),e.jsxs("span",{style:{color:t.muted,marginLeft:8},children:["[",l.db_engine||"N/A","]"]})]}),e.jsxs("div",{style:{paddingLeft:16,color:t.muted},children:[d.tRight," Strategy: ",l.pk_strategy||"N/A",l.record_count!==null&&l.record_count!==void 0&&e.jsxs("span",{style:{marginLeft:12},children:[d.v," Records: ",l.record_count.toLocaleString()]})]})]})]},u)})})]})}if(f==="transfer"){if(!s)return e.jsxs("div",{style:{padding:60,textAlign:"center",color:t.muted,fontFamily:"Consolas",fontSize:12},children:[d.dot," Select an item to view details"]});const i=n=>{const l=(n||"").toUpperCase();return l==="SUCCESS"?t.success:l==="FAILED"||l==="ERROR"?t.danger:l==="PENDING"||l==="IN_PROGRESS"?t.warning:t.muted};return e.jsx("div",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground},children:e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft,marginBottom:12},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:16,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," TRANSFER METRICS DETAILS"]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8,fontFamily:"Consolas",fontSize:11,lineHeight:1.8},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Schema:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.schema_name||"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Table:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.table_name||"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Database Engine:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.db_engine||"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Status:"}),e.jsx("span",{style:{marginLeft:20,padding:"2px 8px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${i(s.status||"PENDING")}`,color:i(s.status||"PENDING"),backgroundColor:i(s.status||"PENDING")+"20"},children:s.status||"PENDING"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Transfer Type:"}),e.jsx("span",{style:{marginLeft:20,padding:"2px 8px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${t.accent}`,color:t.accent,backgroundColor:t.accent+"20"},children:s.transfer_type||"UNKNOWN"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Records Transferred:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:(s.records_transferred||0).toLocaleString()})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Bytes Transferred:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.bytes_transferred?`${(s.bytes_transferred/(1024*1024*1024)).toFixed(2)} GB`:"0 GB"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Memory Used:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.memory_used_mb?`${parseFloat(s.memory_used_mb).toFixed(2)} MB`:"0 MB"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ IO Operations/sec:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.io_operations_per_second||0})]}),s.duration_seconds&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Duration:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.duration_seconds>=3600?`${Math.floor(s.duration_seconds/3600)}h ${Math.floor(s.duration_seconds%3600/60)}m ${s.duration_seconds%60}s`:s.duration_seconds>=60?`${Math.floor(s.duration_seconds/60)}m ${s.duration_seconds%60}s`:`${s.duration_seconds}s`})]}),s.transfer_rate&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Transfer Rate:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.transfer_rate>=1024*1024?`${(s.transfer_rate/(1024*1024)).toFixed(2)} MB/s`:s.transfer_rate>=1024?`${(s.transfer_rate/1024).toFixed(2)} KB/s`:`${s.transfer_rate.toFixed(2)} B/s`})]}),s.throughput_rps&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Throughput (RPS):"}),e.jsxs("span",{style:{fontWeight:500,marginLeft:20},children:[s.throughput_rps.toLocaleString()," records/sec"]})]}),s.progress_percentage!==null&&s.progress_percentage!==void 0&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Progress:"}),e.jsxs("span",{style:{fontWeight:500,marginLeft:20},children:[Number(s.progress_percentage).toFixed(1),"%"]})]}),s.retry_count!==null&&s.retry_count!==void 0&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Retry Count:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.retry_count})]}),s.source_connection&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Source Connection:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20,fontSize:10,maxWidth:"60%",textAlign:"right",wordBreak:"break-word"},children:s.source_connection.length>50?`${s.source_connection.substring(0,50)}...`:s.source_connection})]}),s.target_connection&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Target Connection:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20,fontSize:10,maxWidth:"60%",textAlign:"right",wordBreak:"break-word"},children:s.target_connection.length>50?`${s.target_connection.substring(0,50)}...`:s.target_connection})]}),s.server_name&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Server Name:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.server_name})]}),s.database_name&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Database Name:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.database_name})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Started At:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.started_at?_(s.started_at):"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Completed At:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.completed_at?_(s.completed_at):"N/A"})]}),s.updated_at&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Updated At:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:_(s.updated_at)})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsxs("span",{style:{color:t.muted},children:[s.error_message?"├─":"└─"," Created At:"]}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.created_at?_(s.created_at):"N/A"})]}),s.error_message&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"└─ Error Message:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20,color:t.danger,maxWidth:"60%",textAlign:"right",wordBreak:"break-word"},children:s.error_message})]})]})]})})}if(!s)return e.jsxs(e.Fragment,{children:[Ee(),e.jsxs("div",{style:{padding:60,textAlign:"center",color:t.muted,fontFamily:"Consolas",fontSize:12},children:[d.dot," Select an item to view details"]})]});if(f==="monitor"){const i=n=>{const l=(n||"").toUpperCase();return l.includes("ERROR")||l.includes("ABORTED")?t.danger:l.includes("IDLE IN TRANSACTION")?t.warning:l==="ACTIVE"?t.success:t.muted};return e.jsx("div",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground},children:e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8,fontFamily:"Consolas",fontSize:11,lineHeight:1.8},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ PID:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.pid})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ User:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.usename})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Database:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.datname})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ State:"}),e.jsx("span",{style:{marginLeft:20,padding:"2px 8px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${i(s.state)}`,color:i(s.state),backgroundColor:i(s.state)+"20"},children:s.state})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Duration:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.duration})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Application:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.application_name||"-"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Client Address:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.client_addr||"-"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Started At:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:_(s.query_start)})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"└─ Wait Event:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.wait_event_type?`${s.wait_event_type} (${s.wait_event})`:"None"})]})]})})}else{const i=n=>{const l=(n||"").toUpperCase();return l==="EXCELLENT"?t.success:l==="GOOD"?t.accent:l==="FAIR"?t.warning:l==="POOR"?t.danger:t.muted};return e.jsxs("div",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground},children:[e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft,marginBottom:12},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:16,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," QUERY PERFORMANCE DETAILS"]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8,fontFamily:"Consolas",fontSize:11,lineHeight:1.8},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Query ID:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.queryid||"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Database:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.dbname||"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Performance Tier:"}),e.jsx("span",{style:{marginLeft:20,padding:"2px 8px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${i(s.performance_tier||"N/A")}`,color:i(s.performance_tier||"N/A"),backgroundColor:i(s.performance_tier||"N/A")+"20"},children:s.performance_tier||"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Operation Type:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.operation_type||"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Mean Time:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:ae(s.mean_time_ms)})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Total Time:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:ae(s.total_time_ms)})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Calls:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:((o=s.calls)==null?void 0:o.toLocaleString())||"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Efficiency Score:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.query_efficiency_score?`${Number(s.query_efficiency_score).toFixed(2)}%`:"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Cache Hit Ratio:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:s.cache_hit_ratio?`${Number(s.cache_hit_ratio).toFixed(2)}%`:"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Rows Returned:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:((p=s.rows_returned)==null?void 0:p.toLocaleString())||"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Long Running:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20,color:s.is_long_running?t.warning:t.muted},children:s.is_long_running?"Yes":"No"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Blocking:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20,color:s.is_blocking?t.danger:t.muted},children:s.is_blocking?"Yes":"No"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"└─ Captured At:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:_(s.captured_at)})]})]})]}),e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," QUERY TEXT"]}),e.jsx("pre",{style:{margin:0,padding:12,backgroundColor:t.background,borderRadius:2,overflowX:"auto",fontSize:11,border:`1px solid ${t.border}`,fontFamily:"Consolas",whiteSpace:"pre-wrap",wordWrap:"break-word",color:t.foreground},children:s.query_text||"N/A"})]})]})}},We=()=>{const o=(p,i,n,l,u,x,y)=>{const a=l.length>0?l[l.length-1]:0,m=i||a,b=l.length>1,$=b?Math.min(...l):0,w=b?Math.max(...l):0,F=y||(w>0?w:100),C=F>0?m/F*100:0,E=Math.min(100,Math.max(0,C));return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8,padding:"12px",backgroundColor:t.background,borderRadius:2,border:`1px solid ${t.border}`,transition:"all 0.2s ease"},onMouseEnter:V=>{V.currentTarget.style.borderColor=u,V.currentTarget.style.backgroundColor=t.backgroundSoft},onMouseLeave:V=>{V.currentTarget.style.borderColor=t.border,V.currentTarget.style.backgroundColor=t.background},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4},children:[e.jsxs("div",{style:{fontSize:11,color:t.accent,fontWeight:500,display:"flex",alignItems:"center",gap:6,fontFamily:"Consolas"},children:[e.jsx("span",{children:x}),e.jsx("span",{children:p})]}),e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:u,fontFamily:"Consolas"},children:[m.toFixed(1),n]})]}),e.jsx("div",{style:{width:"100%",height:6,backgroundColor:t.backgroundSoft,borderRadius:1,overflow:"hidden",border:`1px solid ${t.border}`},children:e.jsx("div",{style:{width:`${E}%`,height:"100%",backgroundColor:u,transition:"width 0.3s ease",borderRadius:1}})}),e.jsx(Qe,{data:l,color:u,width:40,labels:v.timestamp}),b&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",fontSize:9,color:t.muted,marginTop:2,fontFamily:"Consolas"},children:[e.jsxs("span",{children:["Min: ",$.toFixed(1),n]}),e.jsxs("span",{children:["Max: ",w.toFixed(1),n]})]})]})};return e.jsxs("div",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground},children:[e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft,marginBottom:16},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:16,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," SYSTEM RESOURCES"]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12},children:[o("CPU Usage",v.cpuUsage.length>0?v.cpuUsage[v.cpuUsage.length-1]:0,"%",v.cpuUsage,t.accent,d.blockFull,100),o("Memory",v.memoryPercentage.length>0?v.memoryPercentage[v.memoryPercentage.length-1]:0,"%",v.memoryPercentage,t.accent,d.blockSemi,100),o("Network",v.network.length>0?v.network[v.network.length-1]:0," IOPS",v.network,t.accent,d.blockLight),o("Throughput",v.throughput.length>0?v.throughput[v.throughput.length-1]:0," RPS",v.throughput,t.accent,d.dot)]})]}),e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft,marginBottom:16},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:16,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," DATABASE METRICS"]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12},children:[o("DB Connections",v.dbConnections.length>0?v.dbConnections[v.dbConnections.length-1]:0,"%",v.dbConnections,t.accent,d.blockFull,100),o("Queries/sec",v.dbQueriesPerSecond.length>0?v.dbQueriesPerSecond[v.dbQueriesPerSecond.length-1]:0,"",v.dbQueriesPerSecond,t.accent,d.blockSemi)]})]}),e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:16,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," DATABASE HEALTH"]}),e.jsxs("div",{style:{fontFamily:"Consolas",fontSize:11,lineHeight:1.8,color:t.foreground},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"4px"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Active Connections:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:"20px"},children:j.activeConnections||"0/0"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"4px"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Connection Usage:"}),e.jsxs("span",{style:{fontWeight:500,marginLeft:"20px"},children:[j.connectionPercentage||"0.0","%"]})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"4px"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Response Time:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:"20px"},children:j.responseTime||"< 1ms"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"4px"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Buffer Hit Rate:"}),e.jsxs("span",{style:{fontWeight:500,marginLeft:"20px"},children:[j.bufferHitRate||"0.0","%"]})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"4px"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Cache Hit Rate:"}),e.jsxs("span",{style:{fontWeight:500,marginLeft:"20px"},children:[j.cacheHitRate||"0.0","%"]})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"4px"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Status:"}),e.jsx("span",{style:{marginLeft:"20px"},children:e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${j.status==="Healthy"?t.success:t.muted}`,color:j.status==="Healthy"?t.success:t.muted,backgroundColor:(j.status==="Healthy"?t.success:t.muted)+"20"},children:j.status||"Unknown"})})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"4px"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Uptime:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:"20px"},children:j.uptimeSeconds?`${Math.floor(j.uptimeSeconds/86400)}d ${Math.floor(j.uptimeSeconds%86400/3600)}h ${Math.floor(j.uptimeSeconds%3600/60)}m`:"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"4px"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Active Queries:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:"20px"},children:j.activeQueries||0})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"4px"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Waiting Queries:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:"20px"},children:j.waitingQueries||0})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"4px"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Avg Query Duration:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:"20px"},children:j.avgQueryDuration&&typeof j.avgQueryDuration=="number"?`${j.avgQueryDuration.toFixed(2)}s`:"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"4px"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Query Efficiency:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:"20px"},children:j.queryEfficiencyScore&&typeof j.queryEfficiencyScore=="number"?`${j.queryEfficiencyScore.toFixed(1)}%`:"0.0%"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"4px"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Long Running Queries:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:"20px"},children:j.longRunningQueries||0})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"4px"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Blocking Queries:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:"20px"},children:j.blockingQueries||0})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"4px"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Total Queries (24h):"}),e.jsx("span",{style:{fontWeight:500,marginLeft:"20px"},children:j.totalQueries24h||0})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"└─ Database Size:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:"20px"},children:j.databaseSizeBytes?`${(j.databaseSizeBytes/(1024*1024*1024)).toFixed(2)} GB`:"N/A"})]})]})]})]})},De=()=>{const o=(p,i)=>e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:"12px 16px",backgroundColor:t.backgroundSoft,transition:"all 0.2s ease",fontFamily:"Consolas"},onMouseEnter:n=>{n.currentTarget.style.transform="translateY(-2px)",n.currentTarget.style.boxShadow="0 4px 12px rgba(0, 0, 0, 0.1)",n.currentTarget.style.borderColor=t.accent,n.currentTarget.style.backgroundColor=t.background},onMouseLeave:n=>{n.currentTarget.style.transform="translateY(0)",n.currentTarget.style.boxShadow="none",n.currentTarget.style.borderColor=t.border,n.currentTarget.style.backgroundColor=t.backgroundSoft},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:8},children:[e.jsx("span",{style:{color:t.accent,fontSize:12},children:d.blockFull}),e.jsx("div",{style:{fontSize:"1.6em",fontWeight:600,color:t.accent,fontFamily:"Consolas"},children:p})]}),e.jsxs("div",{style:{fontSize:10,color:t.muted,textTransform:"uppercase",letterSpacing:.5,fontWeight:500,borderTop:`1px solid ${t.border}`,paddingTop:8,marginTop:8},children:[d.v," ",i]})]});return f==="monitor"?e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:16,marginBottom:20,animation:"fadeInUp 0.3s ease-out"},children:[o(R.length,"Active Queries"),o(L.total||0,"Total Events"),o(L.listeningChanges||0,"Listening"),o(L.errors||0,"Errors")]}):f==="live"?e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:16,marginBottom:20,animation:"fadeInUp 0.3s ease-out"},children:[o(L.total||0,"Total Events"),o(L.last24h||0,"Last 24h"),o(L.listeningChanges||0,"Listening"),o(L.fullLoad||0,"Full Load"),o(L.errors||0,"Errors")]}):f==="transfer"?e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:16,marginBottom:20,animation:"fadeInUp 0.3s ease-out"},children:[o(P.total_transfers||0,"Total Transfers"),o(P.successful||0,"Successful"),o(P.failed||0,"Failed"),o(P.pending||0,"Pending"),o(P.total_records?`${(P.total_records/1e6).toFixed(1)}M`:"0","Total Records"),o(P.total_bytes?`${(P.total_bytes/(1024*1024*1024)).toFixed(1)} GB`:"0 GB","Total Bytes")]}):e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:16,marginBottom:20,animation:"fadeInUp 0.3s ease-out"},children:[o(k.total_queries||0,"Total Queries"),o(k.excellent_count||0,"Excellent"),o(k.good_count||0,"Good"),o(k.fair_count||0,"Fair"),o(k.poor_count||0,"Poor"),o(k.avg_efficiency?`${Number(k.avg_efficiency).toFixed(1)}%`:"N/A","Avg Efficiency")]})};return ne&&R.length===0&&z.length===0&&I.length===0?e.jsx(Me,{variant:"table"}):e.jsxs("div",{style:{padding:"20px",fontFamily:"Consolas",fontSize:12},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"},children:[e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:t.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:t.accent,marginRight:8},children:d.blockFull}),"MONITOR"]}),e.jsx(re,{label:"Monitor Info",onClick:()=>ce(!0),variant:"ghost"})]}),J&&e.jsx("div",{style:{marginBottom:20},children:e.jsx(O,{title:"ERROR",children:e.jsx("div",{style:{padding:"12px",color:t.danger,fontSize:12,fontFamily:"Consolas"},children:J})})}),e.jsx("div",{style:{display:"flex",gap:8,marginBottom:16,borderBottom:`1px solid ${t.border}`,paddingBottom:8},children:["monitor","live","performance","transfer","system"].map(o=>e.jsx("button",{onClick:()=>U(o),style:{padding:"8px 16px",border:`1px solid ${f===o?t.accent:t.border}`,backgroundColor:f===o?t.accent:t.background,color:f===o?"#ffffff":t.foreground,borderRadius:2,cursor:"pointer",fontSize:11,fontWeight:f===o?600:500,transition:"all 0.2s ease",textTransform:"capitalize"},onMouseEnter:p=>{f!==o&&(p.currentTarget.style.backgroundColor=t.backgroundSoft,p.currentTarget.style.borderColor=t.accent)},onMouseLeave:p=>{f!==o&&(p.currentTarget.style.backgroundColor=t.background,p.currentTarget.style.borderColor=t.border)},children:o==="live"?"Live Changes":o==="performance"?"Query Performance":o==="transfer"?"Transfer Metrics":o==="system"?"System Resources":o},o))}),f!=="system"&&e.jsx("div",{style:{marginBottom:16},children:De()}),f==="performance"&&e.jsx(O,{title:"FILTERS",children:e.jsxs("div",{style:{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"},children:[e.jsxs("select",{value:H,onChange:o=>xe(o.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Tiers"}),e.jsx("option",{value:"EXCELLENT",children:"EXCELLENT"}),e.jsx("option",{value:"GOOD",children:"GOOD"}),e.jsx("option",{value:"FAIR",children:"FAIR"}),e.jsx("option",{value:"POOR",children:"POOR"})]}),e.jsx(re,{label:"Reset Filter",onClick:()=>xe(""),variant:"ghost"})]})}),f==="live"&&e.jsx(O,{title:"FILTERS",children:e.jsxs("div",{style:{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"},children:[e.jsxs("select",{value:T,onChange:o=>ye(o.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Types"}),e.jsx("option",{value:"CDC",children:"CDC"}),e.jsx("option",{value:"N/A",children:"N/A"})]}),e.jsxs("select",{value:M,onChange:o=>be(o.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Statuses"}),e.jsx("option",{value:"LISTENING_CHANGES",children:"LISTENING_CHANGES"}),e.jsx("option",{value:"NO_DATA",children:"NO_DATA"}),e.jsx("option",{value:"ERROR",children:"ERROR"})]}),e.jsx(re,{label:"Reset Filters",onClick:()=>{ye(""),be("")},variant:"ghost"})]})}),f==="transfer"&&(()=>{const o=Array.from(new Set(G.map(n=>n.transfer_type).filter(Boolean))).sort(),p=Array.from(new Set(G.map(n=>n.db_engine).filter(Boolean))).sort(),i=Array.from(new Set(G.map(n=>n.status).filter(Boolean))).sort();return e.jsx(O,{title:"FILTERS",children:e.jsxs("div",{style:{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"},children:[e.jsxs("select",{value:Y,onChange:n=>je(n.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Statuses"}),i.map(n=>e.jsx("option",{value:n,children:n},n))]}),e.jsxs("select",{value:q,onChange:n=>ve(n.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Types"}),o.map(n=>e.jsx("option",{value:n,children:n},n))]}),e.jsxs("select",{value:X,onChange:n=>Se(n.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Engines"}),p.map(n=>e.jsx("option",{value:n,children:n},n))]}),e.jsx(re,{label:"Reset Filters",onClick:()=>{je(""),ve(""),Se("")},variant:"ghost"})]})})})(),f==="system"?e.jsx("div",{style:{width:"100%"},children:We()}):f==="monitor"?e.jsxs(e.Fragment,{children:[e.jsx(O,{title:"TREE VIEW",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:12,maxHeight:"calc(100vh - 200px)",overflowY:"auto",animation:"slideIn 0.3s ease-out"},children:$e()})}),s&&s.query&&e.jsxs(e.Fragment,{children:[e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,backgroundColor:"rgba(0, 0, 0, 0.6)",zIndex:999,opacity:0,animation:"fadeIn 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",willChange:"opacity"},onClick:()=>B(null)}),e.jsxs("div",{style:{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%, -50%) scale(0.95)",width:"85%",height:"85%",maxWidth:"1400px",maxHeight:"900px",backgroundColor:t.background,border:`2px solid ${t.border}`,borderRadius:2,zIndex:1e3,display:"flex",flexDirection:"column",fontFamily:"Consolas",fontSize:12,color:t.foreground,boxShadow:"0 8px 32px rgba(0, 0, 0, 0.4)",opacity:0,animation:"modalSlideIn 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",willChange:"transform, opacity"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`2px solid ${t.border}`,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0},children:[d.blockFull," QUERY DETAILS"]}),e.jsxs("button",{onClick:()=>B(null),style:{background:"transparent",border:`1px solid ${t.border}`,color:t.foreground,padding:"4px 12px",borderRadius:2,cursor:"pointer",fontFamily:"Consolas",fontSize:11,transition:"background-color 0.12s ease-out, border-color 0.12s ease-out, color 0.12s ease-out",willChange:"background-color, color"},onMouseEnter:o=>{o.currentTarget.style.backgroundColor=t.danger,o.currentTarget.style.color=t.background},onMouseLeave:o=>{o.currentTarget.style.backgroundColor="transparent",o.currentTarget.style.color=t.foreground},children:[d.blockFull," CLOSE"]})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"4fr 1fr",gap:20,flex:1,padding:20,overflow:"hidden"},children:[e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"},children:[e.jsxs("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," QUERY TEXT"]}),e.jsx("pre",{style:{margin:0,padding:16,backgroundColor:t.backgroundSoft,borderRadius:2,overflowX:"auto",overflowY:"auto",fontSize:11,border:`1px solid ${t.border}`,fontFamily:"Consolas",whiteSpace:"pre-wrap",wordWrap:"break-word",color:t.foreground,flex:1},children:s.query||"N/A"})]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"},children:[e.jsxs("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[d.blockFull," DETAILS"]}),e.jsx("div",{style:{overflowY:"auto",flex:1},children:Re()})]})]})]})]})]}):e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 500px",gap:20,height:"calc(100vh - 300px)",minHeight:600,marginTop:f==="transfer"?24:0},children:[e.jsx(O,{title:"TREE VIEW",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:12,maxHeight:"calc(100vh - 400px)",overflowY:"auto",overflowX:"hidden",scrollbarWidth:"thin",scrollbarColor:`${t.border} transparent`},className:"tree-view-container",children:$e()})}),e.jsx(O,{title:"DETAILS",children:e.jsx("div",{style:{maxHeight:"calc(100vh - 400px)",overflowY:"auto",animation:"fadeInUp 0.4s ease-out"},children:Re()})})]}),e.jsx("style",{children:`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dots {
          0%, 20% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.92);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
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
        .tree-view-container::-webkit-scrollbar {
          width: 6px;
        }
        .tree-view-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .tree-view-container::-webkit-scrollbar-thumb {
          background: ${t.border};
          border-radius: 3px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .tree-view-container.showing-scrollbar::-webkit-scrollbar-thumb {
          opacity: 0.6;
        }
        .tree-view-container:not(.showing-scrollbar)::-webkit-scrollbar-thumb {
          opacity: 0 !important;
        }
        .tree-view-container::-webkit-scrollbar-thumb:hover {
          opacity: 1;
        }
        * {
          transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }
      `}),Ae&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e4},onClick:()=>ce(!1),children:e.jsx("div",{style:{width:"90%",maxWidth:1e3,maxHeight:"90vh",overflowY:"auto"},onClick:o=>o.stopPropagation(),children:e.jsx(O,{title:"MONITOR PLAYBOOK",children:e.jsxs("div",{style:{padding:16,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[d.blockFull," OVERVIEW"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"The Monitor provides real-time visibility into system performance, active queries, live data changes, transfer metrics, and system resources. It tracks the multi-threaded DataSync system with core threads (initialization, catalog sync, monitoring, quality, maintenance, webhooks) and transfer threads (MariaDB, MSSQL, MongoDB, Oracle, PostgreSQL, DB2, API, CSV, Google Sheets, Custom Jobs, Data Warehouse)."})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[d.blockFull," MONITORING TABS"]}),e.jsxs("div",{style:{color:t.foreground,marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Active Queries:"})," Real-time view of currently executing database queries with PID, user, database, state, and query details"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Live Changes:"})," Monitor Change Data Capture (CDC) events and full load operations in real-time"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Query Performance:"})," Analyze query performance metrics with tier classification (EXCELLENT, GOOD, FAIR, POOR)"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Transfer Metrics:"})," Track data transfer operations across all database engines and sources"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"└─"})," ",e.jsx("strong",{children:"System Resources:"})," Monitor CPU, memory, network, throughput, and database connection metrics"]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[d.blockFull," QUERY PERFORMANCE TIERS"]}),e.jsxs("div",{style:{color:t.foreground,marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.success},children:d.blockFull})," ",e.jsx("strong",{children:"EXCELLENT:"})," Queries with optimal performance metrics"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.accent},children:d.blockFull})," ",e.jsx("strong",{children:"GOOD:"})," Queries with acceptable performance"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.warning},children:d.blockFull})," ",e.jsx("strong",{children:"FAIR:"})," Queries with moderate performance issues"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.danger},children:d.blockFull})," ",e.jsx("strong",{children:"POOR:"})," Queries with significant performance problems requiring optimization"]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[d.blockFull," LIVE CHANGES EVENTS"]}),e.jsxs("div",{style:{color:t.foreground,marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Event Types:"})," CDC (Change Data Capture) and N/A (Full Load operations)"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Event Status:"})," LISTENING_CHANGES (actively monitoring), NO_DATA (no changes detected), ERROR (error occurred)"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"└─"})," ",e.jsx("strong",{children:"Real-time Tracking:"})," Monitor processing logs and execution timelines for all synchronization operations"]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[d.blockFull," TRANSFER METRICS"]}),e.jsxs("div",{style:{color:t.foreground,marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Status Filtering:"})," Filter by SUCCESS, FAILED, ERROR, PENDING, IN_PROGRESS"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Type Filtering:"})," Filter by FULL_LOAD, SYNC, CDC, RESET"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Engine Filtering:"})," Filter by PostgreSQL, MariaDB, MSSQL, MongoDB, Oracle, DB2"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"└─"})," ",e.jsx("strong",{children:"Metrics:"})," Track records transferred, bytes transferred, duration, transfer rate, throughput, progress, retry count"]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[d.blockFull," SYSTEM RESOURCES"]}),e.jsxs("div",{style:{color:t.foreground,marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"CPU Usage:"})," Real-time CPU utilization percentage"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Memory:"})," Memory usage percentage and available memory"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Network:"})," Network throughput and bandwidth usage"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Database Connections:"})," Active database connections and connection pool status"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Queries Per Second:"})," Database query throughput"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"└─"})," ",e.jsx("strong",{children:"Query Efficiency:"})," Query performance efficiency metrics"]})]})]}),e.jsxs("div",{style:{marginTop:16,padding:12,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:t.muted,marginBottom:4},children:[d.blockSemi," Best Practices"]}),e.jsxs("div",{style:{fontSize:11,color:t.foreground},children:["• Monitor active queries to identify long-running or blocking queries",e.jsx("br",{}),"• Use query performance tiers to prioritize optimization efforts",e.jsx("br",{}),"• Track live changes to ensure CDC is working correctly",e.jsx("br",{}),"• Monitor transfer metrics to identify bottlenecks in data synchronization",e.jsx("br",{}),"• Watch system resources to prevent resource exhaustion",e.jsx("br",{}),"• Use filters to focus on specific engines, statuses, or event types",e.jsx("br",{}),"• Review execution timelines to understand operation duration and patterns"]})]}),e.jsx("div",{style:{marginTop:16,textAlign:"right"},children:e.jsx(re,{label:"Close",onClick:()=>ce(!1),variant:"ghost"})})]})})})})]})};export{Ve as default};
