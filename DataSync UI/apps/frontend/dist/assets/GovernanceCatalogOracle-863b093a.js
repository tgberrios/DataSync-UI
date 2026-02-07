import{m as K,f as j,b as o,r as i,j as e,e as u,W as _,t as n,C as ye,o as be,P as ve,p as oe}from"./index-f6ac47b8.js";import{u as je}from"./usePagination-c6b4a268.js";import{u as Ce}from"./useTableFilters-7bb371e7.js";import{e as te}from"./errorHandler-5ea9ae85.js";import{s as ne}from"./validation-24839588.js";import{A as h}from"./AsciiPanel-5614714e.js";import{A as z}from"./AsciiButton-4907e65e.js";import{G as Se}from"./GovernanceCatalogCharts-dba3db5c.js";import{S as Fe}from"./SkeletonLoader-792007e7.js";const _e=K`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,se=j.div`
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
`,ze=j.div`
  user-select: none;
  animation: ${_e} 0.3s ease-out;
  margin-bottom: 2px;
`,$e=j.span`
  color: ${o.muted};
  margin-right: 6px;
  font-family: Consolas;
  font-size: 12px;
  transition: color 0.2s ease;
`,we=j.div`
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
`,ke=j.div`
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
`,Be=j.span`
  flex: 1;
  font-family: Consolas;
  font-size: ${r=>r.$isSchema?"13px":"12px"};
  color: ${r=>r.$isSchema?o.accent:o.foreground};
  font-weight: ${r=>r.$isSchema?600:500};
  margin-right: 8px;
