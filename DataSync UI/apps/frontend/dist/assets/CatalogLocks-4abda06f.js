import{m as L,f as m,t,r as c,j as e,b as o,w as W,e as p,G as X,V as J}from"./index-75d7470b.js";import{e as D}from"./errorHandler-5ea9ae85.js";import{A as C}from"./AsciiPanel-9f053981.js";import{A as I}from"./AsciiButton-446d8430.js";import{S as Q}from"./SkeletonLoader-530eacc4.js";const Y=L`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,Z=L`
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: 1000px;
    opacity: 1;
  }
`,ee=L`
  from {
    max-height: 1000px;
    opacity: 1;
  }
  to {
    max-height: 0;
    opacity: 0;
  }
`,U=m.div`
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  font-size: 0.95em;
  background: ${t.colors.background.main};
  border: 1px solid ${t.colors.border.light};
  border-radius: ${t.borderRadius.lg};
  padding: ${t.spacing.lg};
  max-height: 800px;
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: ${t.shadows.md};
  position: relative;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${t.colors.background.secondary};
    border-radius: ${t.borderRadius.sm};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${t.colors.border.medium};
    border-radius: ${t.borderRadius.sm};
    transition: background ${t.transitions.normal};
    
    &:hover {
      background: ${t.colors.primary.main};
    }
  }
`,N=m.div`
  user-select: none;
  animation: ${Y} 0.3s ease-out;
  margin-bottom: 2px;
`,te=m.span`
  color: ${t.colors.border.medium};
  margin-right: 6px;
  font-family: "Consolas, 'Source Code Pro', monospace";
  font-size: 0.9em;
  transition: color ${t.transitions.normal};
`,P=m.div`
  display: flex;
  align-items: center;
  padding: ${s=>s.$level===0?"12px 8px":"10px 8px"};
  padding-left: ${s=>s.$level*24+8}px;
  cursor: pointer;
  border-radius: ${t.borderRadius.md};
  transition: all ${t.transitions.normal};
  position: relative;
  margin: 2px 0;
  
  ${s=>s.$nodeType==="group"?`
        background: linear-gradient(135deg, ${t.colors.primary.light}08 0%, ${t.colors.primary.main}05 100%);
        border-left: 3px solid ${t.colors.primary.main};
        font-weight: 600;
      `:`
      background: ${t.colors.background.secondary};
      border-left: 2px solid ${t.colors.border.medium};
    `}
  
  &:hover {
    background: ${s=>s.$nodeType==="group"?`linear-gradient(135deg, ${t.colors.primary.light}15 0%, ${t.colors.primary.main}10 100%)`:t.colors.background.secondary};
    transform: translateX(2px);
    box-shadow: ${t.shadows.sm};
  }
  
  &:active {
    transform: translateX(1px) scale(0.99);
  }
