import{m as D,f as g,b as t,r as m,j as e,e as c,p as I}from"./index-75d7470b.js";import{u as X}from"./useTableFilters-0b8dd77f.js";import{e as H}from"./errorHandler-5ea9ae85.js";import{A as h}from"./AsciiPanel-9f053981.js";import{A as z}from"./AsciiButton-446d8430.js";import{S as Z}from"./SkeletonLoader-530eacc4.js";const C=D`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,J=D`
  from {
    opacity: 0;
    max-height: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    max-height: 10000px;
    transform: translateY(0);
  }
`,ee=D`
  from {
    opacity: 1;
    max-height: 10000px;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    max-height: 0;
    transform: translateY(-10px);
  }
`,W=g.div`
  font-family: Consolas;
  font-size: 12px;
  background: ${t.background};
  border: 1px solid ${t.border};
  border-radius: 2px;
  padding: 16px;
  max-height: 800px;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  animation: ${C} 0.3s ease-out;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${t.backgroundSoft};
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${t.border};
    border-radius: 2px;
    transition: background 0.2s ease;
    
    &:hover {
      background: ${t.accent};
    }
  }
`,R=g.div`
  user-select: none;
  margin: 4px 0;
  animation: ${C} 0.3s ease-out;
  animation-fill-mode: both;
  
  &:nth-child(1) { animation-delay: 0.05s; }
  &:nth-child(2) { animation-delay: 0.1s; }
  &:nth-child(3) { animation-delay: 0.15s; }
  &:nth-child(4) { animation-delay: 0.2s; }
  &:nth-child(5) { animation-delay: 0.25s; }
`,M=g.div`
  display: flex;
  align-items: center;
  padding: ${i=>i.$level===0?"8px":"6px 8px"};
  padding-left: ${i=>i.$level*24+8}px;
  border-radius: 2px;
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  margin: 2px 0;
  font-family: Consolas;
  font-size: 12px;
  
  ${i=>i.$nodeType==="database"?`
        background: ${t.accentLight};
        border-left: 3px solid ${t.accent};
        font-weight: 600;
      `:i.$nodeType==="schema"?`
        background: ${t.backgroundSoft};
        border-left: 2px solid ${t.border};
      `:`
      border-left: 1px solid ${t.border};
    `}
  
  &:hover {
    background: ${i=>i.$nodeType==="database"?t.accentLight:t.backgroundSoft};
    transform: translateX(2px);
  }
