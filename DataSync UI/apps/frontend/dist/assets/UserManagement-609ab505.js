import{m as Q,f as m,b as t,t as i,r as s,j as e,e as h,W as U,X as ke,Y as ie,Z as le,_ as de,$ as ce,F as S,L as $,I as M,S as ze}from"./index-75d7470b.js";import{u as Te}from"./usePagination-b946ac42.js";import{u as Ue}from"./useTableFilters-0b8dd77f.js";import{e as I}from"./errorHandler-5ea9ae85.js";import{s as Ee}from"./validation-24839588.js";import{A as E}from"./AsciiPanel-9f053981.js";import{A as f}from"./AsciiButton-446d8430.js";import{S as Re}from"./SkeletonLoader-530eacc4.js";import{f as X}from"./index-c4405eea.js";const W=Q`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,Fe=Q`
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
`,Pe=Q`
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
`,ue=m.div`
  font-family: "Consolas";
  font-size: 12px;
  background: ${t.background};
  border: 1px solid ${t.border};
  border-radius: 2px;
  padding: ${i.spacing.lg};
  max-height: 800px;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  animation: ${W} 0.3s ease-out;
  
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
    transition: background ${i.transitions.normal};
    
    &:hover {
      background: ${t.accent};
    }
  }
`,Ae=m.div`
  user-select: none;
  margin: 4px 0;
  animation: ${W} 0.3s ease-out;
  animation-fill-mode: both;
  
  &:nth-child(1) { animation-delay: 0.05s; }
  &:nth-child(2) { animation-delay: 0.1s; }
  &:nth-child(3) { animation-delay: 0.15s; }
  &:nth-child(4) { animation-delay: 0.2s; }
  &:nth-child(5) { animation-delay: 0.25s; }
`,Be=m.div`
  display: flex;
  align-items: center;
  padding: ${r=>r.$level===0?"12px 8px":"10px 8px"};
  padding-left: ${r=>r.$level*24+8}px;
  border-radius: 2px;
  transition: all ${i.transitions.normal};
  cursor: pointer;
  position: relative;
  margin: 2px 0;
  font-family: "Consolas";
  font-size: 12px;
  
  ${r=>r.$nodeType==="role"?`
        background: ${t.backgroundSoft};
        border-left: 2px solid ${t.accent};
        font-weight: 600;
      `:`
      border-left: 1px solid ${t.border};
    `}
  
  &:hover {
    background: ${r=>r.$nodeType==="role"?t.accentLight:t.backgroundSoft};
    transform: translateX(2px);
  }
