import{f as d,b as s,t as n,r as c,j as e,J as E,C as U,e as g,K,V as P}from"./index-f6ac47b8.js";import{e as A}from"./errorHandler-5ea9ae85.js";import{A as $}from"./AsciiPanel-5614714e.js";import{A as I}from"./AsciiButton-4907e65e.js";import{S as H}from"./SkeletonLoader-792007e7.js";const O=d.div`
  font-family: 'Consolas';
  font-size: 12px;
  background: ${s.background};
  border: 1px solid ${s.border};
  border-radius: 2;
  padding: ${n.spacing.md};
  max-height: 800px;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  
  &::-webkit-scrollbar {
    width: 0px;
    display: none;
  }
  
  -ms-overflow-style: none;
  scrollbar-width: none;
`,R=d.div`
  user-select: none;
  margin-bottom: 2px;
`,V=d.span`
  color: ${s.muted};
  margin-right: ${n.spacing.xs};
  font-family: 'Consolas';
  font-size: 11px;
`,D=d.div`
  display: flex;
  align-items: center;
  padding: ${t=>t.$level===0?n.spacing.sm:n.spacing.xs} ${n.spacing.sm};
  padding-left: ${t=>t.$level*24+parseInt(n.spacing.sm)}px;
  cursor: pointer;
  border-radius: 2;
  transition: background-color 0.15s ease;
  position: relative;
  margin: 2px 0;
  
  ${t=>t.$nodeType==="group"?`
        background: ${t.$isExpanded?s.backgroundSoft:s.background};
        border-left: 3px solid ${s.accent};
        font-weight: 600;
      `:`
      background: ${s.background};
      border-left: 2px solid ${s.border};
    `}
`,Y=d.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: ${n.spacing.sm};
  border-radius: 2;
  background: ${t=>t.$isExpanded?s.accent:s.backgroundSoft};
  color: ${t=>t.$isExpanded?s.background:s.accent};
  font-size: 11px;
  font-weight: bold;
  transition: background-color 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
  font-family: 'Consolas';
  
  svg {
    transition: transform 0.15s ease;
    transform: ${t=>t.$isExpanded?"rotate(0deg)":"rotate(-90deg)"};
  }
`,_=d.span`
  font-weight: ${t=>t.$isGroup?"700":"600"};
  font-size: ${t=>t.$isGroup?"13px":"12px"};
  color: ${t=>t.$isGroup?s.accent:s.foreground};
  margin-right: ${n.spacing.sm};
  font-family: 'Consolas';
`,G=d.div`
  display: inline-flex;
  gap: ${n.spacing.xs};
  align-items: center;
  margin-left: auto;
  flex-wrap: wrap;
  font-size: 11px;
  font-family: 'Consolas';
`,q=d.span`
  padding: ${n.spacing.xs} ${n.spacing.sm};
  border-radius: 2;
  font-size: 11px;
  font-weight: 500;
  font-family: 'Consolas';
  background: ${t=>t.$status==="expired"?s.backgroundSoft:t.$status==="warning"?s.backgroundSoft:t.$status==="active"?s.backgroundSoft:s.backgroundSoft};
  color: ${t=>t.$status==="expired"?s.foreground:t.$status==="warning"?s.muted:t.$status==="active"?s.accent:s.muted};
  border: 1px solid ${t=>t.$status==="expired"?s.border:t.$status==="warning"?s.border:t.$status==="active"?s.accent:s.border};
  transition: background-color 0.15s ease;
`,J=d.div`
  overflow: hidden;
  padding-left: ${t=>t.$level*24+36}px;
  transition: opacity 0.15s ease;
  opacity: ${t=>t.$isExpanded?1:0};
  display: ${t=>t.$isExpanded?"block":"none"};
`,X=d.div`
  padding: ${n.spacing.xxl} ${n.spacing.xl};
  text-align: center;
  color: ${s.muted};
  font-family: 'Consolas';
  font-size: 12px;
  
  &::before {
    content: '█';
    font-size: 3em;
    display: block;
    margin-bottom: ${n.spacing.md};
    opacity: 0.5;
    font-family: 'Consolas';
  }
