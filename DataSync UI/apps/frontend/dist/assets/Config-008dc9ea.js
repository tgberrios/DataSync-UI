import{m as B,f as l,t as r,r as i,j as e,b as n,c as A,e as M,I as P}from"./index-75d7470b.js";import{e as I}from"./errorHandler-5ea9ae85.js";import{A as V}from"./AsciiPanel-9f053981.js";import{A as y}from"./AsciiButton-446d8430.js";import{S as re}from"./SkeletonLoader-530eacc4.js";const E=B`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,oe=B`
  from {
    opacity: 0;
    max-height: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    max-height: 10000px;
    transform: translateY(0);
  }
`,te=B`
  from {
    opacity: 1;
    max-height: 10000px;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    max-height: 0;
    transform: translateY(-10px);
  }
`,U=l.div`
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  font-size: 0.95em;
  background: ${r.colors.background.main};
  border: 1px solid ${r.colors.border.light};
  border-radius: ${r.borderRadius.lg};
  padding: ${r.spacing.lg};
  max-height: 800px;
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: ${r.shadows.md};
  position: relative;
  animation: ${E} 0.3s ease-out;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${r.colors.background.secondary};
    border-radius: ${r.borderRadius.sm};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${r.colors.border.medium};
    border-radius: ${r.borderRadius.sm};
    transition: background ${r.transitions.normal};
    
    &:hover {
      background: ${r.colors.primary.main};
    }
  }
`,ne=l.div`
  user-select: none;
  margin: 4px 0;
  animation: ${E} 0.3s ease-out;
  animation-fill-mode: both;
  
  &:nth-child(1) { animation-delay: 0.05s; }
  &:nth-child(2) { animation-delay: 0.1s; }
  &:nth-child(3) { animation-delay: 0.15s; }
  &:nth-child(4) { animation-delay: 0.2s; }
  &:nth-child(5) { animation-delay: 0.25s; }
`,ae=l.div`
  display: flex;
  align-items: center;
  padding: ${a=>a.$level===0?"12px 8px":"10px 8px"};
  padding-left: ${a=>a.$level*24+8}px;
  border-radius: ${r.borderRadius.md};
  transition: all ${r.transitions.normal};
  cursor: pointer;
  position: relative;
  margin: 2px 0;
  
  ${a=>a.$nodeType==="category"?`
        background: linear-gradient(135deg, ${r.colors.primary.light}08 0%, ${r.colors.primary.main}05 100%);
        border-left: 3px solid ${r.colors.primary.main};
        font-weight: 600;
      `:`
      border-left: 1px solid ${r.colors.border.light};
    `}
  
  &:hover {
    background: ${a=>a.$nodeType==="category"?`linear-gradient(135deg, ${r.colors.primary.light}15 0%, ${r.colors.primary.main}10 100%)`:r.colors.background.secondary};
    transform: translateX(2px);
    box-shadow: ${r.shadows.sm};
  }
