import{m as J,f,b as n,t,r as a,j as e,e as C,c as E,C as P,M as _,y as G,z as H,A as Y,F as A,L as D,I as U}from"./index-f6ac47b8.js";import{e as R}from"./errorHandler-5ea9ae85.js";import{A as L}from"./AsciiPanel-5614714e.js";import{A as v}from"./AsciiButton-4907e65e.js";import{S as q}from"./SkeletonLoader-792007e7.js";const Q=J`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,O=f.div`
  font-family: 'Consolas';
  font-size: 12px;
  background: ${n.background};
  border: 1px solid ${n.border};
  border-radius: 2;
  padding: ${t.spacing.md};
  max-height: 800px;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  
  &::-webkit-scrollbar {
    width: 0px;
    display: none;
  }
  
  &::-webkit-scrollbar-track {
    background: ${n.backgroundSoft};
    border-radius: 2;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${n.border};
    border-radius: 2;
    transition: background 0.15s ease;
  }
  
  -ms-overflow-style: none;
  scrollbar-width: none;
`,X=f.div`
  user-select: none;
  margin: 4px 0;
`,Z=f.div`
  display: flex;
  align-items: center;
  padding: ${t.spacing.sm};
  border-radius: 2;
  transition: background-color 0.15s ease, border-color 0.15s ease;
  cursor: pointer;
  font-family: 'Consolas';
  font-size: 12px;
  background: ${l=>l.$isExpanded?n.backgroundSoft:"transparent"};
`,ee=f.div`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: ${t.spacing.sm};
  border-radius: 2;
  background: ${l=>l.$isExpanded?n.accent:n.backgroundSoft};
  color: ${l=>l.$isExpanded?n.background:n.accent};
  font-size: 10px;
  font-weight: bold;
  font-family: 'Consolas';
  transition: background-color 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
`,ne=f.span`
  font-weight: 500;
  font-family: 'Consolas';
  font-size: 13px;
  color: ${n.accent};
  flex: 1;
  display: flex;
  align-items: center;
  gap: ${t.spacing.sm};
`,oe=f.span`
  background: ${n.backgroundSoft};
  color: ${n.foreground};
  padding: ${t.spacing.xs} ${t.spacing.sm};
  border-radius: 2;
  font-size: 11px;
  font-weight: 500;
  font-family: 'Consolas';
  border: 1px solid ${n.border};
  transition: border-color 0.15s ease, color 0.15s ease;
`,te=f.div`
  max-height: ${l=>l.$isExpanded?"10000px":"0"};
  overflow: hidden;
  transition: max-height 0.3s ease-out;
  margin-left: ${t.spacing.lg};
`,re=f.div`
  padding: ${t.spacing.sm};
  padding-left: ${l=>(l.$level||0)*24+36}px;
  margin: 2px 0;
  border-radius: 2;
  background: ${l=>l.$isSelected?n.backgroundSoft:"transparent"};
  border: 1px solid ${l=>l.$isSelected?n.accent:n.border};
  transition: background-color 0.15s ease, border-color 0.15s ease;
  cursor: pointer;
  font-family: 'Consolas';
  font-size: 12px;
`;f.div`
  font-size: 3em;
  margin-bottom: ${t.spacing.md};
  animation: ${Q} 0.5s ease-out;
  font-family: 'Consolas';
  opacity: 0.5;
`;f.div`
  font-size: 1.1em;
  font-family: 'Consolas';
  font-weight: 600;
  margin-bottom: ${t.spacing.sm};
`;f.div`
  font-size: 0.9em;
  font-family: 'Consolas';
  opacity: 0.7;