`,Q=()=>e.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[e.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",ry:"2"}),e.jsx("line",{x1:"9",y1:"3",x2:"9",y2:"21"}),e.jsx("line",{x1:"3",y1:"9",x2:"21",y2:"9"})]}),Z=()=>e.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[e.jsx("rect",{x:"3",y:"11",width:"18",height:"11",rx:"2",ry:"2"}),e.jsx("path",{d:"M7 11V7a5 5 0 0 1 10 0v4"})]}),ee=({locks:t,onLockClick:v})=>{const[S,p]=c.useState(new Set),h=c.useMemo(()=>{const o=new Map,a=[];t.forEach(l=>{const f=l.lock_name.split(".");if(f.length>=2){const m=f[0];o.has(m)||o.set(m,{name:m,locks:[]}),o.get(m).locks.push(l)}else a.push(l)});const i=Array.from(o.values()).sort((l,f)=>l.name.localeCompare(f.name));return a.length>0&&i.push({name:"Other",locks:a}),i},[t]),x=o=>{p(a=>{const i=new Set(a);return i.has(o)?i.delete(o):i.add(o),i})},y=o=>{if(!o)return{status:"unknown",label:"Unknown"};const a=new Date(o),i=new Date,l=a.getTime()-i.getTime(),f=l/(1e3*60);return l<0?{status:"expired",label:"Expired"}:f<5?{status:"warning",label:"Expiring Soon"}:{status:"active",label:"Active"}},L=(o,a)=>{if(o===0)return null;const i=[];for(let l=0;l<o-1;l++)i.push("│  ");return a?i.push("└── "):i.push("├── "),e.jsx(V,{$isLast:a,children:i.join("")})},C=(o,a,i)=>{const l=y(o.expires_at);return e.jsx(R,{children:e.jsxs(D,{$level:a,$nodeType:"lock",onClick:()=>v==null?void 0:v(o),children:[L(a,i),e.jsx(Z,{}),e.jsx(_,{children:o.lock_name}),e.jsxs(G,{children:[e.jsx(q,{$status:l.status,children:l.label}),o.acquired_by&&e.jsx(q,{$status:"default",children:o.acquired_by})]})]})},o.lock_name)},M=(o,a)=>{const i=S.has(o.name),f=h.findIndex(m=>m.name===o.name)===h.length-1;return e.jsxs(R,{children:[e.jsxs(D,{$level:a,$isExpanded:i,$nodeType:"group",onClick:()=>x(o.name),children:[L(a,f),e.jsx(Y,{$isExpanded:i,children:i?e.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",children:e.jsx("polyline",{points:"18 15 12 9 6 15"})}):e.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",children:e.jsx("polyline",{points:"9 18 15 12 9 6"})})}),e.jsx(Q,{}),e.jsx(_,{$isGroup:!0,children:o.name}),e.jsx(G,{children:e.jsxs(q,{$status:"default",children:[o.locks.length," ",o.locks.length===1?"lock":"locks"]})})]}),e.jsx(J,{$isExpanded:i,$level:a,children:i&&o.locks.map((m,F)=>{const r=F===o.locks.length-1;return C(m,a+1,r)})})]},o.name)};return h.length===0?e.jsx(O,{children:e.jsx(X,{children:"No active locks. Locks will appear here when catalog operations are running."})}):e.jsx(O,{children:h.map(o=>e.jsx("div",{children:M(o,0)},o.name))})},ne=d(K)`
  margin-bottom: ${n.spacing.xxl};
  font-family: 'Consolas';
`,B=d(P)`
  padding: ${n.spacing.lg};
  min-height: 100px;
  background: ${s.backgroundSoft};
  border: 1px solid ${s.border};
  border-left: 2px solid ${s.accent};
  border-radius: 2;
  transition: background-color 0.15s ease;
  position: relative;
  font-family: 'Consolas';
  font-size: 12px;
`,T=d.div`
  font-size: 11px;
  color: ${s.muted};
  margin-bottom: ${n.spacing.sm};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: 'Consolas';
  display: flex;
  align-items: center;
  gap: ${n.spacing.xs};
`,W=d.div`
  font-size: 18px;
  font-weight: 700;
  color: ${s.accent};
  font-family: 'Consolas';