`,se=l.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 8px;
  border-radius: ${r.borderRadius.sm};
  background: ${a=>a.$isExpanded?`linear-gradient(135deg, ${r.colors.primary.main} 0%, ${r.colors.primary.light} 100%)`:r.colors.background.secondary};
  color: ${a=>a.$isExpanded?r.colors.text.white:r.colors.primary.main};
  font-size: 0.7em;
  font-weight: bold;
  transition: all ${r.transitions.normal};
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: ${r.shadows.sm};
  }
  
  svg {
    transition: transform ${r.transitions.normal};
    transform: ${a=>a.$isExpanded?"rotate(0deg)":"rotate(-90deg)"};
  }
`,ie=l.span`
  font-weight: ${a=>a.$isCategory?"700":"500"};
  font-size: ${a=>a.$isCategory?"1.05em":"0.92em"};
  color: ${a=>a.$isCategory?r.colors.primary.main:r.colors.text.primary};
  margin-right: 12px;
  transition: color ${r.transitions.normal};
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`,le=l.span`
  padding: 4px 10px;
  border-radius: ${r.borderRadius.md};
  font-size: 0.8em;
  font-weight: 500;
  background: linear-gradient(135deg, ${r.colors.background.secondary} 0%, ${r.colors.background.tertiary} 100%);
  color: ${r.colors.text.secondary};
  border: 1px solid ${r.colors.border.light};
  margin-left: auto;
  transition: all ${r.transitions.normal};
  
  &:hover {
    background: linear-gradient(135deg, ${r.colors.primary.light}10 0%, ${r.colors.primary.main}08 100%);
    border-color: ${r.colors.primary.main};
    color: ${r.colors.primary.main};
    transform: translateY(-1px);
  }
`,de=l.div`
  overflow: hidden;
  animation: ${a=>a.$isExpanded?oe:te} 0.3s ease-out;
  padding-left: ${a=>a.$level*24+36}px;
`,ce=l.span`
  color: ${r.colors.text.secondary};
  font-family: "Consolas, 'Source Code Pro', monospace";
  margin-right: 4px;
  font-size: 0.9em;
`,pe=l.div`
  padding: 12px 8px;
  padding-left: ${a=>a.$level*24+36}px;
  margin: 2px 0;
  border-radius: ${r.borderRadius.md};
  background: ${a=>a.$isSelected?r.colors.primary.light+"15":r.colors.background.main};
  border: 1px solid ${r.colors.border.light};
  transition: all ${r.transitions.normal};
  cursor: pointer;
  animation: ${E} 0.3s ease-out;
  
  &:hover {
    background: ${r.colors.background.secondary};
    border-color: ${r.colors.primary.main};
    transform: translateX(4px);
    box-shadow: ${r.shadows.sm};
  }
`,me=l.span`
  font-weight: 600;
  color: ${r.colors.text.primary};
  font-family: "Consolas, 'Source Code Pro', monospace";
  font-size: 0.9em;
  margin-right: 12px;
`,xe=l.span`
  color: ${r.colors.text.secondary};
  font-size: 0.85em;
  font-family: "Consolas, 'Source Code Pro', monospace";
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
  user-select: text;
  cursor: text;
  
  &:hover {
    white-space: normal;
    word-break: break-word;
    max-width: 100%;
  }
`,ge=l.div`
  display: flex;
  gap: 12px;
  margin-top: 4px;
  font-size: 0.75em;
  color: ${r.colors.text.secondary};
`,he=l.div`
  padding: 60px 40px;
  text-align: center;
  color: ${r.colors.text.secondary};
  animation: ${E} 0.5s ease-out;
`,ue=l.div`
  font-size: 3em;
  margin-bottom: ${r.spacing.md};
  animation: ${E} 0.5s ease-out;
  font-family: "Consolas, 'Source Code Pro', monospace";
  opacity: 0.5;
`,fe=l.div`
  font-size: 1.1em;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  font-weight: 500;
  margin-bottom: ${r.spacing.sm};
`,ye=l.div`
  font-size: 0.9em;
  opacity: 0.7;
`,be=({configs:a,onConfigClick:v})=>{const[F,T]=i.useState(new Set),f=i.useMemo(()=>{const t=new Map,s=[];return a.forEach(p=>{const u=p.key.split(".");if(u.length>1){const d=u[0];t.has(d)||t.set(d,{name:d,configs:[]}),t.get(d).configs.push(p)}else s.push(p)}),{categories:Array.from(t.values()).sort((p,u)=>p.name.localeCompare(u.name)),uncategorized:s}},[a]),j=t=>{T(s=>{const g=new Set(s);return g.has(t)?g.delete(t):g.add(t),g})},$=(t,s)=>{if(t===0)return null;const g=[];for(let p=0;p<t-1;p++)g.push("│  ");return g.push(s?"└─ ":"├─ "),e.jsx(ce,{children:g.join("")})},k=t=>t?new Date(t).toLocaleString():"N/A",c=t=>t?t.length>60?t.substring(0,60)+"...":t:"(empty)",h=(t,s,g)=>{const p=F.has(t.name);return e.jsxs(ne,{children:[e.jsxs(ae,{$level:s,$isExpanded:p,$nodeType:"category",onClick:()=>j(t.name),children:[$(s,g),e.jsx(se,{$isExpanded:p,children:e.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",children:e.jsx("polyline",{points:"9 18 15 12 9 6"})})}),e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:r.colors.primary.main,strokeWidth:"2",style:{marginRight:"8px"},children:[e.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2"}),e.jsx("path",{d:"M3 9h18M9 3v18"})]}),e.jsx(ie,{$isCategory:!0,children:t.name}),e.jsx(le,{children:t.configs.length})]}),e.jsx(de,{$isExpanded:p,$level:s,children:p&&t.configs.sort((u,d)=>u.key.localeCompare(d.key)).map((u,d)=>S(u,s+1,d===t.configs.length-1))})]},t.name)},S=(t,s,g)=>e.jsxs(pe,{$level:s,onClick:()=>v==null?void 0:v(t),children:[$(s,g),e.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:r.colors.text.secondary,strokeWidth:"2",style:{marginRight:"8px",flexShrink:0},children:[e.jsx("path",{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),e.jsx("polyline",{points:"14 2 14 8 20 8"}),e.jsx("line",{x1:"16",y1:"13",x2:"8",y2:"13"}),e.jsx("line",{x1:"16",y1:"17",x2:"8",y2:"17"}),e.jsx("polyline",{points:"10 9 9 9 8 9"})]}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"},children:[e.jsx(me,{children:t.key}),e.jsx(xe,{onClick:p=>p.stopPropagation(),children:c(t.value)})]}),e.jsxs(ge,{children:[e.jsxs("span",{children:["Updated: ",k(t.updated_at)]}),t.description&&e.jsxs("span",{children:["• ",t.description]})]})]})]},t.key);return f.categories.length===0&&f.uncategorized.length===0?e.jsx(U,{children:e.jsxs(he,{children:[e.jsx(ue,{children:"⚙️"}),e.jsx(fe,{children:"No configuration available"}),e.jsx(ye,{children:"Configuration entries will appear here once added."})]})}):e.jsxs(U,{children:[f.uncategorized.map((t,s)=>S(t,0,s===f.uncategorized.length-1&&f.categories.length===0)),f.categories.map((t,s)=>h(t,0,s===f.categories.length-1))]})},$e=l.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: ${r.spacing.lg};
  background: ${r.colors.background.main};
  box-shadow: ${r.shadows.md};
  border-radius: ${r.borderRadius.md};
  overflow: hidden;
  animation: slideUp 0.25s ease-out;
  animation-delay: 0.1s;
  animation-fill-mode: both;
`,z=l.th`
  padding: ${r.spacing.sm};
  text-align: left;
  border-bottom: 2px solid ${n.border};
  background: ${n.backgroundSoft};
  font-weight: bold;
  font-family: "Consolas";
  font-size: 13px;
  color: ${n.accent};
  position: sticky;
  top: 0;
  z-index: 10;
`,b=l.td`
  padding: ${r.spacing.sm};
  border-bottom: 1px solid ${n.border};
  font-family: "Consolas";
  font-size: 12px;
  transition: all ${r.transitions.normal};
`,W=l.tr`
  transition: all ${r.transitions.normal};
  
  &:hover {
    background: linear-gradient(90deg, ${r.colors.background.main} 0%, ${r.colors.background.tertiary} 100%);
    transform: scale(1.001);
    box-shadow: ${r.shadows.sm};
    
    ${b} {
      border-bottom-color: rgba(10, 25, 41, 0.1);
    }
  }
`,Y=l.textarea`
  width: 100%;
  padding: 10px;
  border: 1px solid ${n.border};
  border-radius: 2px;
  font-family: "Consolas";
  font-size: 12px;
  resize: vertical;
  min-height: 60px;
  background: ${n.background};
  color: ${n.foreground};
  transition: all ${r.transitions.normal};

  &:hover:not(:disabled) {
    border-color: ${n.accent};
  }

  &:focus {
    outline: none;
    border-color: ${n.accent};
    box-shadow: 0 0 0 2px ${n.accent}30;
  }

  &:disabled {
    background: ${n.backgroundSoft};
    cursor: not-allowed;
  }
`,K=l.td`
  padding: ${r.spacing.sm};
  border-bottom: 1px solid ${n.border};
  text-align: right;
  font-family: "Consolas";
  font-size: 12px;
`,ke=l.div`
  position: relative;
`,je=l.div`
  font-family: "Consolas";
  font-size: 11px;
  color: ${n.muted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  padding-right: 30px;
`,Ce=l.pre`
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: "Consolas";
  font-size: 11px;
  background: ${n.backgroundSoft};
  color: ${n.foreground};
  padding: ${r.spacing.sm};
  border-radius: 2px;
  border: 1px solid ${n.border};
  max-height: 400px;
  overflow-y: auto;
`,Te=()=>{const[a,v]=i.useState([]),[F,T]=i.useState(!0),[f,j]=i.useState(null),[$,k]=i.useState(null),[c,h]=i.useState(null),[S,t]=i.useState(new Set),[s,g]=i.useState(null),[p,u]=i.useState("tree"),d=i.useRef(!0),C=i.useCallback(async()=>{if(!d.current)return;const o=Date.now(),m=300;try{T(!0),j(null);const x=await A.getConfigs(),Q=Date.now()-o,Z=Math.max(0,m-Q);await new Promise(ee=>setTimeout(ee,Z)),d.current&&v(x||[])}catch(x){d.current&&j(I(x))}finally{d.current&&T(!1)}},[]);i.useEffect(()=>(d.current=!0,C(),()=>{d.current=!1}),[C]);const O=i.useCallback(o=>{k(o.key),h({...o})},[]),L=i.useCallback(()=>{k(null),h(null)},[]),J=i.useCallback(async()=>{if(c)try{if(!d.current)return;await A.updateConfig(c),d.current&&(await C(),k(null),h(null))}catch(o){d.current&&j(I(o))}},[c,C]),_=i.useCallback(()=>{const o={key:"",value:"",description:null,updated_at:new Date().toISOString()};k("new"),h(o)},[]),G=i.useCallback(async()=>{if(c)try{if(!d.current)return;await A.createConfig(c),d.current&&(await C(),k(null),h(null))}catch(o){d.current&&j(I(o))}},[c,C]),N=i.useCallback(o=>new Date(o).toLocaleString(),[]),w=i.useCallback(o=>{if(!o||o.trim().length===0)return!1;const m=o.trim();if(m.startsWith("{")&&m.endsWith("}")||m.startsWith("[")&&m.endsWith("]"))try{return JSON.parse(o),!0}catch{return!1}return!1},[]),R=i.useCallback(o=>!!(o&&o.length>100),[]),D=i.useCallback(o=>w(o)||R(o),[w,R]),H=i.useCallback(o=>{if(w(o))try{return JSON.stringify(JSON.parse(o),null,2)}catch{return o}return o},[w]),X=i.useCallback(o=>{if(w(o))try{const m=JSON.parse(o),x=Object.keys(m);return x.length>0?`{ ${x.slice(0,3).join(", ")}${x.length>3?"...":""} }`:"{ }"}catch{return o.substring(0,50)+"..."}return R(o)?o.substring(0,50)+"...":o},[w,R]),q=i.useCallback(o=>{t(m=>{const x=new Set(m);return x.has(o)?x.delete(o):x.add(o),x})},[]);return F&&a.length===0?e.jsx(re,{variant:"list",panels:5}):e.jsxs("div",{style:{width:"100%",minHeight:"100vh",padding:"20px",fontFamily:"Consolas",fontSize:12,color:n.foreground,backgroundColor:n.background,display:"flex",flexDirection:"column",gap:20},children:[e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:"0 0 20px 0",color:n.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:n.accent,marginRight:8},children:M.blockFull}),"CONFIG"]}),f&&e.jsx("div",{style:{marginBottom:20},children:e.jsx(V,{title:"ERROR",children:e.jsx("div",{style:{padding:"12px",color:n.danger,fontSize:12,fontFamily:"Consolas"},children:f})})}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:r.spacing.md,fontFamily:"Consolas",fontSize:12},children:[e.jsx(y,{label:`${M.blockFull} Add New Configuration`,onClick:_,variant:"primary"}),e.jsxs("div",{style:{display:"flex",gap:r.spacing.sm},children:[e.jsx(y,{label:"Tree View",onClick:()=>u("tree"),variant:p==="tree"?"primary":"ghost"}),e.jsx(y,{label:"Table View",onClick:()=>u("table"),variant:p==="table"?"primary":"ghost"})]})]}),p==="tree"?e.jsxs("div",{style:{display:"grid",gridTemplateColumns:s?"1fr 400px":"1fr",gap:r.spacing.lg},children:[e.jsx(be,{configs:a,onConfigClick:o=>g(m=>(m==null?void 0:m.key)===o.key?null:o)}),s&&e.jsx(V,{title:"CONFIGURATION DETAILS",children:e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:r.spacing.md,fontFamily:"Consolas",fontSize:12},children:[e.jsxs("div",{children:[e.jsx("strong",{style:{color:n.muted,fontSize:11,fontFamily:"Consolas"},children:"Key:"}),e.jsx("div",{style:{color:n.foreground,fontFamily:"Consolas",fontSize:12,marginTop:"4px",padding:r.spacing.sm,background:n.backgroundSoft,borderRadius:2,border:`1px solid ${n.border}`},children:s.key})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:n.muted,fontSize:11,fontFamily:"Consolas"},children:"Value:"}),e.jsx("div",{style:{color:n.foreground,fontSize:11,fontFamily:"Consolas",padding:r.spacing.sm,background:n.background,borderRadius:2,border:`1px solid ${n.border}`,whiteSpace:"pre-wrap",wordBreak:"break-word",maxHeight:"300px",overflowY:"auto"},children:s.value||"(empty)"})]}),s.description&&e.jsxs("div",{children:[e.jsx("strong",{style:{color:n.muted,fontSize:11,fontFamily:"Consolas"},children:"Description:"}),e.jsx("div",{style:{color:n.foreground,fontSize:12,marginTop:"4px",fontFamily:"Consolas"},children:s.description})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:n.muted,fontSize:11,fontFamily:"Consolas"},children:"Last Updated:"}),e.jsx("div",{style:{color:n.foreground,fontSize:12,marginTop:"4px",fontFamily:"Consolas"},children:N(s.updated_at)})]}),e.jsx("div",{style:{marginTop:r.spacing.md,paddingTop:r.spacing.md,borderTop:`1px solid ${n.border}`},children:e.jsx(y,{label:"Edit Configuration",onClick:()=>{O(s),g(null)},variant:"primary"})})]})})]}):e.jsx(V,{title:"CONFIGURATION TABLE",children:e.jsxs($e,{children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx(z,{children:"Key"}),e.jsx(z,{children:"Value"}),e.jsx(z,{children:"Current Batch"}),e.jsx(z,{children:"Last Updated"}),e.jsx(z,{children:"Actions"})]})}),e.jsxs("tbody",{children:[$==="new"&&c&&e.jsxs(W,{children:[e.jsx(b,{children:e.jsx(P,{value:c.key,onChange:o=>h({...c,key:o.target.value}),placeholder:"Enter key..."})}),e.jsx(b,{children:e.jsx(Y,{value:c.value,onChange:o=>h({...c,value:o.target.value}),placeholder:"Enter value..."})}),e.jsx(b,{children:"-"}),e.jsx(b,{children:"-"}),e.jsx(K,{children:e.jsxs("div",{style:{display:"flex",gap:r.spacing.sm,justifyContent:"flex-end"},children:[e.jsx(y,{label:"Save",onClick:G,variant:"primary"}),e.jsx(y,{label:"Cancel",onClick:L,variant:"ghost"})]})})]}),a.map(o=>e.jsxs(W,{children:[e.jsx(b,{children:$===o.key?e.jsx(P,{value:(c==null?void 0:c.key)||"",onChange:m=>h(x=>x?{...x,key:m.target.value}:null),disabled:!0}):o.key}),e.jsx(b,{children:$===o.key?e.jsx(Y,{value:(c==null?void 0:c.value)||"",onChange:m=>h(x=>x?{...x,value:m.target.value}:null)}):D(o.value)?e.jsx(ke,{children:S.has(o.key)?e.jsx(Ce,{children:H(o.value)}):e.jsx(je,{children:X(o.value)})}):e.jsx("pre",{style:{margin:0,whiteSpace:"pre-wrap",wordBreak:"break-all",fontFamily:"Consolas",fontSize:11,color:n.foreground},children:o.value})}),e.jsx(b,{children:o.key==="batch_size"?o.value:"-"}),e.jsx(b,{children:N(o.updated_at)}),e.jsx(K,{children:e.jsx("div",{style:{display:"flex",gap:r.spacing.sm,justifyContent:"flex-end"},children:$===o.key?e.jsxs(e.Fragment,{children:[e.jsx(y,{label:"Save",onClick:J,variant:"primary"}),e.jsx(y,{label:"Cancel",onClick:L,variant:"ghost"})]}):e.jsxs(e.Fragment,{children:[D(o.value)&&e.jsx(y,{label:S.has(o.key)?"Collapse":"Expand",onClick:()=>q(o.key),variant:"ghost"}),e.jsx(y,{label:"Edit",onClick:()=>O(o),variant:"ghost"})]})})})]},o.key))]})]})})]})};export{Te as default};
