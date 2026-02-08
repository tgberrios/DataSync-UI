import{m as M,f as p,b as e,r as l,j as o,e as m,W as T,C as co,t as s,o as go,P as mo,p as V}from"./index-b1fa964d.js";import{u as fo}from"./usePagination-05d2e222.js";import{u as uo}from"./useTableFilters-34614e65.js";import{e as ho}from"./errorHandler-5ea9ae85.js";import{s as xo}from"./validation-24839588.js";import{A as W}from"./AsciiPanel-3399d5be.js";import{A as j}from"./AsciiButton-3fcfdd9b.js";import{G as po}from"./GovernanceCatalogCharts-22d29693.js";import{S as yo}from"./SkeletonLoader-09c12074.js";import{L as vo}from"./LineageSummaryCards-33059ad5.js";const bo=M`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,X=p.div`
  font-family: Consolas;
  font-size: 12px;
  background: ${e.background};
  border: 1px solid ${e.border};
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
    background: ${e.backgroundSoft};
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${e.border};
    border-radius: 2px;
    transition: background 0.2s ease;
    
    &:hover {
      background: ${e.accent};
    }
  }
`,jo=p.div`
  user-select: none;
  animation: ${bo} 0.3s ease-out;
  margin-bottom: 2px;
`,Co=p.span`
  color: ${e.muted};
  margin-right: 6px;
  font-family: Consolas;
  font-size: 12px;
  transition: color 0.2s ease;
