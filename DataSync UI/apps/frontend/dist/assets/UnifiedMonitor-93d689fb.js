import{f as y,t as r,b as t,u as et,r as w,h as ue,d as Se,j as e,e as h}from"./index-f6ac47b8.js";import{e as ke}from"./errorHandler-5ea9ae85.js";import{A as ee}from"./AsciiPanel-5614714e.js";import{A as xe}from"./AsciiButton-4907e65e.js";import{S as tt}from"./SkeletonLoader-792007e7.js";y.div``;y.div`
  display: grid;
  grid-template-columns: 1fr 500px;
  gap: ${r.spacing.lg};
  height: calc(100vh - 200px);
  min-height: 600px;
`;y.div`
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
      background: ${t.accent};
    }
  }
`;y.div`
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
      background: ${t.accent};
    }
  }
`;y.div`
  display: flex;
  gap: ${r.spacing.sm};
  margin-bottom: ${r.spacing.md};
  border-bottom: 2px solid ${r.colors.border.light};
  padding-bottom: ${r.spacing.sm};
`;y.button`
  padding: ${r.spacing.sm} ${r.spacing.md};
  border: none;
  background: ${a=>a.$active?t.accent:"transparent"};
  color: ${a=>a.$active?r.colors.text.white:r.colors.text.secondary};
  border-radius: ${r.borderRadius.md} ${r.borderRadius.md} 0 0;
  cursor: pointer;
  font-weight: ${a=>a.$active?"600":"500"};
  transition: all ${r.transitions.normal};
  
  &:hover {
    background: ${a=>a.$active?t.accent:r.colors.background.secondary};
    color: ${a=>a.$active?r.colors.text.white:r.colors.text.primary};
  }
`;y.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: ${r.spacing.md};
  margin-bottom: ${r.spacing.lg};
`;y.div`
  background: ${({theme:a})=>a.colors.background.main};
  border: 1px solid ${({theme:a})=>a.colors.border.light};
  border-radius: 2;
  padding: 16px;
  text-align: center;
  transition: all 0.15s ease;
  
  &:hover {
    border-color: ${({theme:a})=>a.colors.border.medium};
    background: ${({theme:a})=>a.colors.background.secondary};
  }
`;y.div`
  font-size: 24px;
  font-weight: 700;
  color: ${({theme:a})=>a.colors.text.primary};
  margin-bottom: 4px;
  font-family: 'Consolas';
`;y.div`
  font-size: 11px;
  color: ${({theme:a})=>a.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
  font-family: 'Consolas';
`;y.div`
  font-family: "Consolas";
  font-size: 0.95em;
`;y.div`
  user-select: none;
  transition: opacity 0.15s ease;
  margin-bottom: 2px;
`;y.div`
  display: flex;
  align-items: center;
  padding: ${a=>a.$level===0?"12px 8px":a.$level===1?"10px 8px":"8px 8px"};
  padding-left: ${a=>a.$level*24+8}px;
  cursor: pointer;
  border-radius: 2;
  transition: all 0.15s ease;
  position: relative;
  margin: 2px 0;
  
  ${a=>a.$nodeType==="database"?`
        background: ${a.$isExpanded?"#f8f9fa":"transparent"};
        border-left: 3px solid #1e40af;
        font-weight: 600;
      `:a.$nodeType==="schema"?`
        background: transparent;
        border-left: 2px solid #6b7280;
      `:`
      border-left: 1px solid #6b7280;
    `}
  
  &:hover {
    background: #f8f9fa;
    transform: translateX(2px);
  }
`;y.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 8px;
  border-radius: 2;
  background: transparent;
  color: ${a=>a.$isExpanded?t.background:t.accent};
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
    transform: ${a=>a.$isExpanded?"rotate(0deg)":"rotate(-90deg)"};
  }
`;y.span`
  font-weight: ${a=>a.$isDatabase?"700":a.$isSchema?"600":"500"};
  font-size: ${a=>a.$isDatabase?"1.05em":a.$isSchema?"0.98em":"0.92em"};
  color: ${a=>a.$isDatabase?t.accent:a.$isSchema?r.colors.text.primary:r.colors.text.secondary};
  margin-right: 12px;
  transition: color ${r.transitions.normal};
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;y.span`
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
    background: ${t.backgroundSoft};
    border-color: ${t.accent};
    color: ${t.accent};
    transform: translateY(-1px);
  }
`;y.div`
  overflow: hidden;
  transition: all 0.15s ease;
  padding-left: ${a=>a.$level*24+36}px;
`;y.div`
  padding: 10px 8px;
  margin: 4px 0;
  border-radius: ${r.borderRadius.md};
  border-left: 2px solid ${a=>a.$selected?t.accent:r.colors.border.light};
  background: ${a=>a.$selected?t.backgroundSoft:"transparent"};
  cursor: pointer;
  transition: all ${r.transitions.normal};
  
  &:hover {
    background: ${r.colors.background.secondary};
    border-left-color: ${t.accent};
  }
