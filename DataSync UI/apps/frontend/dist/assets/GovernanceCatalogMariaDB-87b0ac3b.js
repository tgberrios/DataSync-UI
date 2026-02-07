import{m as K,f as v,b as o,r as i,j as e,e as u,T as _,C as ye,t as n,o as be,P as ve,p as oe}from"./index-f6ac47b8.js";import{u as je}from"./usePagination-c6b4a268.js";import{u as Ce}from"./useTableFilters-7bb371e7.js";import{e as te}from"./errorHandler-5ea9ae85.js";import{s as ne}from"./validation-24839588.js";import{A as y}from"./AsciiPanel-5614714e.js";import{A as z}from"./AsciiButton-4907e65e.js";import{G as Se}from"./GovernanceCatalogCharts-dba3db5c.js";import{S as Fe}from"./SkeletonLoader-792007e7.js";const _e=K`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,re=v.div`
  font-family: Consolas;
  font-size: 12px;
  background: ${o.background};
  border: 1px solid ${o.border};
  border-radius: 2px;
  padding: 16px;
  max-height: 800px;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${o.backgroundSoft};
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${o.border};
    border-radius: 2px;
    transition: background 0.2s ease;
    
    &:hover {
      background: ${o.accent};
    }
  }
`,ze=v.div`
  user-select: none;
  animation: ${_e} 0.3s ease-out;
  margin-bottom: 2px;
`,Be=v.span`
  color: ${o.muted};
  margin-right: 6px;
  font-family: Consolas;
  font-size: 12px;
  transition: color 0.2s ease;
`,$e=v.div`
  display: flex;
  align-items: center;
  padding: ${s=>s.$level===0?"8px":"6px 8px"};
  padding-left: ${s=>s.$level*24+8}px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.2s ease;
  position: relative;
  margin: 2px 0;
  font-family: Consolas;
  font-size: 12px;
  
  background: transparent;
  
  ${s=>s.$nodeType==="schema"?`
        border: 1px solid transparent;
        border-left: 3px solid ${o.accent};
        font-weight: 600;
        
        &:hover {
          background: ${o.backgroundSoft};
          border-color: ${o.accent};
          transform: translateX(4px);
        }
      `:`
      &:hover {
        background: ${o.backgroundSoft};
        transform: translateX(4px);
      }
    `}
`,ke=v.div`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  border-radius: 2px;
  background: ${s=>s.$isExpanded?o.accent:o.backgroundSoft};
  color: ${s=>s.$isExpanded?"#ffffff":o.accent};
  font-size: 10px;
  font-weight: bold;
  font-family: Consolas;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.1);
  }
`,we=v.span`
  flex: 1;
  font-family: Consolas;
  font-size: ${s=>s.$isSchema?"13px":"12px"};
  color: ${s=>s.$isSchema?o.accent:o.foreground};
  font-weight: ${s=>s.$isSchema?600:500};
  margin-right: 8px;
`,Te=v.span`
  padding: 2px 8px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 500;
  font-family: Consolas;
  background: ${o.backgroundSoft};
  color: ${o.foreground};
  border: 1px solid ${o.border};
  margin-left: auto;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${o.accentLight};
    border-color: ${o.accent};
    color: ${o.accent};
    transform: translateY(-1px);
  }
`,Ne=v.div`
  max-height: ${s=>s.$isExpanded?"10000px":"0"};
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`,Ae=v.div`
  padding: 8px;
  padding-left: ${s=>(s.$level||0)*24+36}px;
  margin: 2px 0;
  border-radius: 2px;
  background: transparent;
  border: 1px solid ${o.border};
  transition: all 0.2s ease;
  cursor: pointer;
  font-family: Consolas;
  font-size: 12px;
  
  &:hover {
    background: ${o.backgroundSoft};
    border-color: ${o.accent};
    transform: translateX(4px);
  }
