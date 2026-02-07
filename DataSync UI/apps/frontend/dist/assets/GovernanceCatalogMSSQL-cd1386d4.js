import{m as V,f as v,b as o,r as l,j as e,e as f,T as $,C as ye,t as n,o as be,P as ve,p as oe}from"./index-f6ac47b8.js";import{u as je}from"./usePagination-c6b4a268.js";import{u as Ce}from"./useTableFilters-7bb371e7.js";import{e as te}from"./errorHandler-5ea9ae85.js";import{s as ne}from"./validation-24839588.js";import{A as y}from"./AsciiPanel-5614714e.js";import{A as z}from"./AsciiButton-4907e65e.js";import{G as Se}from"./GovernanceCatalogCharts-dba3db5c.js";import{S as Fe}from"./SkeletonLoader-792007e7.js";const _e=V`
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
`,$e=v.div`
  user-select: none;
  animation: ${_e} 0.3s ease-out;
  margin-bottom: 2px;
`,ze=v.span`
  color: ${o.muted};
  margin-right: 6px;
  font-family: Consolas;
  font-size: 12px;
  transition: color 0.2s ease;
`,ke=v.div`
  display: flex;
  align-items: center;
  padding: ${a=>a.$level===0?"8px":"6px 8px"};
  padding-left: ${a=>a.$level*24+8}px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.2s ease;
  position: relative;
  margin: 2px 0;
  font-family: Consolas;
  font-size: 12px;
  
  background: transparent;
  
  ${a=>a.$nodeType==="schema"?`
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
`,we=v.div`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  border-radius: 2px;
  background: ${a=>a.$isExpanded?o.accent:o.backgroundSoft};
  color: ${a=>a.$isExpanded?"#ffffff":o.accent};
  font-size: 10px;
  font-weight: bold;
  font-family: Consolas;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.1);
  }
`,Be=v.span`
  flex: 1;
  font-family: Consolas;
  font-size: ${a=>a.$isSchema?"13px":"12px"};
  color: ${a=>a.$isSchema?o.accent:o.foreground};
  font-weight: ${a=>a.$isSchema?600:500};
  margin-right: 8px;
