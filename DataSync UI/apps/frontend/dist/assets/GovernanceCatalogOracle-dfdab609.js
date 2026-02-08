import{m as K,f as v,b as o,r as i,j as e,e as f,X as F,t as n,C as be,o as ve,P as je,p as oe}from"./index-b1fa964d.js";import{u as Ce}from"./usePagination-05d2e222.js";import{u as Se}from"./useTableFilters-34614e65.js";import{e as te}from"./errorHandler-5ea9ae85.js";import{s as ne}from"./validation-24839588.js";import{A as M}from"./AsciiPanel-3399d5be.js";import{A as _}from"./AsciiButton-3fcfdd9b.js";import{G as Fe}from"./GovernanceCatalogCharts-22d29693.js";import{S as _e}from"./SkeletonLoader-09c12074.js";import{L as $e}from"./LineageSummaryCards-33059ad5.js";const we=K`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,se=v.div`
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
  animation: ${we} 0.3s ease-out;
  margin-bottom: 2px;
`,ke=v.span`
  color: ${o.muted};
  margin-right: 6px;
  font-family: Consolas;
  font-size: 12px;
  transition: color 0.2s ease;
`,Be=v.div`
  display: flex;
  align-items: center;
  padding: ${r=>r.$level===0?"8px":"6px 8px"};
  padding-left: ${r=>r.$level*24+8}px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.2s ease;
  position: relative;
  margin: 2px 0;
  font-family: Consolas;
  font-size: 12px;
  
  background: transparent;
  
  ${r=>r.$nodeType==="schema"?`
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
`,Te=v.div`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  border-radius: 2px;
  background: ${r=>r.$isExpanded?o.accent:o.backgroundSoft};
  color: ${r=>r.$isExpanded?"#ffffff":o.accent};
  font-size: 10px;
  font-weight: bold;
  font-family: Consolas;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.1);
  }
`,Ne=v.span`
  flex: 1;
  font-family: Consolas;
  font-size: ${r=>r.$isSchema?"13px":"12px"};
  color: ${r=>r.$isSchema?o.accent:o.foreground};
  font-weight: ${r=>r.$isSchema?600:500};
  margin-right: 8px;
`,Ae=v.span`
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
`,Re=v.div`
  max-height: ${r=>r.$isExpanded?"10000px":"0"};
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`,Ee=v.div`
  padding: 8px;
  padding-left: ${r=>(r.$level||0)*24+36}px;
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
`,T=r=>{if(!r)return o.muted;switch(r){case"HEALTHY":case"EXCELLENT":return o.success;case"WARNING":return o.warning;case"CRITICAL":return o.danger;case"REAL_TIME":case"HIGH":return o.accent;case"MEDIUM":return o.accentSoft;case"LOW":case"RARE":return o.muted;default:return o.muted}},Le=({items:r,onItemClick:y})=>{const[h,D]=i.useState(new Set),a=i.useMemo(()=>{const s=new Map;return r.forEach(d=>{const c=d.schema_name||"default";s.has(c)||s.set(c,{name:c,objects:[]}),s.get(c).objects.push(d)}),Array.from(s.values()).sort((d,c)=>d.name.localeCompare(c.name))},[r]),N=s=>{D(d=>{const c=new Set(d);return c.has(s)?c.delete(s):c.add(s),c})},L=(s,d)=>{if(s===0)return null;const c=[];for(let p=0;p<s-1;p++)c.push("│  ");return c.push(d?"└─ ":"├─ "),e.jsx(ke,{$isLast:d,children:c.join("")})},j=s=>{if(s==null)return"N/A";const d=Number(s);return isNaN(d)?"N/A":d.toLocaleString()},H=s=>{if(s==null)return"N/A";const d=Number(s);return isNaN(d)?"N/A":d<1?`${(d*1024).toFixed(2)} KB`:`${d.toFixed(2)} MB`},$=(s,d)=>{const c=h.has(s.name),A=a.findIndex(R=>R.name===s.name)===a.length-1;return e.jsxs(ze,{children:[e.jsxs(Be,{$level:d,$isExpanded:c,$nodeType:"schema",onClick:()=>N(s.name),children:[L(d,A),e.jsx(Te,{$isExpanded:c,children:c?f.arrowDown:f.arrowRight}),e.jsx("span",{style:{marginRight:"8px",color:o.accent,fontFamily:"Consolas"},children:f.blockFull}),e.jsx(Ne,{$isSchema:!0,children:s.name}),e.jsxs(Ae,{children:[s.objects.length," ",s.objects.length===1?"object":"objects"]})]}),e.jsx(Re,{$isExpanded:c,$level:d,children:c&&s.objects.map((R,x)=>I(R,s.name,d+1,x===s.objects.length-1))})]},s.name)},I=(s,d,c,p)=>e.jsxs(Ee,{$level:c,onClick:()=>y==null?void 0:y(s),children:[L(c,p),e.jsx("span",{style:{marginRight:"8px",color:o.muted,fontFamily:"Consolas"},children:f.blockFull}),e.jsx("span",{style:{marginRight:"8px",fontWeight:500,color:o.foreground,fontFamily:"Consolas"},children:s.object_name||"N/A"}),s.object_type&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:o.backgroundSoft,color:o.foreground,border:`1px solid ${o.border}`,marginRight:4},children:s.object_type}),s.health_status&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:T(s.health_status)+"20",color:T(s.health_status),border:`1px solid ${T(s.health_status)}`,marginRight:4},children:s.health_status}),s.access_frequency&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:T(s.access_frequency)+"20",color:T(s.access_frequency),border:`1px solid ${T(s.access_frequency)}`,marginRight:4},children:s.access_frequency}),e.jsxs("span",{style:{marginLeft:"auto",color:o.muted,fontSize:11,fontFamily:"Consolas"},children:[j(s.row_count)," rows ",f.bullet," ",H(s.table_size_mb)]})]},s.id);return a.length===0?e.jsx(se,{children:e.jsxs("div",{style:{padding:"60px 40px",textAlign:"center",color:o.muted,fontFamily:"Consolas"},children:[e.jsx("div",{style:{fontSize:48,marginBottom:16,fontFamily:"Consolas",opacity:.5},children:f.blockFull}),e.jsx("div",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,marginBottom:8,color:o.foreground},children:"No governance data available"}),e.jsx("div",{style:{fontSize:12,fontFamily:"Consolas",opacity:.7,color:o.muted},children:"Data will appear here once collected."})]})}):e.jsx(se,{children:a.map(s=>$(s,0))})};K`
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
`;const X=r=>{if(!r)return o.muted;switch(r){case"HEALTHY":case"EXCELLENT":return o.accent;case"WARNING":return o.muted;case"CRITICAL":return o.foreground;default:return o.muted}},Ve=()=>{const{page:r,limit:y,setPage:h,setLimit:D}=Ce(1,20,1e3),{filters:a,setFilter:N,clearFilters:L}=Se({server_name:"",schema_name:"",health_status:"",access_frequency:"",search:""}),[j,H]=i.useState(""),[$,I]=i.useState("desc"),[s,d]=i.useState(!0),[c,p]=i.useState(null),[A,R]=i.useState([]),[x,q]=i.useState({}),[w,U]=i.useState({total:0,totalPages:0,currentPage:1,limit:20}),[re,ae]=i.useState([]),[ie,J]=i.useState([]),[Q,le]=i.useState([]),[Z,ee]=i.useState(!0),[ce,Y]=i.useState(!1),[z,de]=i.useState("list"),[b,me]=i.useState(null),[k,W]=i.useState("overview"),g=i.useRef(!0);i.useCallback(async()=>{if(!g.current)return;const t=Date.now(),l=300;try{d(!0),p(null);const m=ne(a.search,100),[u,C,S]=await Promise.all([F.getOracleItems({page:r,limit:y,server_name:a.server_name,schema_name:a.schema_name,health_status:a.health_status,access_frequency:a.access_frequency,search:m}),F.getOracleMetrics(),F.getOracleServers()]),V=Date.now()-t,xe=Math.max(0,l-V);await new Promise(ye=>setTimeout(ye,xe)),g.current&&(R(u.data||[]),U(u.pagination||{total:0,totalPages:0,currentPage:1,limit:20}),q(C||{}),ae(S||[]))}catch(m){g.current&&p(te(m))}finally{g.current&&d(!1)}},[r,y,a.server_name,a.schema_name,a.health_status,a.access_frequency,a.search]);const G=i.useCallback(async()=>{if(!g.current)return;const t=Date.now(),l=300;try{ee(!0),p(null);const m=ne(a.search,100),u=await F.getOracleItems({page:r,limit:y,server_name:a.server_name,schema_name:a.schema_name,health_status:a.health_status,access_frequency:a.access_frequency,search:m}),C=Date.now()-t,S=Math.max(0,l-C);await new Promise(V=>setTimeout(V,S)),g.current&&(le(u.data||[]),U(u.pagination||{total:0,totalPages:0,currentPage:1,limit:20}))}catch(m){g.current&&p(te(m))}finally{g.current&&ee(!1)}},[r,y,a.server_name,a.schema_name,a.health_status,a.access_frequency,a.search]);i.useEffect(()=>{g.current=!0,(async()=>{await G();try{const m=await F.getOracleMetrics();g.current&&q(m||{})}catch(m){console.error("Oracle: Error loading metrics:",m),g.current&&console.error("Oracle: Error loading metrics:",m)}})();const l=setInterval(()=>{g.current&&(G(),F.getOracleMetrics().then(m=>{g.current&&q(m||{})}).catch(m=>{console.error("Oracle: Error loading metrics in interval:",m)}))},3e4);return()=>{g.current=!1,clearInterval(l)}},[G]),i.useEffect(()=>{(async()=>{if(a.server_name&&g.current)try{const l=await F.getOracleSchemas(a.server_name);g.current&&J(l||[])}catch(l){g.current&&console.error("Error loading schemas:",l)}else J([])})()},[a.server_name]);const ge=i.useCallback(t=>{t&&(me(l=>l&&t.id&&l.id===t.id?null:t),W("overview"))},[]),B=i.useCallback(t=>{if(t==null)return"N/A";const l=Number(t);return isNaN(l)?"N/A":l<1?`${(l*1024).toFixed(2)} KB`:`${l.toFixed(2)} MB`},[]),O=i.useCallback(t=>{if(t==null)return"N/A";const l=Number(t);return isNaN(l)?"N/A":l.toLocaleString()},[]);i.useCallback(t=>t?new Date(t).toLocaleString():"N/A",[]);const P=i.useCallback(t=>{if(t==null)return"N/A";const l=Number(t);return isNaN(l)?"N/A":`${l.toFixed(2)}%`},[]),E=i.useCallback((t,l)=>{N(t,l),t==="server_name"&&N("schema_name",""),h(1)},[N,h]);i.useCallback(t=>{j===t?I(l=>l==="asc"?"desc":"asc"):(H(t),I("desc")),h(1)},[j,h]);const ue=i.useMemo(()=>[{title:"Overview",rows:[{label:"Total Tables",value:x.total_tables??0},{label:"Total Size",value:B(x.total_size_mb)},{label:"Total Rows",value:O(x.total_rows)},{label:"Unique Servers",value:x.unique_servers??0}]},{title:"Health",rows:[{label:"Healthy",value:x.healthy_count??0},{label:"Warning",value:x.warning_count??0},{label:"Critical",value:x.critical_count??0}]}],[x,B,O]);i.useMemo(()=>j?[...A].sort((t,l)=>{let m=t[j],u=l[j];if(m==null&&(m=""),u==null&&(u=""),typeof m=="string"&&typeof u=="string")return $==="asc"?m.localeCompare(u):u.localeCompare(m);const C=Number(m),S=Number(u);return!isNaN(C)&&!isNaN(S)?$==="asc"?C-S:S-C:$==="asc"?String(m).localeCompare(String(u)):String(u).localeCompare(String(m))}):A,[A,j,$]);const fe=i.useCallback(t=>e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:n.spacing.md,paddingBottom:n.spacing.sm,borderBottom:`1px solid ${o.border}`},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:`0 0 ${n.spacing.sm} 0`,paddingBottom:n.spacing.xs,borderBottom:`2px solid ${o.accent}`},children:"Basic Information"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:n.spacing.sm},children:[e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Server:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.server_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Schema:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.schema_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Table:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.table_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Health Status:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.health_status?e.jsx("span",{style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:X(t.health_status)+"20",color:X(t.health_status),border:`1px solid ${X(t.health_status)}`},children:t.health_status}):"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Access Frequency:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.access_frequency||"N/A"})]})]})]}),e.jsxs("div",{style:{marginBottom:0},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:`0 0 ${n.spacing.sm} 0`,paddingBottom:n.spacing.xs,borderBottom:`2px solid ${o.accent}`},children:"Storage"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:n.spacing.sm},children:[e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Row Count:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:O(t.row_count||t.num_rows)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Table Size:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:B(t.table_size_mb)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Index Size:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:B(t.index_size_mb)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Total Size:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:B(t.total_size_mb)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Tablespace:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.tablespace_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Fragmentation:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:P(t.fragmentation_pct)})]})]})]})]}),[B,O,P]),he=i.useCallback(t=>e.jsx("div",{children:e.jsxs("div",{style:{marginBottom:n.spacing.md,paddingBottom:n.spacing.sm,borderBottom:`1px solid ${o.border}`},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:`0 0 ${n.spacing.sm} 0`,paddingBottom:n.spacing.xs,borderBottom:`2px solid ${o.accent}`},children:"Performance Metrics"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:n.spacing.sm},children:[e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Health Score:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.health_score!==null&&t.health_score!==void 0?`${Number(t.health_score).toFixed(2)}`:"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Fragmentation:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:P(t.fragmentation_pct)})]})]})]})}),[P]),pe=i.useCallback(t=>e.jsx("div",{children:e.jsxs("div",{style:{marginBottom:0},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:`0 0 ${n.spacing.sm} 0`,paddingBottom:n.spacing.xs,borderBottom:`2px solid ${o.accent}`},children:"Recommendations"}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:n.spacing.sm},children:e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Recommendation Summary:"}),e.jsx("div",{style:{whiteSpace:"pre-wrap",fontFamily:"Consolas",fontSize:12,color:o.foreground},children:t.recommendation_summary||"No recommendations available"})]})})]})}),[]);return Z&&Q.length===0?e.jsx(_e,{variant:"table"}):e.jsxs(be,{children:[e.jsx("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:n.spacing.lg,paddingBottom:n.spacing.md,borderBottom:`2px solid ${o.accent}`},children:e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:o.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:o.accent,marginRight:n.spacing.sm},children:f.blockFull}),"GOVERNANCE CATALOG - ORACLE"]})}),c&&e.jsx("div",{style:{marginBottom:n.spacing.md},children:e.jsx(M,{title:"ERROR",children:e.jsx("div",{style:{padding:n.spacing.sm,color:o.foreground,fontSize:12,fontFamily:"Consolas",backgroundColor:o.backgroundSoft,borderRadius:2},children:c})})}),e.jsx($e,{cards:ue}),e.jsx(M,{title:"FILTERS",children:e.jsxs("div",{style:{display:"flex",gap:n.spacing.sm,flexWrap:"wrap",alignItems:"center"},children:[e.jsxs("select",{value:a.server_name,onChange:t=>E("server_name",t.target.value),style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Servers"}),re.map(t=>e.jsx("option",{value:t,children:t},t))]}),e.jsxs("select",{value:a.schema_name,onChange:t=>E("schema_name",t.target.value),disabled:!a.server_name,style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,opacity:a.server_name?1:.5,cursor:a.server_name?"pointer":"not-allowed",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{a.server_name&&(t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px")},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Schemas"}),ie.map(t=>e.jsx("option",{value:t,children:t},t))]}),e.jsxs("select",{value:a.health_status,onChange:t=>E("health_status",t.target.value),style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Health Status"}),e.jsx("option",{value:"EXCELLENT",children:"Excellent"}),e.jsx("option",{value:"HEALTHY",children:"Healthy"}),e.jsx("option",{value:"WARNING",children:"Warning"}),e.jsx("option",{value:"CRITICAL",children:"Critical"})]}),e.jsxs("select",{value:a.access_frequency,onChange:t=>E("access_frequency",t.target.value),style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Access Frequency"}),e.jsx("option",{value:"REAL_TIME",children:"Real Time"}),e.jsx("option",{value:"HIGH",children:"High"}),e.jsx("option",{value:"MEDIUM",children:"Medium"}),e.jsx("option",{value:"LOW",children:"Low"}),e.jsx("option",{value:"RARE",children:"Rare"})]}),e.jsx("input",{type:"text",placeholder:"Search table name...",value:a.search,onChange:t=>E("search",t.target.value),style:{flex:1,minWidth:"200px",padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"}}),e.jsx(_,{label:"Reset All",onClick:()=>{L(),h(1)},variant:"ghost"})]})}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:n.spacing.lg,marginTop:n.spacing.sm,fontFamily:"Consolas",fontSize:12,gap:n.spacing.lg},children:[e.jsxs("div",{style:{display:"flex",gap:n.spacing.sm,alignItems:"center"},children:[e.jsx("label",{style:{color:o.muted,fontSize:11,fontFamily:"Consolas"},children:"Items per page:"}),e.jsxs("select",{value:y,onChange:t=>{D(Number(t.target.value)),h(1)},style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:10,children:"10"}),e.jsx("option",{value:20,children:"20"}),e.jsx("option",{value:50,children:"50"}),e.jsx("option",{value:100,children:"100"}),e.jsx("option",{value:200,children:"200"})]})]}),e.jsxs("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[e.jsx(_,{label:z==="list"?"Show Charts":"Show List",onClick:()=>de(z==="list"?"charts":"list"),variant:z==="charts"?"primary":"ghost"}),e.jsx(_,{label:"Metrics Info",onClick:()=>Y(!0),variant:"ghost"})]})]}),ce&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>Y(!1),children:e.jsxs("div",{style:{width:"90%",maxWidth:900,maxHeight:"90vh",overflowY:"auto"},onClick:t=>t.stopPropagation(),children:[e.jsx("style",{children:`
              div[style*="overflowY"]::-webkit-scrollbar {
                width: 0px;
                display: none;
              }
              div[style*="overflowY"] {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}),e.jsx(M,{title:"METRICS PLAYBOOK - ORACLE GOVERNANCE",children:e.jsxs("div",{style:{padding:n.spacing.md,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[f.blockFull," Total Tables"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Total number of tables cataloged across all Oracle servers and schemas in the governance system."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[f.blockFull," Total Size"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Combined storage size of all tables across all Oracle databases. Includes data and index sizes from tablespaces."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[f.blockFull," Total Rows"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Total number of rows across all Oracle tables in the governance catalog."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[f.blockFull," Healthy"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Tables with HEALTHY status, indicating optimal performance, low fragmentation, proper indexing, and good access patterns."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.muted,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[f.blockFull," Warning"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Tables with WARNING status, indicating potential issues such as moderate fragmentation, suboptimal indexes, or performance concerns that should be monitored."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.foreground,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[f.blockFull," Critical"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Tables with CRITICAL status, indicating serious issues requiring immediate attention such as high fragmentation, missing indexes, or severe performance degradation."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[f.blockFull," Unique Servers"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Number of distinct Oracle server instances being monitored in the governance catalog."})]}),e.jsxs("div",{style:{marginTop:n.spacing.md,padding:n.spacing.sm,background:o.backgroundSoft,borderRadius:2,border:`1px solid ${o.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:o.muted,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:[f.blockSemi," Note"]}),e.jsx("div",{style:{fontSize:11,color:o.foreground,fontFamily:"Consolas"},children:"These metrics are calculated in real-time from the data_governance_catalog_oracle table and reflect the current state of your Oracle governance catalog."})]}),e.jsx("div",{style:{marginTop:n.spacing.md,textAlign:"right"},children:e.jsx(_,{label:"Close",onClick:()=>Y(!1),variant:"ghost"})})]})})]})}),z==="charts"&&e.jsx(Fe,{engine:"oracle",selectedItem:b?{server_name:b.server_name,schema_name:b.schema_name,table_name:b.table_name}:null}),z==="list"&&Z?e.jsx(ve,{children:"Loading tree view..."}):z==="list"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{display:"grid",gridTemplateColumns:b?"1fr 500px":"1fr",gap:n.spacing.md,marginTop:n.spacing.md},children:[e.jsx(Le,{items:Q,onItemClick:ge}),b&&e.jsxs("div",{style:{position:"sticky",top:n.spacing.md,maxHeight:"calc(100vh - 200px)",overflowY:"auto"},children:[e.jsx("style",{children:`
                  div[style*="overflowY"]::-webkit-scrollbar {
                    width: 0px;
                    display: none;
                  }
                  div[style*="overflowY"] {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                  }
                `}),e.jsxs(M,{title:"DETAILS",children:[e.jsxs("div",{style:{display:"flex",gap:n.spacing.xs,marginBottom:n.spacing.md,borderBottom:`1px solid ${o.border}`,paddingBottom:n.spacing.sm,flexWrap:"wrap"},children:[e.jsx(_,{label:"Overview",onClick:()=>W("overview"),variant:k==="overview"?"primary":"ghost"}),e.jsx(_,{label:"Performance",onClick:()=>W("performance"),variant:k==="performance"?"primary":"ghost"}),e.jsx(_,{label:"Recommendations",onClick:()=>W("recommendations"),variant:k==="recommendations"?"primary":"ghost"})]}),k==="overview"&&fe(b),k==="performance"&&he(b),k==="recommendations"&&pe(b)]})]})]}),w.totalPages>1&&e.jsx("div",{style:{marginTop:n.spacing.lg},children:e.jsxs(je,{children:[e.jsx(oe,{onClick:()=>h(Math.max(1,r-1)),disabled:r===1,children:"Previous"}),e.jsxs("span",{style:{fontFamily:"Consolas",fontSize:12,color:o.foreground},children:["Page ",w.currentPage," of ",w.totalPages," (",w.total," total)"]}),e.jsx(oe,{onClick:()=>h(Math.min(w.totalPages,r+1)),disabled:r===w.totalPages,children:"Next"})]})})]}):null]})};export{Ve as default};
