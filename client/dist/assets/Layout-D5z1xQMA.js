import{c as n,i as l,j as a,N as e}from"./index-DnV5etGe.js";import{P as r}from"./plus-DXJKWCHw.js";/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o=n("ChartColumn",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=n("House",[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=n("Menu",[["line",{x1:"4",x2:"20",y1:"12",y2:"12",key:"1e0a9i"}],["line",{x1:"4",x2:"20",y1:"6",y2:"6",key:"1owob3"}],["line",{x1:"4",x2:"20",y1:"18",y2:"18",key:"yk5zj1"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=n("Target",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"12",r:"6",key:"1vlfrh"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]]);function v({children:i,onOpenAdd:c}){const t=l();return a.jsxs("div",{className:"app",children:[i,a.jsx("nav",{className:"bottom-nav",role:"navigation","aria-label":"Main",children:a.jsxs("div",{className:"nav-inner",children:[a.jsxs(e,{to:"/",className:({isActive:s})=>`nav-item ${s?"active":""}`,end:!0,children:[a.jsx(d,{size:22}),a.jsx("span",{children:"Home"})]}),a.jsxs(e,{to:"/analytics",className:({isActive:s})=>`nav-item ${s?"active":""}`,children:[a.jsx(o,{size:22}),a.jsx("span",{children:"Analytics"})]}),a.jsx("div",{className:"nav-item nav-plus",children:a.jsx("button",{className:"plus-btn",onClick:c,"aria-label":"Add transaction or task",children:a.jsx(r,{size:26,strokeWidth:2.5})})}),a.jsxs(e,{to:"/goals",className:({isActive:s})=>`nav-item ${s?"active":""}`,children:[a.jsx(y,{size:22}),a.jsx("span",{children:"Goals"})]}),a.jsxs(e,{to:"/more",className:({isActive:s})=>`nav-item ${s||!["/","/analytics","/goals"].includes(t.pathname)?"active":""}`,children:[a.jsx(x,{size:22}),a.jsx("span",{children:"More"})]})]})})]})}export{v as L,y as T};
