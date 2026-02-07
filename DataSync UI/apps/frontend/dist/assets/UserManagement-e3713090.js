import{m as ne,f as S,b as t,t as n,r as s,j as e,e as z,a0 as Ce,a9 as P,C as Pe,M as pe,y as me,z as fe,A as he,F as A,L as I,I as H,S as De}from"./index-f6ac47b8.js";import{u as Oe}from"./usePagination-c6b4a268.js";import{u as Ne}from"./useTableFilters-7bb371e7.js";import{e as V}from"./errorHandler-5ea9ae85.js";import{s as _e}from"./validation-24839588.js";import{A as w}from"./AsciiPanel-5614714e.js";import{A as k}from"./AsciiButton-4907e65e.js";import{C as oe,P as He,a as Ve,L as Ye,A as Ke,p as qe,b as Ge,c as Qe}from"./chart-f26d22df.js";import{f as Y}from"./index-c4405eea.js";import{S as Je}from"./SkeletonLoader-792007e7.js";const K=ne`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,Xe=ne`
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
`,Ze=ne`
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
`,xe=S.div`
  font-family: "Consolas";
  font-size: 12px;
  background: ${t.background};
  border: 1px solid ${t.border};
  border-radius: 2px;
  padding: ${n.spacing.lg};
  max-height: 800px;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  animation: ${K} 0.3s ease-out;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${t.backgroundSoft};
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${t.border};
    border-radius: 2px;
    transition: background 0.15s ease;
  }
`,et=S.div`
  user-select: none;
  margin: 4px 0;
  animation: ${K} 0.3s ease-out;
  animation-fill-mode: both;
  
  &:nth-child(1) { animation-delay: 0.05s; }
  &:nth-child(2) { animation-delay: 0.1s; }
  &:nth-child(3) { animation-delay: 0.15s; }
  &:nth-child(4) { animation-delay: 0.2s; }
  &:nth-child(5) { animation-delay: 0.25s; }
`,tt=S.div`
  display: flex;
  align-items: center;
  padding: ${o=>o.$level===0?"12px 8px":"10px 8px"};
  padding-left: ${o=>o.$level*24+8}px;
  border-radius: 2px;
  transition: background-color 0.15s ease, border-color 0.15s ease;
  cursor: pointer;
  position: relative;
  margin: 2px 0;
  font-family: 'Consolas';
  font-size: 12px;
  
  background: ${o=>o.$isExpanded&&o.$nodeType==="role"?t.backgroundSoft:"transparent"};
  
  ${o=>o.$nodeType==="role"?`
        border-left: 2px solid ${o.$isExpanded?t.accent:t.border};
        font-weight: 600;
      `:`
      border-left: 1px solid ${t.border};
    `}
