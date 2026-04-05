import React, { useState, useEffect } from "react";

const A = "#F15A2B"; // accent
const AL = "#FEF1EC"; // accent light
const AD = "#C94E22"; // accent dark
const G = { 50:"#FAFAF8",100:"#F5F3F0",200:"#EAE7E3",300:"#D5D1CC",400:"#A8A29E",500:"#78716C",600:"#57534E",700:"#44403C",800:"#292524",900:"#1C1917" };

/* ═══════════════════════════ PROVIDER ICONS ═══════════════════════════ */
const pIcons = {
  ses: s=><svg width={s} height={s} viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#232F3E"/><path d="M10 16l10 6.5L30 16" stroke="#FF9900" strokeWidth="2" fill="none" strokeLinecap="round"/><rect x="10" y="13" width="20" height="14" rx="2" stroke="#FF9900" strokeWidth="1.5" fill="none"/><path d="M10 30c5 2.5 11 3.5 17 2s9-5 11-8" stroke="#FF9900" strokeWidth="1.3" strokeLinecap="round" fill="none"/></svg>,
  sendgrid: s=><svg width={s} height={s} viewBox="0 0 40 40"><path fill="#9DD6E3" d="M40 0v26.67h-13.33v13.33H0V26.67h13.33V0z"/><path fill="#3F72AB" d="M0 40h13.33V26.67H0z"/><path fill="#00A9D1" d="M26.67 26.67H40V13.33H26.67zM13.33 13.33h13.34V0H13.33z"/><path fill="#2191C4" d="M13.33 26.67h13.34V13.33H13.33z"/><path fill="#3F72AB" d="M26.67 13.33H40V0H26.67z"/></svg>,
  mailgun: s=><svg width={s} height={s} viewBox="0 0 24 24"><path fill="#F06B66" d="M11.837 0c6.602 0 11.984 5.381 11.984 11.994-.017 2.99-3.264 4.84-5.844 3.331a3.805 3.805 0 0 1-.06-.035l-.055-.033-.022.055c-2.554 4.63-9.162 4.758-11.894.232-2.732-4.527.46-10.313 5.746-10.416a6.868 6.868 0 0 1 7.002 6.866 1.265 1.265 0 0 0 2.52 0c0-5.18-4.197-9.38-9.377-9.387C4.611 2.594.081 10.41 3.683 16.673c3.238 5.632 11.08 6.351 15.289 1.402l1.997 1.686A11.95 11.95 0 0 1 11.837 24C2.6 23.72-2.87 13.543 1.992 5.684A12.006 12.006 0 0 1 11.837 0Zm0 7.745c-3.276-.163-5.5 3.281-4.003 6.2a4.26 4.26 0 0 0 4.014 2.31c3.276-.171 5.137-3.824 3.35-6.575a4.26 4.26 0 0 0-3.36-1.935Zm0 2.53c1.324 0 2.152 1.433 1.49 2.58a1.72 1.72 0 0 1-1.49.86 1.72 1.72 0 1 1 0-3.44Z"/></svg>,
  postmark: s=><svg width={s} height={s} viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#FFDE00"/><path d="M14 10h8c4.4 0 8 3.6 8 8s-3.6 8-8 8h-4v4c0 .7-.6 1.3-1.3 1.3s-1.4-.6-1.4-1.3V11.3c0-.7.6-1.3 1.4-1.3zm4 13.3h4c3 0 5.3-2.4 5.3-5.3s-2.4-5.3-5.3-5.3h-4v10.6z" fill="#1A1A1A"/></svg>,
  brevo: s=><svg width={s} height={s} viewBox="0 0 24 24"><path fill="#0B996E" d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zM7.2 4.8h5.747c2.34 0 3.895 1.406 3.895 3.516 0 1.022-.348 1.862-1.09 2.588C17.189 11.812 18 13.22 18 14.785c0 2.86-2.64 5.016-6.164 5.016H7.199v-15zm2.085 1.952v5.537h.07c.233-.432.858-.796 2.249-1.226 2.039-.659 3.037-1.52 3.037-2.655 0-.998-.766-1.656-1.924-1.656H9.285zm4.87 5.266c-.766.385-1.67.748-2.76 1.11-1.229.387-2.11 1.386-2.11 2.407v2.315h2.365c2.387 0 4.149-1.34 4.149-3.155 0-1.067-.625-2.087-1.645-2.677z"/></svg>,
  php: s=><svg width={s} height={s} viewBox="0 0 24 24"><path fill="#777BB4" d="M7.01 10.207h-.944l-.515 2.648h.838c.556 0 .97-.105 1.242-.314.272-.21.455-.559.55-1.049.092-.47.05-.802-.124-.995-.175-.193-.523-.29-1.047-.29zM12 5.688C5.373 5.688 0 8.514 0 12s5.373 6.313 12 6.313S24 15.486 24 12c0-3.486-5.373-6.312-12-6.312zm-3.26 7.451c-.261.25-.575.438-.917.551-.336.108-.765.164-1.285.164H5.357l-.327 1.681H3.652l1.23-6.326h2.65c.797 0 1.378.209 1.744.628.366.418.476 1.002.33 1.752a2.836 2.836 0 0 1-.305.847c-.143.255-.33.49-.561.703zm4.024.715l.543-2.799c.063-.318.039-.536-.068-.651-.107-.116-.336-.174-.687-.174H11.46l-.704 3.625H9.388l1.23-6.327h1.367l-.327 1.682h1.218c.767 0 1.295.134 1.586.401s.378.7.263 1.299l-.572 2.944h-1.389zm7.597-2.265a2.782 2.782 0 0 1-.305.847c-.143.255-.33.49-.561.703a2.44 2.44 0 0 1-.917.551c-.336.108-.765.164-1.286.164h-1.18l-.327 1.682h-1.378l1.23-6.326h2.649c.797 0 1.378.209 1.744.628.366.417.477 1.001.331 1.751zM17.766 10.207h-.943l-.516 2.648h.838c.557 0 .971-.105 1.242-.314.272-.21.455-.559.551-1.049.092-.47.049-.802-.125-.995s-.524-.29-1.047-.29z"/></svg>,
};