`;y.div`
  font-size: 0.85em;
  color: ${r.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 4px;
  font-family: "Consolas";
`;y.button`
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
`;y.span`
  padding: 4px 10px;
  border-radius: ${r.borderRadius.md};
  font-size: 0.75em;
  font-weight: 500;
  display: inline-block;
  margin-left: 8px;
  background-color: ${a=>{switch(a.$status){case"active":return r.colors.status.success.bg;case"idle in transaction":return r.colors.status.warning.bg;case"idle in transaction (aborted)":return r.colors.status.error.bg;case"FULL_LOAD":return r.colors.status.info.bg;case"LISTENING_CHANGES":return r.colors.status.success.bg;case"ERROR":return r.colors.status.error.bg;case"EXCELLENT":return r.colors.status.success.bg;case"GOOD":return r.colors.status.info.bg;case"FAIR":return r.colors.status.warning.bg;case"POOR":return r.colors.status.error.bg;default:return r.colors.background.secondary}}};
  color: ${a=>{switch(a.$status){case"active":return r.colors.status.success.text;case"idle in transaction":return r.colors.status.warning.text;case"idle in transaction (aborted)":return r.colors.status.error.text;case"FULL_LOAD":return r.colors.status.info.text;case"LISTENING_CHANGES":return r.colors.status.success.text;case"ERROR":return r.colors.status.error.text;case"EXCELLENT":return r.colors.status.success.text;case"GOOD":return r.colors.status.info.text;case"FAIR":return r.colors.status.warning.text;case"POOR":return r.colors.status.error.text;default:return r.colors.text.secondary}}};
`;y.div`
  background: ${r.colors.background.secondary};
  border: 1px solid ${r.colors.border.light};
  border-radius: ${r.borderRadius.md};
  padding: ${r.spacing.lg};
  margin-bottom: ${r.spacing.md};
`;y.h3`
  font-size: 1.1em;
  font-weight: 600;
  color: ${r.colors.text.primary};
  margin: 0 0 ${r.spacing.md} 0;
  padding-bottom: ${r.spacing.sm};
  border-bottom: 2px solid ${r.colors.border.light};
`;y.div`
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: ${r.spacing.md};
  font-size: 0.9em;
`;y.div`
  color: ${r.colors.text.secondary};
  font-weight: 500;
`;y.div`
  color: ${r.colors.text.primary};
  word-break: break-word;
`;y.pre`
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
`;y.div`
  padding: 60px 40px;
  text-align: center;
  color: ${r.colors.text.secondary};
  transition: opacity 0.15s ease;
  
  &::before {
    content: '📊';
    font-size: 3em;
    display: block;
    margin-bottom: ${r.spacing.md};
    opacity: 0.5;
  }
`;y.div`
  padding: 60px 40px;
  text-align: center;
  color: ${r.colors.text.secondary};
  transition: opacity 0.15s ease;
  
  &::before {
    content: '👈';
    font-size: 3em;
    display: block;
    margin-bottom: ${r.spacing.md};
    opacity: 0.5;
  }
`;y.div`
  width: 100%;
  margin-top: 20px;
  padding: 25px;
  background: ${r.colors.background.main};
  border-radius: ${r.borderRadius.lg};
  box-shadow: ${r.shadows.md};
  color: ${r.colors.text.primary};
  overflow: visible;
  position: relative;
  transition: box-shadow 0.15s ease, transform 0.15s ease, opacity 0.15s ease;
  
  &:hover {
    box-shadow: ${r.shadows.lg};
    transform: translateY(-2px);
  }
`;y.div`
  font-weight: bold;
  margin-bottom: 20px;
  color: ${r.colors.text.primary};
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
`;y.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: ${a=>a.$active?r.colors.text.primary:r.colors.text.secondary};
  transition: all 0.3s ease;
  padding: 6px 10px;
  border-radius: ${r.borderRadius.sm};
  cursor: pointer;
  user-select: none;
  border: 1px solid ${a=>a.$active?r.colors.border.medium:"transparent"};
  background: ${a=>a.$active?r.colors.background.secondary:"transparent"};
  
  &:hover {
    background: ${r.colors.background.secondary};
    color: ${r.colors.text.primary};
    transform: translateY(-1px);
    border-color: ${r.colors.border.medium};
  }
`;y.input`
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: ${r.colors.status.info.text};
  
  &:checked {
    accent-color: ${r.colors.status.info.text};
  }
`;y.button`
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
`;y.span`
  display: inline-block;
  width: 24px;
  height: 0;
  opacity: ${a=>a.$active?1:.4};
  transition: opacity 0.3s ease;
  border-top: 2px solid;
  border-color: ${a=>a.$color};
`;y.path`
  transition: d 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: d;
  opacity: 1;
  vector-effect: non-scaling-stroke;
`;y.path`
  transition: d 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: d;
  opacity: 1;
`;y.svg`
  width: 100%;
  height: 100%;
  display: block;
  min-height: 400px;
`;y.div`
  width: 100%;
  height: 500px;
  min-height: 400px;
  position: relative;
  background: ${r.colors.background.main};
  border-radius: ${r.borderRadius.md};
  padding: 20px;
  overflow: visible;
`;y.line`
  stroke: ${r.colors.border.light};
  stroke-width: 1;
  opacity: 0.2;
`;y.text`
  font-size: 10px;
  fill: ${r.colors.text.secondary};
  font-family: "Consolas";
`;y.line`
  stroke: ${r.colors.border.medium};
  stroke-width: 1.5;
  opacity: 0.6;
`;y.div`
  position: absolute;
  left: ${a=>a.$x}px;
  top: ${a=>a.$y}px;
  background: ${r.colors.background.secondary};
  border: 1px solid ${r.colors.border.medium};
  border-radius: ${r.borderRadius.md};
  padding: 8px 12px;
  font-size: 0.85em;
  pointer-events: none;
  opacity: ${a=>a.$visible?1:0};
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
`;y.div`
  font-weight: 600;
  color: ${r.colors.text.primary};
  margin-bottom: 4px;
`;y.div`
  color: ${r.colors.text.secondary};
  font-size: 0.9em;
`;const rt=({data:a,color:te,height:b=4,width:q=30,labels:re})=>{const[U,X]=w.useState(null),[V,J]=w.useState(null),Z=w.useRef(null);if(!a||a.length===0)return e.jsx("span",{style:{color:t.muted},children:h.dot.repeat(q)});const n=a.slice(-q),W=re?re.slice(-q):[],I=Math.min(...n),H=Math.max(...n)-I||1,oe=["▁","▂","▃","▄","▅","▆","▇","█"],Q=P=>{if(H===0)return oe[0];const z=(P-I)/H,G=Math.floor(z*(oe.length-1));return oe[Math.max(0,Math.min(oe.length-1,G))]},me=(P,z)=>{if(Z.current){const G=Z.current.getBoundingClientRect();J({x:P.clientX-G.left,y:P.clientY-G.top-30}),X(z)}},D=()=>{X(null),J(null)};return e.jsxs("div",{ref:Z,style:{position:"relative",display:"inline-block"},onMouseLeave:D,children:[e.jsx("span",{style:{color:te,fontFamily:"Consolas",fontSize:11,letterSpacing:0,lineHeight:1,display:"inline-block"},children:n.map((P,z)=>e.jsx("span",{onMouseMove:G=>me(G,z),style:{cursor:"pointer",transition:"all 0.2s ease",transform:U===z?"scale(1.2)":"scale(1)",display:"inline-block",position:"relative"},children:Q(P)},z))}),U!==null&&V&&e.jsxs("div",{style:{position:"absolute",left:`${V.x}px`,top:`${V.y}px`,transform:"translateX(-50%)",backgroundColor:t.background,border:`1px solid ${t.border}`,borderRadius:2,padding:"6px 10px",fontSize:10,fontFamily:"Consolas",color:t.foreground,whiteSpace:"nowrap",zIndex:1e3,boxShadow:"0 4px 12px rgba(0,0,0,0.2)",pointerEvents:"none",transition:"opacity 0.15s ease, transform 0.15s ease"},children:[e.jsx("div",{style:{color:t.accent,fontWeight:600,marginBottom:2},children:n[U].toFixed(2)}),W[U]&&(()=>{const P=W[U],z=new Date(P),G=Number.isNaN(z.getTime())?P:z.toLocaleTimeString();return e.jsx("div",{style:{color:t.muted,fontSize:9},children:G})})()]})]})};y.div`
  display: flex;
  flex-direction: column;
  gap: ${r.spacing.sm};
`;y.div`
  background: ${r.colors.background.secondary};
  border: 1px solid ${r.colors.border.light};
  border-radius: ${r.borderRadius.md};
  padding: ${r.spacing.md};
  transition: all 0.15s ease;
  
  &:hover {
    border-color: ${r.colors.primary.main};
    box-shadow: ${r.shadows.sm};
    transform: translateX(4px);
  }
`;y.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${r.spacing.sm};
`;y.div`
  font-size: 0.75em;
  color: ${r.colors.text.secondary};
  font-family: "Consolas";
`;y.div`
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: ${r.spacing.sm};
  font-size: 0.9em;
  margin-top: ${r.spacing.xs};
`;y.div`
  color: ${r.colors.text.secondary};
  font-weight: 500;
`;y.div`
  color: ${r.colors.text.primary};
`;y.h3`
  font-size: 1.1em;
  font-weight: 600;
  color: ${r.colors.text.primary};
  margin: 0 0 ${r.spacing.md} 0;
  padding-bottom: ${r.spacing.sm};
  border-bottom: 2px solid ${r.colors.border.light};
`;function Ce(a){return(a==null?void 0:a.id)!=null?String(a.id):`${(a==null?void 0:a.schema_name)??""}|${(a==null?void 0:a.table_name)??""}|${(a==null?void 0:a.db_engine)??""}|${String((a==null?void 0:a.processed_at)??"")}`}const ot=({isEntering:a,children:te,style:b,onClick:q,onMouseEnter:re,onMouseLeave:U})=>{const[X,V]=w.useState(!a);return w.useEffect(()=>{if(!a)return;let J;const Z=requestAnimationFrame(()=>{J=requestAnimationFrame(()=>V(!0))});return()=>{cancelAnimationFrame(Z),typeof J=="number"&&cancelAnimationFrame(J)}},[a]),e.jsx("div",{onClick:q,onMouseEnter:re,onMouseLeave:U,style:{...b,opacity:X?1:0,transform:X?"translateY(0)":"translateY(-10px)",transition:"opacity 0.35s ease-out, transform 0.35s ease-out"},children:te})},dt=()=>{const a=et(),te=()=>a.pathname.includes("live-changes")?"live":"monitor",[b,q]=w.useState(te());w.useEffect(()=>{q(te()),W(null)},[a.pathname]),w.useEffect(()=>{W(null)},[b]);const[re,U]=w.useState(!0),[X,V]=w.useState(null),[J,Z]=w.useState(new Set),[n,W]=w.useState(null),[I,we]=w.useState([]);w.useEffect(()=>{b==="monitor"&&n&&I.length>0&&(I.some(i=>i.id===n.id||i.pid===n.pid&&i.query===n.query)||W(null))},[b,I,n]);const[H,oe]=w.useState([]),[Q,me]=w.useState({}),[D,P]=w.useState([]),[z,G]=w.useState({}),[E,$e]=w.useState({timestamp:[],cpuUsage:[],memoryPercentage:[],network:[],throughput:[],dbConnections:[],dbQueriesPerSecond:[],dbQueryEfficiency:[]});w.useState({cpu:!0,memory:!0,network:!0,throughput:!0,dbConnections:!0,dbQueriesPerSecond:!0,dbQueryEfficiency:!0});const[F,De]=w.useState({}),[M,Te]=w.useState(""),[O,Re]=w.useState(""),[se,Be]=w.useState(""),[ne,Ee]=w.useState(""),[ie,Fe]=w.useState(""),[ge,_e]=w.useState(""),[Pe,ye]=w.useState(!1),[Oe,Le]=w.useState(new Set),Ue=w.useRef(new Set),A=w.useRef(!0);w.useEffect(()=>{if(b!=="live"||!A.current)return;const o=H.filter(p=>{const v=!M||M==="N/A"&&!p.pk_strategy||p.pk_strategy===M,S=!O||p.status===O;return v&&S}),i=new Set(o.map(p=>Ce(p))),l=Ue.current;if(l.size===0&&i.size>0){i.forEach(p=>l.add(p));return}const s=new Set;if(i.forEach(p=>{l.has(p)||(l.add(p),s.add(p))}),s.size===0)return;Le(p=>new Set([...p,...s]));const x=setTimeout(()=>{Le(p=>{const v=new Set(p);return s.forEach(S=>v.delete(S)),v})},400);return()=>clearTimeout(x)},[H,b,M,O]);const Ne=w.useCallback(o=>{if(!o)return{schema:"N/A",table:"N/A"};const i=o.match(/(?:FROM|JOIN|INTO|UPDATE)\s+(?:(\w+)\.)?(\w+)/i);return i?{schema:i[1]||"public",table:i[2]||"N/A"}:{schema:"N/A",table:"N/A"}},[]),de=w.useCallback(async()=>{if(A.current)try{const[o,i,l]=await Promise.all([ue.getActiveQueries(),ue.getProcessingLogs(1,100),ue.getProcessingStats()]);if(A.current){const s=(o||[]).map(x=>{const{schema:p,table:v}=Ne(x.query||"");return{...x,schema_name:x.schema_name||p,table_name:x.table_name||v}});we(s),oe(i.data||[]),me(l||{})}}catch(o){A.current&&V(ke(o))}},[Ne]),be=w.useCallback(async()=>{if(A.current)try{const[o,i]=await Promise.all([ue.getTransferMetrics({page:1,limit:100,days:7}),ue.getTransferMetricsStats({days:7})]);A.current&&(P(o.data||[]),G(i||{}))}catch(o){A.current&&V(ke(o))}},[]),je=w.useCallback(async()=>{var o,i,l,s,x,p,v;if(A.current)try{const S=await Se.getDashboardStats();if(A.current){De(S.dbHealth||{});const u=new Date,c=`${u.getHours().toString().padStart(2,"0")}:${u.getMinutes().toString().padStart(2,"0")}:${u.getSeconds().toString().padStart(2,"0")}`,m=((o=S.metricsCards)==null?void 0:o.currentIops)||0,k=((l=(i=S.metricsCards)==null?void 0:i.currentThroughput)==null?void 0:l.avgRps)||0,g=parseFloat(((s=S.dbHealth)==null?void 0:s.connectionPercentage)||"0")||0,_=(x=S.dbHealth)!=null&&x.totalQueries24h?S.dbHealth.totalQueries24h/(24*3600):0,N=parseFloat(((v=(p=S.dbHealth)==null?void 0:p.queryEfficiencyScore)==null?void 0:v.toString())||"0")||0;$e(d=>{var $,j;return{timestamp:[...d.timestamp,c].slice(-60),cpuUsage:[...d.cpuUsage,parseFloat((($=S.systemResources)==null?void 0:$.cpuUsage)||"0")||0].slice(-60),memoryPercentage:[...d.memoryPercentage,parseFloat(((j=S.systemResources)==null?void 0:j.memoryPercentage)||"0")||0].slice(-60),network:[...d.network,m].slice(-60),throughput:[...d.throughput,k].slice(-60),dbConnections:[...d.dbConnections,g].slice(-60),dbQueriesPerSecond:[...d.dbQueriesPerSecond,_].slice(-60),dbQueryEfficiency:[...d.dbQueryEfficiency,N].slice(-60)}})}}catch(S){A.current&&console.error("Error fetching system resources:",S)}},[]),ze=w.useCallback(async()=>{try{if(!A.current)return;const o=await Se.getSystemLogs(60),i=await Se.getDashboardStats();A.current&&o.length>0&&$e({timestamp:o.map(l=>l.timestamp),cpuUsage:o.map(l=>l.cpuUsage),memoryPercentage:o.map(l=>l.memoryPercentage),network:o.map(l=>l.network),throughput:o.map(l=>l.throughput),dbConnections:o.map(()=>{var l;return parseFloat(((l=i.dbHealth)==null?void 0:l.connectionPercentage)||"0")||0}),dbQueriesPerSecond:o.map(()=>{var l;return(l=i.dbHealth)!=null&&l.totalQueries24h?i.dbHealth.totalQueries24h/(24*3600):0}),dbQueryEfficiency:o.map(()=>{var l,s;return parseFloat(((s=(l=i.dbHealth)==null?void 0:l.queryEfficiencyScore)==null?void 0:s.toString())||"0")||0})})}catch(o){A.current&&console.error("Error fetching system logs history:",o)}},[]);w.useEffect(()=>{A.current=!0,U(!0),(async()=>{await de(),b==="system"&&await ze(),b==="transfer"&&await be(),A.current&&U(!1)})();const i=setInterval(()=>{A.current&&(de(),b==="system"&&je(),b==="transfer"&&be())},5e3),l=b==="system"?setInterval(je,1e4):null;return()=>{A.current=!1,clearInterval(i),l&&clearInterval(l)}},[de,je,ze,be,b]);const Ae=w.useMemo(()=>{if(b==="monitor"){const o=new Map;return I.forEach(i=>{const l=i.datname||"Unknown";o.has(l)||o.set(l,[]),o.get(l).push(i)}),o}else if(b==="live"){const o=new Map;return H.filter(l=>{const s=!M||M==="N/A"&&!l.pk_strategy||l.pk_strategy===M,x=!O||l.status===O;return s&&x}).forEach(l=>{const s=l.db_engine||"Unknown",x=l.schema_name||"public";o.has(s)||o.set(s,new Map);const p=o.get(s);p.has(x)||p.set(x,[]),p.get(x).push(l)}),o}else if(b==="transfer"){const o=new Map,i=(ge||"").trim().toLowerCase();return D.filter(s=>{const x=!se||s.status===se,p=!ne||s.transfer_type===ne,v=!ie||s.db_engine===ie,S=!i||[s.schema_name,s.table_name,s.db_engine].some(u=>(u||"").toLowerCase().includes(i));return x&&p&&v&&S}).forEach(s=>{const x=s.db_engine||"Unknown";o.has(x)||o.set(x,[]),o.get(x).push(s)}),o}return new Map},[b,I,H,D,M,O,se,ne,ie,ge]),He=w.useCallback(o=>{Z(i=>{const l=new Set(i);return l.has(o)?l.delete(o):l.add(o),l})},[]);w.useCallback(o=>{if(!o)return"N/A";const i=Number(o);return isNaN(i)?"N/A":i<1?`${(i*1e3).toFixed(2)}μs`:i<1e3?`${i.toFixed(2)}ms`:`${(i/1e3).toFixed(2)}s`},[]);const K=w.useCallback(o=>new Date(o).toLocaleString(),[]),Qe=w.useCallback(async o=>{if(confirm(`Are you sure you want to kill query with PID ${o}?`))try{const i=await fetch(`/api/monitor/queries/${o}/kill`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("authToken")}`}});if(!i.ok){const l=await i.json();throw new Error(l.error||l.details||"Failed to kill query")}alert(`Query with PID ${o} has been terminated.`),de()}catch(i){A.current&&V(ke(i))}},[de]),Ge=()=>{if(Ae.size===0)return e.jsxs("div",{style:{padding:40,textAlign:"center",color:t.muted,fontSize:12},children:[h.dot," No data available for ",b]});const o=l=>{const s=(l||"").toUpperCase();return s.includes("ERROR")||s.includes("FAILED")||s==="POOR"?t.foreground:s.includes("WARNING")||s==="FAIR"?t.muted:s.includes("SUCCESS")||s==="EXCELLENT"||s==="GOOD"?t.accent:t.muted};return Array.from(Ae.entries()).map(([l,s])=>{const x=`db-${l}`,p=J.has(x);let v;if(b==="live"){const u=s;v=Array.from(u.values()).flat()}else v=s;const S=v.length;return e.jsxs("div",{style:{marginBottom:4},children:[e.jsxs("div",{"data-first-level":"true",onClick:()=>He(x),onMouseEnter:u=>{const c=u.currentTarget.closest(".tree-view-container");c&&c.classList.add("showing-scrollbar"),u.currentTarget.style.backgroundColor=t.backgroundSoft,u.currentTarget.style.transform="translateX(2px)"},onMouseLeave:u=>{const c=u.currentTarget.closest(".tree-view-container");if(c){const m=u.relatedTarget;if(m&&m instanceof Node&&c.contains(m))return;c.classList.remove("showing-scrollbar")}p||(u.currentTarget.style.backgroundColor=t.background),u.currentTarget.style.transform="translateX(0)"},style:{display:"flex",alignItems:"center",padding:"10px 8px",cursor:"pointer",borderLeft:`2px solid ${t.accent}`,backgroundColor:p?t.backgroundSoft:t.background,transition:"all 0.2s ease",marginBottom:2},children:[e.jsx("span",{style:{marginRight:8,color:p?t.accent:t.muted,fontSize:10,transition:"transform 0.2s ease",display:"inline-block",transform:p?"rotate(90deg)":"rotate(0deg)"},children:h.arrowRight}),e.jsx("span",{style:{fontWeight:600,color:t.accent,fontSize:12,flex:1},children:l}),e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${t.border}`,backgroundColor:t.backgroundSoft,color:t.foreground},children:S})]}),p&&e.jsx("div",{style:{paddingLeft:24,transition:"all 0.15s ease"},children:v.map((u,c)=>{var j;const m=n===u,k=c===v.length-1,g=b==="live"?Ce(u):`item-${c}`,_=b==="live"&&Oe.has(Ce(u)),N={display:"flex",alignItems:"flex-start",padding:"8px 8px",marginLeft:8,marginBottom:2,cursor:"pointer",borderLeft:`2px solid ${m?t.accent:t.border}`,backgroundColor:m?t.backgroundSoft:"transparent",transition:"all 0.2s ease",gap:8},d=e.jsxs(e.Fragment,{children:[e.jsx("span",{style:{color:t.muted,fontSize:10,lineHeight:"1.5",paddingTop:"2px",flexShrink:0,width:"12px",fontFamily:"Consolas"},children:k?h.bl:h.tRight}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[b==="monitor"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{fontWeight:500,color:t.foreground,fontSize:11},children:["PID: ",u.pid]}),e.jsxs("div",{style:{fontSize:10,color:t.muted,marginTop:4},children:["Schema: ",u.schema_name||"N/A"," ",h.v," Table: ",u.table_name||"N/A"]}),e.jsxs("div",{style:{fontSize:10,color:t.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:4,fontFamily:"Consolas"},children:[(j=u.query)==null?void 0:j.substring(0,60),"..."]})]}),b==="live"&&e.jsxs(e.Fragment,{children:[e.jsx("div",{style:{fontWeight:500,color:t.foreground,fontSize:11},children:u.table_name||"N/A"}),e.jsxs("div",{style:{fontSize:10,color:t.muted,marginTop:4,fontFamily:"Consolas"},children:[u.db_engine," ",h.v," ",K(u.processed_at)]})]}),b==="transfer"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{fontWeight:500,color:t.foreground,fontSize:11},children:[u.schema_name,".",u.table_name]}),e.jsxs("div",{style:{fontSize:10,color:t.muted,marginTop:4,fontFamily:"Consolas"},children:[u.db_engine," ",h.v," ",K(u.created_at)]})]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[b==="monitor"&&e.jsxs(e.Fragment,{children:[e.jsx("span",{style:{padding:"2px 6px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${o(u.state)}`,color:o(u.state),backgroundColor:"transparent"},children:u.state}),e.jsx("button",{onClick:C=>{C.stopPropagation(),Qe(u.pid)},style:{padding:"4px 8px",border:`1px solid ${t.border}`,backgroundColor:"transparent",color:t.foreground,cursor:"pointer",fontSize:10,borderRadius:2,transition:"all 0.15s ease"},onMouseEnter:C=>{C.currentTarget.style.border=`2px solid ${t.foreground}`,C.currentTarget.style.backgroundColor=t.backgroundSoft},onMouseLeave:C=>{C.currentTarget.style.border=`1px solid ${t.border}`,C.currentTarget.style.backgroundColor="transparent"},children:"Kill"})]}),b==="live"&&e.jsx("span",{style:{padding:"2px 6px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${o(u.status)}`,color:o(u.status),backgroundColor:"transparent"},children:u.status}),b==="transfer"&&e.jsx("span",{style:{padding:"2px 6px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${o(u.status||"PENDING")}`,color:o(u.status||"PENDING"),backgroundColor:"transparent"},children:u.status||"PENDING"})]})]}),T=C=>{const L=C.currentTarget.closest(".tree-view-container");L&&L.classList.remove("showing-scrollbar"),m||(C.currentTarget.style.backgroundColor=t.backgroundSoft,C.currentTarget.style.borderLeftColor=t.accent)},$=C=>{m||(C.currentTarget.style.backgroundColor="transparent",C.currentTarget.style.borderLeftColor=t.border)};return b==="live"?e.jsx(ot,{isEntering:_,style:N,onClick:()=>W(u),onMouseEnter:T,onMouseLeave:$,children:d},g):e.jsx("div",{onClick:()=>W(u),onMouseEnter:T,onMouseLeave:$,style:N,children:d},g)})})]},x)})},Me=()=>{if(b==="monitor"){const o=I.reduce((d,T)=>{const $=T.datname||"Unknown";return d[$]=(d[$]||0)+1,d},{}),i=I.reduce((d,T)=>{const $=T.state||"Unknown";return d[$]=(d[$]||0)+1,d},{}),l=I.reduce((d,T)=>{const $=T.wait_event_type||"None";return d[$]=(d[$]||0)+1,d},{}),s=Object.entries(l).sort(([,d],[,T])=>T-d).slice(0,10),x=d=>{if(d.duration_seconds!=null&&Number.isFinite(d.duration_seconds))return d.duration_seconds;const $=String(d.duration||"").match(/^(?:(\d+):)?(?:(\d+):)?(\d+)(?:\.(\d+))?$/);if($){const[,j,C,L,ae]=$;return parseInt(j||"0",10)*3600+parseInt(C||"0",10)*60+parseInt(L||"0",10)+(parseFloat(`0.${ae||"0"}`)||0)}return 0},p=[...I].map(d=>({...d,_sec:x(d)})).filter(d=>d._sec>0).sort((d,T)=>T._sec-d._sec).slice(0,10),v=80,S=160,u=16,c=4,m=Math.max(1,...p.map(d=>d._sec)),k=Math.max(1,...s.map(([,d])=>d)),g=Math.max(80,p.length*(u+c)-c+24),_=Math.max(80,s.length*(u+c)-c+24),N=d=>d<60?`${d}s`:d<3600?`${Math.floor(d/60)}m ${d%60}s`:`${Math.floor(d/3600)}h ${Math.floor(d%3600/60)}m`;return e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground,display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16},children:[e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[h.blockFull," QUERIES BY DATABASE"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:Object.entries(o).sort(([,d],[,T])=>T-d).slice(0,5).map(([d,T],$,j)=>{const C=$===j.length-1;return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontFamily:"Consolas",fontSize:11},children:[e.jsx("span",{style:{color:t.muted,width:20},children:C?h.cornerBl:h.v}),e.jsx("span",{style:{flex:1,color:t.foreground,overflow:"hidden",textOverflow:"ellipsis"},children:d}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:t.accent,minWidth:"30px",textAlign:"right"},children:T})]},d)})})]}),e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[h.blockFull," QUERIES BY STATE"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:Object.entries(i).sort(([,d],[,T])=>T-d).map(([d,T],$,j)=>{const C=$===j.length-1,L={active:t.accent,idle:t.muted,"idle in transaction":t.muted,"idle in transaction (aborted)":t.foreground,"fastpath function call":t.accent,disabled:t.muted};return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontFamily:"Consolas",fontSize:11},children:[e.jsx("span",{style:{color:t.muted,width:20},children:C?h.cornerBl:h.v}),e.jsx("span",{style:{flex:1,color:t.foreground,overflow:"hidden",textOverflow:"ellipsis"},children:d.toUpperCase()}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:L[d.toLowerCase()]||t.accent,minWidth:"30px",textAlign:"right"},children:T})]},d)})})]})]}),e.jsxs("div",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground,display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16},children:[e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[h.blockFull," TOP LONGEST RUNNING"]}),p.length===0?e.jsx("div",{style:{padding:24,textAlign:"center",color:t.muted,fontSize:11},children:"No active queries with duration"}):e.jsx("svg",{width:v+S+70,height:g,style:{display:"block",border:`1px solid ${t.border}`,borderRadius:2},children:p.map((d,T)=>{const $=16+T*(u+c),j=m>0?d._sec/m*S:0,C=(d.query||"").substring(0,18)||`PID ${d.pid}`,L=n===d;return e.jsxs("g",{onClick:()=>W(d),style:{cursor:"pointer"},children:[e.jsxs("text",{x:4,y:$+u-4,fontSize:9,fill:t.muted,children:[C,C.length>=18?"…":""]}),e.jsx("rect",{x:v,y:$,width:S,height:u-2,fill:t.backgroundSoft,stroke:t.border,rx:2}),e.jsx("rect",{x:v,y:$,width:j,height:u-2,fill:t.accent,rx:2,opacity:.85,stroke:L?t.foreground:"none",strokeWidth:L?2:0}),e.jsx("text",{x:v+S+6,y:$+u-4,fontSize:9,fill:t.foreground,children:N(d._sec)})]},d.pid)})})]}),e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[h.blockFull," WAIT EVENTS"]}),s.length===0?e.jsx("div",{style:{padding:24,textAlign:"center",color:t.muted,fontSize:11},children:"No wait event data"}):e.jsx("svg",{width:v+S+48,height:_,style:{display:"block",border:`1px solid ${t.border}`,borderRadius:2},children:s.map(([d,T],$)=>{const j=16+$*(u+c),C=k>0?T/k*S:0,L=d.length>12?d.slice(0,12)+"…":d;return e.jsxs("g",{children:[e.jsx("text",{x:4,y:j+u-4,fontSize:10,fill:t.foreground,children:L}),e.jsx("rect",{x:v,y:j,width:S,height:u-2,fill:t.backgroundSoft,stroke:t.border,rx:2}),e.jsx("rect",{x:v,y:j,width:C,height:u-2,fill:t.accent,rx:2,opacity:.85}),e.jsx("text",{x:v+S+6,y:j+u-4,fontSize:10,fill:t.foreground,children:T})]},d)})})]})]})]})}if(b==="live"){const o=H.filter(f=>{const R=!M||M==="N/A"&&!f.pk_strategy||f.pk_strategy===M,B=!O||f.status===O;return R&&B}),i=o.reduce((f,R)=>{const B=R.pk_strategy||"Unknown";return f[B]=(f[B]||0)+1,f},{}),l=o.reduce((f,R)=>{const B=R.status||"Unknown";return f[B]=(f[B]||0)+1,f},{}),s=o.reduce((f,R)=>{const B=R.db_engine||"N/A";return f[B]=(f[B]||0)+1,f},{}),x=Object.entries(s).sort(([,f],[,R])=>R-f).slice(0,10),p=Date.now(),v=15*60*1e3,S=2*60*60*1e3,u=new Map;o.forEach(f=>{const R=f.processed_at?new Date(f.processed_at).getTime():0;if(!R||isNaN(R)||p-R>S)return;const B=Math.floor(R/v)*v;u.set(B,(u.get(B)||0)+1)});const c=Array.from(u.entries()).map(([f,R])=>({ts:f,volume:R})).sort((f,R)=>f.ts-R.ts),m=480,k=180,g={top:16,right:20,bottom:28,left:36},_=m-g.left-g.right,N=k-g.top-g.bottom,d=c.length>0?Math.min(...c.map(f=>f.ts)):p-S,T=c.length>0?Math.max(...c.map(f=>f.ts)):p,$=Math.max(1,T-d),j=Math.max(1,...c.map(f=>f.volume)),C=f=>g.left+(f-d)/$*_,L=f=>g.top+N-f/j*N,ae=g.top+N,pe=c.map(f=>`${C(f.ts)},${L(f.volume)}`).join(" "),qe=`${g.left},${ae} ${pe} ${g.left+_},${ae}`,Xe=f=>new Date(f).toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit"}),he=72,fe=140,le=16,ve=4,We=Math.max(1,...x.map(([,f])=>f)),Je=Math.max(80,x.length*(le+ve)-ve+24);return e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground,display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16},children:[e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[h.blockFull," EVENTS BY TYPE"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:Object.entries(i).sort(([,f],[,R])=>R-f).slice(0,5).map(([f,R],B,Y)=>{const ce=B===Y.length-1;return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontFamily:"Consolas",fontSize:11},children:[e.jsx("span",{style:{color:t.muted,width:20},children:ce?h.cornerBl:h.v}),e.jsx("span",{style:{flex:1,color:t.foreground,overflow:"hidden",textOverflow:"ellipsis"},children:f==="Unknown"?"N/A":f}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:t.accent,minWidth:"30px",textAlign:"right"},children:R})]},f)})})]}),e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[h.blockFull," EVENTS BY STATUS"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:Object.entries(l).sort(([,f],[,R])=>R-f).map(([f,R],B,Y)=>{const ce=B===Y.length-1,Ze={SUCCESS:t.accent,ERROR:t.foreground,PENDING:t.muted,IN_PROGRESS:t.accent,LISTENING_CHANGES:t.accent};return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontFamily:"Consolas",fontSize:11},children:[e.jsx("span",{style:{color:t.muted,width:20},children:ce?h.cornerBl:h.v}),e.jsx("span",{style:{flex:1,color:t.foreground,overflow:"hidden",textOverflow:"ellipsis"},children:f}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:Ze[f]||t.accent,minWidth:"30px",textAlign:"right"},children:R})]},f)})})]})]}),e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft,marginBottom:16},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[h.blockFull," EVENTOS EN EL TIEMPO (últimas 2h, buckets 15 min)"]}),c.length===0?e.jsx("div",{style:{padding:24,textAlign:"center",color:t.muted,fontSize:11},children:"No hay eventos con timestamp en las últimas 2 horas"}):e.jsxs("svg",{width:m,height:k,style:{display:"block",border:`1px solid ${t.border}`,borderRadius:2,backgroundColor:t.background},children:[e.jsx("line",{x1:g.left,y1:g.top,x2:g.left,y2:k-g.bottom,stroke:t.border,strokeWidth:1}),e.jsx("line",{x1:g.left,y1:k-g.bottom,x2:m-g.right,y2:k-g.bottom,stroke:t.border,strokeWidth:1}),e.jsx("polygon",{points:qe,fill:t.backgroundSoft,stroke:"none"}),e.jsx("polyline",{points:pe,fill:"none",stroke:t.accent,strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"}),c.map((f,R)=>{const B=c.length>8?Math.max(1,Math.floor(c.length/5)):1;return B>1&&R%B!==0&&R!==c.length-1?null:e.jsx("text",{x:C(f.ts),y:k-g.bottom+14,textAnchor:"middle",fontSize:9,fill:t.muted,children:Xe(f.ts)},f.ts)}),[0,.25,.5,.75,1].map((f,R)=>{const B=g.top+N*(1-f),Y=Math.round(j*f);return e.jsxs("g",{children:[e.jsx("line",{x1:g.left,y1:B,x2:m-g.right,y2:B,stroke:t.border,strokeWidth:1,strokeDasharray:"2 2",opacity:.6}),R>0&&e.jsx("text",{x:g.left-4,y:B+3,textAnchor:"end",fontSize:9,fill:t.muted,children:Y})]},R)})]})]}),e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft,marginBottom:16},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[h.blockFull," EVENTOS POR MOTOR"]}),x.length===0?e.jsx("div",{style:{padding:24,textAlign:"center",color:t.muted,fontSize:11},children:"No hay datos por motor"}):e.jsx("svg",{width:he+fe+48,height:Je,style:{display:"block",border:`1px solid ${t.border}`,borderRadius:2},children:x.map(([f,R],B)=>{const Y=16+B*(le+ve),ce=We>0?R/We*fe:0;return e.jsxs("g",{children:[e.jsx("text",{x:4,y:Y+le-4,fontSize:10,fill:t.foreground,style:{overflow:"hidden",textOverflow:"ellipsis"},children:f.length>10?f.slice(0,10)+"…":f}),e.jsx("rect",{x:he,y:Y,width:fe,height:le-2,fill:t.backgroundSoft,stroke:t.border,rx:2}),e.jsx("rect",{x:he,y:Y,width:ce,height:le-2,fill:t.accent,rx:2,opacity:.85}),e.jsx("text",{x:he+fe+6,y:Y+le-4,fontSize:10,fill:t.foreground,children:R})]},f)})})]})]})}if(b==="transfer"){const o=(ge||"").trim().toLowerCase(),i=D.filter(c=>{const m=!se||c.status===se,k=!ne||c.transfer_type===ne,g=!ie||c.db_engine===ie,_=!o||[c.schema_name,c.table_name,c.db_engine].some(N=>(N||"").toLowerCase().includes(o));return m&&k&&g&&_}),l=i.reduce((c,m)=>{const k=m.status||"PENDING";return c[k]=(c[k]||0)+1,c},{}),s=i.reduce((c,m)=>{const k=m.transfer_type||"UNKNOWN";return c[k]=(c[k]||0)+1,c},{}),x=i.reduce((c,m)=>{const k=m.db_engine||"Unknown";return c[k]=(c[k]||0)+1,c},{}),p=i.reduce((c,m)=>c+(parseInt(m.records_transferred)||0),0),v=i.reduce((c,m)=>c+(parseInt(m.bytes_transferred)||0),0),S=i.length>0?i.reduce((c,m)=>c+(parseFloat(m.memory_used_mb)||0),0)/i.length:0,u=i.length>0?i.reduce((c,m)=>c+(parseInt(m.io_operations_per_second)||0),0)/i.length:0;return e.jsxs("div",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground,display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16},children:[e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[h.blockFull," TRANSFERS BY STATUS"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:Object.entries(l).sort(([,c],[,m])=>m-c).map(([c,m],k,g)=>{const _=k===g.length-1,N={SUCCESS:t.accent,FAILED:t.foreground,PENDING:t.muted};return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontFamily:"Consolas",fontSize:11},children:[e.jsx("span",{style:{color:t.muted,width:20},children:_?h.cornerBl:h.v}),e.jsx("span",{style:{flex:1,color:t.foreground,overflow:"hidden",textOverflow:"ellipsis"},children:c}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:N[c]||t.accent,minWidth:"30px",textAlign:"right"},children:m})]},c)})})]}),e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[h.blockFull," TRANSFERS BY TYPE"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:Object.entries(s).sort(([,c],[,m])=>m-c).map(([c,m],k,g)=>{const _=k===g.length-1;return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontFamily:"Consolas",fontSize:11},children:[e.jsx("span",{style:{color:t.muted,width:20},children:_?h.cornerBl:h.v}),e.jsx("span",{style:{flex:1,color:t.foreground,overflow:"hidden",textOverflow:"ellipsis"},children:c}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:t.accent,minWidth:"30px",textAlign:"right"},children:m})]},c)})})]}),e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[h.blockFull," TRANSFERS BY ENGINE"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:Object.entries(x).sort(([,c],[,m])=>m-c).slice(0,5).map(([c,m],k,g)=>{const _=k===g.length-1;return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontFamily:"Consolas",fontSize:11},children:[e.jsx("span",{style:{color:t.muted,width:20},children:_?h.cornerBl:h.v}),e.jsx("span",{style:{flex:1,color:t.foreground,overflow:"hidden",textOverflow:"ellipsis"},children:c}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:t.accent,minWidth:"30px",textAlign:"right"},children:m})]},c)})})]}),e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[h.blockFull," SUMMARY STATISTICS"]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0"},children:[e.jsxs("span",{style:{color:t.muted,fontSize:11},children:[h.v," Total Records"]}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:t.accent,fontFamily:"Consolas"},children:p.toLocaleString()})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0"},children:[e.jsxs("span",{style:{color:t.muted,fontSize:11},children:[h.v," Total Bytes"]}),e.jsxs("span",{style:{fontSize:11,fontWeight:600,color:t.accent,fontFamily:"Consolas"},children:[(v/(1024*1024*1024)).toFixed(2)," GB"]})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0"},children:[e.jsxs("span",{style:{color:t.muted,fontSize:11},children:[h.v," Avg Memory"]}),e.jsxs("span",{style:{fontSize:11,fontWeight:600,color:t.accent,fontFamily:"Consolas"},children:[S.toFixed(2)," MB"]})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0"},children:[e.jsxs("span",{style:{color:t.muted,fontSize:11},children:[h.cornerBl," Avg IOPS"]}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:t.accent,fontFamily:"Consolas"},children:u.toFixed(0)})]})]})]})]})}return null},Ie=()=>{if(b==="live"){if(n){const o=i=>{const l=(i||"").toUpperCase();return l==="SUCCESS"?t.accent:l==="ERROR"||l==="FAILED"?t.foreground:l==="PENDING"||l==="IN_PROGRESS"?t.muted:t.muted};return e.jsx("div",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground},children:e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft,marginBottom:12},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:16,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[h.blockFull," LIVE CHANGE DETAILS"]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8,fontFamily:"Consolas",fontSize:11,lineHeight:1.8},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Database:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.db_engine||"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Schema:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.schema_name||"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Table:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.table_name||"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Status:"}),e.jsx("span",{style:{marginLeft:20,padding:"2px 8px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${o(n.status||"PENDING")}`,color:o(n.status||"PENDING"),backgroundColor:"transparent"},children:n.status||"PENDING"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Strategy:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.pk_strategy||"N/A"})]}),n.new_pk&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Last PK:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.new_pk})]}),n.record_count!==null&&n.record_count!==void 0&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Records:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.record_count.toLocaleString()})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"└─ Processed At:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:K(n.processed_at)})]})]})]})})}return e.jsx(e.Fragment,{children:Me()})}if(b==="transfer")return n?e.jsx("div",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground},children:e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft,marginBottom:12},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:16,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[h.blockFull," TRANSFER METRICS DETAILS"]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8,fontFamily:"Consolas",fontSize:11,lineHeight:1.8},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Schema:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.schema_name||"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Table:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.table_name||"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Records Transferred:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:(n.records_transferred||0).toLocaleString()})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Bytes Transferred:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.bytes_transferred?`${(n.bytes_transferred/(1024*1024*1024)).toFixed(2)} GB`:"0 GB"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Memory Used:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.memory_used_mb?`${parseFloat(n.memory_used_mb).toFixed(2)} MB`:"0 MB"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ IO Operations/sec:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.io_operations_per_second||0})]}),n.duration_seconds&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Duration:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.duration_seconds>=3600?`${Math.floor(n.duration_seconds/3600)}h ${Math.floor(n.duration_seconds%3600/60)}m ${n.duration_seconds%60}s`:n.duration_seconds>=60?`${Math.floor(n.duration_seconds/60)}m ${n.duration_seconds%60}s`:`${n.duration_seconds}s`})]}),n.transfer_rate&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Transfer Rate:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.transfer_rate>=1024*1024?`${(n.transfer_rate/(1024*1024)).toFixed(2)} MB/s`:n.transfer_rate>=1024?`${(n.transfer_rate/1024).toFixed(2)} KB/s`:`${n.transfer_rate.toFixed(2)} B/s`})]}),n.throughput_rps&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Throughput (RPS):"}),e.jsxs("span",{style:{fontWeight:500,marginLeft:20},children:[n.throughput_rps.toLocaleString()," records/sec"]})]}),n.progress_percentage!==null&&n.progress_percentage!==void 0&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Progress:"}),e.jsxs("span",{style:{fontWeight:500,marginLeft:20},children:[Number(n.progress_percentage).toFixed(1),"%"]})]}),n.retry_count!==null&&n.retry_count!==void 0&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Retry Count:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.retry_count})]}),n.source_connection&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Source Connection:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20,fontSize:10,maxWidth:"60%",textAlign:"right",wordBreak:"break-word"},children:n.source_connection.length>50?`${n.source_connection.substring(0,50)}...`:n.source_connection})]}),n.target_connection&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Target Connection:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20,fontSize:10,maxWidth:"60%",textAlign:"right",wordBreak:"break-word"},children:n.target_connection.length>50?`${n.target_connection.substring(0,50)}...`:n.target_connection})]}),n.server_name&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Server Name:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.server_name})]}),n.database_name&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Database Name:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.database_name})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Started At:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.started_at?K(n.started_at):"N/A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Completed At:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.completed_at?K(n.completed_at):"N/A"})]}),n.updated_at&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Updated At:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:K(n.updated_at)})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsxs("span",{style:{color:t.muted},children:[n.error_message?"├─":"└─"," Created At:"]}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.created_at?K(n.created_at):"N/A"})]}),n.error_message&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"└─ Error Message:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20,color:t.foreground,maxWidth:"60%",textAlign:"right",wordBreak:"break-word"},children:n.error_message})]}),(()=>{const o=D||[],i=Math.max(...o.map(g=>Number(g.records_transferred)||0),1),l=Math.max(...o.map(g=>Number(g.bytes_transferred)||0),1),s=Math.max(...o.map(g=>Number(g.memory_used_mb)||0),1),x=Math.max(...o.map(g=>Number(g.io_operations_per_second)||0),1),p=Math.max(...o.map(g=>Number(g.transfer_rate)||Number(g.throughput_rps)||0),1),v=Number(n.records_transferred)||0,S=Number(n.bytes_transferred)||0,u=Number(n.memory_used_mb)||0,c=Number(n.io_operations_per_second)||0,m=Number(n.transfer_rate)||Number(n.throughput_rps)||0,k=(g,_,N,d)=>{const T=N>0?_/N*100:0;return e.jsxs("div",{style:{marginBottom:6},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:2},children:[e.jsx("span",{style:{color:t.muted,fontSize:10},children:g}),e.jsx("span",{style:{fontWeight:500,fontSize:10},children:d(_)})]}),e.jsx("div",{style:{height:4,backgroundColor:t.background,borderRadius:1,overflow:"hidden",border:`1px solid ${t.border}`},children:e.jsx("div",{style:{width:`${T}%`,height:"100%",backgroundColor:t.accent,borderRadius:1,transition:"width 0.3s ease"}})})]},g)};return e.jsx(e.Fragment,{children:e.jsxs("div",{style:{marginTop:12,paddingTop:12,borderTop:`1px solid ${t.border}`},children:[e.jsx("div",{style:{fontSize:10,color:t.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:8},children:"Metrics vs dataset"}),k("Records",v,i,g=>g.toLocaleString()),k("Bytes",S,l,g=>g>=1024*1024*1024?`${(g/(1024*1024*1024)).toFixed(2)} GB`:g>=1024*1024?`${(g/(1024*1024)).toFixed(1)} MB`:`${g} B`),k("Memory (MB)",u,s,g=>`${g.toFixed(1)}`),k("IOPS",c,x,g=>String(g)),k("Throughput",m,p,g=>g>=1024*1024?`${(g/(1024*1024)).toFixed(2)} MB/s`:g>=1024?`${(g/1024).toFixed(2)} KB/s`:`${g.toFixed(0)} B/s`)]})})})()]})]})}):e.jsxs("div",{style:{padding:60,textAlign:"center",color:t.muted,fontFamily:"Consolas",fontSize:12},children:[h.dot," Select an item to view details"]});if(!n)return e.jsxs(e.Fragment,{children:[Me(),e.jsxs("div",{style:{padding:60,textAlign:"center",color:t.muted,fontFamily:"Consolas",fontSize:12},children:[h.dot," Select an item to view details"]})]});if(b==="monitor"){const o=i=>{const l=(i||"").toUpperCase();return l.includes("ERROR")||l.includes("ABORTED")?t.foreground:l.includes("IDLE IN TRANSACTION")?t.muted:l==="ACTIVE"?t.accent:t.muted};return e.jsx("div",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground},children:e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8,fontFamily:"Consolas",fontSize:11,lineHeight:1.8},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ PID:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.pid})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ User:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.usename})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Database:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.datname})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ State:"}),e.jsx("span",{style:{marginLeft:20,padding:"2px 8px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${o(n.state)}`,color:o(n.state),backgroundColor:"transparent"},children:n.state})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Duration:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.duration})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Application:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.application_name||"-"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Client Address:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.client_addr||"-"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"├─ Started At:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:K(n.query_start)})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:t.muted},children:"└─ Wait Event:"}),e.jsx("span",{style:{fontWeight:500,marginLeft:20},children:n.wait_event_type?`${n.wait_event_type} (${n.wait_event})`:"None"})]})]})})}},Ye=()=>{const i=[...H.filter(s=>{const x=!M||M==="N/A"&&!s.pk_strategy||s.pk_strategy===M,p=!O||s.status===O;return x&&p})].sort((s,x)=>new Date(x.processed_at||0).getTime()-new Date(s.processed_at||0).getTime()).slice(0,20),l=s=>{const x=(s||"").toUpperCase();return x==="SUCCESS"?t.accent:x==="ERROR"||x==="FAILED"?t.foreground:x==="PENDING"||x==="IN_PROGRESS"?t.muted:t.muted};return i.length===0?e.jsxs("div",{style:{padding:40,textAlign:"center",color:t.muted,fontFamily:"Consolas",fontSize:12},children:[h.dot," No recent events available"]}):e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:12},children:i.map((s,x)=>e.jsxs("div",{onClick:()=>W(s),style:{border:`1px solid ${t.border}`,borderRadius:2,padding:12,backgroundColor:t.backgroundSoft,cursor:"pointer",transition:"all 0.2s ease",fontFamily:"Consolas",fontSize:11},onMouseEnter:p=>{p.currentTarget.style.borderColor=t.accent,p.currentTarget.style.backgroundColor=t.background},onMouseLeave:p=>{p.currentTarget.style.borderColor=t.border,p.currentTarget.style.backgroundColor=t.backgroundSoft},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8},children:[e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${l(s.status)}`,color:l(s.status),backgroundColor:"transparent"},children:s.status}),e.jsx("span",{style:{fontSize:10,color:t.muted,fontFamily:"Consolas"},children:K(s.processed_at)})]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:4,fontSize:11,color:t.foreground},children:[e.jsxs("div",{children:[e.jsx("span",{style:{color:t.muted},children:h.v}),e.jsxs("span",{style:{fontWeight:600,marginLeft:8},children:[s.schema_name||"N/A",".",s.table_name||"N/A"]}),e.jsxs("span",{style:{color:t.muted,marginLeft:8},children:["[",s.db_engine||"N/A","]"]})]}),e.jsxs("div",{style:{paddingLeft:16,color:t.muted},children:[h.tRight," Strategy: ",s.pk_strategy||"N/A",s.record_count!=null&&e.jsxs("span",{style:{marginLeft:12},children:[h.v," Records: ",s.record_count.toLocaleString()]})]})]})]},x))})},Ve=()=>{const o=(i,l,s,x,p,v,S,u=1)=>{const c=x.length>0?x[x.length-1]:0,m=l||c,k=x.length>1,g=k?Math.min(...x):0,_=k?Math.max(...x):0,N=S||(_>0?_:100),d=N>0?m/N*100:0,T=Math.min(100,Math.max(0,d));return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8,padding:"12px",backgroundColor:t.background,borderRadius:2,border:`1px solid ${t.border}`,transition:"all 0.2s ease"},onMouseEnter:$=>{$.currentTarget.style.borderColor=p,$.currentTarget.style.backgroundColor=t.backgroundSoft},onMouseLeave:$=>{$.currentTarget.style.borderColor=t.border,$.currentTarget.style.backgroundColor=t.background},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4},children:[e.jsxs("div",{style:{fontSize:11,color:t.accent,fontWeight:500,display:"flex",alignItems:"center",gap:6,fontFamily:"Consolas"},children:[e.jsx("span",{children:v}),e.jsx("span",{children:i})]}),e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:p,fontFamily:"Consolas"},children:[m.toFixed(u),s]})]}),e.jsx("div",{style:{width:"100%",height:6,backgroundColor:t.backgroundSoft,borderRadius:1,overflow:"hidden",border:`1px solid ${t.border}`},children:e.jsx("div",{style:{width:`${T}%`,height:"100%",backgroundColor:p,transition:"width 0.3s ease",borderRadius:1}})}),e.jsx(rt,{data:x,color:p,width:40,labels:E.timestamp}),k&&e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",fontSize:9,color:t.muted,marginTop:2,fontFamily:"Consolas"},children:[e.jsxs("span",{children:["Min: ",g.toFixed(u),s]}),e.jsxs("span",{children:["Max: ",_.toFixed(u),s]})]})]})};return e.jsxs("div",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground},children:[e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft,marginBottom:16},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:16,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[h.blockFull," SYSTEM RESOURCES"]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12},children:[o("CPU Usage",E.cpuUsage.length>0?E.cpuUsage[E.cpuUsage.length-1]:0,"%",E.cpuUsage,t.accent,h.blockFull,100),o("Memory",E.memoryPercentage.length>0?E.memoryPercentage[E.memoryPercentage.length-1]:0,"%",E.memoryPercentage,t.accent,h.blockSemi,100),o("Network",E.network.length>0?E.network[E.network.length-1]:0," IOPS",E.network,t.accent,h.blockLight),o("Throughput",E.throughput.length>0?E.throughput[E.throughput.length-1]:0," RPS",E.throughput,t.accent,h.dot,void 0,2)]})]}),e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft,marginBottom:16},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:16,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[h.blockFull," DATABASE METRICS"]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12},children:[o("DB Connections",E.dbConnections.length>0?E.dbConnections[E.dbConnections.length-1]:0,"%",E.dbConnections,t.accent,h.blockFull,100),o("Queries/sec",E.dbQueriesPerSecond.length>0?E.dbQueriesPerSecond[E.dbQueriesPerSecond.length-1]:0,"",E.dbQueriesPerSecond,t.accent,h.blockSemi,void 0,3)]})]}),e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:16,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[h.blockFull," DATABASE HEALTH"]}),e.jsx("div",{style:{fontFamily:"Consolas",fontSize:11,color:t.foreground},children:(()=>{const i=parseFloat(String(F.connectionPercentage||0))||0,l=parseFloat(String(F.bufferHitRate||0))||0,s=parseFloat(String(F.cacheHitRate||0))||0,x=typeof F.queryEfficiencyScore=="number"?F.queryEfficiencyScore:parseFloat(String(F.queryEfficiencyScore||0))||0,p=(S,u,c=100)=>{const m=Math.min(c,Math.max(0,u)),k=c>0?m/c*100:0;return e.jsxs("div",{style:{marginBottom:10},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4},children:[e.jsx("span",{style:{color:t.muted},children:S}),e.jsxs("span",{style:{fontWeight:600,color:t.foreground},children:[m.toFixed(1),"%"]})]}),e.jsx("div",{style:{height:6,backgroundColor:t.backgroundSoft,borderRadius:1,overflow:"hidden",border:`1px solid ${t.border}`},children:e.jsx("div",{style:{width:`${k}%`,height:"100%",backgroundColor:t.accent,borderRadius:1,transition:"width 0.3s ease"}})})]})},v=(S,u)=>e.jsxs("div",{style:{padding:"8px 10px",backgroundColor:t.background,border:`1px solid ${t.border}`,borderRadius:2},children:[e.jsx("div",{style:{fontSize:9,color:t.muted,marginBottom:2},children:S}),e.jsx("div",{style:{fontSize:12,fontWeight:600,color:t.foreground},children:u})]});return e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{display:"flex",gap:12,alignItems:"center",marginBottom:16,flexWrap:"wrap"},children:[e.jsx("span",{style:{padding:"4px 10px",borderRadius:2,fontSize:11,fontWeight:600,border:`1px solid ${F.status==="Healthy"?t.accent:t.muted}`,color:F.status==="Healthy"?t.accent:t.muted,backgroundColor:"transparent"},children:F.status||"Unknown"}),e.jsx("span",{style:{color:t.muted},children:"Uptime:"}),e.jsx("span",{style:{fontWeight:600},children:F.uptimeSeconds?`${Math.floor(F.uptimeSeconds/86400)}d ${Math.floor(F.uptimeSeconds%86400/3600)}h ${Math.floor(F.uptimeSeconds%3600/60)}m`:"N/A"})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16},children:[p("Connection usage",i),p("Buffer hit rate",l),p("Cache hit rate",s),p("Query efficiency",x)]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(100px, 1fr))",gap:8},children:[v("Connections",F.activeConnections||"0/0"),v("Response",F.responseTime||"< 1ms"),v("Active",String(F.activeQueries??0)),v("Waiting",String(F.waitingQueries??0)),v("Avg duration",F.avgQueryDuration!=null&&typeof F.avgQueryDuration=="number"?`${F.avgQueryDuration.toFixed(2)}s`:"N/A"),v("Long run",String(F.longRunningQueries??0)),v("Blocking",String(F.blockingQueries??0)),v("Queries 24h",String(F.totalQueries24h??0)),v("DB size",F.databaseSizeBytes?`${(F.databaseSizeBytes/(1024*1024*1024)).toFixed(2)} GB`:"N/A")]})]})})()})]})]})},Ke=()=>{const o=(i,l)=>e.jsxs("div",{style:{border:`1px solid ${t.border}`,borderRadius:2,padding:"12px 16px",backgroundColor:t.backgroundSoft,transition:"all 0.2s ease",fontFamily:"Consolas"},onMouseEnter:s=>{s.currentTarget.style.transform="translateY(-2px)",s.currentTarget.style.boxShadow="0 4px 12px rgba(0, 0, 0, 0.1)",s.currentTarget.style.borderColor=t.accent,s.currentTarget.style.backgroundColor=t.background},onMouseLeave:s=>{s.currentTarget.style.transform="translateY(0)",s.currentTarget.style.boxShadow="none",s.currentTarget.style.borderColor=t.border,s.currentTarget.style.backgroundColor=t.backgroundSoft},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:8},children:[e.jsx("span",{style:{color:t.accent,fontSize:12},children:h.blockFull}),e.jsx("div",{style:{fontSize:"1.6em",fontWeight:600,color:t.accent,fontFamily:"Consolas"},children:i})]}),e.jsxs("div",{style:{fontSize:10,color:t.muted,textTransform:"uppercase",letterSpacing:.5,fontWeight:500,borderTop:`1px solid ${t.border}`,paddingTop:8,marginTop:8},children:[h.v," ",l]})]});if(b==="monitor")return e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:16,marginBottom:20,transition:"opacity 0.15s ease"},children:[o(I.length,"Active Queries"),o(Q.total||0,"Total Events"),o(Q.listeningChanges||0,"Listening"),o(Q.errors||0,"Errors")]});if(b==="live")return e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:16,marginBottom:20,transition:"opacity 0.15s ease"},children:[o(Q.total||0,"Total Events"),o(Q.last24h||0,"Last 24h"),o(Q.listeningChanges||0,"Listening"),o(Q.fullLoad||0,"Full Load"),o(Q.errors||0,"Errors")]});if(b==="transfer"){const i=z.total_transfers||0,l=z.successful||0,s=z.failed||0,x=z.pending||0,p=z.full_load_count||0,v=z.sync_count||0,S=z.incremental_count||0,u=(()=>{const j=new Map;return(D||[]).forEach(C=>{const L=C.db_engine||"N/A";j.set(L,(j.get(L)||0)+1)}),Array.from(j.entries()).map(([C,L])=>({engine:C,count:L})).sort((C,L)=>L.count-C.count)})(),c=(D||[]).reduce((j,C)=>j+(Number(C.records_transferred)||0),0),m=(D||[]).reduce((j,C)=>j+(Number(C.bytes_transferred)||0),0),k=Number(z.total_records)||c,g=Number(z.total_bytes)||m,_=j=>j===0||!Number.isFinite(j)?"0":j>=1e6?`${(j/1e6).toFixed(1)}M`:j>=1e3?`${(j/1e3).toFixed(1)}K`:j.toLocaleString(),N=j=>j===0||!Number.isFinite(j)?"0 B":j>=1024*1024*1024?`${(j/(1024*1024*1024)).toFixed(2)} GB`:j>=1024*1024?`${(j/(1024*1024)).toFixed(2)} MB`:j>=1024?`${(j/1024).toFixed(2)} KB`:`${j} B`,d=(j,C,L,ae,pe)=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontSize:11},children:[e.jsx("span",{style:{width:8,height:8,backgroundColor:j,flexShrink:0}}),e.jsx("span",{style:{flex:1,color:t.foreground},children:C}),e.jsxs("span",{style:{fontWeight:600,color:pe?t.accent:t.foreground},children:[L," (",ae.toFixed(1),"%)"]})]},C),T={border:`1px solid ${t.border}`,borderRadius:2,padding:16,backgroundColor:t.backgroundSoft,minWidth:0},$={fontSize:11,fontWeight:600,color:t.foreground,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",gap:8};return e.jsx(e.Fragment,{children:e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:20,marginBottom:20,border:`1px solid ${t.border}`,borderRadius:4,padding:20,backgroundColor:t.backgroundSoft},children:[e.jsxs("div",{style:T,children:[e.jsxs("div",{style:$,children:[e.jsx("span",{style:{width:8,height:8,backgroundColor:t.accent,flexShrink:0}}),"DISTRIBUTION BY STATUS"]}),i>0?e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:2},children:[d(t.accent,"Success",l,i?l/i*100:0,l>0),d(t.foreground,"Failed",s,i?s/i*100:0,s>0&&l===0),d(t.muted,"Pending",x,i?x/i*100:0,x>0&&l===0&&s===0)]}):e.jsx("span",{style:{color:t.muted,fontSize:11},children:"No transfers"})]}),e.jsxs("div",{style:T,children:[e.jsxs("div",{style:$,children:[e.jsx("span",{style:{width:8,height:8,backgroundColor:t.accent,flexShrink:0}}),"DISTRIBUTION BY TYPE"]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:2},children:[d(t.accent,"FULL_LOAD",p,i?p/i*100:0,p>0),d(t.foreground,"SYNC",v,i?v/i*100:0,v>0),d(t.muted,"INCREMENTAL",S,i?S/i*100:0,S>0&&v===0&&p===0)]})]}),e.jsxs("div",{style:T,children:[e.jsxs("div",{style:$,children:[e.jsx("span",{style:{width:8,height:8,backgroundColor:t.accent,flexShrink:0}}),"DISTRIBUTION BY ENGINE"]}),u.length?e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:2},children:u.slice(0,6).map(({engine:j,count:C},L)=>d(L===0?t.accent:t.foreground,j,C,i?C/i*100:0,L===0))}):e.jsx("span",{style:{color:t.muted,fontSize:11},children:"No data"})]}),e.jsxs("div",{style:T,children:[e.jsxs("div",{style:$,children:[e.jsx("span",{style:{width:8,height:8,backgroundColor:t.accent,flexShrink:0}}),"TOTALS"]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8,fontSize:11},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{color:t.muted},children:"| Total Records"}),e.jsx("span",{style:{fontWeight:600,color:t.accent},children:_(k)})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{color:t.muted},children:"| Total Bytes"}),e.jsx("span",{style:{fontWeight:600,color:t.accent},children:N(g)})]})]})]})]})})}return null};return re&&I.length===0&&H.length===0?e.jsx(tt,{variant:"table"}):e.jsxs("div",{style:{padding:"20px",fontFamily:"Consolas",fontSize:12},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"},children:[e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:t.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:t.accent,marginRight:8},children:h.blockFull}),"MONITOR"]}),e.jsx(xe,{label:"Monitor Info",onClick:()=>ye(!0),variant:"ghost"})]}),X&&e.jsx("div",{style:{marginBottom:20},children:e.jsx(ee,{title:"ERROR",children:e.jsx("div",{style:{padding:"12px",color:t.foreground,fontSize:12,fontFamily:"Consolas"},children:X})})}),e.jsx("div",{style:{display:"flex",gap:8,marginBottom:16,borderBottom:`1px solid ${t.border}`,paddingBottom:8},children:["monitor","live","transfer","system"].map(o=>e.jsx("button",{onClick:()=>q(o),style:{padding:"8px 16px",border:`1px solid ${b===o?t.accent:t.border}`,backgroundColor:b===o?t.accent:t.background,color:b===o?"#ffffff":t.foreground,borderRadius:2,cursor:"pointer",fontSize:11,fontWeight:b===o?600:500,transition:"all 0.2s ease",textTransform:"capitalize"},onMouseEnter:i=>{b!==o&&(i.currentTarget.style.backgroundColor=t.backgroundSoft,i.currentTarget.style.borderColor=t.accent)},onMouseLeave:i=>{b!==o&&(i.currentTarget.style.backgroundColor=t.background,i.currentTarget.style.borderColor=t.border)},children:o==="live"?"Live Changes":o==="transfer"?"Transfer Metrics":o==="system"?"System Resources":o},o))}),b!=="system"&&e.jsx("div",{style:{marginBottom:16},children:Ke()}),b==="live"&&e.jsx(ee,{title:"FILTERS",children:e.jsxs("div",{style:{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"},children:[e.jsxs("select",{value:M,onChange:o=>Te(o.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Types"}),e.jsx("option",{value:"CDC",children:"CDC"}),e.jsx("option",{value:"N/A",children:"N/A"})]}),e.jsxs("select",{value:O,onChange:o=>Re(o.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Statuses"}),e.jsx("option",{value:"LISTENING_CHANGES",children:"LISTENING_CHANGES"}),e.jsx("option",{value:"NO_DATA",children:"NO_DATA"}),e.jsx("option",{value:"ERROR",children:"ERROR"})]}),e.jsx(xe,{label:"Reset Filters",onClick:()=>{Te(""),Re("")},variant:"ghost"})]})}),b==="transfer"&&(()=>{const o=Array.from(new Set(D.map(s=>s.transfer_type).filter(Boolean))).sort(),i=Array.from(new Set(D.map(s=>s.db_engine).filter(Boolean))).sort(),l=Array.from(new Set(D.map(s=>s.status).filter(Boolean))).sort();return e.jsx(ee,{title:"FILTERS",children:e.jsxs("div",{style:{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"},children:[e.jsx("input",{type:"text",placeholder:"Search schema, table, engine...",value:ge,onChange:s=>_e(s.target.value),style:{padding:"6px 10px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground,minWidth:200}}),e.jsxs("select",{value:se,onChange:s=>Be(s.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Statuses"}),l.map(s=>e.jsx("option",{value:s,children:s},s))]}),e.jsxs("select",{value:ne,onChange:s=>Ee(s.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Types"}),o.map(s=>e.jsx("option",{value:s,children:s},s))]}),e.jsxs("select",{value:ie,onChange:s=>Fe(s.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Engines"}),i.map(s=>e.jsx("option",{value:s,children:s},s))]}),e.jsx(xe,{label:"Reset Filters",onClick:()=>{_e(""),Be(""),Ee(""),Fe("")},variant:"ghost"})]})})})(),b==="system"?e.jsx("div",{style:{width:"100%"},children:Ve()}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{display:"grid",gridTemplateColumns:b==="live"?"1fr 1fr 400px":"1fr 500px",gap:20,height:"calc(100vh - 300px)",minHeight:600,marginTop:b==="transfer"?24:0},children:[e.jsx(ee,{title:"TREE VIEW",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:12,maxHeight:"calc(100vh - 400px)",overflowY:"auto",overflowX:"auto",scrollbarWidth:"thin",scrollbarColor:`${t.border} transparent`},className:"tree-view-container",children:Ge()})}),e.jsx(ee,{title:"DETAILS",children:e.jsx("div",{style:{maxHeight:"calc(100vh - 400px)",overflowY:"auto",transition:"opacity 0.15s ease"},children:Ie()})}),b==="live"&&e.jsx(ee,{title:"CURRENT CHANGES",children:e.jsx("div",{style:{maxHeight:"calc(100vh - 400px)",overflowY:"auto",transition:"opacity 0.15s ease"},children:Ye()})})]}),b==="monitor"&&n&&n.query&&e.jsxs(e.Fragment,{children:[e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,backgroundColor:"rgba(0, 0, 0, 0.6)",zIndex:999,opacity:0,transition:"opacity 0.15s ease",willChange:"opacity"},onClick:()=>W(null)}),e.jsxs("div",{style:{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%, -50%) scale(0.95)",width:"85%",height:"85%",maxWidth:"1400px",maxHeight:"900px",backgroundColor:t.background,border:`2px solid ${t.border}`,borderRadius:2,zIndex:1e3,display:"flex",flexDirection:"column",fontFamily:"Consolas",fontSize:12,color:t.foreground,boxShadow:"0 8px 32px rgba(0, 0, 0, 0.4)",opacity:0,animation:"modalSlideIn 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",willChange:"transform, opacity"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`2px solid ${t.border}`,backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0},children:[h.blockFull," QUERY DETAILS"]}),e.jsxs("button",{onClick:()=>W(null),style:{background:"transparent",border:`1px solid ${t.border}`,color:t.foreground,padding:"4px 12px",borderRadius:2,cursor:"pointer",fontFamily:"Consolas",fontSize:11,transition:"background-color 0.12s ease-out, border-color 0.12s ease-out, color 0.12s ease-out",willChange:"background-color, color"},onMouseEnter:o=>{o.currentTarget.style.border=`2px solid ${t.foreground}`,o.currentTarget.style.backgroundColor=t.backgroundSoft},onMouseLeave:o=>{o.currentTarget.style.backgroundColor="transparent",o.currentTarget.style.color=t.foreground},children:[h.blockFull," CLOSE"]})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"4fr 1fr",gap:20,flex:1,padding:20,overflow:"hidden"},children:[e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"},children:[e.jsxs("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[h.blockFull," QUERY TEXT"]}),e.jsx("pre",{style:{margin:0,padding:16,backgroundColor:t.backgroundSoft,borderRadius:2,overflowX:"auto",overflowY:"auto",fontSize:11,border:`1px solid ${t.border}`,fontFamily:"Consolas",whiteSpace:"pre-wrap",wordWrap:"break-word",color:t.foreground,flex:1},children:n.query||"N/A"})]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"},children:[e.jsxs("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:t.accent,margin:0,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${t.border}`},children:[h.blockFull," DETAILS"]}),e.jsx("div",{style:{overflowY:"auto",flex:1},children:Ie()})]})]})]})]})]}),e.jsx("style",{children:`
        /* Keyframes removed - using only CSS transitions (0.15s ease) per design rules */
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
          transition: opacity 0.15s ease;
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
          transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }
      `}),Pe&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e4},onClick:()=>ye(!1),children:e.jsx("div",{style:{width:"90%",maxWidth:1e3,maxHeight:"90vh",overflowY:"auto"},onClick:o=>o.stopPropagation(),children:e.jsx(ee,{title:"MONITOR PLAYBOOK",children:e.jsxs("div",{style:{padding:16,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[h.blockFull," OVERVIEW"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"The Monitor provides real-time visibility into system performance, active queries, live data changes, transfer metrics, and system resources. It tracks the multi-threaded DataSync system with core threads (initialization, catalog sync, monitoring, quality, maintenance, webhooks) and transfer threads (MariaDB, MSSQL, MongoDB, Oracle, PostgreSQL, DB2, API, CSV, Google Sheets, Custom Jobs, Data Warehouse)."})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[h.blockFull," MONITORING TABS"]}),e.jsxs("div",{style:{color:t.foreground,marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Active Queries:"})," Real-time view of currently executing database queries with PID, user, database, state, and query details"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Live Changes:"})," Monitor Change Data Capture (CDC) events and full load operations in real-time"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Transfer Metrics:"})," Track data transfer operations across all database engines and sources"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"└─"})," ",e.jsx("strong",{children:"System Resources:"})," Monitor CPU, memory, network, throughput, and database connection metrics"]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[h.blockFull," LIVE CHANGES EVENTS"]}),e.jsxs("div",{style:{color:t.foreground,marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Event Types:"})," CDC (Change Data Capture) and N/A (Full Load operations)"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Event Status:"})," LISTENING_CHANGES (actively monitoring), NO_DATA (no changes detected), ERROR (error occurred)"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"└─"})," ",e.jsx("strong",{children:"Real-time Tracking:"})," Monitor processing logs and execution timelines for all synchronization operations"]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[h.blockFull," TRANSFER METRICS"]}),e.jsxs("div",{style:{color:t.foreground,marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Status Filtering:"})," Filter by SUCCESS, FAILED, ERROR, PENDING, IN_PROGRESS"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Type Filtering:"})," Filter by FULL_LOAD, SYNC, CDC, RESET"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Engine Filtering:"})," Filter by PostgreSQL, MariaDB, MSSQL, MongoDB, Oracle, DB2"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"└─"})," ",e.jsx("strong",{children:"Metrics:"})," Track records transferred, bytes transferred, duration, transfer rate, throughput, progress, retry count"]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[h.blockFull," SYSTEM RESOURCES"]}),e.jsxs("div",{style:{color:t.foreground,marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"CPU Usage:"})," Real-time CPU utilization percentage"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Memory:"})," Memory usage percentage and available memory"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Network:"})," Network throughput and bandwidth usage"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Database Connections:"})," Active database connections and connection pool status"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Queries Per Second:"})," Database query throughput"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"└─"})," ",e.jsx("strong",{children:"Query Efficiency:"})," Query performance efficiency metrics"]})]})]}),e.jsxs("div",{style:{marginTop:16,padding:12,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:t.muted,marginBottom:4},children:[h.blockSemi," Best Practices"]}),e.jsxs("div",{style:{fontSize:11,color:t.foreground},children:["• Monitor active queries to identify long-running or blocking queries",e.jsx("br",{}),"• Track live changes to ensure CDC is working correctly",e.jsx("br",{}),"• Monitor transfer metrics to identify bottlenecks in data synchronization",e.jsx("br",{}),"• Watch system resources to prevent resource exhaustion",e.jsx("br",{}),"• Use filters to focus on specific engines, statuses, or event types",e.jsx("br",{}),"• Review execution timelines to understand operation duration and patterns"]})]}),e.jsx("div",{style:{marginTop:16,textAlign:"right"},children:e.jsx(xe,{label:"Close",onClick:()=>ye(!1),variant:"ghost"})})]})})})})]})};export{dt as default};
