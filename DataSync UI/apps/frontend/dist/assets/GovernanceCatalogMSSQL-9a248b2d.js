import{m as V,f as v,b as o,r as i,j as e,e as f,U as F,C as be,t as n,o as ve,P as je,p as oe}from"./index-b1fa964d.js";import{u as Ce}from"./usePagination-05d2e222.js";import{u as Se}from"./useTableFilters-34614e65.js";import{e as te}from"./errorHandler-5ea9ae85.js";import{s as ne}from"./validation-24839588.js";import{A as P}from"./AsciiPanel-3399d5be.js";import{A as $}from"./AsciiButton-3fcfdd9b.js";import{G as _e}from"./GovernanceCatalogCharts-22d29693.js";import{S as Fe}from"./SkeletonLoader-09c12074.js";import{L as $e}from"./LineageSummaryCards-33059ad5.js";const ke=V`
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
  animation: ${ke} 0.3s ease-out;
  margin-bottom: 2px;
`,we=v.span`
  color: ${o.muted};
  margin-right: 6px;
  font-family: Consolas;
  font-size: 12px;
  transition: color 0.2s ease;
`,Be=v.div`
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
`,Ne=v.div`
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
`,Le=v.span`
  flex: 1;
  font-family: Consolas;
  font-size: ${a=>a.$isSchema?"13px":"12px"};
  color: ${a=>a.$isSchema?o.accent:o.foreground};
  font-weight: ${a=>a.$isSchema?600:500};
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
`,Te=v.div`
  max-height: ${a=>a.$isExpanded?"10000px":"0"};
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`,Ee=v.div`
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
`,L=a=>{if(!a)return o.muted;switch(a){case"HEALTHY":case"EXCELLENT":return o.success;case"WARNING":return o.warning;case"CRITICAL":return o.danger;case"REAL_TIME":case"HIGH":return o.accent;case"MEDIUM":return o.accentSoft;case"LOW":case"RARE":return o.muted;default:return o.muted}},Re=({items:a,onItemClick:y})=>{const[h,O]=i.useState(new Set),s=i.useMemo(()=>{const r=new Map;return a.forEach(d=>{const c=d.schema_name||"default";r.has(c)||r.set(c,{name:c,objects:[]}),r.get(c).objects.push(d)}),Array.from(r.values()).sort((d,c)=>d.name.localeCompare(c.name))},[a]),A=r=>{O(d=>{const c=new Set(d);return c.has(r)?c.delete(r):c.add(r),c})},R=(r,d)=>{if(r===0)return null;const c=[];for(let p=0;p<r-1;p++)c.push("│  ");return c.push(d?"└─ ":"├─ "),e.jsx(we,{$isLast:d,children:c.join("")})},j=r=>{if(r==null)return"N/A";const d=Number(r);return isNaN(d)?"N/A":d.toLocaleString()},q=r=>{if(r==null)return"N/A";const d=Number(r);return isNaN(d)?"N/A":d<1?`${(d*1024).toFixed(2)} KB`:`${d.toFixed(2)} MB`},k=(r,d)=>{const c=h.has(r.name),T=s.findIndex(E=>E.name===r.name)===s.length-1;return e.jsxs(ze,{children:[e.jsxs(Be,{$level:d,$isExpanded:c,$nodeType:"schema",onClick:()=>A(r.name),children:[R(d,T),e.jsx(Ne,{$isExpanded:c,children:c?f.arrowDown:f.arrowRight}),e.jsx("span",{style:{marginRight:"8px",color:o.accent,fontFamily:"Consolas"},children:f.blockFull}),e.jsx(Le,{$isSchema:!0,children:r.name}),e.jsxs(Ae,{children:[r.objects.length," ",r.objects.length===1?"object":"objects"]})]}),e.jsx(Te,{$isExpanded:c,$level:d,children:c&&r.objects.map((E,b)=>I(E,r.name,d+1,b===r.objects.length-1))})]},r.name)},I=(r,d,c,p)=>e.jsxs(Ee,{$level:c,onClick:()=>y==null?void 0:y(r),children:[R(c,p),e.jsx("span",{style:{marginRight:"8px",color:o.muted,fontFamily:"Consolas"},children:f.blockFull}),e.jsx("span",{style:{marginRight:"8px",fontWeight:500,color:o.foreground,fontFamily:"Consolas"},children:r.object_name||"N/A"}),r.object_type&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:o.backgroundSoft,color:o.foreground,border:`1px solid ${o.border}`,marginRight:4},children:r.object_type}),r.health_status&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:L(r.health_status)+"20",color:L(r.health_status),border:`1px solid ${L(r.health_status)}`,marginRight:4},children:r.health_status}),r.access_frequency&&e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:L(r.access_frequency)+"20",color:L(r.access_frequency),border:`1px solid ${L(r.access_frequency)}`,marginRight:4},children:r.access_frequency}),e.jsxs("span",{style:{marginLeft:"auto",color:o.muted,fontSize:11,fontFamily:"Consolas"},children:[j(r.row_count)," rows ",f.bullet," ",q(r.table_size_mb)]})]},r.id);return s.length===0?e.jsx(re,{children:e.jsxs("div",{style:{padding:"60px 40px",textAlign:"center",color:o.muted,fontFamily:"Consolas"},children:[e.jsx("div",{style:{fontSize:48,marginBottom:16,fontFamily:"Consolas",opacity:.5},children:f.blockFull}),e.jsx("div",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,marginBottom:8,color:o.foreground},children:"No governance data available"}),e.jsx("div",{style:{fontSize:12,fontFamily:"Consolas",opacity:.7,color:o.muted},children:"Data will appear here once collected."})]})}):e.jsx(re,{children:s.map(r=>k(r,0))})};V`
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
`;const U=a=>{if(!a)return o.muted;switch(a){case"HEALTHY":case"EXCELLENT":return o.accent;case"WARNING":return o.muted;case"CRITICAL":return o.foreground;default:return o.muted}},Ge=()=>{const{page:a,limit:y,setPage:h,setLimit:O}=Ce(1,20,1e3),{filters:s,setFilter:A,clearFilters:R}=Se({server_name:"",database_name:"",object_type:"",health_status:"",access_frequency:"",search:""}),[j,q]=i.useState(""),[k,I]=i.useState("desc"),[r,d]=i.useState(!0),[c,p]=i.useState(null),[T,E]=i.useState([]),[b,H]=i.useState({}),[z,X]=i.useState({total:0,totalPages:0,currentPage:1,limit:20}),[se,ae]=i.useState([]),[ie,K]=i.useState([]),[J,le]=i.useState([]),[Z,ee]=i.useState(!0),[ce,Q]=i.useState(!1),[w,de]=i.useState("list"),[x,ue]=i.useState(null),[B,M]=i.useState("overview"),m=i.useRef(!0);i.useCallback(async()=>{if(!m.current)return;const t=Date.now(),l=300;try{d(!0),p(null);const u=ne(s.search,100),[g,S,_]=await Promise.all([F.getMSSQLItems({page:a,limit:y,server_name:s.server_name,database_name:s.database_name,object_type:s.object_type,health_status:s.health_status,access_frequency:s.access_frequency,search:u}),F.getMSSQLMetrics(),F.getMSSQLServers()]),G=Date.now()-t,xe=Math.max(0,l-G);await new Promise(ye=>setTimeout(ye,xe)),m.current&&(E(g.data||[]),X(g.pagination||{total:0,totalPages:0,currentPage:1,limit:20}),H(S||{}),ae(_||[]))}catch(u){m.current&&p(te(u))}finally{m.current&&d(!1)}},[a,y,s.server_name,s.database_name,s.object_type,s.health_status,s.access_frequency,s.search]);const Y=i.useCallback(async()=>{if(!m.current)return;const t=Date.now(),l=300;try{ee(!0),p(null);const u=ne(s.search,100),g=await F.getMSSQLItems({page:a,limit:y,server_name:s.server_name,database_name:s.database_name,object_type:s.object_type,health_status:s.health_status,access_frequency:s.access_frequency,search:u}),S=Date.now()-t,_=Math.max(0,l-S);await new Promise(G=>setTimeout(G,_)),m.current&&(le(g.data||[]),X(g.pagination||{total:0,totalPages:0,currentPage:1,limit:20}))}catch(u){m.current&&p(te(u))}finally{m.current&&ee(!1)}},[a,y,s.server_name,s.database_name,s.object_type,s.health_status,s.access_frequency,s.search]);i.useEffect(()=>{m.current=!0,(async()=>{await Y();try{const u=await F.getMSSQLMetrics();m.current&&H(u||{})}catch(u){console.error("MSSQL: Error loading metrics:",u),m.current&&console.error("MSSQL: Error loading metrics:",u)}})();const l=setInterval(()=>{m.current&&(Y(),F.getMSSQLMetrics().then(u=>{m.current&&H(u||{})}).catch(u=>{console.error("MSSQL: Error loading metrics in interval:",u)}))},3e4);return()=>{m.current=!1,clearInterval(l)}},[Y]),i.useEffect(()=>{(async()=>{if(s.server_name&&m.current)try{const l=await F.getMSSQLDatabases(s.server_name);m.current&&K(l||[])}catch(l){m.current&&console.error("Error loading databases:",l)}else K([])})()},[s.server_name]);const me=i.useCallback(t=>{t&&(ue(l=>l&&t.id&&l.id===t.id?null:t),M("overview"))},[]),W=i.useCallback(t=>{if(t==null)return"N/A";const l=Number(t);return isNaN(l)?"N/A":l<1?`${(l*1024).toFixed(2)} KB`:`${l.toFixed(2)} MB`},[]),C=i.useCallback(t=>{if(t==null)return"N/A";const l=Number(t);return isNaN(l)?"N/A":l.toLocaleString()},[]),D=i.useCallback(t=>{if(t==null)return"N/A";const l=Number(t);return isNaN(l)?"N/A":`${l.toFixed(2)}%`},[]);i.useCallback(t=>t?new Date(t).toLocaleString():"N/A",[]),i.useCallback(t=>{if(t==null)return"N/A";const l=Number(t);return isNaN(l)?"N/A":l<1?`${(l*1e3).toFixed(2)} ms`:`${l.toFixed(2)} s`},[]);const N=i.useCallback((t,l)=>{A(t,l),t==="server_name"&&A("database_name",""),h(1)},[A,h]);i.useCallback(t=>{j===t?I(l=>l==="asc"?"desc":"asc"):(q(t),I("desc")),h(1)},[j,h]);const ge=i.useMemo(()=>[{title:"Overview",rows:[{label:"Total Objects",value:b.total_objects??0},{label:"Total Size",value:W(b.total_size_mb)},{label:"Unique Servers",value:b.unique_servers??0}]},{title:"Health",rows:[{label:"Healthy",value:b.healthy_count??0},{label:"Warning",value:b.warning_count??0},{label:"Critical",value:b.critical_count??0}]}],[b,W]);i.useMemo(()=>j?[...T].sort((t,l)=>{let u=t[j],g=l[j];if(u==null&&(u=""),g==null&&(g=""),typeof u=="string"&&typeof g=="string")return k==="asc"?u.localeCompare(g):g.localeCompare(u);const S=Number(u),_=Number(g);return!isNaN(S)&&!isNaN(_)?k==="asc"?S-_:_-S:k==="asc"?String(u).localeCompare(String(g)):String(g).localeCompare(String(u))}):T,[T,j,k]);const fe=i.useCallback(t=>e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${o.border}`},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:"0 0 12px 0",paddingBottom:4,borderBottom:`2px solid ${o.accent}`},children:"Basic Information"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:[e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Server:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.server_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Database:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.database_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Schema:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.schema_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Object:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.object_name||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Type:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.object_type||"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Health Status:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.health_status?e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:U(t.health_status)+"20",color:U(t.health_status),border:`1px solid ${U(t.health_status)}`},children:t.health_status}):"N/A"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Access Frequency:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:t.access_frequency||"N/A"})]})]})]}),e.jsxs("div",{style:{marginBottom:0},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:"0 0 12px 0",paddingBottom:4,borderBottom:`2px solid ${o.accent}`},children:"Storage"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:[e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Row Count:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:C(t.row_count)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Table Size:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:W(t.table_size_mb)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Fragmentation:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:D(t.fragmentation_pct)})]})]})]})]}),[W,C,D]),he=i.useCallback(t=>e.jsx("div",{children:e.jsxs("div",{style:{marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${o.border}`},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:"0 0 12px 0",paddingBottom:4,borderBottom:`2px solid ${o.accent}`},children:"Performance Metrics"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:[e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"User Seeks:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:C(t.user_seeks)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"User Scans:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:C(t.user_scans)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"User Lookups:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:C(t.user_lookups)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"User Updates:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:C(t.user_updates)})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Fragmentation:"}),e.jsx("div",{style:{color:o.foreground,fontSize:12,fontFamily:"Consolas"},children:D(t.fragmentation_pct)})]})]})]})}),[C,D]),pe=i.useCallback(t=>e.jsx("div",{children:e.jsxs("div",{style:{marginBottom:0},children:[e.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:o.foreground,margin:"0 0 12px 0",paddingBottom:4,borderBottom:`2px solid ${o.accent}`},children:"Recommendations"}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:e.jsxs("div",{children:[e.jsx("div",{style:{color:o.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Recommendation Summary:"}),e.jsx("div",{style:{whiteSpace:"pre-wrap",fontFamily:"Consolas",fontSize:12,color:o.foreground},children:t.recommendation_summary||"No recommendations available"})]})})]})}),[]);return Z&&J.length===0?e.jsx(Fe,{variant:"table"}):e.jsxs(be,{children:[e.jsx("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:n.spacing.lg,paddingBottom:n.spacing.md,borderBottom:`2px solid ${o.accent}`},children:e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:o.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:o.accent,marginRight:n.spacing.sm},children:f.blockFull}),"GOVERNANCE CATALOG - MSSQL"]})}),c&&e.jsx("div",{style:{marginBottom:n.spacing.md},children:e.jsx(P,{title:"ERROR",children:e.jsx("div",{style:{padding:n.spacing.sm,color:o.foreground,fontSize:12,fontFamily:"Consolas",backgroundColor:o.backgroundSoft,borderRadius:2},children:c})})}),e.jsx($e,{cards:ge}),e.jsx(P,{title:"FILTERS",children:e.jsxs("div",{style:{display:"flex",gap:n.spacing.sm,flexWrap:"wrap",alignItems:"center"},children:[e.jsxs("select",{value:s.server_name,onChange:t=>N("server_name",t.target.value),style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Servers"}),se.map(t=>e.jsx("option",{value:t,children:t},t))]}),e.jsxs("select",{value:s.database_name,onChange:t=>N("database_name",t.target.value),disabled:!s.server_name,style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,opacity:s.server_name?1:.5,cursor:s.server_name?"pointer":"not-allowed",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{s.server_name&&(t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px")},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Databases"}),ie.map(t=>e.jsx("option",{value:t,children:t},t))]}),e.jsxs("select",{value:s.object_type,onChange:t=>N("object_type",t.target.value),style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Types"}),e.jsx("option",{value:"TABLE",children:"TABLE"}),e.jsx("option",{value:"VIEW",children:"VIEW"}),e.jsx("option",{value:"STORED_PROCEDURE",children:"STORED_PROCEDURE"})]}),e.jsxs("select",{value:s.health_status,onChange:t=>N("health_status",t.target.value),style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Health Status"}),e.jsx("option",{value:"EXCELLENT",children:"Excellent"}),e.jsx("option",{value:"HEALTHY",children:"Healthy"}),e.jsx("option",{value:"WARNING",children:"Warning"}),e.jsx("option",{value:"CRITICAL",children:"Critical"})]}),e.jsxs("select",{value:s.access_frequency,onChange:t=>N("access_frequency",t.target.value),style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Access Frequency"}),e.jsx("option",{value:"REAL_TIME",children:"Real Time"}),e.jsx("option",{value:"HIGH",children:"High"}),e.jsx("option",{value:"MEDIUM",children:"Medium"}),e.jsx("option",{value:"LOW",children:"Low"}),e.jsx("option",{value:"RARE",children:"Rare"})]}),e.jsx("input",{type:"text",placeholder:"Search object name...",value:s.search,onChange:t=>N("search",t.target.value),style:{flex:1,minWidth:"200px",padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"}}),e.jsx($,{label:"Reset All",onClick:()=>{R(),h(1)},variant:"ghost"})]})}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:n.spacing.lg,marginTop:n.spacing.sm,fontFamily:"Consolas",fontSize:12,gap:n.spacing.lg},children:[e.jsxs("div",{style:{display:"flex",gap:n.spacing.sm,alignItems:"center"},children:[e.jsx("label",{style:{color:o.muted,fontSize:11,fontFamily:"Consolas"},children:"Items per page:"}),e.jsxs("select",{value:y,onChange:t=>{O(Number(t.target.value)),h(1)},style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:o.background,color:o.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:t=>{t.target.style.borderColor=o.accent,t.target.style.outline=`2px solid ${o.accent}`,t.target.style.outlineOffset="2px"},onBlur:t=>{t.target.style.borderColor=o.border,t.target.style.outline="none"},children:[e.jsx("option",{value:10,children:"10"}),e.jsx("option",{value:20,children:"20"}),e.jsx("option",{value:50,children:"50"}),e.jsx("option",{value:100,children:"100"}),e.jsx("option",{value:200,children:"200"})]})]}),e.jsxs("div",{style:{display:"flex",gap:n.spacing.sm,alignItems:"center"},children:[e.jsx($,{label:w==="list"?"Show Charts":"Show List",onClick:()=>de(w==="list"?"charts":"list"),variant:w==="charts"?"primary":"ghost"}),e.jsx($,{label:"Metrics Info",onClick:()=>Q(!0),variant:"ghost"})]})]}),ce&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>Q(!1),children:e.jsxs("div",{style:{width:"90%",maxWidth:900,maxHeight:"90vh",overflowY:"auto"},onClick:t=>t.stopPropagation(),children:[e.jsx("style",{children:`
              div[style*="overflowY"]::-webkit-scrollbar {
                width: 0px;
                display: none;
              }
              div[style*="overflowY"] {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}),e.jsx(P,{title:"METRICS PLAYBOOK - MSSQL GOVERNANCE",children:e.jsxs("div",{style:{padding:n.spacing.md,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[f.blockFull," Total Objects"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Total number of objects (tables, views, stored procedures, indexes) cataloged across all MSSQL servers and databases."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[f.blockFull," Total Size"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Combined storage size of all objects across all MSSQL databases. Includes data files, log files, and index sizes."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[f.blockFull," Healthy"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Objects with HEALTHY status, indicating optimal performance, low fragmentation, proper indexing, and good execution statistics."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.muted,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[f.blockFull," Warning"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Objects with WARNING status, indicating potential issues such as moderate fragmentation, missing indexes, suboptimal query plans, or performance concerns that should be monitored."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.foreground,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[f.blockFull," Critical"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Objects with CRITICAL status, indicating serious issues requiring immediate attention such as high fragmentation, missing critical indexes, slow queries, or severe performance degradation."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.md},children:[e.jsxs("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[f.blockFull," Unique Servers"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Number of distinct MSSQL server instances being monitored in the governance catalog."})]}),e.jsxs("div",{style:{marginTop:n.spacing.md,padding:n.spacing.sm,background:o.backgroundSoft,borderRadius:2,border:`1px solid ${o.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:o.muted,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:[f.blockSemi," Note"]}),e.jsx("div",{style:{fontSize:11,color:o.foreground,fontFamily:"Consolas"},children:"These metrics are calculated in real-time from the data_governance_catalog_mssql table and reflect the current state of your MSSQL governance catalog."})]}),e.jsx("div",{style:{marginTop:n.spacing.md,textAlign:"right"},children:e.jsx($,{label:"Close",onClick:()=>Q(!1),variant:"ghost"})})]})})]})}),w==="charts"&&e.jsx(_e,{engine:"mssql",selectedItem:x?{server_name:x.server_name,database_name:x.database_name,schema_name:x.schema_name,table_name:x.table_name}:null}),w==="list"&&Z?e.jsx(ve,{children:"Loading tree view..."}):w==="list"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{display:"grid",gridTemplateColumns:x?"1fr 500px":"1fr",gap:n.spacing.md,marginTop:n.spacing.md},children:[e.jsx(Re,{items:J,onItemClick:me}),x&&e.jsxs("div",{style:{position:"sticky",top:n.spacing.md,maxHeight:"calc(100vh - 200px)",overflowY:"auto"},children:[e.jsx("style",{children:`
                  div[style*="overflowY"]::-webkit-scrollbar {
                    width: 0px;
                    display: none;
                  }
                  div[style*="overflowY"] {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                  }
                `}),e.jsxs(P,{title:"DETAILS",children:[e.jsxs("div",{style:{display:"flex",gap:n.spacing.xs,marginBottom:n.spacing.md,borderBottom:`1px solid ${o.border}`,paddingBottom:n.spacing.sm,flexWrap:"wrap"},children:[e.jsx($,{label:"Overview",onClick:()=>M("overview"),variant:B==="overview"?"primary":"ghost"}),e.jsx($,{label:"Performance",onClick:()=>M("performance"),variant:B==="performance"?"primary":"ghost"}),e.jsx($,{label:"Recommendations",onClick:()=>M("recommendations"),variant:B==="recommendations"?"primary":"ghost"})]}),B==="overview"&&fe(x),B==="performance"&&he(x),B==="recommendations"&&pe(x)]})]})]}),z.totalPages>1&&e.jsx("div",{style:{marginTop:n.spacing.lg},children:e.jsxs(je,{children:[e.jsx(oe,{onClick:()=>h(Math.max(1,a-1)),disabled:a===1,children:"Previous"}),e.jsxs("span",{style:{fontFamily:"Consolas",fontSize:12,color:o.foreground},children:["Page ",z.currentPage," of ",z.totalPages," (",z.total," total)"]}),e.jsx(oe,{onClick:()=>h(Math.min(z.totalPages,a+1)),disabled:a===z.totalPages,children:"Next"})]})})]}):null]})};export{Ge as default};