const LIVE = [
  { id:"ses", name:"Amazon SES", desc:"Scalable cloud delivery" },
  { id:"brevo", name:"Brevo", desc:"All-in-one platform" },
  { id:"mailgun", name:"Mailgun", desc:"Powerful email APIs" },
  { id:"sendgrid", name:"SendGrid", desc:"Reliable at scale" },
  { id:"postmark", name:"Postmark", desc:"Fast transactional" },
  { id:"php", name:"PHP Mail", desc:"Built-in server mail" },
];
const PLANNED = ["Mailjet","MailerSend","SparkPost","Elastic Email","SMTP2GO","Zoho Mail","Google Workspace","Microsoft 365","Netcore"];

function PI({ id, size=26 }) {
  const fn = pIcons[id];
  return fn ? <div style={{ width:size, height:size, borderRadius:6, overflow:"hidden", flexShrink:0, lineHeight:0 }}>{fn(size)}</div> : null;
}

/* ═══════════════════════════ MICRO COMPONENTS ═══════════════════════════ */
const pill = (text, color="default") => {
  const m = { default:[G[100],G[600]], ok:["#E8F5E9","#2E7D32"], warn:["#FFF8E1","#F57F17"], bad:["#FFEBEE","#C62828"], accent:[AL,AD] };
  const [bg,c] = m[color]||m.default;
  return <span style={{ background:bg, color:c, fontSize:10.5, fontWeight:600, padding:"2px 8px", borderRadius:99, letterSpacing:.2, whiteSpace:"nowrap" }}>{text}</span>;
};

function Btn({ children, kind="outline", size="md", onClick, disabled, sx }) {
  const base = { fontFamily:"inherit", cursor:disabled?"default":"pointer", fontWeight:500, display:"inline-flex", alignItems:"center", justifyContent:"center", gap:5, border:"none", transition:"all .15s", borderRadius:7, opacity:disabled?.4:1 };
  const sz = { sm:{fontSize:12,padding:"5px 12px",height:28}, md:{fontSize:13,padding:"7px 16px",height:34}, lg:{fontSize:14,padding:"9px 22px",height:40} }[size];
  const kd = { fill:{background:A,color:"#fff"}, outline:{background:"transparent",color:G[700],border:`1px solid ${G[200]}`}, ghost:{background:"transparent",color:G[500],border:"none"}, soft:{background:G[100],color:G[700],border:"none"} }[kind];
  return <button onClick={disabled?undefined:onClick} style={{...base,...sz,...kd,...sx}}>{children}</button>;
}

function Field({ label, hint, ...p }) {
  return <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
    {label && <label style={{ fontSize:12.5, fontWeight:500, color:G[700] }}>{label}</label>}
    <input style={{ height:36, border:`1px solid ${G[200]}`, borderRadius:7, padding:"0 11px", fontSize:13, fontFamily:"inherit", color:G[900], background:"#fff", outline:"none", width:"100%" }} onFocus={e=>e.target.style.borderColor=A} onBlur={e=>e.target.style.borderColor=G[200]} {...p}/>
    {hint && <span style={{ fontSize:11, color:G[400], lineHeight:1.4 }}>{hint}</span>}
  </div>;
}

