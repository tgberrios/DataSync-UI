import{j as o,b as r,e as n}from"./index-b1fa964d.js";const l=({title:e,children:t,animated:s=!0})=>o.jsxs(o.Fragment,{children:[o.jsxs("div",{style:{display:"flex",flexDirection:"column",flexShrink:0,animation:s?"fadeInUp 0.4s ease-out":"none",transition:"transform 0.2s ease, box-shadow 0.2s ease"},onMouseEnter:a=>{s&&(a.currentTarget.style.transform="translateY(-2px)",a.currentTarget.style.boxShadow="0 4px 12px rgba(0, 0, 0, 0.1)")},onMouseLeave:a=>{s&&(a.currentTarget.style.transform="translateY(0)",a.currentTarget.style.boxShadow="none")},children:[e?o.jsxs("h2",{style:{fontSize:14,fontFamily:"Consolas",color:r.foreground,padding:"8px 12px",margin:0,marginBottom:0,fontWeight:600,textTransform:"uppercase",letterSpacing:.5,animation:s?"slideInLeft 0.3s ease-out":"none",backgroundColor:r.backgroundSoft,border:`1px solid ${r.border}`,borderRadius:2,borderBottomLeftRadius:0,borderBottomRightRadius:0},children:[o.jsx("span",{style:{display:"inline-block",animation:s?"pulse 2s ease-in-out infinite":"none"},children:n.tl}),n.h.repeat(2),e]}):null,o.jsx("div",{style:{border:`1px solid ${r.border}`,borderTop:e?"none":`1px solid ${r.border}`,padding:4,overflow:"visible",overflowY:"auto",fontSize:12,fontFamily:"Consolas",backgroundColor:r.background,borderRadius:2,borderTopLeftRadius:e?0:2,borderTopRightRadius:e?0:2,transition:"border-color 0.3s ease, background-color 0.3s ease",minHeight:0},children:t})]}),o.jsx("style",{children:`
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
