import{f as l,t as a,b as o,r as n,o as w,j as e,e as B}from"./index-75d7470b.js";import{e as J}from"./errorHandler-5ea9ae85.js";import{s as pe}from"./validation-24839588.js";import{A as M}from"./AsciiPanel-9f053981.js";import{A as d}from"./AsciiButton-446d8430.js";import{S as Ye}from"./SkeletonLoader-530eacc4.js";l.div`
  margin-bottom: ${a.spacing.xxl};
  padding: ${a.spacing.lg};
  border: 1px solid ${o.border};
  border-radius: 2px;
  background-color: ${o.backgroundSoft};
  transition: all ${a.transitions.normal};
  animation: slideUp 0.25s ease-out;
  animation-fill-mode: both;
  font-family: "Consolas";
  font-size: 12px;
  
  &:nth-child(1) { animation-delay: 0.05s; }
  &:nth-child(2) { animation-delay: 0.1s; }
`;l.h2`
  margin: 0;
  margin-bottom: ${a.spacing.md};
  font-size: 14px;
  font-family: "Consolas";
  color: ${o.accent};
  border-bottom: 1px solid ${o.border};
  padding-bottom: 8px;
  font-weight: 600;
`;const He=l.div`
  display: flex;
  gap: ${a.spacing.lg};
  margin-bottom: ${a.spacing.lg};
  padding: ${a.spacing.lg};
  background-color: ${o.background};
  border: 1px solid ${o.border};
  border-radius: 2px;
  flex-wrap: wrap;
  align-items: end;
  animation: slideUp 0.25s ease-out;
  animation-delay: 0.08s;
  animation-fill-mode: both;
  font-family: "Consolas";
  font-size: 12px;
`,f=l.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 120px;
`,x=l.label`
  font-size: 12px;
  font-weight: bold;
  color: ${o.foreground};
  font-family: "Consolas";
`,Q=l.select`
  padding: 8px 12px;
  border: 1px solid ${o.border};
  border-radius: 2px;
  background-color: ${o.background};
  font-family: "Consolas";
  font-size: 12px;
  transition: all ${a.transitions.normal};
  cursor: pointer;

  &:hover {
    border-color: rgba(10, 25, 41, 0.3);
  }

  &:focus {
    outline: none;
    border-color: ${a.colors.primary.main};
    box-shadow: 0 0 0 3px rgba(10, 25, 41, 0.1);
  }
`,I=l.input`
  padding: 8px 12px;
  border: 1px solid ${a.colors.border.medium};
  border-radius: ${a.borderRadius.md};
  font-family: ${a.fonts.primary};
  font-size: 1em;
  width: 100px;
  transition: all ${a.transitions.normal};

  &:hover {
    border-color: rgba(10, 25, 41, 0.3);
  }

  &:focus {
    outline: none;
    border-color: ${a.colors.primary.main};
    box-shadow: 0 0 0 3px rgba(10, 25, 41, 0.1);
    transform: translateY(-1px);
  }
`,Ke=l.div`
  flex: 1;
  border: 1px solid ${o.border};
  border-radius: 2px;
  background-color: ${o.background};
  color: ${o.foreground};
  overflow-y: auto;
  padding: ${a.spacing.md};
  font-size: 11px;
  font-family: "Consolas";
  line-height: 1.6;
  max-height: 500px;
  transition: all ${a.transitions.normal};
  animation: ${y=>y.$isTransitioning?"pageTransition 0.2s ease-out":"none"};
`,Ve=l.div`
  margin-bottom: 2px;
  padding: 4px 0;
  border-left: 2px solid ${y=>{switch(y.$level){case"ERROR":case"CRITICAL":return o.danger;case"WARNING":return o.warning;case"INFO":return o.accent;case"DEBUG":return o.muted;default:return o.muted}}};
  padding-left: 8px;
  position: relative;
  transition: all 0.15s ease;
  font-family: "Consolas";
  font-size: 11px;

  &:hover {
    background-color: ${o.backgroundSoft};
    transform: translateX(2px);
  }
`,Xe=l.span`
  color: ${o.muted};
  margin-right: 10px;
  font-size: 11px;
  font-family: "Consolas";