function Dropdown({ label, opts, ...p }) {
  return <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
    {label && <label style={{ fontSize:12.5, fontWeight:500, color:G[700] }}>{label}</label>}
    <select style={{ height:36, border:`1px solid ${G[200]}`, borderRadius:7, padding:"0 10px", fontSize:13, fontFamily:"inherit", color:G[900], background:"#fff", outline:"none", cursor:"pointer", appearance:"auto" }} {...p}>{opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>
  </div>;
}

function Switch({ on, set }) {
  return <button onClick={()=>set?.(!on)} style={{ width:36, height:20, borderRadius:10, border:"none", cursor:"pointer", background:on?A:G[200], position:"relative", transition:"background .2s", flexShrink:0 }}><span style={{ position:"absolute", top:2, left:on?18:2, width:16, height:16, borderRadius:8, background:"#fff", transition:"left .2s" }}/></button>;
}

function Box({ children, sx }) {
  return <div style={{ background:"#fff", border:`1px solid ${G[200]}`, borderRadius:10, ...sx }}>{children}</div>;
}

/* ═══════════════════════════ ICONS ═══════════════════════════ */
const ic = {
  mail: p=><svg {...p} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="16" height="12" rx="2"/><path d="M2 6l8 5 8-5"/></svg>,
  check: p=><svg {...p} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 10.5l4 4 8-9"/></svg>,
  send: p=><svg {...p} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 3L3 10l5 2 2 5z"/><path d="M8 12l9-9"/></svg>,
  gear: p=><svg {...p} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2m0 12v2M3.5 5l1.5 1m10-1l-1.5 1M2 10h2m12 0h2M3.5 15l1.5-1m10 1l-1.5-1"/></svg>,
  shield: p=><svg {...p} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 2L3 6v4c0 4.4 3 8.5 7 10 4-1.5 7-5.6 7-10V6z"/><path d="M7 10l2 2 4-4.5"/></svg>,
  retry: p=><svg {...p} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 10a7 7 0 0112.9-3.8M17 10a7 7 0 01-12.9 3.8"/><path d="M16 3v3.2h-3.2M4 17v-3.2h3.2"/></svg>,
  bolt: p=><svg {...p} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2L4 11h5l-1 7 7-9h-5z"/></svg>,
  log: p=><svg {...p} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="2" width="14" height="16" rx="2"/><path d="M7 6h6M7 10h6M7 14h3"/></svg>,
  link: p=><svg {...p} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 12l4-4m-1.5-2.5L12 4a3 3 0 014.2 4.2l-1.5 1.5m-5.2 5.2L8 16.4a3 3 0 01-4.2-4.2L5.3 10.7"/></svg>,
  plus: p=><svg {...p} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 4v12M4 10h12"/></svg>,
  search: p=><svg {...p} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8.5" cy="8.5" r="5"/><path d="M14 14l3.5 3.5"/></svg>,
  x: p=><svg {...p} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 5l10 10M15 5L5 15"/></svg>,
  eye: p=><svg {...p} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2.5"/></svg>,
  download: p=><svg {...p} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3v10m-4-4l4 4 4-4M3 15v2h14v-2"/></svg>,
  grip: p=><svg {...p} viewBox="0 0 16 16" fill="currentColor"><circle cx="5" cy="4" r="1"/><circle cx="11" cy="4" r="1"/><circle cx="5" cy="8" r="1"/><circle cx="11" cy="8" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="11" cy="12" r="1"/></svg>,
  up: p=><svg {...p} viewBox="0 0 10 10" fill="currentColor"><path d="M5 2l3.5 4H1.5z"/></svg>,
  right: p=><svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3l5 5-5 5"/></svg>,
  help: p=><svg {...p} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="8"/><path d="M7.5 7.5a2.5 2.5 0 014.7 1.2c0 1.7-2.5 2.3-2.5 2.3M10 15h.01"/></svg>,
};

/* ═══════════════════════════════════════════════════════════
   ONBOARDING — single focused screen, not a multi-step wizard
   ═══════════════════════════════════════════════════════════ */
function Setup({ done }) {
  const [picked, setPicked] = useState(null);
  const [phase, setPhase] = useState("pick"); // pick → config → done
  const [testOk, setTestOk] = useState(false);

  return (
    <div style={{ minHeight:"100vh", background:"#fff", fontFamily:"'DM Sans',sans-serif" }}>
      {/* minimal header */}
      <div style={{ padding:"16px 28px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <div style={{ width:8, height:8, borderRadius:99, background:A }}/><span style={{ fontSize:14, fontWeight:700, color:G[900], letterSpacing:-.3 }}>Your SMTP Plugin</span>
        </div>
        <Btn kind="ghost" size="sm" onClick={done} sx={{ color:G[400], fontSize:12 }}>Skip for now →</Btn>
      </div>

      <div style={{ maxWidth:540, margin:"0 auto", padding:"32px 24px 60px" }}>
        {/* progress dots */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:36 }}>
          {["pick","config","done"].map((p,i)=>(
            <div key={p} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:99, background:(phase===p||["pick","config","done"].indexOf(phase)>i)?A:G[200], transition:"background .3s" }}/>
              {i<2 && <div style={{ width:32, height:1.5, background:["pick","config","done"].indexOf(phase)>i?A:G[200], transition:"background .3s" }}/>}
            </div>
          ))}
        </div>

        {phase==="pick" && <>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <h1 style={{ fontSize:22, fontWeight:700, color:G[900], margin:"0 0 6px", letterSpacing:-.3 }}>Connect your first provider</h1>
            <p style={{ fontSize:14, color:G[500], margin:0, lineHeight:1.5 }}>Which service sends your emails? You can add more anytime.</p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {LIVE.map(p=>(
              <button key={p.id} onClick={()=>setPicked(p)} style={{
                display:"flex", alignItems:"center", gap:12, padding:"12px 16px",
                background:picked?.id===p.id?AL:"#fff",
                border:`${picked?.id===p.id?1.5:1}px solid ${picked?.id===p.id?A:G[200]}`,
                borderRadius:10, cursor:"pointer", fontFamily:"inherit", textAlign:"left", transition:"all .1s",
              }}>
                <PI id={p.id} size={30}/>
                <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:600, color:G[900] }}>{p.name}</div><div style={{ fontSize:12, color:G[400] }}>{p.desc}</div></div>
                <div style={{ width:18, height:18, borderRadius:99, border:`2px solid ${picked?.id===p.id?A:G[300]}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {picked?.id===p.id && <div style={{ width:10, height:10, borderRadius:99, background:A }}/>}
                </div>
              </button>
            ))}
          </div>
          <div style={{ padding:"14px 0", borderTop:`1px solid ${G[100]}`, marginTop:14 }}>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"center" }}>
              <span style={{ fontSize:11.5, color:G[400], fontWeight:500 }}>Coming soon:</span>
              {PLANNED.map(n=><span key={n} style={{ fontSize:11, color:G[400], background:G[50], padding:"2px 8px", borderRadius:5, border:`1px solid ${G[200]}` }}>{n}</span>)}
            </div>
          </div>
          <Btn kind="fill" size="lg" onClick={()=>picked&&setPhase("config")} disabled={!picked} sx={{ width:"100%", marginTop:16, borderRadius:9, fontSize:14.5, height:44 }}>
            Continue with {picked?.name||"…"} <ic.right style={{ width:14, height:14 }}/>
          </Btn>
        </>}

        {phase==="config" && <>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
            <PI id={picked.id} size={34}/>
            <div><h2 style={{ fontSize:19, fontWeight:700, color:G[900], margin:0 }}>Set up {picked.name}</h2><p style={{ fontSize:13, color:G[500], margin:0 }}>Enter your credentials below.</p></div>
          </div>
          <Box sx={{ padding:22, marginBottom:14 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Field label="From name" placeholder="My Website"/>
                <Field label="From email" placeholder="hello@domain.com"/>
              </div>
              <Field label="API key" placeholder={`Paste your ${picked.name} key`} type="password" hint={<span>Find this in your <span style={{ color:A, cursor:"pointer" }}>{picked.name} dashboard →</span></span>}/>
            </div>
          </Box>
          <Box sx={{ padding:18 }}>
            <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:10 }}>Verify it works</div>
            <div style={{ display:"flex", gap:8 }}>
              <input placeholder="test@email.com" style={{ flex:1, height:34, border:`1px solid ${G[200]}`, borderRadius:7, padding:"0 11px", fontSize:13, fontFamily:"inherit", color:G[900], outline:"none" }}/>
              <Btn kind="fill" size="sm" onClick={()=>setTestOk(true)}><ic.send style={{ width:12, height:12 }}/> Test</Btn>
            </div>
            {testOk && <div style={{ marginTop:10, padding:"8px 12px", background:"#E8F5E9", borderRadius:7, fontSize:12, color:"#2E7D32", display:"flex", alignItems:"center", gap:6 }}><ic.check style={{ width:13, height:13 }}/> Delivered in 1.2s</div>}
          </Box>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:20 }}>
            <Btn kind="ghost" onClick={()=>setPhase("pick")}>← Back</Btn>
            <Btn kind="fill" size="lg" onClick={done} sx={{ borderRadius:9, height:44 }}>Finish & go to dashboard <ic.check style={{ width:14, height:14 }}/></Btn>
          </div>
        </>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════ */
function Main() {
  const [view, setView] = useState("overview");
  const nav = [
    { id:"overview", label:"Overview" },
    { id:"connections", label:"Connections" },
    { id:"logs", label:"Logs" },
    { id:"settings", label:"Settings" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:G[50], fontFamily:"'DM Sans',sans-serif" }}>
      {/* ─── TOP BAR ─── */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${G[200]}`, padding:"0 24px", height:48, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div style={{ width:7, height:7, borderRadius:99, background:A }}/>
            <span style={{ fontSize:14, fontWeight:700, color:G[900], letterSpacing:-.3 }}>Your SMTP Plugin</span>
          </div>
          <div style={{ display:"flex", gap:2, background:G[50], borderRadius:6, padding:2 }}>
            {nav.map(n=>(
              <button key={n.id} onClick={()=>setView(n.id)} style={{
                padding:"5px 14px", borderRadius:5, border:"none", fontSize:12.5, fontWeight:500,
                cursor:"pointer", fontFamily:"inherit", transition:"all .12s",
                background:view===n.id?"#fff":"transparent",
                color:view===n.id?G[900]:G[400],
                ...(view===n.id?{border:`1px solid ${G[200]}`}:{border:"1px solid transparent"}),
              }}>{n.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <Btn kind="outline" size="sm"><ic.send style={{ width:12, height:12 }}/> Send test</Btn>
          <Btn kind="ghost" size="sm" sx={{ color:G[400], padding:5 }}><ic.help style={{ width:15, height:15 }}/></Btn>
        </div>
      </div>

      <div style={{ maxWidth:920, margin:"0 auto", padding:"22px 24px" }}>
        {view==="overview" && <Overview/>}
        {view==="connections" && <Connections/>}
        {view==="logs" && <Logs/>}
        {view==="settings" && <Settings/>}
      </div>
    </div>
  );
}

/* ═══════════════════════════ OVERVIEW ═══════════════════════════ */
function Overview() {
  const spark = [34,38,32,42,40,44,48,45,41,47,50,48,52,49];
  return <div>
    {/* live status ribbon */}
    <div style={{ display:"flex", alignItems:"stretch", gap:10, marginBottom:18 }}>
      {[
        { n:"Sent", v:"12,847", sub:"+12% this month", c:"#2E7D32" },
        { n:"Delivered", v:"99.04%", sub:"Last 30 days", c:"#2E7D32" },
        { n:"Retried", v:"23", sub:"76% recovered", c:"#F57F17" },
        { n:"Blocked", v:"7", sub:"By shield", c:G[500] },
      ].map((s,i)=>(
        <Box key={i} sx={{ flex:1, padding:"13px 15px" }}>
          <div style={{ fontSize:10.5, color:G[400], textTransform:"uppercase", letterSpacing:.5, marginBottom:4 }}>{s.n}</div>
          <div style={{ fontSize:22, fontWeight:700, color:G[900], letterSpacing:-.5 }}>{s.v}</div>
          <div style={{ fontSize:11, color:s.c, marginTop:2, display:"flex", alignItems:"center", gap:3 }}>
            {s.c==="#2E7D32"&&<ic.up style={{ width:8, height:8 }}/>}{s.sub}
          </div>
        </Box>
      ))}
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"5fr 3fr", gap:12, marginBottom:18 }}>
      {/* sparkline */}
      <Box sx={{ padding:"16px 18px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <span style={{ fontSize:13, fontWeight:600, color:G[800] }}>Delivery volume</span>
          <span style={{ fontSize:11, color:G[400] }}>14 days</span>
        </div>
        <svg viewBox="0 0 460 90" style={{ width:"100%", height:90, display:"block" }}>
          <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={A} stopOpacity=".1"/><stop offset="100%" stopColor={A} stopOpacity="0"/></linearGradient></defs>
          <path d={`M${spark.map((v,i)=>`${(i/(spark.length-1))*460},${90-v*1.7}`).join(" L")} L460,90 L0,90Z`} fill="url(#sg)"/>
          <path d={`M${spark.map((v,i)=>`${(i/(spark.length-1))*460},${90-v*1.7}`).join(" L")}`} fill="none" stroke={A} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Box>

      {/* quick status */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Box sx={{ padding:"12px 14px", flex:1, display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:7, background:"#E8F5E9", display:"flex", alignItems:"center", justifyContent:"center" }}><ic.link style={{ width:14, height:14, color:"#2E7D32" }}/></div>
          <div style={{ flex:1 }}><div style={{ fontSize:12.5, fontWeight:600, color:G[800] }}>3 connections</div><div style={{ fontSize:11, color:G[400] }}>All healthy</div></div>
          {pill("Active","ok")}
        </Box>
        <Box sx={{ padding:"12px 14px", flex:1, display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:7, background:AL, display:"flex", alignItems:"center", justifyContent:"center" }}><ic.retry style={{ width:14, height:14, color:A }}/></div>
          <div style={{ flex:1 }}><div style={{ fontSize:12.5, fontWeight:600, color:G[800] }}>Auto-retry</div><div style={{ fontSize:11, color:G[400] }}>30 min cycle</div></div>
          {pill("On","ok")}
        </Box>
        <Box sx={{ padding:"12px 14px", flex:1, display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:7, background:"#FFF8E1", display:"flex", alignItems:"center", justifyContent:"center" }}><ic.shield style={{ width:14, height:14, color:"#F57F17" }}/></div>
          <div style={{ flex:1 }}><div style={{ fontSize:12.5, fontWeight:600, color:G[800] }}>Reputation shield</div><div style={{ fontSize:11, color:G[400] }}>7 blocked</div></div>
          {pill("92/100","warn")}
        </Box>
      </div>
    </div>

    {/* recent activity — as a feed, not a table */}
    <Box sx={{ overflow:"hidden" }}>
      <div style={{ padding:"13px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${G[100]}` }}>
        <span style={{ fontSize:13, fontWeight:600, color:G[800] }}>Recent activity</span>
        <Btn kind="ghost" size="sm" sx={{ color:A, fontSize:12 }}>All logs →</Btn>
      </div>
      {[
        { to:"alex@co.com", subj:"Invoice #2847", pid:"ses", st:"ok", t:"2m" },
        { to:"sarah@io.co", subj:"Password reset", pid:"sendgrid", st:"ok", t:"8m" },
        { to:"team@agency.co", subj:"Weekly digest", pid:"postmark", st:"warn", t:"22m" },
        { to:"blocked@xyz.co", subj:"Promo blast", pid:null, st:"bad", t:"3h" },
      ].map((r,i,arr)=>(
        <div key={i} style={{ padding:"10px 16px", display:"flex", alignItems:"center", gap:10, borderBottom:i<arr.length-1?`1px solid ${G[100]}`:"none" }}>
          <div style={{ width:6, height:6, borderRadius:99, background:r.st==="ok"?"#4CAF50":r.st==="warn"?"#FF9800":"#EF5350", flexShrink:0 }}/>
          {r.pid && <PI id={r.pid} size={20}/>}
          {!r.pid && <div style={{ width:20, height:20, borderRadius:5, background:G[100] }}/>}
          <div style={{ flex:1, minWidth:0 }}>
            <span style={{ fontSize:12.5, fontWeight:500, color:G[800] }}>{r.to}</span>
            <span style={{ fontSize:12, color:G[400], marginLeft:8 }}>{r.subj}</span>
          </div>
          <span style={{ fontSize:11, color:G[400] }}>{r.t}</span>
        </div>
      ))}
    </Box>
  </div>;
}

/* ═══════════════════════════ CONNECTIONS ═══════════════════════════ */
function Connections() {
  const [conns, setConns] = useState([
    { ...LIVE[0], on:true, ok:true, email:"hello@site.com" },
    { ...LIVE[3], on:true, ok:true, email:"noreply@site.com" },
    { ...LIVE[4], on:true, ok:true, email:"admin@site.com" },
  ]);
  const [adding, setAdding] = useState(false);
  const active = conns.filter(c=>c.on);

  return <div>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
      <h2 style={{ fontSize:16, fontWeight:700, color:G[900], margin:0 }}>Connections</h2>
      <Btn kind="fill" size="sm" onClick={()=>setAdding(!adding)}><ic.plus style={{ width:12, height:12 }}/> Add</Btn>
    </div>
    <p style={{ fontSize:12.5, color:G[500], margin:"0 0 16px" }}>First active connection is primary. If it fails, the next one takes over automatically.</p>

    {/* failover pipeline */}
    {active.length>0 && <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:16, padding:"8px 12px", background:G[100], borderRadius:7, overflowX:"auto" }}>
      <ic.bolt style={{ width:13, height:13, color:A, flexShrink:0 }}/>
      <span style={{ fontSize:11.5, color:G[600], flexShrink:0, marginRight:4 }}>Failover:</span>
      {active.map((c,i)=><span key={c.id} style={{ display:"flex", alignItems:"center", gap:4 }}>
        <span style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 9px", background:"#fff", borderRadius:5, border:`1px solid ${G[200]}`, fontSize:11.5, fontWeight:500, color:G[800], whiteSpace:"nowrap" }}><PI id={c.id} size={14}/>{c.name}</span>
        {i<active.length-1 && <span style={{ color:G[300], fontSize:11 }}>→</span>}
      </span>)}
    </div>}

    {adding && <Box sx={{ padding:14, marginBottom:12, border:`1px dashed ${A}50` }}>
      <div style={{ fontSize:12.5, fontWeight:600, color:G[800], marginBottom:8 }}>Select provider</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {LIVE.filter(p=>!conns.find(c=>c.id===p.id)).map(p=>(
          <button key={p.id} onClick={()=>{setConns([...conns,{...p,on:false,ok:false,email:""}]);setAdding(false);}} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", background:"#fff", border:`1px solid ${G[200]}`, borderRadius:7, cursor:"pointer", fontFamily:"inherit", fontSize:12, color:G[700], fontWeight:500 }}>
            <PI id={p.id} size={20}/>{p.name}
          </button>
        ))}
        {LIVE.filter(p=>!conns.find(c=>c.id===p.id)).length===0 && <span style={{ fontSize:12, color:G[400] }}>All available providers connected.</span>}
      </div>
      {PLANNED.length>0 && <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${G[100]}`, display:"flex", flexWrap:"wrap", gap:4, alignItems:"center" }}>
        <span style={{ fontSize:11, color:G[400] }}>Planned:</span>
        {PLANNED.map(n=><span key={n} style={{ fontSize:10.5, color:G[400], background:G[50], padding:"1px 7px", borderRadius:4 }}>{n}</span>)}
      </div>}
    </Box>}

    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {conns.map((c,i)=>(
        <Box key={c.id} sx={{ padding:"11px 14px", display:"flex", alignItems:"center", gap:10, opacity:c.on?1:.4, transition:"opacity .2s" }}>
          <ic.grip style={{ width:12, height:12, color:G[300], cursor:"grab" }}/>
          <div style={{ width:22, height:22, borderRadius:99, fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
            background:i===0&&c.on?"#E8F5E9":c.on?"#FFF8E1":G[100],
            color:i===0&&c.on?"#2E7D32":c.on?"#F57F17":G[400] }}>{i+1}</div>
          <PI id={c.id} size={26}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ fontSize:13, fontWeight:600, color:G[900] }}>{c.name}</span>
              {i===0&&c.on && pill("Primary","ok")}
              {i>0&&c.on && pill("Backup","warn")}
            </div>
            <div style={{ fontSize:11.5, color:G[400], marginTop:1 }}>{c.email||"Not configured"}</div>
          </div>
          <Switch on={c.on} set={()=>{const u=[...conns];u[i].on=!u[i].on;setConns(u);}}/>
          <Btn kind="ghost" size="sm" sx={{ color:G[400], padding:4 }}><ic.gear style={{ width:13, height:13 }}/></Btn>
          <Btn kind="ghost" size="sm" sx={{ color:G[300], padding:4 }} onClick={()=>setConns(conns.filter((_,j)=>j!==i))}><ic.x style={{ width:12, height:12 }}/></Btn>
        </Box>
      ))}
    </div>
  </div>;
}

/* ═══════════════════════════ LOGS ═══════════════════════════ */
function Logs() {
  const [f,setF]=useState("all");
  const [q,setQ]=useState("");
  const [open,setOpen]=useState(null);
  const [resending,setResending]=useState({});
  const [resent,setResent]=useState({});
  const [data,setData] = useState([
    { id:1, to:"alex@company.com", subj:"Invoice #2847", pid:"ses", st:"sent", d:"10:14 AM", body:"Hi Alex, please find your invoice #2847 attached…", headers:"Content-Type: text/html; From: hello@site.com" },
    { id:2, to:"sarah@startup.io", subj:"Password reset", pid:"ses", st:"sent", d:"10:06 AM", body:"Click the link below to reset your password…", headers:"Content-Type: text/html; From: noreply@site.com" },
    { id:3, to:"team@agency.co", subj:"Weekly digest", pid:"postmark", st:"retried", d:"9:52 AM", body:"Here's your weekly activity summary…", headers:"Content-Type: text/html; From: admin@site.com" },
    { id:4, to:"notify@store.app", subj:"Order shipped", pid:"sendgrid", st:"sent", d:"9:30 AM", body:"Great news! Your order #4821 has shipped…", headers:"Content-Type: text/html; From: noreply@site.com" },
    { id:5, to:"info@blocked.xyz", subj:"Promo blast", pid:null, st:"blocked", d:"7:45 AM", body:"HUGE SALE! BUY NOW! FREE FREE FREE…", headers:"Blocked by Reputation Shield" },
    { id:6, to:"user@demo.net", subj:"Welcome aboard!", pid:"ses", st:"sent", d:"Yesterday", body:"Welcome to the platform! Here's how to get started…", headers:"Content-Type: text/html; From: hello@site.com" },
    { id:7, to:"dev@test.org", subj:"CI/CD alert", pid:"sendgrid", st:"failed", d:"Yesterday", body:"Build #392 failed on main branch…", headers:"Content-Type: text/plain; From: ci@site.com" },
  ]);
  const rows = data.filter(r=>(f==="all"||r.st===f)&&(!q||r.to.includes(q)||r.subj.toLowerCase().includes(q.toLowerCase())));
  const failedCount = data.filter(r=>r.st==="failed"||r.st==="blocked").length;

  const doResend = (id) => {
    setResending(p=>({...p,[id]:true}));
    setTimeout(()=>{
      setResending(p=>{const n={...p};delete n[id];return n;});
      setResent(p=>({...p,[id]:true}));
      setData(prev=>prev.map(r=>r.id===id?{...r,st:"sent"}:r));
      setTimeout(()=>setResent(p=>{const n={...p};delete n[id];return n;}),3000);
    },1500);
  };

  const resendAll = () => {
    data.filter(r=>r.st==="failed").forEach((r,i)=>{
      setTimeout(()=>doResend(r.id), i*800);
    });
  };

  return <div>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
      <h2 style={{ fontSize:16, fontWeight:700, color:G[900], margin:0 }}>Email logs</h2>
      <div style={{ display:"flex", gap:6 }}>
        {failedCount>0 && <Btn kind="fill" size="sm" onClick={resendAll} sx={{ background:"#DC2626", fontSize:11.5 }}><ic.retry style={{ width:11, height:11 }}/> Resend {failedCount} failed</Btn>}
        <Btn kind="outline" size="sm"><ic.download style={{ width:12, height:12 }}/> Export</Btn>
      </div>
    </div>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, gap:8 }}>
      <div style={{ display:"flex", gap:2, background:G[100], borderRadius:6, padding:2 }}>
        {["all","sent","retried","failed","blocked"].map(v=>(
          <button key={v} onClick={()=>setF(v)} style={{ padding:"4px 11px", borderRadius:5, border:f===v?`1px solid ${G[200]}`:"1px solid transparent", fontSize:11.5, fontWeight:500, cursor:"pointer", fontFamily:"inherit", background:f===v?"#fff":"transparent", color:f===v?G[900]:G[400], textTransform:"capitalize" }}>{v}</button>
        ))}
      </div>
      <div style={{ position:"relative" }}>
        <ic.search style={{ width:12, height:12, position:"absolute", left:9, top:9, color:G[400] }}/>
        <input placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} style={{ height:30, border:`1px solid ${G[200]}`, borderRadius:6, paddingLeft:28, paddingRight:10, fontSize:12, fontFamily:"inherit", color:G[900], background:"#fff", outline:"none", width:180 }}/>
      </div>
    </div>
    <Box sx={{ overflow:"hidden" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
        <thead><tr>{["To","Subject","Via","Status","Time",""].map(h=><th key={h} style={{ textAlign:"left", padding:"8px 14px", fontSize:10, fontWeight:600, color:G[400], textTransform:"uppercase", letterSpacing:.5, borderBottom:`1px solid ${G[100]}` }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r,i)=>{
          const pv=LIVE.find(p=>p.id===r.pid);
          const isOpen=open===r.id;
          const isSending=resending[r.id];
          const isSent=resent[r.id];
          return <React.Fragment key={r.id}>
            <tr style={{ borderBottom:isOpen?"none":(i<rows.length-1?`1px solid ${G[100]}`:"none"), cursor:"pointer", background:isOpen?G[50]:"transparent", transition:"background .1s" }} onClick={()=>setOpen(isOpen?null:r.id)}>
              <td style={{ padding:"9px 14px", fontWeight:500, color:G[800] }}>{r.to}</td>
              <td style={{ padding:"9px 14px", color:G[500], maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.subj}</td>
              <td style={{ padding:"9px 14px" }}>{pv?<div style={{ display:"flex", alignItems:"center", gap:5 }}><PI id={r.pid} size={16}/><span style={{ fontSize:11, color:G[500] }}>{pv.name}</span></div>:<span style={{ color:G[400] }}>—</span>}</td>
              <td style={{ padding:"9px 14px" }}>
                {isSending ? pill("Sending…","accent") : isSent ? pill("Resent ✓","ok") : pill(r.st, r.st==="sent"?"ok":r.st==="retried"?"warn":"bad")}
              </td>
              <td style={{ padding:"9px 14px", color:G[400], fontSize:11 }}>{r.d}</td>
              <td style={{ padding:"9px 14px" }} onClick={e=>e.stopPropagation()}>
                <div style={{ display:"flex", gap:2 }}>
                  <Btn kind="ghost" size="sm" sx={{ padding:3, color:G[400] }} onClick={()=>setOpen(isOpen?null:r.id)}><ic.eye style={{ width:12, height:12 }}/></Btn>
                  <Btn kind="ghost" size="sm" sx={{ padding:3, color:isSending?G[300]:A, pointerEvents:isSending?"none":"auto" }} onClick={()=>doResend(r.id)}>
                    {isSending
                      ? <svg width={11} height={11} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation:"spin 1s linear infinite" }}><circle cx="10" cy="10" r="7" strokeDasharray="30 14"/></svg>
                      : <ic.retry style={{ width:11, height:11 }}/>}
                  </Btn>
                </div>
              </td>
            </tr>
            {/* ── expanded detail row ── */}
            {isOpen && <tr><td colSpan={6} style={{ padding:0 }}>
              <div style={{ padding:"14px 14px 16px", background:G[50], borderBottom:`1px solid ${G[100]}` }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  {/* left: email details */}
                  <div>
                    <div style={{ fontSize:11, fontWeight:600, color:G[400], textTransform:"uppercase", letterSpacing:.5, marginBottom:6 }}>Email preview</div>
                    <div style={{ background:"#fff", border:`1px solid ${G[200]}`, borderRadius:8, padding:14 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, paddingBottom:8, borderBottom:`1px solid ${G[100]}` }}>
                        <div>
                          <div style={{ fontSize:12.5, fontWeight:600, color:G[800] }}>{r.subj}</div>
                          <div style={{ fontSize:11, color:G[400], marginTop:2 }}>To: {r.to}</div>
                        </div>
                        <div style={{ fontSize:10.5, color:G[400] }}>{r.d}</div>
                      </div>
                      <div style={{ fontSize:12, color:G[600], lineHeight:1.6 }}>{r.body}</div>
                    </div>
                    <div style={{ marginTop:8, fontSize:10.5, color:G[400], fontFamily:"monospace", background:"#fff", border:`1px solid ${G[200]}`, borderRadius:6, padding:"6px 10px", wordBreak:"break-all" }}>{r.headers}</div>
                  </div>
                  {/* right: resend panel */}
                  <div>
                    <div style={{ fontSize:11, fontWeight:600, color:G[400], textTransform:"uppercase", letterSpacing:.5, marginBottom:6 }}>Resend this email</div>
                    <div style={{ background:"#fff", border:`1px solid ${G[200]}`, borderRadius:8, padding:14 }}>
                      <div style={{ marginBottom:10 }}>
                        <label style={{ fontSize:12, fontWeight:500, color:G[700], display:"block", marginBottom:4 }}>Send to</label>
                        <input defaultValue={r.to} style={{ width:"100%", height:32, border:`1px solid ${G[200]}`, borderRadius:6, padding:"0 10px", fontSize:12, fontFamily:"inherit", color:G[900], outline:"none" }}/>
                      </div>
                      <div style={{ marginBottom:12 }}>
                        <label style={{ fontSize:12, fontWeight:500, color:G[700], display:"block", marginBottom:4 }}>Via provider</label>
                        <select defaultValue={r.pid||"ses"} style={{ width:"100%", height:32, border:`1px solid ${G[200]}`, borderRadius:6, padding:"0 8px", fontSize:12, fontFamily:"inherit", color:G[900], outline:"none", cursor:"pointer", background:"#fff", appearance:"auto" }}>
                          {LIVE.filter(p=>p.id!=="php").map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <Btn kind="fill" size="sm" sx={{ width:"100%", borderRadius:6, height:34 }} onClick={()=>doResend(r.id)} disabled={isSending}>
                        {isSending ? <>
                          <svg width={12} height={12} viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="2" style={{ animation:"spin 1s linear infinite" }}><circle cx="10" cy="10" r="7" strokeDasharray="30 14"/></svg> Sending…
                        </> : isSent ? <>
                          <ic.check style={{ width:12, height:12 }}/> Delivered!
                        </> : <>
                          <ic.send style={{ width:12, height:12 }}/> Resend now
                        </>}
                      </Btn>
                      {isSent && <div style={{ marginTop:8, fontSize:11.5, color:"#2E7D32", display:"flex", alignItems:"center", gap:5 }}><ic.check style={{ width:12, height:12 }}/> Successfully delivered via {LIVE.find(p=>p.id===(r.pid||"ses"))?.name}</div>}
                    </div>
                    {r.st==="blocked" && <div style={{ marginTop:8, padding:"8px 10px", background:"#FFEBEE", borderRadius:6, fontSize:11.5, color:"#C62828", lineHeight:1.4 }}>
                      <strong>Blocked by Reputation Shield</strong> — this email contained content flagged as problematic. Review the content before resending.
                    </div>}
                    {r.st==="failed" && <div style={{ marginTop:8, padding:"8px 10px", background:"#FFF8E1", borderRadius:6, fontSize:11.5, color:"#F57F17", lineHeight:1.4 }}>
                      <strong>Delivery failed</strong> — the provider returned an error. Try resending via a different provider.
                    </div>}
                  </div>
                </div>
              </div>
            </td></tr>}
          </React.Fragment>;
        })}</tbody>
      </table>
      {rows.length===0 && <div style={{ padding:36, textAlign:"center", color:G[400], fontSize:12.5 }}>No matching emails.</div>}
    </Box>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>;
}

/* ═══════════════════════════ SETTINGS ═══════════════════════════ */
function Settings() {
  const [log,setLog]=useState(true);
  const [retry,setRetry]=useState(true);
  const [shield,setShield]=useState(false);
  const [sim,setSim]=useState(false);
  const [summary,setSummary]=useState(true);

  return <div>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
      <h2 style={{ fontSize:16, fontWeight:700, color:G[900], margin:0 }}>Settings</h2>
      <Btn kind="fill" size="sm">Save</Btn>
    </div>
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

      <Box sx={{ padding:18 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div><div style={{ fontSize:13.5, fontWeight:600, color:G[800] }}>Email logging</div><div style={{ fontSize:12, color:G[400], marginTop:1 }}>Store outgoing emails for debugging and resend.</div></div>
          <Switch on={log} set={setLog}/>
        </div>
        {log && <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${G[100]}`, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Dropdown label="Delete logs after" opts={[{v:"30",l:"30 days"},{v:"7",l:"7 days"},{v:"90",l:"90 days"}]}/>
          <Dropdown label="Default connection" opts={[{v:"ses",l:"Amazon SES"},{v:"sendgrid",l:"SendGrid"}]}/>
        </div>}
      </Box>

      <Box sx={{ padding:18 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:7, background:"#E8F5E9", display:"flex", alignItems:"center", justifyContent:"center" }}><ic.retry style={{ width:14, height:14, color:"#2E7D32" }}/></div>
            <div><div style={{ fontSize:13.5, fontWeight:600, color:G[800] }}>Auto-retry</div><div style={{ fontSize:12, color:G[400], marginTop:1 }}>Resend failed emails through backup connections.</div></div>
          </div>
          <Switch on={retry} set={setRetry}/>
        </div>
        {retry && <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${G[100]}`, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          <Dropdown label="Delay" opts={[{v:"30",l:"30 min"},{v:"15",l:"15 min"},{v:"60",l:"1 hour"}]}/>
          <Dropdown label="Attempts" opts={[{v:"3",l:"3 tries"},{v:"2",l:"2 tries"},{v:"5",l:"5 tries"}]}/>
          <Dropdown label="Strategy" opts={[{v:"next",l:"Next provider"},{v:"same",l:"Same provider"}]}/>
        </div>}
      </Box>

      <Box sx={{ padding:0, overflow:"hidden" }}>
        <div style={{ padding:18, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:7, background:"#FFF8E1", display:"flex", alignItems:"center", justifyContent:"center" }}><ic.shield style={{ width:14, height:14, color:"#F57F17" }}/></div>
            <div><div style={{ fontSize:13.5, fontWeight:600, color:G[800] }}>Reputation Shield</div><div style={{ fontSize:12, color:G[400], marginTop:1 }}>Scan emails for problematic content before sending.</div></div>
          </div>
          {shield && <Switch on={shield} set={setShield}/>}
        </div>
        {!shield ? (
          <div style={{ padding:"14px 18px", background:G[50], borderTop:`1px solid ${G[100]}` }}>
            <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:12 }}>
              {["Avoid getting flagged by SMTP providers","Maintain high sender score","Prevent blacklists and policy violations"].map((t,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:7, fontSize:12, color:G[600] }}>
                  <ic.check style={{ width:12, height:12, color:"#2E7D32", flexShrink:0 }}/>{t}
                </div>
              ))}
            </div>
            <Btn kind="fill" size="sm" onClick={()=>setShield(true)} sx={{ borderRadius:6 }}><ic.bolt style={{ width:12, height:12 }}/> Activate</Btn>
          </div>
        ) : (
          <div style={{ padding:"12px 18px", background:"#E8F5E9", borderTop:`1px solid #C8E6C9`, fontSize:12, color:"#2E7D32", display:"flex", alignItems:"center", gap:6 }}>
            <ic.check style={{ width:13, height:13 }}/> Shield is active — 7 emails blocked this month
          </div>
        )}
      </Box>

      <Box sx={{ padding:18 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div><div style={{ fontSize:13.5, fontWeight:600, color:G[800] }}>Weekly summary</div><div style={{ fontSize:12, color:G[400], marginTop:1 }}>Receive a digest of your email delivery stats.</div></div>
          <Switch on={summary} set={setSummary}/>
        </div>
        {summary && <div style={{ paddingTop:14, borderTop:`1px solid ${G[100]}` }}>
          <Dropdown label="Send on" opts={[{v:"mon",l:"Monday"},{v:"fri",l:"Friday"},{v:"daily",l:"Daily"}]}/>
        </div>}
      </Box>

      <Box sx={{ padding:18 }}>
        <div style={{ fontSize:13.5, fontWeight:600, color:G[800], marginBottom:12 }}>Advanced</div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div><div style={{ fontSize:12.5, fontWeight:500, color:G[700] }}>Email simulation</div><div style={{ fontSize:11.5, color:G[400] }}>Log emails without actually sending them.</div></div>
            <Switch on={sim} set={setSim}/>
          </div>
          <div style={{ borderTop:`1px solid ${G[100]}`, paddingTop:12, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div><div style={{ fontSize:12.5, fontWeight:500, color:G[700] }}>Anonymous analytics</div><div style={{ fontSize:11.5, color:G[400] }}>Share non-sensitive usage data to help us improve.</div></div>
            <Switch on={false} set={()=>{}}/>
          </div>
        </div>
      </Box>
    </div>
  </div>;
}

/* ═══════════════════════════ ROOT ═══════════════════════════ */
export default function PluginApp() {
  const [ready, setReady] = useState(false);
  useEffect(()=>{
    const l=document.createElement("link");
    l.href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap";
    l.rel="stylesheet"; document.head.appendChild(l);
  },[]);
  return ready ? <Main/> : <Setup done={()=>setReady(true)}/>;
}