`,oe=m.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 8px;
  border-radius: ${t.borderRadius.sm};
  background: ${s=>s.$isExpanded?`linear-gradient(135deg, ${t.colors.primary.main} 0%, ${t.colors.primary.light} 100%)`:t.colors.background.secondary};
  color: ${s=>s.$isExpanded?t.colors.text.white:t.colors.primary.main};
  font-size: 0.7em;
  font-weight: bold;
  transition: all ${t.transitions.normal};
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: ${t.shadows.sm};
  }
  
  svg {
    transition: transform ${t.transitions.normal};
    transform: ${s=>s.$isExpanded?"rotate(0deg)":"rotate(-90deg)"};
  }
`,H=m.span`
  font-weight: ${s=>s.$isGroup?"700":"600"};
  font-size: ${s=>s.$isGroup?"1.05em":"0.98em"};
  color: ${s=>s.$isGroup?t.colors.primary.main:t.colors.text.primary};
  margin-right: 12px;
  transition: color ${t.transitions.normal};
  letter-spacing: ${s=>s.$isGroup?"0.3px":"0"};
  
  ${s=>s.$isGroup&&`
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  `}
`,V=m.div`
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin-left: auto;
  flex-wrap: wrap;
  font-size: 0.85em;
`,O=m.span`
  padding: 4px 10px;
  border-radius: ${t.borderRadius.md};
  font-size: 0.8em;
  font-weight: 500;
  background: linear-gradient(135deg, ${t.colors.background.secondary} 0%, ${t.colors.background.tertiary} 100%);
  color: ${t.colors.text.secondary};
  border: 1px solid ${t.colors.border.light};
  transition: all ${t.transitions.normal};
  
  &:hover {
    background: linear-gradient(135deg, ${t.colors.primary.light}10 0%, ${t.colors.primary.main}08 100%);
    border-color: ${t.colors.primary.main};
    color: ${t.colors.primary.main};
    transform: translateY(-1px);
  }
`,ne=m.div`
  overflow: hidden;
  animation: ${s=>s.$isExpanded?Z:ee} 0.3s ease-out;
  padding-left: ${s=>s.$level*24+36}px;
`,re=m.div`
  padding: 60px 40px;
  text-align: center;
  color: ${t.colors.text.secondary};
  animation: ${Y} 0.5s ease-out;
  
  &::before {
    content: '█';
    font-size: 3em;
    display: block;
    margin-bottom: ${t.spacing.md};
    opacity: 0.5;
    font-family: "Consolas, 'Source Code Pro', monospace";
  }
`,se=()=>e.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[e.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",ry:"2"}),e.jsx("line",{x1:"9",y1:"3",x2:"9",y2:"21"}),e.jsx("line",{x1:"3",y1:"9",x2:"21",y2:"9"})]}),ie=()=>e.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[e.jsx("rect",{x:"3",y:"11",width:"18",height:"11",rx:"2",ry:"2"}),e.jsx("path",{d:"M7 11V7a5 5 0 0 1 10 0v4"})]}),ae=({locks:s,onLockClick:w})=>{const[E,j]=c.useState(new Set),v=c.useMemo(()=>{const n=new Map,l=[];s.forEach(a=>{const u=a.lock_name.split(".");if(u.length>=2){const g=u[0];n.has(g)||n.set(g,{name:g,locks:[]}),n.get(g).locks.push(a)}else l.push(a)});const r=Array.from(n.values()).sort((a,u)=>a.name.localeCompare(u.name));return l.length>0&&r.push({name:"Other",locks:l}),r},[s]),$=n=>{j(l=>{const r=new Set(l);return r.has(n)?r.delete(n):r.add(n),r})},f=n=>{if(!n)return{status:"unknown",label:"Unknown"};const l=new Date(n),r=new Date,a=l.getTime()-r.getTime(),u=a/(1e3*60);return a<0?{status:"expired",label:"Expired"}:u<5?{status:"warning",label:"Expiring Soon"}:{status:"active",label:"Active"}},T=(n,l)=>{if(n===0)return null;const r=[];for(let a=0;a<n-1;a++)r.push("│  ");return l?r.push("└── "):r.push("├── "),e.jsx(te,{$isLast:l,children:r.join("")})},S=(n,l,r)=>{const a=f(n.expires_at);return e.jsx(N,{children:e.jsxs(P,{$level:l,$nodeType:"lock",onClick:()=>w==null?void 0:w(n),children:[T(l,r),e.jsx(ie,{}),e.jsx(H,{children:n.lock_name}),e.jsxs(V,{children:[e.jsx(O,{style:{background:a.status==="expired"?t.colors.status.error.bg:a.status==="warning"?t.colors.status.warning.bg:t.colors.status.success.bg,color:a.status==="expired"?t.colors.status.error.text:a.status==="warning"?t.colors.status.warning.text:t.colors.status.success.text},children:a.label}),n.acquired_by&&e.jsx(O,{children:n.acquired_by})]})]})},n.lock_name)},F=(n,l)=>{const r=E.has(n.name),u=v.findIndex(g=>g.name===n.name)===v.length-1;return e.jsxs(N,{children:[e.jsxs(P,{$level:l,$isExpanded:r,$nodeType:"group",onClick:()=>$(n.name),children:[T(l,u),e.jsx(oe,{$isExpanded:r,children:r?e.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",children:e.jsx("polyline",{points:"18 15 12 9 6 15"})}):e.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",children:e.jsx("polyline",{points:"9 18 15 12 9 6"})})}),e.jsx(se,{}),e.jsx(H,{$isGroup:!0,children:n.name}),e.jsx(V,{children:e.jsxs(O,{children:[n.locks.length," ",n.locks.length===1?"lock":"locks"]})})]}),e.jsx(ne,{$isExpanded:r,$level:l,children:r&&n.locks.map((g,B)=>{const A=B===n.locks.length-1;return S(g,l+1,A)})})]},n.name)};return v.length===0?e.jsx(U,{children:e.jsx(re,{children:"No active locks. Locks will appear here when catalog operations are running."})}):e.jsx(U,{children:v.map((n,l)=>e.jsx("div",{style:{animationDelay:`${l*.05}s`},children:F(n,0)},n.name))})},le=L`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,ce=L`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;L`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
`;const de=m(X)`
  margin-bottom: ${t.spacing.xxl};
  font-family: "Consolas";
  animation: ${ce} 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation-delay: 0.1s;
  animation-fill-mode: both;
