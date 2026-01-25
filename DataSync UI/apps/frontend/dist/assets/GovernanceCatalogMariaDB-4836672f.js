import{m as O,f as j,b as t,r as i,j as e,e as h,C as _,l as me,P as fe,n as J}from"./index-75d7470b.js";import{u as he}from"./usePagination-b946ac42.js";import{u as xe}from"./useTableFilters-0b8dd77f.js";import{e as Q}from"./errorHandler-5ea9ae85.js";import{s as Z}from"./validation-24839588.js";import{A as v}from"./AsciiPanel-9f053981.js";import{A as R}from"./AsciiButton-446d8430.js";import{G as pe}from"./GovernanceCatalogCharts-9ed6ee71.js";import{S as be}from"./SkeletonLoader-530eacc4.js";const ye=O`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,ee=j.div`
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
`,ve=j.div`
  user-select: none;
  animation: ${ye} 0.3s ease-out;
  margin-bottom: 2px;
`,je=j.span`
  color: ${t.muted};
  margin-right: 6px;
  font-family: Consolas;
  font-size: 12px;
  transition: color 0.2s ease;
`,Ce=j.div`
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
`,Se=j.div`
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
`,_e=j.span`
  flex: 1;
  font-family: Consolas;
  font-size: ${s=>s.$isSchema?"13px":"12px"};
  color: ${s=>s.$isSchema?t.accent:t.foreground};
  font-weight: ${s=>s.$isSchema?600:500};
  margin-right: 8px;
