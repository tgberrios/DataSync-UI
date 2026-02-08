import{f,t as o,b as t,m as At,r as s,v as P,j as e,C as Ve,e as k}from"./index-b1fa964d.js";import{e as Se}from"./errorHandler-5ea9ae85.js";import{s as Ke}from"./validation-24839588.js";import{A as O}from"./AsciiPanel-3399d5be.js";import{A as x}from"./AsciiButton-3fcfdd9b.js";import{S as Et}from"./SkeletonLoader-09c12074.js";f.div`
  margin-bottom: ${o.spacing.xxl};
  padding: ${o.spacing.lg};
  border: 1px solid ${t.border};
  border-radius: 2;
  background-color: ${t.backgroundSoft};
  transition: background-color 0.15s ease, border-color 0.15s ease;
  font-family: 'Consolas';
  font-size: 12px;
`;f.h2`
  margin: 0;
  margin-bottom: ${o.spacing.md};
  font-size: 14px;
  font-family: 'Consolas';
  color: ${t.accent};
  border-bottom: 1px solid ${t.border};
  padding-bottom: ${o.spacing.sm};
  font-weight: 600;
`;const Tt=f.div`
  display: flex;
  flex-direction: column;
  gap: ${o.spacing.lg};
  margin-bottom: ${o.spacing.lg};
  padding: ${o.spacing.md};
  background-color: ${t.background};
  border: 1px solid ${t.border};
  border-radius: 2;
  font-family: 'Consolas';
  font-size: 12px;
`,oe=f.div`
  display: flex;
  flex-direction: column;
  gap: ${o.spacing.sm};
`,ne=f.span`
  font-size: 11px;
  font-weight: 600;
  color: ${t.muted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-bottom: ${o.spacing.xs};
  border-bottom: 1px solid ${t.border};
  margin-bottom: ${o.spacing.xs};
`,se=f.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${o.spacing.sm};
  align-items: end;
`,Nt=f.div`
  display: flex;
  flex-direction: column;
  gap: ${o.spacing.xs};
`,R=f.div`
  display: flex;
  flex-direction: column;
  gap: ${o.spacing.xs};
  min-width: 0;
`,w=f.label`
  font-size: 12px;
  font-weight: 600;
  color: ${t.foreground};
  font-family: 'Consolas';
`,_e=f.select`
  padding: ${o.spacing.sm} ${o.spacing.md};
  border: 1px solid ${t.border};
  border-radius: 2;
  background-color: ${t.background};
  font-family: 'Consolas';
  font-size: 12px;
  transition: border-color 0.15s ease;
  cursor: pointer;
  outline: none;

  &:focus {
    border-color: ${t.accent};
    outline: 2px solid ${t.accent};
    outline-offset: 2px;
  }
`,K=f.input`
  padding: ${o.spacing.sm} ${o.spacing.md};
  border: 1px solid ${t.border};
  border-radius: 2;
  font-family: 'Consolas';
  font-size: 12px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  transition: border-color 0.15s ease;
  outline: none;

  &:focus {
    border-color: ${t.accent};
    outline: 2px solid ${t.accent};
    outline-offset: 2px;
  }
`;f.div`
  display: flex;
  flex-direction: column;
  gap: ${o.spacing.xs};
  font-family: 'Consolas';
  font-size: 12px;
`;const Dt=f.label`
  display: flex;
  align-items: center;
  gap: ${o.spacing.sm};
  cursor: pointer;
  color: ${t.foreground};
  font-size: 12px;
  font-family: 'Consolas';
  
  &:hover {
    color: ${t.accent};
  }
`,Ot=f.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: ${t.accent};
`,qe=f.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${o.spacing.xs};
  align-items: center;
  font-family: 'Consolas';
`,Xe=f.button`
  padding: ${o.spacing.xs} ${o.spacing.sm};
  border: 2px solid ${d=>{if(d.$selected)switch(d.$level){case"DEBUG":return t.muted;case"INFO":return t.accent;case"WARNING":return t.warning;case"ERROR":return t.danger;case"CRITICAL":return t.danger;default:return t.border}return t.border}};
  border-radius: 2;
  background-color: ${d=>{if(d.$selected)switch(d.$level){case"DEBUG":return`${t.muted}20`;case"INFO":return`${t.accent}20`;case"WARNING":return`${t.warning}20`;case"ERROR":return`${t.danger}20`;case"CRITICAL":return`${t.danger}30`;default:return t.backgroundSoft}return t.background}};
  color: ${d=>{if(d.$selected)switch(d.$level){case"DEBUG":return t.muted;case"INFO":return t.accent;case"WARNING":return t.warning;case"ERROR":return t.danger;case"CRITICAL":return t.danger;default:return t.foreground}return t.muted}};
  font-family: 'Consolas';
  font-size: 11px;
  font-weight: ${d=>d.$selected?600:400};
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 70px;
  text-align: center;
  
  &:hover {
    border-color: ${d=>{switch(d.$level){case"DEBUG":return t.muted;case"INFO":return t.accent;case"WARNING":return t.warning;case"ERROR":return t.danger;case"CRITICAL":return t.danger;default:return t.accent}}};
    background-color: ${d=>{if(!d.$selected)switch(d.$level){case"DEBUG":return`${t.muted}10`;case"INFO":return`${t.accent}10`;case"WARNING":return`${t.warning}10`;case"ERROR":return`${t.danger}10`;case"CRITICAL":return`${t.danger}15`;default:return t.backgroundSoft}return d.$selected?void 0:t.backgroundSoft}};
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:focus {
    outline: 2px solid ${t.accent};
    outline-offset: 2px;
  }
`,Wt=f.div`
  flex: 1;
  border: 1px solid ${t.border};
  border-radius: 2;
  background-color: ${t.background};
  color: ${t.foreground};
  overflow-y: auto;
  padding: ${o.spacing.md};
  font-size: 11px;
  font-family: 'Consolas';
  line-height: 1.6;
  max-height: 500px;
  transition: background-color 0.15s ease;
  position: relative;
  
  &::-webkit-scrollbar {
    width: 0px;
    display: none;
  }
  
  -ms-overflow-style: none;
  scrollbar-width: none;
  
  /* Track scroll position to auto-scroll on new logs */
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
  }
