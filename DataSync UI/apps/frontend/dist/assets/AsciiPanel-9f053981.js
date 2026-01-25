import{j as e,b as s,e as n}from"./index-75d7470b.js";const l=({title:t,children:a,animated:o=!0})=>e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100%",animation:o?"fadeInUp 0.4s ease-out":"none",transition:"transform 0.2s ease, box-shadow 0.2s ease"},onMouseEnter:r=>{o&&(r.currentTarget.style.transform="translateY(-2px)",r.currentTarget.style.boxShadow="0 4px 12px rgba(0, 0, 0, 0.1)")},onMouseLeave:r=>{o&&(r.currentTarget.style.transform="translateY(0)",r.currentTarget.style.boxShadow="none")},children:[t?e.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",color:s.foreground,paddingLeft:2,margin:0,marginBottom:2,fontWeight:600,textTransform:"uppercase",letterSpacing:.5,animation:o?"slideInLeft 0.3s ease-out":"none"},children:[e.jsx("span",{style:{display:"inline-block",animation:o?"pulse 2s ease-in-out infinite":"none"},children:n.tl}),n.h.repeat(2),t]}):null,e.jsx("div",{style:{border:`1px solid ${s.border}`,padding:4,overflow:"visible",overflowY:"auto",fontSize:12,fontFamily:"Consolas",backgroundColor:s.background,borderRadius:2,transition:"border-color 0.3s ease, background-color 0.3s ease",minHeight:0},children:a})]}),e.jsx("style",{children:`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `})]});export{l as A};