`,N=s=>{if(!s)return o.muted;switch(s){case"HEALTHY":case"EXCELLENT":return o.success;case"WARNING":return o.warning;case"CRITICAL":return o.danger;case"REAL_TIME":case"HIGH":return o.accent;case"MEDIUM":return o.accentSoft;case"LOW":case"RARE":return o.muted;default:return o.muted}},Re=({items:s,onItemClick:b})=>{const[h,q]=i.useState(new Set),a=i.useMemo(()=>{const r=new Map;return s.forEach(d=>{const c=d.schema_name||"default";r.has(c)||r.set(c,{name:c,objects:[]}),r.get(c).objects.push(d)}),Array.from(r.values()).sort((d,c)=>d.name.localeCompare(c.name))},[s]),A=r=>{q(d=>{const c=new Set(d);return c.has(r)?c.delete(r):c.add(r),c})},D=(r,d)=>{if(r===0)return null;const c=[];for(let p=0;p<r-1;p++)c.push("│  ");return c.push(d?"└─ ":"├─ "),e.jsx(Be,{$isLast:d,children:c.join("")})},j=r=>{if(r==null)return"N/A";const d=Number(r);return isNaN(d)?"N/A":d.toLocaleString()},H=r=>{if(r==null)return"N/A";const d=Number(r);return isNaN(d)?"N/A":d<1?`${(d*1024).toFixed(2)} KB`:`${d.toFixed(2)} MB`},B=(r,d)=>{const c=h.has(r.name),R=a.findIndex(E=>E.name===r.name)===a.length-1;return e.jsxs(ze,{children:[e.jsxs($e,{$level:d,$isExpanded:c,$nodeType:"schema",onClick:()=>A(r.name),children:[D(d,R),e.jsx(ke,{$isExpanded:c,children:c?u.arrowDown:u.arrowRight}),e.jsx("span",{style:{marginRight:"8px",color:o.accent,fontFamily:"Consolas"},children:u.blockFull}),e.jsx(we,{$isSchema:!0,children:r.name}),e.jsxs(Te,{children:[r.objects.length," ",r.objects.length===1?"object":"objects"]})]}),e.jsx(Ne,{$isExpanded:c,$level:d,children:c&&r.objects.map((E,C)=>L(E,r.name,d+1,C===r.objects.length-1))})]},r.name)},L=(r,d,c,p)=>e.jsxs(Ae,{$level:c,onClick:()=>b==null?void 0:b(r),children:[D(c,p),e.jsx("span",{style:{marginRight:"8px",color:o.muted,fontFamily:"Consolas"},children:u.blockFull}),e.jsx("span",{style:{marginRight:"8px",fontWeight:500,color:o.foreground,fontFamily:"Consolas"},children:r.object_name||"N/A"}),r.object_type&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:o.backgroundSoft,color:o.foreground,border:`1px solid ${o.border}`,marginRight:4},children:r.object_type}),r.health_status&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:N(r.health_status)+"20",color:N(r.health_status),border:`1px solid ${N(r.health_status)}`,marginRight:4},children:r.health_status}),r.access_frequency&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:N(r.access_frequency)+"20",color:N(r.access_frequency),border:`1px solid ${N(r.access_frequency)}`,marginRight:4},children:r.access_frequency}),e.jsxs("span",{style:{marginLeft:"auto",color:o.muted,fontSize:11,fontFamily:"Consolas"},children:[j(r.row_count)," rows ",u.bullet," ",H(r.table_size_mb)]})]},r.id);return a.length===0?e.jsx(re,{children:e.jsxs("div",{style:{padding:"60px 40px",textAlign:"center",color:o.muted,fontFamily:"Consolas"},children:[e.jsx("div",{style:{fontSize:48,marginBottom:16,fontFamily:"Consolas",opacity:.5},children:u.blockFull}),e.jsx("div",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,marginBottom:8,color:o.foreground},children:"No governance data available"}),e.jsx("div",{style:{fontSize:12,fontFamily:"Consolas",opacity:.7,color:o.muted},children:"Data will appear here once collected."})]})}):e.jsx(re,{children:a.map(r=>B(r,0))})};K`
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
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;const X=s=>{if(!s)return o.muted;switch(s){case"HEALTHY":case"EXCELLENT":return o.accent;case"WARNING":return o.muted;case"CRITICAL":return o.foreground;default:return o.muted}},Oe=()=>{const{page:s,limit:b,setPage:h,setLimit:q}=je(1,20,1e3),{filters:a,setFilter:A,clearFilters:D}=Ce({server_name:"",database_name:"",health_status:"",access_frequency:"",search:""}),[j,H]=i.useState(""),[B,L]=i.useState("desc"),[r,d]=i.useState(!0),[c,p]=i.useState(null),[R,E]=i.useState([]),[C,O]=i.useState({}),[$,U]=i.useState({total:0,totalPages:0,currentPage:1,limit:20}),[se,ae]=i.useState([]),[ie,J]=i.useState([]),[Q,le]=i.useState([]),[Z,ee]=i.useState(!0),[ce,Y]=i.useState(!1),[k,de]=i.useState("list"),[x,me]=i.useState(null),[w,M]=i.useState("overview"),g=i.useRef(!0);i.useCallback(async()=>{if(!g.current)return;const t=Date.now(),l=300;try{d(!0),p(null);const m=ne(a.search,100),[f,S,F]=await Promise.all([_.getMariaDBItems({page:s,limit:b,server_name:a.server_name,database_name:a.database_name,health_status:a.health_status,access_frequency:a.access_frequency,search:m}),_.getMariaDBMetrics(),_.getMariaDBServers()]),V=Date.now()-t,pe=Math.max(0,l-V);await new Promise(xe=>setTimeout(xe,pe)),g.current&&(E(f.data||[]),U(f.pagination||{total:0,totalPages:0,currentPage:1,limit:20}),O(S||{}),ae(F||[]))}catch(m){g.current&&p(te(m))}finally{g.current&&d(!1)}},[s,b,a.server_name,a.database_name,a.health_status,a.access_frequency,a.search]);const G=i.useCallback(async()=>{if(!g.current)return;const t=Date.now(),l=300;try{ee(!0),p(null);const m=ne(a.search,100),f=await _.getMariaDBItems({page:s,limit:b,server_name:a.server_name,database_name:a.database_name,health_status:a.health_status,access_frequency:a.access_frequency,search:m}),S=Date.now()-t,F=Math.max(0,l-S);await new Promise(V=>setTimeout(V,F)),g.current&&(le(f.data||[]),U(f.pagination||{total:0,totalPages:0,currentPage:1,limit:20}))}catch(m){g.current&&p(te(m))}finally{g.current&&ee(!1)}},[s,b,a.server_name,a.database_name,a.health_status,a.access_frequency,a.search]);i.useEffect(()=>{g.current=!0,(async()=>{await G();try{const m=await _.getMariaDBMetrics();g.current&&O(m||{})}catch(m){console.error("MariaDB: Error loading metrics:",m),g.current&&console.error("MariaDB: Error loading metrics:",m)}})();const l=setInterval(()=>{g.current&&(G(),_.getMariaDBMetrics().then(m=>{g.current&&O(m||{})}).catch(m=>{console.error("MariaDB: Error loading metrics in interval:",m)}))},3e4);return()=>{g.current=!1,clearInterval(l)}},[G]),i.useEffect(()=>{(async()=>{if(a.server_name&&g.current)try{const l=await _.getMariaDBDatabases(a.server_name);g.current&&J(l||[])}catch(l){g.current&&console.error("Error loading databases:",l)}else J([])})()},[a.server_name]);const ge=i.useCallback(t=>{t&&(me(l=>l&&t.id&&l.id===t.id?null:t),M("overview"))},[]),W=i.useCallback(t=>{if(t==null)return"N/A";const l=Number(t);return isNaN(l)?"N/A":l<1?`${(l*1024).toFixed(2)} KB`:`${l.toFixed(2)} MB`},[]),T=i.useCallback(t=>{if(t==null)return"N/A";const l=Number(t);return isNaN(l)?"N/A":l.toLocaleString()},[]),P=i.useCallback(t=>{if(t==null)return"N/A";const l=Number(t);return isNaN(l)?"N/A":`${l.toFixed(2)}%`},[]);i.useCallback(t=>t?new Date(t).toLocaleString():"N/A",[]);const I=i.useCallback((t,l)=>{A(t,l),t==="server_name"&&A("database_name",""),h(1)},[A,h]);i.useCallback(t=>{j===t?L(l=>l==="asc"?"desc":"asc"):(H(t),L("desc")),h(1)},[j,h]),i.useMemo(()=>j?[...R].sort((t,l)=>{let m=t[j],f=l[j];if(m==null&&(m=""),f==null&&(f=""),typeof m=="string"&&typeof f=="string")return B==="asc"?m.localeCompare(f):f.localeCompare(m);const S=Number(m),F=Number(f);return!isNaN(S)&&!isNaN(F)?B==="asc"?S-F:F-S:B==="asc"?String(m).localeCompare(String(f)):String(f).localeCompare(String(m))}):R,[R,j,B]);const fe=i.useCallback(t=>e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${o.border}`},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:"0 0 12px 0",paddingBottom:4,borderBottom:`2px solid ${o.accent}`},children:"Basic Information"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:[e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Server:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.server_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Database:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.database_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Schema:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.schema_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Table:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.table_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Health Status:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.health_status?e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:X(t.health_status)+"20",color:X(t.health_status),border:`1px solid ${X(t.health_status)}`},children:t.health_status}):"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Access Frequency:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.access_frequency||"N/A"})]})]})]}),e.jsxs("div",{style:{marginBottom:0},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:"0 0 12px 0",paddingBottom:4,borderBottom:`2px solid ${o.accent}`},children:"Storage"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:[e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Row Count:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:T(t.row_count)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Data Size:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:W(t.data_size_mb)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Index Size:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:W(t.index_size_mb)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Total Size:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:W(t.total_size_mb)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Fragmentation:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:P(t.fragmentation_pct)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Engine:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.engine||"N/A"})]})]})]})]}),[W,T,P]),ue=i.useCallback(t=>e.jsx("div",{children:e.jsxs("div",{style:{marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${o.border}`},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:"0 0 12px 0",paddingBottom:4,borderBottom:`2px solid ${o.accent}`},children:"Performance Metrics"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:[e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Table Reads:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:T(t.table_reads)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Table Writes:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:T(t.table_writes)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Index Reads:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:T(t.index_reads)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Fragmentation:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:P(t.fragmentation_pct)})]})]})]})}),[T,P]),he=i.useCallback(t=>e.jsx("div",{children:e.jsxs("div",{style:{marginBottom:0},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:"0 0 12px 0",paddingBottom:4,borderBottom:`2px solid ${o.accent}`},children:"Recommendations"}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Recommendation Summary:"}),e.jsx("div",{style:{whiteSpace:"pre-wrap",fontFamily:"Consolas",fontSize:12,color:o.foreground},children:t.recommendation_summary||"No recommendations available"})]})})]})}),[]);return Z&&Q.length===0?e.jsx(Fe,{variant:"table"}):e.jsxs(ye,{children:[e.jsx("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:n.spacing.lg,paddingBottom:n.spacing.md,borderBottom:`2px solid ${o.accent}`},children:e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:o.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:o.accent,marginRight:n.spacing.sm},children:u.blockFull}),"GOVERNANCE CATALOG - MARIADB"]})}),c&&e.jsx("div",{style:{marginBottom:n.spacing.md},children:e.jsx(y,{title:"ERROR",children:e.jsx("div",{style:{padding:n.spacing.sm,color:o.foreground,fontSize:12,fontFamily:"Consolas",backgroundColor:o.backgroundSoft,borderRadius:2},children:c})})}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:n.spacing.md,marginBottom:n.spacing.lg},children:[e.jsx(y,{title:"Total Tables",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:o.foreground},children:C.total_tables||0})}),e.jsx(y,{title:"Total Size",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:o.foreground},children:W(C.total_size_mb)})}),e.jsx(y,{title:"Healthy",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:o.foreground},children:C.healthy_count||0})}),e.jsx(y,{title:"Warning",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:o.foreground},children:C.warning_count||0})}),e.jsx(y,{title:"Critical",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:o.foreground},children:C.critical_count||0})}),e.jsx(y,{title:"Unique Servers",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:o.foreground},children:C.unique_servers||0})})]}),e.jsx(y,{title:"FILTERS",children:e.jsxs("div",{style:{display:"flex",gap:n.spacing.sm,flexWrap:"wrap",alignItems:"center"},children:[e.jsxs("select",{value:a.server_name,onChange:t=>I("server_name",t.target.value),style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Servers"}),se.map(t=>e.jsx("option",{value:t,children:t},t))]}),e.jsxs("select",{value:a.database_name,onChange:t=>I("database_name",t.target.value),disabled:!a.server_name,style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,opacity:a.server_name?1:.5,cursor:a.server_name?"pointer":"not-allowed",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{a.server_name&&(t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px")},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Databases"}),ie.map(t=>e.jsx("option",{value:t,children:t},t))]}),e.jsxs("select",{value:a.health_status,onChange:t=>I("health_status",t.target.value),style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Health Status"}),e.jsx("option",{value:"EXCELLENT",children:"Excellent"}),e.jsx("option",{value:"HEALTHY",children:"Healthy"}),e.jsx("option",{value:"WARNING",children:"Warning"}),e.jsx("option",{value:"CRITICAL",children:"Critical"})]}),e.jsxs("select",{value:a.access_frequency,onChange:t=>I("access_frequency",t.target.value),style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Access Frequency"}),e.jsx("option",{value:"REAL_TIME",children:"Real Time"}),e.jsx("option",{value:"HIGH",children:"High"}),e.jsx("option",{value:"MEDIUM",children:"Medium"}),e.jsx("option",{value:"LOW",children:"Low"}),e.jsx("option",{value:"RARE",children:"Rare"})]}),e.jsx("input",{type:"text",placeholder:"Search table name...",value:a.search,onChange:t=>I("search",t.target.value),style:{flex:1,minWidth:"200px",padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"}}),e.jsx(z,{label:"Reset All",onClick:()=>{D(),h(1)},variant:"ghost"})]})}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:n.spacing.lg,marginTop:n.spacing.sm,fontFamily:"Consolas",fontSize:12,gap:n.spacing.lg},children:[e.jsxs("div",{style:{display:"flex",gap:n.spacing.sm,alignItems:"center"},children:[e.jsx("label",{style:{color:o.muted,fontSize:11,fontFamily:"Consolas"},children:"Items per page:"}),e.jsxs("select",{value:b,onChange:t=>{q(Number(t.target.value)),h(1)},style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:10,children:"10"}),e.jsx("option",{value:20,children:"20"}),e.jsx("option",{value:50,children:"50"}),e.jsx("option",{value:100,children:"100"}),e.jsx("option",{value:200,children:"200"})]})]}),e.jsxs("div",{style:{display:"flex",gap:n.spacing.sm,alignItems:"center"},children:[e.jsx(z,{label:k==="list"?"Show Charts":"Show List",onClick:()=>de(k==="list"?"charts":"list"),variant:k==="charts"?"primary":"ghost"}),e.jsx(z,{label:"Metrics Info",onClick:()=>Y(!0),variant:"ghost"})]})]}),ce&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>Y(!1),children:e.jsxs("div",{style:{width:"90%",maxWidth:900,maxHeight:"90vh",overflowY:"auto"},onClick:t=>t.stopPropagation(),children:[e.jsx("style",{children:`
              div[style*="overflowY"]::-webkit-scrollbar {
                width: 0px;
                display: none;
              }
              div[style*="overflowY"] {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}),e.jsx(y,{title:"METRICS PLAYBOOK - MARIADB GOVERNANCE",children:e.jsxs("div",{style:{padding:n.spacing.md,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[u.blockFull," Total Tables"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Total number of tables cataloged across all MariaDB servers and databases in the governance system."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[u.blockFull," Total Size"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Combined storage size of all tables across all MariaDB databases. Includes data and index sizes."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[u.blockFull," Healthy"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Tables with HEALTHY status, indicating optimal performance, low fragmentation, and good access patterns."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.muted,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[u.blockFull," Warning"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Tables with WARNING status, indicating potential issues such as moderate fragmentation, suboptimal indexes, or performance concerns that should be monitored."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.foreground,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[u.blockFull," Critical"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Tables with CRITICAL status, indicating serious issues requiring immediate attention such as high fragmentation, missing indexes, or severe performance degradation."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[u.blockFull," Unique Servers"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Number of distinct MariaDB server instances being monitored in the governance catalog."})]}),e.jsxs("div",{style:{marginTop:n.spacing.md,padding:n.spacing.sm,background:o.backgroundSoft,borderRadius:2,border:`1px solid ${o.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:o.muted,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:[u.blockSemi," Note"]}),e.jsx("div",{style:{fontSize:11,color:o.foreground,fontFamily:"Consolas"},children:"These metrics are calculated in real-time from the data_governance_catalog_mariadb table and reflect the current state of your MariaDB governance catalog."})]}),e.jsx("div",{style:{marginTop:n.spacing.md,textAlign:"right"},children:e.jsx(z,{label:"Close",onClick:()=>Y(!1),variant:"ghost"})})]})})]})}),k==="charts"&&e.jsx(Se,{engine:"mariadb",selectedItem:x?{server_name:x.server_name,database_name:x.database_name,schema_name:x.schema_name,table_name:x.table_name}:null}),k==="list"&&Z?e.jsx(be,{children:"Loading tree view..."}):k==="list"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{display:"grid",gridTemplateColumns:x?"1fr 500px":"1fr",gap:n.spacing.md,marginTop:n.spacing.md},children:[e.jsx(Re,{items:Q,onItemClick:ge}),x&&e.jsxs("div",{style:{position:"sticky",top:n.spacing.md,maxHeight:"calc(100vh - 200px)",overflowY:"auto"},children:[e.jsx("style",{children:`
                  div[style*="overflowY"]::-webkit-scrollbar {
                    width: 0px;
                    display: none;
                  }
                  div[style*="overflowY"] {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                  }
                `}),e.jsxs(y,{title:"DETAILS",children:[e.jsxs("div",{style:{display:"flex",gap:n.spacing.xs,marginBottom:n.spacing.md,borderBottom:`1px solid ${o.border}`,paddingBottom:n.spacing.sm,flexWrap:"wrap"},children:[e.jsx(z,{label:"Overview",onClick:()=>M("overview"),variant:w==="overview"?"primary":"ghost"}),e.jsx(z,{label:"Performance",onClick:()=>M("performance"),variant:w==="performance"?"primary":"ghost"}),e.jsx(z,{label:"Recommendations",onClick:()=>M("recommendations"),variant:w==="recommendations"?"primary":"ghost"})]}),w==="overview"&&fe(x),w==="performance"&&ue(x),w==="recommendations"&&he(x)]})]})]}),$.totalPages>1&&e.jsx("div",{style:{marginTop:n.spacing.lg},children:e.jsxs(ve,{children:[e.jsx(oe,{onClick:()=>h(Math.max(1,s-1)),disabled:s===1,children:"Previous"}),e.jsxs("span",{style:{fontFamily:"Consolas",fontSize:12,color:o.foreground},children:["Page ",$.currentPage," of ",$.totalPages," (",$.total," total)"]}),e.jsx(oe,{onClick:()=>h(Math.min($.totalPages,s+1)),disabled:s===$.totalPages,children:"Next"})]})})]}):null]})};export{Oe as default};
