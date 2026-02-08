import{m as R,f as v,b as n,r as m,j as e,e as g,D as S,t as o,G as M,C as J}from"./index-b1fa964d.js";import{u as ee}from"./useTableFilters-34614e65.js";import{e as P}from"./errorHandler-5ea9ae85.js";import{A as B}from"./AsciiPanel-3399d5be.js";import{A as h}from"./AsciiButton-3fcfdd9b.js";import{S as ne}from"./SkeletonLoader-09c12074.js";const T=R`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,oe=R`
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
`,te=R`
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
`,W=v.div`
  font-family: Consolas;
  font-size: 12px;
  background: ${n.background};
  border: 1px solid ${n.border};
  border-radius: 2px;
  padding: 16px;
  max-height: 800px;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  animation: ${T} 0.3s ease-out;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${n.backgroundSoft};
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${n.border};
    border-radius: 2px;
    transition: background 0.2s ease;
    
    &:hover {
      background: ${n.accent};
    }
  }
`,O=v.div`
  user-select: none;
  margin: 4px 0;
  animation: ${T} 0.3s ease-out;
  animation-fill-mode: both;
  
  &:nth-child(1) { animation-delay: 0.05s; }
  &:nth-child(2) { animation-delay: 0.1s; }
  &:nth-child(3) { animation-delay: 0.15s; }
  &:nth-child(4) { animation-delay: 0.2s; }
  &:nth-child(5) { animation-delay: 0.25s; }
`,q=v.div`
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
  
  background: transparent;
  
  ${i=>i.$nodeType==="database"?`
        border-left: 3px solid ${n.accent};
        font-weight: 600;
      `:i.$nodeType==="schema"?`
        border-left: 2px solid ${n.border};
      `:`
      border-left: 1px solid ${n.border};
    `}
  
  &:hover {
    background: ${i=>i.$nodeType==="database"?n.accentLight:i.$nodeType==="schema"?n.backgroundSoft:n.backgroundSoft};
    transform: translateX(2px);
  }
