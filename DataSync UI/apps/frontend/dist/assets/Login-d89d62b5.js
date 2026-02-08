import{m as v,f as r,t as e,r as s,am as $,an as u,j as t,I as g,E as j,a9 as w,B as L}from"./index-b1fa964d.js";import{e as S}from"./errorHandler-5ea9ae85.js";const k=v`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,E=r.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: ${e.colors.background.main};
  position: relative;
  overflow: hidden;
  cursor: default;
`,C=r.div`
  background: ${e.colors.background.secondary};
  padding: ${e.spacing.xxl};
  border-radius: ${e.borderRadius.lg};
  box-shadow: ${e.shadows.xl};
  width: 100%;
  max-width: 400px;
  animation: ${k} 0.5s ease-out;
  position: relative;
  z-index: 10;
  backdrop-filter: blur(10px);
  border: 1px solid ${e.colors.border.light};
`,F=r.h1`
  text-align: center;
  margin-bottom: ${e.spacing.xl};
  color: ${e.colors.text.primary};
  font-size: 2em;
  font-family: "Consolas, 'Source Code Pro', monospace";
  letter-spacing: 2px;
  position: relative;
  
  &::before {
    content: '■';
    color: ${e.colors.primary.main};
    margin-right: 10px;
  }
`,x=r.div`
  margin-bottom: ${e.spacing.md};
`,h=r.label`
  display: block;
  margin-bottom: ${e.spacing.sm};
  color: ${e.colors.text.primary};
  font-weight: 500;
`,P=r(L)`
  width: 100%;
  padding: ${e.spacing.md};
  font-size: 1.1em;
  margin-top: ${e.spacing.md};
`,A=()=>{const[c,f]=s.useState(""),[d,b]=s.useState(""),[m,o]=s.useState(null),[n,p]=s.useState(!1),l=$();s.useEffect(()=>{u()&&l("/",{replace:!0})},[l]);const y=async a=>{a.preventDefault(),o(null),p(!0);try{const i=await w.login(c,d);i&&i.token?u()?l("/",{replace:!0}):o("Failed to authenticate. Please try again."):o("Invalid response from server. Please try again.")}catch(i){o(S(i))}finally{p(!1)}};return t.jsx(E,{children:t.jsxs(C,{children:[t.jsx(F,{children:"DataSync"}),t.jsxs("form",{onSubmit:y,children:[t.jsxs(x,{children:[t.jsx(h,{htmlFor:"username",children:"Username"}),t.jsx(g,{id:"username",type:"text",value:c,onChange:a=>f(a.target.value),required:!0,autoFocus:!0,disabled:n})]}),t.jsxs(x,{children:[t.jsx(h,{htmlFor:"password",children:"Password"}),t.jsx(g,{id:"password",type:"password",value:d,onChange:a=>b(a.target.value),required:!0,disabled:n})]}),m&&t.jsx(j,{children:m}),t.jsx(P,{type:"submit",$variant:"primary",disabled:n,children:n?"Logging in...":"Login"})]})]})})};export{A as default};
