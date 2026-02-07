import{f as g,t as o,b as t,m as xt,r,v as N,j as e,C as Ne,e as S}from"./index-f6ac47b8.js";import{e as pe}from"./errorHandler-5ea9ae85.js";import{s as Oe}from"./validation-24839588.js";import{A as B}from"./AsciiPanel-5614714e.js";import{A as h}from"./AsciiButton-4907e65e.js";import{S as yt}from"./SkeletonLoader-792007e7.js";g.div`
  margin-bottom: ${o.spacing.xxl};
  padding: ${o.spacing.lg};
  border: 1px solid ${t.border};
  border-radius: 2;
  background-color: ${t.backgroundSoft};
  transition: background-color 0.15s ease, border-color 0.15s ease;
  font-family: 'Consolas';
  font-size: 12px;
`;g.h2`
  margin: 0;
  margin-bottom: ${o.spacing.md};
  font-size: 14px;
  font-family: 'Consolas';
  color: ${t.accent};
  border-bottom: 1px solid ${t.border};
  padding-bottom: ${o.spacing.sm};
  font-weight: 600;
`;const bt=g.div`
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
`,Q=g.div`
  display: flex;
  flex-direction: column;
  gap: ${o.spacing.sm};
`,Z=g.span`
  font-size: 11px;
  font-weight: 600;
  color: ${t.muted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-bottom: ${o.spacing.xs};
  border-bottom: 1px solid ${t.border};
  margin-bottom: ${o.spacing.xs};
`,ee=g.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${o.spacing.sm};
  align-items: end;
`,vt=g.div`
  display: flex;
  flex-direction: column;
  gap: ${o.spacing.xs};
`,$=g.div`
  display: flex;
  flex-direction: column;
  gap: ${o.spacing.xs};
  min-width: 0;
`,L=g.label`
  font-size: 12px;
  font-weight: 600;
  color: ${t.foreground};
  font-family: 'Consolas';
`,De=g.select`
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
`,U=g.input`
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
`;g.div`
  display: flex;
  flex-direction: column;
  gap: ${o.spacing.xs};
  font-family: 'Consolas';
  font-size: 12px;
`;const jt=g.label`
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
`,Ct=g.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: ${t.accent};
`,St=g.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${o.spacing.xs};
  align-items: center;
  font-family: 'Consolas';