`,G=v.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 8px;
  border-radius: 2px;
  background: ${i=>i.$isExpanded?n.accent:n.backgroundSoft};
  color: ${i=>i.$isExpanded?"#ffffff":n.accent};
  font-size: 10px;
  font-weight: bold;
  font-family: Consolas;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.1);
  }
`,U=v.span`
  font-weight: ${i=>i.$isDatabase?"700":i.$isSchema?"600":"500"};
  font-size: ${i=>i.$isDatabase?"13px":(i.$isSchema,"12px")};
  font-family: Consolas;
  color: ${i=>i.$isDatabase?n.accent:i.$isSchema?n.foreground:n.foreground};
  margin-right: 12px;
  transition: color 0.2s ease;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`,Y=v.span`
  padding: 2px 8px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 500;
  font-family: Consolas;
  background: ${n.backgroundSoft};
  color: ${n.foreground};
  border: 1px solid ${n.border};
  margin-left: auto;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${n.accentLight};
    border-color: ${n.accent};
    color: ${n.accent};
    transform: translateY(-1px);
  }
`,Q=v.div`
  overflow: hidden;
  animation: ${i=>i.$isExpanded?oe:te} 0.3s ease-out;
  padding-left: ${i=>i.$level*24+36}px;
`,se=v.span`
  color: ${n.muted};
  font-family: Consolas;
  margin-right: 4px;
  font-size: 12px;
`,ae=v.div`
  padding: 8px;
  padding-left: ${i=>i.$level*24+36}px;
  margin: 2px 0;
  border-radius: 2px;
  background: transparent;
  border: 1px solid ${n.border};
  transition: all 0.2s ease;
  cursor: pointer;
  animation: ${T} 0.3s ease-out;
  font-family: Consolas;
  font-size: 12px;
  
  &:hover {
    background: ${n.backgroundSoft};
    border-color: ${n.accent};
    transform: translateX(4px);
  }
`,I=i=>{if(!i)return n.muted;switch(i){case"PENDING":return n.warning;case"RUNNING":return n.accent;case"COMPLETED":return n.success;case"FAILED":return n.danger;case"SKIPPED":return n.muted;default:return n.muted}},ie=v.div`
  padding: 60px 40px;
  text-align: center;
  color: ${n.muted};
  animation: ${T} 0.5s ease-out;
  font-family: Consolas;
`,re=v.div`
  font-size: 48px;
  margin-bottom: 16px;
  animation: ${T} 0.5s ease-out;
  font-family: Consolas;
  opacity: 0.5;
`,le=v.div`
  font-size: 13px;
  font-family: Consolas;
  font-weight: 600;
  margin-bottom: 8px;
  color: ${n.foreground};
`,de=v.div`
  font-size: 12px;
  font-family: Consolas;
  opacity: 0.7;
  color: ${n.muted};
`,ce=({items:i,onItemClick:u})=>{const[k,F]=m.useState(new Set),[C,y]=m.useState(new Set),_=m.useMemo(()=>{const s=new Map;return i.forEach(r=>{const l=r.db_engine||"Unknown",x=r.schema_name||"default";s.has(l)||s.set(l,{name:l,schemas:new Map});const c=s.get(l);c.schemas.has(x)||c.schemas.set(x,{name:x,items:[]}),c.schemas.get(x).items.push(r)}),Array.from(s.values()).sort((r,l)=>r.name.localeCompare(l.name))},[i]),E=s=>{F(r=>{const l=new Set(r);return l.has(s)?l.delete(s):l.add(s),l})},f=(s,r)=>{const l=`${s}:${r}`;y(x=>{const c=new Set(x);return c.has(l)?c.delete(l):c.add(l),c})},b=(s,r)=>{if(s===0)return null;const l=[];for(let x=0;x<s-1;x++)l.push("│  ");return l.push(r?"└─ ":"├─ "),e.jsx(se,{children:l.join("")})},t=s=>{if(s==null)return"N/A";const r=Number(s);return isNaN(r)?"N/A":r<1?`${(r*1024).toFixed(2)} KB`:r<1024?`${r.toFixed(2)} MB`:`${(r/1024).toFixed(2)} GB`},A=s=>{if(s==null)return"N/A";const r=Number(s);return isNaN(r)?"N/A":r<60?`${r.toFixed(2)}s`:r<3600?`${(r/60).toFixed(2)}m`:`${(r/3600).toFixed(2)}h`},j=(s,r)=>{const l=k.has(s.name),x=Array.from(s.schemas.values()).reduce((c,p)=>c+p.items.length,0);return e.jsxs(O,{children:[e.jsxs(q,{$level:r,$isExpanded:l,$nodeType:"database",onClick:()=>E(s.name),children:[b(r,!1),e.jsx(G,{$isExpanded:l,children:l?g.arrowDown:g.arrowRight}),e.jsx("span",{style:{marginRight:"8px",color:n.accent,fontFamily:"Consolas"},children:g.blockFull}),e.jsx(U,{$isDatabase:!0,children:s.name}),e.jsx(Y,{children:x})]}),e.jsx(Q,{$isExpanded:l,$level:r,children:l&&Array.from(s.schemas.values()).sort((c,p)=>c.name.localeCompare(p.name)).map((c,p,w)=>z(c,s.name,r+1,p===w.length-1))})]},s.name)},z=(s,r,l,x)=>{const c=`${r}:${s.name}`,p=C.has(c);return e.jsxs(O,{children:[e.jsxs(q,{$level:l,$isExpanded:p,$nodeType:"schema",onClick:()=>f(r,s.name),children:[b(l,x),e.jsx(G,{$isExpanded:p,children:p?g.arrowDown:g.arrowRight}),e.jsx("span",{style:{marginRight:"8px",color:n.foreground,fontFamily:"Consolas"},children:g.blockFull}),e.jsx(U,{$isSchema:!0,children:s.name}),e.jsx(Y,{children:s.items.length})]}),e.jsx(Q,{$isExpanded:p,$level:l,children:p&&s.items.map((w,N)=>L(w,l+1,N===s.items.length-1))})]},c)},L=(s,r,l)=>e.jsxs(ae,{$level:r,onClick:()=>u==null?void 0:u(s),children:[b(r,l),e.jsx("span",{style:{marginRight:"8px",color:n.muted,fontFamily:"Consolas"},children:g.blockFull}),e.jsx("span",{style:{marginRight:"8px",fontWeight:500,color:n.foreground,fontFamily:"Consolas"},children:s.object_name||"N/A"}),s.maintenance_type&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:n.backgroundSoft,color:n.foreground,border:`1px solid ${n.border}`,marginRight:4},children:s.maintenance_type}),s.status&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:I(s.status)+"20",color:I(s.status),border:`1px solid ${I(s.status)}`,marginRight:4},children:s.status}),s.error_details&&e.jsxs("span",{title:s.error_details,style:{marginLeft:"8px",color:n.danger,fontSize:11,fontFamily:"Consolas",padding:"2px 6px",background:n.backgroundSoft,borderRadius:2,border:`1px solid ${n.danger}`,maxWidth:"200px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:[g.blockFull," ",s.error_details]}),e.jsxs("span",{style:{marginLeft:"auto",color:n.muted,fontSize:11,fontFamily:"Consolas",display:"flex",gap:"8px",alignItems:"center"},children:[s.impact_score&&e.jsxs("span",{children:["Impact: ",Number(s.impact_score).toFixed(1)]}),s.space_reclaimed_mb&&e.jsxs("span",{children:[g.bullet," ",t(s.space_reclaimed_mb)]}),s.maintenance_duration_seconds&&e.jsxs("span",{children:[g.bullet," ",A(s.maintenance_duration_seconds)]})]})]},s.id);return _.length===0?e.jsx(W,{children:e.jsxs(ie,{children:[e.jsx(re,{children:g.blockFull}),e.jsx(le,{children:"No maintenance data available"}),e.jsx(de,{children:"Maintenance operations will appear here once detected."})]})}):e.jsx(W,{children:_.map(s=>j(s,0))})},me=({onCleanupComplete:i})=>{const[u,k]=m.useState(!1),[F,C]=m.useState(null),[y,_]=m.useState(null),E=m.useCallback(async()=>{try{C(null);const b=await S.getPreview();_(b.preview)}catch(b){C(P(b))}},[]),f=m.useCallback(async b=>{if(confirm(`Are you sure you want to execute ${b}?`))try{k(!0),C(null);let t;switch(b){case"non-existent-tables":t=await S.cleanNonExistentTables();break;case"orphaned-tables":t=await S.cleanOrphanedTables();break;case"old-logs":t=await S.cleanOldLogs();break;case"orphaned-governance":t=await S.cleanOrphanedGovernance();break;case"orphaned-quality":t=await S.cleanOrphanedQuality();break;case"orphaned-maintenance":t=await S.cleanOrphanedMaintenance();break;case"orphaned-lineage":t=await S.cleanOrphanedLineage();break;case"all":t=await S.cleanAll();break;default:return}alert(`Cleanup operation "${b}" initiated successfully.`),i&&i()}catch(t){C(P(t))}finally{k(!1)}},[i]);return e.jsxs(B,{title:"CATALOG CLEANER",children:[e.jsx("div",{style:{marginBottom:o.spacing.md},children:e.jsx(h,{label:"Preview Cleanup",onClick:E,variant:"ghost"})}),F&&e.jsxs("div",{style:{padding:o.spacing.sm,background:n.foreground+"20",border:`1px solid ${n.foreground}`,marginBottom:o.spacing.md,color:n.foreground},children:["Error: ",F]}),y&&e.jsxs("div",{style:{padding:o.spacing.sm,background:n.accent+"10",border:`1px solid ${n.border}`,marginBottom:o.spacing.md,fontSize:11},children:[e.jsx("div",{style:{fontWeight:600,marginBottom:o.spacing.xs},children:"Preview:"}),e.jsxs("div",{children:["Non-existent tables: ",y.non_existent_tables||0]}),e.jsxs("div",{children:["Orphaned tables: ",y.orphaned_tables||0]}),e.jsxs("div",{children:["Old logs: ",y.old_logs||0]}),e.jsxs("div",{children:["Orphaned governance: ",y.orphaned_governance||0]}),e.jsxs("div",{children:["Orphaned quality: ",y.orphaned_quality||0]}),e.jsxs("div",{children:["Orphaned maintenance: ",y.orphaned_maintenance||0]}),e.jsxs("div",{children:["Orphaned lineage: ",y.orphaned_lineage||0]})]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:o.spacing.xs},children:[e.jsx(h,{label:"Clean Non-Existent Tables",onClick:()=>f("non-existent-tables"),disabled:u,variant:"ghost"}),e.jsx(h,{label:"Clean Orphaned Tables",onClick:()=>f("orphaned-tables"),disabled:u,variant:"ghost"}),e.jsx(h,{label:"Clean Old Logs",onClick:()=>f("old-logs"),disabled:u,variant:"ghost"}),e.jsx(h,{label:"Clean Orphaned Governance",onClick:()=>f("orphaned-governance"),disabled:u,variant:"ghost"}),e.jsx(h,{label:"Clean Orphaned Quality",onClick:()=>f("orphaned-quality"),disabled:u,variant:"ghost"}),e.jsx(h,{label:"Clean Orphaned Maintenance",onClick:()=>f("orphaned-maintenance"),disabled:u,variant:"ghost"}),e.jsx(h,{label:"Clean Orphaned Lineage",onClick:()=>f("orphaned-lineage"),disabled:u,variant:"ghost"}),e.jsx(h,{label:"Clean All",onClick:()=>f("all"),disabled:u,variant:"primary"})]})]})},ye=()=>{const{filters:i,setFilter:u}=ee({maintenance_type:"",status:"",db_engine:""}),[k,F]=m.useState(!0),[C,y]=m.useState(null),[_,E]=m.useState([]),[f,b]=m.useState({}),[t,A]=m.useState(null),[j,z]=m.useState("pending"),[L,s]=m.useState(!1),r=m.useRef(!0),l=m.useCallback(async()=>{if(!r.current)return;const a=Date.now(),d=300;try{F(!0),y(null);let $=i.status;!$&&j!=="all"&&($=j==="pending"?"PENDING":j==="completed"?"COMPLETED":"");const[K,X]=await Promise.all([M.getMaintenanceItems({page:1,limit:1e3,maintenance_type:i.maintenance_type,db_engine:i.db_engine,status:$}),M.getMetrics()]),H=Date.now()-a,V=Math.max(0,d-H);await new Promise(Z=>setTimeout(Z,V)),r.current&&(E(K.data||[]),b(X||{}))}catch($){r.current&&y(P($))}finally{r.current&&F(!1)}},[i.maintenance_type,i.db_engine,i.status,j]);m.useEffect(()=>{r.current=!0,l();const a=setInterval(()=>{r.current&&l()},3e4);return()=>{r.current=!1,clearInterval(a)}},[l]);const x=m.useCallback(a=>{A(d=>(d==null?void 0:d.id)===a.id?null:a)},[]),c=m.useCallback(a=>{if(a==null)return"N/A";const d=Number(a);return isNaN(d)?"N/A":d<1?`${(d*1024).toFixed(2)} KB`:d<1024?`${d.toFixed(2)} MB`:`${(d/1024).toFixed(2)} GB`},[]),p=m.useCallback(a=>a?new Date(a).toLocaleString():"N/A",[]),w=m.useCallback(a=>{if(a==null)return"N/A";const d=Number(a);return isNaN(d)?"N/A":d<60?`${d.toFixed(2)}s`:d<3600?`${(d/60).toFixed(2)}m`:`${(d/3600).toFixed(2)}h`},[]),N=m.useCallback((a,d)=>{u(a,d)},[u]),D=a=>{switch(a){case"PENDING":return n.muted;case"RUNNING":return n.accent;case"COMPLETED":return n.accent;case"FAILED":return n.foreground;case"SKIPPED":return n.muted;default:return n.muted}};return k&&_.length===0?e.jsx(ne,{variant:"list",panels:6}):e.jsxs(J,{children:[e.jsx("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:o.spacing.lg,paddingBottom:o.spacing.md,borderBottom:`2px solid ${n.accent}`},children:e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:n.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:n.accent,marginRight:o.spacing.sm},children:g.blockFull}),"MAINTENANCE"]})}),C&&e.jsx("div",{style:{marginBottom:o.spacing.md},children:e.jsx(B,{title:"ERROR",children:e.jsx("div",{style:{padding:o.spacing.sm,color:n.foreground,fontSize:12,fontFamily:"Consolas",backgroundColor:n.backgroundSoft,borderRadius:2},children:C})})}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:o.spacing.md,marginBottom:o.spacing.lg},children:[{title:"STATUS",rows:[{label:"Total Pending",value:String(f.total_pending??0)},{label:"Total Completed",value:String(f.total_completed??0)},{label:"Total Failed",value:String(f.total_failed??0)}]},{title:"RECLAIMED & IMPACT",rows:[{label:"Space Reclaimed",value:c(f.total_space_reclaimed_mb)},{label:"Avg Impact Score",value:f.avg_impact_score!=null?Number(f.avg_impact_score).toFixed(1):"N/A"},{label:"Objects Improved",value:String(f.objects_improved??0)}]}].map(a=>e.jsxs("div",{style:{backgroundColor:n.background,border:`1px solid ${n.border}`,borderRadius:4,overflow:"hidden",fontFamily:"Consolas"},children:[e.jsxs("div",{style:{padding:`${o.spacing.sm} ${o.spacing.md}`,borderBottom:`1px solid ${n.border}`},children:[e.jsx("span",{style:{display:"inline-block",width:8,height:8,backgroundColor:n.accent,marginRight:o.spacing.sm,verticalAlign:"middle"}}),e.jsx("span",{style:{fontSize:12,fontWeight:700,color:n.foreground,textTransform:"uppercase",letterSpacing:.3},children:a.title})]}),e.jsx("div",{style:{padding:o.spacing.sm},children:a.rows.map((d,$)=>e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:o.spacing.sm,padding:`${o.spacing.xs} ${o.spacing.sm}`,borderBottom:$<a.rows.length-1?`1px solid ${n.border}`:"none"},children:[e.jsx("span",{style:{fontSize:12,color:n.muted,flex:"1 1 auto",minWidth:0},children:d.label}),e.jsx("span",{style:{fontSize:14,fontWeight:600,color:n.accent,flexShrink:0},children:d.value})]},d.label))})]},a.title))}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:o.spacing.sm,marginBottom:o.spacing.md,borderBottom:`1px solid ${n.border}`,paddingBottom:o.spacing.sm},children:[e.jsxs("div",{style:{display:"flex",gap:o.spacing.sm},children:[e.jsx(h,{label:`Pending (${f.total_pending||0})`,onClick:()=>z("pending"),variant:j==="pending"?"primary":"ghost"}),e.jsx(h,{label:`Completed (${f.total_completed||0})`,onClick:()=>z("completed"),variant:j==="completed"?"primary":"ghost"}),e.jsx(h,{label:"All",onClick:()=>z("all"),variant:j==="all"?"primary":"ghost"}),e.jsx(h,{label:"Catalog Cleaner",onClick:()=>z("cleaner"),variant:j==="cleaner"?"primary":"ghost"})]}),e.jsx(h,{label:"Maintenance Info",onClick:()=>s(!0),variant:"ghost"})]}),L&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>s(!1),children:e.jsxs("div",{style:{width:"90%",maxWidth:1e3,maxHeight:"90vh",overflowY:"auto"},onClick:a=>a.stopPropagation(),children:[e.jsx("style",{children:`
              div[style*="overflowY"]::-webkit-scrollbar {
                width: 0px;
                display: none;
              }
              div[style*="overflowY"] {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}),e.jsx(B,{title:"MAINTENANCE PLAYBOOK",children:e.jsxs("div",{style:{padding:o.spacing.md,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:o.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:n.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:[g.blockFull," OVERVIEW"]}),e.jsx("div",{style:{color:n.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Database maintenance operations are automated tasks that optimize database performance, reclaim storage space, and ensure data integrity. The system automatically detects maintenance needs and executes operations based on configured thresholds and schedules."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:n.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:[g.blockFull," MAINTENANCE TYPES"]}),e.jsxs("div",{style:{marginLeft:o.spacing.md},children:[e.jsxs("div",{style:{marginBottom:o.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:n.accent,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:[g.blockSemi," VACUUM"]}),e.jsx("div",{style:{color:n.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Reclaims storage space by removing dead tuples (deleted or updated rows) and updating statistics. Essential for PostgreSQL to prevent table bloat and maintain query performance. Can be run in FULL mode (locks table) or regular mode (concurrent)."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:n.accent,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:[g.blockSemi," ANALYZE"]}),e.jsx("div",{style:{color:n.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Updates table statistics used by the query planner to generate optimal execution plans. Analyzes column distributions, null counts, and value frequencies. Should be run regularly after significant data changes."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:n.accent,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:[g.blockSemi," REINDEX"]}),e.jsx("div",{style:{color:n.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Rebuilds indexes to eliminate fragmentation and improve index efficiency. Useful when indexes become bloated or fragmented over time. Can reclaim significant space and improve query performance."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:n.accent,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:[g.blockSemi," CLUSTER"]}),e.jsx("div",{style:{color:n.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Physically reorders table data according to an index, improving sequential scan performance. Requires exclusive lock and can be time-consuming for large tables. Best used for tables with sequential access patterns."})]})]})]}),e.jsxs("div",{style:{marginBottom:o.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:n.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:[g.blockFull," METRICS EXPLAINED"]}),e.jsxs("div",{style:{marginLeft:o.spacing.md},children:[e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:n.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Impact Score (0-100)"}),e.jsx("div",{style:{color:n.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Calculated based on space reclaimed (40%), performance improvement (40%), and fragmentation reduction (20%). Higher scores indicate more significant maintenance benefits."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:n.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Space Reclaimed"}),e.jsx("div",{style:{color:n.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Storage space freed up after maintenance operations. Includes dead tuples removed, index bloat eliminated, and fragmentation reduced."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:n.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Performance Improvement"}),e.jsx("div",{style:{color:n.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Percentage improvement in query performance after maintenance. Measured by comparing query execution times before and after maintenance operations."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:n.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Fragmentation"}),e.jsx("div",{style:{color:n.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Percentage of table/index space that is fragmented. Lower fragmentation means better data locality and improved sequential access performance."})]})]})]}),e.jsxs("div",{style:{marginBottom:o.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:n.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:[g.blockFull," STATUS TYPES"]}),e.jsxs("div",{style:{marginLeft:o.spacing.md},children:[e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("span",{style:{color:n.muted,fontWeight:600,fontFamily:"Consolas"},children:"PENDING"}),e.jsx("span",{style:{color:n.foreground,marginLeft:o.spacing.sm,fontFamily:"Consolas"},children:"Maintenance detected but not yet executed"})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("span",{style:{color:n.accent,fontWeight:600,fontFamily:"Consolas"},children:"RUNNING"}),e.jsx("span",{style:{color:n.foreground,marginLeft:o.spacing.sm,fontFamily:"Consolas"},children:"Maintenance operation currently in progress"})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("span",{style:{color:n.accent,fontWeight:600,fontFamily:"Consolas"},children:"COMPLETED"}),e.jsx("span",{style:{color:n.foreground,marginLeft:o.spacing.sm,fontFamily:"Consolas"},children:"Maintenance successfully finished"})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("span",{style:{color:n.foreground,fontWeight:600,fontFamily:"Consolas"},children:"FAILED"}),e.jsx("span",{style:{color:n.foreground,marginLeft:o.spacing.sm,fontFamily:"Consolas"},children:"Maintenance operation encountered an error"})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("span",{style:{color:n.muted,fontWeight:600,fontFamily:"Consolas"},children:"SKIPPED"}),e.jsx("span",{style:{color:n.foreground,marginLeft:o.spacing.sm,fontFamily:"Consolas"},children:"Maintenance was skipped (disabled or below threshold)"})]})]})]}),e.jsxs("div",{style:{marginTop:o.spacing.md,padding:o.spacing.sm,background:n.backgroundSoft,borderRadius:2,border:`1px solid ${n.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:n.muted,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:[g.blockSemi," Note"]}),e.jsx("div",{style:{fontSize:11,color:n.foreground,fontFamily:"Consolas"},children:"Maintenance operations can be configured with auto-execute enabled/disabled, custom thresholds, and schedules. The system monitors database health and automatically detects when maintenance is needed based on fragmentation, dead tuple counts, and performance metrics."})]}),e.jsx("div",{style:{marginTop:o.spacing.md,textAlign:"right"},children:e.jsx(h,{label:"Close",onClick:()=>s(!1),variant:"ghost"})})]})})]})}),e.jsx(B,{title:"FILTERS",children:e.jsxs("div",{style:{display:"flex",gap:o.spacing.sm,flexWrap:"wrap"},children:[e.jsxs("select",{value:i.maintenance_type,onChange:a=>N("maintenance_type",a.target.value),style:{padding:`${o.spacing.xs} ${o.spacing.sm}`,border:`1px solid ${n.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:n.background,color:n.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:a=>{a.target.style.borderColor=n.accent,a.target.style.outline=`2px solid ${n.accent}`,a.target.style.outlineOffset="2px"},onBlur:a=>{a.target.style.borderColor=n.border,a.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Types"}),e.jsx("option",{value:"VACUUM",children:"VACUUM"}),e.jsx("option",{value:"ANALYZE",children:"ANALYZE"}),e.jsx("option",{value:"REINDEX",children:"REINDEX"}),e.jsx("option",{value:"CLUSTER",children:"CLUSTER"})]}),e.jsxs("select",{value:i.db_engine,onChange:a=>N("db_engine",a.target.value),style:{padding:`${o.spacing.xs} ${o.spacing.sm}`,border:`1px solid ${n.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:n.background,color:n.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:a=>{a.target.style.borderColor=n.accent,a.target.style.outline=`2px solid ${n.accent}`,a.target.style.outlineOffset="2px"},onBlur:a=>{a.target.style.borderColor=n.border,a.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Engines"}),e.jsx("option",{value:"PostgreSQL",children:"PostgreSQL"}),e.jsx("option",{value:"MariaDB",children:"MariaDB"}),e.jsx("option",{value:"MSSQL",children:"MSSQL"}),e.jsx("option",{value:"MongoDB",children:"MongoDB"}),e.jsx("option",{value:"Oracle",children:"Oracle"}),e.jsx("option",{value:"DB2",children:"DB2"}),e.jsx("option",{value:"Salesforce",children:"Salesforce"}),e.jsx("option",{value:"SAP",children:"SAP"}),e.jsx("option",{value:"Teradata",children:"Teradata"}),e.jsx("option",{value:"Netezza",children:"Netezza"}),e.jsx("option",{value:"Hive",children:"Hive"}),e.jsx("option",{value:"Cassandra",children:"Cassandra"}),e.jsx("option",{value:"DynamoDB",children:"DynamoDB"}),e.jsx("option",{value:"AS400",children:"AS/400"}),e.jsx("option",{value:"S3",children:"S3"}),e.jsx("option",{value:"AzureBlob",children:"Azure Blob"}),e.jsx("option",{value:"GCS",children:"Google Cloud Storage"}),e.jsx("option",{value:"FTP",children:"FTP"}),e.jsx("option",{value:"SFTP",children:"SFTP"}),e.jsx("option",{value:"Email",children:"Email"}),e.jsx("option",{value:"SOAP",children:"SOAP"}),e.jsx("option",{value:"GraphQL",children:"GraphQL"}),e.jsx("option",{value:"Excel",children:"Excel"}),e.jsx("option",{value:"FixedWidth",children:"Fixed Width"}),e.jsx("option",{value:"EBCDIC",children:"EBCDIC"}),e.jsx("option",{value:"XML",children:"XML"}),e.jsx("option",{value:"Avro",children:"Avro"}),e.jsx("option",{value:"Parquet",children:"Parquet"}),e.jsx("option",{value:"ORC",children:"ORC"}),e.jsx("option",{value:"Compressed",children:"Compressed"})]}),e.jsxs("select",{value:i.status,onChange:a=>N("status",a.target.value),style:{padding:`${o.spacing.xs} ${o.spacing.sm}`,border:`1px solid ${n.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:n.background,color:n.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:a=>{a.target.style.borderColor=n.accent,a.target.style.outline=`2px solid ${n.accent}`,a.target.style.outlineOffset="2px"},onBlur:a=>{a.target.style.borderColor=n.border,a.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Status"}),e.jsx("option",{value:"PENDING",children:"PENDING"}),e.jsx("option",{value:"RUNNING",children:"RUNNING"}),e.jsx("option",{value:"COMPLETED",children:"COMPLETED"}),e.jsx("option",{value:"FAILED",children:"FAILED"}),e.jsx("option",{value:"SKIPPED",children:"SKIPPED"})]})]})}),j==="cleaner"?e.jsx(me,{onCleanupComplete:l}):e.jsxs("div",{style:{display:"grid",gridTemplateColumns:t?"1fr 400px":"1fr",gap:o.spacing.md},children:[e.jsx(ce,{items:_,onItemClick:x}),t&&e.jsx(B,{title:"MAINTENANCE DETAILS",children:e.jsxs("div",{style:{position:"sticky",top:o.spacing.sm,maxHeight:"calc(100vh - 200px)",overflowY:"auto",fontFamily:"Consolas",fontSize:12},children:[e.jsx("style",{children:`
                div[style*="overflowY"]::-webkit-scrollbar {
                  width: 0px;
                  display: none;
                }
                div[style*="overflowY"] {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
              `}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:o.spacing.sm},children:[e.jsxs("div",{children:[e.jsx("div",{style:{color:n.muted,fontSize:11,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Type:"}),e.jsx("div",{children:e.jsx("span",{style:{padding:`${o.spacing.xs} ${o.spacing.sm}`,borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:n.backgroundSoft,color:n.foreground,border:`1px solid ${n.border}`},children:t.maintenance_type||"N/A"})})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:n.muted,fontSize:11,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Engine:"}),e.jsx("div",{style:{color:n.foreground,fontFamily:"Consolas"},children:t.db_engine||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:n.muted,fontSize:11,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Schema:"}),e.jsx("div",{style:{color:n.foreground,fontFamily:"Consolas"},children:t.schema_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:n.muted,fontSize:11,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Object:"}),e.jsx("div",{style:{color:n.foreground,fontFamily:"Consolas"},children:t.object_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:n.muted,fontSize:11,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Status:"}),e.jsx("div",{children:e.jsx("span",{style:{padding:`${o.spacing.xs} ${o.spacing.sm}`,borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:t.status?D(t.status)+"20":n.backgroundSoft,color:t.status?D(t.status):n.foreground,border:`1px solid ${t.status?D(t.status):n.border}`},children:t.status||"N/A"})})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:n.muted,fontSize:11,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Priority:"}),e.jsx("div",{style:{color:n.foreground,fontFamily:"Consolas"},children:t.priority||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:n.muted,fontSize:11,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Impact Score:"}),e.jsx("div",{style:{color:n.foreground,fontFamily:"Consolas"},children:t.impact_score?Number(t.impact_score).toFixed(1):"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:n.muted,fontSize:11,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Space Reclaimed:"}),e.jsx("div",{style:{color:n.foreground,fontFamily:"Consolas"},children:c(t.space_reclaimed_mb)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:n.muted,fontSize:11,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Duration:"}),e.jsx("div",{style:{color:n.foreground,fontFamily:"Consolas"},children:w(t.maintenance_duration_seconds)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:n.muted,fontSize:11,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Last Run:"}),e.jsx("div",{style:{color:n.foreground,fontSize:11,fontFamily:"Consolas"},children:p(t.last_maintenance_date)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:n.muted,fontSize:11,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Next Run:"}),e.jsx("div",{style:{color:n.foreground,fontSize:11,fontFamily:"Consolas"},children:p(t.next_maintenance_date)})]}),e.jsxs("div",{style:{borderTop:`1px solid ${n.border}`,paddingTop:o.spacing.sm,marginTop:o.spacing.sm},children:[e.jsx("div",{style:{color:n.muted,fontSize:11,marginBottom:o.spacing.sm,fontWeight:600,fontFamily:"Consolas"},children:"Configuration:"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:o.spacing.sm,marginBottom:o.spacing.sm},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:n.muted,fontFamily:"Consolas"},children:"Object Type"}),e.jsx("div",{style:{fontWeight:600,color:n.foreground,fontFamily:"Consolas"},children:t.object_type||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:n.muted,fontFamily:"Consolas"},children:"Auto Execute"}),e.jsx("div",{style:{fontWeight:600,color:n.foreground,fontFamily:"Consolas"},children:t.auto_execute?"Yes":"No"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:n.muted,fontFamily:"Consolas"},children:"Enabled"}),e.jsx("div",{style:{fontWeight:600,color:n.foreground,fontFamily:"Consolas"},children:t.enabled?"Yes":"No"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:n.muted,fontFamily:"Consolas"},children:"Maintenance Count"}),e.jsx("div",{style:{fontWeight:600,color:n.foreground,fontFamily:"Consolas"},children:t.maintenance_count||0})]}),t.server_name&&e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:n.muted,fontFamily:"Consolas"},children:"Server Name"}),e.jsx("div",{style:{fontWeight:600,color:n.foreground,fontFamily:"Consolas"},children:t.server_name})]}),t.database_name&&e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:n.muted,fontFamily:"Consolas"},children:"Database Name"}),e.jsx("div",{style:{fontWeight:600,color:n.foreground,fontFamily:"Consolas"},children:t.database_name})]})]})]}),(t.fragmentation_before!==null||t.fragmentation_after!==null||t.dead_tuples_before!==null||t.dead_tuples_after!==null||t.table_size_before_mb!==null||t.table_size_after_mb!==null||t.index_size_before_mb!==null||t.index_size_after_mb!==null||t.query_performance_before!==null||t.query_performance_after!==null)&&e.jsxs("div",{style:{borderTop:`1px solid ${n.border}`,paddingTop:o.spacing.sm,marginTop:o.spacing.sm},children:[e.jsx("div",{style:{color:n.muted,fontSize:11,marginBottom:o.spacing.sm,fontWeight:600,fontFamily:"Consolas"},children:"Before/After Metrics:"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:o.spacing.sm},children:[t.fragmentation_before!==null&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:n.muted,fontFamily:"Consolas"},children:"Fragmentation Before"}),e.jsxs("div",{style:{fontWeight:600,color:n.foreground,fontFamily:"Consolas"},children:[Number(t.fragmentation_before).toFixed(2),"%"]})]}),t.fragmentation_after!==null&&e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:n.muted,fontFamily:"Consolas"},children:"Fragmentation After"}),e.jsxs("div",{style:{fontWeight:600,color:n.accent,fontFamily:"Consolas"},children:[Number(t.fragmentation_after).toFixed(2),"%"]})]})]}),t.dead_tuples_before!==null&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:n.muted,fontFamily:"Consolas"},children:"Dead Tuples Before"}),e.jsx("div",{style:{fontWeight:600,color:n.foreground,fontFamily:"Consolas"},children:Number(t.dead_tuples_before).toLocaleString()})]}),t.dead_tuples_after!==null&&e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:n.muted,fontFamily:"Consolas"},children:"Dead Tuples After"}),e.jsx("div",{style:{fontWeight:600,color:n.accent,fontFamily:"Consolas"},children:Number(t.dead_tuples_after).toLocaleString()})]})]}),t.table_size_before_mb!==null&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:n.muted,fontFamily:"Consolas"},children:"Table Size Before"}),e.jsx("div",{style:{fontWeight:600,color:n.foreground,fontFamily:"Consolas"},children:c(t.table_size_before_mb)})]}),t.table_size_after_mb!==null&&e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:n.muted,fontFamily:"Consolas"},children:"Table Size After"}),e.jsx("div",{style:{fontWeight:600,color:n.accent,fontFamily:"Consolas"},children:c(t.table_size_after_mb)})]})]}),t.index_size_before_mb!==null&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:n.muted,fontFamily:"Consolas"},children:"Index Size Before"}),e.jsx("div",{style:{fontWeight:600,color:n.foreground,fontFamily:"Consolas"},children:c(t.index_size_before_mb)})]}),t.index_size_after_mb!==null&&e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:n.muted,fontFamily:"Consolas"},children:"Index Size After"}),e.jsx("div",{style:{fontWeight:600,color:n.accent,fontFamily:"Consolas"},children:c(t.index_size_after_mb)})]})]}),t.query_performance_before!==null&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:n.muted,fontFamily:"Consolas"},children:"Query Performance Before"}),e.jsxs("div",{style:{fontWeight:600,color:n.foreground,fontFamily:"Consolas"},children:[Number(t.query_performance_before).toFixed(2),"ms"]})]}),t.query_performance_after!==null&&e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:n.muted,fontFamily:"Consolas"},children:"Query Performance After"}),e.jsxs("div",{style:{fontWeight:600,color:n.accent,fontFamily:"Consolas"},children:[Number(t.query_performance_after).toFixed(2),"ms"]})]})]})]})]}),e.jsxs("div",{style:{borderTop:`1px solid ${n.border}`,paddingTop:o.spacing.sm,marginTop:o.spacing.sm},children:[e.jsx("div",{style:{color:n.muted,fontSize:11,marginBottom:o.spacing.sm,fontWeight:600,fontFamily:"Consolas"},children:"Timestamps:"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:o.spacing.sm},children:[t.first_detected_date&&e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:n.muted,fontFamily:"Consolas"},children:"First Detected"}),e.jsx("div",{style:{fontWeight:600,color:n.foreground,fontSize:11,fontFamily:"Consolas"},children:p(t.first_detected_date)})]}),t.last_checked_date&&e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,color:n.muted,fontFamily:"Consolas"},children:"Last Checked"}),e.jsx("div",{style:{fontWeight:600,color:n.foreground,fontSize:11,fontFamily:"Consolas"},children:p(t.last_checked_date)})]})]})]}),t.result_message&&e.jsxs("div",{style:{borderTop:`1px solid ${n.border}`,paddingTop:o.spacing.sm,marginTop:o.spacing.sm},children:[e.jsx("div",{style:{color:n.muted,fontSize:11,marginBottom:o.spacing.sm,fontWeight:600,fontFamily:"Consolas"},children:"Result Message:"}),e.jsx("div",{style:{padding:o.spacing.sm,background:n.backgroundSoft,borderRadius:2,border:`1px solid ${n.border}`,fontSize:11,color:n.foreground,fontFamily:"Consolas"},children:t.result_message})]}),t.error_details&&e.jsxs("div",{style:{borderTop:`1px solid ${n.border}`,paddingTop:o.spacing.sm,marginTop:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:11,color:n.foreground,marginBottom:o.spacing.xs,fontWeight:600,fontFamily:"Consolas"},children:"Error Details"}),e.jsx("div",{style:{padding:o.spacing.sm,background:n.backgroundSoft,borderRadius:2,border:`1px solid ${n.border}`,fontSize:11,color:n.foreground,fontFamily:"Consolas"},children:t.error_details})]})]})]})})]})]})};export{ye as default};