`,Ne=v.span`
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
`,Le=v.div`
  max-height: ${a=>a.$isExpanded?"10000px":"0"};
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`,Ae=v.div`
  padding: 8px;
  padding-left: ${a=>(a.$level||0)*24+36}px;
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
`,A=a=>{if(!a)return o.muted;switch(a){case"HEALTHY":case"EXCELLENT":return o.success;case"WARNING":return o.warning;case"CRITICAL":return o.danger;case"REAL_TIME":case"HIGH":return o.accent;case"MEDIUM":return o.accentSoft;case"LOW":case"RARE":return o.muted;default:return o.muted}},Te=({items:a,onItemClick:b})=>{const[h,D]=l.useState(new Set),s=l.useMemo(()=>{const r=new Map;return a.forEach(d=>{const c=d.schema_name||"default";r.has(c)||r.set(c,{name:c,objects:[]}),r.get(c).objects.push(d)}),Array.from(r.values()).sort((d,c)=>d.name.localeCompare(c.name))},[a]),T=r=>{D(d=>{const c=new Set(d);return c.has(r)?c.delete(r):c.add(r),c})},W=(r,d)=>{if(r===0)return null;const c=[];for(let p=0;p<r-1;p++)c.push("│  ");return c.push(d?"└─ ":"├─ "),e.jsx(ze,{$isLast:d,children:c.join("")})},j=r=>{if(r==null)return"N/A";const d=Number(r);return isNaN(d)?"N/A":d.toLocaleString()},O=r=>{if(r==null)return"N/A";const d=Number(r);return isNaN(d)?"N/A":d<1?`${(d*1024).toFixed(2)} KB`:`${d.toFixed(2)} MB`},k=(r,d)=>{const c=h.has(r.name),E=s.findIndex(R=>R.name===r.name)===s.length-1;return e.jsxs($e,{children:[e.jsxs(ke,{$level:d,$isExpanded:c,$nodeType:"schema",onClick:()=>T(r.name),children:[W(d,E),e.jsx(we,{$isExpanded:c,children:c?f.arrowDown:f.arrowRight}),e.jsx("span",{style:{marginRight:"8px",color:o.accent,fontFamily:"Consolas"},children:f.blockFull}),e.jsx(Be,{$isSchema:!0,children:r.name}),e.jsxs(Ne,{children:[r.objects.length," ",r.objects.length===1?"object":"objects"]})]}),e.jsx(Le,{$isExpanded:c,$level:d,children:c&&r.objects.map((R,C)=>I(R,r.name,d+1,C===r.objects.length-1))})]},r.name)},I=(r,d,c,p)=>e.jsxs(Ae,{$level:c,onClick:()=>b==null?void 0:b(r),children:[W(c,p),e.jsx("span",{style:{marginRight:"8px",color:o.muted,fontFamily:"Consolas"},children:f.blockFull}),e.jsx("span",{style:{marginRight:"8px",fontWeight:500,color:o.foreground,fontFamily:"Consolas"},children:r.object_name||"N/A"}),r.object_type&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:o.backgroundSoft,color:o.foreground,border:`1px solid ${o.border}`,marginRight:4},children:r.object_type}),r.health_status&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:A(r.health_status)+"20",color:A(r.health_status),border:`1px solid ${A(r.health_status)}`,marginRight:4},children:r.health_status}),r.access_frequency&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:A(r.access_frequency)+"20",color:A(r.access_frequency),border:`1px solid ${A(r.access_frequency)}`,marginRight:4},children:r.access_frequency}),e.jsxs("span",{style:{marginLeft:"auto",color:o.muted,fontSize:11,fontFamily:"Consolas"},children:[j(r.row_count)," rows ",f.bullet," ",O(r.table_size_mb)]})]},r.id);return s.length===0?e.jsx(re,{children:e.jsxs("div",{style:{padding:"60px 40px",textAlign:"center",color:o.muted,fontFamily:"Consolas"},children:[e.jsx("div",{style:{fontSize:48,marginBottom:16,fontFamily:"Consolas",opacity:.5},children:f.blockFull}),e.jsx("div",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,marginBottom:8,color:o.foreground},children:"No governance data available"}),e.jsx("div",{style:{fontSize:12,fontFamily:"Consolas",opacity:.7,color:o.muted},children:"Data will appear here once collected."})]})}):e.jsx(re,{children:s.map(r=>k(r,0))})};V`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;V`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;const U=a=>{if(!a)return o.muted;switch(a){case"HEALTHY":case"EXCELLENT":return o.accent;case"WARNING":return o.muted;case"CRITICAL":return o.foreground;default:return o.muted}},He=()=>{const{page:a,limit:b,setPage:h,setLimit:D}=je(1,20,1e3),{filters:s,setFilter:T,clearFilters:W}=Ce({server_name:"",database_name:"",object_type:"",health_status:"",access_frequency:"",search:""}),[j,O]=l.useState(""),[k,I]=l.useState("desc"),[r,d]=l.useState(!0),[c,p]=l.useState(null),[E,R]=l.useState([]),[C,q]=l.useState({}),[w,X]=l.useState({total:0,totalPages:0,currentPage:1,limit:20}),[se,ae]=l.useState([]),[ie,K]=l.useState([]),[J,le]=l.useState([]),[Z,ee]=l.useState(!0),[ce,H]=l.useState(!1),[B,de]=l.useState("list"),[x,me]=l.useState(null),[N,M]=l.useState("overview"),u=l.useRef(!0);l.useCallback(async()=>{if(!u.current)return;const t=Date.now(),i=300;try{d(!0),p(null);const m=ne(s.search,100),[g,F,_]=await Promise.all([$.getMSSQLItems({page:a,limit:b,server_name:s.server_name,database_name:s.database_name,object_type:s.object_type,health_status:s.health_status,access_frequency:s.access_frequency,search:m}),$.getMSSQLMetrics(),$.getMSSQLServers()]),G=Date.now()-t,pe=Math.max(0,i-G);await new Promise(xe=>setTimeout(xe,pe)),u.current&&(R(g.data||[]),X(g.pagination||{total:0,totalPages:0,currentPage:1,limit:20}),q(F||{}),ae(_||[]))}catch(m){u.current&&p(te(m))}finally{u.current&&d(!1)}},[a,b,s.server_name,s.database_name,s.object_type,s.health_status,s.access_frequency,s.search]);const Q=l.useCallback(async()=>{if(!u.current)return;const t=Date.now(),i=300;try{ee(!0),p(null);const m=ne(s.search,100),g=await $.getMSSQLItems({page:a,limit:b,server_name:s.server_name,database_name:s.database_name,object_type:s.object_type,health_status:s.health_status,access_frequency:s.access_frequency,search:m}),F=Date.now()-t,_=Math.max(0,i-F);await new Promise(G=>setTimeout(G,_)),u.current&&(le(g.data||[]),X(g.pagination||{total:0,totalPages:0,currentPage:1,limit:20}))}catch(m){u.current&&p(te(m))}finally{u.current&&ee(!1)}},[a,b,s.server_name,s.database_name,s.object_type,s.health_status,s.access_frequency,s.search]);l.useEffect(()=>{u.current=!0,(async()=>{await Q();try{const m=await $.getMSSQLMetrics();u.current&&q(m||{})}catch(m){console.error("MSSQL: Error loading metrics:",m),u.current&&console.error("MSSQL: Error loading metrics:",m)}})();const i=setInterval(()=>{u.current&&(Q(),$.getMSSQLMetrics().then(m=>{u.current&&q(m||{})}).catch(m=>{console.error("MSSQL: Error loading metrics in interval:",m)}))},3e4);return()=>{u.current=!1,clearInterval(i)}},[Q]),l.useEffect(()=>{(async()=>{if(s.server_name&&u.current)try{const i=await $.getMSSQLDatabases(s.server_name);u.current&&K(i||[])}catch(i){u.current&&console.error("Error loading databases:",i)}else K([])})()},[s.server_name]);const ue=l.useCallback(t=>{t&&(me(i=>i&&t.id&&i.id===t.id?null:t),M("overview"))},[]),Y=l.useCallback(t=>{if(t==null)return"N/A";const i=Number(t);return isNaN(i)?"N/A":i<1?`${(i*1024).toFixed(2)} KB`:`${i.toFixed(2)} MB`},[]),S=l.useCallback(t=>{if(t==null)return"N/A";const i=Number(t);return isNaN(i)?"N/A":i.toLocaleString()},[]),P=l.useCallback(t=>{if(t==null)return"N/A";const i=Number(t);return isNaN(i)?"N/A":`${i.toFixed(2)}%`},[]);l.useCallback(t=>t?new Date(t).toLocaleString():"N/A",[]),l.useCallback(t=>{if(t==null)return"N/A";const i=Number(t);return isNaN(i)?"N/A":i<1?`${(i*1e3).toFixed(2)} ms`:`${i.toFixed(2)} s`},[]);const L=l.useCallback((t,i)=>{T(t,i),t==="server_name"&&T("database_name",""),h(1)},[T,h]);l.useCallback(t=>{j===t?I(i=>i==="asc"?"desc":"asc"):(O(t),I("desc")),h(1)},[j,h]),l.useMemo(()=>j?[...E].sort((t,i)=>{let m=t[j],g=i[j];if(m==null&&(m=""),g==null&&(g=""),typeof m=="string"&&typeof g=="string")return k==="asc"?m.localeCompare(g):g.localeCompare(m);const F=Number(m),_=Number(g);return!isNaN(F)&&!isNaN(_)?k==="asc"?F-_:_-F:k==="asc"?String(m).localeCompare(String(g)):String(g).localeCompare(String(m))}):E,[E,j,k]);const ge=l.useCallback(t=>e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${o.border}`},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:"0 0 12px 0",paddingBottom:4,borderBottom:`2px solid ${o.accent}`},children:"Basic Information"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:[e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Server:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.server_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Database:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.database_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Schema:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.schema_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Object:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.object_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Type:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.object_type||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Health Status:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.health_status?e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:U(t.health_status)+"20",color:U(t.health_status),border:`1px solid ${U(t.health_status)}`},children:t.health_status}):"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Access Frequency:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.access_frequency||"N/A"})]})]})]}),e.jsxs("div",{style:{marginBottom:0},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:"0 0 12px 0",paddingBottom:4,borderBottom:`2px solid ${o.accent}`},children:"Storage"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:[e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Row Count:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:S(t.row_count)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Table Size:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:Y(t.table_size_mb)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Fragmentation:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:P(t.fragmentation_pct)})]})]})]})]}),[Y,S,P]),fe=l.useCallback(t=>e.jsx("div",{children:e.jsxs("div",{style:{marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${o.border}`},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:"0 0 12px 0",paddingBottom:4,borderBottom:`2px solid ${o.accent}`},children:"Performance Metrics"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:[e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"User Seeks:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:S(t.user_seeks)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"User Scans:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:S(t.user_scans)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"User Lookups:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:S(t.user_lookups)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"User Updates:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:S(t.user_updates)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Fragmentation:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:P(t.fragmentation_pct)})]})]})]})}),[S,P]),he=l.useCallback(t=>e.jsx("div",{children:e.jsxs("div",{style:{marginBottom:0},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:"0 0 12px 0",paddingBottom:4,borderBottom:`2px solid ${o.accent}`},children:"Recommendations"}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Recommendation Summary:"}),e.jsx("div",{style:{whiteSpace:"pre-wrap",fontFamily:"Consolas",fontSize:12,color:o.foreground},children:t.recommendation_summary||"No recommendations available"})]})})]})}),[]);return Z&&J.length===0?e.jsx(Fe,{variant:"table"}):e.jsxs(ye,{children:[e.jsx("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:n.spacing.lg,paddingBottom:n.spacing.md,borderBottom:`2px solid ${o.accent}`},children:e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:o.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:o.accent,marginRight:n.spacing.sm},children:f.blockFull}),"GOVERNANCE CATALOG - MSSQL"]})}),c&&e.jsx("div",{style:{marginBottom:n.spacing.md},children:e.jsx(y,{title:"ERROR",children:e.jsx("div",{style:{padding:n.spacing.sm,color:o.foreground,fontSize:12,fontFamily:"Consolas",backgroundColor:o.backgroundSoft,borderRadius:2},children:c})})}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:n.spacing.md,marginBottom:n.spacing.lg},children:[e.jsx(y,{title:"Total Objects",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:o.foreground},children:C.total_objects||0})}),e.jsx(y,{title:"Total Size",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:o.foreground},children:Y(C.total_size_mb)})}),e.jsx(y,{title:"Healthy",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:o.foreground},children:C.healthy_count||0})}),e.jsx(y,{title:"Warning",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:o.foreground},children:C.warning_count||0})}),e.jsx(y,{title:"Critical",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:o.foreground},children:C.critical_count||0})}),e.jsx(y,{title:"Unique Servers",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:o.foreground},children:C.unique_servers||0})})]}),e.jsx(y,{title:"FILTERS",children:e.jsxs("div",{style:{display:"flex",gap:n.spacing.sm,flexWrap:"wrap",alignItems:"center"},children:[e.jsxs("select",{value:s.server_name,onChange:t=>L("server_name",t.target.value),style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Servers"}),se.map(t=>e.jsx("option",{value:t,children:t},t))]}),e.jsxs("select",{value:s.database_name,onChange:t=>L("database_name",t.target.value),disabled:!s.server_name,style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,opacity:s.server_name?1:.5,cursor:s.server_name?"pointer":"not-allowed",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{s.server_name&&(t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px")},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Databases"}),ie.map(t=>e.jsx("option",{value:t,children:t},t))]}),e.jsxs("select",{value:s.object_type,onChange:t=>L("object_type",t.target.value),style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Types"}),e.jsx("option",{value:"TABLE",children:"TABLE"}),e.jsx("option",{value:"VIEW",children:"VIEW"}),e.jsx("option",{value:"STORED_PROCEDURE",children:"STORED_PROCEDURE"})]}),e.jsxs("select",{value:s.health_status,onChange:t=>L("health_status",t.target.value),style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Health Status"}),e.jsx("option",{value:"EXCELLENT",children:"Excellent"}),e.jsx("option",{value:"HEALTHY",children:"Healthy"}),e.jsx("option",{value:"WARNING",children:"Warning"}),e.jsx("option",{value:"CRITICAL",children:"Critical"})]}),e.jsxs("select",{value:s.access_frequency,onChange:t=>L("access_frequency",t.target.value),style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Access Frequency"}),e.jsx("option",{value:"REAL_TIME",children:"Real Time"}),e.jsx("option",{value:"HIGH",children:"High"}),e.jsx("option",{value:"MEDIUM",children:"Medium"}),e.jsx("option",{value:"LOW",children:"Low"}),e.jsx("option",{value:"RARE",children:"Rare"})]}),e.jsx("input",{type:"text",placeholder:"Search object name...",value:s.search,onChange:t=>L("search",t.target.value),style:{flex:1,minWidth:"200px",padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"}}),e.jsx(z,{label:"Reset All",onClick:()=>{W(),h(1)},variant:"ghost"})]})}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:n.spacing.lg,marginTop:n.spacing.sm,fontFamily:"Consolas",fontSize:12,gap:n.spacing.lg},children:[e.jsxs("div",{style:{display:"flex",gap:n.spacing.sm,alignItems:"center"},children:[e.jsx("label",{style:{color:o.muted,fontSize:11,fontFamily:"Consolas"},children:"Items per page:"}),e.jsxs("select",{value:b,onChange:t=>{D(Number(t.target.value)),h(1)},style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:10,children:"10"}),e.jsx("option",{value:20,children:"20"}),e.jsx("option",{value:50,children:"50"}),e.jsx("option",{value:100,children:"100"}),e.jsx("option",{value:200,children:"200"})]})]}),e.jsxs("div",{style:{display:"flex",gap:n.spacing.sm,alignItems:"center"},children:[e.jsx(z,{label:B==="list"?"Show Charts":"Show List",onClick:()=>de(B==="list"?"charts":"list"),variant:B==="charts"?"primary":"ghost"}),e.jsx(z,{label:"Metrics Info",onClick:()=>H(!0),variant:"ghost"})]})]}),ce&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>H(!1),children:e.jsxs("div",{style:{width:"90%",maxWidth:900,maxHeight:"90vh",overflowY:"auto"},onClick:t=>t.stopPropagation(),children:[e.jsx("style",{children:`
              div[style*="overflowY"]::-webkit-scrollbar {
                width: 0px;
                display: none;
              }
              div[style*="overflowY"] {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}),e.jsx(y,{title:"METRICS PLAYBOOK - MSSQL GOVERNANCE",children:e.jsxs("div",{style:{padding:n.spacing.md,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[f.blockFull," Total Objects"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Total number of objects (tables, views, stored procedures, indexes) cataloged across all MSSQL servers and databases."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[f.blockFull," Total Size"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Combined storage size of all objects across all MSSQL databases. Includes data files, log files, and index sizes."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[f.blockFull," Healthy"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Objects with HEALTHY status, indicating optimal performance, low fragmentation, proper indexing, and good execution statistics."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.muted,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[f.blockFull," Warning"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Objects with WARNING status, indicating potential issues such as moderate fragmentation, missing indexes, suboptimal query plans, or performance concerns that should be monitored."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.foreground,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[f.blockFull," Critical"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Objects with CRITICAL status, indicating serious issues requiring immediate attention such as high fragmentation, missing critical indexes, slow queries, or severe performance degradation."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[f.blockFull," Unique Servers"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Number of distinct MSSQL server instances being monitored in the governance catalog."})]}),e.jsxs("div",{style:{marginTop:n.spacing.md,padding:n.spacing.sm,background:o.backgroundSoft,borderRadius:2,border:`1px solid ${o.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:o.muted,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:[f.blockSemi," Note"]}),e.jsx("div",{style:{fontSize:11,color:o.foreground,fontFamily:"Consolas"},children:"These metrics are calculated in real-time from the data_governance_catalog_mssql table and reflect the current state of your MSSQL governance catalog."})]}),e.jsx("div",{style:{marginTop:n.spacing.md,textAlign:"right"},children:e.jsx(z,{label:"Close",onClick:()=>H(!1),variant:"ghost"})})]})})]})}),B==="charts"&&e.jsx(Se,{engine:"mssql",selectedItem:x?{server_name:x.server_name,database_name:x.database_name,schema_name:x.schema_name,table_name:x.table_name}:null}),B==="list"&&Z?e.jsx(be,{children:"Loading tree view..."}):B==="list"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{display:"grid",gridTemplateColumns:x?"1fr 500px":"1fr",gap:n.spacing.md,marginTop:n.spacing.md},children:[e.jsx(Te,{items:J,onItemClick:ue}),x&&e.jsxs("div",{style:{position:"sticky",top:n.spacing.md,maxHeight:"calc(100vh - 200px)",overflowY:"auto"},children:[e.jsx("style",{children:`
                  div[style*="overflowY"]::-webkit-scrollbar {
                    width: 0px;
                    display: none;
                  }
                  div[style*="overflowY"] {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                  }
                `}),e.jsxs(y,{title:"DETAILS",children:[e.jsxs("div",{style:{display:"flex",gap:n.spacing.xs,marginBottom:n.spacing.md,borderBottom:`1px solid ${o.border}`,paddingBottom:n.spacing.sm,flexWrap:"wrap"},children:[e.jsx(z,{label:"Overview",onClick:()=>M("overview"),variant:N==="overview"?"primary":"ghost"}),e.jsx(z,{label:"Performance",onClick:()=>M("performance"),variant:N==="performance"?"primary":"ghost"}),e.jsx(z,{label:"Recommendations",onClick:()=>M("recommendations"),variant:N==="recommendations"?"primary":"ghost"})]}),N==="overview"&&ge(x),N==="performance"&&fe(x),N==="recommendations"&&he(x)]})]})]}),w.totalPages>1&&e.jsx("div",{style:{marginTop:n.spacing.lg},children:e.jsxs(ve,{children:[e.jsx(oe,{onClick:()=>h(Math.max(1,a-1)),disabled:a===1,children:"Previous"}),e.jsxs("span",{style:{fontFamily:"Consolas",fontSize:12,color:o.foreground},children:["Page ",w.currentPage," of ",w.totalPages," (",w.total," total)"]}),e.jsx(oe,{onClick:()=>h(Math.min(w.totalPages,a+1)),disabled:a===w.totalPages,children:"Next"})]})})]}):null]})};export{He as default};
