import{m as We,f as P,t as o,r as i,H as Ce,j as e,F as I,L as B,I as ge,B as $e,S as he,b as t,e as C}from"./index-75d7470b.js";import{C as Ue}from"./ConnectionStringSelector-c1083be0.js";import{A as re}from"./AsciiPanel-9f053981.js";import{A as me}from"./AsciiButton-446d8430.js";import{u as qe}from"./usePagination-b946ac42.js";import{u as He}from"./useTableFilters-0b8dd77f.js";import{e as Ae}from"./errorHandler-5ea9ae85.js";import{s as Qe}from"./validation-24839588.js";import{S as Ye}from"./SkeletonLoader-530eacc4.js";import{f as Je}from"./index-c4405eea.js";const _e=We`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,Ne=We`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,Xe=P.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  backdrop-filter: blur(5px);
  background: rgba(0, 0, 0, 0.3);
  z-index: 999;
  animation: ${_e} 0.15s ease-in;
`,Ve=P.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: ${_e} 0.15s ease-in;
`,Ke=P.div`
  background: ${o.colors.background.main};
  padding: ${o.spacing.xxl};
  border-radius: ${o.borderRadius.lg};
  min-width: 700px;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  font-family: ${o.fonts.primary};
  box-shadow: ${o.shadows.lg};
  animation: ${Ne} 0.2s ease-out;
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
`,Ze=P.div`
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
`,et=P.div`
  display: flex;
  justify-content: flex-end;
  gap: ${o.spacing.sm};
  margin-top: ${o.spacing.lg};
`,tt=P.button`
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
`,st=P.div`
  display: flex;
  gap: ${o.spacing.sm};
  align-items: flex-start;
`,Pe=P.textarea`
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
`,Be=P.div`
  color: ${o.colors.status.error.text};
  background: ${o.colors.status.error.bg};
  padding: ${o.spacing.sm};
  border-radius: ${o.borderRadius.sm};
  margin-top: ${o.spacing.sm};
  font-size: 0.9em;
  animation: ${_e} 0.3s ease-out;
`;P.div`
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: ${o.borderRadius.sm};
  font-size: 0.9em;
  background-color: ${c=>c.$success?o.colors.status.success.bg:o.colors.status.error.bg};
  color: ${c=>c.$success?o.colors.status.success.text:o.colors.status.error.text};
  animation: ${_e} 0.3s ease-out;
`;const Se=P.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${o.spacing.md};
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`,Le=P.div`
  display: flex;
  align-items: center;
  gap: ${o.spacing.sm};
  padding: ${o.spacing.md};
  background: linear-gradient(135deg, ${o.colors.primary.light}15 0%, ${o.colors.primary.main}15 100%);
  border: 1px solid ${o.colors.primary.main}40;
  border-radius: ${o.borderRadius.md};
  margin-top: ${o.spacing.sm};
  animation: ${_e} 0.3s ease-out;
  font-size: 0.9em;
  color: ${o.colors.text.primary};
`,Re=P.div`
  width: 16px;
  height: 16px;
  border: 2px solid ${o.colors.primary.light};
  border-top-color: ${o.colors.primary.main};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`,ot=P.div`
  margin-top: ${o.spacing.md};
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid ${o.colors.border.light};
  border-radius: ${o.borderRadius.md};
  background: ${o.colors.background.secondary};
  animation: ${Ne} 0.3s ease-out;
  
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
`,nt=P.div`
  padding: ${o.spacing.md};
  border-bottom: 1px solid ${o.colors.border.light};
  cursor: pointer;
  transition: all ${o.transitions.normal};
  background: ${c=>c.$selected?`${o.colors.primary.main}15`:"transparent"};
  border-left: 3px solid ${c=>c.$selected?o.colors.primary.main:"transparent"};
  
  &:hover {
    background: ${c=>c.$selected?`${o.colors.primary.main}20`:o.colors.background.main};
  }
  
  &:last-child {
    border-bottom: none;
  }