`,Le=m.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 8px;
  border-radius: 2px;
  background: ${r=>r.$isExpanded?t.accent:t.backgroundSoft};
  color: ${r=>r.$isExpanded?"#ffffff":t.accent};
  font-size: 12px;
  font-weight: bold;
  font-family: "Consolas";
  transition: all ${i.transitions.normal};
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.1);
  }
`,Me=m.span`
  font-weight: ${r=>r.$isRole?"700":"500"};
  font-size: ${r=>r.$isRole?"13px":"12px"};
  font-family: "Consolas";
  color: ${r=>r.$isRole?t.accent:t.foreground};
  margin-right: 12px;
  transition: color ${i.transitions.normal};
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`,Ie=m.span`
  padding: 4px 10px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 500;
  font-family: "Consolas";
  background: ${t.backgroundSoft};
  color: ${t.muted};
  border: 1px solid ${t.border};
  margin-left: auto;
  transition: all ${i.transitions.normal};
  
  &:hover {
    background: ${t.accentLight};
    border-color: ${t.accent};
    color: ${t.accent};
    transform: translateY(-1px);
  }
`,We=m.div`
  overflow: hidden;
  animation: ${r=>r.$isExpanded?Fe:Pe} 0.3s ease-out;
  padding-left: ${r=>r.$level*24+36}px;
`,De=m.span`
  color: ${t.muted};
  font-family: "Consolas";
  margin-right: 4px;
  font-size: 12px;
`,Oe=m.div`
  padding: 12px 8px;
  padding-left: ${r=>r.$level*24+36}px;
  margin: 2px 0;
  border-radius: 2px;
  background: ${r=>r.$isSelected?t.accentLight:t.background};
  border-left: 2px solid ${r=>r.$isActive?t.success:t.border};
  transition: all ${i.transitions.normal};
  cursor: pointer;
  animation: ${W} 0.3s ease-out;
  font-family: "Consolas";
  font-size: 12px;
  
  &:hover {
    background: ${t.backgroundSoft};
    border-left-width: 3px;
    transform: translateX(4px);
  }
`,me=m.span`
  padding: 4px 12px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 600;
  font-family: "Consolas";
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all ${i.transitions.normal};
  border: 1px solid;
  
  ${r=>{if(r.$role)switch(r.$role){case"admin":return`
            background: ${t.danger}20;
            color: ${t.danger};
            border-color: ${t.danger};
          `;case"user":return`
            background: ${t.accent}20;
            color: ${t.accent};
            border-color: ${t.accent};
          `;case"viewer":return`
            background: ${t.muted}20;
            color: ${t.muted};
            border-color: ${t.muted};
          `;default:return`
            background: ${t.backgroundSoft};
            color: ${t.foreground};
            border-color: ${t.border};
          `}return r.$active!==void 0?r.$active?`
            background: ${t.success}20;
            color: ${t.success};
            border-color: ${t.success};
          `:`
            background: ${t.backgroundSoft};
            color: ${t.muted};
            border-color: ${t.border};
          `:`
      background: ${t.backgroundSoft};
      color: ${t.foreground};
      border-color: ${t.border};
    `}}
  
  &:hover {
    transform: translateY(-1px);
  }
`,Ne=m.div`
  padding: 60px 40px;
  text-align: center;
  color: ${t.muted};
  animation: ${W} 0.5s ease-out;
  font-family: "Consolas";
  font-size: 12px;
`,He=m.div`
  font-size: 24px;
  margin-bottom: ${i.spacing.md};
  animation: ${W} 0.5s ease-out;
  font-family: "Consolas";
  opacity: 0.5;
`,Ye=m.div`
  font-size: 14px;
  font-family: "Consolas";
  font-weight: 600;
  margin-bottom: ${i.spacing.sm};
  color: ${t.foreground};
`,_e=m.div`
  font-size: 11px;
  font-family: "Consolas";
  opacity: 0.7;
  color: ${t.muted};
`,Ve=({users:r,onUserClick:D})=>{const[y,x]=s.useState(new Set),k=s.useMemo(()=>{const n=new Map,c=["admin","user","viewer"];return r.forEach(l=>{const u=l.role||"user";n.has(u)||n.set(u,{name:u,users:[]}),n.get(u).users.push(l)}),Array.from(n.values()).sort((l,u)=>{const g=c.indexOf(l.name),v=c.indexOf(u.name);return g!==-1&&v!==-1?g-v:g!==-1?-1:v!==-1?1:l.name.localeCompare(u.name)})},[r]),R=n=>{x(c=>{const l=new Set(c);return l.has(n)?l.delete(n):l.add(n),l})},F=(n,c)=>{if(n===0)return null;const l=[];for(let u=0;u<n-1;u++)l.push("│  ");return l.push(c?"└─ ":"├─ "),e.jsx(De,{children:l.join("")})},P=n=>n?new Date(n).toLocaleString():"Never",O=(n,c,l)=>{const u=y.has(n.name);return e.jsxs(Ae,{children:[e.jsxs(Be,{$level:c,$isExpanded:u,$nodeType:"role",onClick:()=>R(n.name),children:[F(c,l),e.jsx(Le,{$isExpanded:u,children:u?h.arrowDown:h.arrowRight}),e.jsx(me,{$role:n.name,children:n.name.toUpperCase()}),e.jsx(Me,{$isRole:!0,children:n.name}),e.jsx(Ie,{children:n.users.length})]}),e.jsx(We,{$isExpanded:u,$level:c,children:u&&n.users.sort((g,v)=>g.username.localeCompare(v.username)).map((g,v)=>N(g,c+1,v===n.users.length-1))})]},n.name)},N=(n,c,l)=>e.jsxs(Oe,{$level:c,$isActive:n.active,onClick:()=>D==null?void 0:D(n),children:[F(c,l),e.jsx("span",{style:{marginRight:"8px",fontFamily:"Consolas",fontSize:12,color:t.accent},children:h.blockFull}),e.jsx("span",{style:{marginRight:"8px",fontWeight:600,fontFamily:"Consolas",fontSize:12,color:t.foreground},children:n.username}),e.jsx("span",{style:{marginRight:"8px",fontFamily:"Consolas",fontSize:11,color:t.muted},children:n.email}),e.jsx(me,{$active:n.active,children:n.active?"Active":"Inactive"}),e.jsx("span",{style:{marginLeft:"auto",fontFamily:"Consolas",fontSize:11,color:t.muted,display:"flex",gap:"8px",alignItems:"center"},children:e.jsxs("span",{children:["Last login: ",P(n.last_login)]})})]},n.id);return k.length===0?e.jsx(ue,{children:e.jsxs(Ne,{children:[e.jsx(He,{children:h.blockFull}),e.jsx(Ye,{children:"No users available"}),e.jsx(_e,{children:"Users will appear here once added."})]})}):e.jsx(ue,{children:k.map((n,c)=>O(n,0,c===k.length-1))})};m.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;const ge=m.button`
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
`,fe=m.div`
  display: flex;
  gap: ${i.spacing.md};
  justify-content: flex-end;
  margin-top: ${i.spacing.lg};
  padding-top: ${i.spacing.md};
  border-top: 1px solid ${i.colors.border.light};
`,qe=m.span`
  padding: 4px 12px;
  border-radius: 2px;
  font-size: 11px;
  font-family: "Consolas";
  font-weight: 500;
  display: inline-block;
  background-color: ${r=>{switch(r.$role){case"admin":return t.danger+"20";case"user":return t.accent+"20";case"viewer":return t.muted+"20";default:return t.backgroundSoft}}};
  color: ${r=>{switch(r.$role){case"admin":return t.danger;case"user":return t.accent;case"viewer":return t.muted;default:return t.foreground}}};
  border: 1px solid ${r=>{switch(r.$role){case"admin":return t.danger;case"user":return t.accent;case"viewer":return t.muted;default:return t.border}}};
`,rt=()=>{const{page:r,limit:D,setPage:y}=Te(1,20),{filters:x,setFilter:k}=Ue({role:"",active:""}),[R,F]=s.useState(""),[P,O]=s.useState(""),[N,n]=s.useState([]),[c,l]=s.useState(!0),[u,g]=s.useState(null),[v,pe]=s.useState({total:0,totalPages:0,page:1,limit:20}),[Z,J]=s.useState(!1),[ee,te]=s.useState(!1),[w,H]=s.useState(null),[Y,oe]=s.useState(null),[d,C]=s.useState({username:"",email:"",password:"",role:"user",active:!0}),[z,_]=s.useState(""),[V,q]=s.useState(""),[a,A]=s.useState(null),[he,G]=s.useState(!1),b=s.useRef(!0),j=s.useCallback(async()=>{if(!b.current)return;const o=Date.now(),p=300;try{l(!0),g(null);const K={page:1,limit:1e3,search:Ee(P,100)};x.role&&(K.role=x.role),x.active!==""&&(K.active=x.active);const ae=await U.getUsers(K),Ce=Date.now()-o,Se=Math.max(0,p-Ce);await new Promise($e=>setTimeout($e,Se)),b.current&&(n(ae.data||[]),pe(ae.pagination||{total:0,totalPages:0,page:1,limit:20}))}catch(T){b.current&&g(I(T))}finally{b.current&&l(!1)}},[x.role,x.active,P]);s.useEffect(()=>(b.current=!0,j(),()=>{b.current=!1}),[j]);const re=s.useCallback(()=>{O(R),y(1)},[R,y]),xe=s.useCallback(()=>{F(""),O(""),y(1)},[y]),ne=s.useCallback((o,p)=>{k(o,p),y(1)},[k,y]),se=s.useCallback(o=>{o?(H(o),C({username:o.username,email:o.email,password:"",role:o.role,active:o.active})):(H(null),C({username:"",email:"",password:"",role:"user",active:!0})),J(!0)},[]),B=s.useCallback(()=>{J(!1),H(null)},[]),ye=s.useCallback(async()=>{try{if(w)await U.updateUser(w.id,{username:d.username,email:d.email,role:d.role,active:d.active});else{if(!d.password||d.password.length<8){g("Password must be at least 8 characters long");return}await U.createUser(d.username,d.email,d.password,d.role)}B(),j()}catch(o){g(I(o))}},[w,d,B,j]),ve=s.useCallback(async(o,p)=>{if(confirm(`Are you sure you want to delete user "${p}"?`))try{await U.deleteUser(o),j()}catch(T){b.current&&g(I(T))}},[j]),be=s.useCallback(async(o,p)=>{try{await U.updateUser(o,{active:!p}),j()}catch(T){b.current&&g(I(T))}},[j]),je=s.useCallback(o=>{oe(o),_(""),q(""),te(!0)},[]),L=s.useCallback(()=>{te(!1),oe(null),_(""),q("")},[]),we=s.useCallback(async()=>{if(Y){if(!z||z.length<8){g("Password must be at least 8 characters long");return}if(z!==V){g("Passwords do not match");return}try{await U.resetUserPassword(Y,z),L(),alert("Password reset successfully")}catch(o){g(I(o))}}},[Y,z,V,L]);return c&&N.length===0?e.jsx(Re,{variant:"table"}):e.jsxs("div",{style:{width:"100%",minHeight:"100vh",padding:"20px",fontFamily:"Consolas",fontSize:12,color:t.foreground,backgroundColor:t.background,display:"flex",flexDirection:"column",gap:20},children:[e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:"0 0 20px 0",color:t.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:t.accent,marginRight:8},children:h.blockFull}),"USER MANAGEMENT"]}),he&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>G(!1),children:e.jsx("div",{style:{width:"90%",maxWidth:1e3,maxHeight:"90vh",overflowY:"auto"},onClick:o=>o.stopPropagation(),children:e.jsx(E,{title:"USER MANAGEMENT PLAYBOOK",children:e.jsxs("div",{style:{padding:16,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[h.blockFull," OVERVIEW"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"User Management provides centralized control over system access and permissions. Create, edit, and manage user accounts with different role-based access levels. Monitor user activity, track login history, and maintain security through proper access control."})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[h.blockFull," USER ROLES"]}),e.jsxs("div",{style:{marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.danger,marginBottom:4},children:"Admin"}),e.jsx("div",{style:{color:t.foreground,marginLeft:16,fontSize:11},children:"Full system access with all privileges. Can create, edit, and delete users, manage all system configurations, access all data sources, and perform administrative operations. Use sparingly and only for trusted administrators."})]}),e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.accent,marginBottom:4},children:"User"}),e.jsx("div",{style:{color:t.foreground,marginLeft:16,fontSize:11},children:"Standard user with access to create and manage data pipelines, view catalogs, and perform data operations. Can create custom jobs, manage their own configurations, and access most system features except user management and critical system settings."})]}),e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.muted,marginBottom:4},children:"Viewer"}),e.jsx("div",{style:{color:t.foreground,marginLeft:16,fontSize:11},children:"Read-only access to view catalogs, lineage, governance data, and reports. Cannot create or modify any configurations, jobs, or data. Ideal for stakeholders who need visibility without modification capabilities."})]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[h.blockFull," USER STATUS"]}),e.jsxs("div",{style:{marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.success,fontWeight:600},children:"Active"}),e.jsx("span",{style:{color:t.foreground,marginLeft:8,fontSize:11},children:"User account is enabled and can log in to the system"})]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted,fontWeight:600},children:"Inactive"}),e.jsx("span",{style:{color:t.foreground,marginLeft:8,fontSize:11},children:"User account is disabled and cannot log in. Useful for temporarily suspending access without deleting the account."})]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[h.blockFull," USER MANAGEMENT FEATURES"]}),e.jsxs("div",{style:{marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:4},children:"Create User"}),e.jsx("div",{style:{color:t.foreground,marginLeft:16,fontSize:11},children:"Create new user accounts with username, email, password, and role assignment. Passwords must be at least 8 characters long. Username and email must be unique."})]}),e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:4},children:"Edit User"}),e.jsx("div",{style:{color:t.foreground,marginLeft:16,fontSize:11},children:"Update user information including email, role, and active status. Username cannot be changed after creation. Password changes require the Reset Password function."})]}),e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:4},children:"Reset Password"}),e.jsx("div",{style:{color:t.foreground,marginLeft:16,fontSize:11},children:"Administrators can reset user passwords. The new password must be at least 8 characters long and must be confirmed. Users will need to use the new password on their next login."})]}),e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.foreground,marginBottom:4},children:"Activate/Deactivate"}),e.jsx("div",{style:{color:t.foreground,marginLeft:16,fontSize:11},children:"Quickly enable or disable user accounts without deleting them. Deactivated users cannot log in but their data and configurations are preserved."})]}),e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:t.danger,marginBottom:4},children:"Delete User"}),e.jsx("div",{style:{color:t.foreground,marginLeft:16,fontSize:11},children:"Permanently remove a user account from the system. This action cannot be undone. Consider deactivating users instead if you may need to restore access later."})]})]})]}),e.jsxs("div",{style:{marginTop:16,padding:12,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:t.muted,marginBottom:4},children:[h.blockSemi," Security Best Practices"]}),e.jsxs("div",{style:{fontSize:11,color:t.foreground},children:["• Limit admin accounts to essential personnel only",e.jsx("br",{}),"• Use strong passwords (minimum 8 characters, recommend 12+)",e.jsx("br",{}),"• Regularly review and audit user accounts",e.jsx("br",{}),"• Deactivate unused accounts instead of deleting them",e.jsx("br",{}),"• Monitor last login times to identify inactive accounts",e.jsx("br",{}),"• Use role-based access control to enforce least privilege",e.jsx("br",{}),"• Regularly rotate passwords for sensitive accounts"]})]}),e.jsx("div",{style:{marginTop:16,textAlign:"right"},children:e.jsx(f,{label:"Close",onClick:()=>G(!1),variant:"ghost"})})]})})})}),u&&e.jsx("div",{style:{marginBottom:20},children:e.jsx(E,{title:"ERROR",children:e.jsx("div",{style:{padding:"12px",color:t.danger,fontSize:12,fontFamily:"Consolas"},children:u})})}),e.jsx(E,{title:"SEARCH",children:e.jsxs("div",{style:{display:"flex",gap:8,alignItems:"center",padding:"8px 0"},children:[e.jsx("input",{type:"text",placeholder:"Search by username or email...",value:R,onChange:o=>F(o.target.value),onKeyPress:o=>o.key==="Enter"&&re(),style:{flex:1,padding:"6px 10px",border:`1px solid ${t.border}`,borderRadius:2,fontSize:12,fontFamily:"Consolas",backgroundColor:t.background,color:t.foreground,outline:"none",transition:"border-color 0.2s, box-shadow 0.2s"},onFocus:o=>{o.currentTarget.style.borderColor=t.accent,o.currentTarget.style.boxShadow=`0 0 0 2px ${t.accent}20`},onBlur:o=>{o.currentTarget.style.borderColor=t.border,o.currentTarget.style.boxShadow="none"}}),e.jsx(f,{label:"Search",onClick:re,variant:"primary"}),P&&e.jsx(f,{label:"Clear",onClick:xe,variant:"ghost"})]})}),e.jsx("div",{style:{marginTop:20},children:e.jsx(E,{title:"FILTERS & ACTIONS",children:e.jsxs("div",{style:{display:"flex",flexWrap:"wrap",gap:12,padding:"12px 0",alignItems:"center"},children:[e.jsx(f,{label:"Add User",onClick:()=>se(),variant:"primary"}),e.jsxs("select",{value:x.role,onChange:o=>ne("role",o.target.value),style:{padding:"6px 10px",border:`1px solid ${t.border}`,borderRadius:2,fontSize:12,fontFamily:"Consolas",backgroundColor:t.background,color:t.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.2s"},onFocus:o=>{o.currentTarget.style.borderColor=t.accent},onBlur:o=>{o.currentTarget.style.borderColor=t.border},children:[e.jsx("option",{value:"",children:"All Roles"}),e.jsx("option",{value:"admin",children:"Admin"}),e.jsx("option",{value:"user",children:"User"}),e.jsx("option",{value:"viewer",children:"Viewer"})]}),e.jsxs("select",{value:x.active,onChange:o=>ne("active",o.target.value),style:{padding:"6px 10px",border:`1px solid ${t.border}`,borderRadius:2,fontSize:12,fontFamily:"Consolas",backgroundColor:t.background,color:t.foreground,cursor:"pointer",outline:"none",transition:"border-color 0.2s"},onFocus:o=>{o.currentTarget.style.borderColor=t.accent},onBlur:o=>{o.currentTarget.style.borderColor=t.border},children:[e.jsx("option",{value:"",children:"All Status"}),e.jsx("option",{value:"true",children:"Active"}),e.jsx("option",{value:"false",children:"Inactive"})]}),e.jsx(f,{label:"User Management Info",onClick:()=>G(!0),variant:"ghost"})]})})}),c?e.jsx("div",{style:{marginTop:20},children:e.jsx(E,{title:"LOADING",children:e.jsxs("div",{style:{padding:"40px",textAlign:"center",fontSize:12,fontFamily:"Consolas",color:t.muted},children:[h.blockFull," Loading users..."]})})}):e.jsxs("div",{style:{display:"grid",gridTemplateColumns:a?"1fr 400px":"1fr",gap:i.spacing.lg},children:[e.jsx(Ve,{users:N,onUserClick:o=>A(p=>(p==null?void 0:p.id)===o.id?null:o)}),a&&e.jsx(E,{title:"USER DETAILS",children:e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:i.spacing.md,fontFamily:"Consolas",fontSize:12},children:[e.jsxs("div",{children:[e.jsx("strong",{style:{color:t.accent,fontSize:11,fontFamily:"Consolas",fontWeight:600},children:"Username:"}),e.jsx("div",{style:{color:t.foreground,fontSize:12,marginTop:"6px",fontFamily:"Consolas",padding:i.spacing.sm,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`},children:a.username})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:t.accent,fontSize:11,fontFamily:"Consolas",fontWeight:600},children:"Email:"}),e.jsx("div",{style:{color:t.foreground,fontSize:12,marginTop:"6px",fontFamily:"Consolas",padding:i.spacing.sm,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`},children:a.email})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:t.accent,fontSize:11,fontFamily:"Consolas",fontWeight:600},children:"Role:"}),e.jsx("div",{style:{marginTop:"6px"},children:e.jsx(qe,{$role:a.role,children:a.role.toUpperCase()})})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:t.accent,fontSize:11,fontFamily:"Consolas",fontWeight:600},children:"Status:"}),e.jsx("div",{style:{marginTop:"6px"},children:e.jsx(ke,{$active:a.active,children:a.active?"ACTIVE":"INACTIVE"})})]}),e.jsxs("div",{style:{marginTop:i.spacing.md,paddingTop:i.spacing.md,borderTop:`1px solid ${t.border}`},children:[e.jsx("strong",{style:{color:t.muted,fontSize:11,fontFamily:"Consolas",fontWeight:600},children:"Account Information:"}),e.jsxs("div",{style:{marginTop:"8px",display:"flex",flexDirection:"column",gap:"6px"},children:[e.jsxs("div",{children:[e.jsx("span",{style:{color:t.muted,fontSize:10},children:"Created:"})," ",e.jsx("span",{style:{color:t.foreground,fontSize:11},children:X(new Date(a.created_at),"yyyy-MM-dd HH:mm:ss")})]}),a.updated_at&&a.updated_at!==a.created_at&&e.jsxs("div",{children:[e.jsx("span",{style:{color:t.muted,fontSize:10},children:"Updated:"})," ",e.jsx("span",{style:{color:t.foreground,fontSize:11},children:X(new Date(a.updated_at),"yyyy-MM-dd HH:mm:ss")})]}),e.jsxs("div",{children:[e.jsx("span",{style:{color:t.muted,fontSize:10},children:"Last Login:"})," ",e.jsx("span",{style:{color:a.last_login?t.foreground:t.muted,fontSize:11},children:a.last_login?X(new Date(a.last_login),"yyyy-MM-dd HH:mm:ss"):"Never"})]})]})]}),e.jsx("div",{style:{marginTop:i.spacing.md,paddingTop:i.spacing.md,borderTop:`1px solid ${t.border}`},children:e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:i.spacing.sm},children:[e.jsx(f,{label:"Edit User",onClick:()=>{se(a),A(null)},variant:"primary"}),e.jsx(f,{label:a.active?"Deactivate":"Activate",onClick:()=>{be(a.id,a.active),A(null)},variant:"ghost"}),e.jsx(f,{label:"Reset Password",onClick:()=>{je(a.id),A(null)},variant:"ghost"}),e.jsx(f,{label:"Delete User",onClick:()=>{ve(a.id,a.username),A(null)},variant:"ghost"})]})})]})})]}),Z&&e.jsx(ie,{$isOpen:Z,onClick:B,children:e.jsxs(le,{onClick:o=>o.stopPropagation(),children:[e.jsxs(de,{children:[e.jsx(ce,{style:{fontFamily:"Consolas",fontSize:14},children:w?"Edit User":"Create User"}),e.jsx(ge,{onClick:B,children:"×"})]}),e.jsxs(S,{children:[e.jsx($,{htmlFor:"username",children:"Username *"}),e.jsx(M,{id:"username",type:"text",value:d.username,onChange:o=>C({...d,username:o.target.value}),required:!0,disabled:!!w})]}),e.jsxs(S,{children:[e.jsx($,{htmlFor:"email",children:"Email *"}),e.jsx(M,{id:"email",type:"email",value:d.email,onChange:o=>C({...d,email:o.target.value}),required:!0})]}),!w&&e.jsxs(S,{children:[e.jsx($,{htmlFor:"password",children:"Password * (min 8 characters)"}),e.jsx(M,{id:"password",type:"password",value:d.password,onChange:o=>C({...d,password:o.target.value}),required:!0})]}),e.jsxs(S,{children:[e.jsx($,{htmlFor:"role",children:"Role *"}),e.jsxs(ze,{id:"role",value:d.role,onChange:o=>C({...d,role:o.target.value}),children:[e.jsx("option",{value:"viewer",children:"Viewer"}),e.jsx("option",{value:"user",children:"User"}),e.jsx("option",{value:"admin",children:"Admin"})]})]}),e.jsx(S,{children:e.jsxs($,{children:[e.jsx("input",{type:"checkbox",checked:d.active,onChange:o=>C({...d,active:o.target.checked})})," ","Active"]})}),e.jsxs(fe,{children:[e.jsx(f,{label:"Cancel",onClick:B,variant:"ghost"}),e.jsx(f,{label:w?"Update":"Create",onClick:ye,variant:"primary"})]})]})}),ee&&e.jsx(ie,{$isOpen:ee,onClick:L,children:e.jsxs(le,{onClick:o=>o.stopPropagation(),children:[e.jsxs(de,{children:[e.jsx(ce,{style:{fontFamily:"Consolas",fontSize:14},children:"Reset Password"}),e.jsx(ge,{onClick:L,children:"×"})]}),e.jsxs(S,{children:[e.jsx($,{htmlFor:"newPassword",children:"New Password * (min 8 characters)"}),e.jsx(M,{id:"newPassword",type:"password",value:z,onChange:o=>_(o.target.value),required:!0})]}),e.jsxs(S,{children:[e.jsx($,{htmlFor:"confirmPassword",children:"Confirm Password *"}),e.jsx(M,{id:"confirmPassword",type:"password",value:V,onChange:o=>q(o.target.value),required:!0})]}),e.jsxs(fe,{children:[e.jsx(f,{label:"Cancel",onClick:L,variant:"ghost"}),e.jsx(f,{label:"Reset Password",onClick:we,variant:"primary"})]})]})})]})};export{rt as default};
