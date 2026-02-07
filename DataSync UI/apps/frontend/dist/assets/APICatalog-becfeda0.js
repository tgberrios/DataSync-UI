import{m as Ge,f as B,t as o,r as c,X as je,j as e,F,L as z,I as ye,B as Ie,S as be,b as t,e as b}from"./index-f6ac47b8.js";import{A as Xe}from"./AsciiConnectionStringSelector-f0a9a200.js";import{A as de}from"./AsciiPanel-5614714e.js";import{A as ce}from"./AsciiButton-4907e65e.js";import{u as Ye}from"./usePagination-c6b4a268.js";import{u as Je}from"./useTableFilters-7bb371e7.js";import{e as we}from"./errorHandler-5ea9ae85.js";import{s as Ve}from"./validation-24839588.js";import{S as De}from"./SkeletonLoader-792007e7.js";import{f as Ke}from"./index-c4405eea.js";import"./GCSConnectionConfig-f004c48c.js";const Te=Ge`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,qe=Ge`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,Ze=B.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  backdrop-filter: blur(5px);
  background: rgba(0, 0, 0, 0.3);
  z-index: 999;
  animation: ${Te} 0.15s ease-in;
`,et=B.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: ${Te} 0.15s ease-in;
`,tt=B.div`
  background: ${o.colors.background.main};
  padding: ${o.spacing.xxl};
  border-radius: ${o.borderRadius.lg};
  min-width: 700px;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  font-family: ${o.fonts.primary};
  box-shadow: ${o.shadows.lg};
  animation: ${qe} 0.2s ease-out;
  border: 1px solid ${o.colors.border.light};
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${o.colors.background.secondary};
    border-radius: ${o.borderRadius.sm};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${o.colors.border.medium};
    border-radius: ${o.borderRadius.sm};
    
    &:hover {
      background: ${o.colors.primary.main};
    }
  }
`,st=B.div`
  border-bottom: 2px solid ${o.colors.border.dark};
  padding-bottom: ${o.spacing.sm};
  margin-bottom: ${o.spacing.lg};
  font-size: 1.2em;
  font-weight: bold;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 60px;
    height: 2px;
    background: linear-gradient(90deg, ${o.colors.primary.main}, ${o.colors.primary.dark});
  }
`,ot=B.div`
  display: flex;
  justify-content: flex-end;
  gap: ${o.spacing.sm};
  margin-top: ${o.spacing.lg};
`,rt=B.button`
  background: ${o.colors.primary.main};
  color: ${o.colors.background.main};
  border: none;
  border-radius: ${o.borderRadius.md};
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${o.transitions.normal};
  font-size: 0.9em;
  min-width: 40px;
  height: 40px;
  
  &:hover {
    background: ${o.colors.primary.dark};
    transform: translateY(-1px);
  }
  
  &:disabled {
    background: ${o.colors.border.medium};
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
`,nt=B.div`
  display: flex;
  gap: ${o.spacing.sm};
  align-items: flex-start;
`,Be=B.textarea`
  padding: 8px 12px;
  border: 1px solid ${o.colors.border.medium};
  border-radius: ${o.borderRadius.md};
  font-family: ${o.fonts.primary};
  background: ${o.colors.background.main};
  color: ${o.colors.text.primary};
  font-size: 14px;
  width: 100%;
  min-height: 80px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${o.colors.primary.main};
    box-shadow: 0 0 0 2px ${o.colors.primary.light}33;
  }
`,Oe=B.div`
  color: ${o.colors.status.error.text};
  background: ${o.colors.status.error.bg};
  padding: ${o.spacing.sm};
  border-radius: ${o.borderRadius.sm};
  margin-top: ${o.spacing.sm};
  font-size: 0.9em;
  animation: ${Te} 0.3s ease-out;
`;B.div`
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: ${o.borderRadius.sm};
  font-size: 0.9em;
  background-color: ${p=>p.$success?o.colors.status.success.bg:o.colors.status.error.bg};
  color: ${p=>p.$success?o.colors.status.success.text:o.colors.status.error.text};
  animation: ${Te} 0.3s ease-out;
`;const ke=B.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${o.spacing.md};
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`,Fe=B.div`
  display: flex;
  align-items: center;
  gap: ${o.spacing.sm};
  padding: ${o.spacing.md};
  background: linear-gradient(135deg, ${o.colors.primary.light}15 0%, ${o.colors.primary.main}15 100%);
  border: 1px solid ${o.colors.primary.main}40;
  border-radius: ${o.borderRadius.md};
  margin-top: ${o.spacing.sm};
  animation: ${Te} 0.3s ease-out;
  font-size: 0.9em;
  color: ${o.colors.text.primary};
`,Le=B.div`
  width: 16px;
  height: 16px;
  border: 2px solid ${o.colors.primary.light};
  border-top-color: ${o.colors.primary.main};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`,at=B.div`
  margin-top: ${o.spacing.md};
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid ${o.colors.border.light};
  border-radius: ${o.borderRadius.md};
  background: ${o.colors.background.secondary};
  animation: ${qe} 0.3s ease-out;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${o.colors.background.secondary};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${o.colors.border.medium};
    border-radius: ${o.borderRadius.sm};
    
    &:hover {
      background: ${o.colors.primary.main};
    }
  }
`,it=B.div`
  padding: ${o.spacing.md};
  border-bottom: 1px solid ${o.colors.border.light};
  cursor: pointer;
  transition: all ${o.transitions.normal};
  background: ${p=>p.$selected?`${o.colors.primary.main}15`:"transparent"};
  border-left: 3px solid ${p=>p.$selected?o.colors.primary.main:"transparent"};
  
  &:hover {
    background: ${p=>p.$selected?`${o.colors.primary.main}20`:o.colors.background.main};
  }
  
  &:last-child {
    border-bottom: none;
  }
