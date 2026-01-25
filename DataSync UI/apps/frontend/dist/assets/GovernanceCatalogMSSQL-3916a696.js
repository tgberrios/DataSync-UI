import{m as H,f as v,b as t,r as l,j as e,e as h,C as _,l as fe,P as me,n as K}from"./index-75d7470b.js";import{u as he}from"./usePagination-b946ac42.js";import{u as pe}from"./useTableFilters-0b8dd77f.js";import{e as J}from"./errorHandler-5ea9ae85.js";import{s as Z}from"./validation-24839588.js";import{A as j}from"./AsciiPanel-9f053981.js";import{A as R}from"./AsciiButton-446d8430.js";import{G as xe}from"./GovernanceCatalogCharts-9ed6ee71.js";import{S as be}from"./SkeletonLoader-530eacc4.js";const ye=H`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,ee=v.div`
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
`,je=v.div`
  user-select: none;
  animation: ${ye} 0.3s ease-out;
  margin-bottom: 2px;
`,ve=v.span`
  color: ${t.muted};
  margin-right: 6px;
  font-family: Consolas;
  font-size: 12px;
  transition: color 0.2s ease;
`,Se=v.div`
  display: flex;
  align-items: center;
  padding: ${i=>i.$level===0?"8px":"6px 8px"};
  padding-left: ${i=>i.$level*24+8}px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.2s ease;
  position: relative;
  margin: 2px 0;
  font-family: Consolas;
  font-size: 12px;
  
  background: transparent;
  
  ${i=>i.$nodeType==="schema"?`
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
`,Ce=v.div`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
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
`,_e=v.span`
  flex: 1;
  font-family: Consolas;
  font-size: ${i=>i.$isSchema?"13px":"12px"};
  color: ${i=>i.$isSchema?t.accent:t.foreground};
  font-weight: ${i=>i.$isSchema?600:500};
  margin-right: 8px;
`,ke=v.span`
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
`,$e=v.div`
  max-height: ${i=>i.$isExpanded?"10000px":"0"};
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`,we=v.div`
  padding: 8px;
  padding-left: ${i=>(i.$level||0)*24+36}px;
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
`,N=i=>{if(!i)return t.muted;switch(i){case"HEALTHY":case"EXCELLENT":return t.success;case"WARNING":return t.warning;case"CRITICAL":return t.danger;case"REAL_TIME":case"HIGH":return t.accent;case"MEDIUM":return t.accentSoft;case"LOW":case"RARE":return t.muted;default:return t.muted}},Le=({items:i,onItemClick:b})=>{const[p,B]=l.useState(new Set),r=l.useMemo(()=>{const n=new Map;return i.forEach(d=>{const c=d.schema_name||"default";n.has(c)||n.set(c,{name:c,objects:[]}),n.get(c).objects.push(d)}),Array.from(n.values()).sort((d,c)=>d.name.localeCompare(c.name))},[i]),E=n=>{B(d=>{const c=new Set(d);return c.has(n)?c.delete(n):c.add(n),c})},T=(n,d)=>{if(n===0)return null;const c=[];for(let x=0;x<n-1;x++)c.push("│  ");return c.push(d?"└─ ":"├─ "),e.jsx(ve,{$isLast:d,children:c.join("")})},S=n=>{if(n==null)return"N/A";const d=Number(n);return isNaN(d)?"N/A":d.toLocaleString()},D=n=>{if(n==null)return"N/A";const d=Number(n);return isNaN(d)?"N/A":d<1?`${(d*1024).toFixed(2)} KB`:`${d.toFixed(2)} MB`},k=(n,d)=>{const c=p.has(n.name),F=r.findIndex(A=>A.name===n.name)===r.length-1;return e.jsxs(je,{children:[e.jsxs(Se,{$level:d,$isExpanded:c,$nodeType:"schema",onClick:()=>E(n.name),children:[T(d,F),e.jsx(Ce,{$isExpanded:c,children:c?h.arrowDown:h.arrowRight}),e.jsx("span",{style:{marginRight:"8px",color:t.accent,fontFamily:"Consolas"},children:h.blockFull}),e.jsx(_e,{$isSchema:!0,children:n.name}),e.jsxs(ke,{children:[n.objects.length," ",n.objects.length===1?"object":"objects"]})]}),e.jsx($e,{$isExpanded:c,$level:d,children:c&&n.objects.map((A,C)=>I(A,n.name,d+1,C===n.objects.length-1))})]},n.name)},I=(n,d,c,x)=>e.jsxs(we,{$level:c,onClick:()=>b==null?void 0:b(n),children:[T(c,x),e.jsx("span",{style:{marginRight:"8px",color:t.muted,fontFamily:"Consolas"},children:h.blockFull}),e.jsx("span",{style:{marginRight:"8px",fontWeight:500,color:t.foreground,fontFamily:"Consolas"},children:n.object_name||"N/A"}),n.object_type&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:t.backgroundSoft,color:t.foreground,border:`1px solid ${t.border}`,marginRight:4},children:n.object_type}),n.health_status&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:N(n.health_status)+"20",color:N(n.health_status),border:`1px solid ${N(n.health_status)}`,marginRight:4},children:n.health_status}),n.access_frequency&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:N(n.access_frequency)+"20",color:N(n.access_frequency),border:`1px solid ${N(n.access_frequency)}`,marginRight:4},children:n.access_frequency}),e.jsxs("span",{style:{marginLeft:"auto",color:t.muted,fontSize:11,fontFamily:"Consolas"},children:[S(n.row_count)," rows ",h.bullet," ",D(n.table_size_mb)]})]},n.id);return r.length===0?e.jsx(ee,{children:e.jsxs("div",{style:{padding:"60px 40px",textAlign:"center",color:t.muted,fontFamily:"Consolas"},children:[e.jsx("div",{style:{fontSize:48,marginBottom:16,fontFamily:"Consolas",opacity:.5},children:h.blockFull}),e.jsx("div",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,marginBottom:8,color:t.foreground},children:"No governance data available"}),e.jsx("div",{style:{fontSize:12,fontFamily:"Consolas",opacity:.7,color:t.muted},children:"Data will appear here once collected."})]})}):e.jsx(ee,{children:r.map(n=>k(n,0))})};H`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;H`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;const De=()=>{const{page:i,limit:b,setPage:p,setLimit:B}=he(1,20,1e3),{filters:r,setFilter:E,clearFilters:T}=pe({server_name:"",database_name:"",object_type:"",health_status:"",access_frequency:"",search:""}),[S,D]=l.useState(""),[k,I]=l.useState("desc"),[n,d]=l.useState(!0),[c,x]=l.useState(null),[F,A]=l.useState([]),[C,P]=l.useState({}),[Ne,te]=l.useState(null),[$,Q]=l.useState({total:0,totalPages:0,currentPage:1,limit:20}),[oe,ne]=l.useState([]),[re,G]=l.useState([]),[M,ae]=l.useState([]),[Y,V]=l.useState(!0),[se,W]=l.useState(!1),[w,ie]=l.useState("list"),[z,le]=l.useState(null),u=l.useRef(!0);l.useCallback(async()=>{if(!u.current)return;const o=Date.now(),s=300;try{d(!0),x(null);const a=Z(r.search,100),[g,m,y]=await Promise.all([_.getMSSQLItems({page:i,limit:b,server_name:r.server_name,database_name:r.database_name,object_type:r.object_type,health_status:r.health_status,access_frequency:r.access_frequency,search:a}),_.getMSSQLMetrics(),_.getMSSQLServers()]),f=Date.now()-o,O=Math.max(0,s-f);await new Promise(ge=>setTimeout(ge,O)),u.current&&(A(g.data||[]),Q(g.pagination||{total:0,totalPages:0,currentPage:1,limit:20}),P(m||{}),ne(y||[]))}catch(a){u.current&&x(J(a))}finally{u.current&&d(!1)}},[i,b,r.server_name,r.database_name,r.object_type,r.health_status,r.access_frequency,r.search]);const q=l.useCallback(async()=>{if(!u.current)return;const o=Date.now(),s=300;try{V(!0),x(null);const a=Z(r.search,100),g=await _.getMSSQLItems({page:i,limit:b,server_name:r.server_name,database_name:r.database_name,object_type:r.object_type,health_status:r.health_status,access_frequency:r.access_frequency,search:a}),m=Date.now()-o,y=Math.max(0,s-m);await new Promise(f=>setTimeout(f,y)),u.current&&(ae(g.data||[]),Q(g.pagination||{total:0,totalPages:0,currentPage:1,limit:20}))}catch(a){u.current&&x(J(a))}finally{u.current&&V(!1)}},[i,b,r.server_name,r.database_name,r.object_type,r.health_status,r.access_frequency,r.search]);l.useEffect(()=>{u.current=!0,(async()=>{await q();try{const a=await _.getMSSQLMetrics();u.current&&P(a||{})}catch(a){console.error("MSSQL: Error loading metrics:",a),u.current&&console.error("MSSQL: Error loading metrics:",a)}})();const s=setInterval(()=>{u.current&&(q(),_.getMSSQLMetrics().then(a=>{u.current&&P(a||{})}).catch(a=>{console.error("MSSQL: Error loading metrics in interval:",a)}))},3e4);return()=>{u.current=!1,clearInterval(s)}},[q]),l.useEffect(()=>{(async()=>{if(r.server_name&&u.current)try{const s=await _.getMSSQLDatabases(r.server_name);u.current&&G(s||[])}catch(s){u.current&&console.error("Error loading databases:",s)}else G([])})()},[r.server_name]);const ce=l.useCallback(o=>{te(a=>a===o?null:o);const s=M.find(a=>a.id===o);le(a=>(a==null?void 0:a.id)===o?null:s||null)},[M]),de=l.useCallback(o=>{if(o==null)return"N/A";const s=Number(o);return isNaN(s)?"N/A":s<1?`${(s*1024).toFixed(2)} KB`:`${s.toFixed(2)} MB`},[]),U=l.useCallback(o=>{if(o==null)return"N/A";const s=Number(o);return isNaN(s)?"N/A":s.toLocaleString()},[]);l.useCallback(o=>{if(o==null)return"N/A";const s=Number(o);return isNaN(s)?"N/A":`${s.toFixed(2)}%`},[]),l.useCallback(o=>o?new Date(o).toLocaleString():"N/A",[]),l.useCallback(o=>{if(o==null)return"N/A";const s=Number(o);return isNaN(s)?"N/A":s<1?`${(s*1e3).toFixed(2)} ms`:`${s.toFixed(2)} s`},[]);const L=l.useCallback((o,s)=>{E(o,s),o==="server_name"&&E("database_name",""),p(1)},[E,p]);l.useCallback(o=>{S===o?I(s=>s==="asc"?"desc":"asc"):(D(o),I("desc")),p(1)},[S,p]);const X=l.useMemo(()=>S?[...F].sort((o,s)=>{let a=o[S],g=s[S];if(a==null&&(a=""),g==null&&(g=""),typeof a=="string"&&typeof g=="string")return k==="asc"?a.localeCompare(g):g.localeCompare(a);const m=Number(a),y=Number(g);return!isNaN(m)&&!isNaN(y)?k==="asc"?m-y:y-m:k==="asc"?String(a).localeCompare(String(g)):String(g).localeCompare(String(a))}):F,[F,S,k]),ue=l.useCallback(()=>{const o=["Server","Database","Schema","Object","Type","Rows","Size (MB)","Health","Access"],s=X.map(f=>[f.server_name||"",f.database_name||"",f.schema_name||"",f.object_name||"",f.object_type||"",U(f.row_count),f.total_size_mb||0,f.health_status||"",f.access_frequency||""]),a=[o.join(","),...s.map(f=>f.map(O=>`"${String(O).replace(/"/g,'""')}"`).join(","))].join(`
`),g=new Blob([a],{type:"text/csv;charset=utf-8;"}),m=document.createElement("a"),y=URL.createObjectURL(g);m.setAttribute("href",y),m.setAttribute("download",`governance_catalog_mssql_export_${new Date().toISOString().split("T")[0]}.csv`),m.style.visibility="hidden",document.body.appendChild(m),m.click(),document.body.removeChild(m)},[X,U]);return Y&&M.length===0?e.jsx(be,{variant:"table"}):e.jsxs("div",{style:{padding:"20px",fontFamily:"Consolas",fontSize:12},children:[e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:"0 0 20px 0",color:t.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:t.accent,marginRight:8},children:h.blockFull}),"GOVERNANCE CATALOG - MSSQL"]}),c&&e.jsx("div",{style:{marginBottom:20},children:e.jsx(j,{title:"ERROR",children:e.jsx("div",{style:{padding:"12px",color:t.danger,fontSize:12,fontFamily:"Consolas"},children:c})})}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:12,marginBottom:24},children:[e.jsx(j,{title:"Total Objects",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:C.total_objects||0})}),e.jsx(j,{title:"Total Size",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:de(C.total_size_mb)})}),e.jsx(j,{title:"Healthy",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:C.healthy_count||0})}),e.jsx(j,{title:"Warning",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:C.warning_count||0})}),e.jsx(j,{title:"Critical",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:C.critical_count||0})}),e.jsx(j,{title:"Unique Servers",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:C.unique_servers||0})})]}),e.jsx(j,{title:"FILTERS",children:e.jsxs("div",{style:{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"},children:[e.jsxs("select",{value:r.server_name,onChange:o=>L("server_name",o.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Servers"}),oe.map(o=>e.jsx("option",{value:o,children:o},o))]}),e.jsxs("select",{value:r.database_name,onChange:o=>L("database_name",o.target.value),disabled:!r.server_name,style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground,opacity:r.server_name?1:.5},children:[e.jsx("option",{value:"",children:"All Databases"}),re.map(o=>e.jsx("option",{value:o,children:o},o))]}),e.jsxs("select",{value:r.object_type,onChange:o=>L("object_type",o.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Types"}),e.jsx("option",{value:"TABLE",children:"TABLE"}),e.jsx("option",{value:"VIEW",children:"VIEW"}),e.jsx("option",{value:"STORED_PROCEDURE",children:"STORED_PROCEDURE"})]}),e.jsxs("select",{value:r.health_status,onChange:o=>L("health_status",o.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Health Status"}),e.jsx("option",{value:"EXCELLENT",children:"Excellent"}),e.jsx("option",{value:"HEALTHY",children:"Healthy"}),e.jsx("option",{value:"WARNING",children:"Warning"}),e.jsx("option",{value:"CRITICAL",children:"Critical"})]}),e.jsxs("select",{value:r.access_frequency,onChange:o=>L("access_frequency",o.target.value),style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground},children:[e.jsx("option",{value:"",children:"All Access Frequency"}),e.jsx("option",{value:"REAL_TIME",children:"Real Time"}),e.jsx("option",{value:"HIGH",children:"High"}),e.jsx("option",{value:"MEDIUM",children:"Medium"}),e.jsx("option",{value:"LOW",children:"Low"}),e.jsx("option",{value:"RARE",children:"Rare"})]}),e.jsx("input",{type:"text",placeholder:"Search object name...",value:r.search,onChange:o=>L("search",o.target.value),style:{flex:1,minWidth:"200px",padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground}}),e.jsx(R,{label:"Reset All",onClick:()=>{T(),p(1)},variant:"ghost"})]})}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,marginTop:8,fontFamily:"Consolas",fontSize:12,gap:32},children:[e.jsxs("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[e.jsx("label",{style:{color:t.muted,fontSize:11,fontFamily:"Consolas"},children:"Items per page:"}),e.jsxs("select",{value:b,onChange:o=>{B(Number(o.target.value)),p(1)},style:{padding:"4px 8px",border:`1px solid ${t.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:t.background,color:t.foreground,cursor:"pointer"},children:[e.jsx("option",{value:10,children:"10"}),e.jsx("option",{value:20,children:"20"}),e.jsx("option",{value:50,children:"50"}),e.jsx("option",{value:100,children:"100"}),e.jsx("option",{value:200,children:"200"})]})]}),e.jsxs("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[e.jsx(R,{label:w==="list"?"Show Charts":"Show List",onClick:()=>ie(w==="list"?"charts":"list"),variant:w==="charts"?"primary":"ghost"}),e.jsx(R,{label:"Metrics Info",onClick:()=>W(!0),variant:"ghost"}),e.jsx(R,{label:"Export CSV",onClick:ue,variant:"ghost"})]})]}),se&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>W(!1),children:e.jsx("div",{style:{width:"90%",maxWidth:900,maxHeight:"90vh",overflowY:"auto"},onClick:o=>o.stopPropagation(),children:e.jsx(j,{title:"METRICS PLAYBOOK - MSSQL GOVERNANCE",children:e.jsxs("div",{style:{padding:16,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:8},children:[h.blockFull," Total Objects"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Total number of objects (tables, views, stored procedures, indexes) cataloged across all MSSQL servers and databases."})]}),e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:8},children:[h.blockFull," Total Size"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Combined storage size of all objects across all MSSQL databases. Includes data files, log files, and index sizes."})]}),e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.success,marginBottom:8},children:[h.blockFull," Healthy"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Objects with HEALTHY status, indicating optimal performance, low fragmentation, proper indexing, and good execution statistics."})]}),e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.warning,marginBottom:8},children:[h.blockFull," Warning"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Objects with WARNING status, indicating potential issues such as moderate fragmentation, missing indexes, suboptimal query plans, or performance concerns that should be monitored."})]}),e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.danger,marginBottom:8},children:[h.blockFull," Critical"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Objects with CRITICAL status, indicating serious issues requiring immediate attention such as high fragmentation, missing critical indexes, slow queries, or severe performance degradation."})]}),e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:8},children:[h.blockFull," Unique Servers"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Number of distinct MSSQL server instances being monitored in the governance catalog."})]}),e.jsxs("div",{style:{marginTop:16,padding:12,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:t.muted,marginBottom:4},children:[h.blockSemi," Note"]}),e.jsx("div",{style:{fontSize:11,color:t.foreground},children:"These metrics are calculated in real-time from the data_governance_catalog_mssql table and reflect the current state of your MSSQL governance catalog."})]}),e.jsx("div",{style:{marginTop:16,textAlign:"right"},children:e.jsx(R,{label:"Close",onClick:()=>W(!1),variant:"ghost"})})]})})})}),w==="charts"&&e.jsx(xe,{engine:"mssql",selectedItem:z?{server_name:z.server_name,database_name:z.database_name,schema_name:z.schema_name,table_name:z.table_name}:null}),w==="list"&&Y?e.jsx(fe,{children:"Loading tree view..."}):w==="list"?e.jsxs(e.Fragment,{children:[e.jsx(Le,{items:M,onItemClick:o=>ce(o.id)}),$.totalPages>1&&e.jsx("div",{style:{marginTop:24},children:e.jsxs(me,{children:[e.jsx(K,{onClick:()=>p(Math.max(1,i-1)),disabled:i===1,children:"Previous"}),e.jsxs("span",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground},children:["Page ",$.currentPage," of ",$.totalPages," (",$.total," total)"]}),e.jsx(K,{onClick:()=>p(Math.min($.totalPages,i+1)),disabled:i===$.totalPages,children:"Next"})]})})]}):null]})};export{De as default};