`,P=g.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 8px;
  border-radius: 2px;
  background: ${i=>i.$isExpanded?t.accent:t.backgroundSoft};
  color: ${i=>i.$isExpanded?"#ffffff":t.accent};
  font-size: 10px;
  font-weight: bold;
  font-family: Consolas;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.1);
  }
`,U=g.span`
  font-weight: ${i=>i.$isDatabase?"700":i.$isSchema?"600":"500"};
  font-size: ${i=>i.$isDatabase?"13px":(i.$isSchema,"12px")};
  font-family: Consolas;
  color: ${i=>i.$isDatabase?t.accent:i.$isSchema?t.foreground:t.foreground};
  margin-right: 12px;
  transition: color 0.2s ease;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`,Y=g.span`
  padding: 2px 8px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 500;
  font-family: Consolas;
  background: ${t.backgroundSoft};
  color: ${t.foreground};
  border: 1px solid ${t.border};
  margin-left: auto;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${t.accentLight};
    border-color: ${t.accent};
    color: ${t.accent};
    transform: translateY(-1px);
  }
`,q=g.div`
  overflow: hidden;
  animation: ${i=>i.$isExpanded?J:ee} 0.3s ease-out;
  padding-left: ${i=>i.$level*24+36}px;
`,te=g.span`
  color: ${t.muted};
  font-family: Consolas;
  margin-right: 4px;
  font-size: 12px;
`,ne=g.div`
  padding: 8px;
  padding-left: ${i=>i.$level*24+36}px;
  margin: 2px 0;
  border-radius: 2px;
  background: ${t.background};
  border: 1px solid ${t.border};
  transition: all 0.2s ease;
  cursor: pointer;
  animation: ${C} 0.3s ease-out;
  font-family: Consolas;
  font-size: 12px;
  
  &:hover {
    background: ${t.backgroundSoft};
    border-color: ${t.accent};
    transform: translateX(4px);
  }
`,L=i=>{if(!i)return t.muted;switch(i){case"PENDING":return t.warning;case"RUNNING":return t.accent;case"COMPLETED":return t.success;case"FAILED":return t.danger;case"SKIPPED":return t.muted;default:return t.muted}},oe=g.div`
  padding: 60px 40px;
  text-align: center;
  color: ${t.muted};
  animation: ${C} 0.5s ease-out;
  font-family: Consolas;
`,re=g.div`
  font-size: 48px;
  margin-bottom: 16px;
  animation: ${C} 0.5s ease-out;
  font-family: Consolas;
  opacity: 0.5;
`,ie=g.div`
  font-size: 13px;
  font-family: Consolas;
  font-weight: 600;
  margin-bottom: 8px;
  color: ${t.foreground};
`,se=g.div`
  font-size: 12px;
  font-family: Consolas;
  opacity: 0.7;
  color: ${t.muted};
`,ae=({items:i,onItemClick:y})=>{const[F,N]=m.useState(new Set),[k,E]=m.useState(new Set),b=m.useMemo(()=>{const o=new Map;return i.forEach(r=>{const s=r.db_engine||"Unknown",u=r.schema_name||"default";o.has(s)||o.set(s,{name:s,schemas:new Map});const l=o.get(s);l.schemas.has(u)||l.schemas.set(u,{name:u,items:[]}),l.schemas.get(u).items.push(r)}),Array.from(o.values()).sort((r,s)=>r.name.localeCompare(s.name))},[i]),T=o=>{N(r=>{const s=new Set(r);return s.has(o)?s.delete(o):s.add(o),s})},x=(o,r)=>{const s=`${o}:${r}`;E(u=>{const l=new Set(u);return l.has(s)?l.delete(s):l.add(s),l})},j=(o,r)=>{if(o===0)return null;const s=[];for(let u=0;u<o-1;u++)s.push("│  ");return s.push(r?"└─ ":"├─ "),e.jsx(te,{children:s.join("")})},n=o=>{if(o==null)return"N/A";const r=Number(o);return isNaN(r)?"N/A":r<1?`${(r*1024).toFixed(2)} KB`:r<1024?`${r.toFixed(2)} MB`:`${(r/1024).toFixed(2)} GB`},B=o=>{if(o==null)return"N/A";const r=Number(o);return isNaN(r)?"N/A":r<60?`${r.toFixed(2)}s`:r<3600?`${(r/60).toFixed(2)}m`:`${(r/3600).toFixed(2)}h`},p=(o,r)=>{const s=F.has(o.name),u=Array.from(o.schemas.values()).reduce((l,f)=>l+f.items.length,0);return e.jsxs(R,{children:[e.jsxs(M,{$level:r,$isExpanded:s,$nodeType:"database",onClick:()=>T(o.name),children:[j(r,!1),e.jsx(P,{$isExpanded:s,children:s?c.arrowDown:c.arrowRight}),e.jsx("span",{style:{marginRight:"8px",color:t.accent,fontFamily:"Consolas"},children:c.blockFull}),e.jsx(U,{$isDatabase:!0,children:o.name}),e.jsx(Y,{children:u})]}),e.jsx(q,{$isExpanded:s,$level:r,children:s&&Array.from(o.schemas.values()).sort((l,f)=>l.name.localeCompare(f.name)).map((l,f,S)=>v(l,o.name,r+1,f===S.length-1))})]},o.name)},v=(o,r,s,u)=>{const l=`${r}:${o.name}`,f=k.has(l);return e.jsxs(R,{children:[e.jsxs(M,{$level:s,$isExpanded:f,$nodeType:"schema",onClick:()=>x(r,o.name),children:[j(s,u),e.jsx(P,{$isExpanded:f,children:f?c.arrowDown:c.arrowRight}),e.jsx("span",{style:{marginRight:"8px",color:t.foreground,fontFamily:"Consolas"},children:c.blockFull}),e.jsx(U,{$isSchema:!0,children:o.name}),e.jsx(Y,{children:o.items.length})]}),e.jsx(q,{$isExpanded:f,$level:s,children:f&&o.items.map((S,_)=>A(S,s+1,_===o.items.length-1))})]},l)},A=(o,r,s)=>e.jsxs(ne,{$level:r,onClick:()=>y==null?void 0:y(o),children:[j(r,s),e.jsx("span",{style:{marginRight:"8px",color:t.muted,fontFamily:"Consolas"},children:c.blockFull}),e.jsx("span",{style:{marginRight:"8px",fontWeight:500,color:t.foreground,fontFamily:"Consolas"},children:o.object_name||"N/A"}),o.maintenance_type&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:t.backgroundSoft,color:t.foreground,border:`1px solid ${t.border}`,marginRight:4},children:o.maintenance_type}),o.status&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:L(o.status)+"20",color:L(o.status),border:`1px solid ${L(o.status)}`,marginRight:4},children:o.status}),o.error_details&&e.jsxs("span",{title:o.error_details,style:{marginLeft:"8px",color:t.danger,fontSize:11,fontFamily:"Consolas",padding:"2px 6px",background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.danger}`,maxWidth:"200px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:[c.blockFull," ",o.error_details]}),e.jsxs("span",{style:{marginLeft:"auto",color:t.muted,fontSize:11,fontFamily:"Consolas",display:"flex",gap:"8px",alignItems:"center"},children:[o.impact_score&&e.jsxs("span",{children:["Impact: ",Number(o.impact_score).toFixed(1)]}),o.space_reclaimed_mb&&e.jsxs("span",{children:[c.bullet," ",n(o.space_reclaimed_mb)]}),o.maintenance_duration_seconds&&e.jsxs("span",{children:[c.bullet," ",B(o.maintenance_duration_seconds)]})]})]},o.id);return b.length===0?e.jsx(W,{children:e.jsxs(oe,{children:[e.jsx(re,{children:c.blockFull}),e.jsx(ie,{children:"No maintenance data available"}),e.jsx(se,{children:"Maintenance operations will appear here once detected."})]})}):e.jsx(W,{children:b.map(o=>p(o,0))})},ge=()=>{const{filters:i,setFilter:y}=X({maintenance_type:"",status:"",db_engine:""}),[F,N]=m.useState(!0),[k,E]=m.useState(null),[b,T]=m.useState([]),[x,j]=m.useState({}),[n,B]=m.useState(null),[p,v]=m.useState("pending"),[A,o]=m.useState(!1),r=m.useRef(!0),s=m.useCallback(async()=>{if(!r.current)return;const a=Date.now(),d=300;try{N(!0),E(null);let $=i.status;!$&&p!=="all"&&($=p==="pending"?"PENDING":p==="completed"?"COMPLETED":"");const[O,G]=await Promise.all([I.getMaintenanceItems({page:1,limit:1e3,maintenance_type:i.maintenance_type,db_engine:i.db_engine,status:$}),I.getMetrics()]),K=Date.now()-a,Q=Math.max(0,d-K);await new Promise(V=>setTimeout(V,Q)),r.current&&(T(O.data||[]),j(G||{}))}catch($){r.current&&E(H($))}finally{r.current&&N(!1)}},[i.maintenance_type,i.db_engine,i.status,p]);m.useEffect(()=>{r.current=!0,s();const a=setInterval(()=>{r.current&&s()},3e4);return()=>{r.current=!1,clearInterval(a)}},[s]);const u=m.useCallback(a=>{B(d=>(d==null?void 0:d.id)===a.id?null:a)},[]),l=m.useCallback(a=>{if(a==null)return"N/A";const d=Number(a);return isNaN(d)?"N/A":d<1?`${(d*1024).toFixed(2)} KB`:d<1024?`${d.toFixed(2)} MB`:`${(d/1024).toFixed(2)} GB`},[]),f=m.useCallback(a=>a?new Date(a).toLocaleString():"N/A",[]),S=m.useCallback(a=>{if(a==null)return"N/A";const d=Number(a);return isNaN(d)?"N/A":d<60?`${d.toFixed(2)}s`:d<3600?`${(d/60).toFixed(2)}m`:`${(d/3600).toFixed(2)}h`},[]),_=m.useCallback((a,d)=>{y(a,d)},[y]),w=a=>{switch(a){case"PENDING":return t.warning;case"RUNNING":return t.accent;case"COMPLETED":return t.success;case"FAILED":return t.danger;case"SKIPPED":return t.muted;default:return t.muted}};return F&&b.length===0?e.jsx(Z,{variant:"list",panels:6}):e.jsxs("div",{style:{padding:"20px",fontFamily:"Consolas",fontSize:12},children:[e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:"0 0 20px 0",color:t.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:t.accent,marginRight:8},children:c.blockFull}),"MAINTENANCE"]}),k&&e.jsx("div",{style:{marginBottom:20},children:e.jsx(h,{title:"ERROR",children:e.jsx("div",{style:{padding:"12px",color:t.danger,fontSize:12,fontFamily:"Consolas"},children:k})})}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:12,marginBottom:24},children:[e.jsx(h,{title:"Total Pending",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:x.total_pending||0})}),e.jsx(h,{title:"Total Completed",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:x.total_completed||0})}),e.jsx(h,{title:"Total Failed",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:x.total_failed||0})}),e.jsx(h,{title:"Space Reclaimed",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:l(x.total_space_reclaimed_mb)})}),e.jsx(h,{title:"Avg Impact Score",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:x.avg_impact_score?`${Number(x.avg_impact_score).toFixed(1)}`:"N/A"})}),e.jsx(h,{title:"Objects Improved",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:x.objects_improved||0})})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:16,borderBottom:`1px solid ${t.border}`,paddingBottom:8},children:[e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx(z,{label:`Pending (${x.total_pending||0})`,onClick:()=>v("pending"),variant:p==="pending"?"primary":"ghost"}),e.jsx(z,{label:`Completed (${x.total_completed||0})`,onClick:()=>v("completed"),variant:p==="completed"?"primary":"ghost"}),e.jsx(z,{label:"All",onClick:()=>v("all"),variant:p==="all"?"primary":"ghost"})]}),e.jsx(z,{label:"Maintenance Info",onClick:()=>o(!0),variant:"ghost"})]}),A&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>o(!1),children:e.jsx("div",{style:{width:"90%",maxWidth:1e3,maxHeight:"90vh",overflowY:"auto"},onClick:a=>a.stopPropagation(),children:e.jsx(h,{title:"MAINTENANCE PLAYBOOK",children:e.jsxs("div",{style:{padding:16,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[c.blockFull," OVERVIEW"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Database maintenance operations are automated tasks that optimize database performance, reclaim storage space, and ensure data integrity. The system automatically detects maintenance needs and executes operations based on configured thresholds and schedules."})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[c.blockFull," MAINTENANCE TYPES"]}),e.jsxs("div",{style:{marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.success,marginBottom:6},children:[c.blockSemi," VACUUM"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Reclaims storage space by removing dead tuples (deleted or updated rows) and updating statistics. Essential for PostgreSQL to prevent table bloat and maintain query performance. Can be run in FULL mode (locks table) or regular mode (concurrent)."})]}),e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.success,marginBottom:6},children:[c.blockSemi," ANALYZE"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Updates table statistics used by the query planner to generate optimal execution plans. Analyzes column distributions, null counts, and value frequencies. Should be run regularly after significant data changes."})]}),e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.success,marginBottom:6},children:[c.blockSemi," REINDEX"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Rebuilds indexes to eliminate fragmentation and improve index efficiency. Useful when indexes become bloated or fragmented over time. Can reclaim significant space and improve query performance."})]}),e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.success,marginBottom:6},children:[c.blockSemi," CLUSTER"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Physically reorders table data according to an index, improving sequential scan performance. Requires exclusive lock and can be time-consuming for large tables. Best used for tables with sequential access patterns."})]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[c.blockFull," METRICS EXPLAINED"]}),e.jsxs("div",{style:{marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:4},children:"Impact Score (0-100)"}),e.jsx("div",{style:{color:t.foreground,marginLeft:16,fontSize:11},children:"Calculated based on space reclaimed (40%), performance improvement (40%), and fragmentation reduction (20%). Higher scores indicate more significant maintenance benefits."})]}),e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:4},children:"Space Reclaimed"}),e.jsx("div",{style:{color:t.foreground,marginLeft:16,fontSize:11},children:"Storage space freed up after maintenance operations. Includes dead tuples removed, index bloat eliminated, and fragmentation reduced."})]}),e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:4},children:"Performance Improvement"}),e.jsx("div",{style:{color:t.foreground,marginLeft:16,fontSize:11},children:"Percentage improvement in query performance after maintenance. Measured by comparing query execution times before and after maintenance operations."})]}),e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:4},children:"Fragmentation"}),e.jsx("div",{style:{color:t.foreground,marginLeft:16,fontSize:11},children:"Percentage of table/index space that is fragmented. Lower fragmentation means better data locality and improved sequential access performance."})]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[c.blockFull," STATUS TYPES"]}),e.jsxs("div",{style:{marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.warning,fontWeight:600},children:"PENDING"}),e.jsx("span",{style:{color:t.foreground,marginLeft:8},children:"Maintenance detected but not yet executed"})]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.accent,fontWeight:600},children:"RUNNING"}),e.jsx("span",{style:{color:t.foreground,marginLeft:8},children:"Maintenance operation currently in progress"})]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.success,fontWeight:600},children:"COMPLETED"}),e.jsx("span",{style:{color:t.foreground,marginLeft:8},children:"Maintenance successfully finished"})]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.danger,fontWeight:600},children:"FAILED"}),e.jsx("span",{style:{color:t.foreground,marginLeft:8},children:"Maintenance operation encountered an error"})]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted,fontWeight:600},children:"SKIPPED"}),e.jsx("span",{style:{color:t.foreground,marginLeft:8},children:"Maintenance was skipped (disabled or below threshold)"})]})]})]}),e.jsxs("div",{style:{marginTop:16,padding:12,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:t.muted,marginBottom:4},children:[c.blockSemi," Note"]}),e.jsx("div",{style:{fontSize:11,color:t.foreground},children:"Maintenance operations can be configured with auto-execute enabled/disabled, custom thresholds, and schedules. The system monitors database health and automatically detects when maintenance is needed based on fragmentation, dead tuple counts, and performance metrics."})]}),e.jsx("div",{style:{marginTop:16,textAlign:"right"},children:e.jsx(z,{label:"Close",onClick:()=>o(!1),variant:"ghost"})})]})})})}),e.jsx(h,{title:"FILTERS",children:e.jsxs("div",{style:{display:"flex",gap:12,flexWrap:"wrap"},children:[e.jsxs("select",{value:i.maintenance_type,onChange:a=>_("maintenance_type",a.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Types"}),e.jsx("option",{value:"VACUUM",children:"VACUUM"}),e.jsx("option",{value:"ANALYZE",children:"ANALYZE"}),e.jsx("option",{value:"REINDEX",children:"REINDEX"}),e.jsx("option",{value:"CLUSTER",children:"CLUSTER"})]}),e.jsxs("select",{value:i.db_engine,onChange:a=>_("db_engine",a.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Engines"}),e.jsx("option",{value:"PostgreSQL",children:"PostgreSQL"}),e.jsx("option",{value:"MariaDB",children:"MariaDB"}),e.jsx("option",{value:"MSSQL",children:"MSSQL"})]}),e.jsxs("select",{value:i.status,onChange:a=>_("status",a.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Status"}),e.jsx("option",{value:"PENDING",children:"PENDING"}),e.jsx("option",{value:"RUNNING",children:"RUNNING"}),e.jsx("option",{value:"COMPLETED",children:"COMPLETED"}),e.jsx("option",{value:"FAILED",children:"FAILED"}),e.jsx("option",{value:"SKIPPED",children:"SKIPPED"})]})]})}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:n?"1fr 400px":"1fr",gap:16},children:[e.jsx(ae,{items:b,onItemClick:u}),n&&e.jsx(h,{title:"MAINTENANCE DETAILS",children:e.jsx("div",{style:{position:"sticky",top:8,maxHeight:"calc(100vh - 200px)",overflowY:"auto",fontFamily:"Consolas",fontSize:12},children:e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:[e.jsxs("div",{children:[e.jsx("div",{style:{color:t.muted,fontSize:11,marginBottom:4},children:"Type:"}),e.jsx("div",{children:e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:t.backgroundSoft,color:t.foreground,border:`1px solid ${t.border}`},children:n.maintenance_type||"N/A"})})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:t.muted,fontSize:11,marginBottom:4},children:"Engine:"}),e.jsx("div",{style:{color:t.foreground},children:n.db_engine||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:t.muted,fontSize:11,marginBottom:4},children:"Schema:"}),e.jsx("div",{style:{color:t.foreground},children:n.schema_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:t.muted,fontSize:11,marginBottom:4},children:"Object:"}),e.jsx("div",{style:{color:t.foreground},children:n.object_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:t.muted,fontSize:11,marginBottom:4},children:"Status:"}),e.jsx("div",{children:e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:n.status?w(n.status)+"20":t.backgroundSoft,color:n.status?w(n.status):t.foreground,border:`1px solid ${n.status?w(n.status):t.border}`},children:n.status||"N/A"})})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:t.muted,fontSize:11,marginBottom:4},children:"Priority:"}),e.jsx("div",{style:{color:t.foreground},children:n.priority||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:t.muted,fontSize:11,marginBottom:4},children:"Impact Score:"}),e.jsx("div",{style:{color:t.foreground},children:n.impact_score?Number(n.impact_score).toFixed(1):"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:t.muted,fontSize:11,marginBottom:4},children:"Space Reclaimed:"}),e.jsx("div",{style:{color:t.foreground},children:l(n.space_reclaimed_mb)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:t.muted,fontSize:11,marginBottom:4},children:"Duration:"}),e.jsx("div",{style:{color:t.foreground},children:S(n.maintenance_duration_seconds)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:t.muted,fontSize:11,marginBottom:4},children:"Last Run:"}),e.jsx("div",{style:{color:t.foreground,fontSize:11},children:f(n.last_maintenance_date)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:t.muted,fontSize:11,marginBottom:4},children:"Next Run:"}),e.jsx("div",{style:{color:t.foreground,fontSize:11},children:f(n.next_maintenance_date)})]}),e.jsxs("div",{style:{borderTop:`1px solid ${t.border}`,paddingTop:12,marginTop:8},children:[e.jsx("div",{style:{color:t.muted,fontSize:11,marginBottom:8,fontWeight:600},children:"Configuration:"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:t.muted},children:"Object Type"}),e.jsx("div",{style:{fontWeight:600,color:t.foreground},children:n.object_type||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:t.muted},children:"Auto Execute"}),e.jsx("div",{style:{fontWeight:600,color:t.foreground},children:n.auto_execute?"Yes":"No"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:t.muted},children:"Enabled"}),e.jsx("div",{style:{fontWeight:600,color:t.foreground},children:n.enabled?"Yes":"No"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:t.muted},children:"Maintenance Count"}),e.jsx("div",{style:{fontWeight:600,color:t.foreground},children:n.maintenance_count||0})]}),n.server_name&&e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:t.muted},children:"Server Name"}),e.jsx("div",{style:{fontWeight:600,color:t.foreground},children:n.server_name})]}),n.database_name&&e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:t.muted},children:"Database Name"}),e.jsx("div",{style:{fontWeight:600,color:t.foreground},children:n.database_name})]})]})]}),(n.fragmentation_before!==null||n.fragmentation_after!==null||n.dead_tuples_before!==null||n.dead_tuples_after!==null||n.table_size_before_mb!==null||n.table_size_after_mb!==null||n.index_size_before_mb!==null||n.index_size_after_mb!==null||n.query_performance_before!==null||n.query_performance_after!==null)&&e.jsxs("div",{style:{borderTop:`1px solid ${t.border}`,paddingTop:12,marginTop:8},children:[e.jsx("div",{style:{color:t.muted,fontSize:11,marginBottom:8,fontWeight:600},children:"Before/After Metrics:"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8},children:[n.fragmentation_before!==null&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:t.muted},children:"Fragmentation Before"}),e.jsxs("div",{style:{fontWeight:600,color:t.foreground},children:[Number(n.fragmentation_before).toFixed(2),"%"]})]}),n.fragmentation_after!==null&&e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:t.muted},children:"Fragmentation After"}),e.jsxs("div",{style:{fontWeight:600,color:t.success},children:[Number(n.fragmentation_after).toFixed(2),"%"]})]})]}),n.dead_tuples_before!==null&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:t.muted},children:"Dead Tuples Before"}),e.jsx("div",{style:{fontWeight:600,color:t.foreground},children:Number(n.dead_tuples_before).toLocaleString()})]}),n.dead_tuples_after!==null&&e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:t.muted},children:"Dead Tuples After"}),e.jsx("div",{style:{fontWeight:600,color:t.success},children:Number(n.dead_tuples_after).toLocaleString()})]})]}),n.table_size_before_mb!==null&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:t.muted},children:"Table Size Before"}),e.jsx("div",{style:{fontWeight:600,color:t.foreground},children:l(n.table_size_before_mb)})]}),n.table_size_after_mb!==null&&e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:t.muted},children:"Table Size After"}),e.jsx("div",{style:{fontWeight:600,color:t.success},children:l(n.table_size_after_mb)})]})]}),n.index_size_before_mb!==null&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:t.muted},children:"Index Size Before"}),e.jsx("div",{style:{fontWeight:600,color:t.foreground},children:l(n.index_size_before_mb)})]}),n.index_size_after_mb!==null&&e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:t.muted},children:"Index Size After"}),e.jsx("div",{style:{fontWeight:600,color:t.success},children:l(n.index_size_after_mb)})]})]}),n.query_performance_before!==null&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:t.muted},children:"Query Performance Before"}),e.jsxs("div",{style:{fontWeight:600,color:t.foreground},children:[Number(n.query_performance_before).toFixed(2),"ms"]})]}),n.query_performance_after!==null&&e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:t.muted},children:"Query Performance After"}),e.jsxs("div",{style:{fontWeight:600,color:t.success},children:[Number(n.query_performance_after).toFixed(2),"ms"]})]})]})]})]}),e.jsxs("div",{style:{borderTop:`1px solid ${t.border}`,paddingTop:12,marginTop:8},children:[e.jsx("div",{style:{color:t.muted,fontSize:11,marginBottom:8,fontWeight:600},children:"Timestamps:"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8},children:[n.first_detected_date&&e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:t.muted},children:"First Detected"}),e.jsx("div",{style:{fontWeight:600,color:t.foreground,fontSize:11},children:f(n.first_detected_date)})]}),n.last_checked_date&&e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:t.muted},children:"Last Checked"}),e.jsx("div",{style:{fontWeight:600,color:t.foreground,fontSize:11},children:f(n.last_checked_date)})]})]})]}),n.result_message&&e.jsxs("div",{style:{borderTop:`1px solid ${t.border}`,paddingTop:12,marginTop:8},children:[e.jsx("div",{style:{color:t.muted,fontSize:11,marginBottom:8,fontWeight:600},children:"Result Message:"}),e.jsx("div",{style:{padding:8,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`,fontSize:11,color:t.foreground,fontFamily:"Consolas"},children:n.result_message})]}),n.error_details&&e.jsxs("div",{style:{borderTop:`1px solid ${t.border}`,paddingTop:12,marginTop:8},children:[e.jsx("div",{style:{fontSize:11,color:t.danger,marginBottom:4,fontWeight:600},children:"Error Details"}),e.jsx("div",{style:{padding:8,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.danger}`,fontSize:11,color:t.danger,fontFamily:"Consolas"},children:n.error_details})]})]})})})]})]})};export{ge as default};