`,Gt=At`
  0% {
    opacity: 0;
    transform: translateY(-12px) scale(0.98);
    background-color: ${t.accent}44;
    border-left-width: 4px;
  }
  30% {
    opacity: 0.7;
    background-color: ${t.backgroundSoft};
  }
  60% {
    background-color: ${t.backgroundSoft};
    border-left-width: 3px;
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    background-color: transparent;
    border-left-width: 2px;
  }
`,Pt=f.div`
  margin-bottom: 2px;
  padding: ${o.spacing.xs} 0;
  border-left: ${d=>d.$isNew?"3px":"2px"} solid ${d=>{switch(d.$level){case"ERROR":case"CRITICAL":return t.foreground;case"WARNING":return t.muted;case"INFO":return t.accent;case"DEBUG":return t.muted;default:return t.muted}}};
  padding-left: ${o.spacing.sm};
  position: relative;
  font-family: 'Consolas';
  font-size: 11px;
  ${d=>d.$isNew?`
    animation: ${Gt} 1s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: opacity, transform, background-color;
  `:`
    transition: background-color 0.15s ease;
  `}
`,Ut=f.span`
  color: ${t.muted};
  margin-right: ${o.spacing.sm};
  font-size: 11px;
  font-family: 'Consolas';
`,Mt=f.span`
  font-weight: 600;
  margin-right: ${o.spacing.sm};
  font-family: 'Consolas';
  font-size: 11px;
  color: ${d=>{switch(d.$level){case"ERROR":case"CRITICAL":return t.foreground;case"WARNING":return t.muted;case"INFO":return t.accent;case"DEBUG":return t.muted;default:return t.foreground}}};
`,Ht=f.span`
  color: ${t.muted};
  margin-right: ${o.spacing.sm};
  font-size: 11px;
  font-family: 'Consolas';
`,Yt=f.span`
  color: ${t.muted};
  margin-right: ${o.spacing.sm};
  font-size: 11px;
  font-weight: 500;
  font-family: 'Consolas';
  background-color: ${t.backgroundSoft};
  padding: ${o.spacing.xs} ${o.spacing.xs};
  border-radius: 2;
  border: 1px solid ${t.border};
`,Vt=f.span`
  color: ${t.foreground};
  font-family: 'Consolas';
  font-size: 11px;
`,Kt=f.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${o.spacing.sm};
  margin-top: ${o.spacing.md};
  padding: ${o.spacing.md};
  background-color: ${t.backgroundSoft};
  border: 1px solid ${t.border};
  border-radius: 2;
  font-family: 'Consolas';
  font-size: 12px;
`,Je=f.span`
  color: ${t.muted};
  font-family: 'Consolas';
  font-size: 11px;
`;f.div`
  margin-top: ${o.spacing.md};
  padding: ${o.spacing.sm} ${o.spacing.md};
  background-color: ${t.backgroundSoft};
  border: 1px solid ${t.accent};
  border-radius: 2;
  color: ${t.accent};
  text-align: center;
  font-family: 'Consolas';
  font-size: 12px;
`;const _t=f.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.5);
`,qt=f.div`
  background: ${t.background};
  padding: ${o.spacing.xxl};
  border-radius: 2;
  border: 2px solid ${t.border};
  max-width: 500px;
  text-align: center;
  font-family: 'Consolas';
  font-size: 12px;