`,lt=B.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: ${o.borderRadius.sm};
  font-size: 0.75em;
  font-weight: 600;
  margin-right: ${o.spacing.sm};
  background: ${p=>p.$method==="GET"?o.colors.status.success.bg:p.$method==="POST"?o.colors.primary.light:o.colors.background.secondary};
  color: ${p=>p.$method==="GET"?o.colors.status.success.text:p.$method==="POST"?o.colors.primary.dark:o.colors.text.secondary};
`,dt=B.span`
  font-family: "Consolas, 'Source Code Pro', monospace";
  color: ${o.colors.text.primary};
  font-size: 0.9em;
`,ze=B.div`
  margin-top: ${o.spacing.md};
  border: 1px solid ${o.colors.border.light};
  border-radius: ${o.borderRadius.md};
  overflow: hidden;
  transition: all ${o.transitions.normal};
`,Me=B.div`
  padding: ${o.spacing.md};
  background: ${o.colors.background.secondary};
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  color: ${o.colors.text.primary};
  transition: all ${o.transitions.normal};
  
  &:hover {
    background: ${o.colors.background.tertiary};
  }
`,We=B.div`
  max-height: ${p=>p.$isOpen?"1000px":"0"};
  overflow: hidden;
  transition: max-height 0.3s ease-out;
  padding: ${p=>p.$isOpen?o.spacing.md:"0"} ${o.spacing.md};
`,ct=B.div`
  margin-top: ${o.spacing.xs};
  padding: ${o.spacing.sm};
  background: ${o.colors.background.secondary};
  border-radius: ${o.borderRadius.sm};
  border-left: 3px solid ${o.colors.primary.main};
  font-family: "Consolas, 'Source Code Pro', monospace";
  font-size: 0.85em;
  color: ${o.colors.text.secondary};
  white-space: pre-wrap;
  word-break: break-all;
`,Ne={MariaDB:"host=localhost;user=myuser;password=mypassword;db=mydatabase;port=3306",MSSQL:"DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost,1433;DATABASE=mydatabase;UID=myuser;PWD=mypassword",Oracle:"host=localhost;user=myuser;password=mypassword;db=mydatabase;port=1521",PostgreSQL:"postgresql://myuser:mypassword@localhost:5432/mydatabase",MongoDB:"mongodb://myuser:mypassword@localhost:27017/mydatabase"},pt={MariaDB:`Format: host=server;user=username;password=password;db=database;port=3306

Example:
host=localhost;user=admin;password=secret123;db=production;port=3306`,MSSQL:`Format: DRIVER={ODBC Driver 17 for SQL Server};SERVER=server,port;DATABASE=database;UID=username;PWD=password

Example:
DRIVER={ODBC Driver 17 for SQL Server};SERVER=sqlserver.example.com,1433;DATABASE=MyDB;UID=sa;PWD=MyPassword123`,Oracle:`Format: host=server;user=username;password=password;db=database;port=1521

Example:
host=oracle.example.com;user=system;password=oracle123;db=ORCL;port=1521`,PostgreSQL:`Format: postgresql://user:password@host:port/database

Example:
postgresql://postgres:postgres123@postgres.example.com:5432/mydb`,MongoDB:`Format: mongodb://username:password@host:port/database

For MongoDB Atlas (cloud): mongodb+srv://username:password@cluster.mongodb.net/database

Example:
mongodb://admin:secret123@localhost:27017/mydb
mongodb+srv://admin:secret123@cluster0.xxxxx.mongodb.net/mydb`},ut=p=>{const d=[],n=/<a[^>]+href=["']([^"']+)["'][^>]*>/gi,W=/["'](\/api\/[^"']+)["']/gi,v=/["'](\/[^"']+)["']/gi,$=/<td[^>]*>([^<]*\/[^<]+)<\/td>/gi,s=/<code[^>]*>([^<]*\/[^<]+)<\/code>/gi,x=/\*\*(\/[^`\s]+)\*\*/g,R=/(https?:\/\/[^\s"']+|\/[^\s"']+)/g;let f;for(;(f=n.exec(p))!==null;){const y=f[1];if(y.startsWith("/")&&!y.startsWith("//")&&!y.includes("mailto:")&&!y.includes("tel:")){const S=y.split("?")[0].split("#")[0];d.includes(S)||d.push(S)}}for(;(f=W.exec(p))!==null;){const S=f[1].split("?")[0].split("#")[0];d.includes(S)||d.push(S)}for(;(f=v.exec(p))!==null;){const y=f[1];if(y.startsWith("/")&&!y.startsWith("//")&&y.length>1){const S=y.split("?")[0].split("#")[0];!d.includes(S)&&!S.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i)&&d.push(S)}}for(;(f=$.exec(p))!==null;){const y=f[1].trim();if(y.startsWith("/")&&!y.startsWith("//")){const S=y.split("?")[0].split("#")[0].trim();!d.includes(S)&&S.length>1&&d.push(S)}}for(;(f=s.exec(p))!==null;){const y=f[1].trim();if(y.startsWith("/")&&!y.startsWith("//")){const S=y.split("?")[0].split("#")[0].trim();!d.includes(S)&&S.length>1&&d.push(S)}}for(;(f=x.exec(p))!==null;){const y=f[1];if(y.startsWith("/")&&!y.startsWith("//")){const S=y.split("?")[0].split("#")[0];!d.includes(S)&&S.length>1&&d.push(S)}}for(;(f=R.exec(p))!==null;){const y=f[1];if(y.startsWith("/")&&!y.startsWith("//")){const S=y.split("?")[0].split("#")[0];!d.includes(S)&&S.length>1&&!S.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i)&&d.push(S)}}return d},gt=async(p,d)=>{try{const n=new AbortController,W=setTimeout(()=>n.abort(),3e3),v=await fetch(`${p}${d}`,{method:"GET",headers:{Accept:"application/json"},signal:n.signal});if(clearTimeout(W),v.ok){const $=await v.json(),s=[];return $.paths&&Object.keys($.paths).forEach(x=>{s.push(x)}),s}}catch{}return[]},ht=({onClose:p,onSave:d,initialData:n,isEdit:W=!1})=>{var X;const v=W||(n==null?void 0:n.api_name)&&!n.api_name.endsWith(" (Copy)"),$=v?n==null?void 0:n.api_name:void 0,[s,x]=c.useState({api_name:v?(n==null?void 0:n.api_name)||"":n!=null&&n.api_name?`${n.api_name} (Copy)`:"",api_type:(n==null?void 0:n.api_type)||"REST",base_url:(n==null?void 0:n.base_url)||"",endpoint:(n==null?void 0:n.endpoint)||"",http_method:(n==null?void 0:n.http_method)||"GET",auth_type:(n==null?void 0:n.auth_type)||"NONE",auth_config:n!=null&&n.auth_config?typeof n.auth_config=="string"?n.auth_config:JSON.stringify(n.auth_config):"{}",target_db_engine:(n==null?void 0:n.target_db_engine)||"",target_connection_string:(n==null?void 0:n.target_connection_string)||"",target_schema:(n==null?void 0:n.target_schema)||"",target_table:(n==null?void 0:n.target_table)||"",request_headers:n!=null&&n.request_headers?typeof n.request_headers=="string"?n.request_headers:JSON.stringify(n.request_headers):"{}",query_params:n!=null&&n.query_params?typeof n.query_params=="string"?n.query_params:JSON.stringify(n.query_params):"{}",sync_interval:(n==null?void 0:n.sync_interval)||3600,status:(n==null?void 0:n.status)||"PENDING",active:(n==null?void 0:n.active)!==void 0?n.active:!0,operation_type:"EXTRACT"}),[R,f]=c.useState(null),[y,S]=c.useState(!1),[h,_]=c.useState(!1),[N,C]=c.useState([]),[E,a]=c.useState(null),[u,m]=c.useState(!1),[j,k]=c.useState(!1),[w,A]=c.useState(null),[H,I]=c.useState(!1),[M,pe]=c.useState(null),[se,O]=c.useState(null),[q,ue]=c.useState(!1),ge=c.useRef(null),Z=c.useRef(""),oe=c.useMemo(()=>s.target_db_engine&&Ne[s.target_db_engine]||"",[s.target_db_engine]),ve=c.useMemo(()=>s.target_db_engine&&pt[s.target_db_engine]||"",[s.target_db_engine]),Ce=c.useCallback(async r=>{if(!(!r||r===Z.current)){_(!0),C([]),a(null),Z.current=r;try{let i=r.trim();if(!i.startsWith("http://")&&!i.startsWith("https://"))throw new Error("URL must start with http:// or https://");const L=new URL(i);i=`${L.protocol}//${L.host}`;const D=L.pathname,Y=[],he=new Set,ne=async(g,T="GET",P={})=>{var _e,ee,fe;const V=`${i}${g}`,me=`${V}_${JSON.stringify(P)}`;if(!he.has(me)){he.add(me);try{const K=new AbortController,Ae=setTimeout(()=>K.abort(),3e3);let te=null;try{te=await fetch(V,{method:T,mode:"cors",signal:K.signal,headers:{Accept:"application/json, */*",...P}})}catch(ae){if(ae.name==="TypeError"||(_e=ae.message)!=null&&_e.includes("CORS")||(ee=ae.message)!=null&&ee.includes("Failed to fetch")||(fe=ae.message)!=null&&fe.includes("NetworkError"))return;throw ae}if(!te)return;if(clearTimeout(Ae),te.ok||te.status===200||te.status===201||te.status===204){const ae=te.headers.get("content-type")||"";let Pe="REST",ie=`Status: ${te.status}`;if(ae.includes("application/json")){Pe="REST";try{const le=await te.clone().json();if(Array.isArray(le))ie=`Returns array (${le.length} items)`;else if(typeof le=="object"){const Re=Object.keys(le);Re.length>0?ie=`Returns JSON (${Re.slice(0,3).join(", ")}${Re.length>3?"...":""})`:ie="Returns JSON object"}}catch{ie="Returns JSON"}}else if(ae.includes("image/"))ie="Returns image";else if(ae.includes("text/html")){const le=await te.text();le.includes("graphql")||le.includes("GraphQL")?(Pe="GraphQL",ie="GraphQL endpoint"):le.includes("swagger")||le.includes("openapi")?ie="API documentation":ie="Returns HTML"}Y.push({path:g,method:T,apiType:Pe,description:ie})}}catch(K){K.name}}},J=new Set;J.add(D||"/"),await(async()=>{try{const g=new AbortController,T=setTimeout(()=>g.abort(),8e3),P=await fetch(`${i}/`,{method:"GET",mode:"cors",signal:g.signal,headers:{Accept:"text/html, application/json, */*"}});if(clearTimeout(T),P.ok||P.status===200){const V=P.headers.get("content-type")||"";if(V.includes("text/html")){const me=await P.text(),_e=ut(me);_e.forEach(ee=>{if(!ee.startsWith("//")&&!ee.startsWith("http")&&ee.length>1){J.add(ee);const fe=ee.split("/").filter(K=>K);if(fe.length>0){let K="";fe.forEach(Ae=>{K+="/"+Ae,K!==ee&&!J.has(K)&&J.add(K)})}}}),_e.length===0&&["/api","/api/cats","/api/tags","/cat","/cat/gif","/docs","/swagger"].forEach(fe=>J.add(fe))}else if(V.includes("application/json")){const me=await P.json();Array.isArray(me)&&J.add("/")}}}catch(g){g.name!=="AbortError"&&["/api","/api/cats","/api/tags","/cat","/cat/gif","/docs","/swagger"].forEach(P=>J.add(P))}})();const Ue=["/openapi.json","/swagger.json","/api-docs","/swagger","/docs"];for(const g of Ue)(await gt(i,g)).forEach(P=>J.add(P));const He=g=>{const T=[],P=g.split("/").filter(V=>V);if(P.length>0){let V="";P.forEach(me=>{V+="/"+me,V!==g&&!J.has(V)&&T.push(V)})}return g.includes("/api/")&&!g.includes("?")&&(T.push(g+"?limit=10"),T.push(g+"?limit=1")),g.includes("/cat")&&!g.includes("?")&&T.push(g+"?json=true"),T};Array.from(J).forEach(g=>{He(g).forEach(P=>{J.has(P)||J.add(P)})});const Se=[],Qe=Array.from(J).sort((g,T)=>g.includes("/api/")&&!T.includes("/api/")?-1:!g.includes("/api/")&&T.includes("/api/")?1:g.includes("/cat")&&!T.includes("/cat")?-1:!g.includes("/cat")&&T.includes("/cat")?1:g.localeCompare(T));for(const g of Qe)Se.push(ne(g,"GET")),(g.includes("/api/")||g.includes("/cat")||g.includes("/tags"))&&Se.push(ne(g,"GET",{Accept:"application/json"})),(g==="/cat"||g.includes("/cat")&&!g.includes("?"))&&Se.push(ne(g+"?json=true","GET")),(g.includes("/api/cats")||g.includes("/cats"))&&!g.includes("?")&&(Se.push(ne(g+"?limit=1","GET")),Se.push(ne(g+"?limit=10","GET")));if(await Promise.allSettled(Se),Y.length===0&&Y.push({path:D||"/",method:"GET",apiType:"REST",description:"Detected from URL"}),Y.sort((g,T)=>g.path==="/api/cats"||g.path==="/api/tags"?-1:T.path==="/api/cats"||T.path==="/api/tags"?1:g.path==="/cat"?-1:T.path==="/cat"?1:g.path.localeCompare(T.path)),C(Y),Y.length>0){const g=Y.find(P=>P.path.includes("/api/"))||Y[0];a(g);const T=g.path;x(P=>({...P,base_url:i,endpoint:T,http_method:g.method,api_type:g.apiType}))}}catch(i){f(i.message||"Error scanning API")}finally{_(!1)}}},[]),$e=c.useCallback(r=>{if(r&&(r.startsWith("http://")||r.startsWith("https://")))try{const i=new URL(r),L=`${i.protocol}//${i.host}`,D=i.pathname||"/";x(Y=>({...Y,base_url:L,endpoint:D}))}catch{x(L=>({...L,base_url:r}))}else x(i=>({...i,base_url:r}))},[]),Ee=c.useCallback(()=>{const r=s.base_url+(s.endpoint==="/"?"":s.endpoint);r&&(r.startsWith("http://")||r.startsWith("https://"))?Ce(r):s.base_url&&(s.base_url.startsWith("http://")||s.base_url.startsWith("https://"))?Ce(s.base_url):f("Please enter a valid URL")},[s.base_url,s.endpoint,Ce]),xe=c.useCallback(()=>{S(!0),setTimeout(()=>{p()},150)},[p]),l=c.useCallback(()=>{if(f(null),!s.api_name.trim()){f("API name is required");return}if(!s.base_url.trim()){f("Base URL is required");return}if(!s.endpoint.trim()){f("Endpoint is required");return}if(!s.target_db_engine){f("Target database engine is required");return}if(!s.target_connection_string.trim()){f("Target connection string is required");return}if(!s.target_schema.trim()){f("Target schema is required");return}if(!s.target_table.trim()){f("Target table is required");return}if(s.target_db_engine==="MongoDB"){if(!s.target_connection_string.startsWith("mongodb://")&&!s.target_connection_string.startsWith("mongodb+srv://")){f("MongoDB connection string must start with mongodb:// or mongodb+srv://");return}}else if(s.target_db_engine==="PostgreSQL"){const D=s.target_connection_string.toLowerCase();if(!D.startsWith("postgresql://")&&!D.startsWith("postgres://")){const he=["host","user","db"].filter(ne=>!D.includes(`${ne}=`));if(he.length>0){f(`PostgreSQL connection string must be in URI format (postgresql://...) or include: ${he.join(", ")}`);return}}}else{const D=["host","user","db"],Y=s.target_connection_string.toLowerCase(),he=D.filter(ne=>!Y.includes(`${ne}=`));if(he.length>0){f(`Connection string must include: ${he.join(", ")}`);return}}let r,i,L;try{r=JSON.parse(s.auth_config||"{}")}catch{f("Invalid JSON in Auth Config");return}try{i=JSON.parse(s.request_headers||"{}")}catch{f("Invalid JSON in Request Headers");return}try{L=JSON.parse(s.query_params||"{}")}catch{f("Invalid JSON in Query Parameters");return}d({api_name:s.api_name.trim(),api_type:s.api_type,base_url:s.base_url.trim(),endpoint:s.endpoint.trim(),http_method:s.http_method,auth_type:s.auth_type,auth_config:r,target_db_engine:s.target_db_engine,target_connection_string:s.target_connection_string.trim(),target_schema:s.target_schema.trim().toLowerCase(),target_table:s.target_table.trim().toLowerCase(),request_body:null,request_headers:i,query_params:L,sync_interval:s.sync_interval,status:s.status,active:s.active},v,$),xe()},[s,d,xe,v,$]),Q=c.useCallback(r=>{x(i=>({...i,target_db_engine:r,target_connection_string:r&&Ne[r]||""})),A(null)},[]),U=c.useCallback(async()=>{if(!s.target_db_engine){A({success:!1,message:"Please select a database engine first"});return}if(!s.target_connection_string.trim()){A({success:!1,message:"Please enter a connection string"});return}k(!0),A(null);try{const r=localStorage.getItem("authToken"),i=await fetch("/api/test-connection",{method:"POST",headers:{"Content-Type":"application/json",...r&&{Authorization:`Bearer ${r}`}},body:JSON.stringify({db_engine:s.target_db_engine,connection_string:s.target_connection_string.trim()})});if(!i.ok){if(i.status===401){A({success:!1,message:"Authentication required. Please log in again."});return}if(i.status===0||i.status>=500){A({success:!1,message:"Server error. Please check if the server is running."});return}}let L;try{L=await i.json()}catch{A({success:!1,message:"Invalid response from server"});return}i.ok&&L.success?A({success:!0,message:L.message||"Connection successful!"}):A({success:!1,message:L.error||L.message||"Connection failed"})}catch(r){r.name==="TypeError"&&r.message.includes("fetch")?A({success:!1,message:"Network error. Please check if the server is running and try again."}):A({success:!1,message:r.message||"Error testing connection"})}finally{k(!1)}},[s.target_db_engine,s.target_connection_string]),G=c.useCallback(r=>{a(r),x(i=>({...i,endpoint:r.path,http_method:r.method,api_type:r.apiType}))},[]),re=c.useCallback(async()=>{if(!s.base_url||!s.endpoint){O("Base URL and endpoint are required");return}I(!0),O(null),pe(null),ue(!0);try{const r=await je.previewAPI({base_url:s.base_url,endpoint:s.endpoint,http_method:s.http_method,auth_type:s.auth_type,auth_config:s.auth_config,request_headers:s.request_headers,query_params:s.query_params});pe(r)}catch(r){O(r.message||"Error previewing API")}finally{I(!1)}},[s]);return e.jsxs(e.Fragment,{children:[e.jsx(Ze,{style:{animation:y?"fadeOut 0.15s ease-out":"fadeIn 0.15s ease-in"},onClick:xe}),e.jsx(et,{style:{animation:y?"fadeOut 0.15s ease-out":"fadeIn 0.15s ease-in"},children:e.jsxs(tt,{onClick:r=>r.stopPropagation(),children:[e.jsx(st,{children:v?`Edit API: ${$}`:"Add New API to Catalog"}),e.jsxs(F,{children:[e.jsx(z,{children:"API Name *"}),e.jsx(ye,{type:"text",value:s.api_name,onChange:r=>x(i=>({...i,api_name:r.target.value})),placeholder:"e.g., Cat API, Users API",disabled:v})]}),e.jsxs(F,{children:[e.jsx(z,{children:"API URL *"}),e.jsxs(nt,{children:[e.jsx(ye,{ref:ge,type:"text",value:s.base_url+(s.endpoint==="/"?"":s.endpoint),onChange:r=>{r.stopPropagation(),$e(r.target.value)},onFocus:r=>r.stopPropagation(),placeholder:"Enter URL here (e.g., https://cataas.com/cat)",style:{flex:1}}),e.jsx(rt,{type:"button",onClick:Ee,disabled:h||!s.base_url||!s.base_url.startsWith("http://")&&!s.base_url.startsWith("https://"),title:"Scan API for endpoints",children:h?e.jsx(Le,{}):e.jsx("svg",{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:e.jsx("path",{d:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.48L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"})})}),e.jsx(Ie,{type:"button",$variant:"secondary",onClick:re,disabled:H||!s.base_url||!s.endpoint||!s.base_url.startsWith("http://")&&!s.base_url.startsWith("https://"),style:{padding:"8px 16px",fontSize:"0.9em",minWidth:"auto"},title:"Preview API data",children:H?"Loading...":"Preview"})]}),h&&e.jsxs(Fe,{children:[e.jsx(Le,{}),e.jsx("span",{children:"Scanning API for endpoints..."})]}),N.length>0&&!h&&e.jsx(at,{children:N.map((r,i)=>e.jsxs(it,{$selected:(E==null?void 0:E.path)===r.path&&(E==null?void 0:E.method)===r.method,onClick:()=>G(r),children:[e.jsx(lt,{$method:r.method,children:r.method}),e.jsx(dt,{children:r.path}),r.description&&e.jsxs("span",{style:{marginLeft:"8px",color:o.colors.text.secondary,fontSize:"0.85em"},children:["- ",r.description]})]},i))}),q&&e.jsxs(ze,{$isOpen:!0,style:{marginTop:o.spacing.md},children:[e.jsxs(Me,{onClick:()=>ue(!q),children:[e.jsxs("span",{children:["API Preview ",M?`(${M.totalItems||((X=M.sampleData)==null?void 0:X.length)||0} items)`:""]}),e.jsx("span",{children:q?"▼":"▶"})]}),e.jsxs(We,{$isOpen:q,children:[H&&e.jsxs(Fe,{children:[e.jsx(Le,{}),e.jsx("span",{children:"Fetching API data..."})]}),se&&e.jsx(Oe,{children:se}),M&&M.sampleData&&e.jsxs("div",{style:{marginTop:o.spacing.sm},children:[e.jsxs("div",{style:{marginBottom:o.spacing.sm,fontSize:"0.9em",color:o.colors.text.secondary},children:["Showing ",M.sampleData.length," of ",M.totalItems||M.sampleData.length," items"]}),e.jsx("div",{style:{maxHeight:"400px",overflow:"auto",border:`1px solid ${o.colors.border.light}`,borderRadius:o.borderRadius.md,padding:o.spacing.sm,background:o.colors.background.secondary,fontFamily:"Consolas, 'Source Code Pro', monospace",fontSize:"0.85em"},children:e.jsx("pre",{style:{margin:0,whiteSpace:"pre-wrap",wordBreak:"break-word"},children:JSON.stringify(M.sampleData,null,2)})})]})]})]})]}),e.jsxs(F,{children:[e.jsx(z,{children:"Operation Type *"}),e.jsxs(be,{value:s.operation_type,onChange:r=>x(i=>({...i,operation_type:r.target.value})),children:[e.jsx("option",{value:"EXTRACT",children:"Extract (Get data from API)"}),e.jsx("option",{value:"SEND",children:"Send (Send data to API)"})]})]}),e.jsxs(ke,{children:[e.jsxs(F,{children:[e.jsx(z,{children:"Base URL *"}),e.jsx(ye,{type:"text",value:s.base_url,onChange:r=>x(i=>({...i,base_url:r.target.value})),placeholder:"e.g., https://api.example.com"})]}),e.jsxs(F,{children:[e.jsx(z,{children:"Endpoint *"}),e.jsx(ye,{type:"text",value:s.endpoint,onChange:r=>x(i=>({...i,endpoint:r.target.value})),placeholder:"e.g., /api/v1/users"})]})]}),e.jsxs(ke,{children:[e.jsxs(F,{children:[e.jsx(z,{children:"API Type"}),e.jsxs(be,{value:s.api_type,onChange:r=>x(i=>({...i,api_type:r.target.value})),children:[e.jsx("option",{value:"REST",children:"REST"}),e.jsx("option",{value:"GraphQL",children:"GraphQL"}),e.jsx("option",{value:"SOAP",children:"SOAP"})]})]}),e.jsxs(F,{children:[e.jsx(z,{children:"HTTP Method *"}),e.jsxs(be,{value:s.http_method,onChange:r=>x(i=>({...i,http_method:r.target.value})),children:[e.jsx("option",{value:"GET",children:"GET"}),e.jsx("option",{value:"POST",children:"POST"})]})]})]}),e.jsxs(ke,{children:[e.jsxs(F,{children:[e.jsx(z,{children:"Auth Type *"}),e.jsxs(be,{value:s.auth_type,onChange:r=>x(i=>({...i,auth_type:r.target.value})),children:[e.jsx("option",{value:"NONE",children:"NONE"}),e.jsx("option",{value:"BASIC",children:"BASIC"}),e.jsx("option",{value:"BEARER",children:"BEARER"}),e.jsx("option",{value:"API_KEY",children:"API_KEY"}),e.jsx("option",{value:"OAUTH2",children:"OAUTH2"})]})]}),e.jsxs(F,{children:[e.jsx(z,{children:"Sync Interval (seconds) *"}),e.jsx(ye,{type:"number",value:s.sync_interval,onChange:r=>x(i=>({...i,sync_interval:parseInt(r.target.value)||3600})),min:"1"})]})]}),e.jsxs(ze,{$isOpen:u,children:[e.jsxs(Me,{onClick:()=>m(!u),children:[e.jsx("span",{children:"Advanced Options"}),e.jsx("span",{children:u?"▼":"▶"})]}),e.jsxs(We,{$isOpen:u,children:[e.jsxs(F,{children:[e.jsx(z,{children:"Auth Config (JSON)"}),e.jsx(Be,{value:s.auth_config,onChange:r=>x(i=>({...i,auth_config:r.target.value})),placeholder:'{"username": "user", "password": "pass"} or {"token": "your_token"}'})]}),e.jsxs(F,{children:[e.jsx(z,{children:"Request Headers (JSON)"}),e.jsx(Be,{value:s.request_headers,onChange:r=>x(i=>({...i,request_headers:r.target.value})),placeholder:'{"Content-Type": "application/json", "Accept": "application/json"}'})]}),e.jsxs(F,{children:[e.jsx(z,{children:"Query Parameters (JSON)"}),e.jsx(Be,{value:s.query_params,onChange:r=>x(i=>({...i,query_params:r.target.value})),placeholder:'{"page": 1, "limit": 100}'})]})]})]}),e.jsxs(F,{children:[e.jsx(z,{children:"Target Database Engine *"}),e.jsxs(be,{value:s.target_db_engine,onChange:r=>Q(r.target.value),children:[e.jsx("option",{value:"",children:"Select Engine"}),e.jsx("option",{value:"MariaDB",children:"MariaDB"}),e.jsx("option",{value:"MSSQL",children:"MSSQL"}),e.jsx("option",{value:"MongoDB",children:"MongoDB"}),e.jsx("option",{value:"Oracle",children:"Oracle"}),e.jsx("option",{value:"PostgreSQL",children:"PostgreSQL"})]})]}),s.target_db_engine&&e.jsxs(F,{children:[e.jsx(z,{children:"Target Connection String Format"}),e.jsx(ct,{children:ve})]}),e.jsx(Xe,{value:s.target_connection_string,onChange:r=>{x(i=>({...i,target_connection_string:r})),A(null)},dbEngine:s.target_db_engine,label:"Target Connection String",required:!0,onTestConnection:U,isTesting:j,testResult:w,placeholder:oe||"Enter connection string..."}),e.jsxs(ke,{children:[e.jsxs(F,{children:[e.jsx(z,{children:"Target Schema *"}),e.jsx(ye,{type:"text",value:s.target_schema,onChange:r=>x(i=>({...i,target_schema:r.target.value})),placeholder:"e.g., public, dbo"})]}),e.jsxs(F,{children:[e.jsx(z,{children:"Target Table *"}),e.jsx(ye,{type:"text",value:s.target_table,onChange:r=>x(i=>({...i,target_table:r.target.value})),placeholder:"e.g., api_data"})]})]}),e.jsxs(ke,{children:[e.jsxs(F,{children:[e.jsx(z,{children:"Status"}),e.jsxs(be,{value:s.status,onChange:r=>x(i=>({...i,status:r.target.value})),children:[e.jsx("option",{value:"PENDING",children:"PENDING"}),e.jsx("option",{value:"IN_PROGRESS",children:"IN_PROGRESS"}),e.jsx("option",{value:"SUCCESS",children:"SUCCESS"}),e.jsx("option",{value:"ERROR",children:"ERROR"})]})]}),e.jsxs(F,{children:[e.jsx(z,{children:"Active"}),e.jsxs(be,{value:s.active.toString(),onChange:r=>x(i=>({...i,active:r.target.value==="true"})),children:[e.jsx("option",{value:"true",children:"Yes"}),e.jsx("option",{value:"false",children:"No"})]})]})]}),R&&e.jsx(Oe,{children:R}),e.jsxs(ot,{children:[e.jsx(Ie,{$variant:"secondary",onClick:xe,children:"Cancel"}),e.jsx(Ie,{$variant:"primary",onClick:l,children:"Add API"})]})]})})]})},mt=({entries:p,onEntryClick:d,onDuplicate:n,onEdit:W,onDelete:v})=>{const[$,s]=c.useState(new Set),[x,R]=c.useState(new Set),f=c.useMemo(()=>{const a=new Map;return p.forEach(u=>{const m=u.target_schema||"Other",j=u.target_table||"Other";a.has(m)||a.set(m,{name:m,tables:new Map});const k=a.get(m);k.tables.has(j)||k.tables.set(j,{name:j,apis:[]}),k.tables.get(j).apis.push(u)}),Array.from(a.values()).sort((u,m)=>u.name.localeCompare(m.name))},[p]),y=a=>{s(u=>{const m=new Set(u);if(m.has(a)){m.delete(a);const j=f.find(k=>k.name===a);j&&j.tables.forEach(k=>{const w=`${a}.${k.name}`;R(A=>{const H=new Set(A);return H.delete(w),H})})}else m.add(a);return m})},S=(a,u)=>{const m=`${a}.${u}`;R(j=>{const k=new Set(j);return k.has(m)?k.delete(m):k.add(m),k})},h=(a,u)=>{if(a===0)return null;const m=[];for(let j=0;j<a-1;j++)m.push(`${b.v}  `);return u?m.push(`${b.bl}${b.h}${b.h} `):m.push(`${b.tRight}${b.h}${b.h} `),e.jsx("span",{style:{color:t.border,marginRight:6,fontFamily:"Consolas",fontSize:11},children:m.join("")})},_=a=>a==="SUCCESS"?t.accent:a==="ERROR"?t.foreground:a==="IN_PROGRESS"?t.muted:t.muted,N=(a,u,m)=>e.jsx("div",{style:{padding:"6px 0",paddingLeft:`${u*24+8}px`,cursor:"pointer",borderLeft:`1px solid ${t.border}`,backgroundColor:t.background,margin:"2px 0",transition:"all 0.2s ease",fontFamily:"Consolas",fontSize:12},onClick:()=>d==null?void 0:d(a),onMouseEnter:j=>{j.currentTarget.style.backgroundColor=t.backgroundSoft,j.currentTarget.style.transform="translateX(2px)"},onMouseLeave:j=>{j.currentTarget.style.backgroundColor=t.background,j.currentTarget.style.transform="translateX(0)"},children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[h(u,m),e.jsx("span",{style:{color:t.muted,fontSize:10},children:b.dot}),e.jsx("span",{style:{fontSize:12,fontWeight:500,margin:0,color:t.muted,fontFamily:"Consolas"},children:a.api_name}),e.jsxs("div",{style:{display:"flex",gap:6,alignItems:"center",marginLeft:"auto",flexWrap:"wrap",fontSize:11},children:[e.jsx("span",{style:{padding:"2px 8px",border:`1px solid ${_(a.status)}`,borderRadius:2,backgroundColor:"transparent",color:_(a.status),fontFamily:"Consolas",fontSize:11},children:a.status}),e.jsx("span",{style:{padding:"1px 6px",border:`1px solid ${t.border}`,borderRadius:2,backgroundColor:"transparent",color:t.muted,fontFamily:"Consolas",fontSize:10},children:a.active?"Active":"Inactive"}),e.jsx("span",{style:{padding:"2px 8px",border:`1px solid ${t.border}`,borderRadius:2,color:t.muted,fontFamily:"Consolas",fontSize:11},children:a.http_method}),e.jsx("span",{style:{padding:"2px 8px",border:`1px solid ${t.border}`,borderRadius:2,color:t.muted,fontFamily:"Consolas",fontSize:11},children:a.api_type}),e.jsxs("div",{style:{display:"flex",gap:4},onClick:j=>j.stopPropagation(),children:[W&&e.jsx(ce,{label:"Edit",onClick:()=>W(a),variant:"ghost"}),v&&e.jsx(ce,{label:"Delete",onClick:()=>v(a),variant:"ghost"}),n&&e.jsx(ce,{label:"Duplicate",onClick:()=>n(a),variant:"primary"})]})]})]})},a.id),C=(a,u,m)=>{const j=`${u}.${a.name}`,k=x.has(j),w=f.find(I=>I.name===u),A=Array.from((w==null?void 0:w.tables.keys())||[]),H=A[A.length-1]===a.name;return e.jsxs("div",{style:{marginBottom:2},children:[e.jsx("div",{style:{padding:"10px 8px",paddingLeft:`${m*24+8}px`,cursor:"pointer",borderLeft:`2px solid ${t.border}`,backgroundColor:t.background,margin:"2px 0",transition:"all 0.2s ease",fontFamily:"Consolas",fontSize:12},onClick:()=>S(u,a.name),onMouseEnter:I=>{I.currentTarget.style.backgroundColor=t.backgroundSoft,I.currentTarget.style.transform="translateX(2px)"},onMouseLeave:I=>{I.currentTarget.style.backgroundColor=t.background,I.currentTarget.style.transform="translateX(0)"},children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[h(m,H),e.jsx("span",{style:{color:t.accent,fontSize:12,fontFamily:"Consolas",display:"inline-block",width:16,textAlign:"center"},children:k?b.arrowDown:b.arrowRight}),e.jsx("span",{style:{color:t.accent},children:b.blockSemi}),e.jsx("h3",{style:{fontSize:13,fontWeight:600,margin:0,color:t.foreground,fontFamily:"Consolas"},children:a.name}),e.jsx("div",{style:{marginLeft:"auto"},children:e.jsxs("span",{style:{padding:"2px 8px",border:`1px solid ${t.border}`,borderRadius:2,color:t.muted,fontFamily:"Consolas",fontSize:11},children:[a.apis.length," ",a.apis.length===1?"API":"APIs"]})})]})}),k&&e.jsx("div",{style:{paddingLeft:`${(m+1)*24+36}px`,animation:"fadeIn 0.3s ease-out"},children:a.apis.map((I,M)=>{const pe=M===a.apis.length-1;return N(I,m+1,pe)})})]},j)},E=(a,u)=>{const m=$.has(a.name),k=f.findIndex(w=>w.name===a.name)===f.length-1;return e.jsxs("div",{style:{marginBottom:2},children:[e.jsx("div",{style:{padding:"12px 8px",paddingLeft:`${u*24+8}px`,cursor:"pointer",borderLeft:`3px solid ${t.accent}`,backgroundColor:m?t.backgroundSoft:t.background,margin:"2px 0",transition:"all 0.2s ease",fontFamily:"Consolas",fontSize:13,fontWeight:600},onClick:()=>y(a.name),onMouseEnter:w=>{w.currentTarget.style.backgroundColor=t.backgroundSoft,w.currentTarget.style.transform="translateX(2px)"},onMouseLeave:w=>{w.currentTarget.style.backgroundColor=m?t.backgroundSoft:t.background,w.currentTarget.style.transform="translateX(0)"},children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[h(u,k),e.jsx("span",{style:{color:t.accent,fontSize:12,fontFamily:"Consolas",display:"inline-block",width:16,textAlign:"center"},children:m?b.arrowDown:b.arrowRight}),e.jsx("span",{style:{color:t.accent},children:b.blockFull}),e.jsx("h2",{style:{fontSize:14,fontWeight:600,margin:0,color:t.accent,fontFamily:"Consolas"},children:a.name}),e.jsx("div",{style:{marginLeft:"auto"},children:e.jsxs("span",{style:{padding:"2px 8px",border:`1px solid ${t.border}`,borderRadius:2,color:t.muted,fontFamily:"Consolas",fontSize:11},children:[a.tables.size," ",a.tables.size===1?"table":"tables"]})})]})}),m&&e.jsx("div",{style:{paddingLeft:`${(u+1)*24+36}px`,animation:"fadeIn 0.3s ease-out"},children:Array.from(a.tables.values()).map(w=>C(w,a.name,u+1))})]},a.name)};return f.length===0?e.jsx(de,{title:"API CATALOG TREE",children:e.jsxs("div",{style:{padding:"60px 40px",textAlign:"center",color:t.muted,fontFamily:"Consolas",fontSize:12},children:[e.jsx("div",{style:{fontSize:48,marginBottom:16,opacity:.5},children:b.blockFull}),e.jsx("div",{style:{fontSize:13,fontWeight:600,marginBottom:8,color:t.foreground},children:"No API entries available"}),e.jsx("div",{style:{fontSize:12,opacity:.7,color:t.muted},children:"APIs will appear here once configured"})]})}):e.jsxs(de,{title:"API CATALOG TREE",children:[e.jsx("div",{style:{maxHeight:800,overflowY:"auto",overflowX:"hidden",padding:"8px 0"},children:f.map((a,u)=>e.jsx("div",{style:{animationDelay:`${u*.05}s`},children:E(a,0)},a.name))}),e.jsx("style",{children:`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `})]})},xt=({tableStructure:p})=>{const[d,n]=c.useState(!0),W=(v,$)=>{if(v===0)return null;const s=[];for(let x=0;x<v-1;x++)s.push(`${b.v}  `);return $?s.push(`${b.bl}${b.h}${b.h} `):s.push(`${b.tRight}${b.h}${b.h} `),e.jsx("span",{style:{color:t.border,marginRight:6,fontFamily:"Consolas",fontSize:11},children:s.join("")})};return e.jsxs("div",{style:{fontFamily:"Consolas",fontSize:12,color:t.foreground},children:[e.jsxs("div",{onClick:()=>n(!d),style:{display:"flex",alignItems:"center",padding:"10px 8px",cursor:"pointer",borderLeft:`2px solid ${t.accent}`,backgroundColor:d?t.backgroundSoft:t.background,transition:"all 0.15s ease",marginBottom:2},onMouseEnter:v=>{v.currentTarget.style.backgroundColor=t.backgroundSoft},onMouseLeave:v=>{d||(v.currentTarget.style.backgroundColor=t.background)},children:[e.jsx("span",{style:{marginRight:8,color:d?t.accent:t.muted,fontSize:10,transition:"transform 0.15s ease",display:"inline-block",transform:d?"rotate(90deg)":"rotate(0deg)"},children:b.arrowRight}),e.jsx("span",{style:{fontWeight:600,color:t.accent,fontSize:12,flex:1},children:p.schema}),e.jsx("span",{style:{padding:"2px 8px",borderRadius:2,fontSize:10,fontWeight:500,border:`1px solid ${t.border}`,backgroundColor:t.backgroundSoft,color:t.foreground},children:p.db_engine})]}),d&&e.jsxs("div",{style:{paddingLeft:24},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",padding:"8px 8px",marginLeft:8,marginBottom:2,borderLeft:`2px solid ${t.border}`,backgroundColor:t.background,transition:"all 0.15s ease"},onMouseEnter:v=>{v.currentTarget.style.backgroundColor=t.backgroundSoft,v.currentTarget.style.borderLeftColor=t.accent},onMouseLeave:v=>{v.currentTarget.style.backgroundColor=t.background,v.currentTarget.style.borderLeftColor=t.border},children:[e.jsx("span",{style:{color:t.muted,fontSize:10,lineHeight:"1.5",paddingTop:"2px",flexShrink:0,width:"12px",fontFamily:"Consolas"},children:b.bl}),e.jsx("span",{style:{color:t.accent,fontSize:11,fontWeight:600,marginLeft:8},children:p.table})]}),p.columns.map((v,$)=>{const s=$===p.columns.length-1;return e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",padding:"6px 8px",marginLeft:8,marginBottom:2,borderLeft:`1px solid ${t.border}`,backgroundColor:"transparent",transition:"all 0.15s ease"},onMouseEnter:x=>{x.currentTarget.style.backgroundColor=t.backgroundSoft,x.currentTarget.style.borderLeftColor=t.accent},onMouseLeave:x=>{x.currentTarget.style.backgroundColor="transparent",x.currentTarget.style.borderLeftColor=t.border},children:[W(2,s),e.jsxs("div",{style:{flex:1,minWidth:0,display:"flex",alignItems:"center",gap:12},children:[e.jsx("span",{style:{fontWeight:500,color:t.accent,fontSize:11,fontFamily:"Consolas"},children:v.name}),e.jsxs("span",{style:{color:t.muted,fontSize:10,fontFamily:"Consolas"},children:[b.v," ",v.type]}),e.jsxs("span",{style:{color:t.muted,fontSize:10,fontFamily:"Consolas",marginLeft:"auto"},children:["#",$+1]})]})]},v.name)})]})]})},Rt=()=>{var xe;const{setPage:p}=Ye(1,20),{filters:d,setFilter:n}=Je({api_type:"",target_db_engine:"",status:"",active:""}),[W,v]=c.useState(""),[$,s]=c.useState(""),[x,R]=c.useState(null),[f,y]=c.useState(!1),[S,h]=c.useState(null),[_,N]=c.useState([]),[C,E]=c.useState(!0),[a,u]=c.useState(null),[m,j]=c.useState([]),[k,w]=c.useState(!1),[A,H]=c.useState(null),[I,M]=c.useState(!1),[pe,se]=c.useState(!1),O=c.useRef(!0),q=c.useCallback(async()=>{var U;if(!O.current)return;const l=Date.now(),Q=300;try{E(!0),R(null);const re={page:1,limit:1e4,search:Ve($,100)};d.api_type&&(re.api_type=d.api_type),d.target_db_engine&&(re.target_db_engine=d.target_db_engine),d.status&&(re.status=d.status),d.active&&(re.active=d.active);const X=await je.getAPIs(re),r=Date.now()-l,i=Math.max(0,Q-r);if(await new Promise(L=>setTimeout(L,i)),O.current){const L=((U=X.data)==null?void 0:U.data)||X.data||[];N(L)}}catch(G){O.current&&R(we(G))}finally{O.current&&E(!1)}},[d.api_type,d.target_db_engine,d.status,d.active,$]);c.useEffect(()=>(O.current=!0,q(),()=>{O.current=!1}),[q,f]);const ue=c.useCallback(()=>{s(W),p(1)},[W,p]),ge=c.useCallback(()=>{v(""),s(""),p(1)},[p]),Z=c.useCallback((l,Q)=>{n(l,Q),p(1)},[n,p]),oe=c.useCallback(async(l,Q=!1,U)=>{try{if(R(null),Q&&U){const{api_name:G,...re}=l,X=_.find(i=>i.api_name===U);await je.updateAPI(U,re),await q(),y(!1),h(null);let r=`API "${U}" updated successfully.`;X&&(X.target_schema!==l.target_schema||X.target_table!==l.target_table)&&(r+=`

REMINDER: The target table has changed.
   Old table: ${X.target_schema}.${X.target_table}
   New table: ${l.target_schema}.${l.target_table}

   Consider manually deleting the old table if no longer needed:
   DROP TABLE IF EXISTS "${X.target_schema}"."${X.target_table}" CASCADE;`),alert(r)}else await je.createAPI(l),await q(),y(!1),h(null),alert(`API "${l.api_name}" added successfully.`)}catch(G){O.current&&(G.message&&G.message.includes("Network Error")?R("Network error. Please check if the server is running and try again."):R(we(G)))}},[q,_]),ve=c.useCallback(l=>{h(l),y(!0)},[]),Ce=c.useCallback(async l=>{var U;const Q=`Are you sure you want to delete API "${l.api_name}"?

This will delete the API from the catalog.

IMPORTANT: Remember to manually delete the target table if no longer needed:
   Table: ${l.target_schema}.${l.target_table}
   Database: ${l.target_db_engine}
   Connection: ${(U=l.target_connection_string)==null?void 0:U.substring(0,50)}...

This action cannot be undone.`;if(confirm(Q))try{R(null),await je.deleteAPI(l.api_name),await q(),(a==null?void 0:a.api_name)===l.api_name&&u(null);const G=`API "${l.api_name}" deleted successfully.

REMINDER: Don't forget to manually delete the target table if no longer needed:
   DROP TABLE IF EXISTS "${l.target_schema}"."${l.target_table}" CASCADE;
   (In database: ${l.target_db_engine})`;alert(G)}catch(G){O.current&&(G.message&&G.message.includes("Network Error")?R("Network error. Please check if the server is running and try again."):R(we(G)))}},[q,a]),$e=c.useCallback(l=>{h(l),y(!0)},[]),Ee=c.useCallback(async l=>{u(l),w(!0),M(!0),j([]),H(null);try{const[Q,U]=await Promise.all([je.getHistory(l.api_name,50),je.getTableStructure(l.api_name).catch(()=>null)]);O.current&&(j(Q),H(U))}catch(Q){O.current&&R(we(Q))}finally{O.current&&(w(!1),M(!1))}},[]);return C&&_.length===0?e.jsx(De,{variant:"table"}):e.jsxs("div",{style:{padding:"20px",fontFamily:"Consolas",fontSize:12},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"},children:[e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:t.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:t.accent,marginRight:8},children:b.blockFull}),"API CATALOG"]}),e.jsx(ce,{label:"API Catalog Info",onClick:()=>se(!0),variant:"ghost"})]}),x&&e.jsx("div",{style:{marginBottom:20},children:e.jsx(de,{title:"ERROR",children:e.jsx("div",{style:{padding:"12px",color:t.foreground,fontSize:12,fontFamily:"Consolas",border:`2px solid ${t.foreground}`},children:x})})}),e.jsx(de,{title:"SEARCH",children:e.jsxs("div",{style:{display:"flex",gap:8,alignItems:"center",padding:"8px 0"},children:[e.jsx("input",{type:"text",placeholder:"Search by API name, endpoint, or target...",value:W,onChange:l=>v(l.target.value),onKeyPress:l=>l.key==="Enter"&&ue(),style:{flex:1,padding:"6px 10px",border:`1px solid ${t.border}`,borderRadius:2,fontSize:12,fontFamily:"Consolas",backgroundColor:t.background,color:t.foreground,outline:"none"},onFocus:l=>{l.currentTarget.style.borderColor=t.accent},onBlur:l=>{l.currentTarget.style.borderColor=t.border}}),e.jsx(ce,{label:"Search",onClick:ue,variant:"primary"}),$&&e.jsx(ce,{label:"Clear",onClick:ge,variant:"ghost"})]})}),e.jsx(de,{title:"FILTERS",children:e.jsxs("div",{style:{display:"flex",flexWrap:"wrap",gap:12,padding:"8px 0"},children:[e.jsx(ce,{label:"Add API",onClick:()=>y(!0),variant:"primary"}),e.jsxs("select",{value:d.api_type,onChange:l=>Z("api_type",l.target.value),style:{padding:"6px 10px",border:`1px solid ${t.border}`,borderRadius:2,fontSize:12,fontFamily:"Consolas",backgroundColor:t.background,color:t.foreground,cursor:"pointer",outline:"none"},onFocus:l=>{l.currentTarget.style.borderColor=t.accent},onBlur:l=>{l.currentTarget.style.borderColor=t.border},children:[e.jsx("option",{value:"",children:"All API Types"}),e.jsx("option",{value:"REST",children:"REST"}),e.jsx("option",{value:"GraphQL",children:"GraphQL"}),e.jsx("option",{value:"SOAP",children:"SOAP"})]}),e.jsxs("select",{value:d.target_db_engine,onChange:l=>Z("target_db_engine",l.target.value),style:{padding:"6px 10px",border:`1px solid ${t.border}`,borderRadius:2,fontSize:12,fontFamily:"Consolas",backgroundColor:t.background,color:t.foreground,cursor:"pointer",outline:"none"},onFocus:l=>{l.currentTarget.style.borderColor=t.accent},onBlur:l=>{l.currentTarget.style.borderColor=t.border},children:[e.jsx("option",{value:"",children:"All Target Engines"}),e.jsx("option",{value:"PostgreSQL",children:"PostgreSQL"}),e.jsx("option",{value:"MariaDB",children:"MariaDB"}),e.jsx("option",{value:"MSSQL",children:"MSSQL"}),e.jsx("option",{value:"MongoDB",children:"MongoDB"}),e.jsx("option",{value:"Oracle",children:"Oracle"}),e.jsx("option",{value:"DB2",children:"DB2"}),e.jsx("option",{value:"Salesforce",children:"Salesforce"}),e.jsx("option",{value:"SAP",children:"SAP"}),e.jsx("option",{value:"Teradata",children:"Teradata"}),e.jsx("option",{value:"Netezza",children:"Netezza"}),e.jsx("option",{value:"Hive",children:"Hive"}),e.jsx("option",{value:"Cassandra",children:"Cassandra"}),e.jsx("option",{value:"DynamoDB",children:"DynamoDB"}),e.jsx("option",{value:"AS400",children:"AS/400"}),e.jsx("option",{value:"S3",children:"S3"}),e.jsx("option",{value:"AzureBlob",children:"Azure Blob"}),e.jsx("option",{value:"GCS",children:"Google Cloud Storage"}),e.jsx("option",{value:"FTP",children:"FTP"}),e.jsx("option",{value:"SFTP",children:"SFTP"}),e.jsx("option",{value:"Email",children:"Email"}),e.jsx("option",{value:"SOAP",children:"SOAP"}),e.jsx("option",{value:"GraphQL",children:"GraphQL"}),e.jsx("option",{value:"Excel",children:"Excel"}),e.jsx("option",{value:"FixedWidth",children:"Fixed Width"}),e.jsx("option",{value:"EBCDIC",children:"EBCDIC"}),e.jsx("option",{value:"XML",children:"XML"}),e.jsx("option",{value:"Avro",children:"Avro"}),e.jsx("option",{value:"Parquet",children:"Parquet"}),e.jsx("option",{value:"ORC",children:"ORC"}),e.jsx("option",{value:"Compressed",children:"Compressed"})]}),e.jsxs("select",{value:d.status,onChange:l=>Z("status",l.target.value),style:{padding:"6px 10px",border:`1px solid ${t.border}`,borderRadius:2,fontSize:12,fontFamily:"Consolas",backgroundColor:t.background,color:t.foreground,cursor:"pointer",outline:"none"},onFocus:l=>{l.currentTarget.style.borderColor=t.accent},onBlur:l=>{l.currentTarget.style.borderColor=t.border},children:[e.jsx("option",{value:"",children:"All Statuses"}),e.jsx("option",{value:"SUCCESS",children:"SUCCESS"}),e.jsx("option",{value:"ERROR",children:"ERROR"}),e.jsx("option",{value:"IN_PROGRESS",children:"IN_PROGRESS"}),e.jsx("option",{value:"PENDING",children:"PENDING"})]}),e.jsxs("select",{value:d.active,onChange:l=>Z("active",l.target.value),style:{padding:"6px 10px",border:`1px solid ${t.border}`,borderRadius:2,fontSize:12,fontFamily:"Consolas",backgroundColor:t.background,color:t.foreground,cursor:"pointer",outline:"none"},onFocus:l=>{l.currentTarget.style.borderColor=t.accent},onBlur:l=>{l.currentTarget.style.borderColor=t.border},children:[e.jsx("option",{value:"",children:"All"}),e.jsx("option",{value:"true",children:"Active"}),e.jsx("option",{value:"false",children:"Inactive"})]})]})}),C?e.jsx("div",{style:{marginTop:20},children:e.jsx(de,{title:"LOADING",children:e.jsxs("div",{style:{padding:"40px",textAlign:"center",fontSize:12,fontFamily:"Consolas",color:t.muted},children:[b.blockFull," Loading tree view..."]})})}):e.jsx("div",{style:{marginTop:20},children:e.jsx(mt,{entries:_,onEntryClick:Ee,onDuplicate:$e,onEdit:ve,onDelete:Ce})}),a&&e.jsx(ft,{api:a,history:m,loading:k,tableStructure:A,loadingStructure:I,onClose:()=>u(null)}),f&&e.jsx(ht,{onClose:()=>{y(!1),h(null)},onSave:oe,initialData:S,isEdit:S&&!((xe=S.api_name)!=null&&xe.endsWith(" (Copy)"))}),pe&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>se(!1),children:e.jsx("div",{style:{width:"90%",maxWidth:1e3,maxHeight:"90vh",overflowY:"auto"},onClick:l=>l.stopPropagation(),children:e.jsx(de,{title:"API CATALOG PLAYBOOK",children:e.jsxs("div",{style:{padding:16,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[b.blockFull," OVERVIEW"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"The API Catalog synchronizes data from REST API endpoints to target databases. APIs are polled at configured intervals and data is loaded using full load strategy (no incremental sync). Each API sync creates a timestamp column (_api_sync_at) to track when data was last synchronized."})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[b.blockFull," SUPPORTED TARGET ENGINES"]}),e.jsxs("div",{style:{color:t.foreground,marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"PostgreSQL:"})," Native PostgreSQL target"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"MariaDB:"})," MySQL-compatible target"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"MSSQL:"})," Microsoft SQL Server target"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"MongoDB:"})," MongoDB document store target"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"└─"})," ",e.jsx("strong",{children:"Oracle:"})," Oracle Database target"]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[b.blockFull," SYNC PROCESS"]}),e.jsxs("div",{style:{color:t.foreground,marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Full Load:"})," Each sync performs complete data replacement (TRUNCATE and INSERT)"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Status Tracking:"})," IN_PROGRESS during sync, SUCCESS/ERROR on completion"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Timestamp Column:"})," _api_sync_at added to track sync time"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"└─"})," ",e.jsx("strong",{children:"Error Handling:"})," Failed syncs are logged with error messages"]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[b.blockFull," HTTP METHODS"]}),e.jsxs("div",{style:{color:t.foreground,marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"GET:"})," Retrieve data from API endpoint"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"POST:"})," Send data to API endpoint"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"PUT:"})," Update data via API endpoint"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"└─"})," ",e.jsx("strong",{children:"DELETE:"})," Delete data via API endpoint"]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[b.blockFull," AUTHENTICATION TYPES"]}),e.jsxs("div",{style:{color:t.foreground,marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"NONE:"})," No authentication required"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"API_KEY:"})," API key authentication via headers or query parameters"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"BASIC:"})," HTTP Basic Authentication"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"BEARER:"})," Bearer token authentication"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"└─"})," ",e.jsx("strong",{children:"OAUTH2:"})," OAuth 2.0 authentication flow"]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[b.blockFull," SYNC INTERVALS"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Configure how frequently the API should be polled for new data. Intervals are specified in seconds. Valid range: 5-3600 seconds (5 seconds to 1 hour). Common intervals: 60 (1 minute), 300 (5 minutes), 3600 (1 hour)."})]}),e.jsxs("div",{style:{marginTop:16,padding:12,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:t.muted,marginBottom:4},children:[b.blockSemi," Best Practices"]}),e.jsxs("div",{style:{fontSize:11,color:t.foreground},children:["• Test API endpoints before enabling synchronization",e.jsx("br",{}),"• Use appropriate authentication methods (API_KEY, BEARER, OAUTH2)",e.jsx("br",{}),"• Set reasonable sync intervals to avoid rate limiting (5-3600 seconds)",e.jsx("br",{}),"• Monitor execution history for failed syncs",e.jsx("br",{}),"• Handle API rate limits and errors gracefully",e.jsx("br",{}),"• Review target table structures for data compatibility",e.jsx("br",{}),"• Use filters to organize APIs by type, engine, or status"]})]}),e.jsx("div",{style:{marginTop:16,textAlign:"right"},children:e.jsx(ce,{label:"Close",onClick:()=>se(!1),variant:"ghost"})})]})})})})]})},ft=({api:p,history:d,loading:n,tableStructure:W,loadingStructure:v,onClose:$})=>{const s=c.useMemo(()=>{const h=[],_=new Set,N=24*60*60*1e3;return d.forEach(C=>{if(!_.has(C.id)){if(C.status==="IN_PROGRESS"){const E=new Date(C.start_time).getTime(),a=d.find(u=>!_.has(u.id)&&(u.status==="SUCCESS"||u.status==="ERROR")&&new Date(u.start_time).getTime()>E&&new Date(u.start_time).getTime()-E<=N);if(a){const u=new Date(C.start_time),m=new Date(a.end_time),j=Math.floor((m.getTime()-u.getTime())/1e3);h.push({...a,start_time:u.toISOString(),end_time:m.toISOString(),duration_seconds:j>0?j:a.duration_seconds||0}),_.add(C.id),_.add(a.id)}else h.push(C),_.add(C.id)}else if(C.status==="SUCCESS"||C.status==="ERROR"){const E=new Date(C.start_time).getTime(),a=d.find(u=>!_.has(u.id)&&u.status==="IN_PROGRESS"&&new Date(u.start_time).getTime()<E&&E-new Date(u.start_time).getTime()<=N);if(a){const u=new Date(a.start_time),m=new Date(C.end_time),j=Math.floor((m.getTime()-u.getTime())/1e3);h.push({...C,start_time:u.toISOString(),end_time:m.toISOString(),duration_seconds:j>0?j:C.duration_seconds||0}),_.add(C.id),_.add(a.id)}else h.push(C),_.add(C.id)}}}),h.sort((C,E)=>new Date(E.start_time).getTime()-new Date(C.start_time).getTime())},[d]),x=Math.max(...s.map(h=>h.duration_seconds||0),1),R=h=>{if(h<60)return`${h}s`;const _=Math.floor(h/60),N=h%60;return`${_}m ${N}s`},f=h=>Ke(new Date(h),"PPpp"),y=h=>h==="SUCCESS"?t.accent:h==="ERROR"?t.foreground:h==="IN_PROGRESS"?t.muted:t.muted,S=({height:h,status:_,tooltipText:N})=>{const[C,E]=c.useState(!1),[a,u]=c.useState({}),[m,j]=c.useState("top"),k=c.useRef(null),w=c.useRef(null),A=y(_),H=()=>{E(!0),setTimeout(()=>{if(k.current&&w.current){const I=k.current.getBoundingClientRect(),M=w.current.getBoundingClientRect(),pe=window.innerHeight,se=window.innerWidth,O=I.top,q=pe-I.bottom,ue=M.height||120,ge=M.width||220;let Z=I.top-ue-12,oe=I.left+I.width/2,ve="top";O<ue+20&&q>O&&(Z=I.bottom+12,ve="bottom"),oe+ge/2>se-10?oe=se-ge/2-10:oe-ge/2<10&&(oe=ge/2+10),u({position:"fixed",top:`${Z}px`,left:`${oe}px`,transform:"translateX(-50%)",zIndex:1e4}),j(ve)}},0)};return e.jsx("div",{ref:k,style:{flex:1,minWidth:20,height:`${h}%`,backgroundColor:A,border:`2px solid ${A}`,borderRadius:"2px 2px 0 0",position:"relative",cursor:"pointer",transition:"all 0.2s ease",fontFamily:"Consolas",fontSize:11},onMouseEnter:H,onMouseLeave:()=>{E(!1),u({}),j("top")},children:C&&e.jsxs("div",{ref:w,style:{...a,backgroundColor:t.foreground,color:t.background,padding:"8px 12px",borderRadius:2,fontSize:11,fontFamily:"Consolas",whiteSpace:"pre-line",pointerEvents:"none",boxShadow:"0 4px 12px rgba(0, 0, 0, 0.3)",minWidth:220,maxWidth:300,textAlign:"left"},children:[N,e.jsx("div",{style:{position:"absolute",[m==="top"?"top":"bottom"]:"100%",left:"50%",transform:"translateX(-50%)",borderTop:m==="top"?`6px solid ${t.foreground}`:"6px solid transparent",borderBottom:m==="bottom"?`6px solid ${t.foreground}`:"6px solid transparent",borderLeft:"6px solid transparent",borderRight:"6px solid transparent"}})]})})};return e.jsxs(e.Fragment,{children:[e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,backdropFilter:"blur(5px)",background:"rgba(0, 0, 0, 0.3)",zIndex:999,animation:"fadeIn 0.2s ease-in"},onClick:$}),e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3,animation:"fadeIn 0.2s ease-in"},onClick:h=>{h.target===h.currentTarget&&$()},children:e.jsxs("div",{style:{background:t.background,borderRadius:2,boxShadow:"0 8px 32px rgba(0, 0, 0, 0.3)",width:"90%",maxWidth:1200,maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column",animation:"slideIn 0.3s ease-out",border:`2px solid ${t.border}`},onClick:h=>h.stopPropagation(),children:[e.jsxs("div",{style:{padding:"16px 20px",borderBottom:`2px solid ${t.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{margin:0,fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.foreground,textTransform:"uppercase"},children:[e.jsx("span",{style:{color:t.accent,marginRight:8},children:b.blockFull}),"EXECUTION TIMELINE: ",p.api_name]}),e.jsx(ce,{label:"Close",onClick:$,variant:"ghost"})]}),e.jsx("div",{style:{padding:"20px",overflowY:"auto",flex:1,fontFamily:"Consolas",fontSize:12},children:n?e.jsxs("div",{style:{textAlign:"center",padding:"40px",color:t.muted,fontFamily:"Consolas",fontSize:12},children:[b.blockFull," Loading execution history..."]}):s.length===0?e.jsxs("div",{style:{textAlign:"center",padding:"40px",color:t.muted,fontFamily:"Consolas",fontSize:12},children:[e.jsx("div",{style:{fontSize:48,marginBottom:16,opacity:.5},children:b.blockFull}),e.jsx("div",{style:{fontSize:13,fontWeight:600,marginBottom:8,color:t.foreground},children:"No execution history available"}),e.jsx("div",{style:{fontSize:12,opacity:.7},children:"No execution history available for this API."})]}):e.jsxs(e.Fragment,{children:[e.jsx(de,{title:"EXECUTION DURATION TIMELINE",children:e.jsxs("div",{style:{position:"relative",paddingLeft:"40px",padding:"8px 0"},children:[e.jsxs("div",{style:{position:"absolute",left:0,top:0,bottom:0,display:"flex",flexDirection:"column",justifyContent:"space-between",fontSize:11,color:t.muted,fontFamily:"Consolas",padding:"8px 0",paddingBottom:"28px"},children:[e.jsx("span",{children:R(x)}),e.jsx("span",{children:R(Math.floor(x/2))}),e.jsx("span",{style:{paddingBottom:"8px"},children:"0s"})]}),e.jsx("div",{style:{display:"flex",alignItems:"flex-end",gap:8,height:200,padding:"8px 0"},children:s.slice(0,20).reverse().map(h=>{const _=x>0?(h.duration_seconds||0)/x*100:0,N=`${h.status}
Duration: ${R(h.duration_seconds||0)}
Start: ${f(h.start_time)}
End: ${f(h.end_time)}`;return e.jsx(S,{height:_,status:h.status,tooltipText:N},h.id)})})]})}),e.jsx("div",{style:{marginTop:20},children:e.jsx(yt,{api:p,tableStructure:W,loading:v})})]})})]})}),e.jsx("style",{children:`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `})]})},yt=({api:p,tableStructure:d,loading:n})=>e.jsx("div",{style:{marginTop:20},children:e.jsx(de,{title:"DATA FLOW: SOURCE → TARGET",children:n?e.jsxs("div",{style:{textAlign:"center",padding:"40px",color:t.muted,fontFamily:"Consolas",fontSize:12},children:[b.blockFull," Loading table structure..."]}):d?e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:24,justifyContent:"center",minHeight:400,padding:"8px 0"},children:[e.jsxs("div",{style:{flex:"0 0 300px",background:t.background,border:`2px solid ${t.accent}`,borderRadius:2,padding:"16px",fontFamily:"Consolas",fontSize:12},children:[e.jsx("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:"8px",borderBottom:`2px solid ${t.border}`,marginBottom:"12px"},children:e.jsxs("div",{children:[e.jsx("h3",{style:{fontSize:13,fontWeight:600,margin:0,color:t.accent,fontFamily:"Consolas"},children:"Source: API"}),e.jsx("div",{style:{fontSize:11,color:t.muted,fontFamily:"Consolas"},children:p.api_type})]})}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8,fontSize:12},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${t.border}`},children:[e.jsx("span",{style:{color:t.muted,fontWeight:500,fontFamily:"Consolas"},children:"API Name:"}),e.jsx("span",{style:{color:t.foreground,wordBreak:"break-all",textAlign:"right",maxWidth:180,fontFamily:"Consolas"},children:p.api_name})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${t.border}`},children:[e.jsx("span",{style:{color:t.muted,fontWeight:500,fontFamily:"Consolas"},children:"Base URL:"}),e.jsx("span",{style:{color:t.foreground,wordBreak:"break-all",textAlign:"right",maxWidth:180,fontFamily:"Consolas"},children:p.base_url})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${t.border}`},children:[e.jsx("span",{style:{color:t.muted,fontWeight:500,fontFamily:"Consolas"},children:"Endpoint:"}),e.jsx("span",{style:{color:t.foreground,wordBreak:"break-all",textAlign:"right",maxWidth:180,fontFamily:"Consolas"},children:p.endpoint})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${t.border}`},children:[e.jsx("span",{style:{color:t.muted,fontWeight:500,fontFamily:"Consolas"},children:"Method:"}),e.jsx("span",{style:{color:t.foreground,wordBreak:"break-all",textAlign:"right",maxWidth:180,fontFamily:"Consolas"},children:p.http_method})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",padding:"6px 0"},children:[e.jsx("span",{style:{color:t.muted,fontWeight:500,fontFamily:"Consolas"},children:"Auth Type:"}),e.jsx("span",{style:{color:t.foreground,wordBreak:"break-all",textAlign:"right",maxWidth:180,fontFamily:"Consolas"},children:p.auth_type})]})]})]}),e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",flex:"0 0 80px",paddingTop:40},children:e.jsx("div",{style:{width:60,height:4,background:t.accent,position:"relative"},children:e.jsx("div",{style:{position:"absolute",right:-8,top:-6,width:0,height:0,borderLeft:`12px solid ${t.accent}`,borderTop:"8px solid transparent",borderBottom:"8px solid transparent"}})})}),e.jsxs("div",{style:{flex:"0 0 350px",background:t.background,border:`2px solid ${t.accent}`,borderRadius:2,padding:"16px",fontFamily:"Consolas",fontSize:12,maxHeight:600,overflowY:"auto"},children:[e.jsx("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:"8px",borderBottom:`2px solid ${t.border}`,marginBottom:"12px"},children:e.jsxs("div",{children:[e.jsxs("h3",{style:{fontSize:13,fontWeight:600,margin:0,color:t.accent,fontFamily:"Consolas"},children:["Target: ",d.table]}),e.jsxs("div",{style:{fontSize:11,color:t.muted,fontFamily:"Consolas",marginBottom:"8px"},children:[d.schema,".",d.table," (",d.db_engine,")"]})]})}),e.jsx(xt,{tableStructure:d})]})]}):e.jsxs("div",{style:{textAlign:"center",padding:"40px",color:t.muted,fontFamily:"Consolas",fontSize:12},children:[e.jsx("div",{style:{fontSize:48,marginBottom:16,opacity:.5},children:b.blockFull}),e.jsx("div",{style:{fontSize:13,fontWeight:600,marginBottom:8,color:t.foreground},children:"Table structure not available"}),e.jsx("div",{style:{fontSize:12,opacity:.7},children:"The table may not exist yet or there was an error loading it."})]})})});export{Rt as default};