`,Te=j.span`
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
`,Ne=j.div`
  max-height: ${r=>r.$isExpanded?"10000px":"0"};
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`,Ae=j.div`
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
`,T=r=>{if(!r)return o.muted;switch(r){case"HEALTHY":case"EXCELLENT":return o.success;case"WARNING":return o.warning;case"CRITICAL":return o.danger;case"REAL_TIME":case"HIGH":return o.accent;case"MEDIUM":return o.accentSoft;case"LOW":case"RARE":return o.muted;default:return o.muted}},Re=({items:r,onItemClick:y})=>{const[p,M]=i.useState(new Set),a=i.useMemo(()=>{const s=new Map;return r.forEach(d=>{const c=d.schema_name||"default";s.has(c)||s.set(c,{name:c,objects:[]}),s.get(c).objects.push(d)}),Array.from(s.values()).sort((d,c)=>d.name.localeCompare(c.name))},[r]),N=s=>{M(d=>{const c=new Set(d);return c.has(s)?c.delete(s):c.add(s),c})},W=(s,d)=>{if(s===0)return null;const c=[];for(let x=0;x<s-1;x++)c.push("│  ");return c.push(d?"└─ ":"├─ "),e.jsx($e,{$isLast:d,children:c.join("")})},C=s=>{if(s==null)return"N/A";const d=Number(s);return isNaN(d)?"N/A":d.toLocaleString()},D=s=>{if(s==null)return"N/A";const d=Number(s);return isNaN(d)?"N/A":d<1?`${(d*1024).toFixed(2)} KB`:`${d.toFixed(2)} MB`},$=(s,d)=>{const c=p.has(s.name),A=a.findIndex(R=>R.name===s.name)===a.length-1;return e.jsxs(ze,{children:[e.jsxs(we,{$level:d,$isExpanded:c,$nodeType:"schema",onClick:()=>N(s.name),children:[W(d,A),e.jsx(ke,{$isExpanded:c,children:c?u.arrowDown:u.arrowRight}),e.jsx("span",{style:{marginRight:"8px",color:o.accent,fontFamily:"Consolas"},children:u.blockFull}),e.jsx(Be,{$isSchema:!0,children:s.name}),e.jsxs(Te,{children:[s.objects.length," ",s.objects.length===1?"object":"objects"]})]}),e.jsx(Ne,{$isExpanded:c,$level:d,children:c&&s.objects.map((R,b)=>I(R,s.name,d+1,b===s.objects.length-1))})]},s.name)},I=(s,d,c,x)=>e.jsxs(Ae,{$level:c,onClick:()=>y==null?void 0:y(s),children:[W(c,x),e.jsx("span",{style:{marginRight:"8px",color:o.muted,fontFamily:"Consolas"},children:u.blockFull}),e.jsx("span",{style:{marginRight:"8px",fontWeight:500,color:o.foreground,fontFamily:"Consolas"},children:s.object_name||"N/A"}),s.object_type&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:o.backgroundSoft,color:o.foreground,border:`1px solid ${o.border}`,marginRight:4},children:s.object_type}),s.health_status&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:T(s.health_status)+"20",color:T(s.health_status),border:`1px solid ${T(s.health_status)}`,marginRight:4},children:s.health_status}),s.access_frequency&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:T(s.access_frequency)+"20",color:T(s.access_frequency),border:`1px solid ${T(s.access_frequency)}`,marginRight:4},children:s.access_frequency}),e.jsxs("span",{style:{marginLeft:"auto",color:o.muted,fontSize:11,fontFamily:"Consolas"},children:[C(s.row_count)," rows ",u.bullet," ",D(s.table_size_mb)]})]},s.id);return a.length===0?e.jsx(se,{children:e.jsxs("div",{style:{padding:"60px 40px",textAlign:"center",color:o.muted,fontFamily:"Consolas"},children:[e.jsx("div",{style:{fontSize:48,marginBottom:16,fontFamily:"Consolas",opacity:.5},children:u.blockFull}),e.jsx("div",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,marginBottom:8,color:o.foreground},children:"No governance data available"}),e.jsx("div",{style:{fontSize:12,fontFamily:"Consolas",opacity:.7,color:o.muted},children:"Data will appear here once collected."})]})}):e.jsx(se,{children:a.map(s=>$(s,0))})};K`
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
`;const X=r=>{if(!r)return o.muted;switch(r){case"HEALTHY":case"EXCELLENT":return o.accent;case"WARNING":return o.muted;case"CRITICAL":return o.foreground;default:return o.muted}},qe=()=>{const{page:r,limit:y,setPage:p,setLimit:M}=je(1,20,1e3),{filters:a,setFilter:N,clearFilters:W}=Ce({server_name:"",schema_name:"",health_status:"",access_frequency:"",search:""}),[C,D]=i.useState(""),[$,I]=i.useState("desc"),[s,d]=i.useState(!0),[c,x]=i.useState(null),[A,R]=i.useState([]),[b,H]=i.useState({}),[w,U]=i.useState({total:0,totalPages:0,currentPage:1,limit:20}),[re,ae]=i.useState([]),[ie,J]=i.useState([]),[Q,le]=i.useState([]),[Z,ee]=i.useState(!0),[ce,q]=i.useState(!1),[k,de]=i.useState("list"),[v,me]=i.useState(null),[B,O]=i.useState("overview"),g=i.useRef(!0);i.useCallback(async()=>{if(!g.current)return;const t=Date.now(),l=300;try{d(!0),x(null);const m=ne(a.search,100),[f,S,F]=await Promise.all([_.getOracleItems({page:r,limit:y,server_name:a.server_name,schema_name:a.schema_name,health_status:a.health_status,access_frequency:a.access_frequency,search:m}),_.getOracleMetrics(),_.getOracleServers()]),V=Date.now()-t,pe=Math.max(0,l-V);await new Promise(xe=>setTimeout(xe,pe)),g.current&&(R(f.data||[]),U(f.pagination||{total:0,totalPages:0,currentPage:1,limit:20}),H(S||{}),ae(F||[]))}catch(m){g.current&&x(te(m))}finally{g.current&&d(!1)}},[r,y,a.server_name,a.schema_name,a.health_status,a.access_frequency,a.search]);const Y=i.useCallback(async()=>{if(!g.current)return;const t=Date.now(),l=300;try{ee(!0),x(null);const m=ne(a.search,100),f=await _.getOracleItems({page:r,limit:y,server_name:a.server_name,schema_name:a.schema_name,health_status:a.health_status,access_frequency:a.access_frequency,search:m}),S=Date.now()-t,F=Math.max(0,l-S);await new Promise(V=>setTimeout(V,F)),g.current&&(le(f.data||[]),U(f.pagination||{total:0,totalPages:0,currentPage:1,limit:20}))}catch(m){g.current&&x(te(m))}finally{g.current&&ee(!1)}},[r,y,a.server_name,a.schema_name,a.health_status,a.access_frequency,a.search]);i.useEffect(()=>{g.current=!0,(async()=>{await Y();try{const m=await _.getOracleMetrics();g.current&&H(m||{})}catch(m){console.error("Oracle: Error loading metrics:",m),g.current&&console.error("Oracle: Error loading metrics:",m)}})();const l=setInterval(()=>{g.current&&(Y(),_.getOracleMetrics().then(m=>{g.current&&H(m||{})}).catch(m=>{console.error("Oracle: Error loading metrics in interval:",m)}))},3e4);return()=>{g.current=!1,clearInterval(l)}},[Y]),i.useEffect(()=>{(async()=>{if(a.server_name&&g.current)try{const l=await _.getOracleSchemas(a.server_name);g.current&&J(l||[])}catch(l){g.current&&console.error("Error loading schemas:",l)}else J([])})()},[a.server_name]);const ge=i.useCallback(t=>{t&&(me(l=>l&&t.id&&l.id===t.id?null:t),O("overview"))},[]),E=i.useCallback(t=>{if(t==null)return"N/A";const l=Number(t);return isNaN(l)?"N/A":l<1?`${(l*1024).toFixed(2)} KB`:`${l.toFixed(2)} MB`},[]),G=i.useCallback(t=>{if(t==null)return"N/A";const l=Number(t);return isNaN(l)?"N/A":l.toLocaleString()},[]);i.useCallback(t=>t?new Date(t).toLocaleString():"N/A",[]);const P=i.useCallback(t=>{if(t==null)return"N/A";const l=Number(t);return isNaN(l)?"N/A":`${l.toFixed(2)}%`},[]),L=i.useCallback((t,l)=>{N(t,l),t==="server_name"&&N("schema_name",""),p(1)},[N,p]);i.useCallback(t=>{C===t?I(l=>l==="asc"?"desc":"asc"):(D(t),I("desc")),p(1)},[C,p]),i.useMemo(()=>C?[...A].sort((t,l)=>{let m=t[C],f=l[C];if(m==null&&(m=""),f==null&&(f=""),typeof m=="string"&&typeof f=="string")return $==="asc"?m.localeCompare(f):f.localeCompare(m);const S=Number(m),F=Number(f);return!isNaN(S)&&!isNaN(F)?$==="asc"?S-F:F-S:$==="asc"?String(m).localeCompare(String(f)):String(f).localeCompare(String(m))}):A,[A,C,$]);const fe=i.useCallback(t=>e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:n.spacing.md,paddingBottom:n.spacing.sm,borderBottom:`1px solid ${o.border}`},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:`0 0 ${n.spacing.sm} 0`,paddingBottom:n.spacing.xs,borderBottom:`2px solid ${o.accent}`},children:"Basic Information"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:n.spacing.sm},children:[e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Server:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.server_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Schema:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.schema_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Table:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.table_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Health Status:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.health_status?e.jsx("span",{style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:X(t.health_status)+"20",color:X(t.health_status),border:`1px solid ${X(t.health_status)}`},children:t.health_status}):"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Access Frequency:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.access_frequency||"N/A"})]})]})]}),e.jsxs("div",{style:{marginBottom:0},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:`0 0 ${n.spacing.sm} 0`,paddingBottom:n.spacing.xs,borderBottom:`2px solid ${o.accent}`},children:"Storage"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:n.spacing.sm},children:[e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Row Count:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:G(t.row_count||t.num_rows)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Table Size:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:E(t.table_size_mb)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Index Size:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:E(t.index_size_mb)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Total Size:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:E(t.total_size_mb)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Tablespace:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.tablespace_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Fragmentation:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:P(t.fragmentation_pct)})]})]})]})]}),[E,G,P]),ue=i.useCallback(t=>e.jsx("div",{children:e.jsxs("div",{style:{marginBottom:n.spacing.md,paddingBottom:n.spacing.sm,borderBottom:`1px solid ${o.border}`},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:`0 0 ${n.spacing.sm} 0`,paddingBottom:n.spacing.xs,borderBottom:`2px solid ${o.accent}`},children:"Performance Metrics"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:n.spacing.sm},children:[e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Health Score:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.health_score!==null&&t.health_score!==void 0?`${Number(t.health_score).toFixed(2)}`:"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Fragmentation:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:P(t.fragmentation_pct)})]})]})]})}),[P]),he=i.useCallback(t=>e.jsx("div",{children:e.jsxs("div",{style:{marginBottom:0},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:`0 0 ${n.spacing.sm} 0`,paddingBottom:n.spacing.xs,borderBottom:`2px solid ${o.accent}`},children:"Recommendations"}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:n.spacing.sm},children:e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Recommendation Summary:"}),e.jsx("div",{style:{whiteSpace:"pre-wrap",fontFamily:"Consolas",fontSize:12,color:o.foreground},children:t.recommendation_summary||"No recommendations available"})]})})]})}),[]);return Z&&Q.length===0?e.jsx(Fe,{variant:"table"}):e.jsxs(ye,{children:[e.jsx("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:n.spacing.lg,paddingBottom:n.spacing.md,borderBottom:`2px solid ${o.accent}`},children:e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:o.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:o.accent,marginRight:n.spacing.sm},children:u.blockFull}),"GOVERNANCE CATALOG - ORACLE"]})}),c&&e.jsx("div",{style:{marginBottom:n.spacing.md},children:e.jsx(h,{title:"ERROR",children:e.jsx("div",{style:{padding:n.spacing.sm,color:o.foreground,fontSize:12,fontFamily:"Consolas",backgroundColor:o.backgroundSoft,borderRadius:2},children:c})})}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:n.spacing.md,marginBottom:n.spacing.lg},children:[e.jsx(h,{title:"Total Tables",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:o.foreground},children:b.total_tables||0})}),e.jsx(h,{title:"Total Size",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:o.foreground},children:E(b.total_size_mb)})}),e.jsx(h,{title:"Total Rows",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:o.foreground},children:G(b.total_rows)})}),e.jsx(h,{title:"Healthy",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:o.foreground},children:b.healthy_count||0})}),e.jsx(h,{title:"Warning",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:o.foreground},children:b.warning_count||0})}),e.jsx(h,{title:"Critical",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:o.foreground},children:b.critical_count||0})}),e.jsx(h,{title:"Unique Servers",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:o.foreground},children:b.unique_servers||0})})]}),e.jsx(h,{title:"FILTERS",children:e.jsxs("div",{style:{display:"flex",gap:n.spacing.sm,flexWrap:"wrap",alignItems:"center"},children:[e.jsxs("select",{value:a.server_name,onChange:t=>L("server_name",t.target.value),style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Servers"}),re.map(t=>e.jsx("option",{value:t,children:t},t))]}),e.jsxs("select",{value:a.schema_name,onChange:t=>L("schema_name",t.target.value),disabled:!a.server_name,style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,opacity:a.server_name?1:.5,cursor:a.server_name?"pointer":"not-allowed",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{a.server_name&&(t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px")},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Schemas"}),ie.map(t=>e.jsx("option",{value:t,children:t},t))]}),e.jsxs("select",{value:a.health_status,onChange:t=>L("health_status",t.target.value),style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Health Status"}),e.jsx("option",{value:"EXCELLENT",children:"Excellent"}),e.jsx("option",{value:"HEALTHY",children:"Healthy"}),e.jsx("option",{value:"WARNING",children:"Warning"}),e.jsx("option",{value:"CRITICAL",children:"Critical"})]}),e.jsxs("select",{value:a.access_frequency,onChange:t=>L("access_frequency",t.target.value),style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Access Frequency"}),e.jsx("option",{value:"REAL_TIME",children:"Real Time"}),e.jsx("option",{value:"HIGH",children:"High"}),e.jsx("option",{value:"MEDIUM",children:"Medium"}),e.jsx("option",{value:"LOW",children:"Low"}),e.jsx("option",{value:"RARE",children:"Rare"})]}),e.jsx("input",{type:"text",placeholder:"Search table name...",value:a.search,onChange:t=>L("search",t.target.value),style:{flex:1,minWidth:"200px",padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"}}),e.jsx(z,{label:"Reset All",onClick:()=>{W(),p(1)},variant:"ghost"})]})}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:n.spacing.lg,marginTop:n.spacing.sm,fontFamily:"Consolas",fontSize:12,gap:n.spacing.lg},children:[e.jsxs("div",{style:{display:"flex",gap:n.spacing.sm,alignItems:"center"},children:[e.jsx("label",{style:{color:o.muted,fontSize:11,fontFamily:"Consolas"},children:"Items per page:"}),e.jsxs("select",{value:y,onChange:t=>{M(Number(t.target.value)),p(1)},style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:10,children:"10"}),e.jsx("option",{value:20,children:"20"}),e.jsx("option",{value:50,children:"50"}),e.jsx("option",{value:100,children:"100"}),e.jsx("option",{value:200,children:"200"})]})]}),e.jsxs("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[e.jsx(z,{label:k==="list"?"Show Charts":"Show List",onClick:()=>de(k==="list"?"charts":"list"),variant:k==="charts"?"primary":"ghost"}),e.jsx(z,{label:"Metrics Info",onClick:()=>q(!0),variant:"ghost"})]})]}),ce&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>q(!1),children:e.jsxs("div",{style:{width:"90%",maxWidth:900,maxHeight:"90vh",overflowY:"auto"},onClick:t=>t.stopPropagation(),children:[e.jsx("style",{children:`
              div[style*="overflowY"]::-webkit-scrollbar {
                width: 0px;
                display: none;
              }
              div[style*="overflowY"] {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}),e.jsx(h,{title:"METRICS PLAYBOOK - ORACLE GOVERNANCE",children:e.jsxs("div",{style:{padding:n.spacing.md,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[u.blockFull," Total Tables"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Total number of tables cataloged across all Oracle servers and schemas in the governance system."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[u.blockFull," Total Size"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Combined storage size of all tables across all Oracle databases. Includes data and index sizes from tablespaces."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[u.blockFull," Total Rows"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Total number of rows across all Oracle tables in the governance catalog."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[u.blockFull," Healthy"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Tables with HEALTHY status, indicating optimal performance, low fragmentation, proper indexing, and good access patterns."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.muted,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[u.blockFull," Warning"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Tables with WARNING status, indicating potential issues such as moderate fragmentation, suboptimal indexes, or performance concerns that should be monitored."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.foreground,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[u.blockFull," Critical"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Tables with CRITICAL status, indicating serious issues requiring immediate attention such as high fragmentation, missing indexes, or severe performance degradation."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[u.blockFull," Unique Servers"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Number of distinct Oracle server instances being monitored in the governance catalog."})]}),e.jsxs("div",{style:{marginTop:n.spacing.md,padding:n.spacing.sm,background:o.backgroundSoft,borderRadius:2,border:`1px solid ${o.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:o.muted,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:[u.blockSemi," Note"]}),e.jsx("div",{style:{fontSize:11,color:o.foreground,fontFamily:"Consolas"},children:"These metrics are calculated in real-time from the data_governance_catalog_oracle table and reflect the current state of your Oracle governance catalog."})]}),e.jsx("div",{style:{marginTop:n.spacing.md,textAlign:"right"},children:e.jsx(z,{label:"Close",onClick:()=>q(!1),variant:"ghost"})})]})})]})}),k==="charts"&&e.jsx(Se,{engine:"oracle",selectedItem:v?{server_name:v.server_name,schema_name:v.schema_name,table_name:v.table_name}:null}),k==="list"&&Z?e.jsx(be,{children:"Loading tree view..."}):k==="list"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{display:"grid",gridTemplateColumns:v?"1fr 500px":"1fr",gap:n.spacing.md,marginTop:n.spacing.md},children:[e.jsx(Re,{items:Q,onItemClick:ge}),v&&e.jsxs("div",{style:{position:"sticky",top:n.spacing.md,maxHeight:"calc(100vh - 200px)",overflowY:"auto"},children:[e.jsx("style",{children:`
                  div[style*="overflowY"]::-webkit-scrollbar {
                    width: 0px;
                    display: none;
                  }
                  div[style*="overflowY"] {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                  }
                `}),e.jsxs(h,{title:"DETAILS",children:[e.jsxs("div",{style:{display:"flex",gap:n.spacing.xs,marginBottom:n.spacing.md,borderBottom:`1px solid ${o.border}`,paddingBottom:n.spacing.sm,flexWrap:"wrap"},children:[e.jsx(z,{label:"Overview",onClick:()=>O("overview"),variant:B==="overview"?"primary":"ghost"}),e.jsx(z,{label:"Performance",onClick:()=>O("performance"),variant:B==="performance"?"primary":"ghost"}),e.jsx(z,{label:"Recommendations",onClick:()=>O("recommendations"),variant:B==="recommendations"?"primary":"ghost"})]}),B==="overview"&&fe(v),B==="performance"&&ue(v),B==="recommendations"&&he(v)]})]})]}),w.totalPages>1&&e.jsx("div",{style:{marginTop:n.spacing.lg},children:e.jsxs(ve,{children:[e.jsx(oe,{onClick:()=>p(Math.max(1,r-1)),disabled:r===1,children:"Previous"}),e.jsxs("span",{style:{fontFamily:"Consolas",fontSize:12,color:o.foreground},children:["Page ",w.currentPage," of ",w.totalPages," (",w.total," total)"]}),e.jsx(oe,{onClick:()=>p(Math.min(w.totalPages,r+1)),disabled:r===w.totalPages,children:"Next"})]})})]}):null]})};export{qe as default};
