import{m as G,f as C,b as t,r as l,j as e,e as g,E as _,l as ge,P as he,n as J}from"./index-75d7470b.js";import{u as fe}from"./usePagination-b946ac42.js";import{u as xe}from"./useTableFilters-0b8dd77f.js";import{e as Q}from"./errorHandler-5ea9ae85.js";import{s as Z}from"./validation-24839588.js";import{A as b}from"./AsciiPanel-9f053981.js";import{A as R}from"./AsciiButton-446d8430.js";import{G as pe}from"./GovernanceCatalogCharts-9ed6ee71.js";import{S as be}from"./SkeletonLoader-530eacc4.js";const ye=G`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,ee=C.div`
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
`,ve=C.div`
  user-select: none;
  animation: ${ye} 0.3s ease-out;
  margin-bottom: 2px;
`,je=C.span`
  color: ${t.muted};
  margin-right: 6px;
  font-family: Consolas;
  font-size: 12px;
  transition: color 0.2s ease;
`,Ce=C.div`
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
        border-left: 3px solid ${t.accent};
        font-weight: 600;
        
        &:hover {
          background: ${t.backgroundSoft};
          border-color: ${t.accent};
          transform: translateX(4px);
        }
      `:`
      &:hover {
        background: ${t.backgroundSoft};
        transform: translateX(4px);
      }
    `}
`,Se=C.div`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  border-radius: 2px;
  background: ${s=>s.$isExpanded?t.accent:t.backgroundSoft};
  color: ${s=>s.$isExpanded?"#ffffff":t.accent};
  font-size: 10px;
  font-weight: bold;
  font-family: Consolas;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.1);
  }
`,_e=C.span`
  flex: 1;
  font-family: Consolas;
  font-size: ${s=>s.$isSchema?"13px":"12px"};
  color: ${s=>s.$isSchema?t.accent:t.foreground};
  font-weight: ${s=>s.$isSchema?600:500};
  margin-right: 8px;
`,ke=C.span`
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
`,we=C.div`
  max-height: ${s=>s.$isExpanded?"10000px":"0"};
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`,$e=C.div`
  padding: 8px;
  padding-left: ${s=>(s.$level||0)*24+36}px;
  margin: 2px 0;
  border-radius: 2px;
  background: ${t.background};
  border: 1px solid ${t.border};
  transition: all 0.2s ease;
  cursor: pointer;
  font-family: Consolas;
  font-size: 12px;
  
  &:hover {
    background: ${t.backgroundSoft};
    border-color: ${t.accent};
    transform: translateX(4px);
  }
`,z=s=>{if(!s)return t.muted;switch(s){case"HEALTHY":case"EXCELLENT":return t.success;case"WARNING":return t.warning;case"CRITICAL":return t.danger;case"REAL_TIME":case"HIGH":return t.accent;case"MEDIUM":return t.accentSoft;case"LOW":case"RARE":return t.muted;default:return t.muted}},ze=({items:s,onItemClick:y})=>{const[x,B]=l.useState(new Set),a=l.useMemo(()=>{const r=new Map;return s.forEach(d=>{const i=d.schema_name||"default";r.has(i)||r.set(i,{name:i,objects:[]}),r.get(i).objects.push(d)}),Array.from(r.values()).sort((d,i)=>d.name.localeCompare(i.name))},[s]),F=r=>{B(d=>{const i=new Set(d);return i.has(r)?i.delete(r):i.add(r),i})},N=(r,d)=>{if(r===0)return null;const i=[];for(let p=0;p<r-1;p++)i.push("│  ");return i.push(d?"└─ ":"├─ "),e.jsx(je,{$isLast:d,children:i.join("")})},S=r=>{if(r==null)return"N/A";const d=Number(r);return isNaN(d)?"N/A":d.toLocaleString()},W=r=>{if(r==null)return"N/A";const d=Number(r);return isNaN(d)?"N/A":d<1?`${(d*1024).toFixed(2)} KB`:`${d.toFixed(2)} MB`},k=(r,d)=>{const i=x.has(r.name),T=a.findIndex(E=>E.name===r.name)===a.length-1;return e.jsxs(ve,{children:[e.jsxs(Ce,{$level:d,$isExpanded:i,$nodeType:"schema",onClick:()=>F(r.name),children:[N(d,T),e.jsx(Se,{$isExpanded:i,children:i?g.arrowDown:g.arrowRight}),e.jsx("span",{style:{marginRight:"8px",color:t.accent,fontFamily:"Consolas"},children:g.blockFull}),e.jsx(_e,{$isSchema:!0,children:r.name}),e.jsxs(ke,{children:[r.objects.length," ",r.objects.length===1?"object":"objects"]})]}),e.jsx(we,{$isExpanded:i,$level:d,children:i&&r.objects.map((E,v)=>L(E,r.name,d+1,v===r.objects.length-1))})]},r.name)},L=(r,d,i,p)=>e.jsxs($e,{$level:i,onClick:()=>y==null?void 0:y(r),children:[N(i,p),e.jsx("span",{style:{marginRight:"8px",color:t.muted,fontFamily:"Consolas"},children:g.blockFull}),e.jsx("span",{style:{marginRight:"8px",fontWeight:500,color:t.foreground,fontFamily:"Consolas"},children:r.object_name||"N/A"}),r.object_type&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:t.backgroundSoft,color:t.foreground,border:`1px solid ${t.border}`,marginRight:4},children:r.object_type}),r.health_status&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:z(r.health_status)+"20",color:z(r.health_status),border:`1px solid ${z(r.health_status)}`,marginRight:4},children:r.health_status}),r.access_frequency&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:z(r.access_frequency)+"20",color:z(r.access_frequency),border:`1px solid ${z(r.access_frequency)}`,marginRight:4},children:r.access_frequency}),e.jsxs("span",{style:{marginLeft:"auto",color:t.muted,fontSize:11,fontFamily:"Consolas"},children:[S(r.row_count)," rows ",g.bullet," ",W(r.table_size_mb)]})]},r.id);return a.length===0?e.jsx(ee,{children:e.jsxs("div",{style:{padding:"60px 40px",textAlign:"center",color:t.muted,fontFamily:"Consolas"},children:[e.jsx("div",{style:{fontSize:48,marginBottom:16,fontFamily:"Consolas",opacity:.5},children:g.blockFull}),e.jsx("div",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,marginBottom:8,color:t.foreground},children:"No governance data available"}),e.jsx("div",{style:{fontSize:12,fontFamily:"Consolas",opacity:.7,color:t.muted},children:"Data will appear here once collected."})]})}):e.jsx(ee,{children:a.map(r=>k(r,0))})};G`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;G`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;const We=()=>{const{page:s,limit:y,setPage:x,setLimit:B}=fe(1,20,1e3),{filters:a,setFilter:F,clearFilters:N}=xe({server_name:"",schema_name:"",health_status:"",access_frequency:"",search:""}),[S,W]=l.useState(""),[k,L]=l.useState("desc"),[r,d]=l.useState(!0),[i,p]=l.useState(null),[T,E]=l.useState([]),[v,P]=l.useState({}),[Fe,te]=l.useState(null),[w,Y]=l.useState({total:0,totalPages:0,currentPage:1,limit:20}),[oe,re]=l.useState([]),[ne,V]=l.useState([]),[I,ae]=l.useState([]),[U,X]=l.useState(!0),[se,M]=l.useState(!1),[$,le]=l.useState("list"),[O,ie]=l.useState(null),u=l.useRef(!0);l.useCallback(async()=>{if(!u.current)return;const o=Date.now(),c=300;try{d(!0),p(null);const n=Z(a.search,100),[m,h,j]=await Promise.all([_.getOracleItems({page:s,limit:y,server_name:a.server_name,schema_name:a.schema_name,health_status:a.health_status,access_frequency:a.access_frequency,search:n}),_.getOracleMetrics(),_.getOracleServers()]),f=Date.now()-o,H=Math.max(0,c-f);await new Promise(me=>setTimeout(me,H)),u.current&&(E(m.data||[]),Y(m.pagination||{total:0,totalPages:0,currentPage:1,limit:20}),P(h||{}),re(j||[]))}catch(n){u.current&&p(Q(n))}finally{u.current&&d(!1)}},[s,y,a.server_name,a.schema_name,a.health_status,a.access_frequency,a.search]);const D=l.useCallback(async()=>{if(!u.current)return;const o=Date.now(),c=300;try{X(!0),p(null);const n=Z(a.search,100),m=await _.getOracleItems({page:s,limit:y,server_name:a.server_name,schema_name:a.schema_name,health_status:a.health_status,access_frequency:a.access_frequency,search:n}),h=Date.now()-o,j=Math.max(0,c-h);await new Promise(f=>setTimeout(f,j)),u.current&&(ae(m.data||[]),Y(m.pagination||{total:0,totalPages:0,currentPage:1,limit:20}))}catch(n){u.current&&p(Q(n))}finally{u.current&&X(!1)}},[s,y,a.server_name,a.schema_name,a.health_status,a.access_frequency,a.search]);l.useEffect(()=>{u.current=!0,(async()=>{await D();try{const n=await _.getOracleMetrics();u.current&&P(n||{})}catch(n){console.error("Oracle: Error loading metrics:",n),u.current&&console.error("Oracle: Error loading metrics:",n)}})();const c=setInterval(()=>{u.current&&(D(),_.getOracleMetrics().then(n=>{u.current&&P(n||{})}).catch(n=>{console.error("Oracle: Error loading metrics in interval:",n)}))},3e4);return()=>{u.current=!1,clearInterval(c)}},[D]),l.useEffect(()=>{(async()=>{if(a.server_name&&u.current)try{const c=await _.getOracleSchemas(a.server_name);u.current&&V(c||[])}catch(c){u.current&&console.error("Error loading schemas:",c)}else V([])})()},[a.server_name]);const ce=l.useCallback(o=>{te(n=>n===o?null:o);const c=I.find(n=>n.id===o);ie(n=>(n==null?void 0:n.id)===o?null:c||null)},[I]),de=l.useCallback(o=>{if(o==null)return"N/A";const c=Number(o);return isNaN(c)?"N/A":c<1?`${(c*1024).toFixed(2)} KB`:`${c.toFixed(2)} MB`},[]),q=l.useCallback(o=>{if(o==null)return"N/A";const c=Number(o);return isNaN(c)?"N/A":c.toLocaleString()},[]);l.useCallback(o=>o?new Date(o).toLocaleString():"N/A",[]);const A=l.useCallback((o,c)=>{F(o,c),o==="server_name"&&F("schema_name",""),x(1)},[F,x]);l.useCallback(o=>{S===o?L(c=>c==="asc"?"desc":"asc"):(W(o),L("desc")),x(1)},[S,x]);const K=l.useMemo(()=>S?[...T].sort((o,c)=>{let n=o[S],m=c[S];if(n==null&&(n=""),m==null&&(m=""),typeof n=="string"&&typeof m=="string")return k==="asc"?n.localeCompare(m):m.localeCompare(n);const h=Number(n),j=Number(m);return!isNaN(h)&&!isNaN(j)?k==="asc"?h-j:j-h:k==="asc"?String(n).localeCompare(String(m)):String(m).localeCompare(String(n))}):T,[T,S,k]),ue=l.useCallback(()=>{const o=["Server","Schema","Table","Rows","Size (MB)","Health","Access","Tablespace"],c=K.map(f=>[f.server_name||"",f.schema_name||"",f.table_name||"",q(f.row_count),f.total_size_mb||0,f.health_status||"",f.access_frequency||"",f.tablespace_name||""]),n=[o.join(","),...c.map(f=>f.map(H=>`"${String(H).replace(/"/g,'""')}"`).join(","))].join(`
`),m=new Blob([n],{type:"text/csv;charset=utf-8;"}),h=document.createElement("a"),j=URL.createObjectURL(m);h.setAttribute("href",j),h.setAttribute("download",`governance_catalog_oracle_export_${new Date().toISOString().split("T")[0]}.csv`),h.style.visibility="hidden",document.body.appendChild(h),h.click(),document.body.removeChild(h)},[K,q]);return U&&I.length===0?e.jsx(be,{variant:"table"}):e.jsxs("div",{style:{padding:"20px",fontFamily:"Consolas",fontSize:12},children:[e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:"0 0 20px 0",color:t.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:t.accent,marginRight:8},children:g.blockFull}),"GOVERNANCE CATALOG - ORACLE"]}),i&&e.jsx("div",{style:{marginBottom:20},children:e.jsx(b,{title:"ERROR",children:e.jsx("div",{style:{padding:"12px",color:t.danger,fontSize:12,fontFamily:"Consolas"},children:i})})}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:12,marginBottom:24},children:[e.jsx(b,{title:"Total Tables",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:v.total_tables||0})}),e.jsx(b,{title:"Total Size",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:de(v.total_size_mb)})}),e.jsx(b,{title:"Total Rows",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:q(v.total_rows)})}),e.jsx(b,{title:"Healthy",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:v.healthy_count||0})}),e.jsx(b,{title:"Warning",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:v.warning_count||0})}),e.jsx(b,{title:"Critical",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:v.critical_count||0})}),e.jsx(b,{title:"Unique Servers",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:v.unique_servers||0})})]}),e.jsx(b,{title:"FILTERS",children:e.jsxs("div",{style:{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"},children:[e.jsxs("select",{value:a.server_name,onChange:o=>A("server_name",o.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Servers"}),oe.map(o=>e.jsx("option",{value:o,children:o},o))]}),e.jsxs("select",{value:a.schema_name,onChange:o=>A("schema_name",o.target.value),disabled:!a.server_name,style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground,opacity:a.server_name?1:.5},children:[e.jsx("option",{value:"",children:"All Schemas"}),ne.map(o=>e.jsx("option",{value:o,children:o},o))]}),e.jsxs("select",{value:a.health_status,onChange:o=>A("health_status",o.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Health Status"}),e.jsx("option",{value:"EXCELLENT",children:"Excellent"}),e.jsx("option",{value:"HEALTHY",children:"Healthy"}),e.jsx("option",{value:"WARNING",children:"Warning"}),e.jsx("option",{value:"CRITICAL",children:"Critical"})]}),e.jsxs("select",{value:a.access_frequency,onChange:o=>A("access_frequency",o.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Access Frequency"}),e.jsx("option",{value:"REAL_TIME",children:"Real Time"}),e.jsx("option",{value:"HIGH",children:"High"}),e.jsx("option",{value:"MEDIUM",children:"Medium"}),e.jsx("option",{value:"LOW",children:"Low"}),e.jsx("option",{value:"RARE",children:"Rare"})]}),e.jsx("input",{type:"text",placeholder:"Search table name...",value:a.search,onChange:o=>A("search",o.target.value),style:{flex:1,minWidth:"200px",padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground}}),e.jsx(R,{label:"Reset All",onClick:()=>{N(),x(1)},variant:"ghost"})]})}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,marginTop:8,fontFamily:"Consolas",fontSize:12,gap:32},children:[e.jsxs("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[e.jsx("label",{style:{color:t.muted,fontSize:11,fontFamily:"Consolas"},children:"Items per page:"}),e.jsxs("select",{value:y,onChange:o=>{B(Number(o.target.value)),x(1)},style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground,cursor:"pointer"},children:[e.jsx("option",{value:10,children:"10"}),e.jsx("option",{value:20,children:"20"}),e.jsx("option",{value:50,children:"50"}),e.jsx("option",{value:100,children:"100"}),e.jsx("option",{value:200,children:"200"})]})]}),e.jsxs("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[e.jsx(R,{label:$==="list"?"Show Charts":"Show List",onClick:()=>le($==="list"?"charts":"list"),variant:$==="charts"?"primary":"ghost"}),e.jsx(R,{label:"Metrics Info",onClick:()=>M(!0),variant:"ghost"}),e.jsx(R,{label:"Export CSV",onClick:ue,variant:"ghost"})]})]}),se&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>M(!1),children:e.jsx("div",{style:{width:"90%",maxWidth:900,maxHeight:"90vh",overflowY:"auto"},onClick:o=>o.stopPropagation(),children:e.jsx(b,{title:"METRICS PLAYBOOK - ORACLE GOVERNANCE",children:e.jsxs("div",{style:{padding:16,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:8},children:[g.blockFull," Total Tables"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Total number of tables cataloged across all Oracle servers and schemas in the governance system."})]}),e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:8},children:[g.blockFull," Total Size"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Combined storage size of all tables across all Oracle databases. Includes data and index sizes from tablespaces."})]}),e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:8},children:[g.blockFull," Total Rows"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Total number of rows across all Oracle tables in the governance catalog."})]}),e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.success,marginBottom:8},children:[g.blockFull," Healthy"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Tables with HEALTHY status, indicating optimal performance, low fragmentation, proper indexing, and good access patterns."})]}),e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.warning,marginBottom:8},children:[g.blockFull," Warning"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Tables with WARNING status, indicating potential issues such as moderate fragmentation, suboptimal indexes, or performance concerns that should be monitored."})]}),e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.danger,marginBottom:8},children:[g.blockFull," Critical"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Tables with CRITICAL status, indicating serious issues requiring immediate attention such as high fragmentation, missing indexes, or severe performance degradation."})]}),e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:8},children:[g.blockFull," Unique Servers"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Number of distinct Oracle server instances being monitored in the governance catalog."})]}),e.jsxs("div",{style:{marginTop:16,padding:12,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:t.muted,marginBottom:4},children:[g.blockSemi," Note"]}),e.jsx("div",{style:{fontSize:11,color:t.foreground},children:"These metrics are calculated in real-time from the data_governance_catalog_oracle table and reflect the current state of your Oracle governance catalog."})]}),e.jsx("div",{style:{marginTop:16,textAlign:"right"},children:e.jsx(R,{label:"Close",onClick:()=>M(!1),variant:"ghost"})})]})})})}),$==="charts"&&e.jsx(pe,{engine:"oracle",selectedItem:O?{server_name:O.server_name,schema_name:O.schema_name,table_name:O.table_name}:null}),$==="list"&&U?e.jsx(ge,{children:"Loading tree view..."}):$==="list"?e.jsxs(e.Fragment,{children:[e.jsx(ze,{items:I,onItemClick:o=>ce(o.id)}),w.totalPages>1&&e.jsx("div",{style:{marginTop:24},children:e.jsxs(he,{children:[e.jsx(J,{onClick:()=>x(Math.max(1,s-1)),disabled:s===1,children:"Previous"}),e.jsxs("span",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground},children:["Page ",w.currentPage," of ",w.totalPages," (",w.total," total)"]}),e.jsx(J,{onClick:()=>x(Math.min(w.totalPages,s+1)),disabled:s===w.totalPages,children:"Next"})]})})]}):null]})};export{We as default};
