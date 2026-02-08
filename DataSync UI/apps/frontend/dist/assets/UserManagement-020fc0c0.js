import{m as te,f as x,b as t,t as o,r as a,j as e,e as $,a9 as P,C as Ae,M as ge,y as ue,z as me,A as pe,F as E,L as B,I as _,S as Ee}from"./index-b1fa964d.js";import{u as Be}from"./usePagination-05d2e222.js";import{u as Ie}from"./useTableFilters-34614e65.js";import{e as H}from"./errorHandler-5ea9ae85.js";import{s as We}from"./validation-24839588.js";import{A as y}from"./AsciiPanel-3399d5be.js";import{A as C}from"./AsciiButton-3fcfdd9b.js";import{C as Me,a as Pe,L as De,A as Oe,p as Ne,b as _e,c as He}from"./chart-29c351ca.js";import{P as ee}from"./index-5bb8c076.js";import{f as V}from"./index-c4405eea.js";import{S as Ve}from"./SkeletonLoader-09c12074.js";const Y=te`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,Ye=te`
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
`,qe=te`
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
`,fe=x.div`
  font-family: "Consolas";
  font-size: 12px;
  background: ${t.background};
  border: 1px solid ${t.border};
  border-radius: 2px;
  padding: ${o.spacing.lg};
  max-height: 800px;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  animation: ${Y} 0.3s ease-out;
  
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
`,Ge=x.div`
  user-select: none;
  margin: 4px 0;
  animation: ${Y} 0.3s ease-out;
  animation-fill-mode: both;
  
  &:nth-child(1) { animation-delay: 0.05s; }
  &:nth-child(2) { animation-delay: 0.1s; }
  &:nth-child(3) { animation-delay: 0.15s; }
  &:nth-child(4) { animation-delay: 0.2s; }
  &:nth-child(5) { animation-delay: 0.25s; }
`,Ke=x.div`
  display: flex;
  align-items: center;
  padding: ${r=>r.$level===0?"12px 8px":"10px 8px"};
  padding-left: ${r=>r.$level*24+8}px;
  border-radius: 2px;
  transition: background-color 0.15s ease, border-color 0.15s ease;
  cursor: pointer;
  position: relative;
  margin: 2px 0;
  font-family: 'Consolas';
  font-size: 12px;
  
  background: ${r=>r.$isExpanded&&r.$nodeType==="role"?t.backgroundSoft:"transparent"};
  
  ${r=>r.$nodeType==="role"?`
        border-left: 2px solid ${r.$isExpanded?t.accent:t.border};
        font-weight: 600;
      `:`
      border-left: 1px solid ${t.border};
    `}
`,Qe=x.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 8px;
  border-radius: 2px;
  background: ${r=>r.$isExpanded?t.accent:t.backgroundSoft};
  color: ${r=>r.$isExpanded?t.background:t.accent};
  font-size: 12px;
  font-weight: bold;
  font-family: 'Consolas';
  transition: background-color 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
`,Je=x.span`
  font-weight: ${r=>r.$isRole?"700":"500"};
  font-size: ${r=>r.$isRole?"13px":"12px"};
  font-family: "Consolas";
  color: ${r=>r.$isRole?t.accent:t.foreground};
  margin-right: 12px;
  transition: color ${o.transitions.normal};
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`,Xe=x.span`
  padding: ${o.spacing.xs} ${o.spacing.sm};
  border-radius: 2px;
  font-size: 11px;
  font-weight: 500;
  font-family: 'Consolas';
  background: ${t.backgroundSoft};
  color: ${t.muted};
  border: 1px solid ${t.border};
  margin-left: auto;
  transition: border-color 0.15s ease, color 0.15s ease;
`,Ze=x.div`
  overflow: hidden;
  animation: ${r=>r.$isExpanded?Ye:qe} 0.3s ease-out;
  padding-left: ${r=>r.$level*24+36}px;
`,et=x.span`
  color: ${t.muted};
  font-family: "Consolas";
  margin-right: 4px;
  font-size: 12px;
`,tt=x.div`
  padding: 12px 8px;
  padding-left: ${r=>r.$level*24+36}px;
  margin: 2px 0;
  border-radius: 2px;
  background: ${r=>r.$isSelected?t.backgroundSoft:t.background};
  border-left: ${r=>r.$isActive?"2px":"1px"} solid ${r=>r.$isActive?t.accent:t.border};
  transition: background-color 0.15s ease, border-color 0.15s ease;
  cursor: pointer;
  animation: ${Y} 0.3s ease-out;
  font-family: 'Consolas';
  font-size: 12px;
`,he=x.span`
  padding: 4px 12px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 600;
  font-family: "Consolas";
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all ${o.transitions.normal};
  border: 1px solid;
  
  ${r=>{if(r.$role)switch(r.$role){case"admin":return`
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
          `}return r.$active!==void 0?r.$active?`
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
`,ot=x.div`
  padding: 60px 40px;
  text-align: center;
  color: ${t.muted};
  animation: ${Y} 0.5s ease-out;
  font-family: "Consolas";
  font-size: 12px;