`,rt=P.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: ${o.borderRadius.sm};
  font-size: 0.75em;
  font-weight: 600;
  margin-right: ${o.spacing.sm};
  background: ${c=>c.$method==="GET"?o.colors.status.success.bg:c.$method==="POST"?o.colors.primary.light:o.colors.background.secondary};
  color: ${c=>c.$method==="GET"?o.colors.status.success.text:c.$method==="POST"?o.colors.primary.dark:o.colors.text.secondary};
`,at=P.span`
  font-family: "Consolas, 'Source Code Pro', monospace";
  color: ${o.colors.text.primary};
  font-size: 0.9em;
`,Fe=P.div`
  margin-top: ${o.spacing.md};
  border: 1px solid ${o.colors.border.light};
  border-radius: ${o.borderRadius.md};
  overflow: hidden;
  transition: all ${o.transitions.normal};
`,Oe=P.div`
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
`,ze=P.div`
  max-height: ${c=>c.$isOpen?"1000px":"0"};
  overflow: hidden;
  transition: max-height 0.3s ease-out;
  padding: ${c=>c.$isOpen?o.spacing.md:"0"} ${o.spacing.md};
`,it=P.div`
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
`,Me={MariaDB:"host=localhost;user=myuser;password=mypassword;db=mydatabase;port=3306",MSSQL:"DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost,1433;DATABASE=mydatabase;UID=myuser;PWD=mypassword",Oracle:"host=localhost;user=myuser;password=mypassword;db=mydatabase;port=1521",PostgreSQL:"postgresql://myuser:mypassword@localhost:5432/mydatabase",MongoDB:"mongodb://myuser:mypassword@localhost:27017/mydatabase"},lt={MariaDB:`Format: host=server;user=username;password=password;db=database;port=3306

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
mongodb+srv://admin:secret123@cluster0.xxxxx.mongodb.net/mydb`},dt=c=>{const l=[],h=/<a[^>]+href=["']([^"']+)["'][^>]*>/gi,s=/["'](\/api\/[^"']+)["']/gi,b=/["'](\/[^"']+)["']/gi,$=/<td[^>]*>([^<]*\/[^<]+)<\/td>/gi,v=/<code[^>]*>([^<]*\/[^<]+)<\/code>/gi,A=/\*\*(\/[^`\s]+)\*\*/g,L=/(https?:\/\/[^\s"']+|\/[^\s"']+)/g;let _;for(;(_=h.exec(c))!==null;){const m=_[1];if(m.startsWith("/")&&!m.startsWith("//")&&!m.includes("mailto:")&&!m.includes("tel:")){const j=m.split("?")[0].split("#")[0];l.includes(j)||l.push(j)}}for(;(_=s.exec(c))!==null;){const j=_[1].split("?")[0].split("#")[0];l.includes(j)||l.push(j)}for(;(_=b.exec(c))!==null;){const m=_[1];if(m.startsWith("/")&&!m.startsWith("//")&&m.length>1){const j=m.split("?")[0].split("#")[0];!l.includes(j)&&!j.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i)&&l.push(j)}}for(;(_=$.exec(c))!==null;){const m=_[1].trim();if(m.startsWith("/")&&!m.startsWith("//")){const j=m.split("?")[0].split("#")[0].trim();!l.includes(j)&&j.length>1&&l.push(j)}}for(;(_=v.exec(c))!==null;){const m=_[1].trim();if(m.startsWith("/")&&!m.startsWith("//")){const j=m.split("?")[0].split("#")[0].trim();!l.includes(j)&&j.length>1&&l.push(j)}}for(;(_=A.exec(c))!==null;){const m=_[1];if(m.startsWith("/")&&!m.startsWith("//")){const j=m.split("?")[0].split("#")[0];!l.includes(j)&&j.length>1&&l.push(j)}}for(;(_=L.exec(c))!==null;){const m=_[1];if(m.startsWith("/")&&!m.startsWith("//")){const j=m.split("?")[0].split("#")[0];!l.includes(j)&&j.length>1&&!j.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i)&&l.push(j)}}return l},ct=async(c,l)=>{try{const h=new AbortController,s=setTimeout(()=>h.abort(),3e3),b=await fetch(`${c}${l}`,{method:"GET",headers:{Accept:"application/json"},signal:h.signal});if(clearTimeout(s),b.ok){const $=await b.json(),v=[];return $.paths&&Object.keys($.paths).forEach(A=>{v.push(A)}),v}}catch{}return[]},pt=({onClose:c,onSave:l,initialData:h})=>{var ve;const[s,b]=i.useState({api_name:h!=null&&h.api_name?`${h.api_name} (Copy)`:"",api_type:(h==null?void 0:h.api_type)||"REST",base_url:(h==null?void 0:h.base_url)||"",endpoint:(h==null?void 0:h.endpoint)||"",http_method:(h==null?void 0:h.http_method)||"GET",auth_type:(h==null?void 0:h.auth_type)||"NONE",auth_config:h!=null&&h.auth_config?typeof h.auth_config=="string"?h.auth_config:JSON.stringify(h.auth_config):"{}",target_db_engine:(h==null?void 0:h.target_db_engine)||"",target_connection_string:(h==null?void 0:h.target_connection_string)||"",target_schema:"",target_table:"",request_headers:"{}",query_params:"{}",sync_interval:3600,status:"PENDING",active:!0,operation_type:"EXTRACT"}),[$,v]=i.useState(null),[A,L]=i.useState(!1),[_,m]=i.useState(!1),[j,x]=i.useState([]),[w,F]=i.useState(null),[r,f]=i.useState(!1),[u,p]=i.useState(!1),[S,y]=i.useState(null),[z,M]=i.useState(!1),[T,V]=i.useState(null),[N,K]=i.useState(null),[le,de]=i.useState(!1),O=i.useRef(null),Y=i.useRef(""),ce=i.useMemo(()=>s.target_db_engine&&Me[s.target_db_engine]||"",[s.target_db_engine]),ae=i.useMemo(()=>s.target_db_engine&&lt[s.target_db_engine]||"",[s.target_db_engine]),q=i.useCallback(async n=>{if(!(!n||n===Y.current)){m(!0),x([]),F(null),Y.current=n;try{let a=n.trim();if(!a.startsWith("http://")&&!a.startsWith("https://"))throw new Error("URL must start with http:// or https://");const R=new URL(a);a=`${R.protocol}//${R.host}`;const H=R.pathname,W=[],ie=new Set,ee=async(d,k="GET",E={})=>{var je,J,ue;const U=`${a}${d}`,te=`${U}_${JSON.stringify(E)}`;if(!ie.has(te)){ie.add(te);try{const Q=new AbortController,ke=setTimeout(()=>Q.abort(),3e3);let X=null;try{X=await fetch(U,{method:k,mode:"cors",signal:Q.signal,headers:{Accept:"application/json, */*",...E}})}catch(se){if(se.name==="TypeError"||(je=se.message)!=null&&je.includes("CORS")||(J=se.message)!=null&&J.includes("Failed to fetch")||(ue=se.message)!=null&&ue.includes("NetworkError"))return;throw se}if(!X)return;if(clearTimeout(ke),X.ok||X.status===200||X.status===201||X.status===204){const se=X.headers.get("content-type")||"";let Te="REST",oe=`Status: ${X.status}`;if(se.includes("application/json")){Te="REST";try{const ne=await X.clone().json();if(Array.isArray(ne))oe=`Returns array (${ne.length} items)`;else if(typeof ne=="object"){const Ee=Object.keys(ne);Ee.length>0?oe=`Returns JSON (${Ee.slice(0,3).join(", ")}${Ee.length>3?"...":""})`:oe="Returns JSON object"}}catch{oe="Returns JSON"}}else if(se.includes("image/"))oe="Returns image";else if(se.includes("text/html")){const ne=await X.text();ne.includes("graphql")||ne.includes("GraphQL")?(Te="GraphQL",oe="GraphQL endpoint"):ne.includes("swagger")||ne.includes("openapi")?oe="API documentation":oe="Returns HTML"}W.push({path:d,method:k,apiType:Te,description:oe})}}catch(Q){Q.name}}},G=new Set;G.add(H||"/"),await(async()=>{try{const d=new AbortController,k=setTimeout(()=>d.abort(),8e3),E=await fetch(`${a}/`,{method:"GET",mode:"cors",signal:d.signal,headers:{Accept:"text/html, application/json, */*"}});if(clearTimeout(k),E.ok||E.status===200){const U=E.headers.get("content-type")||"";if(U.includes("text/html")){const te=await E.text();console.log("HTML length:",te.length);const je=dt(te);console.log("Discovered endpoints from HTML:",je),je.forEach(J=>{if(!J.startsWith("//")&&!J.startsWith("http")&&J.length>1){G.add(J);const ue=J.split("/").filter(Q=>Q);if(ue.length>0){let Q="";ue.forEach(ke=>{Q+="/"+ke,Q!==J&&!G.has(Q)&&G.add(Q)})}}}),je.length===0&&(console.log("No endpoints found in HTML, trying common patterns..."),["/api","/api/cats","/api/tags","/cat","/cat/gif","/docs","/swagger"].forEach(ue=>G.add(ue)))}else if(U.includes("application/json")){const te=await E.json();Array.isArray(te)&&G.add("/")}}}catch(d){d.name!=="AbortError"&&(console.log("Error fetching root:",d.message),console.log("Trying common endpoints as fallback..."),["/api","/api/cats","/api/tags","/cat","/cat/gif","/docs","/swagger"].forEach(E=>G.add(E)))}})();const De=["/openapi.json","/swagger.json","/api-docs","/swagger","/docs"];for(const d of De)(await ct(a,d)).forEach(E=>G.add(E));const Ge=d=>{const k=[],E=d.split("/").filter(U=>U);if(E.length>0){let U="";E.forEach(te=>{U+="/"+te,U!==d&&!G.has(U)&&k.push(U)})}return d.includes("/api/")&&!d.includes("?")&&(k.push(d+"?limit=10"),k.push(d+"?limit=1")),d.includes("/cat")&&!d.includes("?")&&k.push(d+"?json=true"),k};Array.from(G).forEach(d=>{Ge(d).forEach(E=>{G.has(E)||G.add(E)})});const be=[],Ie=Array.from(G).sort((d,k)=>d.includes("/api/")&&!k.includes("/api/")?-1:!d.includes("/api/")&&k.includes("/api/")?1:d.includes("/cat")&&!k.includes("/cat")?-1:!d.includes("/cat")&&k.includes("/cat")?1:d.localeCompare(k));console.log(`Testing ${Ie.length} endpoints...`);for(const d of Ie)be.push(ee(d,"GET")),(d.includes("/api/")||d.includes("/cat")||d.includes("/tags"))&&be.push(ee(d,"GET",{Accept:"application/json"})),(d==="/cat"||d.includes("/cat")&&!d.includes("?"))&&be.push(ee(d+"?json=true","GET")),(d.includes("/api/cats")||d.includes("/cats"))&&!d.includes("?")&&(be.push(ee(d+"?limit=1","GET")),be.push(ee(d+"?limit=10","GET")));if(await Promise.allSettled(be),console.log(`Found ${W.length} working endpoints`),W.length===0&&W.push({path:H||"/",method:"GET",apiType:"REST",description:"Detected from URL"}),W.sort((d,k)=>d.path==="/api/cats"||d.path==="/api/tags"?-1:k.path==="/api/cats"||k.path==="/api/tags"?1:d.path==="/cat"?-1:k.path==="/cat"?1:d.path.localeCompare(k.path)),x(W),W.length>0){const d=W.find(E=>E.path.includes("/api/"))||W[0];F(d);const k=d.path;b(E=>({...E,base_url:a,endpoint:k,http_method:d.method,api_type:d.apiType}))}}catch(a){v(a.message||"Error scanning API")}finally{m(!1)}}},[]),Z=i.useCallback(n=>{if(n&&(n.startsWith("http://")||n.startsWith("https://")))try{const a=new URL(n),R=`${a.protocol}//${a.host}`,H=a.pathname||"/";b(W=>({...W,base_url:R,endpoint:H}))}catch{b(R=>({...R,base_url:n}))}else b(a=>({...a,base_url:n}))},[]),xe=i.useCallback(()=>{const n=s.base_url+(s.endpoint==="/"?"":s.endpoint);n&&(n.startsWith("http://")||n.startsWith("https://"))?q(n):s.base_url&&(s.base_url.startsWith("http://")||s.base_url.startsWith("https://"))?q(s.base_url):v("Please enter a valid URL")},[s.base_url,s.endpoint,q]),fe=i.useCallback(()=>{L(!0),setTimeout(()=>{c()},150)},[c]),g=i.useCallback(()=>{if(v(null),!s.api_name.trim()){v("API name is required");return}if(!s.base_url.trim()){v("Base URL is required");return}if(!s.endpoint.trim()){v("Endpoint is required");return}if(!s.target_db_engine){v("Target database engine is required");return}if(!s.target_connection_string.trim()){v("Target connection string is required");return}if(!s.target_schema.trim()){v("Target schema is required");return}if(!s.target_table.trim()){v("Target table is required");return}if(s.target_db_engine==="MongoDB"){if(!s.target_connection_string.startsWith("mongodb://")&&!s.target_connection_string.startsWith("mongodb+srv://")){v("MongoDB connection string must start with mongodb:// or mongodb+srv://");return}}else if(s.target_db_engine==="PostgreSQL"){const H=s.target_connection_string.toLowerCase();if(!H.startsWith("postgresql://")&&!H.startsWith("postgres://")){const ie=["host","user","db"].filter(ee=>!H.includes(`${ee}=`));if(ie.length>0){v(`PostgreSQL connection string must be in URI format (postgresql://...) or include: ${ie.join(", ")}`);return}}}else{const H=["host","user","db"],W=s.target_connection_string.toLowerCase(),ie=H.filter(ee=>!W.includes(`${ee}=`));if(ie.length>0){v(`Connection string must include: ${ie.join(", ")}`);return}}let n,a,R;try{n=JSON.parse(s.auth_config||"{}")}catch{v("Invalid JSON in Auth Config");return}try{a=JSON.parse(s.request_headers||"{}")}catch{v("Invalid JSON in Request Headers");return}try{R=JSON.parse(s.query_params||"{}")}catch{v("Invalid JSON in Query Parameters");return}l({api_name:s.api_name.trim(),api_type:s.api_type,base_url:s.base_url.trim(),endpoint:s.endpoint.trim(),http_method:s.http_method,auth_type:s.auth_type,auth_config:n,target_db_engine:s.target_db_engine,target_connection_string:s.target_connection_string.trim(),target_schema:s.target_schema.trim().toLowerCase(),target_table:s.target_table.trim().toLowerCase(),request_body:null,request_headers:a,query_params:R,sync_interval:s.sync_interval,status:s.status,active:s.active}),fe()},[s,l,fe]),D=i.useCallback(n=>{b(a=>({...a,target_db_engine:n,target_connection_string:n&&Me[n]||""})),y(null)},[]),ye=i.useCallback(async()=>{if(!s.target_db_engine){y({success:!1,message:"Please select a database engine first"});return}if(!s.target_connection_string.trim()){y({success:!1,message:"Please enter a connection string"});return}p(!0),y(null);try{const n=localStorage.getItem("authToken"),a=await fetch("/api/test-connection",{method:"POST",headers:{"Content-Type":"application/json",...n&&{Authorization:`Bearer ${n}`}},body:JSON.stringify({db_engine:s.target_db_engine,connection_string:s.target_connection_string.trim()})});if(!a.ok){if(a.status===401){y({success:!1,message:"Authentication required. Please log in again."});return}if(a.status===0||a.status>=500){y({success:!1,message:"Server error. Please check if the server is running."});return}}let R;try{R=await a.json()}catch{y({success:!1,message:"Invalid response from server"});return}a.ok&&R.success?y({success:!0,message:R.message||"Connection successful!"}):y({success:!1,message:R.error||R.message||"Connection failed"})}catch(n){n.name==="TypeError"&&n.message.includes("fetch")?y({success:!1,message:"Network error. Please check if the server is running and try again."}):y({success:!1,message:n.message||"Error testing connection"})}finally{p(!1)}},[s.target_db_engine,s.target_connection_string]),we=i.useCallback(n=>{F(n),b(a=>({...a,endpoint:n.path,http_method:n.method,api_type:n.apiType}))},[]),pe=i.useCallback(async()=>{if(!s.base_url||!s.endpoint){K("Base URL and endpoint are required");return}M(!0),K(null),V(null),de(!0);try{const n=await Ce.previewAPI({base_url:s.base_url,endpoint:s.endpoint,http_method:s.http_method,auth_type:s.auth_type,auth_config:s.auth_config,request_headers:s.request_headers,query_params:s.query_params});V(n)}catch(n){K(n.message||"Error previewing API")}finally{M(!1)}},[s]);return e.jsxs(e.Fragment,{children:[e.jsx(Xe,{style:{animation:A?"fadeOut 0.15s ease-out":"fadeIn 0.15s ease-in"},onClick:fe}),e.jsx(Ve,{style:{animation:A?"fadeOut 0.15s ease-out":"fadeIn 0.15s ease-in"},children:e.jsxs(Ke,{onClick:n=>n.stopPropagation(),children:[e.jsx(Ze,{children:"Add New API to Catalog"}),e.jsxs(I,{children:[e.jsx(B,{children:"API Name *"}),e.jsx(ge,{type:"text",value:s.api_name,onChange:n=>b(a=>({...a,api_name:n.target.value})),placeholder:"e.g., Cat API, Users API"})]}),e.jsxs(I,{children:[e.jsx(B,{children:"API URL *"}),e.jsxs(st,{children:[e.jsx(ge,{ref:O,type:"text",value:s.base_url+(s.endpoint==="/"?"":s.endpoint),onChange:n=>{n.stopPropagation(),Z(n.target.value)},onFocus:n=>n.stopPropagation(),placeholder:"Enter URL here (e.g., https://cataas.com/cat)",style:{flex:1}}),e.jsx(tt,{type:"button",onClick:xe,disabled:_||!s.base_url||!s.base_url.startsWith("http://")&&!s.base_url.startsWith("https://"),title:"Scan API for endpoints",children:_?e.jsx(Re,{}):e.jsx("svg",{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:e.jsx("path",{d:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.48L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"})})}),e.jsx($e,{type:"button",$variant:"secondary",onClick:pe,disabled:z||!s.base_url||!s.endpoint||!s.base_url.startsWith("http://")&&!s.base_url.startsWith("https://"),style:{padding:"8px 16px",fontSize:"0.9em",minWidth:"auto"},title:"Preview API data",children:z?"Loading...":"Preview"})]}),_&&e.jsxs(Le,{children:[e.jsx(Re,{}),e.jsx("span",{children:"Scanning API for endpoints..."})]}),j.length>0&&!_&&e.jsx(ot,{children:j.map((n,a)=>e.jsxs(nt,{$selected:(w==null?void 0:w.path)===n.path&&(w==null?void 0:w.method)===n.method,onClick:()=>we(n),children:[e.jsx(rt,{$method:n.method,children:n.method}),e.jsx(at,{children:n.path}),n.description&&e.jsxs("span",{style:{marginLeft:"8px",color:o.colors.text.secondary,fontSize:"0.85em"},children:["- ",n.description]})]},a))}),le&&e.jsxs(Fe,{$isOpen:!0,style:{marginTop:o.spacing.md},children:[e.jsxs(Oe,{onClick:()=>de(!le),children:[e.jsxs("span",{children:["API Preview ",T?`(${T.totalItems||((ve=T.sampleData)==null?void 0:ve.length)||0} items)`:""]}),e.jsx("span",{children:le?"▼":"▶"})]}),e.jsxs(ze,{$isOpen:le,children:[z&&e.jsxs(Le,{children:[e.jsx(Re,{}),e.jsx("span",{children:"Fetching API data..."})]}),N&&e.jsx(Be,{children:N}),T&&T.sampleData&&e.jsxs("div",{style:{marginTop:o.spacing.sm},children:[e.jsxs("div",{style:{marginBottom:o.spacing.sm,fontSize:"0.9em",color:o.colors.text.secondary},children:["Showing ",T.sampleData.length," of ",T.totalItems||T.sampleData.length," items"]}),e.jsx("div",{style:{maxHeight:"400px",overflow:"auto",border:`1px solid ${o.colors.border.light}`,borderRadius:o.borderRadius.md,padding:o.spacing.sm,background:o.colors.background.secondary,fontFamily:"Consolas, 'Source Code Pro', monospace",fontSize:"0.85em"},children:e.jsx("pre",{style:{margin:0,whiteSpace:"pre-wrap",wordBreak:"break-word"},children:JSON.stringify(T.sampleData,null,2)})})]})]})]})]}),e.jsxs(I,{children:[e.jsx(B,{children:"Operation Type *"}),e.jsxs(he,{value:s.operation_type,onChange:n=>b(a=>({...a,operation_type:n.target.value})),children:[e.jsx("option",{value:"EXTRACT",children:"Extract (Get data from API)"}),e.jsx("option",{value:"SEND",children:"Send (Send data to API)"})]})]}),e.jsxs(Se,{children:[e.jsxs(I,{children:[e.jsx(B,{children:"Base URL *"}),e.jsx(ge,{type:"text",value:s.base_url,onChange:n=>b(a=>({...a,base_url:n.target.value})),placeholder:"e.g., https://api.example.com"})]}),e.jsxs(I,{children:[e.jsx(B,{children:"Endpoint *"}),e.jsx(ge,{type:"text",value:s.endpoint,onChange:n=>b(a=>({...a,endpoint:n.target.value})),placeholder:"e.g., /api/v1/users"})]})]}),e.jsxs(Se,{children:[e.jsxs(I,{children:[e.jsx(B,{children:"API Type"}),e.jsxs(he,{value:s.api_type,onChange:n=>b(a=>({...a,api_type:n.target.value})),children:[e.jsx("option",{value:"REST",children:"REST"}),e.jsx("option",{value:"GraphQL",children:"GraphQL"}),e.jsx("option",{value:"SOAP",children:"SOAP"})]})]}),e.jsxs(I,{children:[e.jsx(B,{children:"HTTP Method *"}),e.jsxs(he,{value:s.http_method,onChange:n=>b(a=>({...a,http_method:n.target.value})),children:[e.jsx("option",{value:"GET",children:"GET"}),e.jsx("option",{value:"POST",children:"POST"})]})]})]}),e.jsxs(Se,{children:[e.jsxs(I,{children:[e.jsx(B,{children:"Auth Type *"}),e.jsxs(he,{value:s.auth_type,onChange:n=>b(a=>({...a,auth_type:n.target.value})),children:[e.jsx("option",{value:"NONE",children:"NONE"}),e.jsx("option",{value:"BASIC",children:"BASIC"}),e.jsx("option",{value:"BEARER",children:"BEARER"}),e.jsx("option",{value:"API_KEY",children:"API_KEY"}),e.jsx("option",{value:"OAUTH2",children:"OAUTH2"})]})]}),e.jsxs(I,{children:[e.jsx(B,{children:"Sync Interval (seconds) *"}),e.jsx(ge,{type:"number",value:s.sync_interval,onChange:n=>b(a=>({...a,sync_interval:parseInt(n.target.value)||3600})),min:"1"})]})]}),e.jsxs(Fe,{$isOpen:r,children:[e.jsxs(Oe,{onClick:()=>f(!r),children:[e.jsx("span",{children:"Advanced Options"}),e.jsx("span",{children:r?"▼":"▶"})]}),e.jsxs(ze,{$isOpen:r,children:[e.jsxs(I,{children:[e.jsx(B,{children:"Auth Config (JSON)"}),e.jsx(Pe,{value:s.auth_config,onChange:n=>b(a=>({...a,auth_config:n.target.value})),placeholder:'{"username": "user", "password": "pass"} or {"token": "your_token"}'})]}),e.jsxs(I,{children:[e.jsx(B,{children:"Request Headers (JSON)"}),e.jsx(Pe,{value:s.request_headers,onChange:n=>b(a=>({...a,request_headers:n.target.value})),placeholder:'{"Content-Type": "application/json", "Accept": "application/json"}'})]}),e.jsxs(I,{children:[e.jsx(B,{children:"Query Parameters (JSON)"}),e.jsx(Pe,{value:s.query_params,onChange:n=>b(a=>({...a,query_params:n.target.value})),placeholder:'{"page": 1, "limit": 100}'})]})]})]}),e.jsxs(I,{children:[e.jsx(B,{children:"Target Database Engine *"}),e.jsxs(he,{value:s.target_db_engine,onChange:n=>D(n.target.value),children:[e.jsx("option",{value:"",children:"Select Engine"}),e.jsx("option",{value:"MariaDB",children:"MariaDB"}),e.jsx("option",{value:"MSSQL",children:"MSSQL"}),e.jsx("option",{value:"MongoDB",children:"MongoDB"}),e.jsx("option",{value:"Oracle",children:"Oracle"}),e.jsx("option",{value:"PostgreSQL",children:"PostgreSQL"})]})]}),s.target_db_engine&&e.jsxs(I,{children:[e.jsx(B,{children:"Target Connection String Format"}),e.jsx(it,{children:ae})]}),e.jsx(Ue,{value:s.target_connection_string,onChange:n=>{b(a=>({...a,target_connection_string:n})),y(null)},dbEngine:s.target_db_engine,label:"Target Connection String",required:!0,onTestConnection:ye,isTesting:u,testResult:S,placeholder:ce||"Enter connection string..."}),e.jsxs(Se,{children:[e.jsxs(I,{children:[e.jsx(B,{children:"Target Schema *"}),e.jsx(ge,{type:"text",value:s.target_schema,onChange:n=>b(a=>({...a,target_schema:n.target.value})),placeholder:"e.g., public, dbo"})]}),e.jsxs(I,{children:[e.jsx(B,{children:"Target Table *"}),e.jsx(ge,{type:"text",value:s.target_table,onChange:n=>b(a=>({...a,target_table:n.target.value})),placeholder:"e.g., api_data"})]})]}),e.jsxs(Se,{children:[e.jsxs(I,{children:[e.jsx(B,{children:"Status"}),e.jsxs(he,{value:s.status,onChange:n=>b(a=>({...a,status:n.target.value})),children:[e.jsx("option",{value:"PENDING",children:"PENDING"}),e.jsx("option",{value:"IN_PROGRESS",children:"IN_PROGRESS"}),e.jsx("option",{value:"SUCCESS",children:"SUCCESS"}),e.jsx("option",{value:"ERROR",children:"ERROR"})]})]}),e.jsxs(I,{children:[e.jsx(B,{children:"Active"}),e.jsxs(he,{value:s.active.toString(),onChange:n=>b(a=>({...a,active:n.target.value==="true"})),children:[e.jsx("option",{value:"true",children:"Yes"}),e.jsx("option",{value:"false",children:"No"})]})]})]}),$&&e.jsx(Be,{children:$}),e.jsxs(et,{children:[e.jsx($e,{$variant:"secondary",onClick:fe,children:"Cancel"}),e.jsx($e,{$variant:"primary",onClick:g,children:"Add API"})]})]})})]})},ut=({entries:c,onEntryClick:l,onDuplicate:h})=>{const[s,b]=i.useState(new Set),[$,v]=i.useState(new Set),A=i.useMemo(()=>{const r=new Map;return c.forEach(f=>{const u=f.target_schema||"Other",p=f.target_table||"Other";r.has(u)||r.set(u,{name:u,tables:new Map});const S=r.get(u);S.tables.has(p)||S.tables.set(p,{name:p,apis:[]}),S.tables.get(p).apis.push(f)}),Array.from(r.values()).sort((f,u)=>f.name.localeCompare(u.name))},[c]),L=r=>{b(f=>{const u=new Set(f);if(u.has(r)){u.delete(r);const p=A.find(S=>S.name===r);p&&p.tables.forEach(S=>{const y=`${r}.${S.name}`;v(z=>{const M=new Set(z);return M.delete(y),M})})}else u.add(r);return u})},_=(r,f)=>{const u=`${r}.${f}`;v(p=>{const S=new Set(p);return S.has(u)?S.delete(u):S.add(u),S})},m=(r,f)=>{if(r===0)return null;const u=[];for(let p=0;p<r-1;p++)u.push(`${C.v}  `);return f?u.push(`${C.bl}${C.h}${C.h} `):u.push(`${C.tRight}${C.h}${C.h} `),e.jsx("span",{style:{color:t.border,marginRight:6,fontFamily:"Consolas",fontSize:11},children:u.join("")})},j=r=>r==="SUCCESS"?t.success:r==="ERROR"?t.danger:r==="IN_PROGRESS"?t.warning:t.muted,x=(r,f,u)=>e.jsx("div",{style:{padding:"6px 0",paddingLeft:`${f*24+8}px`,cursor:"pointer",borderLeft:`1px solid ${t.border}`,backgroundColor:t.background,margin:"2px 0",transition:"all 0.2s ease",fontFamily:"Consolas",fontSize:12},onClick:()=>l==null?void 0:l(r),onMouseEnter:p=>{p.currentTarget.style.backgroundColor=t.backgroundSoft,p.currentTarget.style.transform="translateX(2px)"},onMouseLeave:p=>{p.currentTarget.style.backgroundColor=t.background,p.currentTarget.style.transform="translateX(0)"},children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[m(f,u),e.jsx("span",{style:{color:t.muted,fontSize:10},children:C.dot}),e.jsx("span",{style:{fontSize:12,fontWeight:500,margin:0,color:t.muted,fontFamily:"Consolas"},children:r.api_name}),e.jsxs("div",{style:{display:"flex",gap:6,alignItems:"center",marginLeft:"auto",flexWrap:"wrap",fontSize:11},children:[e.jsx("span",{style:{padding:"2px 8px",border:`1px solid ${j(r.status)}`,borderRadius:2,color:j(r.status),fontFamily:"Consolas",fontSize:11},children:r.status}),e.jsx("span",{style:{padding:"2px 8px",border:`1px solid ${r.active?t.success:t.danger}`,borderRadius:2,color:r.active?t.success:t.danger,fontFamily:"Consolas",fontSize:11},children:r.active?"Active":"Inactive"}),e.jsx("span",{style:{padding:"2px 8px",border:`1px solid ${t.border}`,borderRadius:2,color:t.muted,fontFamily:"Consolas",fontSize:11},children:r.http_method}),e.jsx("span",{style:{padding:"2px 8px",border:`1px solid ${t.border}`,borderRadius:2,color:t.muted,fontFamily:"Consolas",fontSize:11},children:r.api_type}),h&&e.jsx("div",{onClick:p=>p.stopPropagation(),children:e.jsx(me,{label:"Duplicate",onClick:()=>h(r),variant:"primary"})})]})]})},r.id),w=(r,f,u)=>{const p=`${f}.${r.name}`,S=$.has(p),y=A.find(T=>T.name===f),z=Array.from((y==null?void 0:y.tables.keys())||[]),M=z[z.length-1]===r.name;return e.jsxs("div",{style:{marginBottom:2},children:[e.jsx("div",{style:{padding:"10px 8px",paddingLeft:`${u*24+8}px`,cursor:"pointer",borderLeft:`2px solid ${t.border}`,backgroundColor:t.background,margin:"2px 0",transition:"all 0.2s ease",fontFamily:"Consolas",fontSize:12},onClick:()=>_(f,r.name),onMouseEnter:T=>{T.currentTarget.style.backgroundColor=t.backgroundSoft,T.currentTarget.style.transform="translateX(2px)"},onMouseLeave:T=>{T.currentTarget.style.backgroundColor=t.background,T.currentTarget.style.transform="translateX(0)"},children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[m(u,M),e.jsx("span",{style:{color:t.accent,fontSize:12,fontFamily:"Consolas",display:"inline-block",width:16,textAlign:"center"},children:S?C.arrowDown:C.arrowRight}),e.jsx("span",{style:{color:t.accent},children:C.blockSemi}),e.jsx("h3",{style:{fontSize:13,fontWeight:600,margin:0,color:t.foreground,fontFamily:"Consolas"},children:r.name}),e.jsx("div",{style:{marginLeft:"auto"},children:e.jsxs("span",{style:{padding:"2px 8px",border:`1px solid ${t.border}`,borderRadius:2,color:t.muted,fontFamily:"Consolas",fontSize:11},children:[r.apis.length," ",r.apis.length===1?"API":"APIs"]})})]})}),S&&e.jsx("div",{style:{paddingLeft:`${(u+1)*24+36}px`,animation:"fadeIn 0.3s ease-out"},children:r.apis.map((T,V)=>{const N=V===r.apis.length-1;return x(T,u+1,N)})})]},p)},F=(r,f)=>{const u=s.has(r.name),S=A.findIndex(y=>y.name===r.name)===A.length-1;return e.jsxs("div",{style:{marginBottom:2},children:[e.jsx("div",{style:{padding:"12px 8px",paddingLeft:`${f*24+8}px`,cursor:"pointer",borderLeft:`3px solid ${t.accent}`,backgroundColor:u?t.accentLight:t.background,margin:"2px 0",transition:"all 0.2s ease",fontFamily:"Consolas",fontSize:13,fontWeight:600},onClick:()=>L(r.name),onMouseEnter:y=>{y.currentTarget.style.backgroundColor=t.accentLight,y.currentTarget.style.transform="translateX(2px)"},onMouseLeave:y=>{y.currentTarget.style.backgroundColor=u?t.accentLight:t.background,y.currentTarget.style.transform="translateX(0)"},children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[m(f,S),e.jsx("span",{style:{color:t.accent,fontSize:12,fontFamily:"Consolas",display:"inline-block",width:16,textAlign:"center"},children:u?C.arrowDown:C.arrowRight}),e.jsx("span",{style:{color:t.accent},children:C.blockFull}),e.jsx("h2",{style:{fontSize:14,fontWeight:600,margin:0,color:t.accent,fontFamily:"Consolas"},children:r.name}),e.jsx("div",{style:{marginLeft:"auto"},children:e.jsxs("span",{style:{padding:"2px 8px",border:`1px solid ${t.border}`,borderRadius:2,color:t.muted,fontFamily:"Consolas",fontSize:11},children:[r.tables.size," ",r.tables.size===1?"table":"tables"]})})]})}),u&&e.jsx("div",{style:{paddingLeft:`${(f+1)*24+36}px`,animation:"fadeIn 0.3s ease-out"},children:Array.from(r.tables.values()).map(y=>w(y,r.name,f+1))})]},r.name)};return A.length===0?e.jsx(re,{title:"API CATALOG TREE",children:e.jsxs("div",{style:{padding:"60px 40px",textAlign:"center",color:t.muted,fontFamily:"Consolas",fontSize:12},children:[e.jsx("div",{style:{fontSize:48,marginBottom:16,opacity:.5},children:C.blockFull}),e.jsx("div",{style:{fontSize:13,fontWeight:600,marginBottom:8,color:t.foreground},children:"No API entries available"}),e.jsx("div",{style:{fontSize:12,opacity:.7,color:t.muted},children:"APIs will appear here once configured"})]})}):e.jsxs(re,{title:"API CATALOG TREE",children:[e.jsx("div",{style:{maxHeight:800,overflowY:"auto",overflowX:"hidden",padding:"8px 0"},children:A.map((r,f)=>e.jsx("div",{style:{animationDelay:`${f*.05}s`},children:F(r,0)},r.name))}),e.jsx("style",{children:`
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
      `})]})},Tt=()=>{const{setPage:c}=qe(1,20),{filters:l,setFilter:h}=He({api_type:"",target_db_engine:"",status:"",active:""}),[s,b]=i.useState(""),[$,v]=i.useState(""),[A,L]=i.useState(null),[_,m]=i.useState(!1),[j,x]=i.useState(null),[w,F]=i.useState([]),[r,f]=i.useState(!0),[u,p]=i.useState(null),[S,y]=i.useState([]),[z,M]=i.useState(!1),[T,V]=i.useState(null),[N,K]=i.useState(!1),[le,de]=i.useState(!1),O=i.useRef(!0),Y=i.useCallback(async()=>{var ye;if(!O.current)return;const g=Date.now(),D=300;try{f(!0),L(null);const pe={page:1,limit:1e4,search:Qe($,100)};l.api_type&&(pe.api_type=l.api_type),l.target_db_engine&&(pe.target_db_engine=l.target_db_engine),l.status&&(pe.status=l.status),l.active&&(pe.active=l.active);const ve=await Ce.getAPIs(pe),n=Date.now()-g,a=Math.max(0,D-n);if(await new Promise(R=>setTimeout(R,a)),O.current){const R=((ye=ve.data)==null?void 0:ye.data)||ve.data||[];F(R)}}catch(we){O.current&&L(Ae(we))}finally{O.current&&f(!1)}},[l.api_type,l.target_db_engine,l.status,l.active,$]);i.useEffect(()=>{O.current=!0,Y();const g=setInterval(()=>{O.current&&!_&&Y()},3e4);return()=>{O.current=!1,clearInterval(g)}},[Y,_]);const ce=i.useCallback(()=>{v(s),c(1)},[s,c]),ae=i.useCallback(()=>{b(""),v(""),c(1)},[c]),q=i.useCallback((g,D)=>{h(g,D),c(1)},[h,c]),Z=i.useCallback(async g=>{try{L(null),await Ce.createAPI(g),await Y(),m(!1),alert(`API "${g.api_name}" added successfully.`)}catch(D){O.current&&(D.message&&D.message.includes("Network Error")?L("Network error. Please check if the server is running and try again."):L(Ae(D)))}},[Y]),xe=i.useCallback(g=>{x(g),m(!0)},[]),fe=i.useCallback(async g=>{p(g),M(!0),K(!0),y([]),V(null);try{const[D,ye]=await Promise.all([Ce.getHistory(g.api_name,50),Ce.getTableStructure(g.api_name).catch(()=>null)]);O.current&&(y(D),V(ye))}catch(D){O.current&&L(Ae(D))}finally{O.current&&(M(!1),K(!1))}},[]);return r&&w.length===0?e.jsx(Ye,{variant:"table"}):e.jsxs("div",{style:{padding:"20px",fontFamily:"Consolas",fontSize:12},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"},children:[e.jsxs("h1",{style:{fontSize:14,fontWeight:600,margin:0,color:t.foreground,textTransform:"uppercase",fontFamily:"Consolas"},children:[e.jsx("span",{style:{color:t.accent,marginRight:8},children:C.blockFull}),"API CATALOG"]}),e.jsx(me,{label:"API Catalog Info",onClick:()=>de(!0),variant:"ghost"})]}),A&&e.jsx("div",{style:{marginBottom:20},children:e.jsx(re,{title:"ERROR",children:e.jsx("div",{style:{padding:"12px",color:t.danger,fontSize:12,fontFamily:"Consolas"},children:A})})}),e.jsx(re,{title:"SEARCH",children:e.jsxs("div",{style:{display:"flex",gap:8,alignItems:"center",padding:"8px 0"},children:[e.jsx("input",{type:"text",placeholder:"Search by API name, endpoint, or target...",value:s,onChange:g=>b(g.target.value),onKeyPress:g=>g.key==="Enter"&&ce(),style:{flex:1,padding:"6px 10px",border:`1px solid ${t.border}`,borderRadius:2,fontSize:12,fontFamily:"Consolas",backgroundColor:t.background,color:t.foreground,outline:"none"},onFocus:g=>{g.currentTarget.style.borderColor=t.accent},onBlur:g=>{g.currentTarget.style.borderColor=t.border}}),e.jsx(me,{label:"Search",onClick:ce,variant:"primary"}),$&&e.jsx(me,{label:"Clear",onClick:ae,variant:"ghost"})]})}),e.jsx(re,{title:"FILTERS",children:e.jsxs("div",{style:{display:"flex",flexWrap:"wrap",gap:12,padding:"8px 0"},children:[e.jsx(me,{label:"Add API",onClick:()=>m(!0),variant:"primary"}),e.jsxs("select",{value:l.api_type,onChange:g=>q("api_type",g.target.value),style:{padding:"6px 10px",border:`1px solid ${t.border}`,borderRadius:2,fontSize:12,fontFamily:"Consolas",backgroundColor:t.background,color:t.foreground,cursor:"pointer",outline:"none"},onFocus:g=>{g.currentTarget.style.borderColor=t.accent},onBlur:g=>{g.currentTarget.style.borderColor=t.border},children:[e.jsx("option",{value:"",children:"All API Types"}),e.jsx("option",{value:"REST",children:"REST"}),e.jsx("option",{value:"GraphQL",children:"GraphQL"}),e.jsx("option",{value:"SOAP",children:"SOAP"})]}),e.jsxs("select",{value:l.target_db_engine,onChange:g=>q("target_db_engine",g.target.value),style:{padding:"6px 10px",border:`1px solid ${t.border}`,borderRadius:2,fontSize:12,fontFamily:"Consolas",backgroundColor:t.background,color:t.foreground,cursor:"pointer",outline:"none"},onFocus:g=>{g.currentTarget.style.borderColor=t.accent},onBlur:g=>{g.currentTarget.style.borderColor=t.border},children:[e.jsx("option",{value:"",children:"All Target Engines"}),e.jsx("option",{value:"PostgreSQL",children:"PostgreSQL"}),e.jsx("option",{value:"MariaDB",children:"MariaDB"}),e.jsx("option",{value:"MSSQL",children:"MSSQL"}),e.jsx("option",{value:"MongoDB",children:"MongoDB"}),e.jsx("option",{value:"Oracle",children:"Oracle"})]}),e.jsxs("select",{value:l.status,onChange:g=>q("status",g.target.value),style:{padding:"6px 10px",border:`1px solid ${t.border}`,borderRadius:2,fontSize:12,fontFamily:"Consolas",backgroundColor:t.background,color:t.foreground,cursor:"pointer",outline:"none"},onFocus:g=>{g.currentTarget.style.borderColor=t.accent},onBlur:g=>{g.currentTarget.style.borderColor=t.border},children:[e.jsx("option",{value:"",children:"All Statuses"}),e.jsx("option",{value:"SUCCESS",children:"SUCCESS"}),e.jsx("option",{value:"ERROR",children:"ERROR"}),e.jsx("option",{value:"IN_PROGRESS",children:"IN_PROGRESS"}),e.jsx("option",{value:"PENDING",children:"PENDING"})]}),e.jsxs("select",{value:l.active,onChange:g=>q("active",g.target.value),style:{padding:"6px 10px",border:`1px solid ${t.border}`,borderRadius:2,fontSize:12,fontFamily:"Consolas",backgroundColor:t.background,color:t.foreground,cursor:"pointer",outline:"none"},onFocus:g=>{g.currentTarget.style.borderColor=t.accent},onBlur:g=>{g.currentTarget.style.borderColor=t.border},children:[e.jsx("option",{value:"",children:"All"}),e.jsx("option",{value:"true",children:"Active"}),e.jsx("option",{value:"false",children:"Inactive"})]})]})}),r?e.jsx("div",{style:{marginTop:20},children:e.jsx(re,{title:"LOADING",children:e.jsxs("div",{style:{padding:"40px",textAlign:"center",fontSize:12,fontFamily:"Consolas",color:t.muted},children:[C.blockFull," Loading tree view..."]})})}):e.jsx("div",{style:{marginTop:20},children:e.jsx(ut,{entries:w,onEntryClick:fe,onDuplicate:xe})}),u&&e.jsx(gt,{api:u,history:S,loading:z,tableStructure:T,loadingStructure:N,onClose:()=>p(null)}),_&&e.jsx(pt,{onClose:()=>{m(!1),x(null)},onSave:Z,initialData:j})]})},gt=({api:c,history:l,loading:h,tableStructure:s,loadingStructure:b,onClose:$})=>{const v=i.useMemo(()=>{const x=[],w=new Set,F=24*60*60*1e3;return l.forEach(r=>{if(!w.has(r.id)){if(r.status==="IN_PROGRESS"){const f=new Date(r.start_time).getTime(),u=l.find(p=>!w.has(p.id)&&(p.status==="SUCCESS"||p.status==="ERROR")&&new Date(p.start_time).getTime()>f&&new Date(p.start_time).getTime()-f<=F);if(u){const p=new Date(r.start_time),S=new Date(u.end_time),y=Math.floor((S.getTime()-p.getTime())/1e3);x.push({...u,start_time:p.toISOString(),end_time:S.toISOString(),duration_seconds:y>0?y:u.duration_seconds||0}),w.add(r.id),w.add(u.id)}else x.push(r),w.add(r.id)}else if(r.status==="SUCCESS"||r.status==="ERROR"){const f=new Date(r.start_time).getTime(),u=l.find(p=>!w.has(p.id)&&p.status==="IN_PROGRESS"&&new Date(p.start_time).getTime()<f&&f-new Date(p.start_time).getTime()<=F);if(u){const p=new Date(u.start_time),S=new Date(r.end_time),y=Math.floor((S.getTime()-p.getTime())/1e3);x.push({...r,start_time:p.toISOString(),end_time:S.toISOString(),duration_seconds:y>0?y:r.duration_seconds||0}),w.add(r.id),w.add(u.id)}else x.push(r),w.add(r.id)}}}),x.sort((r,f)=>new Date(f.start_time).getTime()-new Date(r.start_time).getTime())},[l]),A=Math.max(...v.map(x=>x.duration_seconds||0),1),L=x=>{if(x<60)return`${x}s`;const w=Math.floor(x/60),F=x%60;return`${w}m ${F}s`},_=x=>Je(new Date(x),"PPpp"),m=x=>x==="SUCCESS"?t.accent:x==="ERROR"?t.accent:x==="IN_PROGRESS"?t.accentSoft:t.muted,j=({height:x,status:w,tooltipText:F})=>{const[r,f]=i.useState(!1),[u,p]=i.useState({}),[S,y]=i.useState("top"),z=i.useRef(null),M=i.useRef(null),T=m(w),V=()=>{f(!0),setTimeout(()=>{if(z.current&&M.current){const N=z.current.getBoundingClientRect(),K=M.current.getBoundingClientRect(),le=window.innerHeight,de=window.innerWidth,O=N.top,Y=le-N.bottom,ce=K.height||120,ae=K.width||220;let q=N.top-ce-12,Z=N.left+N.width/2,xe="top";O<ce+20&&Y>O&&(q=N.bottom+12,xe="bottom"),Z+ae/2>de-10?Z=de-ae/2-10:Z-ae/2<10&&(Z=ae/2+10),p({position:"fixed",top:`${q}px`,left:`${Z}px`,transform:"translateX(-50%)",zIndex:1e4}),y(xe)}},0)};return e.jsx("div",{ref:z,style:{flex:1,minWidth:20,height:`${x}%`,backgroundColor:T,border:`2px solid ${T}`,borderRadius:"2px 2px 0 0",position:"relative",cursor:"pointer",transition:"all 0.2s ease",fontFamily:"Consolas",fontSize:11},onMouseEnter:V,onMouseLeave:()=>{f(!1),p({}),y("top")},children:r&&e.jsxs("div",{ref:M,style:{...u,backgroundColor:t.foreground,color:t.background,padding:"8px 12px",borderRadius:2,fontSize:11,fontFamily:"Consolas",whiteSpace:"pre-line",pointerEvents:"none",boxShadow:"0 4px 12px rgba(0, 0, 0, 0.3)",minWidth:220,maxWidth:300,textAlign:"left"},children:[F,e.jsx("div",{style:{position:"absolute",[S==="top"?"top":"bottom"]:"100%",left:"50%",transform:"translateX(-50%)",borderTop:S==="top"?`6px solid ${t.foreground}`:"6px solid transparent",borderBottom:S==="bottom"?`6px solid ${t.foreground}`:"6px solid transparent",borderLeft:"6px solid transparent",borderRight:"6px solid transparent"}})]})})};return e.jsxs(e.Fragment,{children:[e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,backdropFilter:"blur(5px)",background:"rgba(0, 0, 0, 0.3)",zIndex:999,animation:"fadeIn 0.2s ease-in"},onClick:$}),e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3,animation:"fadeIn 0.2s ease-in"},onClick:x=>{x.target===x.currentTarget&&$()},children:e.jsxs("div",{style:{background:t.background,borderRadius:2,boxShadow:"0 8px 32px rgba(0, 0, 0, 0.3)",width:"90%",maxWidth:1200,maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column",animation:"slideIn 0.3s ease-out",border:`2px solid ${t.border}`},onClick:x=>x.stopPropagation(),children:[e.jsxs("div",{style:{padding:"16px 20px",borderBottom:`2px solid ${t.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",backgroundColor:t.backgroundSoft},children:[e.jsxs("h2",{style:{margin:0,fontSize:14,fontFamily:"Consolas",fontWeight:600,color:t.foreground,textTransform:"uppercase"},children:[e.jsx("span",{style:{color:t.accent,marginRight:8},children:C.blockFull}),"EXECUTION TIMELINE: ",c.api_name]}),e.jsx(me,{label:"Close",onClick:$,variant:"ghost"})]}),e.jsx("div",{style:{padding:"20px",overflowY:"auto",flex:1,fontFamily:"Consolas",fontSize:12},children:h?e.jsxs("div",{style:{textAlign:"center",padding:"40px",color:t.muted,fontFamily:"Consolas",fontSize:12},children:[C.blockFull," Loading execution history..."]}):v.length===0?e.jsxs("div",{style:{textAlign:"center",padding:"40px",color:t.muted,fontFamily:"Consolas",fontSize:12},children:[e.jsx("div",{style:{fontSize:48,marginBottom:16,opacity:.5},children:C.blockFull}),e.jsx("div",{style:{fontSize:13,fontWeight:600,marginBottom:8,color:t.foreground},children:"No execution history available"}),e.jsx("div",{style:{fontSize:12,opacity:.7},children:"No execution history available for this API."})]}):e.jsxs(e.Fragment,{children:[e.jsx(re,{title:"EXECUTION DURATION TIMELINE",children:e.jsxs("div",{style:{position:"relative",paddingLeft:"40px",padding:"8px 0"},children:[e.jsxs("div",{style:{position:"absolute",left:0,top:0,bottom:0,display:"flex",flexDirection:"column",justifyContent:"space-between",fontSize:11,color:t.muted,fontFamily:"Consolas",padding:"8px 0",paddingBottom:"28px"},children:[e.jsx("span",{children:L(A)}),e.jsx("span",{children:L(Math.floor(A/2))}),e.jsx("span",{style:{paddingBottom:"8px"},children:"0s"})]}),e.jsx("div",{style:{display:"flex",alignItems:"flex-end",gap:8,height:200,padding:"8px 0"},children:v.slice(0,20).reverse().map(x=>{const w=A>0?(x.duration_seconds||0)/A*100:0,F=`${x.status}
Duration: ${L(x.duration_seconds||0)}
Start: ${_(x.start_time)}
End: ${_(x.end_time)}`;return e.jsx(j,{height:w,status:x.status,tooltipText:F},x.id)})})]})}),e.jsx("div",{style:{marginTop:20},children:e.jsx(ht,{api:c,tableStructure:s,loading:b})})]})})]})}),e.jsx("style",{children:`
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
      `})]})},ht=({api:c,tableStructure:l,loading:h})=>e.jsxs("div",{style:{marginTop:20},children:[e.jsx(re,{title:"DATA FLOW: SOURCE → TARGET",children:h?e.jsxs("div",{style:{textAlign:"center",padding:"40px",color:t.muted,fontFamily:"Consolas",fontSize:12},children:[C.blockFull," Loading table structure..."]}):l?e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:24,justifyContent:"center",minHeight:400,padding:"8px 0"},children:[e.jsxs("div",{style:{flex:"0 0 300px",background:t.background,border:`2px solid ${t.accent}`,borderRadius:2,padding:"16px",fontFamily:"Consolas",fontSize:12},children:[e.jsx("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:"8px",borderBottom:`2px solid ${t.border}`,marginBottom:"12px"},children:e.jsxs("div",{children:[e.jsx("h3",{style:{fontSize:13,fontWeight:600,margin:0,color:t.accent,fontFamily:"Consolas"},children:"Source: API"}),e.jsx("div",{style:{fontSize:11,color:t.muted,fontFamily:"Consolas"},children:c.api_type})]})}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8,fontSize:12},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${t.border}`},children:[e.jsx("span",{style:{color:t.muted,fontWeight:500,fontFamily:"Consolas"},children:"API Name:"}),e.jsx("span",{style:{color:t.foreground,wordBreak:"break-all",textAlign:"right",maxWidth:180,fontFamily:"Consolas"},children:c.api_name})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${t.border}`},children:[e.jsx("span",{style:{color:t.muted,fontWeight:500,fontFamily:"Consolas"},children:"Base URL:"}),e.jsx("span",{style:{color:t.foreground,wordBreak:"break-all",textAlign:"right",maxWidth:180,fontFamily:"Consolas"},children:c.base_url})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${t.border}`},children:[e.jsx("span",{style:{color:t.muted,fontWeight:500,fontFamily:"Consolas"},children:"Endpoint:"}),e.jsx("span",{style:{color:t.foreground,wordBreak:"break-all",textAlign:"right",maxWidth:180,fontFamily:"Consolas"},children:c.endpoint})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${t.border}`},children:[e.jsx("span",{style:{color:t.muted,fontWeight:500,fontFamily:"Consolas"},children:"Method:"}),e.jsx("span",{style:{color:t.foreground,wordBreak:"break-all",textAlign:"right",maxWidth:180,fontFamily:"Consolas"},children:c.http_method})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",padding:"6px 0"},children:[e.jsx("span",{style:{color:t.muted,fontWeight:500,fontFamily:"Consolas"},children:"Auth Type:"}),e.jsx("span",{style:{color:t.foreground,wordBreak:"break-all",textAlign:"right",maxWidth:180,fontFamily:"Consolas"},children:c.auth_type})]})]})]}),e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",flex:"0 0 80px",paddingTop:40},children:e.jsx("div",{style:{width:60,height:4,background:t.accent,position:"relative"},children:e.jsx("div",{style:{position:"absolute",right:-8,top:-6,width:0,height:0,borderLeft:`12px solid ${t.accent}`,borderTop:"8px solid transparent",borderBottom:"8px solid transparent"}})})}),e.jsxs("div",{style:{flex:"0 0 350px",background:t.background,border:`2px solid ${t.accent}`,borderRadius:2,padding:"16px",fontFamily:"Consolas",fontSize:12,maxHeight:600,overflowY:"auto"},children:[e.jsx("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:"8px",borderBottom:`2px solid ${t.border}`,marginBottom:"12px"},children:e.jsxs("div",{children:[e.jsxs("h3",{style:{fontSize:13,fontWeight:600,margin:0,color:t.accent,fontFamily:"Consolas"},children:["Target: ",l.table]}),e.jsxs("div",{style:{fontSize:11,color:t.muted,fontFamily:"Consolas",marginBottom:"8px"},children:[l.schema,".",l.table," (",l.db_engine,")"]})]})}),e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"Consolas"},children:[e.jsx("thead",{style:{background:t.backgroundSoft,position:"sticky",top:0,zIndex:10},children:e.jsxs("tr",{style:{borderBottom:`2px solid ${t.border}`},children:[e.jsx("th",{style:{padding:"8px",textAlign:"left",fontWeight:600,color:t.foreground,fontSize:12,fontFamily:"Consolas",width:20}}),e.jsx("th",{style:{padding:"8px",textAlign:"left",fontWeight:600,color:t.foreground,fontSize:12,fontFamily:"Consolas",width:"40%"},children:"Name"}),e.jsx("th",{style:{padding:"8px",textAlign:"left",fontWeight:600,color:t.foreground,fontSize:12,fontFamily:"Consolas"},children:"Data Type"})]})}),e.jsx("tbody",{children:l.columns.map((s,b)=>e.jsxs("tr",{style:{borderBottom:`1px solid ${t.border}`,transition:"background-color 0.2s ease"},onMouseEnter:$=>{$.currentTarget.style.backgroundColor=t.backgroundSoft},onMouseLeave:$=>{$.currentTarget.style.backgroundColor=t.background},children:[e.jsx("td",{style:{padding:"4px 8px",color:t.muted,fontSize:11,fontFamily:"Consolas"},children:b+1}),e.jsx("td",{style:{padding:"4px 8px",fontWeight:500,color:t.accent,fontFamily:"Consolas"},children:s.name}),e.jsx("td",{style:{padding:"4px 8px",color:t.muted,fontFamily:"Consolas",fontSize:11},children:s.type})]},s.name))})]})]})]}):e.jsxs("div",{style:{textAlign:"center",padding:"40px",color:t.muted,fontFamily:"Consolas",fontSize:12},children:[e.jsx("div",{style:{fontSize:48,marginBottom:16,opacity:.5},children:C.blockFull}),e.jsx("div",{style:{fontSize:13,fontWeight:600,marginBottom:8,color:t.foreground},children:"Table structure not available"}),e.jsx("div",{style:{fontSize:12,opacity:.7},children:"The table may not exist yet or there was an error loading it."})]})}),showAPICatalogPlaybook&&e.jsx("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0, 0, 0, 0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:()=>setShowAPICatalogPlaybook(!1),children:e.jsx("div",{style:{width:"90%",maxWidth:1e3,maxHeight:"90vh",overflowY:"auto"},onClick:s=>s.stopPropagation(),children:e.jsx(re,{title:"API CATALOG PLAYBOOK",children:e.jsxs("div",{style:{padding:16,fontFamily:"Consolas",fontSize:12,lineHeight:1.6},children:[e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[C.blockFull," OVERVIEW"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"The API Catalog synchronizes data from REST API endpoints to target databases. APIs are polled at configured intervals and data is loaded using full load strategy (no incremental sync). Each API sync creates a timestamp column (_api_sync_at) to track when data was last synchronized."})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[C.blockFull," SUPPORTED TARGET ENGINES"]}),e.jsxs("div",{style:{color:t.foreground,marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"PostgreSQL:"})," Native PostgreSQL target"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"MariaDB:"})," MySQL-compatible target"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"MSSQL:"})," Microsoft SQL Server target"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"MongoDB:"})," MongoDB document store target"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"└─"})," ",e.jsx("strong",{children:"Oracle:"})," Oracle Database target"]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[C.blockFull," SYNC PROCESS"]}),e.jsxs("div",{style:{color:t.foreground,marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Full Load:"})," Each sync performs complete data replacement (TRUNCATE and INSERT)"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Status Tracking:"})," IN_PROGRESS during sync, SUCCESS/ERROR on completion"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"Timestamp Column:"})," _api_sync_at added to track sync time"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"└─"})," ",e.jsx("strong",{children:"Error Handling:"})," Failed syncs are logged with error messages"]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[C.blockFull," HTTP METHODS"]}),e.jsxs("div",{style:{color:t.foreground,marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"GET:"})," Retrieve data from API endpoint"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"POST:"})," Send data to API endpoint"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"PUT:"})," Update data via API endpoint"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"└─"})," ",e.jsx("strong",{children:"DELETE:"})," Delete data via API endpoint"]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[C.blockFull," AUTHENTICATION TYPES"]}),e.jsxs("div",{style:{color:t.foreground,marginLeft:16},children:[e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"NONE:"})," No authentication required"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"API_KEY:"})," API key authentication via headers or query parameters"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"BASIC:"})," HTTP Basic Authentication"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"├─"})," ",e.jsx("strong",{children:"BEARER:"})," Bearer token authentication"]}),e.jsxs("div",{style:{marginBottom:8},children:[e.jsx("span",{style:{color:t.muted},children:"└─"})," ",e.jsx("strong",{children:"OAUTH2:"})," OAuth 2.0 authentication flow"]})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,color:t.accent,marginBottom:12},children:[C.blockFull," SYNC INTERVALS"]}),e.jsx("div",{style:{color:t.foreground,marginLeft:16},children:"Configure how frequently the API should be polled for new data. Intervals are specified in seconds. Valid range: 5-3600 seconds (5 seconds to 1 hour). Common intervals: 60 (1 minute), 300 (5 minutes), 3600 (1 hour)."})]}),e.jsxs("div",{style:{marginTop:16,padding:12,background:t.backgroundSoft,borderRadius:2,border:`1px solid ${t.border}`},children:[e.jsxs("div",{style:{fontSize:11,fontWeight:600,color:t.muted,marginBottom:4},children:[C.blockSemi," Best Practices"]}),e.jsxs("div",{style:{fontSize:11,color:t.foreground},children:["• Test API endpoints before enabling synchronization",e.jsx("br",{}),"• Use appropriate authentication methods (API_KEY, BEARER, OAUTH2)",e.jsx("br",{}),"• Set reasonable sync intervals to avoid rate limiting (5-3600 seconds)",e.jsx("br",{}),"• Monitor execution history for failed syncs",e.jsx("br",{}),"• Handle API rate limits and errors gracefully",e.jsx("br",{}),"• Review target table structures for data compatibility",e.jsx("br",{}),"• Use filters to organize APIs by type, engine, or status"]})]}),e.jsx("div",{style:{marginTop:16,textAlign:"right"},children:e.jsx(me,{label:"Close",onClick:()=>setShowAPICatalogPlaybook(!1),variant:"ghost"})})]})})})})]});export{Tt as default};