`,no=()=>{var Ye;const[d,ce]=s.useState([]),[z,Qe]=s.useState(null),[Ze,$e]=s.useState(!0),[U,M]=s.useState(null),[_,et]=s.useState(!0),[de,Le]=s.useState(1e4),[F,ge]=s.useState(["WARNING","ERROR"]),[q,ke]=s.useState(!0),[H,Re]=s.useState("ALL"),[X,we]=s.useState(""),[fe,tt]=s.useState("ALL"),[ot,nt]=s.useState(["ALL"]),[st,rt]=s.useState(["ALL"]),[J,Fe]=s.useState(""),[Q,Ie]=s.useState(""),[W,it]=s.useState(!0),[Z,at]=s.useState(!0),[ee,lt]=s.useState(!1),[ue,ct]=s.useState(void 0),[re,ze]=s.useState(!1),[te,Be]=s.useState(!1),[dt,me]=s.useState(!1),[gt,he]=s.useState(!1),[Xt,ie]=s.useState(5),[Ae,Ee]=s.useState(!1),[ft,pe]=s.useState(!1),[ut,Te]=s.useState(!1),[b,ae]=s.useState(1),[j,Ne]=s.useState(1),[Y,mt]=s.useState([]),[ht,xe]=s.useState(!1),[pt,De]=s.useState(new Set),[S,Oe]=s.useState(null),[We,Ge]=s.useState(!1),[le,xt]=s.useState("24h"),[T,ye]=s.useState([]),[yt,bt]=s.useState([]),[B,Pe]=s.useState("entries"),V=s.useRef(null),E=s.useRef(null),g=s.useRef(!0),Ue=s.useRef([]),be=s.useRef(!0),Me=s.useRef(!0),N=s.useCallback(async()=>{if(!g.current)return;const n=Me.current,r=Date.now(),i=300;try{ze(!0),M(null),n&&$e(!0);const c=Ke(X,200),[m,v]=await Promise.all([P.getLogs({lines:de,levels:F.length>0?F:void 0,distinct:q,category:H,function:fe,search:c,startDate:J,endDate:Q,autoCleanup:W||void 0,deleteDebug:Z||void 0,deleteDuplicates:ee||void 0,deleteOlderThan:ue||void 0}),P.getLogInfo()]);if(n){const a=Date.now()-r,y=Math.max(0,i-a);await new Promise(u=>setTimeout(u,y))}if(g.current){const a=m.logs||[],y=Ue.current;if(!n&&y.length>0){const $=new Set(y.map(L=>L.id).filter(Boolean)),G=new Set(a.filter(L=>L.id&&!$.has(L.id)).map(L=>L.id));G.size>0&&(requestAnimationFrame(()=>{g.current&&(De(G),setTimeout(()=>{g.current&&De(new Set)},1500))}),be.current&&V.current&&setTimeout(()=>{var L;(L=V.current)==null||L.scrollIntoView({behavior:"smooth"})},100))}Ue.current=a,mt(a),Qe(v);const u=50,D=Math.ceil(a.length/u);Ne(D);const h=(b-1)*u,A=h+u;ce(a.slice(h,A)),Me.current=!1}}catch(c){g.current&&M(Se(c))}finally{g.current&&($e(!1),ze(!1))}},[de,F,q,H,fe,X,J,Q,b,W,Z,ee,ue]);s.useEffect(()=>{(async()=>{try{if(!g.current)return;const[r,i]=await Promise.all([P.getCategories(),P.getFunctions()]);g.current&&(nt(["ALL",...(r||[]).filter(Boolean)]),rt(["ALL",...(i||[]).filter(Boolean)]))}catch(r){g.current&&console.error("Error loading filters:",r)}})()},[]);const ve=s.useCallback(async()=>{try{Ge(!0);const n=await P.getLogChartData({period:le,levels:T.length>0?T:void 0});g.current&&Oe(n)}catch{g.current&&Oe(null)}finally{g.current&&Ge(!1)}},[le,T]);s.useEffect(()=>{ve()},[ve]),s.useEffect(()=>(g.current=!0,N(),()=>{g.current=!1}),[N]),s.useEffect(()=>{if(E.current&&(clearInterval(E.current),E.current=null),_&&g.current){ie(5),E.current=setInterval(()=>{g.current&&ie(r=>r<=1?5:r-1)},1e3);const n=setInterval(()=>{g.current&&(N(),ae(1),ie(5))},5e3);return()=>{clearInterval(n),E.current&&(clearInterval(E.current),E.current=null)}}else ie(5)},[_,N]),s.useEffect(()=>{if(Y.length>0&&g.current){const r=Math.ceil(Y.length/50);Ne(r);const i=(b-1)*50,c=i+50;ce(Y.slice(i,c))}},[Y,b]),s.useEffect(()=>{var i;const n=(i=V.current)==null?void 0:i.parentElement;if(!n)return;const r=()=>{const{scrollTop:c,scrollHeight:m,clientHeight:v}=n,a=m-c-v<10;be.current=a};return n.addEventListener("scroll",r),r(),()=>n.removeEventListener("scroll",r)},[d]),s.useEffect(()=>{var i;const n=(i=V.current)==null?void 0:i.parentElement;if(!n)return;const r=()=>{const{scrollTop:c,scrollHeight:m,clientHeight:v}=n,a=m-c-v<10;be.current=a};return n.addEventListener("scroll",r),()=>n.removeEventListener("scroll",r)},[]),s.useEffect(()=>()=>{E.current&&clearInterval(E.current)},[]);const vt=s.useCallback(()=>{var n;(n=V.current)==null||n.scrollIntoView({behavior:"smooth"})},[]),I=s.useCallback(n=>{n>=1&&n<=j&&n!==b&&(Te(!0),setTimeout(()=>{ae(n);const r=50,i=(n-1)*r,c=i+r;ce(Y.slice(i,c)),setTimeout(()=>Te(!1),200)},50))},[j,b,Y]),jt=s.useCallback(()=>I(1),[I]),Ct=s.useCallback(()=>I(j),[I,j]),St=s.useCallback(()=>I(b-1),[I,b]),$t=s.useCallback(()=>I(b+1),[I,b]),Lt=s.useCallback(async()=>{try{if(!g.current)return;Be(!0),M(null),he(!1);const n=await P.clearLogs();g.current&&(me(!1),he(!0),ae(1),await N(),setTimeout(()=>{g.current&&he(!1)},3e3))}catch(n){if(g.current){const r=Se(n);M(r),console.error("Error clearing logs:",n)}}finally{g.current&&Be(!1)}},[N]),kt=s.useCallback(()=>{Le(1e4),ge(["WARNING","ERROR"]),ke(!0),Re("ALL"),we(""),Fe(""),Ie(""),ae(1)},[]),Rt=s.useCallback(async()=>{try{if(!g.current)return;Ee(!0),pe(!1);const n=await P.getLogs({lines:1e4,levels:F.length>0?F:void 0,distinct:q,category:H,search:Ke(X,200),startDate:J,endDate:Q}),r=(n.logs||[]).map(m=>{const v=m.timestamp,a=`[${m.level}]`,y=m.function?`[${m.function}]`:"",u=m.message;return`${v} ${a} ${y} ${u}`.trim()}).join(`
`),c=`DataSync Logs - ${new Date().toLocaleString()}
Total Entries: ${(n.logs||[]).length}
Level Filter: ${F.length>0?F.join(", "):"ALL"}
Category Filter: ${H}
File: ${(z==null?void 0:z.filePath)||"Unknown"}
Size: ${z?wt(z.size||0):"Unknown"}
Last Modified: ${z!=null&&z.lastModified?He(z.lastModified):"Unknown"}
${"=".repeat(80)}

