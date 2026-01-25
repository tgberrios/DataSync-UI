import{f as m,t as o,r as d,j as n,F as z,L as T,B}from"./index-75d7470b.js";const L=m.select`
  width: 100%;
  padding: 8px 12px;
  margin-bottom: 8px;
  border: 1px solid ${o.colors.border.medium};
  border-radius: ${o.borderRadius.md};
  font-size: 12px;
  font-family: 'Consolas', monospace;
  background-color: ${o.colors.background.main};
  color: ${o.colors.text.primary};
  cursor: pointer;
  transition: all ${o.transitions.normal};
  
  &:focus {
    outline: none;
    border-color: ${o.colors.primary.main};
    box-shadow: 0 0 0 2px ${o.colors.primary.light}33;
  }
  
  &:hover {
    border-color: ${o.colors.primary.main};
  }
  
  option {
    font-family: 'Consolas', monospace;
    font-size: 12px;
    padding: 4px;
  }
`,A=m.textarea`
  padding: 8px 12px;
  border: 1px solid ${o.colors.border.medium};
  border-radius: ${o.borderRadius.md};
  font-family: 'Consolas', monospace;
  background: ${o.colors.background.main};
  color: ${o.colors.text.primary};
  font-size: 12px;
  width: 100%;
  min-height: 80px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${o.colors.primary.main};
    box-shadow: 0 0 0 2px ${o.colors.primary.light}33;
  }
`,I=m.div`
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: ${o.borderRadius.sm};
  font-size: 0.9em;
  background-color: ${t=>t.$success?o.colors.status.success.bg:o.colors.status.error.bg};
  color: ${t=>t.$success?o.colors.status.success.text:o.colors.status.error.text};
`,R=m.div`
  font-size: 0.85em;
  color: ${o.colors.text.secondary};
  font-style: italic;
  margin-bottom: 8px;
`,U=({value:t,onChange:p,dbEngine:r,label:y,required:$=!1,onTestConnection:g,isTesting:f=!1,testResult:i,placeholder:C="Enter connection string..."})=>{const[a,h]=d.useState([]),[x,b]=d.useState(!1),[s,c]=d.useState(!1);d.useEffect(()=>{r&&!s?j():h([])},[r,s]);const j=async()=>{if(r){b(!0);try{const e=localStorage.getItem("authToken"),l=await fetch(`/api/connections?db_engine=${encodeURIComponent(r)}`,{headers:{...e&&{Authorization:`Bearer ${e}`}}});if(l.ok){const u=await l.json();h(u.connections||[]),t&&u.connections&&u.connections.some(w=>w.connection_string===t)?c(!1):t&&c(!0)}}catch(e){console.error("Error fetching connections:",e)}finally{b(!1)}}},v=e=>{e.target.value==="__custom__"?(c(!0),p("")):(c(!1),p(e.target.value))},_=e=>{p(e.target.value),e.target.value&&!s&&c(!0)},S=!s&&a.length>0&&!x,k=s||a.length===0||x;return n.jsxs(z,{children:[n.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"},children:[n.jsxs(T,{style:{marginBottom:0},children:[y," ",$&&"*"]}),g&&n.jsx(B,{type:"button",$variant:"secondary",onClick:g,disabled:f||!r||!t.trim(),style:{padding:"6px 12px",fontSize:"0.85em",minWidth:"auto"},children:f?"Testing...":"Test Connection"})]}),x&&n.jsx(R,{children:"Loading available connections..."}),S&&n.jsxs(L,{value:t,onChange:v,children:[n.jsx("option",{value:"",children:"-- Select existing connection --"}),a.map((e,l)=>n.jsx("option",{value:e.connection_string,children:e.connection_string_masked},l)),n.jsx("option",{value:"__custom__",children:"+ Add new connection..."})]}),k&&n.jsx(A,{value:t,onChange:_,placeholder:C}),!s&&a.length>0&&n.jsx("div",{style:{marginTop:"4px",fontSize:"0.85em",color:o.colors.text.secondary},children:"Or select an existing connection above"}),i&&n.jsxs(I,{$success:i.success,children:[i.success?"✓ ":"✗ ",i.message]})]})};export{U as C};