`,$t=g.button`
  padding: ${o.spacing.xs} ${o.spacing.sm};
  border: 2px solid ${c=>{if(c.$selected)switch(c.$level){case"DEBUG":return t.muted;case"INFO":return t.accent;case"WARNING":return t.warning;case"ERROR":return t.danger;case"CRITICAL":return t.danger;default:return t.border}return t.border}};
  border-radius: 2;
  background-color: ${c=>{if(c.$selected)switch(c.$level){case"DEBUG":return`${t.muted}20`;case"INFO":return`${t.accent}20`;case"WARNING":return`${t.warning}20`;case"ERROR":return`${t.danger}20`;case"CRITICAL":return`${t.danger}30`;default:return t.backgroundSoft}return t.background}};
  color: ${c=>{if(c.$selected)switch(c.$level){case"DEBUG":return t.muted;case"INFO":return t.accent;case"WARNING":return t.warning;case"ERROR":return t.danger;case"CRITICAL":return t.danger;default:return t.foreground}return t.muted}};
  font-family: 'Consolas';
  font-size: 11px;
  font-weight: ${c=>c.$selected?600:400};
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 70px;
  text-align: center;
  
  &:hover {
    border-color: ${c=>{switch(c.$level){case"DEBUG":return t.muted;case"INFO":return t.accent;case"WARNING":return t.warning;case"ERROR":return t.danger;case"CRITICAL":return t.danger;default:return t.accent}}};
    background-color: ${c=>{if(!c.$selected)switch(c.$level){case"DEBUG":return`${t.muted}10`;case"INFO":return`${t.accent}10`;case"WARNING":return`${t.warning}10`;case"ERROR":return`${t.danger}10`;case"CRITICAL":return`${t.danger}15`;default:return t.backgroundSoft}return c.$selected?void 0:t.backgroundSoft}};
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:focus {
    outline: 2px solid ${t.accent};
    outline-offset: 2px;
  }
`,Lt=g.div`
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
`,kt=xt`
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
`,Rt=g.div`
  margin-bottom: 2px;
  padding: ${o.spacing.xs} 0;
  border-left: ${c=>c.$isNew?"3px":"2px"} solid ${c=>{switch(c.$level){case"ERROR":case"CRITICAL":return t.foreground;case"WARNING":return t.muted;case"INFO":return t.accent;case"DEBUG":return t.muted;default:return t.muted}}};
  padding-left: ${o.spacing.sm};
  position: relative;
  font-family: 'Consolas';
  font-size: 11px;
  ${c=>c.$isNew?`
    animation: ${kt} 1s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: opacity, transform, background-color;
  `:`
    transition: background-color 0.15s ease;
  `}
`,wt=g.span`
  color: ${t.muted};
  margin-right: ${o.spacing.sm};
  font-size: 11px;
  font-family: 'Consolas';
`,Ft=g.span`
  font-weight: 600;
  margin-right: ${o.spacing.sm};
  font-family: 'Consolas';
  font-size: 11px;
  color: ${c=>{switch(c.$level){case"ERROR":case"CRITICAL":return t.foreground;case"WARNING":return t.muted;case"INFO":return t.accent;case"DEBUG":return t.muted;default:return t.foreground}}};
`,It=g.span`
  color: ${t.muted};
  margin-right: ${o.spacing.sm};
  font-size: 11px;
  font-family: 'Consolas';
`,zt=g.span`
  color: ${t.muted};
  margin-right: ${o.spacing.sm};
  font-size: 11px;
  font-weight: 500;
  font-family: 'Consolas';
  background-color: ${t.backgroundSoft};
  padding: ${o.spacing.xs} ${o.spacing.xs};
  border-radius: 2;
  border: 1px solid ${t.border};
`,At=g.span`
  color: ${t.foreground};
  font-family: 'Consolas';
  font-size: 11px;
`,Bt=g.div`
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
`,We=g.span`
  color: ${t.muted};
  font-family: 'Consolas';
  font-size: 11px;
`;g.div`
  margin-top: ${o.spacing.md};
  padding: ${o.spacing.sm} ${o.spacing.md};
  background-color: ${t.backgroundSoft};
  border: 1px solid ${t.accent};
  border-radius: 2;
  color: ${t.accent};
  text-align: center;
  font-family: 'Consolas';
  font-size: 12px;
`;const Et=g.div`
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
`,Tt=g.div`
  background: ${t.background};
  padding: ${o.spacing.xxl};
  border-radius: 2;
  border: 2px solid ${t.border};
  max-width: 500px;
  text-align: center;
  font-family: 'Consolas';
  font-size: 12px;
`,Mt=()=>{const[c,se]=r.useState([]),[w,Ge]=r.useState(null),[Pe,he]=r.useState(!0),[O,D]=r.useState(null),[M,Ue]=r.useState(!0),[re,xe]=r.useState(1e4),[k,ie]=r.useState(["WARNING","ERROR"]),[H,ye]=r.useState(!0),[W,be]=r.useState("ALL"),[Y,ve]=r.useState(""),[ae,Me]=r.useState("ALL"),[He,Ye]=r.useState(["ALL"]),[Ve,Ke]=r.useState(["ALL"]),[V,je]=r.useState(""),[K,Ce]=r.useState(""),[E,qe]=r.useState(!0),[q,_e]=r.useState(!0),[_,Xe]=r.useState(!1),[le,Je]=r.useState(void 0),[te,Se]=r.useState(!1),[X,$e]=r.useState(!1),[Qe,ce]=r.useState(!1),[Ze,de]=r.useState(!1),[Nt,oe]=r.useState(5),[Le,ke]=r.useState(!1),[et,ge]=r.useState(!1),[tt,Re]=r.useState(!1),[y,ne]=r.useState(1),[j,we]=r.useState(1),[G,ot]=r.useState([]),[nt,fe]=r.useState(!1),[st,Fe]=r.useState(new Set),[F,Ie]=r.useState(null),[ze,Ae]=r.useState(!1),[J,rt]=r.useState("24h"),P=r.useRef(null),I=r.useRef(null),d=r.useRef(!0),Be=r.useRef([]),ue=r.useRef(!0),Ee=r.useRef(!0),A=r.useCallback(async()=>{if(!d.current)return;const n=Ee.current,s=Date.now(),i=300;try{Se(!0),D(null),n&&he(!0);const a=Oe(Y,200),[f,b]=await Promise.all([N.getLogs({lines:re,levels:k.length>0?k:void 0,distinct:H,category:W,function:ae,search:a,startDate:V,endDate:K,autoCleanup:E||void 0,deleteDebug:q||void 0,deleteDuplicates:_||void 0,deleteOlderThan:le||void 0}),N.getLogInfo()]);if(n){const m=Date.now()-s,v=Math.max(0,i-m);await new Promise(u=>setTimeout(u,v))}if(d.current){const m=f.logs||[],v=Be.current;if(!n&&v.length>0){const l=new Set(v.map(C=>C.id).filter(Boolean)),x=new Set(m.filter(C=>C.id&&!l.has(C.id)).map(C=>C.id));x.size>0&&(requestAnimationFrame(()=>{d.current&&(Fe(x),setTimeout(()=>{d.current&&Fe(new Set)},1500))}),ue.current&&P.current&&setTimeout(()=>{var C;(C=P.current)==null||C.scrollIntoView({behavior:"smooth"})},100))}Be.current=m,ot(m),Ge(b);const u=50,z=Math.ceil(m.length/u);we(z);const p=(y-1)*u,T=p+u;se(m.slice(p,T)),Ee.current=!1}}catch(a){d.current&&D(pe(a))}finally{d.current&&(he(!1),Se(!1))}},[re,k,H,W,ae,Y,V,K,y,E,q,_,le]);r.useEffect(()=>{(async()=>{try{if(!d.current)return;const[s,i]=await Promise.all([N.getCategories(),N.getFunctions()]);d.current&&(Ye(["ALL",...(s||[]).filter(Boolean)]),Ke(["ALL",...(i||[]).filter(Boolean)]))}catch(s){d.current&&console.error("Error loading filters:",s)}})()},[]);const me=r.useCallback(async()=>{try{Ae(!0);const n=await N.getLogChartData({period:J,bucket:J==="7d"?"day":"hour"});d.current&&Ie(n)}catch{d.current&&Ie(null)}finally{d.current&&Ae(!1)}},[J]);r.useEffect(()=>{me()},[me]),r.useEffect(()=>(d.current=!0,A(),()=>{d.current=!1}),[A]),r.useEffect(()=>{if(I.current&&(clearInterval(I.current),I.current=null),M&&d.current){oe(5),I.current=setInterval(()=>{d.current&&oe(s=>s<=1?5:s-1)},1e3);const n=setInterval(()=>{d.current&&(A(),ne(1),oe(5))},5e3);return()=>{clearInterval(n),I.current&&(clearInterval(I.current),I.current=null)}}else oe(5)},[M,A]),r.useEffect(()=>{if(G.length>0&&d.current){const s=Math.ceil(G.length/50);we(s);const i=(y-1)*50,a=i+50;se(G.slice(i,a))}},[G,y]),r.useEffect(()=>{var i;const n=(i=P.current)==null?void 0:i.parentElement;if(!n)return;const s=()=>{const{scrollTop:a,scrollHeight:f,clientHeight:b}=n,m=f-a-b<10;ue.current=m};return n.addEventListener("scroll",s),s(),()=>n.removeEventListener("scroll",s)},[c]),r.useEffect(()=>{var i;const n=(i=P.current)==null?void 0:i.parentElement;if(!n)return;const s=()=>{const{scrollTop:a,scrollHeight:f,clientHeight:b}=n,m=f-a-b<10;ue.current=m};return n.addEventListener("scroll",s),()=>n.removeEventListener("scroll",s)},[]),r.useEffect(()=>()=>{I.current&&clearInterval(I.current)},[]);const it=r.useCallback(()=>{var n;(n=P.current)==null||n.scrollIntoView({behavior:"smooth"})},[]),R=r.useCallback(n=>{n>=1&&n<=j&&n!==y&&(Re(!0),setTimeout(()=>{ne(n);const s=50,i=(n-1)*s,a=i+s;se(G.slice(i,a)),setTimeout(()=>Re(!1),200)},50))},[j,y,G]),at=r.useCallback(()=>R(1),[R]),lt=r.useCallback(()=>R(j),[R,j]),ct=r.useCallback(()=>R(y-1),[R,y]),dt=r.useCallback(()=>R(y+1),[R,y]),gt=r.useCallback(async()=>{try{if(!d.current)return;$e(!0),D(null),de(!1);const n=await N.clearLogs();d.current&&(ce(!1),de(!0),ne(1),await A(),setTimeout(()=>{d.current&&de(!1)},3e3))}catch(n){if(d.current){const s=pe(n);D(s),console.error("Error clearing logs:",n)}}finally{d.current&&$e(!1)}},[A]),ft=r.useCallback(()=>{xe(1e4),ie(["WARNING","ERROR"]),ye(!0),be("ALL"),ve(""),je(""),Ce(""),ne(1)},[]),ut=r.useCallback(async()=>{try{if(!d.current)return;ke(!0),ge(!1);const n=await N.getLogs({lines:1e4,levels:k.length>0?k:void 0,distinct:H,category:W,search:Oe(Y,200),startDate:V,endDate:K}),s=(n.logs||[]).map(f=>{const b=f.timestamp,m=`[${f.level}]`,v=f.function?`[${f.function}]`:"",u=f.message;return`${b} ${m} ${v} ${u}`.trim()}).join(`
`),a=`DataSync Logs - ${new Date().toLocaleString()}
Total Entries: ${(n.logs||[]).length}
Level Filter: ${k.length>0?k.join(", "):"ALL"}
Category Filter: ${W}
File: ${(w==null?void 0:w.filePath)||"Unknown"}
Size: ${w?mt(w.size||0):"Unknown"}
Last Modified: ${w!=null&&w.lastModified?Te(w.lastModified):"Unknown"}
${"=".repeat(80)}

`+s;await navigator.clipboard.writeText(a),d.current&&(ge(!0),setTimeout(()=>{d.current&&ge(!1)},3e3))}catch(n){d.current&&D(pe(n))}finally{d.current&&ke(!1)}},[k,H,W,Y,V,K,w]),mt=r.useCallback(n=>{if(n===0)return"0 Bytes";const s=1024,i=["Bytes","KB","MB","GB"],a=Math.floor(Math.log(n)/Math.log(s));return parseFloat((n/Math.pow(s,a)).toFixed(2))+" "+i[a]},[]),Te=r.useCallback(n=>new Date(n).toLocaleString(),[]);return Pe?e.jsx(yt,{variant:"table"}):O&&c.length===0?e.jsx(Ne,{children:e.jsxs("div",{style:{width:"100%",minHeight:"100vh",padding:o.spacing.lg,fontFamily:"Consolas",fontSize:12,color:t.foreground,backgroundColor:t.background,display:"flex",flexDirection:"column",gap:o.spacing.lg},children:[e.jsx("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:o.spacing.lg,paddingBottom:o.spacing.md,borderBottom:`2px solid ${t.accent}`},children:e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:t.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:t.accent,marginRight:o.spacing.sm},children:S.blockFull}),"LOGS"]})}),e.jsx("div",{style:{marginBottom:o.spacing.lg},children:e.jsxs(B,{title:"ERROR",children:[e.jsxs("div",{style:{padding:o.spacing.md,color:t.foreground,fontSize:12,fontFamily:"Consolas",background:t.backgroundSoft,borderRadius:2,border:`2px solid ${t.foreground}`,marginBottom:o.spacing.sm},children:["Error loading logs: ",O]}),e.jsx(h,{label:"Retry",onClick:A,variant:"primary"})]})})]})}):e.jsxs(Ne,{children:[e.jsxs("div",{style:{width:"100%",minHeight:"100vh",padding:o.spacing.lg,fontFamily:"Consolas",fontSize:12,color:t.foreground,backgroundColor:t.background,display:"flex",flexDirection:"column",gap:o.spacing.lg},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:o.spacing.lg,paddingBottom:o.spacing.md,borderBottom:`2px solid ${t.accent}`},children:[e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:t.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:t.accent,marginRight:o.spacing.sm},children:S.blockFull}),"LOGS"]}),e.jsx(h,{label:"Logs Info",onClick:()=>fe(!0),variant:"ghost"})]}),nt&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>fe(!1),children:e.jsx("div",{style:{width:"90%",maxWidth:1e3,maxHeight:"90vh",overflowY:"auto",fontFamily:"Consolas"},onClick:n=>n.stopPropagation(),className:"modal-scroll-container",children:e.jsx(B,{title:"LOGS VIEWER PLAYBOOK",children:e.jsxs("div",{style:{padding:o.spacing.md,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:o.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:[S.blockFull," OVERVIEW"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontFamily:"Consolas"},children:"The Logs Viewer provides comprehensive access to application logs stored in the database. Monitor system activity, debug issues, filter by level and category, search through entries, and manage log retention. All logs are stored in the metadata.logs table and can be exported, filtered, and cleared as needed."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:[S.blockFull," LOG LEVELS"]}),e.jsxs("div",{style:{marginLeft:o.spacing.md},children:[e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"DEBUG"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Detailed diagnostic information for debugging purposes. Typically used during development and troubleshooting. Can be filtered out in production environments."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"INFO"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"General informational messages about application flow and operations. Used to track normal application behavior and significant events."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.muted,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"WARNING"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Warning messages indicating potential issues that don't prevent the application from functioning but should be reviewed. May indicate deprecated features or configuration issues."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"ERROR"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Error messages indicating failures in operations that prevent specific functionality from working correctly. These require immediate attention."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"CRITICAL"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Critical errors that may cause the application to fail or become unstable. These require immediate investigation and resolution."})]})]})]}),e.jsxs("div",{style:{marginBottom:o.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:[S.blockFull," FILTERING & SEARCH"]}),e.jsxs("div",{style:{marginLeft:o.spacing.md},children:[e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Level Filter"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:'Filter logs by severity level (DEBUG, INFO, WARNING, ERROR, CRITICAL). Select "ALL" to view all levels. Useful for focusing on specific types of issues.'})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Category Filter"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:'Filter logs by category (e.g., DATABASE, API, AUTH, SYNC). Categories are automatically extracted from log entries. Select "ALL" to view all categories.'})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Function Filter"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:'Filter logs by function name. Useful for debugging specific functions or methods. Select "ALL" to view logs from all functions.'})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Search"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Search for specific text within log messages. The search is case-sensitive and searches through the entire log message content. Use this to find specific errors or events."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Date Range"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Filter logs by date range using Start Date and End Date. Useful for investigating issues that occurred during specific time periods. Leave empty to include all dates."})]})]})]}),e.jsxs("div",{style:{marginBottom:o.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:[S.blockFull," LOG MANAGEMENT"]}),e.jsxs("div",{style:{marginLeft:o.spacing.md},children:[e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Auto Refresh"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Automatically refresh logs every 5 seconds. Useful for monitoring real-time activity. The countdown timer shows when the next refresh will occur. Disable to stop automatic updates."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Auto Cleanup"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Automatically clean up logs based on configured rules during fetch operations. Options include deleting DEBUG logs, removing duplicates, and deleting logs older than a specified number of days."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Copy Logs"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Copy all filtered logs to clipboard with header information including total entries, filters applied, file path, size, and last modified date. Useful for sharing logs with support teams or for offline analysis."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Clear Logs"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Truncate the entire metadata.logs table, removing all log entries permanently. This operation cannot be undone. Use with caution, especially in production environments. A confirmation dialog will appear before clearing."})]})]})]}),e.jsxs("div",{style:{marginBottom:o.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:[S.blockFull," PAGINATION"]}),e.jsx("div",{style:{marginLeft:o.spacing.md},children:e.jsx("div",{style:{color:t.foreground,fontSize:11,fontFamily:"Consolas"},children:'Logs are paginated with 50 entries per page. Use the pagination controls to navigate between pages. The "Go to Latest" button takes you to page 1 (most recent logs). You can also jump to a specific page number using the "Go to" input field.'})})]}),e.jsxs("div",{style:{marginTop:o.spacing.md,padding:o.spacing.sm,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:t.muted,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:[S.blockSemi," Best Practices"]}),e.jsxs("div",{style:{fontSize:11,color:t.foreground,fontFamily:"Consolas"},children:["• Use filters to narrow down logs when investigating specific issues",e.jsx("br",{}),"• Enable auto-cleanup in production to manage log table size",e.jsx("br",{}),"• Regularly review and clear old logs to maintain performance",e.jsx("br",{}),"• Export logs before clearing for audit purposes",e.jsx("br",{}),"• Monitor ERROR and CRITICAL levels regularly",e.jsx("br",{}),"• Use date ranges to investigate time-specific issues",e.jsx("br",{}),"• Keep DEBUG logs disabled in production for better performance"]})]}),e.jsx("div",{style:{marginTop:o.spacing.md,textAlign:"right"},children:e.jsx(h,{label:"Close",onClick:()=>fe(!1),variant:"ghost"})})]})})})}),O&&e.jsx("div",{style:{marginBottom:o.spacing.lg},children:e.jsx(B,{title:"ERROR",children:e.jsx("div",{style:{padding:o.spacing.md,color:t.foreground,fontSize:12,fontFamily:"Consolas",background:t.backgroundSoft,borderRadius:2,border:`2px solid ${t.foreground}`},children:O})})}),e.jsx("div",{style:{marginBottom:o.spacing.lg},children:e.jsxs(B,{title:"LOG CHARTS",children:[e.jsxs("div",{style:{display:"flex",flexWrap:"wrap",alignItems:"center",gap:o.spacing.sm,marginBottom:o.spacing.md},children:[e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:6,fontSize:11,color:t.foreground,fontFamily:"Consolas"},children:["Period:",e.jsxs("select",{value:J,onChange:n=>rt(n.target.value),style:{padding:"4px 8px",fontSize:11,border:`1px solid ${t.border}`,background:t.background,color:t.foreground,fontFamily:"Consolas",borderRadius:2},children:[e.jsx("option",{value:"24h",children:"Last 24 hours"}),e.jsx("option",{value:"7d",children:"Last 7 days"})]})]}),e.jsx(h,{label:"Refresh charts",onClick:me,variant:"ghost",disabled:ze})]}),ze&&!F?e.jsx("div",{style:{padding:o.spacing.xl,textAlign:"center",color:t.muted,fontSize:12,fontFamily:"Consolas"},children:"Loading chart data…"}):F?e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))",gap:o.spacing.lg},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,fontWeight:600,color:t.accent,marginBottom:8,fontFamily:"Consolas"},children:"Logs over time (by level)"}),F.timeSeries.length===0?e.jsx("div",{style:{padding:24,textAlign:"center",color:t.muted,fontSize:11,border:`1px solid ${t.border}`,borderRadius:2},children:"No data in period"}):(()=>{const n={DEBUG:t.muted,INFO:t.accent,WARNING:"#6b7280",ERROR:t.foreground,CRITICAL:t.foreground},s={top:16,right:16,bottom:28,left:36},i=400,a=180,f=i-s.left-s.right,b=a-s.top-s.bottom,m=["DEBUG","INFO","WARNING","ERROR","CRITICAL"],v=Math.max(1,...F.timeSeries.flatMap(l=>m.map(x=>l[x]||0))),u=F.timeSeries.map(l=>l.bucket),z=l=>s.left+l/Math.max(1,u.length-1)*f,p=l=>s.top+b-l/v*b,T=l=>{const x=new Date(l);return J==="7d"?x.toLocaleDateString(void 0,{month:"short",day:"numeric"}):x.toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit"})};return e.jsxs("svg",{width:i,height:a,style:{display:"block",border:`1px solid ${t.border}`,borderRadius:2,backgroundColor:t.background},children:[e.jsx("line",{x1:s.left,y1:s.top,x2:s.left,y2:a-s.bottom,stroke:t.border,strokeWidth:1}),e.jsx("line",{x1:s.left,y1:a-s.bottom,x2:i-s.right,y2:a-s.bottom,stroke:t.border,strokeWidth:1}),m.map(l=>{const x=F.timeSeries.map((C,pt)=>{const ht=C[l]||0;return`${z(pt)},${p(ht)}`}).join(" ");return e.jsx("polyline",{points:x,fill:"none",stroke:n[l]||t.muted,strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},l)}),u.map((l,x)=>{const C=u.length<=8?1:Math.max(1,Math.floor(u.length/6));return x%C!==0&&x!==u.length-1?null:e.jsx("text",{x:z(x),y:a-s.bottom+14,textAnchor:"middle",fontSize:9,fill:t.muted,children:T(l)},`${l}-${x}`)}),e.jsx("g",{transform:`translate(${i-s.right-70}, ${s.top})`,children:m.map((l,x)=>e.jsxs("g",{children:[e.jsx("line",{x1:0,y1:x*14,x2:10,y2:x*14,stroke:n[l]||t.muted,strokeWidth:2}),e.jsx("text",{x:14,y:x*14+4,fontSize:9,fill:t.foreground,children:l})]},l))})]})})()]}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,fontWeight:600,color:t.accent,marginBottom:8,fontFamily:"Consolas"},children:"Count by level"}),(()=>{const n={DEBUG:t.muted,INFO:t.accent,WARNING:"#6b7280",ERROR:t.foreground,CRITICAL:t.foreground},i=["DEBUG","INFO","WARNING","ERROR","CRITICAL"].map(p=>({level:p,count:F.byLevel[p]||0})).filter(p=>p.count>0),a=Math.max(1,...i.map(p=>p.count)),f=20,b=4,m=72,v=140,u=Math.max(80,i.length*(f+b)-b+16),z=m+v+48;return e.jsx("svg",{width:z,height:u,style:{display:"block",border:`1px solid ${t.border}`,borderRadius:2,backgroundColor:t.background},children:i.length===0?e.jsx("text",{x:z/2,y:u/2,textAnchor:"middle",fontSize:11,fill:t.muted,children:"No data"}):i.map((p,T)=>{const l=12+T*(f+b),x=p.count/a*v;return e.jsxs("g",{children:[e.jsx("text",{x:4,y:l+f-5,fontSize:10,fill:t.foreground,children:p.level}),e.jsx("rect",{x:m,y:l,width:v,height:f-2,fill:t.backgroundSoft,stroke:t.border,rx:2}),e.jsx("rect",{x:m,y:l,width:x,height:f-2,fill:n[p.level]||t.muted,rx:2}),e.jsx("text",{x:m+v+6,y:l+f-5,fontSize:10,fill:t.foreground,children:p.count})]},p.level)})})})()]}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,fontWeight:600,color:t.accent,marginBottom:8,fontFamily:"Consolas"},children:"Top categories"}),!F.byCategory||F.byCategory.length===0?e.jsx("div",{style:{padding:24,textAlign:"center",color:t.muted,fontSize:11,border:`1px solid ${t.border}`,borderRadius:2},children:"No data"}):(()=>{const n=F.byCategory.slice(0,8),s=Math.max(1,...n.map(u=>u.count)),i=18,a=4,f=100,b=120,m=n.length*(i+a)-a+16,v=f+b+48;return e.jsx("svg",{width:v,height:m,style:{display:"block",border:`1px solid ${t.border}`,borderRadius:2,backgroundColor:t.background},children:n.map((u,z)=>{const p=12+z*(i+a),T=u.count/s*b,l=(u.category||"").length>14?(u.category||"").slice(0,12)+"…":u.category||"";return e.jsxs("g",{children:[e.jsx("text",{x:4,y:p+i-4,fontSize:9,fill:t.foreground,children:l}),e.jsx("rect",{x:f,y:p,width:b,height:i-2,fill:t.backgroundSoft,stroke:t.border,rx:2}),e.jsx("rect",{x:f,y:p,width:T,height:i-2,fill:t.accent,rx:2,opacity:.85}),e.jsx("text",{x:f+b+6,y:p+i-4,fontSize:9,fill:t.foreground,children:u.count})]},u.category)})})})()]})]}):e.jsx("div",{style:{padding:o.spacing.md,color:t.muted,fontSize:11,fontFamily:"Consolas"},children:"Chart data unavailable."})]})}),e.jsxs("div",{style:{display:"flex",flexDirection:"row",gap:o.spacing.lg,alignItems:"flex-start",flex:1,minHeight:0,width:"100%"},children:[e.jsx("div",{style:{width:420,minWidth:420,flexShrink:0,position:"sticky",top:o.spacing.lg,maxHeight:"calc(100vh - 100px)",overflowY:"auto"},children:e.jsxs(B,{title:"LOG CONTROLS",children:[e.jsxs(bt,{children:[e.jsxs(Q,{children:[e.jsx(Z,{children:"Fetch & levels"}),e.jsxs($,{children:[e.jsx(L,{children:"Lines to show"}),e.jsx(U,{type:"number",value:re,onChange:n=>xe(Math.max(10,parseInt(n.target.value)||1e4)),min:"10",max:"100000"})]}),e.jsxs(vt,{children:[e.jsx(L,{children:"Log Levels"}),e.jsx(St,{children:["DEBUG","INFO","WARNING","ERROR","CRITICAL"].map(n=>{const s=k.includes(n);return e.jsx($t,{type:"button",$level:n,$selected:s,onClick:()=>{ie(s?k.filter(i=>i!==n):[...k,n])},title:`${s?"Deselect":"Select"} ${n} level logs`,children:n},n)})})]}),e.jsx($,{children:e.jsxs(jt,{children:[e.jsx(Ct,{type:"checkbox",checked:H,onChange:n=>ye(n.target.checked)}),"Distinct messages (most recent only)"]})})]}),e.jsxs(Q,{children:[e.jsx(Z,{children:"Filters"}),e.jsxs(ee,{children:[e.jsxs($,{children:[e.jsx(L,{children:"Category"}),e.jsx(De,{value:W,onChange:n=>be(n.target.value),children:He.map(n=>e.jsx("option",{value:n,children:n},n))})]}),e.jsxs($,{children:[e.jsx(L,{children:"Function"}),e.jsx(De,{value:ae,onChange:n=>Me(n.target.value),children:Ve.map(n=>e.jsx("option",{value:n,children:n},n))})]})]}),e.jsxs($,{children:[e.jsx(L,{children:"Search"}),e.jsx(U,{type:"text",value:Y,onChange:n=>ve(n.target.value),placeholder:"Search in logs..."})]})]}),e.jsxs(Q,{children:[e.jsx(Z,{children:"Date range"}),e.jsxs(ee,{children:[e.jsxs($,{children:[e.jsx(L,{children:"Start"}),e.jsx(U,{type:"datetime-local",value:V,onChange:n=>je(n.target.value)})]}),e.jsxs($,{children:[e.jsx(L,{children:"End"}),e.jsx(U,{type:"datetime-local",value:K,onChange:n=>Ce(n.target.value)})]})]})]}),e.jsxs(Q,{children:[e.jsx(Z,{children:"Refresh & cleanup"}),e.jsx(ee,{children:e.jsxs($,{children:[e.jsx(L,{children:"Auto Refresh"}),e.jsx(h,{label:M?"ON":"OFF",onClick:()=>Ue(!M),variant:M?"primary":"ghost"})]})}),e.jsx(ee,{children:e.jsxs($,{children:[e.jsx(L,{children:"Auto Cleanup"}),e.jsx(h,{label:E?"ON":"OFF",onClick:()=>qe(!E),variant:E?"primary":"ghost"})]})}),E&&e.jsxs(ee,{children:[e.jsxs($,{children:[e.jsx(L,{children:"Delete DEBUG"}),e.jsx(h,{label:q?"YES":"NO",onClick:()=>_e(!q),variant:q?"primary":"ghost"})]}),e.jsxs($,{children:[e.jsx(L,{children:"Delete duplicates"}),e.jsx(h,{label:_?"YES":"NO",onClick:()=>Xe(!_),variant:_?"primary":"ghost"})]})]}),E&&e.jsxs($,{children:[e.jsx(L,{children:"Delete older than (days)"}),e.jsx(U,{type:"number",value:le||"",onChange:n=>{const s=n.target.value;Je(s?parseInt(s):void 0)},placeholder:"Optional",min:"1"})]})]}),e.jsxs(Q,{children:[e.jsx(Z,{children:"Actions"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:o.spacing.sm},children:[e.jsx(h,{label:te?"Refreshing...":"Refresh Now",onClick:A,disabled:te,variant:"primary"}),e.jsx(h,{label:"Clear Filters",onClick:ft,variant:"ghost"}),e.jsx(h,{label:"Scroll to Bottom",onClick:it,variant:"ghost"}),e.jsx(h,{label:"Go to Latest",onClick:()=>R(1),variant:"ghost"}),e.jsx(h,{label:Le?"Copying...":"Copy Logs",onClick:ut,disabled:Le||te,variant:"ghost"}),e.jsx(h,{label:X?"Clearing...":"Clear Logs",onClick:()=>ce(!0),disabled:X||te,variant:"ghost"})]})]})]}),et&&e.jsx(B,{title:"SUCCESS",children:e.jsxs("div",{style:{color:t.accent,fontFamily:"Consolas",fontSize:12,padding:`${o.spacing.sm} 0`},children:[S.blockFull," Logs copied to clipboard successfully!"]})}),Ze&&e.jsx(B,{title:"SUCCESS",children:e.jsxs("div",{style:{color:t.accent,fontFamily:"Consolas",fontSize:12,padding:`${o.spacing.sm} 0`},children:[S.blockFull," All logs cleared successfully!"]})})]})}),e.jsx("div",{style:{flex:1,minWidth:0,display:"flex",flexDirection:"column"},children:e.jsxs(B,{title:"LOG ENTRIES (DB)",children:[e.jsxs(Lt,{$isTransitioning:tt,children:[c.map((n,s)=>{const i=n.id?st.has(n.id):!1;return e.jsxs(Rt,{$level:n.level,$category:n.category||"SYSTEM",$isNew:i,children:[e.jsx(wt,{children:n.timestamp?Te(n.timestamp):""}),e.jsxs(Ft,{$level:n.level,children:["[",(n.level||"").toUpperCase(),"]"]}),n.category&&e.jsxs(zt,{$category:n.category,children:["[",(n.category||"").toUpperCase(),"]"]}),n.function&&e.jsxs(It,{children:["[",n.function,"]"]}),e.jsx(At,{children:n.message})]},n.id||s)}),e.jsx("div",{ref:P})]}),j>1&&e.jsxs(Bt,{children:[e.jsx(h,{label:"««",onClick:at,disabled:y===1,variant:"ghost"}),e.jsx(h,{label:"«",onClick:ct,disabled:y===1,variant:"ghost"}),Array.from({length:Math.min(20,j)},(n,s)=>{const a=Math.max(1,y-9)+s;return a>j?null:e.jsx(h,{label:a.toString(),onClick:()=>R(a),variant:y===a?"primary":"ghost"},a)}),j>20&&y<j-9&&e.jsx(We,{style:{color:t.muted,fontSize:11,fontFamily:"Consolas"},children:"..."}),e.jsx(h,{label:"»",onClick:dt,disabled:y===j,variant:"ghost"}),e.jsx(h,{label:"»»",onClick:lt,disabled:y===j,variant:"ghost"}),e.jsxs(We,{children:["Page ",y," of ",j]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:o.spacing.xs},children:[e.jsx("span",{style:{fontSize:11,color:t.muted,fontFamily:"Consolas"},children:"Go to:"}),e.jsx(U,{type:"number",min:"1",max:j,style:{width:"60px",padding:`${o.spacing.xs} ${o.spacing.sm}`,fontSize:11,fontFamily:"Consolas"},onKeyPress:n=>{if(n.key==="Enter"){const s=parseInt(n.target.value);s>=1&&s<=j&&(R(s),n.target.value="")}},placeholder:y.toString(),"aria-label":"Go to page number"})]})]})]})})]}),Qe&&e.jsx(Et,{children:e.jsxs(Tt,{style:{background:t.background,padding:o.spacing.xxl,borderRadius:2,border:`2px solid ${t.border}`,maxWidth:500,textAlign:"center",fontFamily:"Consolas",fontSize:12},children:[e.jsxs("h3",{style:{margin:0,marginBottom:o.spacing.lg,color:t.foreground,fontSize:14,fontFamily:"Consolas",fontWeight:600},children:[S.blockFull," CLEAR LOGS CONFIRMATION"]}),e.jsxs("p",{style:{marginBottom:o.spacing.lg,lineHeight:1.5,color:t.foreground,fontFamily:"Consolas",fontSize:12},children:["This action will ",e.jsx("strong",{children:"TRUNCATE"})," the entire database table:",e.jsx("br",{}),e.jsx("br",{}),S.blockFull," ",e.jsx("strong",{children:"metadata.logs"}),e.jsx("br",{}),e.jsx("br",{}),"All log entries will be permanently removed from the table.",e.jsx("br",{}),e.jsx("br",{}),e.jsx("strong",{style:{color:t.foreground},children:"This operation cannot be undone!"})]}),O&&e.jsxs("div",{style:{marginBottom:o.spacing.md,padding:o.spacing.sm,backgroundColor:t.backgroundSoft,border:`1px solid ${t.foreground}`,borderRadius:2,color:t.foreground,fontSize:11,fontFamily:"Consolas"},children:["Error: ",O]}),e.jsxs("div",{style:{display:"flex",gap:o.spacing.md,justifyContent:"center"},children:[e.jsx(h,{label:"Cancel",onClick:()=>{ce(!1),D(null)},disabled:X,variant:"ghost"}),e.jsx(h,{label:X?"Clearing...":"Clear Logs",onClick:gt,disabled:X,variant:"ghost"})]})]})})]}),e.jsx("style",{children:`
        .modal-scroll-container::-webkit-scrollbar {
          width: 0px;
          display: none;
        }
        
        .modal-scroll-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `})]})};export{Mt as default};