`,nt=x.div`
  font-size: 24px;
  margin-bottom: ${o.spacing.md};
  animation: ${Y} 0.5s ease-out;
  font-family: "Consolas";
  opacity: 0.5;
`,rt=x.div`
  font-size: 14px;
  font-family: "Consolas";
  font-weight: 600;
  margin-bottom: ${o.spacing.sm};
  color: ${t.foreground};
`,st=x.div`
  font-size: 11px;
  font-family: "Consolas";
  opacity: 0.7;
  color: ${t.muted};
`,at=({users:r,onUserClick:d})=>{const[k,S]=a.useState(new Set),T=a.useMemo(()=>{const s=new Map,m=["admin","user","viewer","analytics","reporting"];return r.forEach(g=>{const l=g.role||"user";s.has(l)||s.set(l,{name:l,users:[]}),s.get(l).users.push(g)}),Array.from(s.values()).sort((g,l)=>{const u=m.indexOf(g.name),z=m.indexOf(l.name);return u!==-1&&z!==-1?u-z:u!==-1?-1:z!==-1?1:g.name.localeCompare(l.name)})},[r]),F=s=>{S(m=>{const g=new Set(m);return g.has(s)?g.delete(s):g.add(s),g})},i=(s,m)=>{if(s===0)return null;const g=[];for(let l=0;l<s-1;l++)g.push("│  ");return g.push(m?"└─ ":"├─ "),e.jsx(et,{children:g.join("")})},v=s=>s?new Date(s).toLocaleString():"Never",b=(s,m,g)=>{const l=k.has(s.name);return e.jsxs(Ge,{children:[e.jsxs(Ke,{$level:m,$isExpanded:l,$nodeType:"role",onClick:()=>F(s.name),children:[i(m,g),e.jsx(Qe,{$isExpanded:l,children:l?$.arrowDown:$.arrowRight}),e.jsx("span",{style:{marginRight:"8px",color:t.accent,fontFamily:"Consolas"},children:$.blockFull}),e.jsx(Je,{$isRole:!0,children:s.name.toUpperCase()}),e.jsx(Xe,{children:s.users.length})]}),e.jsx(Ze,{$isExpanded:l,$level:m,children:l&&s.users.sort((u,z)=>u.username.localeCompare(z.username)).map((u,z)=>h(u,m+1,z===s.users.length-1))})]},s.name)},h=(s,m,g)=>e.jsxs(tt,{$level:m,$isActive:s.active,onClick:()=>d==null?void 0:d(s),children:[i(m,g),e.jsx("span",{style:{marginRight:"8px",fontFamily:"Consolas",fontSize:12,color:t.accent},children:$.blockFull}),e.jsx(he,{$role:s.role,style:{marginRight:"12px"},children:s.role.toUpperCase()}),e.jsx("span",{style:{marginRight:"12px",fontWeight:600,fontFamily:"Consolas",fontSize:12,color:t.foreground},children:s.username}),e.jsx("span",{style:{marginRight:"12px",fontFamily:"Consolas",fontSize:11,color:t.muted},children:s.email}),e.jsx(he,{$active:s.active,children:s.active?"Active":"Inactive"}),e.jsx("span",{style:{marginLeft:"auto",fontFamily:"Consolas",fontSize:11,color:t.muted,display:"flex",gap:"8px",alignItems:"center"},children:e.jsxs("span",{children:["Last login: ",v(s.last_login)]})})]},s.id);return T.length===0?e.jsx(fe,{children:e.jsxs(ot,{children:[e.jsx(nt,{children:$.blockFull}),e.jsx(rt,{children:"No users available"}),e.jsx(st,{children:"Users will appear here once added."})]})}):e.jsx(fe,{children:T.map((s,m)=>b(s,0,m===T.length-1))})};Me.register(Pe,De,Oe,Ne,_e,He);const it=({users:r})=>{const d=a.useMemo(()=>{const i=r.length,v=r.filter(l=>l.active).length,b=i-v,h=r.reduce((l,u)=>(l[u.role]=(l[u.role]||0)+1,l),{}),s=r.filter(l=>l.last_login!==null).length,m=i-s,g=r.filter(l=>{if(!l.last_login)return!1;const u=new Date(l.last_login);return(Date.now()-u.getTime())/(1e3*60*60*24)<=30}).length;return{totalUsers:i,activeUsers:v,inactiveUsers:b,roleCounts:h,usersWithLogin:s,usersNeverLoggedIn:m,recentLogins:g}},[r]),k=a.useMemo(()=>{const i=["admin","user","viewer","analytics","reporting"],v=i.map(h=>h.toUpperCase()),b=i.map(h=>d.roleCounts[h]||0);return{labels:v,datasets:[{data:b,backgroundColor:[t.accent+"80",t.accent+"60",t.muted+"80",t.accent+"40",t.accent+"50"],borderColor:[t.accent,t.accent,t.muted,t.accent,t.accent],borderWidth:2}]}},[d.roleCounts]),S=a.useMemo(()=>({labels:["Active","Inactive"],datasets:[{data:[d.activeUsers,d.inactiveUsers],backgroundColor:[t.accent+"80",t.muted+"80"],borderColor:[t.accent,t.muted],borderWidth:2}]}),[d.activeUsers,d.inactiveUsers]),T=a.useMemo(()=>({labels:["Has Logged In","Never Logged In"],datasets:[{data:[d.usersWithLogin,d.usersNeverLoggedIn],backgroundColor:[t.accent+"80",t.muted+"80"],borderColor:[t.accent,t.muted],borderWidth:2}]}),[d.usersWithLogin,d.usersNeverLoggedIn]),F={responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom",labels:{font:{family:"Consolas",size:11},color:t.foreground,padding:12,usePointStyle:!0}},tooltip:{backgroundColor:t.background,titleColor:t.foreground,bodyColor:t.foreground,borderColor:t.border,borderWidth:1,padding:12,font:{family:"Consolas",size:11}}}};return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:o.spacing.md},children:[e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:o.spacing.sm,marginBottom:o.spacing.lg},children:[e.jsx(y,{title:"Total Users",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.foreground},children:d.totalUsers})}),e.jsx(y,{title:"Active Users",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.accent},children:d.activeUsers})}),e.jsx(y,{title:"Inactive Users",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.muted},children:d.inactiveUsers})}),e.jsx(y,{title:"Recent Logins (30d)",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.accent},children:d.recentLogins})}),e.jsx(y,{title:"Never Logged In",children:e.jsx("div",{style:{fontFamily:"Consolas",fontSize:14,fontWeight:600,color:t.muted},children:d.usersNeverLoggedIn})})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))",gap:o.spacing.md},children:[e.jsx(y,{title:"ROLE DISTRIBUTION",children:e.jsx("div",{style:{height:"300px",padding:o.spacing.md},children:e.jsx(ee,{data:k,options:F})})}),e.jsx(y,{title:"STATUS DISTRIBUTION",children:e.jsx("div",{style:{height:"300px",padding:o.spacing.md},children:e.jsx(ee,{data:S,options:F})})}),e.jsx(y,{title:"LOGIN STATUS",children:e.jsx("div",{style:{height:"300px",padding:o.spacing.md},children:e.jsx(ee,{data:T,options:F})})})]}),e.jsx(y,{title:"ROLE BREAKDOWN",children:e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:o.spacing.sm,padding:o.spacing.md},children:Object.entries(d.roleCounts).map(([i,v])=>{const b=h=>{switch(h){case"admin":return t.accent;case"user":return t.accent;case"viewer":return t.muted;case"analytics":return t.accent;case"reporting":return t.accent;default:return t.foreground}};return e.jsxs("div",{style:{padding:o.spacing.sm,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${b(i)}`,fontFamily:"Consolas",fontSize:12},children:[e.jsx("div",{style:{color:b(i),fontWeight:600,marginBottom:4,fontSize:11,textTransform:"uppercase"},children:i}),e.jsx("div",{style:{color:t.foreground,fontSize:16,fontWeight:600},children:v}),e.jsxs("div",{style:{color:t.muted,fontSize:10,marginTop:4},children:[d.totalUsers>0?(v/d.totalUsers*100).toFixed(1):0,"%"]})]},i)})})}),e.jsx(y,{title:`USERS TABLE (${r.length} users)`,children:e.jsx("div",{style:{maxHeight:"500px",overflowY:"auto",fontFamily:"Consolas",fontSize:12},children:e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",border:`1px solid ${t.border}`},children:[e.jsx("thead",{style:{position:"sticky",top:0,background:t.background,zIndex:10,borderBottom:`2px solid ${t.border}`},children:e.jsxs("tr",{children:[e.jsx("th",{style:{padding:"12px",textAlign:"left",fontWeight:600,color:t.accent,borderRight:`1px solid ${t.border}`,borderBottom:`1px solid ${t.border}`},children:"Username"}),e.jsx("th",{style:{padding:"12px",textAlign:"left",fontWeight:600,color:t.accent,borderRight:`1px solid ${t.border}`,borderBottom:`1px solid ${t.border}`},children:"Email"}),e.jsx("th",{style:{padding:"12px",textAlign:"left",fontWeight:600,color:t.accent,borderRight:`1px solid ${t.border}`,borderBottom:`1px solid ${t.border}`},children:"Role"}),e.jsx("th",{style:{padding:"12px",textAlign:"left",fontWeight:600,color:t.accent,borderRight:`1px solid ${t.border}`,borderBottom:`1px solid ${t.border}`},children:"Status"}),e.jsx("th",{style:{padding:"12px",textAlign:"left",fontWeight:600,color:t.accent,borderRight:`1px solid ${t.border}`,borderBottom:`1px solid ${t.border}`},children:"Last Login"}),e.jsx("th",{style:{padding:"12px",textAlign:"left",fontWeight:600,color:t.accent,borderBottom:`1px solid ${t.border}`},children:"Created"})]})}),e.jsx("tbody",{children:r.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:6,style:{padding:"40px",textAlign:"center",color:t.muted,fontFamily:"Consolas",fontSize:12},children:"No users found"})}):r.map((i,v)=>{const b=h=>{switch(h){case"admin":return t.accent;case"user":return t.accent;case"viewer":return t.muted;case"analytics":return t.accent;case"reporting":return t.accent;default:return t.foreground}};return e.jsxs("tr",{style:{borderBottom:`1px solid ${t.border}`,transition:"background 0.2s ease",cursor:"pointer"},onMouseEnter:h=>{h.currentTarget.style.background=t.backgroundSoft},onMouseLeave:h=>{h.currentTarget.style.background="transparent"},children:[e.jsx("td",{style:{padding:"12px",borderRight:`1px solid ${t.border}`,color:t.foreground,fontWeight:600},children:i.username}),e.jsx("td",{style:{padding:"12px",borderRight:`1px solid ${t.border}`,color:t.foreground},children:i.email}),e.jsx("td",{style:{padding:"12px",borderRight:`1px solid ${t.border}`},children:e.jsx("span",{style:{padding:"4px 10px",borderRadius:2,fontSize:10,fontFamily:"Consolas",fontWeight:600,backgroundColor:b(i.role)+"20",color:b(i.role),border:`1px solid ${b(i.role)}`,textTransform:"uppercase"},children:i.role})}),e.jsx("td",{style:{padding:"12px",borderRight:`1px solid ${t.border}`},children:e.jsx("span",{style:{padding:"4px 10px",borderRadius:2,fontSize:10,fontFamily:"Consolas",fontWeight:600,backgroundColor:t.backgroundSoft,color:i.active?t.accent:t.muted,border:`1px solid ${i.active?t.accent:t.border}`,textTransform:"uppercase"},children:i.active?"Active":"Inactive"})}),e.jsx("td",{style:{padding:"12px",borderRight:`1px solid ${t.border}`,color:i.last_login?t.foreground:t.muted,fontSize:11},children:i.last_login?V(new Date(i.last_login),"yyyy-MM-dd HH:mm"):"Never"}),e.jsx("td",{style:{padding:"12px",color:t.muted,fontSize:11},children:V(new Date(i.created_at),"yyyy-MM-dd")})]},i.id)})})]})})})]})};x.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;const xe=x.button`
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
`,ye=x.div`
  display: flex;
  gap: ${o.spacing.md};
  justify-content: flex-end;
  margin-top: ${o.spacing.lg};
  padding-top: ${o.spacing.md};
  border-top: 1px solid ${o.colors.border.light};
`,lt=x.span`
  padding: ${o.spacing.xs} ${o.spacing.sm};
  border-radius: 2;
  font-size: 11px;
  font-family: 'Consolas';
  font-weight: 500;
  display: inline-block;
  background-color: ${r=>{switch(r.$role){case"admin":return t.backgroundSoft;case"user":return t.backgroundSoft;case"viewer":return t.backgroundSoft;case"analytics":return t.backgroundSoft;case"reporting":return t.backgroundSoft;default:return t.backgroundSoft}}};
  color: ${r=>{switch(r.$role){case"admin":return t.accent;case"user":return t.accent;case"viewer":return t.muted;case"analytics":return t.accent;case"reporting":return t.accent;default:return t.foreground}}};
  border: 1px solid ${r=>{switch(r.$role){case"admin":return t.accent;case"user":return t.accent;case"viewer":return t.border;case"analytics":return t.accent;case"reporting":return t.accent;default:return t.border}}};
`,Ct=()=>{const{page:r,limit:d,setPage:k}=Be(1,20),{filters:S,setFilter:T}=Ie({role:"",active:""}),[F,i]=a.useState(""),[v,b]=a.useState(""),[h,s]=a.useState([]),[m,g]=a.useState(!0),[l,u]=a.useState(null),[z,be]=a.useState({total:0,totalPages:0,page:1,limit:20}),[oe,ne]=a.useState(!1),[re,se]=a.useState(!1),[L,q]=a.useState(null),[G,ae]=a.useState(null),[p,A]=a.useState({username:"",email:"",password:"",role:"user",active:!0}),[I,K]=a.useState(""),[Q,J]=a.useState(""),[c,D]=a.useState(null),[ve,X]=a.useState(!1),[W,je]=a.useState("list"),[ct,Ce]=a.useState({}),U=a.useRef(!0),R=a.useCallback(async()=>{if(!U.current)return;const n=Date.now(),w=300;try{g(!0),u(null);const Z={page:1,limit:1e3,search:We(v,100)};S.role&&(Z.role=S.role),S.active!==""&&(Z.active=S.active);const de=await P.getUsers(Z),Te=Date.now()-n,Ue=Math.max(0,w-Te);if(await new Promise(j=>setTimeout(j,Ue)),U.current){const j=de.data||[];s(j),be(de.pagination||{total:0,totalPages:0,page:1,limit:20});const Re={totalUsers:j.length,activeUsers:j.filter(f=>f.active).length,inactiveUsers:j.filter(f=>!f.active).length,adminCount:j.filter(f=>f.role==="admin").length,userCount:j.filter(f=>f.role==="user").length,viewerCount:j.filter(f=>f.role==="viewer").length,analyticsCount:j.filter(f=>f.role==="analytics").length,reportingCount:j.filter(f=>f.role==="reporting").length,usersWithLogin:j.filter(f=>f.last_login!==null).length,usersNeverLoggedIn:j.filter(f=>f.last_login===null).length,recentLogins:j.filter(f=>{if(!f.last_login)return!1;const Le=new Date(f.last_login);return(Date.now()-Le.getTime())/(1e3*60*60*24)<=30}).length};Ce(Re)}}catch(M){U.current&&u(H(M))}finally{U.current&&g(!1)}},[S.role,S.active,v]);a.useEffect(()=>(U.current=!0,R(),()=>{U.current=!1}),[R]);const ie=a.useCallback(()=>{b(F),k(1)},[F,k]),Se=a.useCallback(()=>{i(""),b(""),k(1)},[k]),le=a.useCallback((n,w)=>{T(n,w),k(1)},[T,k]),ce=a.useCallback(n=>{n?(q(n),A({username:n.username,email:n.email,password:"",role:n.role,active:n.active})):(q(null),A({username:"",email:"",password:"",role:"user",active:!0})),ne(!0)},[]),O=a.useCallback(()=>{ne(!1),q(null)},[]),$e=a.useCallback(async()=>{try{if(L)await P.updateUser(L.id,{username:p.username,email:p.email,role:p.role,active:p.active});else{if(!p.password||p.password.length<8){u("Password must be at least 8 characters long");return}await P.createUser(p.username,p.email,p.password,p.role)}O(),R()}catch(n){u(H(n))}},[L,p,O,R]),we=a.useCallback(async(n,w)=>{if(confirm(`Are you sure you want to delete user "${w}"?`))try{await P.deleteUser(n),R()}catch(M){U.current&&u(H(M))}},[R]),ke=a.useCallback(async(n,w)=>{try{await P.updateUser(n,{active:!w}),R()}catch(M){U.current&&u(H(M))}},[R]),Fe=a.useCallback(n=>{ae(n),K(""),J(""),se(!0)},[]),N=a.useCallback(()=>{se(!1),ae(null),K(""),J("")},[]),ze=a.useCallback(async()=>{if(G){if(!I||I.length<8){u("Password must be at least 8 characters long");return}if(I!==Q){u("Passwords do not match");return}try{await P.resetUserPassword(G,I),N(),alert("Password reset successfully")}catch(n){u(H(n))}}},[G,I,Q,N]);return m&&h.length===0?e.jsx(Ve,{variant:"table"}):e.jsxs(Ae,{children:[e.jsxs("div",{style:{width:"100%",minHeight:"100vh",padding:o.spacing.lg,fontFamily:"Consolas",fontSize:12,color:t.foreground,backgroundColor:t.background,display:"flex",flexDirection:"column",gap:o.spacing.lg},children:[e.jsx("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:o.spacing.lg,paddingBottom:o.spacing.md,borderBottom:`2px solid ${t.accent}`},children:e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:t.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:t.accent,marginRight:o.spacing.sm},children:$.blockFull}),"USER MANAGEMENT"]})}),ve&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>X(!1),children:e.jsx("div",{style:{width:"90%",maxWidth:1e3,maxHeight:"90vh",overflowY:"auto",fontFamily:"Consolas"},onClick:n=>n.stopPropagation(),className:"modal-scroll-container",children:e.jsx(y,{title:"USER MANAGEMENT PLAYBOOK",children:e.jsxs("div",{style:{padding:o.spacing.md,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:o.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:[$.blockFull," OVERVIEW"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontFamily:"Consolas"},children:"User Management provides centralized control over system access and permissions. Create, edit, and manage user accounts with different role-based access levels. Monitor user activity, track login history, and maintain security through proper access control."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:[$.blockFull," USER ROLES"]}),e.jsxs("div",{style:{marginLeft:o.spacing.md},children:[e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Admin"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Full system access with all privileges. Can create, edit, and delete users, manage all system configurations, access all data sources, and perform administrative operations. Use sparingly and only for trusted administrators."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"User"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Standard user with access to create and manage data pipelines, view catalogs, and perform data operations. Can create custom jobs, manage their own configurations, and access most system features except user management and critical system settings."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.muted,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Viewer"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Read-only access to view catalogs, lineage, governance data, and reports. Cannot create or modify any configurations, jobs, or data. Ideal for stakeholders who need visibility without modification capabilities."})]})]})]}),e.jsxs("div",{style:{marginBottom:o.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:[$.blockFull," USER STATUS"]}),e.jsxs("div",{style:{marginLeft:o.spacing.md},children:[e.jsxs("div",{style:{marginBottom:o.spacing.xs},children:[e.jsx("span",{style:{color:t.accent,fontWeight:600,fontFamily:"Consolas"},children:"Active"}),e.jsx("span",{style:{color:t.foreground,marginLeft:o.spacing.sm,fontSize:11,fontFamily:"Consolas"},children:"User account is enabled and can log in to the system"})]}),e.jsxs("div",{style:{marginBottom:o.spacing.xs},children:[e.jsx("span",{style:{color:t.muted,fontWeight:600,fontFamily:"Consolas"},children:"Inactive"}),e.jsx("span",{style:{color:t.foreground,marginLeft:o.spacing.sm,fontSize:11,fontFamily:"Consolas"},children:"User account is disabled and cannot log in. Useful for temporarily suspending access without deleting the account."})]})]})]}),e.jsxs("div",{style:{marginBottom:o.spacing.lg},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:o.spacing.sm,fontFamily:"Consolas"},children:[$.blockFull," USER MANAGEMENT FEATURES"]}),e.jsxs("div",{style:{marginLeft:o.spacing.md},children:[e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Create User"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Create new user accounts with username, email, password, and role assignment. Passwords must be at least 8 characters long. Username and email must be unique."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Edit User"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Update user information including email, role, and active status. Username cannot be changed after creation. Password changes require the Reset Password function."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Reset Password"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Administrators can reset user passwords. The new password must be at least 8 characters long and must be confirmed. Users will need to use the new password on their next login."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Activate/Deactivate"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Quickly enable or disable user accounts without deleting them. Deactivated users cannot log in but their data and configurations are preserved."})]}),e.jsxs("div",{style:{marginBottom:o.spacing.sm},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:"Delete User"}),e.jsx("div",{style:{color:t.foreground,marginLeft:o.spacing.md,fontSize:11,fontFamily:"Consolas"},children:"Permanently remove a user account from the system. This action cannot be undone. Consider deactivating users instead if you may need to restore access later."})]})]})]}),e.jsxs("div",{style:{marginTop:o.spacing.md,padding:o.spacing.sm,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:t.muted,marginBottom:o.spacing.xs,fontFamily:"Consolas"},children:[$.blockSemi," Security Best Practices"]}),e.jsxs("div",{style:{fontSize:11,color:t.foreground,fontFamily:"Consolas"},children:["• Limit admin accounts to essential personnel only",e.jsx("br",{}),"• Use strong passwords (minimum 8 characters, recommend 12+)",e.jsx("br",{}),"• Regularly review and audit user accounts",e.jsx("br",{}),"• Deactivate unused accounts instead of deleting them",e.jsx("br",{}),"• Monitor last login times to identify inactive accounts",e.jsx("br",{}),"• Use role-based access control to enforce least privilege",e.jsx("br",{}),"• Regularly rotate passwords for sensitive accounts"]})]}),e.jsx("div",{style:{marginTop:o.spacing.md,textAlign:"right"},children:e.jsx(C,{label:"Close",onClick:()=>X(!1),variant:"ghost"})})]})})})}),l&&e.jsx("div",{style:{marginBottom:o.spacing.lg},children:e.jsx(y,{title:"ERROR",children:e.jsx("div",{style:{padding:o.spacing.md,color:t.foreground,fontSize:12,fontFamily:"Consolas",background:t.backgroundSoft,borderRadius:2,border:`2px solid ${t.foreground}`},children:l})})}),e.jsx(y,{title:"SEARCH",children:e.jsxs("div",{style:{display:"flex",gap:o.spacing.sm,alignItems:"center",padding:`${o.spacing.sm} 0`},children:[e.jsx("input",{type:"text",placeholder:"Search by username or email...",value:F,onChange:n=>i(n.target.value),onKeyPress:n=>n.key==="Enter"&&ie(),"aria-label":"Search users by username or email",style:{flex:1,padding:`${o.spacing.xs} ${o.spacing.sm}`,border:`1px solid ${t.border}`,borderRadius:2,fontSize:12,fontFamily:"Consolas",backgroundColor:t.background,color:t.foreground,outline:"none",transition:"border-color 0.15s ease"},onFocus:n=>{n.currentTarget.style.borderColor=t.accent,n.currentTarget.style.outline=`2px solid ${t.accent}`,n.currentTarget.style.outlineOffset="2px"},onBlur:n=>{n.currentTarget.style.borderColor=t.border,n.currentTarget.style.outline="none"}}),e.jsx(C,{label:"Search",onClick:ie,variant:"primary"}),v&&e.jsx(C,{label:"Clear",onClick:Se,variant:"ghost"})]})}),e.jsx("div",{style:{marginTop:o.spacing.lg},children:e.jsx(y,{title:"FILTERS & ACTIONS",children:e.jsxs("div",{style:{display:"flex",flexWrap:"wrap",gap:o.spacing.sm,padding:`${o.spacing.sm} 0`,alignItems:"center"},children:[e.jsx(C,{label:"Add User",onClick:()=>ce(),variant:"primary"}),e.jsxs("select",{value:S.role,onChange:n=>le("role",n.target.value),"aria-label":"Filter by role",style:{padding:`${o.spacing.xs} ${o.spacing.sm}`,border:`1px solid ${t.border}`,borderRadius:2,fontSize:12,fontFamily:"Consolas",backgroundColor:t.background,color:t.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:n=>{n.currentTarget.style.borderColor=t.accent,n.currentTarget.style.outline=`2px solid ${t.accent}`,n.currentTarget.style.outlineOffset="2px"},onBlur:n=>{n.currentTarget.style.borderColor=t.border,n.currentTarget.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Roles"}),e.jsx("option",{value:"admin",children:"Admin"}),e.jsx("option",{value:"user",children:"User"}),e.jsx("option",{value:"viewer",children:"Viewer"}),e.jsx("option",{value:"analytics",children:"Analytics"}),e.jsx("option",{value:"reporting",children:"Reporting"})]}),e.jsxs("select",{value:S.active,onChange:n=>le("active",n.target.value),"aria-label":"Filter by status",style:{padding:`${o.spacing.xs} ${o.spacing.sm}`,border:`1px solid ${t.border}`,borderRadius:2,fontSize:12,fontFamily:"Consolas",backgroundColor:t.background,color:t.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.15s ease"},onFocus:n=>{n.currentTarget.style.borderColor=t.accent,n.currentTarget.style.outline=`2px solid ${t.accent}`,n.currentTarget.style.outlineOffset="2px"},onBlur:n=>{n.currentTarget.style.borderColor=t.border,n.currentTarget.style.outline="none"},children:[e.jsx("option",{value:"",children:"All Status"}),e.jsx("option",{value:"true",children:"Active"}),e.jsx("option",{value:"false",children:"Inactive"})]}),e.jsx(C,{label:"User Management Info",onClick:()=>X(!0),variant:"ghost"}),e.jsx(C,{label:W==="list"?"Show Charts":"Show List",onClick:()=>je(W==="list"?"charts":"list"),variant:W==="charts"?"primary":"ghost"})]})})}),W==="charts"&&e.jsx(it,{users:h,filters:S}),W==="list"&&m?e.jsx("div",{style:{marginTop:o.spacing.lg},children:e.jsx(y,{title:"LOADING",children:e.jsxs("div",{style:{padding:o.spacing.xl,textAlign:"center",fontSize:12,fontFamily:"Consolas",color:t.muted},children:[$.blockFull," Loading users..."]})})}):W==="list"?e.jsxs("div",{style:{display:"grid",gridTemplateColumns:c?"1fr 400px":"1fr",gap:o.spacing.lg},children:[e.jsx(at,{users:h,onUserClick:n=>D(w=>(w==null?void 0:w.id)===n.id?null:n)}),c&&e.jsx(y,{title:"USER DETAILS",children:e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:o.spacing.md,fontFamily:"Consolas",fontSize:12},children:[e.jsxs("div",{children:[e.jsx("strong",{style:{color:t.accent,fontSize:11,fontFamily:"Consolas",fontWeight:600},children:"Username:"}),e.jsx("div",{style:{color:t.foreground,fontSize:12,marginTop:"6px",fontFamily:"Consolas",padding:o.spacing.sm,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`},children:c.username})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:t.accent,fontSize:11,fontFamily:"Consolas",fontWeight:600},children:"Email:"}),e.jsx("div",{style:{color:t.foreground,fontSize:12,marginTop:"6px",fontFamily:"Consolas",padding:o.spacing.sm,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`},children:c.email})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:t.accent,fontSize:11,fontFamily:"Consolas",fontWeight:600},children:"Role:"}),e.jsx("div",{style:{marginTop:"6px"},children:e.jsx(lt,{$role:c.role,children:c.role.toUpperCase()})})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:t.accent,fontSize:11,fontFamily:"Consolas",fontWeight:600},children:"Status:"}),e.jsx("div",{style:{marginTop:o.spacing.xs},children:e.jsx("span",{style:{padding:`${o.spacing.xs} ${o.spacing.sm}`,borderRadius:2,fontSize:11,fontFamily:"Consolas",fontWeight:600,display:"inline-block",backgroundColor:t.backgroundSoft,color:c.active?t.accent:t.muted,border:`1px solid ${c.active?t.accent:t.border}`},children:c.active?"ACTIVE":"INACTIVE"})})]}),e.jsxs("div",{style:{marginTop:o.spacing.md,paddingTop:o.spacing.md,borderTop:`1px solid ${t.border}`},children:[e.jsx("strong",{style:{color:t.muted,fontSize:11,fontFamily:"Consolas",fontWeight:600},children:"Account Information:"}),e.jsxs("div",{style:{marginTop:"8px",display:"flex",flexDirection:"column",gap:"6px"},children:[e.jsxs("div",{children:[e.jsx("span",{style:{color:t.muted,fontSize:10},children:"Created:"})," ",e.jsx("span",{style:{color:t.foreground,fontSize:11},children:V(new Date(c.created_at),"yyyy-MM-dd HH:mm:ss")})]}),c.updated_at&&c.updated_at!==c.created_at&&e.jsxs("div",{children:[e.jsx("span",{style:{color:t.muted,fontSize:10},children:"Updated:"})," ",e.jsx("span",{style:{color:t.foreground,fontSize:11},children:V(new Date(c.updated_at),"yyyy-MM-dd HH:mm:ss")})]}),e.jsxs("div",{children:[e.jsx("span",{style:{color:t.muted,fontSize:10},children:"Last Login:"})," ",e.jsx("span",{style:{color:c.last_login?t.foreground:t.muted,fontSize:11},children:c.last_login?V(new Date(c.last_login),"yyyy-MM-dd HH:mm:ss"):"Never"})]})]})]}),e.jsx("div",{style:{marginTop:o.spacing.md,paddingTop:o.spacing.md,borderTop:`1px solid ${t.border}`},children:e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:o.spacing.sm},children:[e.jsx(C,{label:"Edit User",onClick:()=>{ce(c),D(null)},variant:"primary"}),e.jsx(C,{label:c.active?"Deactivate":"Activate",onClick:()=>{ke(c.id,c.active),D(null)},variant:"ghost"}),e.jsx(C,{label:"Reset Password",onClick:()=>{Fe(c.id),D(null)},variant:"ghost"}),e.jsx(C,{label:"Delete User",onClick:()=>{we(c.id,c.username),D(null)},variant:"ghost"})]})})]})})]}):null,oe&&e.jsx(ge,{$isOpen:oe,onClick:O,children:e.jsxs(ue,{onClick:n=>n.stopPropagation(),children:[e.jsxs(me,{children:[e.jsx(pe,{style:{fontFamily:"Consolas",fontSize:14},children:L?"Edit User":"Create User"}),e.jsx(xe,{onClick:O,"aria-label":"Close modal",children:"×"})]}),e.jsxs(E,{children:[e.jsx(B,{htmlFor:"username",children:"Username *"}),e.jsx(_,{id:"username",type:"text",value:p.username,onChange:n=>A({...p,username:n.target.value}),required:!0,disabled:!!L})]}),e.jsxs(E,{children:[e.jsx(B,{htmlFor:"email",children:"Email *"}),e.jsx(_,{id:"email",type:"email",value:p.email,onChange:n=>A({...p,email:n.target.value}),required:!0})]}),!L&&e.jsxs(E,{children:[e.jsx(B,{htmlFor:"password",children:"Password * (min 8 characters)"}),e.jsx(_,{id:"password",type:"password",value:p.password,onChange:n=>A({...p,password:n.target.value}),required:!0})]}),e.jsxs(E,{children:[e.jsx(B,{htmlFor:"role",children:"Role *"}),e.jsxs(Ee,{id:"role",value:p.role,onChange:n=>A({...p,role:n.target.value}),children:[e.jsx("option",{value:"viewer",children:"Viewer"}),e.jsx("option",{value:"user",children:"User"}),e.jsx("option",{value:"analytics",children:"Analytics"}),e.jsx("option",{value:"reporting",children:"Reporting"}),e.jsx("option",{value:"admin",children:"Admin"})]})]}),e.jsx(E,{children:e.jsxs(B,{children:[e.jsx("input",{type:"checkbox",checked:p.active,onChange:n=>A({...p,active:n.target.checked})})," ","Active"]})}),e.jsxs(ye,{children:[e.jsx(C,{label:"Cancel",onClick:O,variant:"ghost"}),e.jsx(C,{label:L?"Update":"Create",onClick:$e,variant:"primary"})]})]})}),re&&e.jsx(ge,{$isOpen:re,onClick:N,children:e.jsxs(ue,{onClick:n=>n.stopPropagation(),children:[e.jsxs(me,{children:[e.jsx(pe,{style:{fontFamily:"Consolas",fontSize:14},children:"Reset Password"}),e.jsx(xe,{onClick:N,"aria-label":"Close modal",children:"×"})]}),e.jsxs(E,{children:[e.jsx(B,{htmlFor:"newPassword",children:"New Password * (min 8 characters)"}),e.jsx(_,{id:"newPassword",type:"password",value:I,onChange:n=>K(n.target.value),required:!0})]}),e.jsxs(E,{children:[e.jsx(B,{htmlFor:"confirmPassword",children:"Confirm Password *"}),e.jsx(_,{id:"confirmPassword",type:"password",value:Q,onChange:n=>J(n.target.value),required:!0})]}),e.jsxs(ye,{children:[e.jsx(C,{label:"Cancel",onClick:N,variant:"ghost"}),e.jsx(C,{label:"Reset Password",onClick:ze,variant:"primary"})]})]})})]}),e.jsx("style",{children:`
        .modal-scroll-container::-webkit-scrollbar {
          width: 0px;
          display: none;
        }
        
        .modal-scroll-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `})]})};export{Ct as default};