`,M=m(J)`
  padding: ${t.spacing.lg};
  min-height: 100px;
  background: ${o.backgroundSoft};
  border: 1px solid ${o.border};
  border-left: 2px solid ${o.accent};
  border-radius: 2px;
  transition: all ${t.transitions.normal};
  animation: ${le} 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation-delay: ${s=>(s.$index||0)*.1}s;
  animation-fill-mode: both;
  position: relative;
  font-family: "Consolas";
  font-size: 12px;
`,R=m.div`
  font-size: 11px;
  color: ${o.muted};
  margin-bottom: ${t.spacing.sm};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: "Consolas";
  display: flex;
  align-items: center;
  gap: 6px;
`,_=m.div`
  font-size: 18px;
  font-weight: 700;
  color: ${o.accent};
  font-family: "Consolas";
`,fe=()=>{const[s,w]=c.useState(!0),[E,j]=c.useState(null),[v,$]=c.useState(null),[f,T]=c.useState([]),[S,F]=c.useState({}),[n,l]=c.useState(!1),r=c.useRef(!0),a=c.useCallback(async()=>{if(!r.current)return;const i=Date.now(),y=300;try{w(!0),j(null),$(null);const[b,x]=await Promise.all([W.getLocks(),W.getMetrics()]),d=Date.now()-i,k=Math.max(0,y-d);await new Promise(h=>setTimeout(h,k)),r.current&&(T(b||[]),F(x||{}))}catch(b){r.current&&j(D(b))}finally{r.current&&w(!1)}},[]);c.useEffect(()=>{r.current=!0,a();const i=setInterval(()=>{r.current&&a()},5e3);return()=>{r.current=!1,clearInterval(i)}},[a]);const u=c.useCallback(async i=>{if(confirm(`Are you sure you want to force unlock "${i}"? This may interrupt operations.`))try{if(!r.current)return;j(null),$(null),await W.unlock(i),r.current&&($(`Lock "${i}" has been released successfully`),await a())}catch(y){r.current&&j(D(y))}},[a]),g=c.useCallback(async()=>{try{if(!r.current)return;j(null),$(null);const i=await W.cleanExpired();r.current&&($(i.message||"Expired locks cleaned successfully"),await a())}catch(i){r.current&&j(D(i))}},[a]),B=c.useCallback(i=>{if(!i)return{status:"unknown",label:"Unknown"};const y=new Date(i),b=new Date,x=y.getTime()-b.getTime(),d=x/(1e3*60);return x<0?{status:"expired",label:"Expired"}:d<5?{status:"warning",label:"Expiring Soon"}:{status:"active",label:"Active"}},[]),A=c.useCallback(i=>{if(!i)return"N/A";const y=new Date(i),b=new Date,x=y.getTime()-b.getTime();if(x<0){const z=Math.abs(x);return`Expired ${Math.floor(z/(1e3*60))}m ago`}const d=Math.floor(x/(1e3*60)),k=Math.floor(d/60),h=Math.floor(k/24);return h>0?`${h}d ${k%24}h`:k>0?`${k}h ${d%60}m`:`${d}m`},[]),q=c.useCallback(i=>i?new Date(i).toLocaleString():"N/A",[]),K=c.useCallback(()=>{const i=["Lock Name","Acquired By","Acquired At","Expires At","Status","Time Remaining"],y=f.map(h=>{const z=B(h.expires_at);return[h.lock_name,h.acquired_by||"",q(h.acquired_at),q(h.expires_at),z.label,A(h.expires_at)]}),b=[i.join(","),...y.map(h=>h.map(z=>`"${String(z).replace(/"/g,'""')}"`).join(","))].join(`
`),x=new Blob([b],{type:"text/csv;charset=utf-8;"}),d=document.createElement("a"),k=URL.createObjectURL(x);d.setAttribute("href",k),d.setAttribute("download",`catalog_locks_export_${new Date().toISOString().split("T")[0]}.csv`),d.style.visibility="hidden",document.body.appendChild(d),d.click(),document.body.removeChild(d)},[f,B,q,A]);if(s&&f.length===0)return e.jsx(Q,{variant:"table"});const G=f.filter(i=>i.expires_at?new Date(i.expires_at)<new Date:!1);return e.jsxs("div",{style:{width:"100%",minHeight:"100vh",padding:"20px",fontFamily:"Consolas",fontSize:12,color:o.foreground,backgroundColor:o.background,display:"flex",flexDirection:"column",gap:20},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"},children:[e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:o.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:o.accent,marginRight:8},children:p.blockFull}),"CATALOG LOCKS"]}),e.jsx(I,{label:"Catalog Locks Info",onClick:()=>l(!0),variant:"ghost"})]}),n&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>l(!1),children:e.jsx("div",{style:{width:"90%",maxWidth:1e3,maxHeight:"90vh",overflowY:"auto"},onClick:i=>i.stopPropagation(),children:e.jsx(C,{title:"CATALOG LOCKS PLAYBOOK",children:e.jsxs("div",{style:{padding:16,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:o.accent,marginBottom:12},children:[p.blockFull," OVERVIEW"]}),e.jsx("div",{style:{color:o.foreground,marginLeft:16},children:"Catalog Locks are a critical mechanism to prevent race conditions and ensure data consistency during catalog operations. When multiple processes or instances attempt to modify the catalog simultaneously, locks prevent conflicts by allowing only one operation to proceed at a time. This ensures catalog integrity and prevents data corruption."})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:o.accent,marginBottom:12},children:[p.blockFull," HOW LOCKS WORK"]}),e.jsxs("div",{style:{marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:o.foreground,marginBottom:4},children:"Lock Acquisition"}),e.jsx("div",{style:{color:o.foreground,marginLeft:16,fontSize:11},children:'When a catalog operation begins, the system attempts to acquire a lock with a unique name (e.g., "catalog_sync_postgresql"). The lock is stored in the database with an expiration time. If another process already holds an active lock, the operation will wait or retry based on configuration settings.'})]}),e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:o.foreground,marginBottom:4},children:"Lock Expiration"}),e.jsx("div",{style:{color:o.foreground,marginLeft:16,fontSize:11},children:"Each lock has an expiration timestamp. If a process crashes or fails to release a lock, it will automatically expire after the timeout period (typically 5 minutes). Expired locks can be manually cleaned or are automatically removed by the system."})]}),e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:o.foreground,marginBottom:4},children:"Lock Release"}),e.jsx("div",{style:{color:o.foreground,marginLeft:16,fontSize:11},children:"When an operation completes successfully, the lock is automatically released. This allows other waiting operations to proceed. If an operation fails, the lock should still be released to prevent blocking other processes."})]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:o.accent,marginBottom:12},children:[p.blockFull," LOCK STATUSES"]}),e.jsxs("div",{style:{marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:o.success,fontWeight:600},children:"Active"}),e.jsx("span",{style:{color:o.foreground,marginLeft:8,fontSize:11},children:"Lock is currently held and has not expired. The associated operation is either in progress or recently completed but the lock hasn't been released yet."})]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:o.warning,fontWeight:600},children:"Expiring Soon"}),e.jsx("span",{style:{color:o.foreground,marginLeft:8,fontSize:11},children:"Lock will expire within 5 minutes. This may indicate a long-running operation or a process that hasn't properly released the lock. Monitor these locks closely."})]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:o.danger,fontWeight:600},children:"Expired"}),e.jsx("span",{style:{color:o.foreground,marginLeft:8,fontSize:11},children:"Lock has passed its expiration time. These locks should be cleaned to free up resources. Expired locks typically indicate a crashed process or an operation that failed to release properly."})]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:o.accent,marginBottom:12},children:[p.blockFull," METRICS EXPLAINED"]}),e.jsxs("div",{style:{marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:o.foreground,marginBottom:4},children:"Total Locks"}),e.jsx("div",{style:{color:o.foreground,marginLeft:16,fontSize:11},children:"Total number of lock records in the system, including both active and expired locks. This gives you an overview of lock activity."})]}),e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:o.success,marginBottom:4},children:"Active Locks"}),e.jsx("div",{style:{color:o.foreground,marginLeft:16,fontSize:11},children:"Number of locks that are currently active (not expired). These locks are actively preventing concurrent operations on the same catalog resources."})]}),e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:o.danger,marginBottom:4},children:"Expired Locks"}),e.jsx("div",{style:{color:o.foreground,marginLeft:16,fontSize:11},children:"Number of locks that have passed their expiration time. These should be cleaned periodically to maintain system health. High numbers of expired locks may indicate process failures."})]}),e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:o.accent,marginBottom:4},children:"Unique Hosts"}),e.jsx("div",{style:{color:o.foreground,marginLeft:16,fontSize:11},children:"Number of distinct hostnames that have acquired locks. This helps identify how many different systems or instances are accessing the catalog."})]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:o.accent,marginBottom:12},children:[p.blockFull," LOCK INFORMATION"]}),e.jsxs("div",{style:{marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:o.accent,fontWeight:600},children:"Lock Name"}),e.jsx("span",{style:{color:o.foreground,marginLeft:8,fontSize:11},children:'Unique identifier for the lock, typically indicating the operation type (e.g., "catalog_sync_postgresql")'})]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:o.accent,fontWeight:600},children:"Acquired By"}),e.jsx("span",{style:{color:o.foreground,marginLeft:8,fontSize:11},children:"Hostname or identifier of the system/process that acquired the lock"})]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:o.accent,fontWeight:600},children:"Acquired At"}),e.jsx("span",{style:{color:o.foreground,marginLeft:8,fontSize:11},children:"Timestamp when the lock was successfully acquired"})]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:o.accent,fontWeight:600},children:"Expires At"}),e.jsx("span",{style:{color:o.foreground,marginLeft:8,fontSize:11},children:"Timestamp when the lock will automatically expire if not released"})]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:o.accent,fontWeight:600},children:"Session ID"}),e.jsx("span",{style:{color:o.foreground,marginLeft:8,fontSize:11},children:"Unique session identifier for the process that holds the lock"})]})]})]}),e.jsxs("div",{style:{marginTop:16,padding:12,background:o.backgroundSoft,borderRadius:2,border:`1px solid ${o.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:o.muted,marginBottom:4},children:[p.blockSemi," Best Practices"]}),e.jsxs("div",{style:{fontSize:11,color:o.foreground},children:["• Monitor expired locks regularly and clean them to prevent resource buildup",e.jsx("br",{}),"• If a lock appears stuck, verify the process is still running before force-unlocking",e.jsx("br",{}),"• High numbers of active locks may indicate contention - review operation frequency",e.jsx("br",{}),"• Use appropriate lock timeouts based on expected operation duration",e.jsx("br",{}),"• Force-unlock only when absolutely necessary, as it may interrupt active operations",e.jsx("br",{}),"• Review lock patterns to identify potential optimization opportunities"]})]}),e.jsx("div",{style:{marginTop:16,textAlign:"right"},children:e.jsx(I,{label:"Close",onClick:()=>l(!1),variant:"ghost"})})]})})})}),E&&e.jsx("div",{style:{marginBottom:20},children:e.jsx(C,{title:"ERROR",children:e.jsx("div",{style:{padding:"12px",color:o.danger,fontSize:12,fontFamily:"Consolas"},children:E})})}),v&&e.jsx(C,{title:"SUCCESS",children:e.jsxs("div",{style:{color:o.success,fontFamily:"Consolas",fontSize:12,padding:"8px 0"},children:[p.blockFull," ",v]})}),e.jsx(C,{title:"METRICS",children:e.jsxs(de,{$columns:"repeat(auto-fit, minmax(200px, 1fr))",children:[e.jsxs(M,{$index:0,children:[e.jsxs(R,{children:[e.jsx("span",{children:p.blockFull}),"Total Locks"]}),e.jsx(_,{children:S.total_locks||0})]}),e.jsxs(M,{$index:1,children:[e.jsxs(R,{children:[e.jsx("span",{children:p.blockFull}),"Active Locks"]}),e.jsx(_,{children:S.active_locks||0})]}),e.jsxs(M,{$index:2,children:[e.jsxs(R,{children:[e.jsx("span",{children:p.blockFull}),"Expired Locks"]}),e.jsx(_,{children:S.expired_locks||0})]}),e.jsxs(M,{$index:3,children:[e.jsxs(R,{children:[e.jsx("span",{children:p.blockFull}),"Unique Hosts"]}),e.jsx(_,{children:S.unique_hosts||0})]})]})}),e.jsx(C,{title:"ACTIONS",children:e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:t.spacing.md,background:o.backgroundSoft,border:`1px solid ${o.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12},children:[e.jsxs("div",{style:{fontSize:11,color:o.muted,fontFamily:"Consolas"},children:[p.dot," Locks are used to prevent race conditions during catalog operations. Expired locks are automatically cleaned."]}),e.jsx(I,{label:`Clean Expired (${G.length})`,onClick:g,disabled:G.length===0,variant:"ghost"})]})}),e.jsxs(C,{title:"LOCKS",children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:t.spacing.md,background:o.backgroundSoft,border:`1px solid ${o.border}`,borderRadius:2,marginBottom:t.spacing.md,fontFamily:"Consolas",fontSize:12},children:[e.jsxs("div",{style:{fontSize:11,color:o.muted,fontFamily:"Consolas"},children:["Total: ",f.length," lock$",f.length!==1?"s":""]}),e.jsx("div",{style:{display:"flex",gap:t.spacing.sm},children:e.jsx(I,{label:"Export CSV",onClick:K,variant:"ghost"})})]}),e.jsx(ae,{locks:f,onLockClick:i=>u(i.lock_name)})]})]})};export{fe as default};