`+r;await navigator.clipboard.writeText(c),g.current&&(pe(!0),setTimeout(()=>{g.current&&pe(!1)},3e3))}catch(n){g.current&&M(Se(n))}finally{g.current&&Ee(!1)}},[F,q,H,X,J,Q,z]),wt=s.useCallback(n=>{if(n===0)return"0 Bytes";const r=1024,i=["Bytes","KB","MB","GB"],c=Math.floor(Math.log(n)/Math.log(r));return parseFloat((n/Math.pow(r,c)).toFixed(2))+" "+i[c]},[]),He=s.useCallback(n=>new Date(n).toLocaleString(),[]);return Ze?e.jsx(Et,{variant:"table"}):U&&d.length===0?e.jsx(Ve,{children:e.jsxs("div",{style:{width:"100%",minHeight:"100vh",padding:o.spacing.lg,fontFamily:"Consolas",fontSize:12,color:t.foreground,backgroundColor:t.background,display:"flex",flexDirection:"column",gap:o.spacing.lg},children:[e.jsx("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:o.spacing.lg,paddingBottom:o.spacing.md,borderBottom:`2px solid ${t.accent}`},children:e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:t.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:t.accent,marginRight:o.spacing.sm},children:k.blockFull}),"LOGS"]})}),e.jsx("div",{style:{marginBottom:o.spacing.lg},children:e.jsxs(O,{title:"ERROR",children:[e.jsxs("div",{style:{padding:o.spacing.md,color:t.foreground,fontSize:12,fontFamily:"Consolas",background:t.backgroundSoft,borderRadius:2,border:`2px solid ${t.foreground}`,marginBottom:o.spacing.sm},children:["Error loading logs: ",U]}),e.jsx(x,{label:"Retry",onClick:N,variant:"primary"})]})})]})}):e.jsxs(Ve,{children:[e.jsxs("div",{style:{width:"100%",minHeight:"100vh",padding:o.spacing.lg,fontFamily:"Consolas",fontSize:12,color:t.foreground,backgroundColor:t.background,display:"flex",flexDirection:"column",gap:o.spacing.lg},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:o.spacing.lg,paddingBottom:o.spacing.md,borderBottom:`2px solid ${t.accent}`},children:[e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:t.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:t.accent,marginRight:o.spacing.sm},children:k.blockFull}),"LOGS"]}),e.jsx(x,{label:"Logs Info",onClick:()=>xe(!0),variant:"ghost"})]}),e.jsxs("div",{style:{display:"flex",gap:0,borderBottom:`1px solid ${t.border}`,marginBottom:o.spacing.lg},children:[e.jsx("button",{type:"button",onClick:()=>Pe("entries"),style:{padding:`${o.spacing.sm} ${o.spacing.lg}`,fontFamily:"Consolas",fontSize:12,fontWeight:B==="entries"?600:400,color:B==="entries"?t.foreground:t.muted,background:B==="entries"?t.backgroundSoft:"transparent",border:"none",borderBottom:B==="entries"?`2px solid ${t.accent}`:"2px solid transparent",cursor:"pointer",marginBottom:-1},children:"Log entries"}),e.jsx("button",{type:"button",onClick:()=>Pe("charts"),style:{padding:`${o.spacing.sm} ${o.spacing.lg}`,fontFamily:"Consolas",fontSize:12,fontWeight:B==="charts"?600:400,color:B==="charts"?t.foreground:t.muted,background:B==="charts"?t.backgroundSoft:"transparent",border:"none",borderBottom:B==="charts"?`2px solid ${t.accent}`:"2px solid transparent",cursor:"pointer",marginBottom:-1},children:"Charts"})]}),ht&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>xe(!1),children:e.jsx("div",{style:{width:"90%",maxWidth:1e3,maxHeight:"90vh",overflowY:"auto",fontFamily:"Consolas"},onClick:n=>n.stopPropagation(),className:"modal-scroll-container",children:e.jsx(O,{title:"LOGS VIEWER PLAYBOOK",children:e.jsxs("div",{style:{padding:o.spacing.md,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:o.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:[k.blockFull," OVERVIEW"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontFamily:"Consolas"},children:"The Logs Viewer provides comprehensive access to application logs stored in the database. Monitor system activity, debug issues, filter by level and category, search through entries, and manage log retention. All logs are stored in the metadata.logs table and can be exported, filtered, and cleared as needed."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:[k.blockFull," LOG LEVELS"]}),e.jsxs("div",{style:{marginLeft:o.spacing.md},children:[e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"DEBUG"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Detailed diagnostic information for debugging purposes. Typically used during development and troubleshooting. Can be filtered out in production environments."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"INFO"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"General informational messages about application flow and operations. Used to track normal application behavior and significant events."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.muted,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"WARNING"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Warning messages indicating potential issues that don't prevent the application from functioning but should be reviewed. May indicate deprecated features or configuration issues."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"ERROR"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Error messages indicating failures in operations that prevent specific functionality from working correctly. These require immediate attention."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"CRITICAL"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Critical errors that may cause the application to fail or become unstable. These require immediate investigation and resolution."})]})]})]}),e.jsxs("div",{style:{marginBottom:o.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:[k.blockFull," FILTERING & SEARCH"]}),e.jsxs("div",{style:{marginLeft:o.spacing.md},children:[e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Level Filter"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:'Filter logs by severity level (DEBUG, INFO, WARNING, ERROR, CRITICAL). Select "ALL" to view all levels. Useful for focusing on specific types of issues.'})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Category Filter"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:'Filter logs by category (e.g., DATABASE, API, AUTH, SYNC). Categories are automatically extracted from log entries. Select "ALL" to view all categories.'})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Function Filter"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:'Filter logs by function name. Useful for debugging specific functions or methods. Select "ALL" to view logs from all functions.'})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Search"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Search for specific text within log messages. The search is case-sensitive and searches through the entire log message content. Use this to find specific errors or events."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Date Range"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Filter logs by date range using Start Date and End Date. Useful for investigating issues that occurred during specific time periods. Leave empty to include all dates."})]})]})]}),e.jsxs("div",{style:{marginBottom:o.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:[k.blockFull," LOG MANAGEMENT"]}),e.jsxs("div",{style:{marginLeft:o.spacing.md},children:[e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Auto Refresh"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Automatically refresh logs every 5 seconds. Useful for monitoring real-time activity. The countdown timer shows when the next refresh will occur. Disable to stop automatic updates."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Auto Cleanup"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Automatically clean up logs based on configured rules during fetch operations. Options include deleting DEBUG logs, removing duplicates, and deleting logs older than a specified number of days."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Copy Logs"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Copy all filtered logs to clipboard with header information including total entries, filters applied, file path, size, and last modified date. Useful for sharing logs with support teams or for offline analysis."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Clear Logs"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Truncate the entire metadata.logs table, removing all log entries permanently. This operation cannot be undone. Use with caution, especially in production environments. A confirmation dialog will appear before clearing."})]})]})]}),e.jsxs("div",{style:{marginBottom:o.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:[k.blockFull," PAGINATION"]}),e.jsx("div",{style:{marginLeft:o.spacing.md},children:e.jsx("div",{style:{color:t.foreground,fontSize:11,fontFamily:"Consolas"},children:'Logs are paginated with 50 entries per page. Use the pagination controls to navigate between pages. The "Go to Latest" button takes you to page 1 (most recent logs). You can also jump to a specific page number using the "Go to" input field.'})})]}),e.jsxs("div",{style:{marginTop:o.spacing.md,padding:o.spacing.sm,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:t.muted,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:[k.blockSemi," Best Practices"]}),e.jsxs("div",{style:{fontSize:11,color:t.foreground,fontFamily:"Consolas"},children:["• Use filters to narrow down logs when investigating specific issues",e.jsx("br",{}),"• Enable auto-cleanup in production to manage log table size",e.jsx("br",{}),"• Regularly review and clear old logs to maintain performance",e.jsx("br",{}),"• Export logs before clearing for audit purposes",e.jsx("br",{}),"• Monitor ERROR and CRITICAL levels regularly",e.jsx("br",{}),"• Use date ranges to investigate time-specific issues",e.jsx("br",{}),"• Keep DEBUG logs disabled in production for better performance"]})]}),e.jsx("div",{style:{marginTop:o.spacing.md,textAlign:"right"},children:e.jsx(x,{label:"Close",onClick:()=>xe(!1),variant:"ghost"})})]})})})}),U&&e.jsx("div",{style:{marginBottom:o.spacing.lg},children:e.jsx(O,{title:"ERROR",children:e.jsx("div",{style:{padding:o.spacing.md,color:t.foreground,fontSize:12,fontFamily:"Consolas",background:t.backgroundSoft,borderRadius:2,border:`2px solid ${t.foreground}`},children:U})})}),B==="charts"&&e.jsx("div",{style:{marginBottom:o.spacing.lg,minHeight:400},children:e.jsxs(O,{title:"LOG CHARTS",children:[e.jsxs("div",{style:{display:"flex",flexWrap:"wrap",alignItems:"center",gap:o.spacing.md,marginBottom:o.spacing.lg},children:[e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:8,fontSize:12,color:t.foreground,fontFamily:"Consolas"},children:["Period:",e.jsxs("select",{value:le,onChange:n=>xt(n.target.value),style:{padding:`${o.spacing.sm} ${o.spacing.md}`,fontSize:12,border:`1px solid ${t.border}`,background:t.background,color:t.foreground,fontFamily:"Consolas",borderRadius:2},children:[e.jsx("option",{value:"1h",children:"Last 1 hour"}),e.jsx("option",{value:"7h",children:"Last 7 hours"}),e.jsx("option",{value:"24h",children:"Last 24 hours"}),e.jsx("option",{value:"7d",children:"Last 7 days"})]})]}),e.jsx("span",{style:{fontSize:12,color:t.muted,fontFamily:"Consolas"},children:"Level filter:"}),e.jsx(qe,{children:["DEBUG","INFO","WARNING","ERROR","CRITICAL"].map(n=>{const r=T.length===0||T.includes(n);return e.jsx(Xe,{type:"button",$level:n,$selected:r,onClick:()=>{T.length===0?ye(["DEBUG","INFO","WARNING","ERROR","CRITICAL"].filter(i=>i!==n)):ye(r?T.filter(i=>i!==n):[...T,n])},title:r?`Exclude ${n} from chart`:`Include ${n} in chart`,children:n},n)})}),e.jsx(x,{label:"Refresh charts",onClick:ve,variant:"ghost",disabled:We})]}),We&&!S?e.jsx("div",{style:{padding:o.spacing.xxl,textAlign:"center",color:t.muted,fontSize:12,fontFamily:"Consolas"},children:"Loading chart data…"}):S?e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:o.spacing.xl},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:12,fontWeight:600,color:t.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:"Logs over time (by category)"}),S.timeSeries.length===0||!((Ye=S.categoryNames)!=null&&Ye.length)?e.jsx("div",{style:{padding:48,textAlign:"center",color:t.muted,fontSize:12,border:`1px solid ${t.border}`,borderRadius:2},children:"No data in period"}):(()=>{const n=S.categoryNames||[],r=new Set(yt),i=n.filter(l=>!r.has(l)),c=l=>{bt(p=>p.includes(l)?p.filter(C=>C!==l):[...p,l])},m=[t.accent,t.foreground,"#6b7280","#4b5563","#9ca3af","#374151","#1f2937",t.muted],v=l=>m[l%m.length],a={top:24,right:140,bottom:36,left:48},y=900,u=320,D=y-a.left-a.right,h=u-a.top-a.bottom,A=Math.max(1,...S.timeSeries.flatMap(l=>i.map(p=>l[p]||0))),$=S.timeSeries.map(l=>l.bucket),G=S.timeSeries.length,L=l=>a.left+(G<=1?0:l/(G-1)*D),Ft=l=>a.top+h-(A>0?l/A*h:0),It=l=>{const p=new Date(l);return le==="7d"?p.toLocaleDateString(void 0,{month:"short",day:"numeric"}):p.toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit"})},je=5;return e.jsxs("svg",{width:"100%",height:u,viewBox:`0 0 ${y} ${u}`,style:{display:"block",border:`1px solid ${t.border}`,borderRadius:2,backgroundColor:t.background,maxWidth:y},children:[Array.from({length:je+1}).map((l,p)=>{const C=a.top+h*p/je,Ce=p===0?A:Math.round(A*(1-p/je));return e.jsxs("g",{children:[e.jsx("line",{x1:a.left,y1:C,x2:y-a.right,y2:C,stroke:t.border,strokeWidth:1,strokeDasharray:"2 2",opacity:.6}),e.jsx("text",{x:a.left-6,y:C+4,textAnchor:"end",fontSize:10,fill:t.muted,children:Ce})]},p)}),e.jsx("line",{x1:a.left,y1:a.top,x2:a.left,y2:u-a.bottom,stroke:t.border,strokeWidth:1}),e.jsx("line",{x1:a.left,y1:u-a.bottom,x2:y-a.right,y2:u-a.bottom,stroke:t.border,strokeWidth:1}),i.map((l,p)=>{const C=S.timeSeries.map((Ce,zt)=>{const Bt=Ce[l]||0;return`${L(zt)},${Ft(Bt)}`}).join(" ");return e.jsx("polyline",{points:C,fill:"none",stroke:v(n.indexOf(l)),strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},l)}),$.map((l,p)=>{const C=$.length<=10?1:Math.max(1,Math.floor($.length/8));return p%C!==0&&p!==$.length-1?null:e.jsx("text",{x:L(p),y:u-a.bottom+14,textAnchor:"middle",fontSize:10,fill:t.muted,children:It(l)},`${l}-${p}`)}),e.jsx("g",{transform:`translate(${y-a.right-120}, ${a.top})`,children:n.map((l,p)=>{const C=r.has(l);return e.jsxs("g",{onClick:()=>c(l),style:{cursor:"pointer",opacity:C?.4:1},title:C?`Show ${l}`:`Hide ${l}`,children:[e.jsx("line",{x1:0,y1:p*18,x2:12,y2:p*18,stroke:v(p),strokeWidth:2,strokeDasharray:C?"4 2":void 0}),e.jsx("text",{x:16,y:p*18+4,fontSize:10,fill:t.foreground,style:{textDecoration:C?"line-through":void 0},children:l.length>12?l.slice(0,10)+"…":l})]},l)})})]})})()]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:o.spacing.xl},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:12,fontWeight:600,color:t.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:"Count by level"}),(()=>{const n={DEBUG:t.muted,INFO:t.accent,WARNING:"#6b7280",ERROR:t.foreground,CRITICAL:t.foreground},i=["DEBUG","INFO","WARNING","ERROR","CRITICAL"].map(h=>({level:h,count:S.byLevel[h]||0})).filter(h=>h.count>0),c=Math.max(1,...i.map(h=>h.count)),m=28,v=6,a=80,y=220,u=Math.max(120,i.length*(m+v)-v+24),D=a+y+56;return e.jsx("svg",{width:"100%",viewBox:`0 0 ${D} ${u}`,style:{display:"block",border:`1px solid ${t.border}`,borderRadius:2,backgroundColor:t.background,maxWidth:400},children:i.length===0?e.jsx("text",{x:D/2,y:u/2,textAnchor:"middle",fontSize:12,fill:t.muted,children:"No data"}):i.map((h,A)=>{const $=16+A*(m+v),G=h.count/c*y;return e.jsxs("g",{children:[e.jsx("text",{x:4,y:$+m-8,fontSize:11,fill:t.foreground,children:h.level}),e.jsx("rect",{x:a,y:$,width:y,height:m-2,fill:t.backgroundSoft,stroke:t.border,rx:2}),e.jsx("rect",{x:a,y:$,width:G,height:m-2,fill:n[h.level]||t.muted,rx:2}),e.jsx("text",{x:a+y+8,y:$+m-8,fontSize:11,fill:t.foreground,children:h.count})]},h.level)})})})()]}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:12,fontWeight:600,color:t.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:"Top categories"}),!S.byCategory||S.byCategory.length===0?e.jsx("div",{style:{padding:48,textAlign:"center",color:t.muted,fontSize:12,border:`1px solid ${t.border}`,borderRadius:2},children:"No data"}):(()=>{const n=S.byCategory.slice(0,10),r=Math.max(1,...n.map(u=>u.count)),i=24,c=6,m=110,v=200,a=n.length*(i+c)-c+24,y=m+v+56;return e.jsx("svg",{width:"100%",viewBox:`0 0 ${y} ${a}`,style:{display:"block",border:`1px solid ${t.border}`,borderRadius:2,backgroundColor:t.background,maxWidth:400},children:n.map((u,D)=>{const h=16+D*(i+c),A=u.count/r*v,$=(u.category||"").length>16?(u.category||"").slice(0,14)+"…":u.category||"";return e.jsxs("g",{children:[e.jsx("text",{x:4,y:h+i-6,fontSize:10,fill:t.foreground,children:$}),e.jsx("rect",{x:m,y:h,width:v,height:i-2,fill:t.backgroundSoft,stroke:t.border,rx:2}),e.jsx("rect",{x:m,y:h,width:A,height:i-2,fill:t.accent,rx:2,opacity:.85}),e.jsx("text",{x:m+v+8,y:h+i-6,fontSize:10,fill:t.foreground,children:u.count})]},u.category)})})})()]})]})]}):e.jsx("div",{style:{padding:o.spacing.xl,color:t.muted,fontSize:12,fontFamily:"Consolas"},children:"Chart data unavailable."})]})}),B==="entries"&&e.jsxs("div",{style:{display:"flex",flexDirection:"row",gap:o.spacing.lg,alignItems:"flex-start",flex:1,minHeight:0,width:"100%"},children:[e.jsx("div",{style:{width:420,minWidth:420,flexShrink:0,position:"sticky",top:o.spacing.lg,maxHeight:"calc(100vh - 100px)",overflowY:"auto"},children:e.jsxs(O,{title:"LOG CONTROLS",children:[e.jsxs(Tt,{children:[e.jsxs(oe,{children:[e.jsx(ne,{children:"Fetch & levels"}),e.jsxs(R,{children:[e.jsx(w,{children:"Lines to show"}),e.jsx(K,{type:"number",value:de,onChange:n=>Le(Math.max(10,parseInt(n.target.value)||1e4)),min:"10",max:"100000"})]}),e.jsxs(Nt,{children:[e.jsx(w,{children:"Log Levels"}),e.jsx(qe,{children:["DEBUG","INFO","WARNING","ERROR","CRITICAL"].map(n=>{const r=F.includes(n);return e.jsx(Xe,{type:"button",$level:n,$selected:r,onClick:()=>{ge(r?F.filter(i=>i!==n):[...F,n])},title:`${r?"Deselect":"Select"} ${n} level logs`,children:n},n)})})]}),e.jsx(R,{children:e.jsxs(Dt,{children:[e.jsx(Ot,{type:"checkbox",checked:q,onChange:n=>ke(n.target.checked)}),"Distinct messages (most recent only)"]})})]}),e.jsxs(oe,{children:[e.jsx(ne,{children:"Filters"}),e.jsxs(se,{children:[e.jsxs(R,{children:[e.jsx(w,{children:"Category"}),e.jsx(_e,{value:H,onChange:n=>Re(n.target.value),children:ot.map(n=>e.jsx("option",{value:n,children:n},n))})]}),e.jsxs(R,{children:[e.jsx(w,{children:"Function"}),e.jsx(_e,{value:fe,onChange:n=>tt(n.target.value),children:st.map(n=>e.jsx("option",{value:n,children:n},n))})]})]}),e.jsxs(R,{children:[e.jsx(w,{children:"Search"}),e.jsx(K,{type:"text",value:X,onChange:n=>we(n.target.value),placeholder:"Search in logs..."})]})]}),e.jsxs(oe,{children:[e.jsx(ne,{children:"Date range"}),e.jsxs(se,{children:[e.jsxs(R,{children:[e.jsx(w,{children:"Start"}),e.jsx(K,{type:"datetime-local",value:J,onChange:n=>Fe(n.target.value)})]}),e.jsxs(R,{children:[e.jsx(w,{children:"End"}),e.jsx(K,{type:"datetime-local",value:Q,onChange:n=>Ie(n.target.value)})]})]})]}),e.jsxs(oe,{children:[e.jsx(ne,{children:"Refresh & cleanup"}),e.jsx(se,{children:e.jsxs(R,{children:[e.jsx(w,{children:"Auto Refresh"}),e.jsx(x,{label:_?"ON":"OFF",onClick:()=>et(!_),variant:_?"primary":"ghost"})]})}),e.jsx(se,{children:e.jsxs(R,{children:[e.jsx(w,{children:"Auto Cleanup"}),e.jsx(x,{label:W?"ON":"OFF",onClick:()=>it(!W),variant:W?"primary":"ghost"})]})}),W&&e.jsxs(se,{children:[e.jsxs(R,{children:[e.jsx(w,{children:"Delete DEBUG"}),e.jsx(x,{label:Z?"YES":"NO",onClick:()=>at(!Z),variant:Z?"primary":"ghost"})]}),e.jsxs(R,{children:[e.jsx(w,{children:"Delete duplicates"}),e.jsx(x,{label:ee?"YES":"NO",onClick:()=>lt(!ee),variant:ee?"primary":"ghost"})]})]}),W&&e.jsxs(R,{children:[e.jsx(w,{children:"Delete older than (days)"}),e.jsx(K,{type:"number",value:ue||"",onChange:n=>{const r=n.target.value;ct(r?parseInt(r):void 0)},placeholder:"Optional",min:"1"})]})]}),e.jsxs(oe,{children:[e.jsx(ne,{children:"Actions"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:o.spacing.sm},children:[e.jsx(x,{label:re?"Refreshing...":"Refresh Now",onClick:N,disabled:re,variant:"primary"}),e.jsx(x,{label:"Clear Filters",onClick:kt,variant:"ghost"}),e.jsx(x,{label:"Scroll to Bottom",onClick:vt,variant:"ghost"}),e.jsx(x,{label:"Go to Latest",onClick:()=>I(1),variant:"ghost"}),e.jsx(x,{label:Ae?"Copying...":"Copy Logs",onClick:Rt,disabled:Ae||re,variant:"ghost"}),e.jsx(x,{label:te?"Clearing...":"Clear Logs",onClick:()=>me(!0),disabled:te||re,variant:"ghost"})]})]})]}),ft&&e.jsx(O,{title:"SUCCESS",children:e.jsxs("div",{style:{color:t.accent,fontFamily:"Consolas",fontSize:12,padding:`${o.spacing.sm} 0`},children:[k.blockFull," Logs copied to clipboard successfully!"]})}),gt&&e.jsx(O,{title:"SUCCESS",children:e.jsxs("div",{style:{color:t.accent,fontFamily:"Consolas",fontSize:12,padding:`${o.spacing.sm} 0`},children:[k.blockFull," All logs cleared successfully!"]})})]})}),e.jsx("div",{style:{flex:1,minWidth:0,display:"flex",flexDirection:"column"},children:e.jsxs(O,{title:"LOG ENTRIES (DB)",children:[e.jsxs(Wt,{$isTransitioning:ut,children:[d.map((n,r)=>{const i=n.id?pt.has(n.id):!1;return e.jsxs(Pt,{$level:n.level,$category:n.category||"SYSTEM",$isNew:i,children:[e.jsx(Ut,{children:n.timestamp?He(n.timestamp):""}),e.jsxs(Mt,{$level:n.level,children:["[",(n.level||"").toUpperCase(),"]"]}),n.category&&e.jsxs(Yt,{$category:n.category,children:["[",(n.category||"").toUpperCase(),"]"]}),n.function&&e.jsxs(Ht,{children:["[",n.function,"]"]}),e.jsx(Vt,{children:n.message})]},n.id||r)}),e.jsx("div",{ref:V})]}),j>1&&e.jsxs(Kt,{children:[e.jsx(x,{label:"««",onClick:jt,disabled:b===1,variant:"ghost"}),e.jsx(x,{label:"«",onClick:St,disabled:b===1,variant:"ghost"}),Array.from({length:Math.min(20,j)},(n,r)=>{const c=Math.max(1,b-9)+r;return c>j?null:e.jsx(x,{label:c.toString(),onClick:()=>I(c),variant:b===c?"primary":"ghost"},c)}),j>20&&b<j-9&&e.jsx(Je,{style:{color:t.muted,fontSize:11,fontFamily:"Consolas"},children:"..."}),e.jsx(x,{label:"»",onClick:$t,disabled:b===j,variant:"ghost"}),e.jsx(x,{label:"»»",onClick:Ct,disabled:b===j,variant:"ghost"}),e.jsxs(Je,{children:["Page ",b," of ",j]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:o.spacing.xs},children:[e.jsx("span",{style:{fontSize:11,color:t.muted,fontFamily:"Consolas"},children:"Go to:"}),e.jsx(K,{type:"number",min:"1",max:j,style:{width:"60px",padding:`${o.spacing.xs} ${o.spacing.sm}`,fontSize:11,fontFamily:"Consolas"},onKeyPress:n=>{if(n.key==="Enter"){const r=parseInt(n.target.value);r>=1&&r<=j&&(I(r),n.target.value="")}},placeholder:b.toString(),"aria-label":"Go to page number"})]})]})]})})]}),dt&&e.jsx(_t,{children:e.jsxs(qt,{style:{background:t.background,padding:o.spacing.xxl,borderRadius:2,border:`2px solid ${t.border}`,maxWidth:500,textAlign:"center",fontFamily:"Consolas",fontSize:12},children:[e.jsxs("h3",{style:{margin:0,marginBottom:o.spacing.lg,color:t.foreground,fontSize:14,fontFamily:"Consolas",fontWeight:600},children:[k.blockFull," CLEAR LOGS CONFIRMATION"]}),e.jsxs("p",{style:{marginBottom:o.spacing.lg,lineHeight:1.5,color:t.foreground,fontFamily:"Consolas",fontSize:12},children:["This action will ",e.jsx("strong",{children:"TRUNCATE"})," the entire database table:",e.jsx("br",{}),e.jsx("br",{}),k.blockFull," ",e.jsx("strong",{children:"metadata.logs"}),e.jsx("br",{}),e.jsx("br",{}),"All log entries will be permanently removed from the table.",e.jsx("br",{}),e.jsx("br",{}),e.jsx("strong",{style:{color:t.foreground},children:"This operation cannot be undone!"})]}),U&&e.jsxs("div",{style:{marginBottom:o.spacing.md,padding:o.spacing.sm,backgroundColor:t.backgroundSoft,border:`1px solid ${t.foreground}`,borderRadius:2,color:t.foreground,fontSize:11,fontFamily:"Consolas"},children:["Error: ",U]}),e.jsxs("div",{style:{display:"flex",gap:o.spacing.md,justifyContent:"center"},children:[e.jsx(x,{label:"Cancel",onClick:()=>{me(!1),M(null)},disabled:te,variant:"ghost"}),e.jsx(x,{label:te?"Clearing...":"Clear Logs",onClick:Lt,disabled:te,variant:"ghost"})]})]})})]}),e.jsx("style",{children:`
        .modal-scroll-container::-webkit-scrollbar {
          width: 0px;
          display: none;
        }
        
        .modal-scroll-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `})]})};export{no as default};