`;const se=({configs:l,onConfigClick:w})=>{const[F,$]=a.useState(new Set),m=a.useMemo(()=>{const r=new Map,i=[];return l.forEach(s=>{const c=s.key.split(".");if(c.length>1){const x=c[0];r.has(x)||r.set(x,{name:x,configs:[]}),r.get(x).configs.push(s)}else i.push(s)}),{categories:Array.from(r.values()).sort((s,c)=>s.name.localeCompare(c.name)),uncategorized:i}},[l]),k=r=>{$(i=>{const d=new Set(i);return d.has(r)?d.delete(r):d.add(r),d})},h=(r,i)=>{if(r===0)return null;const d=[];for(let s=0;s<r-1;s++)d.push("│  ");return d.push(i?"└─ ":"├─ "),e.jsx("span",{style:{color:n.muted,fontFamily:"Consolas",fontSize:12},children:d.join("")})},b=r=>r?new Date(r).toLocaleString():"N/A",u=r=>r?r.length>60?r.substring(0,60)+"...":r:"(empty)",y=(r,i,d)=>{const s=F.has(r.name);return e.jsxs(X,{children:[e.jsxs(Z,{$isExpanded:s,onClick:()=>k(r.name),children:[h(i,d),e.jsx(ee,{$isExpanded:s,children:s?C.arrowDown:C.arrowRight}),e.jsx("span",{style:{marginRight:t.spacing.sm,color:n.accent,fontFamily:"Consolas"},children:C.blockFull}),e.jsxs(ne,{children:[r.name,e.jsx(oe,{children:r.configs.length})]})]}),e.jsx(te,{$isExpanded:s,children:s&&r.configs.sort((c,x)=>c.key.localeCompare(x.key)).map((c,x)=>z(c,r.name,i+1,x===r.configs.length-1))})]},r.name)},z=(r,i,d,s)=>e.jsxs(re,{$level:d,onClick:()=>w==null?void 0:w(r),children:[h(d,s),e.jsx("span",{style:{marginRight:t.spacing.sm,color:n.muted,fontFamily:"Consolas"},children:C.blockFull}),e.jsx("span",{style:{marginRight:t.spacing.sm,fontWeight:500,color:n.foreground,fontFamily:"Consolas"},children:r.key}),e.jsx("span",{style:{padding:`${t.spacing.xs} ${t.spacing.sm}`,borderRadius:2,fontSize:11,fontFamily:"Consolas",backgroundColor:n.backgroundSoft,color:n.muted,border:`1px solid ${n.border}`,marginRight:t.spacing.xs},children:u(r.value)}),e.jsx("span",{style:{marginLeft:"auto",color:n.muted,fontSize:11,fontFamily:"Consolas"},children:b(r.updated_at)})]},r.key);return m.categories.length===0&&m.uncategorized.length===0?e.jsx(O,{children:e.jsxs("div",{style:{padding:`${t.spacing.xl} ${t.spacing.lg}`,textAlign:"center",color:n.muted,fontFamily:"Consolas"},children:[e.jsx("div",{style:{fontSize:48,marginBottom:t.spacing.md,fontFamily:"Consolas",opacity:.5},children:C.blockFull}),e.jsx("div",{style:{fontSize:13,fontFamily:"Consolas",fontWeight:600,marginBottom:t.spacing.sm,color:n.foreground},children:"No configuration available"}),e.jsx("div",{style:{fontSize:12,fontFamily:"Consolas",opacity:.7,color:n.muted},children:"Configuration entries will appear here once added."})]})}):e.jsxs(O,{children:[m.uncategorized.map((r,i)=>z(r,"",0,i===m.uncategorized.length-1&&m.categories.length===0)),m.categories.map((r,i)=>y(r,0,i===m.categories.length-1))]})},ae=f.textarea`
  width: 100%;
  padding: ${t.spacing.sm};
  border: 1px solid ${n.border};
  border-radius: 2;
  font-family: 'Consolas';
  font-size: 12px;
  resize: vertical;
  min-height: 60px;
  background: ${n.background};
  color: ${n.foreground};
  transition: border-color 0.15s ease;
  outline: none;

  &:focus {
    border-color: ${n.accent};
    outline: 2px solid ${n.accent};
    outline-offset: 2px;
  }

  &:disabled {
    background: ${n.backgroundSoft};
    cursor: not-allowed;
  }
`;f.pre`
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'Consolas';
  font-size: 11px;
  background: ${n.backgroundSoft};
  color: ${n.foreground};
  padding: ${t.spacing.sm};
  border-radius: 2;
  border: 1px solid ${n.border};
  max-height: 400px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 0px;
    display: none;
  }
  
  -ms-overflow-style: none;
  scrollbar-width: none;