`,So=p.div`
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
        border-left: 3px solid ${e.accent};
        font-weight: 600;
        
        &:hover {
          background: ${e.backgroundSoft};
          border-color: ${e.accent};
          transform: translateX(4px);
        }
      `:`
      &:hover {
        background: ${e.backgroundSoft};
        transform: translateX(4px);
      }
    `}
`,Fo=p.div`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  border-radius: 2px;
  background: ${r=>r.$isExpanded?e.accent:e.backgroundSoft};
  color: ${r=>r.$isExpanded?"#ffffff":e.accent};
  font-size: 10px;
  font-weight: bold;
  font-family: Consolas;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.1);
  }
`,zo=p.span`
  flex: 1;
  font-family: Consolas;
  font-size: ${r=>r.$isSchema?"13px":"12px"};
  color: ${r=>r.$isSchema?e.accent:e.foreground};
  font-weight: ${r=>r.$isSchema?600:500};
  margin-right: 8px;
`,_o=p.span`
  padding: 2px 8px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 500;
  font-family: Consolas;
  background: ${e.backgroundSoft};
  color: ${e.foreground};
  border: 1px solid ${e.border};
  margin-left: auto;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${e.accentLight};
    border-color: ${e.accent};
    color: ${e.accent};
    transform: translateY(-1px);
  }
`,Bo=p.div`
  max-height: ${r=>r.$isExpanded?"10000px":"0"};
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`,$o=p.div`
  padding: 8px;
  padding-left: ${r=>(r.$level||0)*24+36}px;
  margin: 2px 0;
  border-radius: 2px;
  background: transparent;
  border: 1px solid ${e.border};
  transition: all 0.2s ease;
  cursor: pointer;
  font-family: Consolas;
  font-size: 12px;
  
  &:hover {
    background: ${e.backgroundSoft};
    border-color: ${e.accent};
    transform: translateX(4px);
  }
`,_=r=>{if(!r)return e.muted;switch(r){case"HEALTHY":case"EXCELLENT":return e.success;case"WARNING":return e.warning;case"CRITICAL":return e.danger;case"REAL_TIME":case"HIGH":return e.accent;case"MEDIUM":return e.accentSoft;case"LOW":case"RARE":return e.muted;default:return e.muted}},Ao=({items:r,onItemClick:C})=>{const[y,I]=l.useState(new Set),d=l.useMemo(()=>{const t=new Map;return r.forEach(a=>{const i=a.schema_name||"default";t.has(i)||t.set(i,{name:i,objects:[]}),t.get(i).objects.push(a)}),Array.from(t.values()).sort((a,i)=>a.name.localeCompare(i.name))},[r]),B=t=>{I(a=>{const i=new Set(a);return i.has(t)?i.delete(t):i.add(t),i})},A=(t,a)=>{if(t===0)return null;const i=[];for(let v=0;v<t-1;v++)i.push("│  ");return i.push(a?"└─ ":"├─ "),o.jsx(Co,{$isLast:a,children:i.join("")})},N=t=>{if(t==null)return"N/A";const a=Number(t);return isNaN(a)?"N/A":a.toLocaleString()},k=t=>{if(t==null)return"N/A";const a=Number(t);return isNaN(a)?"N/A":a<1?`${(a*1024).toFixed(2)} KB`:`${a.toFixed(2)} MB`},u=(t,a)=>{const i=y.has(t.name),E=d.findIndex(w=>w.name===t.name)===d.length-1;return o.jsxs(jo,{children:[o.jsxs(So,{$level:a,$isExpanded:i,$nodeType:"schema",onClick:()=>B(t.name),children:[A(a,E),o.jsx(Fo,{$isExpanded:i,children:i?m.arrowDown:m.arrowRight}),o.jsx("span",{style:{marginRight:"8px",color:e.accent,fontFamily:"Consolas"},children:m.blockFull}),o.jsx(zo,{$isSchema:!0,children:t.name}),o.jsxs(_o,{children:[t.objects.length," ",t.objects.length===1?"object":"objects"]})]}),o.jsx(Bo,{$isExpanded:i,$level:a,children:i&&t.objects.map((w,L)=>R(w,t.name,a+1,L===t.objects.length-1))})]},t.name)},R=(t,a,i,v)=>o.jsxs($o,{$level:i,onClick:()=>C==null?void 0:C(t),children:[A(i,v),o.jsx("span",{style:{marginRight:"8px",color:e.muted,fontFamily:"Consolas"},children:m.blockFull}),o.jsx("span",{style:{marginRight:"8px",fontWeight:500,color:e.foreground,fontFamily:"Consolas"},children:t.object_name||"N/A"}),t.object_type&&o.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:e.backgroundSoft,color:e.foreground,border:`1px solid ${e.border}`,marginRight:4},children:t.object_type}),t.health_status&&o.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:_(t.health_status)+"20",color:_(t.health_status),border:`1px solid ${_(t.health_status)}`,marginRight:4},children:t.health_status}),t.access_frequency&&o.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:_(t.access_frequency)+"20",color:_(t.access_frequency),border:`1px solid ${_(t.access_frequency)}`,marginRight:4},children:t.access_frequency}),o.jsxs("span",{style:{marginLeft:"auto",color:e.muted,fontSize:11,fontFamily:"Consolas"},children:[N(t.row_count)," rows ",m.bullet," ",k(t.table_size_mb)]})]},t.id);return d.length===0?o.jsx(X,{children:o.jsxs("div",{style:{padding:"60px 40px",textAlign:"center",color:e.muted,fontFamily:"Consolas"},children:[o.jsx("div",{style:{fontSize:48,marginBottom:16,fontFamily:"Consolas",opacity:.5},children:m.blockFull}),o.jsx("div",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,marginBottom:8,color:e.foreground},children:"No governance data available"}),o.jsx("div",{style:{fontSize:12,fontFamily:"Consolas",opacity:.7,color:e.muted},children:"Data will appear here once collected."})]})}):o.jsx(X,{children:d.map(t=>u(t,0))})};M`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;M`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;const g=r=>{if(!r)return e.muted;switch(r){case"HEALTHY":case"EXCELLENT":return e.accent;case"WARNING":return e.muted;case"CRITICAL":return e.foreground;default:return e.muted}},Do=()=>{const{page:r,limit:C,setPage:y,setLimit:I}=fo(1,20,1e3),{filters:d,setFilter:B,clearFilters:A}=uo({server_name:"",database_name:"",health_status:"",access_frequency:"",search:""}),[N,k]=l.useState(null),[u,R]=l.useState(null),[t,a]=l.useState("overview"),[i,v]=l.useState({}),[E,w]=l.useState([]),[L,Y]=l.useState([]),[G,U]=l.useState([]),[F,J]=l.useState({total:0,totalPages:0,currentPage:1,limit:20}),[O,P]=l.useState(!0),[Q,H]=l.useState(!1),[z,Z]=l.useState("list"),f=l.useRef(!0),D=l.useCallback(async()=>{if(!f.current)return;const n=Date.now(),c=300;try{P(!0),k(null);const h=xo(d.search,100),K=await T.getMongoDBItems({page:r,limit:C,server_name:d.server_name,database_name:d.database_name,health_status:d.health_status,access_frequency:d.access_frequency,search:h}),io=Date.now()-n,ao=Math.max(0,c-io);await new Promise(lo=>setTimeout(lo,ao)),f.current&&(U(K.data||[]),J(K.pagination||{total:0,totalPages:0,currentPage:1,limit:20}))}catch(h){f.current&&k(ho(h))}finally{f.current&&P(!1)}},[r,C,d.server_name,d.database_name,d.health_status,d.access_frequency,d.search]);l.useEffect(()=>{f.current=!0,(async()=>{await D();try{const h=await T.getMongoDBMetrics();f.current&&v(h||{})}catch(h){console.error("MongoDB: Error loading metrics:",h),f.current&&console.error("MongoDB: Error loading metrics:",h)}})();const c=setInterval(()=>{f.current&&(D(),T.getMongoDBMetrics().then(h=>{f.current&&v(h||{})}).catch(h=>{console.error("MongoDB: Error loading metrics in interval:",h)}))},3e4);return()=>{f.current=!1,clearInterval(c)}},[D]),l.useEffect(()=>{(async()=>{if(d.server_name&&f.current)try{const c=await T.getMongoDBDatabases(d.server_name);f.current&&Y(c||[])}catch(c){f.current&&console.error("Error loading databases:",c)}else Y([])})()},[d.server_name]);const oo=l.useCallback(n=>{R(c=>(c==null?void 0:c.id)===n.id?null:n),a("overview")},[]),S=l.useCallback(n=>n==null?"N/A":n?"Yes":"No",[]),x=l.useCallback(n=>{if(n==null)return"N/A";const c=Number(n);return isNaN(c)?"N/A":c<1?`${(c*1024).toFixed(2)} KB`:`${c.toFixed(2)} MB`},[]),b=l.useCallback(n=>{if(n==null)return"N/A";const c=Number(n);return isNaN(c)?"N/A":c.toLocaleString()},[]),q=l.useCallback(n=>n?new Date(n).toLocaleString():"N/A",[]),$=l.useCallback((n,c)=>{B(n,c),n==="server_name"&&B("database_name",""),y(1)},[B,y]),eo=l.useMemo(()=>[{title:"Overview",rows:[{label:"Total Collections",value:i.total_collections??0},{label:"Total Size",value:x(i.total_size_mb)},{label:"Total Documents",value:b(i.total_documents)},{label:"Unique Servers",value:i.unique_servers??0}]},{title:"Health",rows:[{label:"Healthy",value:i.healthy_count??0},{label:"Warning",value:i.warning_count??0},{label:"Critical",value:i.critical_count??0}]}],[i,x,b]),no=l.useCallback(n=>o.jsxs("div",{children:[o.jsxs("div",{style:{marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${e.border}`},children:[o.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:e.foreground,margin:"0 0 12px 0",paddingBottom:4,borderBottom:`2px solid ${e.accent}`},children:"Basic Information"}),o.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:[o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Server:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:n.server_name||"N/A"})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Database:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:n.database_name||"N/A"})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Collection:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:n.collection_name||"N/A"})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Health Status:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:n.health_status?o.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:g(n.health_status)+"20",color:g(n.health_status),border:`1px solid ${g(n.health_status)}`},children:n.health_status}):"N/A"})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Access Frequency:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:n.access_frequency||"N/A"})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Health Score:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:n.health_score!==null&&n.health_score!==void 0?`${Number(n.health_score).toFixed(2)}`:"N/A"})]})]})]}),o.jsxs("div",{style:{marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${e.border}`},children:[o.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:e.foreground,margin:"0 0 12px 0",paddingBottom:4,borderBottom:`2px solid ${e.accent}`},children:"Storage"}),o.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:[o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Document Count:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:b(n.document_count)})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Collection Size:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:x(n.collection_size_mb)})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Index Size:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:x(n.index_size_mb)})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Total Size:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:x(n.total_size_mb)})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Storage Size:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:x(n.storage_size_mb)})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Avg Object Size:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:n.avg_object_size_bytes?`${(Number(n.avg_object_size_bytes)/1024).toFixed(2)} KB`:"N/A"})]})]})]}),o.jsxs("div",{style:{marginBottom:0},children:[o.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:e.foreground,margin:"0 0 12px 0",paddingBottom:4,borderBottom:`2px solid ${e.accent}`},children:"MongoDB Configuration"}),o.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:[o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"MongoDB Version:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:n.mongodb_version||"N/A"})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Storage Engine:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:n.storage_engine||"N/A"})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Replica Set:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:n.replica_set_name||"N/A"})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Is Sharded:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:o.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:g(n.is_sharded?"WARNING":"HEALTHY")+"20",color:g(n.is_sharded?"WARNING":"HEALTHY"),border:`1px solid ${g(n.is_sharded?"WARNING":"HEALTHY")}`},children:S(n.is_sharded)})})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Shard Key:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:n.shard_key||"N/A"})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Index Count:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:b(n.index_count)})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Snapshot Date:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:q(n.snapshot_date)})]})]})]})]}),[x,b,S,q]),to=l.useCallback(n=>o.jsx("div",{children:o.jsxs("div",{style:{marginBottom:0},children:[o.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:e.foreground,margin:"0 0 12px 0",paddingBottom:4,borderBottom:`2px solid ${e.accent}`},children:"Index Information"}),o.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:[o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Index Name:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:n.index_name||"N/A"})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Index Keys:"}),o.jsx("div",{style:{whiteSpace:"pre-wrap",fontFamily:"Consolas",fontSize:12,color:e.foreground},children:n.index_keys||"N/A"})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Index Type:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:n.index_type||"N/A"})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Unique Index:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:o.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:g(n.index_unique?"HEALTHY":"WARNING")+"20",color:g(n.index_unique?"HEALTHY":"WARNING"),border:`1px solid ${g(n.index_unique?"HEALTHY":"WARNING")}`},children:S(n.index_unique)})})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Sparse Index:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:o.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:g(n.index_sparse?"WARNING":"HEALTHY")+"20",color:g(n.index_sparse?"WARNING":"HEALTHY"),border:`1px solid ${g(n.index_sparse?"WARNING":"HEALTHY")}`},children:S(n.index_sparse)})})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Index Size:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:x(n.index_size_mb)})]})]})]})}),[S,x]),so=l.useCallback(n=>o.jsxs("div",{children:[o.jsxs("div",{style:{marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${e.border}`},children:[o.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:e.foreground,margin:"0 0 12px 0",paddingBottom:4,borderBottom:`2px solid ${e.accent}`},children:"Performance Metrics"}),o.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:[o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Health Score:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:n.health_score!==null&&n.health_score!==void 0?`${Number(n.health_score).toFixed(2)}`:"N/A"})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Document Count:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:b(n.document_count)})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Total Size:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:x(n.total_size_mb)})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Index Count:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:b(n.index_count)})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Avg Object Size:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:n.avg_object_size_bytes?`${(Number(n.avg_object_size_bytes)/1024).toFixed(2)} KB`:"N/A"})]})]})]}),o.jsxs("div",{style:{marginBottom:0},children:[o.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:e.foreground,margin:"0 0 12px 0",paddingBottom:4,borderBottom:`2px solid ${e.accent}`},children:"Sharding"}),o.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:[o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Is Sharded:"}),o.jsx("div",{style:{color:e.foreground,fontSize:12,fontFamily:"Consolas"},children:o.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:g(n.is_sharded?"WARNING":"HEALTHY")+"20",color:g(n.is_sharded?"WARNING":"HEALTHY"),border:`1px solid ${g(n.is_sharded?"WARNING":"HEALTHY")}`},children:S(n.is_sharded)})})]}),o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Shard Key:"}),o.jsx("div",{style:{fontFamily:"Consolas",fontSize:12,color:e.foreground},children:n.shard_key||"N/A"})]})]})]})]}),[x,b,S]),ro=l.useCallback(n=>o.jsx("div",{children:o.jsxs("div",{style:{marginBottom:0},children:[o.jsx("h3",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,color:e.foreground,margin:"0 0 12px 0",paddingBottom:4,borderBottom:`2px solid ${e.accent}`},children:"Recommendations"}),o.jsx("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:12},children:o.jsxs("div",{children:[o.jsx("div",{style:{color:e.muted,fontWeight:500,fontSize:11,marginBottom:4,fontFamily:"Consolas"},children:"Recommendation Summary:"}),o.jsx("div",{style:{whiteSpace:"pre-wrap",fontFamily:"Consolas",fontSize:12,color:e.foreground},children:n.recommendation_summary||"No recommendations available"})]})})]})}),[]);return O&&G.length===0?o.jsx(yo,{variant:"table"}):o.jsxs(co,{children:[o.jsx("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:s.spacing.lg,paddingBottom:s.spacing.md,borderBottom:`2px solid ${e.accent}`},children:o.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:e.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[o.jsx("span",{style:{color:e.accent,marginRight:s.spacing.sm},children:m.blockFull}),"GOVERNANCE CATALOG - MONGODB"]})}),N&&o.jsx("div",{style:{marginBottom:s.spacing.md},children:o.jsx(W,{title:"ERROR",children:o.jsx("div",{style:{padding:s.spacing.sm,color:e.foreground,fontSize:12,fontFamily:"Consolas",backgroundColor:e.backgroundSoft,borderRadius:2},children:N})})}),o.jsx(vo,{cards:eo}),o.jsx(W,{title:"FILTERS",children:o.jsxs("div",{style:{display:"flex",gap:s.spacing.sm,flexWrap:"wrap",alignItems:"center"},children:[o.jsxs("select",{value:d.server_name,onChange:n=>$("server_name",n.target.value),style:{padding:`${s.spacing.xs} ${s.spacing.sm}`,border:`1px solid ${e.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:e.background,color:e.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:n=>{n.target.style.borderColor=e.accent,n.target.style.outline=`2px solid ${e.accent}`,n.target.style.outlineOffset="2px"},onBlur:n=>{n.target.style.borderColor=e.border,n.target.style.outline="none"},children:[o.jsx("option",{value:"",children:"All Servers"}),E.map(n=>o.jsx("option",{value:n,children:n},n))]}),o.jsxs("select",{value:d.database_name,onChange:n=>$("database_name",n.target.value),disabled:!d.server_name,style:{padding:`${s.spacing.xs} ${s.spacing.sm}`,border:`1px solid ${e.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:e.background,color:e.foreground,opacity:d.server_name?1:.5,cursor:d.server_name?"pointer":"not-allowed",outline:"none",transition:"border-color 0.15s ease"},onFocus:n=>{d.server_name&&(n.target.style.borderColor=e.accent,n.target.style.outline=`2px solid ${e.accent}`,n.target.style.outlineOffset="2px")},onBlur:n=>{n.target.style.borderColor=e.border,n.target.style.outline="none"},children:[o.jsx("option",{value:"",children:"All Databases"}),L.map(n=>o.jsx("option",{value:n,children:n},n))]}),o.jsxs("select",{value:d.health_status,onChange:n=>$("health_status",n.target.value),style:{padding:`${s.spacing.xs} ${s.spacing.sm}`,border:`1px solid ${e.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:e.background,color:e.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:n=>{n.target.style.borderColor=e.accent,n.target.style.outline=`2px solid ${e.accent}`,n.target.style.outlineOffset="2px"},onBlur:n=>{n.target.style.borderColor=e.border,n.target.style.outline="none"},children:[o.jsx("option",{value:"",children:"All Health Status"}),o.jsx("option",{value:"EXCELLENT",children:"Excellent"}),o.jsx("option",{value:"HEALTHY",children:"Healthy"}),o.jsx("option",{value:"WARNING",children:"Warning"}),o.jsx("option",{value:"CRITICAL",children:"Critical"})]}),o.jsxs("select",{value:d.access_frequency,onChange:n=>$("access_frequency",n.target.value),style:{padding:`${s.spacing.xs} ${s.spacing.sm}`,border:`1px solid ${e.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:e.background,color:e.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:n=>{n.target.style.borderColor=e.accent,n.target.style.outline=`2px solid ${e.accent}`,n.target.style.outlineOffset="2px"},onBlur:n=>{n.target.style.borderColor=e.border,n.target.style.outline="none"},children:[o.jsx("option",{value:"",children:"All Access Frequency"}),o.jsx("option",{value:"REAL_TIME",children:"Real Time"}),o.jsx("option",{value:"HIGH",children:"High"}),o.jsx("option",{value:"MEDIUM",children:"Medium"}),o.jsx("option",{value:"LOW",children:"Low"}),o.jsx("option",{value:"RARE",children:"Rare"})]}),o.jsx("input",{type:"text",placeholder:"Search collection name...",value:d.search,onChange:n=>$("search",n.target.value),style:{flex:1,minWidth:"200px",padding:`${s.spacing.xs} ${s.spacing.sm}`,border:`1px solid ${e.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:e.background,color:e.foreground,outline:"none",transition:"border-color 0.15s ease"},onFocus:n=>{n.target.style.borderColor=e.accent,n.target.style.outline=`2px solid ${e.accent}`,n.target.style.outlineOffset="2px"},onBlur:n=>{n.target.style.borderColor=e.border,n.target.style.outline="none"}}),o.jsx(j,{label:"Reset All",onClick:()=>{A(),y(1)},variant:"ghost"})]})}),o.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:s.spacing.lg,marginTop:s.spacing.sm,fontFamily:"Consolas",fontSize:12,gap:s.spacing.lg},children:[o.jsxs("div",{style:{display:"flex",gap:s.spacing.sm,alignItems:"center"},children:[o.jsx("label",{style:{color:e.muted,fontSize:11,fontFamily:"Consolas"},children:"Items per page:"}),o.jsxs("select",{value:C,onChange:n=>{I(Number(n.target.value)),y(1)},style:{padding:`${s.spacing.xs} ${s.spacing.sm}`,border:`1px solid ${e.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12,backgroundColor:e.background,color:e.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:n=>{n.target.style.borderColor=e.accent,n.target.style.outline=`2px solid ${e.accent}`,n.target.style.outlineOffset="2px"},onBlur:n=>{n.target.style.borderColor=e.border,n.target.style.outline="none"},children:[o.jsx("option",{value:10,children:"10"}),o.jsx("option",{value:20,children:"20"}),o.jsx("option",{value:50,children:"50"}),o.jsx("option",{value:100,children:"100"}),o.jsx("option",{value:200,children:"200"})]})]}),o.jsxs("div",{style:{display:"flex",gap:s.spacing.sm,alignItems:"center"},children:[o.jsx(j,{label:z==="list"?"Show Charts":"Show List",onClick:()=>Z(z==="list"?"charts":"list"),variant:z==="charts"?"primary":"ghost"}),o.jsx(j,{label:"Metrics Info",onClick:()=>H(!0),variant:"ghost"})]})]}),Q&&o.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>H(!1),children:o.jsxs("div",{style:{width:"90%",maxWidth:900,maxHeight:"90vh",overflowY:"auto"},onClick:n=>n.stopPropagation(),children:[o.jsx("style",{children:`
              div[style*="overflowY"]::-webkit-scrollbar {
                width: 0px;
                display: none;
              }
              div[style*="overflowY"] {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}),o.jsx(W,{title:"METRICS PLAYBOOK - MONGODB GOVERNANCE",children:o.jsxs("div",{style:{padding:s.spacing.md,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[o.jsxs("div",{style:{marginBottom:s.spacing.md},children:[o.jsxs("div",{style:{fontSize:13,fontWeight:600,color:e.accent,marginBottom:s.spacing.sm,fontFamily:"Consolas"},children:[m.blockFull," Total Collections"]}),o.jsx("div",{style:{color:e.foreground,marginLeft:s.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Total number of collections cataloged across all MongoDB servers and databases in the governance system."})]}),o.jsxs("div",{style:{marginBottom:s.spacing.md},children:[o.jsxs("div",{style:{fontSize:13,fontWeight:600,color:e.accent,marginBottom:s.spacing.sm,fontFamily:"Consolas"},children:[m.blockFull," Total Size"]}),o.jsx("div",{style:{color:e.foreground,marginLeft:s.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Combined storage size of all collections across all MongoDB databases. Includes data and index sizes."})]}),o.jsxs("div",{style:{marginBottom:s.spacing.md},children:[o.jsxs("div",{style:{fontSize:13,fontWeight:600,color:e.accent,marginBottom:s.spacing.sm,fontFamily:"Consolas"},children:[m.blockFull," Total Documents"]}),o.jsx("div",{style:{color:e.foreground,marginLeft:s.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Total number of documents across all MongoDB collections in the governance catalog."})]}),o.jsxs("div",{style:{marginBottom:s.spacing.md},children:[o.jsxs("div",{style:{fontSize:13,fontWeight:600,color:e.accent,marginBottom:s.spacing.sm,fontFamily:"Consolas"},children:[m.blockFull," Healthy"]}),o.jsx("div",{style:{color:e.foreground,marginLeft:s.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Collections with HEALTHY status, indicating optimal performance, proper indexing, and good access patterns."})]}),o.jsxs("div",{style:{marginBottom:s.spacing.md},children:[o.jsxs("div",{style:{fontSize:13,fontWeight:600,color:e.muted,marginBottom:s.spacing.sm,fontFamily:"Consolas"},children:[m.blockFull," Warning"]}),o.jsx("div",{style:{color:e.foreground,marginLeft:s.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Collections with WARNING status, indicating potential issues such as missing indexes, suboptimal sharding, or performance concerns that should be monitored."})]}),o.jsxs("div",{style:{marginBottom:s.spacing.md},children:[o.jsxs("div",{style:{fontSize:13,fontWeight:600,color:e.foreground,marginBottom:s.spacing.sm,fontFamily:"Consolas"},children:[m.blockFull," Critical"]}),o.jsx("div",{style:{color:e.foreground,marginLeft:s.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Collections with CRITICAL status, indicating serious issues requiring immediate attention such as missing critical indexes, sharding problems, or severe performance degradation."})]}),o.jsxs("div",{style:{marginTop:s.spacing.md,padding:s.spacing.sm,background:e.backgroundSoft,borderRadius:2,border:`1px solid ${e.border}`},children:[o.jsxs("div",{style:{fontSize:11,fontWeight:600,color:e.muted,marginBottom:s.spacing.xs,fontFamily:"Consolas"},children:[m.blockSemi," Note"]}),o.jsx("div",{style:{fontSize:11,color:e.foreground,fontFamily:"Consolas"},children:"These metrics are calculated in real-time from the data_governance_catalog_mongodb table and reflect the current state of your MongoDB governance catalog."})]}),o.jsx("div",{style:{marginTop:s.spacing.md,textAlign:"right"},children:o.jsx(j,{label:"Close",onClick:()=>H(!1),variant:"ghost"})})]})})]})}),z==="charts"&&o.jsx(po,{engine:"mongodb",selectedItem:u?{server_name:u.server_name,database_name:u.database_name,collection_name:u.collection_name}:null}),z==="list"&&O?o.jsx(go,{children:"Loading tree view..."}):z==="list"?o.jsxs(o.Fragment,{children:[o.jsxs("div",{style:{display:"grid",gridTemplateColumns:u?"1fr 500px":"1fr",gap:s.spacing.md,marginTop:s.spacing.md},children:[o.jsx(Ao,{items:G,onItemClick:oo}),u&&o.jsxs("div",{style:{position:"sticky",top:s.spacing.md,maxHeight:"calc(100vh - 200px)",overflowY:"auto"},children:[o.jsx("style",{children:`
                  div[style*="overflowY"]::-webkit-scrollbar {
                    width: 0px;
                    display: none;
                  }
                  div[style*="overflowY"] {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                  }
                `}),o.jsxs(W,{title:"DETAILS",children:[o.jsxs("div",{style:{display:"flex",gap:s.spacing.xs,marginBottom:s.spacing.md,borderBottom:`1px solid ${e.border}`,paddingBottom:s.spacing.sm,flexWrap:"wrap"},children:[o.jsx(j,{label:"Overview",onClick:()=>a("overview"),variant:t==="overview"?"primary":"ghost"}),o.jsx(j,{label:"Indexes",onClick:()=>a("indexes"),variant:t==="indexes"?"primary":"ghost"}),o.jsx(j,{label:"Performance",onClick:()=>a("performance"),variant:t==="performance"?"primary":"ghost"}),o.jsx(j,{label:"Recommendations",onClick:()=>a("recommendations"),variant:t==="recommendations"?"primary":"ghost"})]}),t==="overview"&&no(u),t==="indexes"&&to(u),t==="performance"&&so(u),t==="recommendations"&&ro(u)]})]})]}),F.totalPages>1&&o.jsx("div",{style:{marginTop:24},children:o.jsxs(mo,{children:[o.jsx(V,{onClick:()=>y(Math.max(1,r-1)),disabled:r===1,children:"Previous"}),o.jsxs("span",{style:{fontFamily:"Consolas",fontSize:12,color:e.foreground},children:["Page ",F.currentPage," of ",F.totalPages," (",F.total," total)"]}),o.jsx(V,{onClick:()=>y(Math.min(F.totalPages,r+1)),disabled:r===F.totalPages,children:"Next"})]})})]}):null]})};export{Do as default};