`,_e=l.span`
  font-weight: bold;
  margin-right: 10px;
  font-family: "Consolas";
  font-size: 11px;
  color: ${y=>{switch(y.$level){case"ERROR":case"CRITICAL":return o.danger;case"WARNING":return o.warning;case"INFO":return o.accent;case"DEBUG":return o.muted;default:return o.foreground}}};
`,qe=l.span`
  color: ${o.muted};
  margin-right: 10px;
  font-size: 11px;
  font-family: "Consolas";
`,Je=l.span`
  color: ${o.muted};
  margin-right: 10px;
  font-size: 11px;
  font-weight: 500;
  font-family: "Consolas";
  background-color: ${o.backgroundSoft};
  padding: 2px 6px;
  border-radius: 2px;
  border: 1px solid ${o.border};
`,Qe=l.span`
  color: ${o.foreground};
  font-family: "Consolas";
  font-size: 11px;
`,Ze=l.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${a.spacing.sm};
  margin-top: ${a.spacing.md};
  padding: ${a.spacing.md};
  background-color: ${o.backgroundSoft};
  border: 1px solid ${o.border};
  border-radius: 2px;
  font-family: "Consolas";
  font-size: 12px;
`,he=l.span`
  color: ${o.muted};
  font-family: "Consolas";
  font-size: 11px;
`;l.div`
  margin-top: ${a.spacing.md};
  padding: ${a.spacing.sm} ${a.spacing.md};
  background-color: ${o.success}20;
  border: 1px solid ${o.success};
  border-radius: 2px;
  color: ${o.success};
  text-align: center;
  font-family: "Consolas";
  font-size: 12px;
`;const et=l.div`
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
`,tt=l.div`
  background: ${o.background};
  padding: ${a.spacing.xxl};
  border-radius: 2px;
  border: 2px solid ${o.border};
  max-width: 500px;
  text-align: center;
  font-family: "Consolas";
  font-size: 12px;
`,lt=()=>{const[y,Y]=n.useState([]),[h,me]=n.useState(null),[be,Z]=n.useState(!0),[N,F]=n.useState(null),[v,ye]=n.useState(!0),[H,ee]=n.useState(1e4),[S,te]=n.useState("ALL"),[L,oe]=n.useState("ALL"),[T,ne]=n.useState(""),[K,Ce]=n.useState("ALL"),[je,ve]=n.useState(["ALL"]),[Se,Le]=n.useState(["ALL"]),[z,se]=n.useState(""),[A,ae]=n.useState(""),[$,$e]=n.useState(!0),[D,ke]=n.useState(!0),[P,Re]=n.useState(!1),[V,we]=n.useState(void 0),[G,re]=n.useState(!1),[E,ie]=n.useState(!1),[Ie,X]=n.useState(!1),[Fe,U]=n.useState(5),[le,ce]=n.useState(!1),[Te,_]=n.useState(!1),[ze,de]=n.useState(!1),[i,W]=n.useState(1),[u,ue]=n.useState(1),[k,Ae]=n.useState([]),ge=n.useRef(null),m=n.useRef(null),r=n.useRef(!0),fe=n.useRef(!0),C=n.useCallback(async()=>{if(!r.current)return;const t=fe.current,s=Date.now(),g=300;try{re(!0),F(null),t&&Z(!0);const c=pe(T,200),[b,q]=await Promise.all([w.getLogs({lines:H,level:S,category:L,function:K,search:c,startDate:z,endDate:A,autoCleanup:$||void 0,deleteDebug:D||void 0,deleteDuplicates:P||void 0,deleteOlderThan:V||void 0}),w.getLogInfo()]);if(t){const j=Date.now()-s,O=Math.max(0,g-j);await new Promise(R=>setTimeout(R,O))}if(r.current){Ae(b.logs||[]),me(q);const j=50,O=Math.ceil((b.logs||[]).length/j);ue(O);const R=(i-1)*j,We=R+j;Y((b.logs||[]).slice(R,We)),fe.current=!1}}catch(c){r.current&&F(J(c))}finally{r.current&&(Z(!1),re(!1))}},[H,S,L,K,T,z,A,i,$,D,P,V]);n.useEffect(()=>{(async()=>{try{if(!r.current)return;const[s,g]=await Promise.all([w.getCategories(),w.getFunctions()]);r.current&&(ve(["ALL",...(s||[]).filter(Boolean)]),Le(["ALL",...(g||[]).filter(Boolean)]))}catch(s){r.current&&console.error("Error loading filters:",s)}})()},[]),n.useEffect(()=>(r.current=!0,C(),()=>{r.current=!1}),[C]),n.useEffect(()=>{if(m.current&&(clearInterval(m.current),m.current=null),v&&r.current){U(5),m.current=setInterval(()=>{r.current&&U(s=>s<=1?5:s-1)},1e3);const t=setInterval(()=>{r.current&&(C(),W(1),U(5))},5e3);return()=>{clearInterval(t),m.current&&(clearInterval(m.current),m.current=null)}}else U(5)},[v,C]),n.useEffect(()=>{if(k.length>0&&r.current){const s=Math.ceil(k.length/50);ue(s);const g=(i-1)*50,c=g+50;Y(k.slice(g,c))}},[k,i]),n.useEffect(()=>()=>{m.current&&clearInterval(m.current)},[]);const De=n.useCallback(()=>{var t;(t=ge.current)==null||t.scrollIntoView({behavior:"smooth"})},[]),p=n.useCallback(t=>{t>=1&&t<=u&&t!==i&&(de(!0),setTimeout(()=>{W(t);const s=50,g=(t-1)*s,c=g+s;Y(k.slice(g,c)),setTimeout(()=>de(!1),200)},50))},[u,i,k]),Pe=n.useCallback(()=>p(1),[p]),Ee=n.useCallback(()=>p(u),[p,u]),Oe=n.useCallback(()=>p(i-1),[p,i]),Be=n.useCallback(()=>p(i+1),[p,i]),Me=n.useCallback(async()=>{try{if(!r.current)return;ie(!0),F(null),await w.clearLogs(),r.current&&(X(!1),W(1),await C())}catch(t){r.current&&F(J(t))}finally{r.current&&ie(!1)}},[C]),Ne=n.useCallback(()=>{ee(1e4),te("ALL"),oe("ALL"),ne(""),se(""),ae(""),W(1)},[]),Ge=n.useCallback(async()=>{try{if(!r.current)return;ce(!0),_(!1);const t=await w.getLogs({lines:1e4,level:S,category:L,search:pe(T,200),startDate:z,endDate:A}),s=(t.logs||[]).map(b=>{const q=b.timestamp,j=`[${b.level}]`,O=b.function?`[${b.function}]`:"",R=b.message;return`${q} ${j} ${O} ${R}`.trim()}).join(`
`),c=`DataSync Logs - ${new Date().toLocaleString()}
Total Entries: ${(t.logs||[]).length}
Level Filter: ${S}
Category Filter: ${L}
File: ${(h==null?void 0:h.filePath)||"Unknown"}
Size: ${h?Ue(h.size||0):"Unknown"}
Last Modified: ${h!=null&&h.lastModified?xe(h.lastModified):"Unknown"}
${"=".repeat(80)}

`+s;await navigator.clipboard.writeText(c),r.current&&(_(!0),setTimeout(()=>{r.current&&_(!1)},3e3))}catch(t){r.current&&F(J(t))}finally{r.current&&ce(!1)}},[S,L,T,z,A,h]),Ue=n.useCallback(t=>{if(t===0)return"0 Bytes";const s=1024,g=["Bytes","KB","MB","GB"],c=Math.floor(Math.log(t)/Math.log(s));return parseFloat((t/Math.pow(s,c)).toFixed(2))+" "+g[c]},[]),xe=n.useCallback(t=>new Date(t).toLocaleString(),[]);return be?e.jsx(Ye,{variant:"table"}):N&&y.length===0?e.jsxs("div",{style:{width:"100%",minHeight:"100vh",padding:"20px",fontFamily:"Consolas",fontSize:12,color:o.foreground,backgroundColor:o.background,display:"flex",flexDirection:"column",gap:20},children:[e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:"0 0 20px 0",color:o.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:o.accent,marginRight:8},children:B.blockFull}),"LOGS"]}),e.jsx("div",{style:{marginBottom:20},children:e.jsxs(M,{title:"ERROR",children:[e.jsxs("div",{style:{padding:"12px",color:o.danger,fontSize:12,fontFamily:"Consolas",marginBottom:12},children:["Error loading logs: ",N]}),e.jsx(d,{label:"Retry",onClick:C,variant:"primary"})]})})]}):e.jsxs("div",{style:{width:"100%",minHeight:"100vh",padding:"20px",fontFamily:"Consolas",fontSize:12,color:o.foreground,backgroundColor:o.background,display:"flex",flexDirection:"column",gap:20},children:[e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:"0 0 20px 0",color:o.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:o.accent,marginRight:8},children:B.blockFull}),"LOGS"]}),N&&e.jsx("div",{style:{marginBottom:20},children:e.jsx(M,{title:"ERROR",children:e.jsx("div",{style:{padding:"12px",color:o.danger,fontSize:12,fontFamily:"Consolas"},children:N})})}),e.jsxs(M,{title:"LOG CONTROLS",children:[e.jsxs(He,{children:[e.jsxs(f,{children:[e.jsx(x,{children:"Lines to show:"}),e.jsx(I,{type:"number",value:H,onChange:t=>ee(Math.max(10,parseInt(t.target.value)||1e4)),min:"10",max:"100000"})]}),e.jsxs(f,{children:[e.jsx(x,{children:"Log Level:"}),e.jsxs(Q,{value:S,onChange:t=>te(t.target.value),children:[e.jsx("option",{value:"ALL",children:"All Levels"}),e.jsx("option",{value:"DEBUG",children:"DEBUG"}),e.jsx("option",{value:"INFO",children:"INFO"}),e.jsx("option",{value:"WARNING",children:"WARNING"}),e.jsx("option",{value:"ERROR",children:"ERROR"}),e.jsx("option",{value:"CRITICAL",children:"CRITICAL"})]})]}),e.jsxs(f,{children:[e.jsx(x,{children:"Category:"}),e.jsx(Q,{value:L,onChange:t=>oe(t.target.value),children:je.map(t=>e.jsx("option",{value:t,children:t},t))})]}),e.jsxs(f,{children:[e.jsx(x,{children:"Function:"}),e.jsx(Q,{value:K,onChange:t=>Ce(t.target.value),children:Se.map(t=>e.jsx("option",{value:t,children:t},t))})]}),e.jsxs(f,{children:[e.jsx(x,{children:"Search:"}),e.jsx(I,{type:"text",value:T,onChange:t=>ne(t.target.value),placeholder:"Search in logs...",style:{width:"150px"}})]}),e.jsxs(f,{children:[e.jsx(x,{children:"Start Date:"}),e.jsx(I,{type:"datetime-local",value:z,onChange:t=>se(t.target.value),style:{width:"180px"}})]}),e.jsxs(f,{children:[e.jsx(x,{children:"End Date:"}),e.jsx(I,{type:"datetime-local",value:A,onChange:t=>ae(t.target.value),style:{width:"180px"}})]}),e.jsxs(f,{children:[e.jsx(x,{children:"Auto Refresh:"}),e.jsx(d,{label:v?"ON":"OFF",onClick:()=>ye(!v),variant:v?"primary":"ghost"})]}),v&&e.jsxs(f,{children:[e.jsx(x,{children:"Next Refresh:"}),e.jsxs("div",{style:{padding:"8px 12px",border:`1px solid ${o.border}`,borderRadius:2,backgroundColor:o.background,textAlign:"center",fontFamily:"Consolas",fontSize:12,color:o.foreground,minWidth:"60px"},children:[Fe,"s"]})]}),e.jsxs(f,{children:[e.jsx(x,{children:"Auto Cleanup:"}),e.jsx(d,{label:$?"ON":"OFF",onClick:()=>$e(!$),variant:$?"primary":"ghost"})]}),$&&e.jsxs(e.Fragment,{children:[e.jsxs(f,{children:[e.jsx(x,{children:"Delete DEBUG:"}),e.jsx(d,{label:D?"YES":"NO",onClick:()=>ke(!D),variant:D?"primary":"ghost"})]}),e.jsxs(f,{children:[e.jsx(x,{children:"Delete Duplicates:"}),e.jsx(d,{label:P?"YES":"NO",onClick:()=>Re(!P),variant:P?"primary":"ghost"})]}),e.jsxs(f,{children:[e.jsx(x,{children:"Delete Older (days):"}),e.jsx(I,{type:"number",value:V||"",onChange:t=>{const s=t.target.value;we(s?parseInt(s):void 0)},placeholder:"Optional",min:"1",style:{width:"100px"}})]})]}),e.jsx(d,{label:G?"Refreshing...":"Refresh Now",onClick:C,disabled:G,variant:"primary"}),e.jsx(d,{label:"Clear Filters",onClick:Ne,variant:"ghost"}),e.jsx(d,{label:"Scroll to Bottom",onClick:De,variant:"ghost"}),e.jsx(d,{label:"Go to Latest",onClick:()=>p(1),variant:"ghost"}),e.jsx(d,{label:le?"Copying...":"Copy Logs",onClick:Ge,disabled:le||G,variant:"ghost"}),e.jsx(d,{label:E?"Clearing...":"Clear Logs",onClick:()=>X(!0),disabled:E||G,variant:"ghost"})]}),Te&&e.jsx(M,{title:"SUCCESS",children:e.jsxs("div",{style:{color:o.success,fontFamily:"Consolas",fontSize:12,padding:"8px 0"},children:[B.blockFull," Logs copied to clipboard successfully!"]})})]}),e.jsxs(M,{title:"LOG ENTRIES (DB)",children:[e.jsxs(Ke,{$isTransitioning:ze,children:[y.map((t,s)=>e.jsxs(Ve,{$level:t.level,$category:t.category||"SYSTEM",children:[e.jsx(Xe,{children:t.timestamp?xe(t.timestamp):""}),e.jsxs(_e,{$level:t.level,children:["[",(t.level||"").toUpperCase(),"]"]}),t.category&&e.jsxs(Je,{$category:t.category,children:["[",(t.category||"").toUpperCase(),"]"]}),t.function&&e.jsxs(qe,{children:["[",t.function,"]"]}),e.jsx(Qe,{children:t.message})]},t.id||s)),e.jsx("div",{ref:ge})]}),u>1&&e.jsxs(Ze,{children:[e.jsx(d,{label:"««",onClick:Pe,disabled:i===1,variant:"ghost"}),e.jsx(d,{label:"«",onClick:Oe,disabled:i===1,variant:"ghost"}),Array.from({length:Math.min(20,u)},(t,s)=>{const c=Math.max(1,i-9)+s;return c>u?null:e.jsx(d,{label:c.toString(),onClick:()=>p(c),variant:i===c?"primary":"ghost"},c)}),u>20&&i<u-9&&e.jsx(he,{style:{color:o.muted,fontSize:11,fontFamily:"Consolas"},children:"..."}),e.jsx(d,{label:"»",onClick:Be,disabled:i===u,variant:"ghost"}),e.jsx(d,{label:"»»",onClick:Ee,disabled:i===u,variant:"ghost"}),e.jsxs(he,{children:["Page ",i," of ",u]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"5px"},children:[e.jsx("span",{style:{fontSize:11,color:o.muted,fontFamily:"Consolas"},children:"Go to:"}),e.jsx(I,{type:"number",min:"1",max:u,style:{width:"60px",padding:"4px 8px",fontSize:11,fontFamily:"Consolas"},onKeyPress:t=>{if(t.key==="Enter"){const s=parseInt(t.target.value);s>=1&&s<=u&&(p(s),t.target.value="")}},placeholder:i.toString()})]})]})]}),Ie&&e.jsx(et,{children:e.jsxs(tt,{style:{background:o.background,padding:a.spacing.xxl,borderRadius:2,border:`2px solid ${o.border}`,maxWidth:500,textAlign:"center",fontFamily:"Consolas",fontSize:12},children:[e.jsxs("h3",{style:{margin:0,marginBottom:20,color:o.danger,fontSize:14,fontFamily:"Consolas",fontWeight:600},children:[B.blockFull," CLEAR LOGS CONFIRMATION"]}),e.jsxs("p",{style:{marginBottom:25,lineHeight:1.5,color:o.foreground,fontFamily:"Consolas",fontSize:12},children:["This action will TRUNCATE the database table:",e.jsx("br",{}),B.dot," metadata.logs (all log entries will be removed)",e.jsx("br",{}),e.jsx("strong",{children:"This operation cannot be undone!"})]}),e.jsxs("div",{style:{display:"flex",gap:15,justifyContent:"center"},children:[e.jsx(d,{label:"Cancel",onClick:()=>X(!1),disabled:E,variant:"ghost"}),e.jsx(d,{label:E?"Clearing...":"Clear Logs",onClick:Me,disabled:E,variant:"ghost"})]})]})})]})};export{lt as default};