`,nt=S.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 8px;
  border-radius: 2px;
  background: ${o=>o.$isExpanded?t.accent:t.backgroundSoft};
  color: ${o=>o.$isExpanded?t.background:t.accent};
  font-size: 12px;
  font-weight: bold;
  font-family: 'Consolas';
  transition: background-color 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
`,ot=S.span`
  font-weight: ${o=>o.$isRole?"700":"500"};
  font-size: ${o=>o.$isRole?"13px":"12px"};
  font-family: "Consolas";
  color: ${o=>o.$isRole?t.accent:t.foreground};
  margin-right: 12px;
  transition: color ${n.transitions.normal};
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`,rt=S.span`
  padding: ${n.spacing.xs} ${n.spacing.sm};
  border-radius: 2px;
  font-size: 11px;
  font-weight: 500;
  font-family: 'Consolas';
  background: ${t.backgroundSoft};
  color: ${t.muted};
  border: 1px solid ${t.border};
  margin-left: auto;
  transition: border-color 0.15s ease, color 0.15s ease;
`,st=S.div`
  overflow: hidden;
  animation: ${o=>o.$isExpanded?Xe:Ze} 0.3s ease-out;
  padding-left: ${o=>o.$level*24+36}px;
`,at=S.span`
  color: ${t.muted};
  font-family: "Consolas";
  margin-right: 4px;
  font-size: 12px;
`,it=S.div`
  padding: 12px 8px;
  padding-left: ${o=>o.$level*24+36}px;
  margin: 2px 0;
  border-radius: 2px;
  background: ${o=>o.$isSelected?t.backgroundSoft:t.background};
  border-left: ${o=>o.$isActive?"2px":"1px"} solid ${o=>o.$isActive?t.accent:t.border};
  transition: background-color 0.15s ease, border-color 0.15s ease;
  cursor: pointer;
  animation: ${K} 0.3s ease-out;
  font-family: 'Consolas';
  font-size: 12px;
`,ye=S.span`
  padding: 4px 12px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 600;
  font-family: "Consolas";
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all ${n.transitions.normal};
  border: 1px solid;
  
  ${o=>{if(o.$role)switch(o.$role){case"admin":return`
            background: ${t.backgroundSoft};
            color: ${t.accent};
            border-color: ${t.accent};
          `;case"user":return`
            background: ${t.backgroundSoft};
            color: ${t.accent};
            border-color: ${t.accent};
          `;case"viewer":return`
            background: ${t.backgroundSoft};
            color: ${t.muted};
            border-color: ${t.border};
          `;case"analytics":return`
            background: ${t.backgroundSoft};
            color: ${t.accent};
            border-color: ${t.accent};
          `;case"reporting":return`
            background: ${t.backgroundSoft};
            color: ${t.accent};
            border-color: ${t.accent};
          `;default:return`
            background: ${t.backgroundSoft};
            color: ${t.foreground};
            border-color: ${t.border};
          `}return o.$active!==void 0?o.$active?`
            background: ${t.backgroundSoft};
            color: ${t.accent};
            border-color: ${t.accent};
          `:`
            background: ${t.backgroundSoft};
            color: ${t.muted};
            border-color: ${t.border};
          `:`
      background: ${t.backgroundSoft};
      color: ${t.foreground};
      border-color: ${t.border};
    `}}
`,lt=S.div`
  padding: 60px 40px;
  text-align: center;
  color: ${t.muted};
  animation: ${K} 0.5s ease-out;
  font-family: "Consolas";
  font-size: 12px;
`,ct=S.div`
  font-size: 24px;
  margin-bottom: ${n.spacing.md};
  animation: ${K} 0.5s ease-out;
  font-family: "Consolas";
  opacity: 0.5;
`,dt=S.div`
  font-size: 14px;
  font-family: "Consolas";
  font-weight: 600;
  margin-bottom: ${n.spacing.sm};
  color: ${t.foreground};
`,gt=S.div`
  font-size: 11px;
  font-family: "Consolas";
  opacity: 0.7;
  color: ${t.muted};
`,ut=({users:o,onUserClick:i})=>{const[u,v]=s.useState(new Set),h=s.useMemo(()=>{const a=new Map,p=["admin","user","viewer","analytics","reporting"];return o.forEach(g=>{const d=g.role||"user";a.has(d)||a.set(d,{name:d,users:[]}),a.get(d).users.push(g)}),Array.from(a.values()).sort((g,d)=>{const c=p.indexOf(g.name),F=p.indexOf(d.name);return c!==-1&&F!==-1?c-F:c!==-1?-1:F!==-1?1:g.name.localeCompare(d.name)})},[o]),C=a=>{v(p=>{const g=new Set(p);return g.has(a)?g.delete(a):g.add(a),g})},l=(a,p)=>{if(a===0)return null;const g=[];for(let d=0;d<a-1;d++)g.push("│  ");return g.push(p?"└─ ":"├─ "),e.jsx(at,{children:g.join("")})},f=a=>a?new Date(a).toLocaleString():"Never",x=(a,p,g)=>{const d=u.has(a.name);return e.jsxs(et,{children:[e.jsxs(tt,{$level:p,$isExpanded:d,$nodeType:"role",onClick:()=>C(a.name),children:[l(p,g),e.jsx(nt,{$isExpanded:d,children:d?z.arrowDown:z.arrowRight}),e.jsx("span",{style:{marginRight:"8px",color:t.accent,fontFamily:"Consolas"},children:z.blockFull}),e.jsx(ot,{$isRole:!0,children:a.name.toUpperCase()}),e.jsx(rt,{children:a.users.length})]}),e.jsx(st,{$isExpanded:d,$level:p,children:d&&a.users.sort((c,F)=>c.username.localeCompare(F.username)).map((c,F)=>y(c,p+1,F===a.users.length-1))})]},a.name)},y=(a,p,g)=>e.jsxs(it,{$level:p,$isActive:a.active,onClick:()=>i==null?void 0:i(a),children:[l(p,g),e.jsx("span",{style:{marginRight:"8px",fontFamily:"Consolas",fontSize:12,color:t.accent},children:z.blockFull}),e.jsx(ye,{$role:a.role,style:{marginRight:"12px"},children:a.role.toUpperCase()}),e.jsx("span",{style:{marginRight:"12px",fontWeight:600,fontFamily:"Consolas",fontSize:12,color:t.foreground},children:a.username}),e.jsx("span",{style:{marginRight:"12px",fontFamily:"Consolas",fontSize:11,color:t.muted},children:a.email}),e.jsx(ye,{$active:a.active,children:a.active?"Active":"Inactive"}),e.jsx("span",{style:{marginLeft:"auto",fontFamily:"Consolas",fontSize:11,color:t.muted,display:"flex",gap:"8px",alignItems:"center"},children:e.jsxs("span",{children:["Last login: ",f(a.last_login)]})})]},a.id);return h.length===0?e.jsx(xe,{children:e.jsxs(lt,{children:[e.jsx(ct,{children:z.blockFull}),e.jsx(dt,{children:"No users available"}),e.jsx(gt,{children:"Users will appear here once added."})]})}):e.jsx(xe,{children:h.map((a,p)=>x(a,0,p===h.length-1))})},Se="label";function be(o,i){typeof o=="function"?o(i):o&&(o.current=i)}function pt(o,i){const u=o.options;u&&i&&Object.assign(u,i)}function we(o,i){o.labels=i}function $e(o,i){let u=arguments.length>2&&arguments[2]!==void 0?arguments[2]:Se;const v=[];o.datasets=i.map(h=>{const C=o.datasets.find(l=>l[u]===h[u]);return!C||!h.data||v.includes(C)?{...h}:(v.push(C),Object.assign(C,h),C)})}function mt(o){let i=arguments.length>1&&arguments[1]!==void 0?arguments[1]:Se;const u={labels:[],datasets:[]};return we(u,o.labels),$e(u,o.datasets,i),u}function ft(o,i){const{height:u=150,width:v=300,redraw:h=!1,datasetIdKey:C,type:l,data:f,options:x,plugins:y=[],fallbackContent:a,updateMode:p,...g}=o,d=s.useRef(null),c=s.useRef(null),F=()=>{d.current&&(c.current=new oe(d.current,{type:l,data:mt(f,C),options:x&&{...x},plugins:y}),be(i,c.current))},D=()=>{be(i,null),c.current&&(c.current.destroy(),c.current=null)};return s.useEffect(()=>{!h&&c.current&&x&&pt(c.current,x)},[h,x]),s.useEffect(()=>{!h&&c.current&&we(c.current.config.data,f.labels)},[h,f.labels]),s.useEffect(()=>{!h&&c.current&&f.datasets&&$e(c.current.config.data,f.datasets,C)},[h,f.datasets]),s.useEffect(()=>{c.current&&(h?(D(),setTimeout(F)):c.current.update(p))},[h,x,f.labels,f.datasets,p]),s.useEffect(()=>{c.current&&(D(),setTimeout(F))},[l]),s.useEffect(()=>(F(),()=>D()),[]),Ce.createElement("canvas",{ref:d,role:"img",height:u,width:v,...g},a)}const ht=s.forwardRef(ft);function xt(o,i){return oe.register(i),s.forwardRef((u,v)=>Ce.createElement(ht,{...u,ref:v,type:o}))}const te=xt("pie",He);oe.register(Ve,Ye,Ke,qe,Ge,Qe);const yt=({users:o})=>{const i=s.useMemo(()=>{const l=o.length,f=o.filter(d=>d.active).length,x=l-f,y=o.reduce((d,c)=>(d[c.role]=(d[c.role]||0)+1,d),{}),a=o.filter(d=>d.last_login!==null).length,p=l-a,g=o.filter(d=>{if(!d.last_login)return!1;const c=new Date(d.last_login);return(Date.now()-c.getTime())/(1e3*60*60*24)<=30}).length;return{totalUsers:l,activeUsers:f,inactiveUsers:x,roleCounts:y,usersWithLogin:a,usersNeverLoggedIn:p,recentLogins:g}},[o]),u=s.useMemo(()=>{const l=["admin","user","viewer","analytics","reporting"],f=l.map(y=>y.toUpperCase()),x=l.map(y=>i.roleCounts[y]||0);return{labels:f,datasets:[{data:x,backgroundColor:[t.accent+"80",t.accent+"60",t.muted+"80",t.accent+"40",t.accent+"50"],borderColor:[t.accent,t.accent,t.muted,t.accent,t.accent],borderWidth:2}]}},[i.roleCounts]),v=s.useMemo(()=>({labels:["Active","Inactive"],datasets:[{data:[i.activeUsers,i.inactiveUsers],backgroundColor:[t.accent+"80",t.muted+"80"],borderColor:[t.accent,t.muted],borderWidth:2}]}),[i.activeUsers,i.inactiveUsers]),h=s.useMemo(()=>({labels:["Has Logged In","Never Logged In"],datasets:[{data:[i.usersWithLogin,i.usersNeverLoggedIn],backgroundColor:[t.accent+"80",t.muted+"80"],borderColor:[t.accent,t.muted],borderWidth:2}]}),[i.usersWithLogin,i.usersNeverLoggedIn]),C={responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom",labels:{font:{family:"Consolas",size:11},color:t.foreground,padding:12,usePointStyle:!0}},tooltip:{backgroundColor:t.background,titleColor:t.foreground,bodyColor:t.foreground,borderColor:t.border,borderWidth:1,padding:12,font:{family:"Consolas",size:11}}}};return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:n.spacing.md},children:[e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:n.spacing.sm,marginBottom:n.spacing.lg},children:[e.jsx(w,{title:"Total Users",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:i.totalUsers})}),e.jsx(w,{title:"Active Users",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.accent},children:i.activeUsers})}),e.jsx(w,{title:"Inactive Users",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.muted},children:i.inactiveUsers})}),e.jsx(w,{title:"Recent Logins (30d)",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.accent},children:i.recentLogins})}),e.jsx(w,{title:"Never Logged In",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.muted},children:i.usersNeverLoggedIn})})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))",gap:n.spacing.md},children:[e.jsx(w,{title:"ROLE DISTRIBUTION",children:e.jsx("div",{style:{height:"300px",padding:n.spacing.md},children:e.jsx(te,{data:u,options:C})})}),e.jsx(w,{title:"STATUS DISTRIBUTION",children:e.jsx("div",{style:{height:"300px",padding:n.spacing.md},children:e.jsx(te,{data:v,options:C})})}),e.jsx(w,{title:"LOGIN STATUS",children:e.jsx("div",{style:{height:"300px",padding:n.spacing.md},children:e.jsx(te,{data:h,options:C})})})]}),e.jsx(w,{title:"ROLE BREAKDOWN",children:e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:n.spacing.sm,padding:n.spacing.md},children:Object.entries(i.roleCounts).map(([l,f])=>{const x=y=>{switch(y){case"admin":return t.accent;case"user":return t.accent;case"viewer":return t.muted;case"analytics":return t.accent;case"reporting":return t.accent;default:return t.foreground}};return e.jsxs("div",{style:{padding:n.spacing.sm,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${x(l)}`,fontFamily:"Consolas",fontSize:12},children:[e.jsx("div",{style:{color:x(l),fontWeight:600,marginBottom:4,fontSize:11,textTransform:"uppercase"},children:l}),e.jsx("div",{style:{color:t.foreground,fontSize:16,fontWeight:600},children:f}),e.jsxs("div",{style:{color:t.muted,fontSize:10,marginTop:4},children:[i.totalUsers>0?(f/i.totalUsers*100).toFixed(1):0,"%"]})]},l)})})}),e.jsx(w,{title:`USERS TABLE (${o.length} users)`,children:e.jsx("div",{style:{maxHeight:"500px",overflowY:"auto",fontFamily:"Consolas",fontSize:12},children:e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",border:`1px solid ${t.border}`},children:[e.jsx("thead",{style:{position:"sticky",top:0,background:t.background,zIndex:10,borderBottom:`2px solid ${t.border}`},children:e.jsxs("tr",{children:[e.jsx("th",{style:{padding:"12px",textAlign:"left",fontWeight:600,color:t.accent,borderRight:`1px solid ${t.border}`,borderBottom:`1px solid ${t.border}`},children:"Username"}),e.jsx("th",{style:{padding:"12px",textAlign:"left",fontWeight:600,color:t.accent,borderRight:`1px solid ${t.border}`,borderBottom:`1px solid ${t.border}`},children:"Email"}),e.jsx("th",{style:{padding:"12px",textAlign:"left",fontWeight:600,color:t.accent,borderRight:`1px solid ${t.border}`,borderBottom:`1px solid ${t.border}`},children:"Role"}),e.jsx("th",{style:{padding:"12px",textAlign:"left",fontWeight:600,color:t.accent,borderRight:`1px solid ${t.border}`,borderBottom:`1px solid ${t.border}`},children:"Status"}),e.jsx("th",{style:{padding:"12px",textAlign:"left",fontWeight:600,color:t.accent,borderRight:`1px solid ${t.border}`,borderBottom:`1px solid ${t.border}`},children:"Last Login"}),e.jsx("th",{style:{padding:"12px",textAlign:"left",fontWeight:600,color:t.accent,borderBottom:`1px solid ${t.border}`},children:"Created"})]})}),e.jsx("tbody",{children:o.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:6,style:{padding:"40px",textAlign:"center",color:t.muted,fontFamily:"Consolas",fontSize:12},children:"No users found"})}):o.map((l,f)=>{const x=y=>{switch(y){case"admin":return t.accent;case"user":return t.accent;case"viewer":return t.muted;case"analytics":return t.accent;case"reporting":return t.accent;default:return t.foreground}};return e.jsxs("tr",{style:{borderBottom:`1px solid ${t.border}`,transition:"background 0.2s ease",cursor:"pointer"},onMouseEnter:y=>{y.currentTarget.style.background=t.backgroundSoft},onMouseLeave:y=>{y.currentTarget.style.background="transparent"},children:[e.jsx("td",{style:{padding:"12px",borderRight:`1px solid ${t.border}`,color:t.foreground,fontWeight:600},children:l.username}),e.jsx("td",{style:{padding:"12px",borderRight:`1px solid ${t.border}`,color:t.foreground},children:l.email}),e.jsx("td",{style:{padding:"12px",borderRight:`1px solid ${t.border}`},children:e.jsx("span",{style:{padding:"4px 10px",borderRadius:2,fontSize:10,fontFamily:"Consolas",fontWeight:600,backgroundColor:x(l.role)+"20",color:x(l.role),border:`1px solid ${x(l.role)}`,textTransform:"uppercase"},children:l.role})}),e.jsx("td",{style:{padding:"12px",borderRight:`1px solid ${t.border}`},children:e.jsx("span",{style:{padding:"4px 10px",borderRadius:2,fontSize:10,fontFamily:"Consolas",fontWeight:600,backgroundColor:t.backgroundSoft,color:l.active?t.accent:t.muted,border:`1px solid ${l.active?t.accent:t.border}`,textTransform:"uppercase"},children:l.active?"Active":"Inactive"})}),e.jsx("td",{style:{padding:"12px",borderRight:`1px solid ${t.border}`,color:l.last_login?t.foreground:t.muted,fontSize:11},children:l.last_login?Y(new Date(l.last_login),"yyyy-MM-dd HH:mm"):"Never"}),e.jsx("td",{style:{padding:"12px",color:t.muted,fontSize:11},children:Y(new Date(l.created_at),"yyyy-MM-dd")})]},l.id)})})]})})})]})};S.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;const ve=S.button`
  background: none;
  border: none;
  font-size: 18px;
  font-family: "Consolas";
  cursor: pointer;
  color: ${t.muted};
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: ${t.foreground};
  }
`,je=S.div`
  display: flex;
  gap: ${n.spacing.md};
  justify-content: flex-end;
  margin-top: ${n.spacing.lg};
  padding-top: ${n.spacing.md};
  border-top: 1px solid ${n.colors.border.light};
`,bt=S.span`
  padding: ${n.spacing.xs} ${n.spacing.sm};
  border-radius: 2;
  font-size: 11px;
  font-family: 'Consolas';
  font-weight: 500;
  display: inline-block;
  background-color: ${o=>{switch(o.$role){case"admin":return t.backgroundSoft;case"user":return t.backgroundSoft;case"viewer":return t.backgroundSoft;case"analytics":return t.backgroundSoft;case"reporting":return t.backgroundSoft;default:return t.backgroundSoft}}};
  color: ${o=>{switch(o.$role){case"admin":return t.accent;case"user":return t.accent;case"viewer":return t.muted;case"analytics":return t.accent;case"reporting":return t.accent;default:return t.foreground}}};
  border: 1px solid ${o=>{switch(o.$role){case"admin":return t.accent;case"user":return t.accent;case"viewer":return t.border;case"analytics":return t.accent;case"reporting":return t.accent;default:return t.border}}};
`,Et=()=>{const{page:o,limit:i,setPage:u}=Oe(1,20),{filters:v,setFilter:h}=Ne({role:"",active:""}),[C,l]=s.useState(""),[f,x]=s.useState(""),[y,a]=s.useState([]),[p,g]=s.useState(!0),[d,c]=s.useState(null),[F,D]=s.useState({total:0,totalPages:0,page:1,limit:20}),[re,se]=s.useState(!1),[ae,ie]=s.useState(!1),[E,q]=s.useState(null),[G,le]=s.useState(null),[b,L]=s.useState({username:"",email:"",password:"",role:"user",active:!0}),[B,Q]=s.useState(""),[J,X]=s.useState(""),[m,O]=s.useState(null),[ke,Z]=s.useState(!1),[M,Fe]=s.useState("list"),[vt,ze]=s.useState({}),T=s.useRef(!0),U=s.useCallback(async()=>{if(!T.current)return;const r=Date.now(),R=300;try{g(!0),c(null);const ee={page:1,limit:1e3,search:_e(f,100)};v.role&&(ee.role=v.role),v.active!==""&&(ee.active=v.active);const ue=await P.getUsers(ee),Ie=Date.now()-r,Be=Math.max(0,R-Ie);if(await new Promise($=>setTimeout($,Be)),T.current){const $=ue.data||[];a($),D(ue.pagination||{total:0,totalPages:0,page:1,limit:20});const Me={totalUsers:$.length,activeUsers:$.filter(j=>j.active).length,inactiveUsers:$.filter(j=>!j.active).length,adminCount:$.filter(j=>j.role==="admin").length,userCount:$.filter(j=>j.role==="user").length,viewerCount:$.filter(j=>j.role==="viewer").length,analyticsCount:$.filter(j=>j.role==="analytics").length,reportingCount:$.filter(j=>j.role==="reporting").length,usersWithLogin:$.filter(j=>j.last_login!==null).length,usersNeverLoggedIn:$.filter(j=>j.last_login===null).length,recentLogins:$.filter(j=>{if(!j.last_login)return!1;const We=new Date(j.last_login);return(Date.now()-We.getTime())/(1e3*60*60*24)<=30}).length};ze(Me)}}catch(W){T.current&&c(V(W))}finally{T.current&&g(!1)}},[v.role,v.active,f]);s.useEffect(()=>(T.current=!0,U(),()=>{T.current=!1}),[U]);const ce=s.useCallback(()=>{x(C),u(1)},[C,u]),Re=s.useCallback(()=>{l(""),x(""),u(1)},[u]),de=s.useCallback((r,R)=>{h(r,R),u(1)},[h,u]),ge=s.useCallback(r=>{r?(q(r),L({username:r.username,email:r.email,password:"",role:r.role,active:r.active})):(q(null),L({username:"",email:"",password:"",role:"user",active:!0})),se(!0)},[]),N=s.useCallback(()=>{se(!1),q(null)},[]),Te=s.useCallback(async()=>{try{if(E)await P.updateUser(E.id,{username:b.username,email:b.email,role:b.role,active:b.active});else{if(!b.password||b.password.length<8){c("Password must be at least 8 characters long");return}await P.createUser(b.username,b.email,b.password,b.role)}N(),U()}catch(r){c(V(r))}},[E,b,N,U]),Ue=s.useCallback(async(r,R)=>{if(confirm(`Are you sure you want to delete user "${R}"?`))try{await P.deleteUser(r),U()}catch(W){T.current&&c(V(W))}},[U]),Ee=s.useCallback(async(r,R)=>{try{await P.updateUser(r,{active:!R}),U()}catch(W){T.current&&c(V(W))}},[U]),Le=s.useCallback(r=>{le(r),Q(""),X(""),ie(!0)},[]),_=s.useCallback(()=>{ie(!1),le(null),Q(""),X("")},[]),Ae=s.useCallback(async()=>{if(G){if(!B||B.length<8){c("Password must be at least 8 characters long");return}if(B!==J){c("Passwords do not match");return}try{await P.resetUserPassword(G,B),_(),alert("Password reset successfully")}catch(r){c(V(r))}}},[G,B,J,_]);return p&&y.length===0?e.jsx(Je,{variant:"table"}):e.jsxs(Pe,{children:[e.jsxs("div",{style:{width:"100%",minHeight:"100vh",padding:n.spacing.lg,fontFamily:"Consolas",fontSize:12,color:t.foreground,backgroundColor:t.background,display:"flex",flexDirection:"column",gap:n.spacing.lg},children:[e.jsx("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:n.spacing.lg,paddingBottom:n.spacing.md,borderBottom:`2px solid ${t.accent}`},children:e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:t.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:t.accent,marginRight:n.spacing.sm},children:z.blockFull}),"USER MANAGEMENT"]})}),ke&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>Z(!1),children:e.jsx("div",{style:{width:"90%",maxWidth:1e3,maxHeight:"90vh",overflowY:"auto",fontFamily:"Consolas"},onClick:r=>r.stopPropagation(),className:"modal-scroll-container",children:e.jsx(w,{title:"USER MANAGEMENT PLAYBOOK",children:e.jsxs("div",{style:{padding:n.spacing.md,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:n.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[z.blockFull," OVERVIEW"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:n.spacing.md,fontFamily:"Consolas"},children:"User Management provides centralized control over system access and permissions. Create, edit, and manage user accounts with different role-based access levels. Monitor user activity, track login history, and maintain security through proper access control."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[z.blockFull," USER ROLES"]}),e.jsxs("div",{style:{marginLeft:n.spacing.md},children:[e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Admin"}),e.jsx("div",{style:{color:t.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Full system access with all privileges. Can create, edit, and delete users, manage all system configurations, access all data sources, and perform administrative operations. Use sparingly and only for trusted administrators."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"User"}),e.jsx("div",{style:{color:t.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Standard user with access to create and manage data pipelines, view catalogs, and perform data operations. Can create custom jobs, manage their own configurations, and access most system features except user management and critical system settings."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.muted,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Viewer"}),e.jsx("div",{style:{color:t.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Read-only access to view catalogs, lineage, governance data, and reports. Cannot create or modify any configurations, jobs, or data. Ideal for stakeholders who need visibility without modification capabilities."})]})]})]}),e.jsxs("div",{style:{marginBottom:n.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[z.blockFull," USER STATUS"]}),e.jsxs("div",{style:{marginLeft:n.spacing.md},children:[e.jsxs("div",{style:{marginBottom:n.spacing.xs},children:[e.jsx("span",{style:{color:t.accent,fontWeight:600,fontFamily:"Consolas"},children:"Active"}),e.jsx("span",{style:{color:t.foreground,marginLeft:n.spacing.sm,fontSize:11,fontFamily:"Consolas"},children:"User account is enabled and can log in to the system"})]}),e.jsxs("div",{style:{marginBottom:n.spacing.xs},children:[e.jsx("span",{style:{color:t.muted,fontWeight:600,fontFamily:"Consolas"},children:"Inactive"}),e.jsx("span",{style:{color:t.foreground,marginLeft:n.spacing.sm,fontSize:11,fontFamily:"Consolas"},children:"User account is disabled and cannot log in. Useful for temporarily suspending access without deleting the account."})]})]})]}),e.jsxs("div",{style:{marginBottom:n.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:n.spacing.sm,fontFamily:"Consolas"},children:[z.blockFull," USER MANAGEMENT FEATURES"]}),e.jsxs("div",{style:{marginLeft:n.spacing.md},children:[e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Create User"}),e.jsx("div",{style:{color:t.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Create new user accounts with username, email, password, and role assignment. Passwords must be at least 8 characters long. Username and email must be unique."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Edit User"}),e.jsx("div",{style:{color:t.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Update user information including email, role, and active status. Username cannot be changed after creation. Password changes require the Reset Password function."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Reset Password"}),e.jsx("div",{style:{color:t.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Administrators can reset user passwords. The new password must be at least 8 characters long and must be confirmed. Users will need to use the new password on their next login."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Activate/Deactivate"}),e.jsx("div",{style:{color:t.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Quickly enable or disable user accounts without deleting them. Deactivated users cannot log in but their data and configurations are preserved."})]}),e.jsxs("div",{style:{marginBottom:n.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:"Delete User"}),e.jsx("div",{style:{color:t.foreground,marginLeft:n.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Permanently remove a user account from the system. This action cannot be undone. Consider deactivating users instead if you may need to restore access later."})]})]})]}),e.jsxs("div",{style:{marginTop:n.spacing.md,padding:n.spacing.sm,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:t.muted,marginBottom:n.spacing.xs,fontFamily:"Consolas"},children:[z.blockSemi," Security Best Practices"]}),e.jsxs("div",{style:{fontSize:11,color:t.foreground,fontFamily:"Consolas"},children:["• Limit admin accounts to essential personnel only",e.jsx("br",{}),"• Use strong passwords (minimum 8 characters, recommend 12+)",e.jsx("br",{}),"• Regularly review and audit user accounts",e.jsx("br",{}),"• Deactivate unused accounts instead of deleting them",e.jsx("br",{}),"• Monitor last login times to identify inactive accounts",e.jsx("br",{}),"• Use role-based access control to enforce least privilege",e.jsx("br",{}),"• Regularly rotate passwords for sensitive accounts"]})]}),e.jsx("div",{style:{marginTop:n.spacing.md,textAlign:"right"},children:e.jsx(k,{label:"Close",onClick:()=>Z(!1),variant:"ghost"})})]})})})}),d&&e.jsx("div",{style:{marginBottom:n.spacing.lg},children:e.jsx(w,{title:"ERROR",children:e.jsx("div",{style:{padding:n.spacing.md,color:t.foreground,fontSize:12,fontFamily:"Consolas",background:t.backgroundSoft,borderRadius:2,border:`2px solid ${t.foreground}`},children:d})})}),e.jsx(w,{title:"SEARCH",children:e.jsxs("div",{style:{display:"flex",gap:n.spacing.sm,alignItems:"center",padding:`${n.spacing.sm} 0`},children:[e.jsx("input",{type:"text",placeholder:"Search by username or email...",value:C,onChange:r=>l(r.target.value),onKeyPress:r=>r.key==="Enter"&&ce(),"aria-label":"Search users by username or email",style:{flex:1,padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${t.border}`,borderRadius:2,fontSize:12,fontFamily:"Consolas",backgroundColor:t.background,color:t.foreground,outline:"none",transition:"border-color 0.15s ease"},onFocus:r=>{r.currentTarget.style.borderColor=t.accent,r.currentTarget.style.outline=`2px solid ${t.accent}`,r.currentTarget.style.outlineOffset="2px"},onBlur:r=>{r.currentTarget.style.borderColor=t.border,r.currentTarget.style.outline="none"}}),e.jsx(k,{label:"Search",onClick:ce,variant:"primary"}),f&&e.jsx(k,{label:"Clear",onClick:Re,variant:"ghost"})]})}),e.jsx("div",{style:{marginTop:n.spacing.lg},children:e.jsx(w,{title:"FILTERS & ACTIONS",children:e.jsxs("div",{style:{display:"flex",flexWrap:"wrap",gap:n.spacing.sm,padding:`${n.spacing.sm} 0`,alignItems:"center"},children:[e.jsx(k,{label:"Add User",onClick:()=>ge(),variant:"primary"}),e.jsxs("select",{value:v.role,onChange:r=>de("role",r.target.value),"aria-label":"Filter by role",style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${t.border}`,borderRadius:2,fontSize:12,fontFamily:"Consolas",backgroundColor:t.background,color:t.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:r=>{r.currentTarget.style.borderColor=t.accent,r.currentTarget.style.outline=`2px solid ${t.accent}`,r.currentTarget.style.outlineOffset="2px"},onBlur:r=>{r.currentTarget.style.borderColor=t.border,r.currentTarget.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Roles"}),e.jsx("option",{value:"admin",children:"Admin"}),e.jsx("option",{value:"user",children:"User"}),e.jsx("option",{value:"viewer",children:"Viewer"}),e.jsx("option",{value:"analytics",children:"Analytics"}),e.jsx("option",{value:"reporting",children:"Reporting"})]}),e.jsxs("select",{value:v.active,onChange:r=>de("active",r.target.value),"aria-label":"Filter by status",style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,border:`1px solid ${t.border}`,borderRadius:2,fontSize:12,fontFamily:"Consolas",backgroundColor:t.background,color:t.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:r=>{r.currentTarget.style.borderColor=t.accent,r.currentTarget.style.outline=`2px solid ${t.accent}`,r.currentTarget.style.outlineOffset="2px"},onBlur:r=>{r.currentTarget.style.borderColor=t.border,r.currentTarget.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Status"}),e.jsx("option",{value:"true",children:"Active"}),e.jsx("option",{value:"false",children:"Inactive"})]}),e.jsx(k,{label:"User Management Info",onClick:()=>Z(!0),variant:"ghost"}),e.jsx(k,{label:M==="list"?"Show Charts":"Show List",onClick:()=>Fe(M==="list"?"charts":"list"),variant:M==="charts"?"primary":"ghost"})]})})}),M==="charts"&&e.jsx(yt,{users:y,filters:v}),M==="list"&&p?e.jsx("div",{style:{marginTop:n.spacing.lg},children:e.jsx(w,{title:"LOADING",children:e.jsxs("div",{style:{padding:n.spacing.xl,textAlign:"center",fontSize:12,fontFamily:"Consolas",color:t.muted},children:[z.blockFull," Loading users..."]})})}):M==="list"?e.jsxs("div",{style:{display:"grid",gridTemplateColumns:m?"1fr 400px":"1fr",gap:n.spacing.lg},children:[e.jsx(ut,{users:y,onUserClick:r=>O(R=>(R==null?void 0:R.id)===r.id?null:r)}),m&&e.jsx(w,{title:"USER DETAILS",children:e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:n.spacing.md,fontFamily:"Consolas",fontSize:12},children:[e.jsxs("div",{children:[e.jsx("strong",{style:{color:t.accent,fontSize:11,fontFamily:"Consolas",fontWeight:600},children:"Username:"}),e.jsx("div",{style:{color:t.foreground,fontSize:12,marginTop:"6px",fontFamily:"Consolas",padding:n.spacing.sm,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`},children:m.username})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:t.accent,fontSize:11,fontFamily:"Consolas",fontWeight:600},children:"Email:"}),e.jsx("div",{style:{color:t.foreground,fontSize:12,marginTop:"6px",fontFamily:"Consolas",padding:n.spacing.sm,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`},children:m.email})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:t.accent,fontSize:11,fontFamily:"Consolas",fontWeight:600},children:"Role:"}),e.jsx("div",{style:{marginTop:"6px"},children:e.jsx(bt,{$role:m.role,children:m.role.toUpperCase()})})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:t.accent,fontSize:11,fontFamily:"Consolas",fontWeight:600},children:"Status:"}),e.jsx("div",{style:{marginTop:n.spacing.xs},children:e.jsx("span",{style:{padding:`${n.spacing.xs} ${n.spacing.sm}`,borderRadius:2,fontSize:11,fontFamily:"Consolas",fontWeight:600,display:"inline-block",backgroundColor:t.backgroundSoft,color:m.active?t.accent:t.muted,border:`1px solid ${m.active?t.accent:t.border}`},children:m.active?"ACTIVE":"INACTIVE"})})]}),e.jsxs("div",{style:{marginTop:n.spacing.md,paddingTop:n.spacing.md,borderTop:`1px solid ${t.border}`},children:[e.jsx("strong",{style:{color:t.muted,fontSize:11,fontFamily:"Consolas",fontWeight:600},children:"Account Information:"}),e.jsxs("div",{style:{marginTop:"8px",display:"flex",flexDirection:"column",gap:"6px"},children:[e.jsxs("div",{children:[e.jsx("span",{style:{color:t.muted,fontSize:10},children:"Created:"})," ",e.jsx("span",{style:{color:t.foreground,fontSize:11},children:Y(new Date(m.created_at),"yyyy-MM-dd HH:mm:ss")})]}),m.updated_at&&m.updated_at!==m.created_at&&e.jsxs("div",{children:[e.jsx("span",{style:{color:t.muted,fontSize:10},children:"Updated:"})," ",e.jsx("span",{style:{color:t.foreground,fontSize:11},children:Y(new Date(m.updated_at),"yyyy-MM-dd HH:mm:ss")})]}),e.jsxs("div",{children:[e.jsx("span",{style:{color:t.muted,fontSize:10},children:"Last Login:"})," ",e.jsx("span",{style:{color:m.last_login?t.foreground:t.muted,fontSize:11},children:m.last_login?Y(new Date(m.last_login),"yyyy-MM-dd HH:mm:ss"):"Never"})]})]})]}),e.jsx("div",{style:{marginTop:n.spacing.md,paddingTop:n.spacing.md,borderTop:`1px solid ${t.border}`},children:e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:n.spacing.sm},children:[e.jsx(k,{label:"Edit User",onClick:()=>{ge(m),O(null)},variant:"primary"}),e.jsx(k,{label:m.active?"Deactivate":"Activate",onClick:()=>{Ee(m.id,m.active),O(null)},variant:"ghost"}),e.jsx(k,{label:"Reset Password",onClick:()=>{Le(m.id),O(null)},variant:"ghost"}),e.jsx(k,{label:"Delete User",onClick:()=>{Ue(m.id,m.username),O(null)},variant:"ghost"})]})})]})})]}):null,re&&e.jsx(pe,{$isOpen:re,onClick:N,children:e.jsxs(me,{onClick:r=>r.stopPropagation(),children:[e.jsxs(fe,{children:[e.jsx(he,{style:{fontFamily:"Consolas",fontSize:14},children:E?"Edit User":"Create User"}),e.jsx(ve,{onClick:N,"aria-label":"Close modal",children:"×"})]}),e.jsxs(A,{children:[e.jsx(I,{htmlFor:"username",children:"Username *"}),e.jsx(H,{id:"username",type:"text",value:b.username,onChange:r=>L({...b,username:r.target.value}),required:!0,disabled:!!E})]}),e.jsxs(A,{children:[e.jsx(I,{htmlFor:"email",children:"Email *"}),e.jsx(H,{id:"email",type:"email",value:b.email,onChange:r=>L({...b,email:r.target.value}),required:!0})]}),!E&&e.jsxs(A,{children:[e.jsx(I,{htmlFor:"password",children:"Password * (min 8 characters)"}),e.jsx(H,{id:"password",type:"password",value:b.password,onChange:r=>L({...b,password:r.target.value}),required:!0})]}),e.jsxs(A,{children:[e.jsx(I,{htmlFor:"role",children:"Role *"}),e.jsxs(De,{id:"role",value:b.role,onChange:r=>L({...b,role:r.target.value}),children:[e.jsx("option",{value:"viewer",children:"Viewer"}),e.jsx("option",{value:"user",children:"User"}),e.jsx("option",{value:"analytics",children:"Analytics"}),e.jsx("option",{value:"reporting",children:"Reporting"}),e.jsx("option",{value:"admin",children:"Admin"})]})]}),e.jsx(A,{children:e.jsxs(I,{children:[e.jsx("input",{type:"checkbox",checked:b.active,onChange:r=>L({...b,active:r.target.checked})})," ","Active"]})}),e.jsxs(je,{children:[e.jsx(k,{label:"Cancel",onClick:N,variant:"ghost"}),e.jsx(k,{label:E?"Update":"Create",onClick:Te,variant:"primary"})]})]})}),ae&&e.jsx(pe,{$isOpen:ae,onClick:_,children:e.jsxs(me,{onClick:r=>r.stopPropagation(),children:[e.jsxs(fe,{children:[e.jsx(he,{style:{fontFamily:"Consolas",fontSize:14},children:"Reset Password"}),e.jsx(ve,{onClick:_,"aria-label":"Close modal",children:"×"})]}),e.jsxs(A,{children:[e.jsx(I,{htmlFor:"newPassword",children:"New Password * (min 8 characters)"}),e.jsx(H,{id:"newPassword",type:"password",value:B,onChange:r=>Q(r.target.value),required:!0})]}),e.jsxs(A,{children:[e.jsx(I,{htmlFor:"confirmPassword",children:"Confirm Password *"}),e.jsx(H,{id:"confirmPassword",type:"password",value:J,onChange:r=>X(r.target.value),required:!0})]}),e.jsxs(je,{children:[e.jsx(k,{label:"Cancel",onClick:_,variant:"ghost"}),e.jsx(k,{label:"Reset Password",onClick:Ae,variant:"primary"})]})]})})]}),e.jsx("style",{children:`
        .modal-scroll-container::-webkit-scrollbar {
          width: 0px;
          display: none;
        }
        
        .modal-scroll-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `})]})};export{Et as default};