`,le=()=>{const[t,v]=c.useState(!0),[S,p]=c.useState(null),[h,x]=c.useState(null),[y,L]=c.useState([]),[C,M]=c.useState({}),[o,a]=c.useState(!1),i=c.useRef(!0),l=c.useCallback(async()=>{if(!i.current)return;const r=Date.now(),j=300;try{v(!0),p(null),x(null);const[k,u]=await Promise.all([E.getLocks(),E.getMetrics()]),b=Date.now()-r,w=Math.max(0,j-b);await new Promise(z=>setTimeout(z,w)),i.current&&(L(k||[]),M(u||{}))}catch(k){i.current&&p(A(k))}finally{i.current&&v(!1)}},[]);c.useEffect(()=>(i.current=!0,l(),()=>{i.current=!1}),[l]);const f=c.useCallback(async r=>{if(confirm(`Are you sure you want to force unlock "${r}"? This may interrupt operations.`))try{if(!i.current)return;p(null),x(null),await E.unlock(r),i.current&&(x(`Lock "${r}" has been released successfully`),await l())}catch(j){i.current&&p(A(j))}},[l]),m=c.useCallback(async()=>{try{if(!i.current)return;p(null),x(null);const r=await E.cleanExpired();i.current&&(x(r.message||"Expired locks cleaned successfully"),await l())}catch(r){i.current&&p(A(r))}},[l]);if(c.useCallback(r=>{if(!r)return{status:"unknown",label:"Unknown"};const j=new Date(r),k=new Date,u=j.getTime()-k.getTime(),b=u/(1e3*60);return u<0?{status:"expired",label:"Expired"}:b<5?{status:"warning",label:"Expiring Soon"}:{status:"active",label:"Active"}},[]),c.useCallback(r=>{if(!r)return"N/A";const j=new Date(r),k=new Date,u=j.getTime()-k.getTime();if(u<0){const N=Math.abs(u);return`Expired ${Math.floor(N/(1e3*60))}m ago`}const b=Math.floor(u/(1e3*60)),w=Math.floor(b/60),z=Math.floor(w/24);return z>0?`${z}d ${w%24}h`:w>0?`${w}h ${b%60}m`:`${b}m`},[]),c.useCallback(r=>r?new Date(r).toLocaleString():"N/A",[]),t&&y.length===0)return e.jsx(H,{variant:"table"});const F=y.filter(r=>r.expires_at?new Date(r.expires_at)<new Date:!1);return e.jsxs(U,{children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:n.spacing.lg,paddingBottom:n.spacing.md,borderBottom:`2px solid ${s.accent}`},children:[e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:s.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:s.accent,marginRight:n.spacing.sm},children:g.blockFull}),"CATALOG LOCKS"]}),e.jsx(I,{label:"Catalog Locks Info",onClick:()=>a(!0),variant:"ghost"})]}),o&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>a(!1),children:e.jsxs("div",{style:{width:"90%",maxWidth:1e3,maxHeight:"90vh",overflowY:"auto"},onClick:r=>r.stopPropagation(),children:[e.jsx("style",{children:`
              div[style*="overflowY"]::-webkit-scrollbar {
                width: 0px;
                display: none;
              }
              div[style*="overflowY"] {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}),e.jsx($,{title:"CATALOG LOCKS PLAYBOOK",children:e.jsxs("div",{style:{padding:n.spacing.md,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:n.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:s.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[g.blockFull," OVERVIEW"]}),e.jsx("div",{style:{color:s.foreground,marginLeft:n.spacing.md,fontFamily:"Consolas",fontSize:11},children:"Catalog Locks are a critical mechanism to prevent race conditions and ensure data consistency during catalog operations. When multiple processes or instances attempt to modify the catalog simultaneously, locks prevent conflicts by allowing only one operation to proceed at a time. This ensures catalog integrity and prevents data corruption."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:s.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[g.blockFull," HOW LOCKS WORK"]}),e.jsxs("div",{style:{marginLeft:n.spacing.md},children:[e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:s.foreground,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Lock Acquisition"}),e.jsx("div",{style:{color:s.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:'When a catalog operation begins, the system attempts to acquire a lock with a unique name (e.g., "catalog_sync_postgresql"). The lock is stored in the database with an expiration time. If another process already holds an active lock, the operation will wait or retry based on configuration settings.'})]}),e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:s.foreground,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Lock Expiration"}),e.jsx("div",{style:{color:s.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Each lock has an expiration timestamp. If a process crashes or fails to release a lock, it will automatically expire after the timeout period (typically 5 minutes). Expired locks can be manually cleaned or are automatically removed by the system."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:s.foreground,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Lock Release"}),e.jsx("div",{style:{color:s.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"When an operation completes successfully, the lock is automatically released. This allows other waiting operations to proceed. If an operation fails, the lock should still be released to prevent blocking other processes."})]})]})]}),e.jsxs("div",{style:{marginBottom:n.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:s.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[g.blockFull," LOCK STATUSES"]}),e.jsxs("div",{style:{marginLeft:n.spacing.md},children:[e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("span",{style:{color:s.accent,fontWeight:600,fontFamily:"Consolas"},children:"Active"}),e.jsx("span",{style:{color:s.foreground,marginLeft:n.spacing.sm,fontSize:11,fontFamily:"Consolas"},children:"Lock is currently held and has not expired. The associated operation is either in progress or recently completed but the lock hasn't been released yet."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("span",{style:{color:s.muted,fontWeight:600,fontFamily:"Consolas"},children:"Expiring Soon"}),e.jsx("span",{style:{color:s.foreground,marginLeft:n.spacing.sm,fontSize:11,fontFamily:"Consolas"},children:"Lock will expire within 5 minutes. This may indicate a long-running operation or a process that hasn't properly released the lock. Monitor these locks closely."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("span",{style:{color:s.foreground,fontWeight:600,fontFamily:"Consolas"},children:"Expired"}),e.jsx("span",{style:{color:s.foreground,marginLeft:n.spacing.sm,fontSize:11,fontFamily:"Consolas"},children:"Lock has passed its expiration time. These locks should be cleaned to free up resources. Expired locks typically indicate a crashed process or an operation that failed to release properly."})]})]})]}),e.jsxs("div",{style:{marginBottom:n.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:s.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[g.blockFull," METRICS EXPLAINED"]}),e.jsxs("div",{style:{marginLeft:n.spacing.md},children:[e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:s.foreground,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Total Locks"}),e.jsx("div",{style:{color:s.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Total number of lock records in the system, including both active and expired locks. This gives you an overview of lock activity."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:s.accent,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Active Locks"}),e.jsx("div",{style:{color:s.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Number of locks that are currently active (not expired). These locks are actively preventing concurrent operations on the same catalog resources."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:s.foreground,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Expired Locks"}),e.jsx("div",{style:{color:s.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Number of locks that have passed their expiration time. These should be cleaned periodically to maintain system health. High numbers of expired locks may indicate process failures."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:s.accent,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Unique Hosts"}),e.jsx("div",{style:{color:s.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Number of distinct hostnames that have acquired locks. This helps identify how many different systems or instances are accessing the catalog."})]})]})]}),e.jsxs("div",{style:{marginBottom:n.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:s.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[g.blockFull," LOCK INFORMATION"]}),e.jsxs("div",{style:{marginLeft:n.spacing.md},children:[e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("span",{style:{color:s.accent,fontWeight:600,fontFamily:"Consolas"},children:"Lock Name"}),e.jsx("span",{style:{color:s.foreground,marginLeft:n.spacing.sm,fontSize:11,fontFamily:"Consolas"},children:'Unique identifier for the lock, typically indicating the operation type (e.g., "catalog_sync_postgresql")'})]}),e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("span",{style:{color:s.accent,fontWeight:600,fontFamily:"Consolas"},children:"Acquired By"}),e.jsx("span",{style:{color:s.foreground,marginLeft:n.spacing.sm,fontSize:11,fontFamily:"Consolas"},children:"Hostname or identifier of the system/process that acquired the lock"})]}),e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("span",{style:{color:s.accent,fontWeight:600,fontFamily:"Consolas"},children:"Acquired At"}),e.jsx("span",{style:{color:s.foreground,marginLeft:n.spacing.sm,fontSize:11,fontFamily:"Consolas"},children:"Timestamp when the lock was successfully acquired"})]}),e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("span",{style:{color:s.accent,fontWeight:600,fontFamily:"Consolas"},children:"Expires At"}),e.jsx("span",{style:{color:s.foreground,marginLeft:n.spacing.sm,fontSize:11,fontFamily:"Consolas"},children:"Timestamp when the lock will automatically expire if not released"})]}),e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("span",{style:{color:s.accent,fontWeight:600,fontFamily:"Consolas"},children:"Session ID"}),e.jsx("span",{style:{color:s.foreground,marginLeft:n.spacing.sm,fontSize:11,fontFamily:"Consolas"},children:"Unique session identifier for the process that holds the lock"})]})]})]}),e.jsxs("div",{style:{marginTop:n.spacing.md,padding:n.spacing.sm,background:s.backgroundSoft,borderRadius:2,border:`1px solid ${s.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:s.muted,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:[g.blockSemi," Best Practices"]}),e.jsxs("div",{style:{fontSize:11,color:s.foreground,fontFamily:"Consolas"},children:["• Monitor expired locks regularly and clean them to prevent resource buildup",e.jsx("br",{}),"• If a lock appears stuck, verify the process is still running before force-unlocking",e.jsx("br",{}),"• High numbers of active locks may indicate contention - review operation frequency",e.jsx("br",{}),"• Use appropriate lock timeouts based on expected operation duration",e.jsx("br",{}),"• Force-unlock only when absolutely necessary, as it may interrupt active operations",e.jsx("br",{}),"• Review lock patterns to identify potential optimization opportunities"]})]}),e.jsx("div",{style:{marginTop:n.spacing.md,textAlign:"right"},children:e.jsx(I,{label:"Close",onClick:()=>a(!1),variant:"ghost"})})]})})]})}),S&&e.jsx("div",{style:{marginBottom:n.spacing.md},children:e.jsx($,{title:"ERROR",children:e.jsx("div",{style:{padding:n.spacing.sm,color:s.foreground,fontSize:12,fontFamily:"Consolas",backgroundColor:s.backgroundSoft,borderRadius:2},children:S})})}),h&&e.jsx($,{title:"SUCCESS",children:e.jsxs("div",{style:{color:s.accent,fontFamily:"Consolas",fontSize:12,padding:`${n.spacing.xs} 0`},children:[g.blockFull," ",h]})}),e.jsx($,{title:"METRICS",children:e.jsxs(ne,{$columns:"repeat(auto-fit, minmax(200px, 1fr))",children:[e.jsxs(B,{children:[e.jsxs(T,{children:[e.jsx("span",{children:g.blockFull}),"Total Locks"]}),e.jsx(W,{children:C.total_locks||0})]}),e.jsxs(B,{children:[e.jsxs(T,{children:[e.jsx("span",{children:g.blockFull}),"Active Locks"]}),e.jsx(W,{children:C.active_locks||0})]}),e.jsxs(B,{children:[e.jsxs(T,{children:[e.jsx("span",{children:g.blockFull}),"Expired Locks"]}),e.jsx(W,{children:C.expired_locks||0})]}),e.jsxs(B,{children:[e.jsxs(T,{children:[e.jsx("span",{children:g.blockFull}),"Unique Hosts"]}),e.jsx(W,{children:C.unique_hosts||0})]})]})}),e.jsx($,{title:"ACTIONS",children:e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:n.spacing.md,background:s.backgroundSoft,border:`1px solid ${s.border}`,borderRadius:2,fontFamily:"Consolas",fontSize:12},children:[e.jsxs("div",{style:{fontSize:11,color:s.muted,fontFamily:"Consolas"},children:[g.dot," Locks are used to prevent race conditions during catalog operations. Expired locks are automatically cleaned."]}),e.jsx(I,{label:`Clean Expired (${F.length})`,onClick:m,disabled:F.length===0,variant:"ghost"})]})}),e.jsxs($,{title:"LOCKS",children:[e.jsx("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:n.spacing.md,background:s.backgroundSoft,border:`1px solid ${s.border}`,borderRadius:2,marginBottom:n.spacing.md,fontFamily:"Consolas",fontSize:12},children:e.jsxs("div",{style:{fontSize:11,color:s.muted,fontFamily:"Consolas"},children:["Total: ",y.length," lock$",y.length!==1?"s":""]})}),e.jsx(ee,{locks:y,onLockClick:r=>f(r.lock_name)})]})]})};export{le as default};
