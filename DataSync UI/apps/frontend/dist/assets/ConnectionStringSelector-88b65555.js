import{f as y,t,r as l,j as a,F as G,L as U,B as N}from"./index-f6ac47b8.js";import{S as M,F as b,E as v,A as J,G as X}from"./GCSConnectionConfig-f004c48c.js";const q=y.select`
  width: 100%;
  padding: 8px 12px;
  margin-bottom: 8px;
  border: 1px solid ${t.colors.border.medium};
  border-radius: ${t.borderRadius.md};
  font-size: 12px;
  font-family: 'Consolas', monospace;
  background-color: ${t.colors.background.main};
  color: ${t.colors.text.primary};
  cursor: pointer;
  transition: all ${t.transitions.normal};
  
  &:focus {
    outline: none;
    border-color: ${t.colors.primary.main};
    box-shadow: 0 0 0 2px ${t.colors.primary.light}33;
  }
  
  &:hover {
    border-color: ${t.colors.primary.main};
  }
  
  option {
    font-family: 'Consolas', monospace;
    font-size: 12px;
    padding: 4px;
  }
`,D=y.textarea`
  padding: 8px 12px;
  border: 1px solid ${t.colors.border.medium};
  border-radius: ${t.borderRadius.md};
  font-family: 'Consolas', monospace;
  background: ${t.colors.background.main};
  color: ${t.colors.text.primary};
  font-size: 12px;
  width: 100%;
  min-height: 80px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${t.colors.primary.main};
    box-shadow: 0 0 0 2px ${t.colors.primary.light}33;
  }
`,W=y.div`
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: ${t.borderRadius.sm};
  font-size: 0.9em;
  background-color: ${s=>s.$success?t.colors.status.success.bg:t.colors.status.error.bg};
  color: ${s=>s.$success?t.colors.status.success.text:t.colors.status.error.text};
`,Z=y.div`
  font-size: 0.85em;
  color: ${t.colors.text.secondary};
  font-style: italic;
  margin-bottom: 8px;
`,H=["S3","FTP","SFTP","Email","AzureBlob","GCS"],K=(s,r)=>{if(!s)return null;try{if(r==="S3"){const e=new URLSearchParams(s);return{access_key_id:e.get("access_key_id")||"",secret_access_key:e.get("secret_access_key")||"",region:e.get("region")||"us-east-1",bucket_name:e.get("bucket_name")||"",endpoint:e.get("endpoint")||"",use_ssl:e.get("use_ssl")!=="false"}}else if(r==="FTP"||r==="SFTP"){const e=new URLSearchParams(s);return{protocol:r==="SFTP"?"SFTP":"FTP",host:e.get("host")||"",port:parseInt(e.get("port")||(r==="SFTP"?"22":"21")),username:e.get("username")||"",password:e.get("password")||"",remote_path:e.get("remote_path")||"/",use_passive:e.get("use_passive")!=="false",use_ssl:e.get("use_ssl")==="true"}}else if(r==="Email"){const e=new URLSearchParams(s);return{protocol:e.get("protocol")==="POP3"?"POP3":"IMAP",server:e.get("server")||"",port:parseInt(e.get("port")||"993"),username:e.get("username")||"",password:e.get("password")||"",folder:e.get("folder")||"INBOX",use_ssl:e.get("use_ssl")!=="false",max_emails:parseInt(e.get("max_emails")||"100"),download_attachments:e.get("download_attachments")==="true"}}else if(r==="AzureBlob"){const e=new URLSearchParams(s);return{account_name:e.get("account_name")||"",account_key:e.get("account_key")||"",container_name:e.get("container_name")||"",endpoint_suffix:e.get("endpoint_suffix")||"core.windows.net",use_https:e.get("use_https")!=="false"}}else if(r==="GCS"){const e=new URLSearchParams(s);return{project_id:e.get("project_id")||"",credentials_json:e.get("credentials_json")||"",bucket_name:e.get("bucket_name")||"",use_https:e.get("use_https")!=="false"}}}catch(e){console.error("Error parsing connection string:",e)}return null},T=(s,r)=>{if(!s)return"";const e=new URLSearchParams;return r==="S3"?Object.entries(s).forEach(([i,o])=>{o!=null&&o!==""&&e.set(i,String(o))}):r==="FTP"||r==="SFTP"?Object.entries(s).forEach(([i,o])=>{o!=null&&o!==""&&e.set(i,String(o))}):r==="Email"?Object.entries(s).forEach(([i,o])=>{o!=null&&o!==""&&e.set(i,String(o))}):r==="AzureBlob"?Object.entries(s).forEach(([i,o])=>{o!=null&&o!==""&&e.set(i,String(o))}):r==="GCS"&&Object.entries(s).forEach(([i,o])=>{o!=null&&o!==""&&e.set(i,String(o))}),e.toString()},Y=({value:s,onChange:r,dbEngine:e,label:i,required:o=!1,onTestConnection:m,isTesting:p=!1,testResult:S,placeholder:z="Enter connection string..."})=>{const[C,j]=l.useState([]),[P,F]=l.useState(!1),[d,_]=l.useState(!1),c=l.useMemo(()=>H.includes(e),[e]),w=l.useMemo(()=>!c||!s?null:K(s,e),[s,e,c]),x=l.useMemo(()=>c?e==="S3"?{access_key_id:"",secret_access_key:"",region:"us-east-1",bucket_name:"",endpoint:"",use_ssl:!0}:e==="FTP"||e==="SFTP"?{protocol:e==="SFTP"?"SFTP":"FTP",host:"",port:e==="SFTP"?22:21,username:"",password:"",remote_path:"/",use_passive:!0,use_ssl:e==="SFTP"}:e==="Email"?{protocol:"IMAP",server:"",port:993,username:"",password:"",folder:"INBOX",use_ssl:!0,max_emails:100,download_attachments:!1}:e==="AzureBlob"?{account_name:"",account_key:"",container_name:"",endpoint_suffix:"core.windows.net",use_https:!0}:e==="GCS"?{project_id:"",credentials_json:"",bucket_name:"",use_https:!0}:null:null,[e,c]),[f,k]=l.useState(x),g=l.useRef({});l.useEffect(()=>{if(c){const n=w||x;if(JSON.stringify(n)!==JSON.stringify(f)&&k(n),!w&&x&&!s&&!g.current[e]){const u=T(x,e);u&&(g.current[e]=!0,r(u))}e&&!g.current[e]&&s&&(g.current[e]=!0)}else k(null),e&&delete g.current[e]},[c,w,x,e,s]);const h=n=>{k(n);const u=T(n,e);r(u)};l.useEffect(()=>{c?(j([]),_(!0)):e&&!d?A():j([])},[e,d,c]);const A=async()=>{if(e){F(!0);try{const n=localStorage.getItem("authToken"),u=await fetch(`/api/connections?db_engine=${encodeURIComponent(e)}`,{headers:{...n&&{Authorization:`Bearer ${n}`}}});if(u.ok){const $=await u.json();j($.connections||[]),s&&$.connections&&$.connections.some(O=>O.connection_string===s)?_(!1):s&&_(!0)}}catch(n){console.error("Error fetching connections:",n)}finally{F(!1)}}},B=n=>{n.target.value==="__custom__"?(_(!0),r("")):(_(!1),r(n.target.value))},I=n=>{r(n.target.value),n.target.value&&!d&&_(!0)},R=!c&&!d&&C.length>0&&!P,L=!c&&(d||C.length===0||P);return a.jsxs(G,{children:[a.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"},children:[a.jsxs(U,{style:{marginBottom:0},children:[i," ",o&&"*"]}),m&&a.jsx(N,{type:"button",$variant:"secondary",onClick:m,disabled:p||!e||!s.trim(),style:{padding:"6px 12px",fontSize:"0.85em",minWidth:"auto"},children:p?"Testing...":"Test Connection"})]}),P&&a.jsx(Z,{children:"Loading available connections..."}),R&&a.jsxs(q,{value:s,onChange:B,children:[a.jsx("option",{value:"",children:"-- Select existing connection --"}),C.map((n,u)=>a.jsx("option",{value:n.connection_string,children:n.connection_string_masked},u)),a.jsx("option",{value:"__custom__",children:"+ Add new connection..."})]}),L&&!c&&a.jsx(D,{value:s,onChange:I,placeholder:z}),c&&f&&a.jsxs("div",{style:{border:`1px solid ${t.colors.border.medium}`,borderRadius:t.borderRadius.md,padding:t.spacing.sm,backgroundColor:t.colors.background.secondary},children:[e==="S3"&&a.jsx(M,{config:f,onChange:h,onTest:m,isTesting:p}),e==="FTP"&&a.jsx(b,{config:f,onChange:h,onTest:m,isTesting:p}),e==="SFTP"&&a.jsx(b,{config:{...f,protocol:"SFTP"},onChange:h,onTest:m,isTesting:p}),e==="Email"&&a.jsx(v,{config:f,onChange:h,onTest:m,isTesting:p}),e==="AzureBlob"&&a.jsx(J,{config:f,onChange:h,onTest:m,isTesting:p}),e==="GCS"&&a.jsx(X,{config:f,onChange:h,onTest:m,isTesting:p})]}),!d&&C.length>0&&a.jsx("div",{style:{marginTop:"4px",fontSize:"0.85em",color:t.colors.text.secondary},children:"Or select an existing connection above"}),S&&a.jsxs(W,{$success:S.success,children:[S.success?"✓ ":"✗ ",S.message]})]})};export{Y as C};
