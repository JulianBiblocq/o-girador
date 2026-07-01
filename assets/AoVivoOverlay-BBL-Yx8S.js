import{Y as N,Z as R,K as j,y as W,B as e,R as C}from"./index-CcsNKZEF.js";import"./firebase-CPPhYbOL.js";import"./tone-DbVIoGca.js";function B(){const[a,n]=j.useState({width:window.innerWidth,height:window.innerHeight});return j.useEffect(()=>{const r=()=>n({width:window.innerWidth,height:window.innerHeight});return window.addEventListener("resize",r),()=>window.removeEventListener("resize",r)},[]),a}const L=`
  @keyframes pov-hit {
    0% { transform: translateY(0px) rotateX(0deg) scale(1); }
    30% { transform: translateY(-180px) rotateX(40deg) scale(0.9); }
    100% { transform: translateY(0px) rotateX(0deg) scale(1); }
  }
  @keyframes pov-hit-strong {
    0% { transform: translateY(0px) rotateX(0deg); }
    30% { transform: translateY(-280px) rotateX(60deg); }
    100% { transform: translateY(0px) rotateX(0deg); }
  }
  @keyframes pov-hit-micro {
    0% { transform: translateY(0px) rotateX(0deg); }
    30% { transform: translateY(-60px) rotateX(15deg); }
    100% { transform: translateY(0px) rotateX(0deg); }
  }
  @keyframes pov-hit-weak {
    0% { transform: translateY(0px) rotateX(0deg) scale(1); }
    30% { transform: translateY(-130px) rotateX(25deg) scale(0.95); }
    100% { transform: translateY(0px) rotateX(0deg) scale(1); }
  }
  @keyframes pov-cross-left {
    0% { transform: translateY(0px) rotateZ(0deg); }
    30% { transform: translateY(-150px) rotateZ(16deg); }
    100% { transform: translateY(0px) rotateZ(0deg); }
  }
  @keyframes pov-cross-right {
    0% { transform: translateY(0px) rotateZ(0deg); }
    30% { transform: translateY(-150px) rotateZ(-16deg); }
    100% { transform: translateY(0px) rotateZ(0deg); }
  }
  @keyframes pov-out-left {
    0% { transform: translateY(0px) rotateZ(0deg); }
    30% { transform: translateY(-100px) rotateZ(-16deg); }
    100% { transform: translateY(0px) rotateZ(0deg); }
  }
  @keyframes pov-out-right {
    0% { transform: translateY(0px) rotateZ(0deg); }
    30% { transform: translateY(-100px) rotateZ(16deg); }
    100% { transform: translateY(0px) rotateZ(0deg); }
  }
  @keyframes pov-shake {
    0%, 100% { transform: translateX(0) translateY(0) rotateZ(0deg); }
    25% { transform: translateX(-8px) translateY(-8px) rotateZ(0deg); }
    50% { transform: translateX(8px) translateY(8px) rotateZ(0deg); }
    75% { transform: translateX(-8px) translateY(8px) rotateZ(0deg); }
  }
  @keyframes halo-flash {
    0% { opacity: 0; transform: scale(0.6); }
    30% { opacity: 1; transform: scale(1.05); box-shadow: 0 0 100px rgba(255,255,255,1); }
    100% { opacity: 0; transform: scale(1.2); }
  }

  /* Easing nerveux avec rebond : cubic-bezier(0.1, 2.0, 0.3, 1) */
  .pov-anim-hit { animation: pov-hit 0.35s cubic-bezier(0.1, 2.0, 0.3, 1); }
  .pov-anim-hit-strong { animation: pov-hit-strong 0.35s cubic-bezier(0.1, 2.0, 0.3, 1); }
  .pov-anim-hit-micro { animation: pov-hit-micro 0.35s cubic-bezier(0.1, 2.0, 0.3, 1); }
  .pov-anim-hit-weak { animation: pov-hit-weak 0.35s cubic-bezier(0.1, 2.0, 0.3, 1); }
  
  /* Easing doux et long pour le Gonguê pour donner l'impression de revenir lentement */
  .pov-anim-gongue-hit-strong { animation: pov-hit-strong 0.5s cubic-bezier(0.1, 0.9, 0.2, 1); }
  .pov-anim-gongue-hit-micro { animation: pov-hit-micro 0.5s cubic-bezier(0.1, 0.9, 0.2, 1); }
  
  .pov-anim-cross-left { animation: pov-cross-left 0.4s cubic-bezier(0.1, 2.0, 0.3, 1); }
  .pov-anim-cross-right { animation: pov-cross-right 0.4s cubic-bezier(0.1, 2.0, 0.3, 1); }
  .pov-anim-out-left { animation: pov-out-left 0.4s cubic-bezier(0.1, 2.0, 0.3, 1); }
  .pov-anim-out-right { animation: pov-out-right 0.4s cubic-bezier(0.1, 2.0, 0.3, 1); }
  .pov-anim-shake { animation: pov-shake 0.1s infinite; }
  .pov-anim-fla-left { animation: pov-hit 0.35s cubic-bezier(0.1, 2.0, 0.3, 1); }
  .pov-anim-fla-right { animation: pov-hit 0.35s cubic-bezier(0.1, 2.0, 0.3, 1) 0.05s backwards; }
  .pov-anim-halo { animation: halo-flash 0.4s ease-out; }

  /* Animations pour le Mineiro */
  @keyframes pov-mineiro-push-strong {
    0% { transform: translate(0, 0) scale(1); }
    30% { transform: translate(0, -50px) scale(0.6); }
    100% { transform: translate(0, 0) scale(1); }
  }
  @keyframes pov-mineiro-push-weak {
    0% { transform: translate(0, 0) scale(1); }
    30% { transform: translate(0, -20px) scale(0.85); }
    100% { transform: translate(0, 0) scale(1); }
  }
  @keyframes pov-mineiro-pull-strong {
    0% { transform: translate(0, 0) scale(1); }
    30% { transform: translate(0, 50px) scale(1.6); }
    100% { transform: translate(0, 0) scale(1); }
  }
  @keyframes pov-mineiro-pull-weak {
    0% { transform: translate(0, 0) scale(1); }
    30% { transform: translate(0, 20px) scale(1.2); }
    100% { transform: translate(0, 0) scale(1); }
  }
  @keyframes pov-mineiro-left {
    0% { transform: translate(0, 0) scale(1); }
    30% { transform: translate(-200px, 0) scale(1); }
    100% { transform: translate(0, 0) scale(1); }
  }
  @keyframes pov-mineiro-shake {
    0%, 100% { transform: translate(0, 0) scale(1); }
    10%, 30%, 50%, 70%, 90% { transform: translate(-15px, 0) scale(1); }
    20%, 40%, 60%, 80% { transform: translate(15px, 0) scale(1); }
  }

  .pov-anim-mineiro-push-strong { animation: pov-mineiro-push-strong 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-mineiro-push-weak { animation: pov-mineiro-push-weak 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-mineiro-pull-strong { animation: pov-mineiro-pull-strong 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-mineiro-pull-weak { animation: pov-mineiro-pull-weak 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-mineiro-left { animation: pov-mineiro-left 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-mineiro-shake { animation: pov-mineiro-shake 0.35s linear; }

  /* Animations pour l'Agbê (filet dynamique) */
  @keyframes pov-agbe-stretch-x-strong {
    0% { transform: scaleX(1); }
    30% { transform: scaleX(1.15); }
    100% { transform: scaleX(1); }
  }
  @keyframes pov-agbe-stretch-x-weak {
    0% { transform: scaleX(1); }
    30% { transform: scaleX(1.08); }
    100% { transform: scaleX(1); }
  }
  @keyframes pov-agbe-stretch-y-strong {
    0% { transform: scaleY(1); }
    30% { transform: scaleY(1.15); }
    100% { transform: scaleY(1); }
  }
  @keyframes pov-agbe-stretch-y-weak {
    0% { transform: scaleY(1); }
    30% { transform: scaleY(1.08); }
    100% { transform: scaleY(1); }
  }
  @keyframes pov-agbe-shake {
    0%, 100% { transform: translate(0, 0) scale(1); }
    10%, 30%, 50%, 70%, 90% { transform: translate(-10px, -5px) scale(0.98); }
    20%, 40%, 60%, 80% { transform: translate(10px, 5px) scale(1.02); }
  }

  .pov-anim-agbe-secoche-strong { animation: pov-agbe-stretch-y-strong 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-agbe-secoche-weak { animation: pov-agbe-stretch-y-weak 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-agbe-ventre-strong { animation: pov-agbe-stretch-y-strong 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-agbe-ventre-weak { animation: pov-agbe-stretch-y-weak 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }

  .pov-anim-agbe-dos-strong { animation: pov-agbe-stretch-x-strong 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-agbe-dos-weak { animation: pov-agbe-stretch-x-weak 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-agbe-haut-strong { animation: pov-agbe-stretch-x-strong 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-agbe-haut-weak { animation: pov-agbe-stretch-x-weak 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }

  .pov-anim-agbe-shake { animation: pov-agbe-shake 0.35s linear; }
`,I=()=>{const[a,n]=j.useState({x:0,y:0});return j.useEffect(()=>{let r,y=-1,u=-1;const k=()=>{const c=document.getElementById("circle-sequencer-panel");if(c){const p=c.getBoundingClientRect(),d=p.left+p.width/2,g=p.top+p.height/2;Math.min(p.width,p.height)/2;const h=d,w=g+20;(Math.abs(h-y)>1||Math.abs(w-u)>1)&&(y=h,u=w,n({x:h,y:w}))}r=requestAnimationFrame(k)};return k(),()=>{cancelAnimationFrame(r)}},[]),a},E=({xOffset:a,target:n,children:r})=>{const{width:y,height:u}=B(),k=y/2+a,c=u+350,p=n.x-k,d=n.y-c,g=Math.atan2(d,p)*(180/Math.PI)+90,h=Math.hypot(p,d);return e.jsx("div",{className:"absolute flex justify-center items-end pointer-events-none",style:{left:k,bottom:"-350px",width:"400px",height:`${h}px`,transform:`translateX(-50%) rotate(${g}deg)`,transformOrigin:"bottom center",zIndex:10},children:C.cloneElement(r,{style:{height:"100%",width:"100%"}})})},D=({target:a,children:n})=>{const{width:r}=B();return e.jsx("div",{className:"absolute flex justify-center items-center pointer-events-none w-[220px] h-[48px] min-[400px]:w-[380px] min-[400px]:h-[80px] sm:w-[550px] sm:h-[120px]",style:{left:a.x,top:a.y-(r<400?50:r<640?80:120),transform:"translate(-50%, -50%)",zIndex:10},children:n})},O=({animClass:a,hitTime:n,style:r})=>e.jsxs("svg",{className:`drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] w-full h-full ${a}`,style:r,viewBox:"0 0 600 120",preserveAspectRatio:"xMidYMid meet",children:[e.jsx("rect",{x:"20",y:"10",width:"560",height:"100",fill:"#B0BEC5",rx:"10"}),e.jsx("rect",{x:"20",y:"30",width:"560",height:"20",fill:"#FFFFFF",opacity:"0.7",rx:"5"}),e.jsx("line",{x1:"20",y1:"20",x2:"580",y2:"20",stroke:"#78909C",strokeWidth:"2",opacity:"0.5"}),e.jsx("line",{x1:"20",y1:"50",x2:"580",y2:"50",stroke:"#78909C",strokeWidth:"2",opacity:"0.5"}),e.jsx("line",{x1:"20",y1:"70",x2:"580",y2:"70",stroke:"#78909C",strokeWidth:"2",opacity:"0.5"}),e.jsx("line",{x1:"20",y1:"90",x2:"580",y2:"90",stroke:"#78909C",strokeWidth:"2",opacity:"0.5"}),e.jsx("rect",{x:"10",y:"5",width:"20",height:"110",fill:"#455A64",rx:"5"}),e.jsx("rect",{x:"570",y:"5",width:"20",height:"110",fill:"#455A64",rx:"5"})]},n),H=({animClass:a,hitTime:n,target:r})=>{const c=[],p=[],d=[];for(let s=0;s<=80;s++){const l=s/80*Math.PI*2,m=(s+.5)/80*Math.PI*2;if(c.push(`${s===0?"M":"L"} ${500+Math.cos(l)*420} ${500+Math.sin(l)*420}`),c.push(`L ${500+Math.cos(m)*480} ${500+Math.sin(m)*480}`),p.push(`${s===0?"M":"L"} ${500+Math.cos(l)*480} ${500+Math.sin(l)*480}`),p.push(`L ${500+Math.cos(m)*420} ${500+Math.sin(m)*420}`),s<80){d.push({cx:500+Math.cos(m)*480,cy:500+Math.sin(m)*480,r:8}),d.push({cx:500+Math.cos(l)*420,cy:500+Math.sin(l)*420,r:8});const v=(s+.25)/80*Math.PI*2;d.push({cx:500+Math.cos(v)*450,cy:500+Math.sin(v)*450,r:10});const b=(s+.75)/80*Math.PI*2;d.push({cx:500+Math.cos(b)*450,cy:500+Math.sin(b)*450,r:10})}}const g=()=>e.jsxs(e.Fragment,{children:[e.jsx("path",{d:c.join(" "),fill:"none",stroke:"#f4ecd8",strokeWidth:"4"}),e.jsx("path",{d:p.join(" "),fill:"none",stroke:"#f4ecd8",strokeWidth:"4"}),d.map((s,l)=>e.jsx("circle",{cx:s.cx,cy:s.cy,r:s.r,fill:"#ea580c"},l))]}),h=a.includes("shake"),w=a.includes("dos")||a.includes("haut"),T=a.includes("secoche")||a.includes("ventre"),t=a.includes("haut")?a:"",x=a.includes("dos")?a:"",X=a.includes("secoche")?a:"",o=a.includes("ventre")?a:"";return e.jsx("div",{className:"absolute w-[240px] h-[240px] min-[400px]:w-[500px] min-[400px]:h-[500px] sm:w-[800px] sm:h-[800px] pointer-events-none z-10",style:{left:r.x,top:r.y,transform:"translate(-50%, -50%)"},children:e.jsxs("svg",{viewBox:"0 0 1000 1000",className:`w-full h-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] opacity-90 ${h?a:""}`,children:[h&&g(),w&&e.jsxs(e.Fragment,{children:[e.jsx("g",{className:`origin-[500px_500px] ${t}`,style:{clipPath:"polygon(0 0, 50% 0, 50% 100%, 0 100%)"},children:g()}),e.jsx("g",{className:`origin-[500px_500px] ${x}`,style:{clipPath:"polygon(50% 0, 100% 0, 100% 100%, 50% 100%)"},children:g()})]}),T&&e.jsxs(e.Fragment,{children:[e.jsx("g",{className:`origin-[500px_500px] ${X}`,style:{clipPath:"polygon(0 0, 100% 0, 100% 50%, 0 50%)"},children:g()}),e.jsx("g",{className:`origin-[500px_500px] ${o}`,style:{clipPath:"polygon(0 50%, 100% 50%, 100% 100%, 0 100%)"},children:g()})]}),!h&&!w&&!T&&g()]})},n)},_=({animClass:a,hitTime:n,style:r})=>e.jsxs("svg",{className:`drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)] origin-bottom ${a}`,style:r,viewBox:"0 0 100 800",preserveAspectRatio:"xMidYMin meet",children:[e.jsx("rect",{x:"25",y:"45",width:"50",height:"755",fill:"#7A3B12",rx:"20"}),e.jsx("circle",{cx:"50",cy:"45",r:"45",fill:"#D2B48C",stroke:"#5C3A21",strokeWidth:"4"}),e.jsx("line",{x1:"40",y1:"90",x2:"40",y2:"800",stroke:"#5C3A21",strokeWidth:"4",strokeDasharray:"30 20",opacity:"0.4"}),e.jsx("line",{x1:"60",y1:"120",x2:"60",y2:"800",stroke:"#5C3A21",strokeWidth:"2",strokeDasharray:"15 25",opacity:"0.3"})]},n),P=({animClass:a,hitTime:n,style:r})=>e.jsxs("svg",{className:`drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)] origin-bottom ${a}`,style:r,viewBox:"0 0 100 800",preserveAspectRatio:"xMidYMin meet",children:[e.jsx("rect",{x:"25",y:"0",width:"50",height:"800",fill:"#DEB887",rx:"10"}),e.jsx("line",{x1:"40",y1:"0",x2:"40",y2:"800",stroke:"#8B4513",strokeWidth:"4",strokeDasharray:"35 15",opacity:"0.3"}),e.jsx("line",{x1:"60",y1:"20",x2:"60",y2:"800",stroke:"#8B4513",strokeWidth:"2",strokeDasharray:"20 20",opacity:"0.2"})]},n),S=({animClass:a,hitTime:n,style:r})=>e.jsxs("svg",{className:`drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] origin-bottom ${a}`,style:r,viewBox:"0 0 100 800",preserveAspectRatio:"xMidYMin meet",children:[e.jsx("rect",{x:"35",y:"20",width:"30",height:"780",fill:"#E6C280",rx:"15"}),e.jsx("rect",{x:"55",y:"20",width:"10",height:"780",fill:"#C49B5A",rx:"5"}),e.jsx("path",{d:"M40 100 Q45 150 40 200 T45 300 T38 400 T42 500 T38 600 T45 700",stroke:"#C49B5A",strokeWidth:"2",fill:"none",opacity:"0.6"}),e.jsx("path",{d:"M50 50 Q55 120 48 180 T52 280 T48 380 T55 480 T49 580 T52 750",stroke:"#D9AE6B",strokeWidth:"2",fill:"none",opacity:"0.5"}),e.jsx("circle",{cx:"50",cy:"20",r:"20",fill:"#E6C280"}),e.jsx("path",{d:"M64 6 A 20 20 0 0 1 50 40 A 20 20 0 0 0 64 6",fill:"#C49B5A"})]},n),q=({animClass:a,hitTime:n,style:r})=>e.jsxs("svg",{className:`drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] origin-bottom ${a}`,style:r,viewBox:"0 0 100 800",preserveAspectRatio:"xMidYMin meet",children:[e.jsx("rect",{x:"30",y:"0",width:"40",height:"800",fill:"#F8F9FA",rx:"4"}),e.jsx("rect",{x:"38",y:"0",width:"10",height:"800",fill:"#FFFFFF",rx:"2"})]},n),$=({show:a,hitTime:n,target:r,yOffset:y=0})=>a?e.jsx("div",{className:"absolute pointer-events-none pov-anim-halo opacity-0",style:{left:r.x,top:r.y+y,transform:"translate(-50%, -50%)",zIndex:5},children:e.jsx("div",{className:"w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full border-[8px] border-[#f4ecd8] shadow-[0_0_80px_rgba(255,255,255,1)]"})},n):null,K=()=>{const{activeAoVivoTrackId:a,isLeftHanded:n,activeVariationsRef:r}=N(),y=R(o=>o.tracks),[u,k]=j.useState(null),c=I(),{width:p}=B(),[d,g]=j.useState(()=>!!window.oGiradorEcoMode);j.useEffect(()=>{const o=()=>g(!!window.oGiradorEcoMode);return window.addEventListener("eco-mode-changed",o),()=>window.removeEventListener("eco-mode-changed",o)},[]);const h=j.useRef(-1);if(j.useEffect(()=>{if(d||a===null)return;const o=y.find(l=>l.id===a);if(!o)return;const s=l=>{const m=l,{step:v,measure:b,maxTicks:A,ratio:M=v/A}=m.detail;if(v<0){h.current=-1,k(null);return}const Y=o.patterns.find(i=>i.measureAssignments[b]);if(!Y){h.current=-1;return}const z=Math.floor(M*Y.steps);if(z!==h.current&&(h.current=z,!o.isMute)){const f=((r==null?void 0:r.current[o.id])||Y.activeSteps)[z];if(f!==void 0&&f!==0&&f!=="0"&&f!==""){if(window.oGiradorEcoMode)return;k({stroke:String(f),time:Date.now()})}}};return window.addEventListener("o-girador-tick",s),()=>window.removeEventListener("o-girador-tick",s)},[a,y]),d||a===null)return null;const w=y.find(o=>o.id===a);if(!w)return null;const T=W[w.instrumentIdx];if(!T)return null;const t=(u==null?void 0:u.stroke)||"",x=(u==null?void 0:u.time)||0,X=()=>{let o="",s="",l="",m="",v=!1,b=0;const A=t==="b"||t==="B";A&&(o="pov-anim-shake",s="pov-anim-shake");const M=Math.min(p*.45,550),Y={x:c.x-160,y:c.y},z={x:c.x+160,y:c.y};switch(T.id){case"marcante":case"meiao":case"repique":return A||(t==="D"?o="pov-anim-hit-strong":t==="d"?o="pov-anim-hit":t==="E"?s="pov-anim-hit-strong":t==="e"?s="pov-anim-hit":t==="i"||t==="I"?s="pov-anim-hit-weak":t==="x"||t==="X"?(l="pov-anim-out-left",m="pov-anim-out-right",v=!0,b=-100):t==="c"||t==="C"?(l="pov-anim-cross-left",m="pov-anim-cross-right",v=!0,b=-150):t&&(o="pov-anim-hit",s="pov-anim-hit")),l||(l=n?o:s),m||(m=n?s:o),e.jsxs(e.Fragment,{children:[e.jsx($,{show:v,hitTime:x,target:c,yOffset:b}),e.jsx(E,{xOffset:-M,target:Y,children:n?e.jsx(_,{animClass:l,hitTime:x}):e.jsx(P,{animClass:l,hitTime:x})}),e.jsx(E,{xOffset:M,target:z,children:n?e.jsx(P,{animClass:m,hitTime:x}):e.jsx(_,{animClass:m,hitTime:x})})]});case"caixa":case"tarol":return A||(t==="D"?o="pov-anim-hit":t==="d"?o="pov-anim-hit-micro":t==="E"?s="pov-anim-hit":t==="e"?s="pov-anim-hit-micro":t==="R"?o="pov-anim-shake":t==="r"?s="pov-anim-shake":t==="f"||t==="F"?(s="pov-anim-fla-left",o="pov-anim-fla-right"):t==="x"||t==="X"?(l="pov-anim-out-left",m="pov-anim-out-right",v=!0,b=-100):t==="c"||t==="C"?(l="pov-anim-cross-left",m="pov-anim-cross-right",v=!0,b=-150):t&&(o="pov-anim-hit-micro",s="pov-anim-hit-micro")),l||(l=n?o:s),m||(m=n?s:o),e.jsxs(e.Fragment,{children:[e.jsx($,{show:v,hitTime:x,target:c,yOffset:b}),e.jsx(E,{xOffset:-M,target:Y,children:e.jsx(S,{animClass:l,hitTime:x})}),e.jsx(E,{xOffset:M,target:z,children:e.jsx(S,{animClass:m,hitTime:x})})]});case"mineiro":{let i="";return t==="P"?i="pov-anim-mineiro-push-strong":t==="p"?i="pov-anim-mineiro-push-weak":t==="T"?i="pov-anim-mineiro-pull-strong":t==="t"?i="pov-anim-mineiro-pull-weak":t==="L"||t==="l"?i="pov-anim-mineiro-left":t==="B"||t==="b"?i="pov-anim-mineiro-shake":t&&(i="pov-anim-mineiro-push-weak"),e.jsx(D,{target:c,children:e.jsx(O,{animClass:i,hitTime:x})})}case"agbe":{let i="";return t==="S"?i="pov-anim-agbe-secoche-strong":t==="s"?i="pov-anim-agbe-secoche-weak":t==="D"?i="pov-anim-agbe-dos-strong":t==="d"?i="pov-anim-agbe-dos-weak":t==="E"?i="pov-anim-agbe-haut-strong":t==="e"?i="pov-anim-agbe-haut-weak":t==="V"?i="pov-anim-agbe-ventre-strong":t==="v"?i="pov-anim-agbe-ventre-weak":t==="B"||t==="b"?i="pov-anim-agbe-shake":t&&(i="pov-anim-agbe-secoche-weak"),e.jsx(H,{animClass:i,hitTime:x,target:c})}case"gongue":{let i="",f={x:c.x,y:c.y};t==="b"||t==="B"?(i="pov-anim-shake",f.y=c.y-30):t==="G"?(i="pov-anim-gongue-hit-strong",f.y=c.y-200):t==="g"?(i="pov-anim-gongue-hit-micro",f.y=c.y-200):t==="A"?(i="pov-anim-gongue-hit-strong",f.y=c.y+120):t==="a"?(i="pov-anim-gongue-hit-micro",f.y=c.y+120):t&&(i="pov-anim-gongue-hit-micro",f.y=c.y-30);const F=n?-M:M;return f.x=c.x+F*.4,e.jsx(E,{xOffset:F,target:f,children:e.jsx(q,{animClass:i,hitTime:x})})}default:return null}};return e.jsxs(e.Fragment,{children:[e.jsx("style",{children:L}),e.jsx("div",{className:"absolute inset-0 z-[10] overflow-hidden pointer-events-none perspective-[1000px]",children:X()})]})};export{K as AoVivoOverlay};