`,ke=j.span`
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
`,$e=j.div`
  max-height: ${s=>s.$isExpanded?"10000px":"0"};
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`,we=j.div`
  padding: 8px;
  padding-left: ${s=>(s.$level||0)*24+36}px;
  margin: 2px 0;
  border-radius: 2px;
  background: transparent;
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
`,A=s=>{if(!s)return t.muted;switch(s){case"HEALTHY":case"EXCELLENT":return t.success;case"WARNING":return t.warning;case"CRITICAL":return t.danger;case"REAL_TIME":case"HIGH":return t.accent;case"MEDIUM":return t.accentSoft;case"LOW":case"RARE":return t.muted;default:return t.muted}},Ae=({items:s,onItemClick:b})=>{const[x,L]=i.useState(new Set),o=i.useMemo(()=>{const r=new Map;return s.forEach(d=>{const c=d.schema_name||"default";r.has(c)||r.set(c,{name:c,objects:[]}),r.get(c).objects.push(d)}),Array.from(r.values()).sort((d,c)=>d.name.localeCompare(c.name))},[s]),N=r=>{L(d=>{const c=new Set(d);return c.has(r)?c.delete(r):c.add(r),c})},B=(r,d)=>{if(r===0)return null;const c=[];for(let p=0;p<r-1;p++)c.push("│  ");return c.push(d?"└─ ":"├─ "),e.jsx(je,{$isLast:d,children:c.join("")})},C=r=>{if(r==null)return"N/A";const d=Number(r);return isNaN(d)?"N/A":d.toLocaleString()},M=r=>{if(r==null)return"N/A";const d=Number(r);return isNaN(d)?"N/A":d<1?`${(d*1024).toFixed(2)} KB`:`${d.toFixed(2)} MB`},k=(r,d)=>{const c=x.has(r.name),z=o.findIndex(F=>F.name===r.name)===o.length-1;return e.jsxs(ve,{children:[e.jsxs(Ce,{$level:d,$isExpanded:c,$nodeType:"schema",onClick:()=>N(r.name),children:[B(d,z),e.jsx(Se,{$isExpanded:c,children:c?h.arrowDown:h.arrowRight}),e.jsx("span",{style:{marginRight:"8px",color:t.accent,fontFamily:"Consolas"},children:h.blockFull}),e.jsx(_e,{$isSchema:!0,children:r.name}),e.jsxs(ke,{children:[r.objects.length," ",r.objects.length===1?"object":"objects"]})]}),e.jsx($e,{$isExpanded:c,$level:d,children:c&&r.objects.map((F,S)=>I(F,r.name,d+1,S===r.objects.length-1))})]},r.name)},I=(r,d,c,p)=>e.jsxs(we,{$level:c,onClick:()=>b==null?void 0:b(r),children:[B(c,p),e.jsx("span",{style:{marginRight:"8px",color:t.muted,fontFamily:"Consolas"},children:h.blockFull}),e.jsx("span",{style:{marginRight:"8px",fontWeight:500,color:t.foreground,fontFamily:"Consolas"},children:r.object_name||"N/A"}),r.object_type&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:t.backgroundSoft,color:t.foreground,border:`1px solid ${t.border}`,marginRight:4},children:r.object_type}),r.health_status&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:A(r.health_status)+"20",color:A(r.health_status),border:`1px solid ${A(r.health_status)}`,marginRight:4},children:r.health_status}),r.access_frequency&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:A(r.access_frequency)+"20",color:A(r.access_frequency),border:`1px solid ${A(r.access_frequency)}`,marginRight:4},children:r.access_frequency}),e.jsxs("span",{style:{marginLeft:"auto",color:t.muted,fontSize:11,fontFamily:"Consolas"},children:[C(r.row_count)," rows ",h.bullet," ",M(r.table_size_mb)]})]},r.id);return o.length===0?e.jsx(ee,{children:e.jsxs("div",{style:{padding:"60px 40px",textAlign:"center",color:t.muted,fontFamily:"Consolas"},children:[e.jsx("div",{style:{fontSize:48,marginBottom:16,fontFamily:"Consolas",opacity:.5},children:h.blockFull}),e.jsx("div",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,marginBottom:8,color:t.foreground},children:"No governance data available"}),e.jsx("div",{style:{fontSize:12,fontFamily:"Consolas",opacity:.7,color:t.muted},children:"Data will appear here once collected."})]})}):e.jsx(ee,{children:o.map(r=>k(r,0))})};O`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;O`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;const Me=()=>{const{page:s,limit:b,setPage:x,setLimit:L}=he(1,20,1e3),{filters:o,setFilter:N,clearFilters:B}=xe({server_name:"",database_name:"",health_status:"",access_frequency:"",search:""}),[C,M]=i.useState(""),[k,I]=i.useState("desc"),[r,d]=i.useState(!0),[c,p]=i.useState(null),[z,F]=i.useState([]),[S,P]=i.useState({}),[Ne,te]=i.useState(null),[$,G]=i.useState({total:0,totalPages:0,currentPage:1,limit:20}),[ae,re]=i.useState([]),[ne,Y]=i.useState([]),[D,oe]=i.useState([]),[V,U]=i.useState(!0),[se,W]=i.useState(!1),[w,ie]=i.useState("list"),[E,le]=i.useState(null),u=i.useRef(!0);i.useCallback(async()=>{if(!u.current)return;const a=Date.now(),l=300;try{d(!0),p(null);const n=Z(o.search,100),[g,f,y]=await Promise.all([_.getMariaDBItems({page:s,limit:b,server_name:o.server_name,database_name:o.database_name,health_status:o.health_status,access_frequency:o.access_frequency,search:n}),_.getMariaDBMetrics(),_.getMariaDBServers()]),m=Date.now()-a,H=Math.max(0,l-m);await new Promise(ge=>setTimeout(ge,H)),u.current&&(F(g.data||[]),G(g.pagination||{total:0,totalPages:0,currentPage:1,limit:20}),P(f||{}),re(y||[]))}catch(n){u.current&&p(Q(n))}finally{u.current&&d(!1)}},[s,b,o.server_name,o.database_name,o.health_status,o.access_frequency,o.search]);const q=i.useCallback(async()=>{if(!u.current)return;const a=Date.now(),l=300;try{U(!0),p(null);const n=Z(o.search,100),g=await _.getMariaDBItems({page:s,limit:b,server_name:o.server_name,database_name:o.database_name,health_status:o.health_status,access_frequency:o.access_frequency,search:n}),f=Date.now()-a,y=Math.max(0,l-f);await new Promise(m=>setTimeout(m,y)),u.current&&(oe(g.data||[]),G(g.pagination||{total:0,totalPages:0,currentPage:1,limit:20}))}catch(n){u.current&&p(Q(n))}finally{u.current&&U(!1)}},[s,b,o.server_name,o.database_name,o.health_status,o.access_frequency,o.search]);i.useEffect(()=>{u.current=!0,(async()=>{await q();try{const n=await _.getMariaDBMetrics();u.current&&P(n||{})}catch(n){console.error("MariaDB: Error loading metrics:",n),u.current&&console.error("MariaDB: Error loading metrics:",n)}})();const l=setInterval(()=>{u.current&&(q(),_.getMariaDBMetrics().then(n=>{u.current&&P(n||{})}).catch(n=>{console.error("MariaDB: Error loading metrics in interval:",n)}))},3e4);return()=>{u.current=!1,clearInterval(l)}},[q]),i.useEffect(()=>{(async()=>{if(o.server_name&&u.current)try{const l=await _.getMariaDBDatabases(o.server_name);u.current&&Y(l||[])}catch(l){u.current&&console.error("Error loading databases:",l)}else Y([])})()},[o.server_name]);const ce=i.useCallback(a=>{te(n=>n===a?null:a);const l=D.find(n=>n.id===a);le(n=>(n==null?void 0:n.id)===a?null:l||null)},[D]),de=i.useCallback(a=>{if(a==null)return"N/A";const l=Number(a);return isNaN(l)?"N/A":l<1?`${(l*1024).toFixed(2)} KB`:`${l.toFixed(2)} MB`},[]),X=i.useCallback(a=>{if(a==null)return"N/A";const l=Number(a);return isNaN(l)?"N/A":l.toLocaleString()},[]);i.useCallback(a=>{if(a==null)return"N/A";const l=Number(a);return isNaN(l)?"N/A":`${l.toFixed(2)}%`},[]),i.useCallback(a=>a?new Date(a).toLocaleString():"N/A",[]);const T=i.useCallback((a,l)=>{N(a,l),a==="server_name"&&N("database_name",""),x(1)},[N,x]);i.useCallback(a=>{C===a?I(l=>l==="asc"?"desc":"asc"):(M(a),I("desc")),x(1)},[C,x]);const K=i.useMemo(()=>C?[...z].sort((a,l)=>{let n=a[C],g=l[C];if(n==null&&(n=""),g==null&&(g=""),typeof n=="string"&&typeof g=="string")return k==="asc"?n.localeCompare(g):g.localeCompare(n);const f=Number(n),y=Number(g);return!isNaN(f)&&!isNaN(y)?k==="asc"?f-y:y-f:k==="asc"?String(n).localeCompare(String(g)):String(g).localeCompare(String(n))}):z,[z,C,k]),ue=i.useCallback(()=>{const a=["Server","Database","Schema","Table","Rows","Size (MB)","Health","Access","Engine"],l=K.map(m=>[m.server_name||"",m.database_name||"",m.schema_name||"",m.table_name||"",X(m.row_count),m.total_size_mb||0,m.health_status||"",m.access_frequency||"",m.engine||""]),n=[a.join(","),...l.map(m=>m.map(H=>`"${String(H).replace(/"/g,'""')}"`).join(","))].join(`
`),g=new Blob([n],{type:"text/csv;charset=utf-8;"}),f=document.createElement("a"),y=URL.createObjectURL(g);f.setAttribute("href",y),f.setAttribute("download",`governance_catalog_mariadb_export_${new Date().toISOString().split("T")[0]}.csv`),f.style.visibility="hidden",document.body.appendChild(f),f.click(),document.body.removeChild(f)},[K,X]);return V&&D.length===0?e.jsx(be,{variant:"table"}):e.jsxs("div",{style:{padding:"20px",fontFamily:"Consolas",fontSize:12},children:[e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:"0 0 20px 0",color:t.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:t.accent,marginRight:8},children:h.blockFull}),"GOVERNANCE CATALOG - MARIADB"]}),c&&e.jsx("div",{style:{marginBottom:20},children:e.jsx(v,{title:"ERROR",children:e.jsx("div",{style:{padding:"12px",color:t.danger,fontSize:12,fontFamily:"Consolas"},children:c})})}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:12,marginBottom:24},children:[e.jsx(v,{title:"Total Tables",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:S.total_tables||0})}),e.jsx(v,{title:"Total Size",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:de(S.total_size_mb)})}),e.jsx(v,{title:"Healthy",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:S.healthy_count||0})}),e.jsx(v,{title:"Warning",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:S.warning_count||0})}),e.jsx(v,{title:"Critical",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:S.critical_count||0})}),e.jsx(v,{title:"Unique Servers",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:S.unique_servers||0})})]}),e.jsx(v,{title:"FILTERS",children:e.jsxs("div",{style:{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"},children:[e.jsxs("select",{value:o.server_name,onChange:a=>T("server_name",a.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Servers"}),ae.map(a=>e.jsx("option",{value:a,children:a},a))]}),e.jsxs("select",{value:o.database_name,onChange:a=>T("database_name",a.target.value),disabled:!o.server_name,style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground,opacity:o.server_name?1:.5},children:[e.jsx("option",{value:"",children:"All Databases"}),ne.map(a=>e.jsx("option",{value:a,children:a},a))]}),e.jsxs("select",{value:o.health_status,onChange:a=>T("health_status",a.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Health Status"}),e.jsx("option",{value:"EXCELLENT",children:"Excellent"}),e.jsx("option",{value:"HEALTHY",children:"Healthy"}),e.jsx("option",{value:"WARNING",children:"Warning"}),e.jsx("option",{value:"CRITICAL",children:"Critical"})]}),e.jsxs("select",{value:o.access_frequency,onChange:a=>T("access_frequency",a.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Access Frequency"}),e.jsx("option",{value:"REAL_TIME",children:"Real Time"}),e.jsx("option",{value:"HIGH",children:"High"}),e.jsx("option",{value:"MEDIUM",children:"Medium"}),e.jsx("option",{value:"LOW",children:"Low"}),e.jsx("option",{value:"RARE",children:"Rare"})]}),e.jsx("input",{type:"text",placeholder:"Search table name...",value:o.search,onChange:a=>T("search",a.target.value),style:{flex:1,minWidth:"200px",padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground}}),e.jsx(R,{label:"Reset All",onClick:()=>{B(),x(1)},variant:"ghost"})]})}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,marginTop:8,fontFamily:"Consolas",fontSize:12,gap:32},children:[e.jsxs("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[e.jsx("label",{style:{color:t.muted,fontSize:11,fontFamily:"Consolas"},children:"Items per page:"}),e.jsxs("select",{value:b,onChange:a=>{L(Number(a.target.value)),x(1)},style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground,cursor:"pointer"},children:[e.jsx("option",{value:10,children:"10"}),e.jsx("option",{value:20,children:"20"}),e.jsx("option",{value:50,children:"50"}),e.jsx("option",{value:100,children:"100"}),e.jsx("option",{value:200,children:"200"})]})]}),e.jsxs("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[e.jsx(R,{label:w==="list"?"Show Charts":"Show List",onClick:()=>ie(w==="list"?"charts":"list"),variant:w==="charts"?"primary":"ghost"}),e.jsx(R,{label:"Metrics Info",onClick:()=>W(!0),variant:"ghost"}),e.jsx(R,{label:"Export CSV",onClick:ue,variant:"ghost"})]})]}),se&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>W(!1),children:e.jsx("div",{style:{width:"90%",maxWidth:900,maxHeight:"90vh",overflowY:"auto"},onClick:a=>a.stopPropagation(),children:e.jsx(v,{title:"METRICS PLAYBOOK - MARIADB GOVERNANCE",children:e.jsxs("div",{style:{padding:16,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:8},children:[h.blockFull," Total Tables"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Total number of tables cataloged across all MariaDB servers and databases in the governance system."})]}),e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:8},children:[h.blockFull," Total Size"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Combined storage size of all tables across all MariaDB databases. Includes data and index sizes."})]}),e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.success,marginBottom:8},children:[h.blockFull," Healthy"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Tables with HEALTHY status, indicating optimal performance, low fragmentation, and good access patterns."})]}),e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.warning,marginBottom:8},children:[h.blockFull," Warning"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Tables with WARNING status, indicating potential issues such as moderate fragmentation, suboptimal indexes, or performance concerns that should be monitored."})]}),e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.danger,marginBottom:8},children:[h.blockFull," Critical"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Tables with CRITICAL status, indicating serious issues requiring immediate attention such as high fragmentation, missing indexes, or severe performance degradation."})]}),e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:8},children:[h.blockFull," Unique Servers"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Number of distinct MariaDB server instances being monitored in the governance catalog."})]}),e.jsxs("div",{style:{marginTop:16,padding:12,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:t.muted,marginBottom:4},children:[h.blockSemi," Note"]}),e.jsx("div",{style:{fontSize:11,color:t.foreground},children:"These metrics are calculated in real-time from the data_governance_catalog_mariadb table and reflect the current state of your MariaDB governance catalog."})]}),e.jsx("div",{style:{marginTop:16,textAlign:"right"},children:e.jsx(R,{label:"Close",onClick:()=>W(!1),variant:"ghost"})})]})})})}),w==="charts"&&e.jsx(pe,{engine:"mariadb",selectedItem:E?{server_name:E.server_name,database_name:E.database_name,schema_name:E.schema_name,table_name:E.table_name}:null}),w==="list"&&V?e.jsx(me,{children:"Loading tree view..."}):w==="list"?e.jsxs(e.Fragment,{children:[e.jsx(Ae,{items:D,onItemClick:a=>ce(a.id)}),$.totalPages>1&&e.jsx("div",{style:{marginTop:24},children:e.jsxs(fe,{children:[e.jsx(J,{onClick:()=>x(Math.max(1,s-1)),disabled:s===1,children:"Previous"}),e.jsxs("span",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground},children:["Page ",$.currentPage," of ",$.totalPages," (",$.total," total)"]}),e.jsx(J,{onClick:()=>x(Math.min($.totalPages,s+1)),disabled:s===$.totalPages,children:"Next"})]})})]}):null]})};export{Me as default};