`;const ue=()=>{const[l,w]=a.useState([]),[F,$]=a.useState(!0),[m,k]=a.useState(null),[h,b]=a.useState(null),[u,y]=a.useState(null),[z,r]=a.useState(new Set),[i,d]=a.useState(null),s=a.useRef(!0),c=a.useCallback(async()=>{if(!s.current)return;const o=Date.now(),g=300;try{$(!0),k(null);const p=await E.getConfigs(),M=Date.now()-o,K=Math.max(0,g-M);await new Promise(V=>setTimeout(V,K)),s.current&&w(p||[])}catch(p){s.current&&k(R(p))}finally{s.current&&$(!1)}},[]);a.useEffect(()=>(s.current=!0,c(),()=>{s.current=!1}),[c]);const x=a.useCallback(o=>{b(o.key),y({...o})},[]),T=a.useCallback(()=>{b(null),y(null)},[]),I=a.useCallback(async()=>{if(u)try{if(!s.current)return;await E.updateConfig(u),s.current&&(await c(),b(null),y(null))}catch(o){s.current&&k(R(o))}},[u,c]),N=a.useCallback(()=>{const o={key:"",value:"",description:null,updated_at:new Date().toISOString()};b("new"),y(o)},[]),B=a.useCallback(async()=>{if(u)try{if(!s.current)return;await E.createConfig(u),s.current&&(await c(),b(null),y(null))}catch(o){s.current&&k(R(o))}},[u,c]),W=a.useCallback(o=>new Date(o).toLocaleString(),[]),j=a.useCallback(o=>{if(!o||o.trim().length===0)return!1;const g=o.trim();if(g.startsWith("{")&&g.endsWith("}")||g.startsWith("[")&&g.endsWith("]"))try{return JSON.parse(o),!0}catch{return!1}return!1},[]),S=a.useCallback(o=>!!(o&&o.length>100),[]);return a.useCallback(o=>j(o)||S(o),[j,S]),a.useCallback(o=>{if(j(o))try{return JSON.stringify(JSON.parse(o),null,2)}catch{return o}return o},[j]),a.useCallback(o=>{if(j(o))try{const g=JSON.parse(o),p=Object.keys(g);return p.length>0?`{ ${p.slice(0,3).join(", ")}${p.length>3?"...":""} }`:"{ }"}catch{return o.substring(0,50)+"..."}return S(o)?o.substring(0,50)+"...":o},[j,S]),a.useCallback(o=>{r(g=>{const p=new Set(g);return p.has(o)?p.delete(o):p.add(o),p})},[]),F&&l.length===0?e.jsx(q,{variant:"list",panels:5}):e.jsx(P,{children:e.jsxs("div",{style:{width:"100%",minHeight:"100vh",padding:t.spacing.lg,fontFamily:"Consolas",fontSize:12,color:n.foreground,backgroundColor:n.background,display:"flex",flexDirection:"column",gap:t.spacing.lg},children:[e.jsx("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:t.spacing.lg,paddingBottom:t.spacing.md,borderBottom:`2px solid ${n.accent}`},children:e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:n.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:n.accent,marginRight:t.spacing.sm},children:C.blockFull}),"CONFIG"]})}),m&&e.jsx("div",{style:{marginBottom:t.spacing.lg},children:e.jsx(L,{title:"ERROR",children:e.jsx("div",{style:{padding:t.spacing.md,color:n.foreground,fontSize:12,fontFamily:"Consolas",background:n.backgroundSoft,borderRadius:2,border:`2px solid ${n.foreground}`},children:m})})}),e.jsx("div",{style:{display:"flex",justifyContent:"flex-start",alignItems:"center",marginBottom:t.spacing.md,fontFamily:"Consolas",fontSize:12},children:e.jsx(v,{label:`${C.blockFull} Add New Configuration`,onClick:N,variant:"primary"})}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:i?"1fr 400px":"1fr",gap:t.spacing.lg},children:[e.jsx(se,{configs:l,onConfigClick:o=>d(g=>(g==null?void 0:g.key)===o.key?null:o)}),i&&e.jsx(L,{title:"CONFIGURATION DETAILS",children:e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:t.spacing.md,fontFamily:"Consolas",fontSize:12},children:[e.jsxs("div",{children:[e.jsx("strong",{style:{color:n.muted,fontSize:11,fontFamily:"Consolas",fontWeight:600},children:"Key:"}),e.jsx("div",{style:{color:n.foreground,fontFamily:"Consolas",fontSize:12,marginTop:t.spacing.xs,padding:t.spacing.sm,background:n.backgroundSoft,borderRadius:2,border:`1px solid ${n.border}`},children:i.key})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:n.muted,fontSize:11,fontFamily:"Consolas",fontWeight:600},children:"Value:"}),e.jsx("div",{style:{color:n.foreground,fontSize:11,fontFamily:"Consolas",marginTop:t.spacing.xs,padding:t.spacing.sm,background:n.background,borderRadius:2,border:`1px solid ${n.border}`,whiteSpace:"pre-wrap",wordBreak:"break-word",maxHeight:"300px",overflowY:"auto"},children:i.value||"(empty)"})]}),i.description&&e.jsxs("div",{children:[e.jsx("strong",{style:{color:n.muted,fontSize:11,fontFamily:"Consolas",fontWeight:600},children:"Description:"}),e.jsx("div",{style:{color:n.foreground,fontSize:12,marginTop:t.spacing.xs,fontFamily:"Consolas"},children:i.description})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:n.muted,fontSize:11,fontFamily:"Consolas",fontWeight:600},children:"Last Updated:"}),e.jsx("div",{style:{color:n.foreground,fontSize:12,marginTop:t.spacing.xs,fontFamily:"Consolas"},children:W(i.updated_at)})]}),e.jsx("div",{style:{marginTop:t.spacing.md,paddingTop:t.spacing.md,borderTop:`1px solid ${n.border}`},children:e.jsx(v,{label:"Edit Configuration",onClick:()=>{x(i),d(null)},variant:"primary"})})]})})]}),h&&u&&e.jsx(_,{$isOpen:!!h,onClick:T,children:e.jsxs(G,{onClick:o=>o.stopPropagation(),children:[e.jsxs(H,{children:[e.jsx(Y,{style:{fontFamily:"Consolas",fontSize:14},children:h==="new"?"Create Configuration":"Edit Configuration"}),e.jsx("button",{onClick:T,"aria-label":"Close modal",style:{background:"none",border:"none",fontSize:18,fontFamily:"Consolas",cursor:"pointer",color:n.muted,padding:0,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",outline:"none"},onFocus:o=>{o.currentTarget.style.color=n.foreground,o.currentTarget.style.outline=`2px solid ${n.accent}`,o.currentTarget.style.outlineOffset="2px"},onBlur:o=>{o.currentTarget.style.color=n.muted,o.currentTarget.style.outline="none"},onMouseDown:o=>{o.currentTarget.style.outline="none"},children:"×"})]}),e.jsxs("div",{style:{padding:t.spacing.md,fontFamily:"Consolas",fontSize:12},children:[e.jsxs(A,{children:[e.jsxs(D,{htmlFor:"config-key",children:["Key ",h!=="new"&&"(cannot be changed)"]}),e.jsx(U,{id:"config-key",value:u.key,onChange:o=>y({...u,key:o.target.value}),placeholder:"Enter key...",disabled:h!=="new"})]}),e.jsxs(A,{children:[e.jsx(D,{htmlFor:"config-value",children:"Value"}),e.jsx(ae,{id:"config-value",value:u.value,onChange:o=>y({...u,value:o.target.value}),placeholder:"Enter value..."})]}),e.jsxs("div",{style:{display:"flex",gap:t.spacing.sm,justifyContent:"flex-end",marginTop:t.spacing.lg,paddingTop:t.spacing.md,borderTop:`1px solid ${n.border}`},children:[e.jsx(v,{label:"Cancel",onClick:T,variant:"ghost"}),e.jsx(v,{label:h==="new"?"Create":"Save",onClick:h==="new"?B:I,variant:"primary"})]})]})]})})]})})};export{ue as default};
