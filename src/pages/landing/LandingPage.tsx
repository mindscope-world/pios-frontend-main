import { useEffect, useRef } from "react";

const css = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap');

/* ═══════════════════════════════════
   TOKENS
═══════════════════════════════════ */
:root {
  --ink:     #040507;
  --s1:      #070a0f;
  --s2:      #0a1018;
  --s3:      #0e1620;
  --s4:      #121d2a;
  --b1:      #162030;
  --b2:      #1c2c40;
  --b3:      #243650;

  --amber:   #e0981c;
  --amber-h: #f0b030;
  --amber-d: #8a5c0a;
  --amber-g: rgba(224,152,28,0.1);
  --amber-gg:rgba(224,152,28,0.05);

  --cyan:    #00b0d8;
  --cyan-g:  rgba(0,176,216,0.08);
  --red:     #d83838;
  --red-g:   rgba(216,56,56,0.08);
  --green:   #00c880;
  --green-g: rgba(0,200,128,0.08);
  --purple:  #8858e8;
  --orange:  #e87030;

  --white:   #dde8f4;
  --mid:     #5a7890;
  --dim:     #2c4060;
  --muted:   #162030;

  --unleash: linear-gradient(135deg,#e0981c,#e87030,#d83838);

  --fw: 1440px;
}

/* ═══════════════════════════════════
   RESET & BASE
═══════════════════════════════════ */
*{margin:0;padding:0;box-sizing:border-box;}

html{scroll-behavior:smooth;}

body{
  background:var(--ink);
  color:var(--white);
  font-family:'IBM Plex Sans',sans-serif;
  overflow-x:hidden;
  cursor:default;
}

/* Global grid bg */
body::after{
  content:'';position:fixed;inset:0;
  background-image:
    linear-gradient(rgba(0,176,216,0.018) 1px,transparent 1px),
    linear-gradient(90deg,rgba(0,176,216,0.018) 1px,transparent 1px);
  background-size:64px 64px;
  pointer-events:none;z-index:0;
}

/* Scanlines */
body::before{
  content:'';position:fixed;inset:0;
  background:repeating-linear-gradient(
    0deg,transparent,transparent 3px,
    rgba(0,0,0,0.05) 3px,rgba(0,0,0,0.05) 4px
  );
  pointer-events:none;z-index:0;
}

.wrap{
  position:relative;z-index:1;
  max-width:var(--fw);margin:0 auto;
  padding:0 40px;
}

/* ═══════════════════════════════════
   SCROLL REVEAL
═══════════════════════════════════ */
.reveal{
  opacity:0;
  transform:translateY(30px);
  transition:opacity 0.8s ease, transform 0.8s ease;
}
.reveal.visible{
  opacity:1;transform:translateY(0);
}
.reveal.delay-1{transition-delay:0.1s;}
.reveal.delay-2{transition-delay:0.2s;}
.reveal.delay-3{transition-delay:0.3s;}
.reveal.delay-4{transition-delay:0.4s;}

/* ═══════════════════════════════════
   NAV
═══════════════════════════════════ */
nav{
  position:fixed;top:0;left:0;right:0;
  z-index:1000;
  background:rgba(4,5,7,0.92);
  backdrop-filter:blur(12px);
  border-bottom:1px solid var(--b1);
}

.nav-inner{
  max-width:var(--fw);margin:0 auto;padding:0 40px;
  display:flex;align-items:center;height:60px;gap:0;
}

.nav-logo{
  display:flex;align-items:center;gap:10px;
  text-decoration:none;margin-right:auto;
}

.nav-pi{
  width:34px;height:34px;border-radius:50%;
  border:1.5px solid var(--amber);
  display:flex;align-items:center;justify-content:center;
  font-family:'Bebas Neue',sans-serif;font-size:17px;
  color:var(--amber);
  box-shadow:0 0 12px rgba(224,152,28,0.3);
}

.nav-name{
  font-family:'Bebas Neue',sans-serif;font-size:20px;
  letter-spacing:2px;color:#fff;
}

.nav-links{
  display:flex;align-items:center;gap:32px;
  list-style:none;margin-right:32px;
}

.nav-links a{
  font-size:11px;font-weight:500;
  letter-spacing:1.5px;text-transform:uppercase;
  color:var(--mid);text-decoration:none;
  transition:color 0.2s;
  font-family:'IBM Plex Mono',monospace;
}

.nav-links a:hover{color:var(--white);}

.nav-cta{
  padding:8px 22px;
  background:var(--amber);
  color:var(--ink);
  font-size:11px;font-weight:700;
  letter-spacing:1.5px;text-transform:uppercase;
  border:none;border-radius:2px;
  cursor:pointer;transition:all 0.2s;
  font-family:'IBM Plex Mono',monospace;
  text-decoration:none;
}

.nav-cta:hover{background:var(--amber-h);transform:translateY(-1px);}

.nav-login{
  padding:8px 20px;
  background:transparent;
  border:1px solid var(--b2);
  color:var(--white);
  font-size:11px;font-weight:600;
  letter-spacing:1.5px;text-transform:uppercase;
  border-radius:2px;
  cursor:pointer;transition:all 0.2s;
  font-family:'IBM Plex Mono',monospace;
  text-decoration:none;
  margin-right:14px;
}

.nav-login:hover{border-color:var(--amber);color:var(--amber);}

/* ═══════════════════════════════════
   TICKER TAPE
═══════════════════════════════════ */
.ticker-wrap{
  position:relative;z-index:1;
  background:var(--s1);
  border-bottom:1px solid var(--b1);
  margin-top:60px;
  overflow:hidden;
  height:30px;display:flex;align-items:center;
}

.ticker-track{
  display:flex;gap:0;
  animation:ticker 40s linear infinite;
  white-space:nowrap;
}

@keyframes ticker{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}

.ticker-item{
  display:flex;align-items:center;gap:8px;
  padding:0 28px;
  border-right:1px solid var(--b1);
  font-family:'IBM Plex Mono',monospace;
  font-size:10px;
}

.t-sym{color:var(--white);font-weight:600;letter-spacing:.5px;}
.t-val{color:var(--mid);}
.t-up{color:var(--green);}
.t-dn{color:var(--red);}

/* ═══════════════════════════════════
   HERO
═══════════════════════════════════ */
.hero{
  position:relative;
  min-height:calc(100vh - 90px);
  display:flex;flex-direction:column;
  justify-content:center;
  overflow:hidden;
  padding:80px 0 60px;
}

/* Radial glow */
.hero::before{
  content:'';position:absolute;
  top:-20%;left:50%;transform:translateX(-50%);
  width:900px;height:600px;
  background:radial-gradient(ellipse,rgba(224,152,28,0.06) 0%,rgba(232,112,48,0.03) 40%,transparent 70%);
  pointer-events:none;
}

/* Diagonal accent line */
.hero::after{
  content:'';position:absolute;
  top:0;right:0;
  width:1px;height:100%;
  background:linear-gradient(180deg,transparent,var(--amber),transparent);
  opacity:0.3;
}

.hero-grid{
  display:grid;grid-template-columns:1fr 500px;
  gap:80px;align-items:center;
}

/* Live terminal widget */
.hero-terminal{
  background:var(--s1);
  border:1px solid var(--b2);
  border-radius:4px;overflow:hidden;
  box-shadow:0 40px 80px rgba(0,0,0,0.6),0 0 40px rgba(224,152,28,0.05);
  animation:float 6s ease-in-out infinite;
}

@keyframes float{
  0%,100%{transform:translateY(0);}
  50%{transform:translateY(-10px);}
}

.terminal-bar{
  display:flex;align-items:center;gap:6px;
  padding:10px 14px;
  background:var(--s2);border-bottom:1px solid var(--b1);
}

.tb-dot{width:9px;height:9px;border-radius:50%;}
.tb-dot:nth-child(1){background:var(--red);}
.tb-dot:nth-child(2){background:var(--amber);}
.tb-dot:nth-child(3){background:var(--green);}
.tb-title{font-size:10px;color:var(--dim);font-family:'IBM Plex Mono',monospace;margin-left:auto;}

.terminal-body{padding:16px;font-family:'IBM Plex Mono',monospace;font-size:10.5px;}

.t-line{
  display:flex;gap:8px;margin-bottom:7px;
  line-height:1.4;
}

.t-prompt{color:var(--amber);flex-shrink:0;}
.t-key{color:var(--cyan);}
.t-eq{color:var(--dim);}
.t-str{color:var(--green);}
.t-num{color:var(--amber);}
.t-comment{color:var(--dim);font-style:italic;}
.t-pass{color:var(--green);font-weight:700;}
.t-warn{color:var(--orange);}
.t-err{color:var(--red);}

.t-divider{height:1px;background:var(--b1);margin:10px 0;}

.t-cursor{
  display:inline-block;width:7px;height:13px;
  background:var(--amber);margin-left:2px;
  animation:cursor-blink 1s step-end infinite;
  vertical-align:middle;
}

@keyframes cursor-blink{0%,100%{opacity:1;}50%{opacity:0;}}

/* Stat row at bottom of terminal */
.terminal-stats{
  display:grid;grid-template-columns:repeat(3,1fr);
  gap:1px;background:var(--b1);
  border-top:1px solid var(--b1);
}

.ts{
  background:var(--s2);padding:10px 12px;
  text-align:center;
}

.ts-val{
  font-family:'Bebas Neue',sans-serif;font-size:20px;line-height:1;margin-bottom:3px;
}

.ts-lbl{font-size:8px;color:var(--dim);letter-spacing:1px;text-transform:uppercase;font-family:'IBM Plex Mono',monospace;}

/* Hero left */
.hero-eyebrow{
  display:inline-flex;align-items:center;gap:8px;
  padding:5px 12px;
  background:var(--amber-gg);
  border:1px solid rgba(224,152,28,0.2);
  border-radius:2px;
  font-size:10px;font-weight:700;
  letter-spacing:2px;text-transform:uppercase;
  color:var(--amber);
  font-family:'IBM Plex Mono',monospace;
  margin-bottom:20px;
}

.hero-eyebrow::before{
  content:'';width:6px;height:6px;border-radius:50%;
  background:var(--amber);
  animation:blink 2s ease-in-out infinite;
}

@keyframes blink{0%,100%{opacity:1;}50%{opacity:0.2;}}

.hero-h1{
  font-family:'Bebas Neue',sans-serif;
  font-size:clamp(56px,6vw,96px);
  line-height:.95;
  letter-spacing:1px;
  color:#fff;
  margin-bottom:6px;
}

.hero-h1 .amber-word{
  background:linear-gradient(135deg,var(--amber-h),var(--amber));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}

.hero-sub{
  font-size:clamp(13px,1.4vw,17px);
  color:var(--mid);
  line-height:1.8;
  max-width:540px;
  margin-bottom:36px;
}

.hero-sub strong{color:var(--white);}

.hero-ctas{
  display:flex;align-items:center;gap:14px;
  margin-bottom:40px;
}

.cta-primary{
  padding:14px 32px;
  background:var(--amber);color:var(--ink);
  font-family:'IBM Plex Mono',monospace;
  font-size:11.5px;font-weight:700;
  letter-spacing:1.5px;text-transform:uppercase;
  border:none;border-radius:2px;cursor:pointer;
  transition:all 0.2s;text-decoration:none;
  display:inline-flex;align-items:center;gap:8px;
}

.cta-primary:hover{background:var(--amber-h);transform:translateY(-2px);box-shadow:0 8px 24px rgba(224,152,28,0.3);}

.cta-secondary{
  padding:14px 32px;
  background:transparent;
  border:1px solid var(--b2);
  color:var(--mid);
  font-family:'IBM Plex Mono',monospace;
  font-size:11.5px;font-weight:600;
  letter-spacing:1.5px;text-transform:uppercase;
  border-radius:2px;cursor:pointer;
  transition:all 0.2s;text-decoration:none;
}

.cta-secondary:hover{border-color:var(--b3);color:var(--white);}

/* Social proof pills */
.hero-trust{
  display:flex;align-items:center;gap:16px;
  font-size:10px;color:var(--dim);font-family:'IBM Plex Mono',monospace;
}

.trust-pill{
  display:flex;align-items:center;gap:5px;
  padding:4px 10px;
  background:var(--s2);border:1px solid var(--b1);
  border-radius:2px;font-size:9px;color:var(--mid);
}

/* ═══════════════════════════════════
   SECTION UTILITY
═══════════════════════════════════ */
section{position:relative;z-index:1;}

.sec-label{
  display:inline-flex;align-items:center;gap:6px;
  font-size:10px;font-weight:700;letter-spacing:2.5px;
  text-transform:uppercase;color:var(--amber);
  font-family:'IBM Plex Mono',monospace;
  margin-bottom:14px;
}

.sec-label::before{content:'—';color:var(--amber-d);}

.sec-h2{
  font-family:'Bebas Neue',sans-serif;
  font-size:clamp(40px,4.5vw,72px);
  line-height:1;letter-spacing:1px;
  color:#fff;margin-bottom:16px;
}

.sec-p{
  font-size:15px;color:var(--mid);
  line-height:1.9;max-width:560px;
}

.sec-p strong{color:var(--white);}

/* Divider */
.sec-divider{
  height:1px;
  background:linear-gradient(90deg,transparent,var(--b2),transparent);
  margin:0;
}

/* ═══════════════════════════════════
   PROBLEM SECTION
═══════════════════════════════════ */
.problem{
  padding:100px 0;
  background:var(--s1);
  border-top:1px solid var(--b1);
  border-bottom:1px solid var(--b1);
}

.problem-grid{
  display:grid;grid-template-columns:1fr 1fr;
  gap:80px;align-items:start;
}

.problem-cards{
  display:flex;flex-direction:column;gap:8px;
}

.prob-card{
  display:flex;gap:14px;
  padding:16px;
  background:var(--s2);border:1px solid var(--b1);
  border-radius:3px;border-left:3px solid var(--red);
  transition:all 0.2s;
}

.prob-card:hover{border-left-color:var(--amber);background:var(--s3);}

.prob-icon{font-size:20px;flex-shrink:0;margin-top:2px;}

.prob-title{
  font-family:'IBM Plex Sans',sans-serif;
  font-size:13px;font-weight:700;color:#fff;margin-bottom:4px;
}

.prob-body{font-size:11px;color:var(--mid);line-height:1.6;}

/* ═══════════════════════════════════
   THE SHIFT (CORE PROPOSITION)
═══════════════════════════════════ */
.shift{padding:100px 0;}

.shift-inner{
  display:grid;grid-template-columns:repeat(2,1fr);
  gap:2px;background:var(--b1);
  border:1px solid var(--b1);border-radius:4px;
  overflow:hidden;
  margin-top:60px;
}

.shift-cell{
  background:var(--s1);padding:28px 30px;
  position:relative;overflow:hidden;
  transition:background 0.2s;
}

.shift-cell:hover{background:var(--s2);}

.shift-cell::before{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;
}

.shift-cell.amber::before{background:linear-gradient(90deg,transparent,var(--amber),transparent);}
.shift-cell.cyan::before{background:linear-gradient(90deg,transparent,var(--cyan),transparent);}
.shift-cell.green::before{background:linear-gradient(90deg,transparent,var(--green),transparent);}
.shift-cell.red::before{background:linear-gradient(90deg,transparent,var(--red),transparent);}
.shift-cell.purple::before{background:linear-gradient(90deg,transparent,var(--purple),transparent);}
.shift-cell.orange::before{background:linear-gradient(90deg,transparent,var(--orange),transparent);}

.sc-icon{font-size:28px;margin-bottom:12px;}

.sc-label{
  font-size:9px;font-weight:700;letter-spacing:2px;
  text-transform:uppercase;color:var(--dim);
  font-family:'IBM Plex Mono',monospace;margin-bottom:5px;
}

.sc-title{
  font-family:'Bebas Neue',sans-serif;
  font-size:22px;letter-spacing:1px;color:#fff;
  margin-bottom:8px;
}

.sc-body{font-size:12px;color:var(--mid);line-height:1.7;}
.sc-body strong{color:var(--white);}

.sc-pill{
  display:inline-block;margin-top:10px;
  padding:3px 10px;border-radius:2px;
  font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;
  font-family:'IBM Plex Mono',monospace;
}

/* ═══════════════════════════════════
   FEATURE SHOWCASE (6 PILLARS)
═══════════════════════════════════ */
.features{
  padding:100px 0;
  background:var(--s1);
  border-top:1px solid var(--b1);
  border-bottom:1px solid var(--b1);
}

.features-header{text-align:center;margin-bottom:64px;}
.features-header .sec-p{margin:0 auto;}

.feat-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:1px;background:var(--b1);
  border:1px solid var(--b1);border-radius:4px;
  overflow:hidden;
}

.feat{
  background:var(--s1);padding:32px;
  position:relative;overflow:hidden;
  transition:background 0.25s;
}

.feat:hover{background:var(--s2);}

.feat-num{
  font-family:'Bebas Neue',sans-serif;
  font-size:64px;line-height:1;
  position:absolute;top:16px;right:20px;
  color:var(--muted);letter-spacing:2px;
  transition:color 0.2s;
}

.feat:hover .feat-num{color:var(--b2);}

.feat-icon{
  width:44px;height:44px;border-radius:8px;
  display:flex;align-items:center;justify-content:center;
  font-size:20px;margin-bottom:16px;
}

.feat-tag{
  font-size:9px;font-weight:700;letter-spacing:2px;
  text-transform:uppercase;
  font-family:'IBM Plex Mono',monospace;
  margin-bottom:8px;
}

.feat-title{
  font-family:'IBM Plex Sans',sans-serif;
  font-size:17px;font-weight:700;color:#fff;
  margin-bottom:10px;line-height:1.2;
}

.feat-body{font-size:12px;color:var(--mid);line-height:1.75;}
.feat-body strong{color:var(--white);}

.feat-fn{
  display:inline-flex;align-items:center;gap:4px;
  margin-top:14px;
  font-size:9.5px;color:var(--dim);
  font-family:'IBM Plex Mono',monospace;
  padding:4px 8px;border-radius:2px;
  background:var(--s3);border:1px solid var(--b1);
}

/* ═══════════════════════════════════
   DYNAMIC ALPHA (4 FEATURES)
═══════════════════════════════════ */
.dynamic{padding:100px 0;}

.dynamic-header{
  display:grid;grid-template-columns:1fr 1fr;
  gap:60px;align-items:end;margin-bottom:64px;
}

.dynamic-cards{
  display:grid;grid-template-columns:repeat(2,1fr);
  gap:1px;background:var(--b1);
  border:1px solid var(--b1);border-radius:4px;
  overflow:hidden;
}

.dcard{
  background:var(--s1);padding:32px;
  position:relative;overflow:hidden;
  transition:background 0.25s;
}

.dcard:hover{background:var(--s2);}

.dcard::after{
  content:'';position:absolute;
  bottom:0;left:0;right:0;height:3px;
  opacity:0;transition:opacity 0.2s;
}

.dcard:hover::after{opacity:1;}
.dcard.amber::after{background:var(--amber);}
.dcard.cyan::after{background:var(--cyan);}
.dcard.purple::after{background:var(--purple);}

/* Unleash card */
.dcard.unleash{
  background:linear-gradient(135deg,rgba(224,152,28,0.05),rgba(232,112,48,0.03),rgba(216,56,56,0.03));
  border:1px solid rgba(232,112,48,0.2);
}

.dcard.unleash:hover{
  background:linear-gradient(135deg,rgba(224,152,28,0.09),rgba(232,112,48,0.06),rgba(216,56,56,0.05));
}

.dcard.unleash::after{background:var(--unleash);}

.dcard-em{font-size:32px;margin-bottom:12px;display:block;line-height:1;}

.dcard-tag{
  font-size:9px;font-weight:700;letter-spacing:2px;
  text-transform:uppercase;font-family:'IBM Plex Mono',monospace;
  margin-bottom:6px;
}

.dcard-title{
  font-family:'Bebas Neue',sans-serif;
  font-size:28px;letter-spacing:1px;color:#fff;
  margin-bottom:10px;line-height:1;
}

.dcard-body{font-size:12px;color:var(--mid);line-height:1.8;}
.dcard-body strong{color:var(--white);}

.dcard-compare{
  margin-top:14px;padding:12px;
  background:var(--s3);border:1px solid var(--b1);
  border-radius:3px;
}

.dc-old{
  font-size:10px;color:var(--dim);
  text-decoration:line-through;margin-bottom:5px;
  font-family:'IBM Plex Mono',monospace;
}

.dc-new{
  font-size:10px;color:var(--white);
  font-family:'IBM Plex Mono',monospace;
}

.dc-new::before{content:'→  ';color:var(--amber);}

/* Lever bar */
.lever{
  display:flex;align-items:center;gap:5px;
  margin-top:14px;
}

.l-seg{
  height:6px;border-radius:1px;
  transition:all 0.3s;
}

.l-lbl{font-size:9px;color:var(--dim);font-family:'IBM Plex Mono',monospace;white-space:nowrap;}

/* ═══════════════════════════════════
   UNLEASH SECTION
═══════════════════════════════════ */
.unleash-sec{
  padding:100px 0;
  background:var(--s1);
  border-top:1px solid var(--b1);
  border-bottom:1px solid var(--b1);
  position:relative;overflow:hidden;
}

.unleash-sec::before{
  content:'';position:absolute;
  top:50%;left:50%;transform:translate(-50%,-50%);
  width:800px;height:400px;
  background:radial-gradient(ellipse,rgba(232,112,48,0.04) 0%,transparent 70%);
  pointer-events:none;
}

.unleash-inner{
  display:grid;grid-template-columns:1fr 1fr;
  gap:80px;align-items:center;
}

.unleash-word{
  font-family:'Bebas Neue',sans-serif;
  font-size:clamp(80px,10vw,140px);
  line-height:1;
  letter-spacing:4px;
  background:var(--unleash);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;
  margin-bottom:0;
}

.unleash-steps{
  display:flex;flex-direction:column;gap:0;
  border:1px solid var(--b1);border-radius:4px;
  overflow:hidden;
}

.ustep{
  display:flex;gap:16px;
  padding:18px 20px;
  border-bottom:1px solid var(--b1);
  background:var(--s2);
  transition:background 0.2s;
}

.ustep:last-child{border-bottom:none;}
.ustep:hover{background:var(--s3);}

.ustep-num{
  width:28px;height:28px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-family:'Bebas Neue',sans-serif;font-size:15px;
  flex-shrink:0;border:1.5px solid;
  margin-top:2px;
}

.ustep:nth-child(1) .ustep-num{color:var(--cyan);border-color:rgba(0,176,216,0.4);}
.ustep:nth-child(2) .ustep-num{color:var(--amber);border-color:rgba(224,152,28,0.4);}
.ustep:nth-child(3) .ustep-num{color:var(--orange);border-color:rgba(232,112,48,0.4);}
.ustep:nth-child(4) .ustep-num{color:var(--red);border-color:rgba(216,56,56,0.4);}

.ustep-title{font-size:12px;font-weight:700;color:#fff;margin-bottom:3px;}
.ustep-body{font-size:11px;color:var(--mid);line-height:1.6;}

.unleash-warning{
  margin-top:20px;
  display:flex;align-items:center;gap:10px;
  padding:12px 16px;
  background:rgba(216,56,56,0.06);
  border:1px solid rgba(216,56,56,0.2);
  border-radius:3px;
  font-size:10px;color:var(--red);
  font-family:'IBM Plex Mono',monospace;
  font-weight:600;
}

/* ═══════════════════════════════════
   METRICS STRIP
═══════════════════════════════════ */
.metrics{
  position:relative;z-index:1;
  background:var(--s2);
  border-top:1px solid var(--b1);
  border-bottom:1px solid var(--b1);
}

.metrics-inner{
  display:grid;grid-template-columns:repeat(6,1fr);
  gap:0;
}

.met{
  padding:32px 24px;text-align:center;
  border-right:1px solid var(--b1);
  transition:background 0.2s;
}

.met:last-child{border-right:none;}
.met:hover{background:var(--s3);}

.met-val{
  font-family:'Bebas Neue',sans-serif;
  font-size:42px;line-height:1;margin-bottom:5px;
}

.met-lbl{
  font-size:9px;color:var(--mid);
  letter-spacing:1.5px;text-transform:uppercase;
  font-family:'IBM Plex Mono',monospace;
  line-height:1.4;
}

/* ═══════════════════════════════════
   PRICING
═══════════════════════════════════ */
.pricing{padding:100px 0;}

.pricing-header{text-align:center;margin-bottom:64px;}
.pricing-header .sec-p{margin:0 auto;}

.pricing-grid{
  display:grid;grid-template-columns:repeat(3,1fr);
  gap:1px;background:var(--b1);
  border:1px solid var(--b1);border-radius:4px;
  overflow:hidden;
  max-width:1100px;margin:0 auto;
}

.plan{
  background:var(--s1);
  position:relative;overflow:hidden;
  transition:background 0.2s;
}

.plan:hover{background:var(--s2);}

.plan.featured{
  background:var(--s2);
  border:2px solid var(--purple);
  margin:-1px;z-index:1;
}

.plan-badge{
  position:absolute;top:16px;right:16px;
  font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;
  padding:3px 8px;border-radius:2px;
  background:rgba(136,88,232,0.2);color:var(--purple);
  font-family:'IBM Plex Mono',monospace;
}

.plan-top{
  padding:32px 28px 24px;
  border-bottom:1px solid var(--b1);
}

.plan-tier{
  font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
  font-family:'IBM Plex Mono',monospace;margin-bottom:8px;
}

.plan-name{
  font-family:'Bebas Neue',sans-serif;
  font-size:28px;letter-spacing:1px;color:#fff;margin-bottom:4px;
}

.plan-desc{font-size:11px;color:var(--mid);margin-bottom:20px;line-height:1.5;}

.plan-price{display:flex;align-items:flex-end;gap:4px;}
.pp-amt{font-family:'Bebas Neue',sans-serif;font-size:52px;line-height:1;color:#fff;}
.pp-per{font-size:11px;color:var(--mid);padding-bottom:8px;font-family:'IBM Plex Mono',monospace;}

.plan-body{padding:24px 28px;}

.plan-feats{
  display:flex;flex-direction:column;gap:9px;
  margin-bottom:24px;
}

.pf{
  display:flex;align-items:flex-start;gap:8px;
  font-size:11.5px;color:var(--mid);line-height:1.4;
}

.pf .ck{flex-shrink:0;margin-top:1px;font-size:10px;}

.plan-btn{
  width:100%;padding:13px;
  font-family:'IBM Plex Mono',monospace;
  font-size:11px;font-weight:700;
  letter-spacing:1.5px;text-transform:uppercase;
  border:none;border-radius:2px;cursor:pointer;
  transition:all 0.2s;
}

.plan-btn.t1{
  background:var(--green-g);color:var(--green);
  border:1px solid rgba(0,200,128,0.25);
}
.plan-btn.t1:hover{background:var(--green);color:var(--ink);}

.plan-btn.t2{background:var(--purple);color:#fff;}
.plan-btn.t2:hover{filter:brightness(1.15);transform:translateY(-1px);}

.plan-btn.ti{
  background:transparent;color:var(--amber);
  border:1px solid rgba(224,152,28,0.3);
}
.plan-btn.ti:hover{background:var(--amber);color:var(--ink);}

/* ═══════════════════════════════════
   TRUST ROW
═══════════════════════════════════ */
.trust-sec{
  padding:100px 0;
  background:var(--s1);
  border-top:1px solid var(--b1);
}

.trust-grid{
  display:grid;grid-template-columns:repeat(4,1fr);
  gap:1px;background:var(--b1);
  border:1px solid var(--b1);border-radius:4px;
  overflow:hidden;
  margin-top:60px;
}

.tcard{
  background:var(--s1);padding:28px 24px;
  position:relative;overflow:hidden;
  transition:background 0.2s;
}

.tcard:hover{background:var(--s2);}

.tcard::before{
  content:'';position:absolute;top:0;left:0;bottom:0;width:2px;
}

.tcard.amber::before{background:var(--amber);}
.tcard.cyan::before{background:var(--cyan);}
.tcard.red::before{background:var(--red);}
.tcard.green::before{background:var(--green);}

.tcard-icon{font-size:24px;margin-bottom:14px;}
.tcard-title{font-family:'IBM Plex Sans',sans-serif;font-size:14px;font-weight:700;color:#fff;margin-bottom:8px;}
.tcard-body{font-size:11px;color:var(--mid);line-height:1.7;}
.tcard-body strong{color:var(--white);}

/* ═══════════════════════════════════
   CTA SECTION
═══════════════════════════════════ */
.cta-sec{
  padding:120px 0;
  text-align:center;
  position:relative;overflow:hidden;
}

.cta-sec::before{
  content:'';position:absolute;
  top:50%;left:50%;transform:translate(-50%,-50%);
  width:600px;height:400px;
  background:radial-gradient(ellipse,rgba(224,152,28,0.07) 0%,transparent 70%);
  pointer-events:none;
}

.cta-h2{
  font-family:'Bebas Neue',sans-serif;
  font-size:clamp(50px,5.5vw,84px);
  line-height:1;letter-spacing:2px;
  color:#fff;margin-bottom:16px;
}

.cta-h2 .grad{
  background:var(--unleash);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}

.cta-sub{
  font-size:15px;color:var(--mid);
  max-width:500px;margin:0 auto 40px;line-height:1.7;
}

.cta-btns{
  display:flex;align-items:center;justify-content:center;gap:14px;
  margin-bottom:32px;
}

.cta-fine{font-size:11px;color:var(--dim);font-family:'IBM Plex Mono',monospace;}

/* ═══════════════════════════════════
   FOOTER
═══════════════════════════════════ */
footer{
  position:relative;z-index:1;
  background:var(--s1);
  border-top:1px solid var(--b1);
  padding:48px 0 32px;
}

.footer-inner{
  display:grid;grid-template-columns:1fr 1fr 1fr 1fr;
  gap:40px;margin-bottom:48px;
}

.footer-brand .nav-pi{margin-bottom:12px;}

.footer-name{
  font-family:'Bebas Neue',sans-serif;
  font-size:22px;letter-spacing:2px;color:#fff;margin-bottom:6px;
}

.footer-tagline{font-size:10px;color:var(--dim);line-height:1.6;font-family:'IBM Plex Mono',monospace;}

.footer-col h4{
  font-size:10px;font-weight:700;letter-spacing:2px;
  text-transform:uppercase;color:var(--mid);
  font-family:'IBM Plex Mono',monospace;
  margin-bottom:14px;
}

.footer-col ul{list-style:none;display:flex;flex-direction:column;gap:8px;}

.footer-col ul a{
  font-size:12px;color:var(--dim);text-decoration:none;
  transition:color 0.15s;
}

.footer-col ul a:hover{color:var(--white);}

.footer-bottom{
  padding-top:24px;border-top:1px solid var(--b1);
  display:flex;align-items:center;justify-content:space-between;
  font-size:10px;color:var(--dim);
  font-family:'IBM Plex Mono',monospace;
}

.footer-status{display:flex;align-items:center;gap:6px;}
.footer-dot{width:5px;height:5px;border-radius:50%;background:var(--green);box-shadow:0 0 5px var(--green);}`;

const bodyHtml = `<!-- ═══════════ NAV ═══════════ -->
<nav>
  <div class="nav-inner">
    <a href="#" class="nav-logo">
      <div class="nav-pi">π</div>
      <span class="nav-name">Pi</span>
    </a>
    <ul class="nav-links">
      <li><a href="#features">Features</a></li>
      <li><a href="#dynamic">Alpha Engine</a></li>
      <li><a href="#unleash">Unleash</a></li>
      <li><a href="#pricing">Pricing</a></li>
      <li><a href="#trust">Trust</a></li>
    </ul>
    <a href="/login" class="nav-login">Login</a>
    <a href="#pricing" class="nav-cta">Start Trading</a>
  </div>
</nav>

<!-- ═══════════ TICKER ═══════════ -->
<div class="ticker-wrap">
  <div class="ticker-track">
    <!-- First set -->
    <div class="ticker-item"><span class="t-sym">ES</span><span class="t-val">5,842.25</span><span class="t-up">+0.42%</span></div>
    <div class="ticker-item"><span class="t-sym">NQ</span><span class="t-val">20,614.50</span><span class="t-up">+0.61%</span></div>
    <div class="ticker-item"><span class="t-sym">CL</span><span class="t-val">78.34</span><span class="t-dn">-0.28%</span></div>
    <div class="ticker-item"><span class="t-sym">GC</span><span class="t-val">2,318.80</span><span class="t-up">+0.15%</span></div>
    <div class="ticker-item"><span class="t-sym">BTC</span><span class="t-val">67,420</span><span class="t-up">+1.82%</span></div>
    <div class="ticker-item"><span class="t-sym">ETH</span><span class="t-val">3,482</span><span class="t-up">+2.14%</span></div>
    <div class="ticker-item"><span class="t-sym">SPY</span><span class="t-val">584.10</span><span class="t-up">+0.38%</span></div>
    <div class="ticker-item"><span class="t-sym">QQQ</span><span class="t-val">497.22</span><span class="t-up">+0.59%</span></div>
    <div class="ticker-item"><span class="t-sym">VIX</span><span class="t-val">13.84</span><span class="t-dn">-4.20%</span></div>
    <div class="ticker-item"><span class="t-sym">AAPL</span><span class="t-val">212.44</span><span class="t-up">+0.23%</span></div>
    <div class="ticker-item"><span class="t-sym">TSLA</span><span class="t-val">194.88</span><span class="t-dn">-1.02%</span></div>
    <div class="ticker-item"><span class="t-sym">NVDA</span><span class="t-val">876.30</span><span class="t-up">+3.44%</span></div>
    <div class="ticker-item"><span class="t-sym">DXY</span><span class="t-val">104.22</span><span class="t-dn">-0.11%</span></div>
    <div class="ticker-item"><span class="t-sym">ZN</span><span class="t-val">108.18</span><span class="t-up">+0.07%</span></div>
    <!-- Duplicate for seamless loop -->
    <div class="ticker-item"><span class="t-sym">ES</span><span class="t-val">5,842.25</span><span class="t-up">+0.42%</span></div>
    <div class="ticker-item"><span class="t-sym">NQ</span><span class="t-val">20,614.50</span><span class="t-up">+0.61%</span></div>
    <div class="ticker-item"><span class="t-sym">CL</span><span class="t-val">78.34</span><span class="t-dn">-0.28%</span></div>
    <div class="ticker-item"><span class="t-sym">GC</span><span class="t-val">2,318.80</span><span class="t-up">+0.15%</span></div>
    <div class="ticker-item"><span class="t-sym">BTC</span><span class="t-val">67,420</span><span class="t-up">+1.82%</span></div>
    <div class="ticker-item"><span class="t-sym">ETH</span><span class="t-val">3,482</span><span class="t-up">+2.14%</span></div>
    <div class="ticker-item"><span class="t-sym">SPY</span><span class="t-val">584.10</span><span class="t-up">+0.38%</span></div>
    <div class="ticker-item"><span class="t-sym">QQQ</span><span class="t-val">497.22</span><span class="t-up">+0.59%</span></div>
    <div class="ticker-item"><span class="t-sym">VIX</span><span class="t-val">13.84</span><span class="t-dn">-4.20%</span></div>
    <div class="ticker-item"><span class="t-sym">AAPL</span><span class="t-val">212.44</span><span class="t-up">+0.23%</span></div>
    <div class="ticker-item"><span class="t-sym">TSLA</span><span class="t-val">194.88</span><span class="t-dn">-1.02%</span></div>
    <div class="ticker-item"><span class="t-sym">NVDA</span><span class="t-val">876.30</span><span class="t-up">+3.44%</span></div>
    <div class="ticker-item"><span class="t-sym">DXY</span><span class="t-val">104.22</span><span class="t-dn">-0.11%</span></div>
    <div class="ticker-item"><span class="t-sym">ZN</span><span class="t-val">108.18</span><span class="t-up">+0.07%</span></div>
  </div>
</div>

<!-- ═══════════ HERO ═══════════ -->
<section class="hero">
  <div class="wrap">
    <div class="hero-grid">
      <div>
        <div class="hero-eyebrow reveal">Institutional Grade · Retail Price</div>
        <h1 class="hero-h1 reveal delay-1">
          THE OPERATING<br>SYSTEM FOR<br><span class="amber-word">SERIOUS</span><br>TRADERS
        </h1>
        <p class="hero-sub reveal delay-2">
          Pi is not a charting tool. It is a <strong>Risk & Capital Allocation OS</strong> — the full institutional stack: air-gapped risk, atomic execution, deterministic sizing, and a dynamic alpha engine that grows with your discipline.
        </p>
        <div class="hero-ctas reveal delay-3">
          <a href="#pricing" class="cta-primary">Start at $500/mo →</a>
          <a href="#features" class="cta-secondary">See the Architecture</a>
        </div>
        <div class="hero-trust reveal delay-4">
          <div class="trust-pill">⬛ Air-Gapped Risk Core</div>
          <div class="trust-pill">🔗 OCO on Every Entry</div>
          <div class="trust-pill">⚡ &lt;1ms Risk Gate</div>
        </div>
      </div>

      <!-- Terminal widget -->
      <div class="reveal delay-2">
        <div class="hero-terminal">
          <div class="terminal-bar">
            <div class="tb-dot"></div>
            <div class="tb-dot"></div>
            <div class="tb-dot"></div>
            <span class="tb-title">pi_os · risk_core · session_log</span>
          </div>
          <div class="terminal-body">
            <div class="t-line"><span class="t-prompt">›</span><span class="t-comment">// session init · 09:28:04 EST</span></div>
            <div class="t-line"><span class="t-prompt">›</span><span class="t-key">regime</span><span class="t-eq"> = </span><span class="t-str">"HIGH_MOMENTUM"</span></div>
            <div class="t-line"><span class="t-prompt">›</span><span class="t-key">confidence</span><span class="t-eq"> = </span><span class="t-num">0.97</span></div>
            <div class="t-line"><span class="t-prompt">›</span><span class="t-key">leverage</span><span class="t-eq"> = </span><span class="t-num">8.4x</span><span class="t-comment"> // elastic</span></div>
            <div class="t-line"><span class="t-prompt">›</span><span class="t-key">kelly_mult</span><span class="t-eq"> = </span><span class="t-num">0.72</span><span class="t-comment"> // ratcheted</span></div>
            <div class="t-divider"></div>
            <div class="t-line"><span class="t-prompt">›</span><span class="t-comment">// pre-trade validation</span></div>
            <div class="t-line"><span class="t-prompt">›</span><span class="t-key">stale_feed_check</span><span class="t-eq">  </span><span class="t-pass">PASS  12ms</span></div>
            <div class="t-line"><span class="t-prompt">›</span><span class="t-key">risk_gate_check</span><span class="t-eq">   </span><span class="t-pass">PASS  0.6ms</span></div>
            <div class="t-line"><span class="t-prompt">›</span><span class="t-key">oco_pair_built</span><span class="t-eq">    </span><span class="t-pass">PASS  entry+stop+tp</span></div>
            <div class="t-line"><span class="t-prompt">›</span><span class="t-key">iceberg_detected</span><span class="t-eq">  </span><span class="t-warn">WARN  bid-side L2</span></div>
            <div class="t-divider"></div>
            <div class="t-line"><span class="t-prompt">›</span><span class="t-comment">// routing · passive capture</span></div>
            <div class="t-line"><span class="t-prompt">›</span><span class="t-key">route</span><span class="t-eq"> → </span><span class="t-str">DMA:IBKR · maker_order</span></div>
            <div class="t-line"><span class="t-prompt">›</span><span class="t-key">fill_quality</span><span class="t-eq"> = </span><span class="t-pass">+$0.04 vs VWAP</span></div>
            <div class="t-line"><span class="t-prompt">›</span><span class="t-key">adverse_score</span><span class="t-eq"> = </span><span class="t-pass">18/100 · CLEAN</span></div>
            <div class="t-line"><span class="t-prompt">›</span><span class="t-key">audit_hash</span><span class="t-eq"> = </span><span class="t-comment">0x9f3a...c7b2</span><div class="t-cursor"></div></div>
          </div>
          <div class="terminal-stats">
            <div class="ts">
              <div class="ts-val" style="color:var(--green)">+$842</div>
              <div class="ts-lbl">Session P&L</div>
            </div>
            <div class="ts">
              <div class="ts-val" style="color:var(--amber)">$318</div>
              <div class="ts-lbl">VWAP Saved</div>
            </div>
            <div class="ts">
              <div class="ts-val" style="color:var(--cyan)">97%</div>
              <div class="ts-lbl">Regime Conf.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════ METRICS ═══════════ -->
<div class="metrics">
  <div class="metrics-inner">
    <div class="met reveal">
      <div class="met-val" style="color:var(--red)">&lt;1ms</div>
      <div class="met-lbl">Risk Gate<br>Latency</div>
    </div>
    <div class="met reveal delay-1">
      <div class="met-val" style="color:var(--amber)">½ K</div>
      <div class="met-lbl">Base Kelly<br>Multiplier</div>
    </div>
    <div class="met reveal delay-2">
      <div class="met-val" style="color:var(--cyan)">10×</div>
      <div class="met-lbl">Max Elastic<br>Leverage</div>
    </div>
    <div class="met reveal delay-3">
      <div class="met-val" style="color:var(--green)">OCO</div>
      <div class="met-lbl">Every Entry<br>Insured</div>
    </div>
    <div class="met reveal delay-4">
      <div class="met-val" style="color:var(--purple)">L2</div>
      <div class="met-lbl">Order Book<br>Depth</div>
    </div>
    <div class="met reveal delay-4">
      <div class="met-val" style="color:var(--orange)">⬛ FIX</div>
      <div class="met-lbl">Kill Switch<br>Protocol</div>
    </div>
  </div>
</div>

<!-- ═══════════ PROBLEM ═══════════ -->
<section class="problem">
  <div class="wrap">
    <div class="problem-grid">
      <div>
        <div class="sec-label reveal">The Problem</div>
        <h2 class="sec-h2 reveal delay-1">YOUR BROKER<br>IS NOT<br>YOUR ALLY</h2>
        <p class="sec-p reveal delay-2">
          The retail trading industry was built to profit from your mistakes. <strong>Payment for Order Flow</strong> routes your orders to market makers who front-run your fills. <strong>Stale data feeds</strong> expose you to toxic arbitrage. <strong>No behavioral guardrails</strong> let emotion destroy accounts that discipline built.
          <br><br>
          Pi was built to fix this — systematically, at the infrastructure level.
        </p>
      </div>
      <div class="problem-cards">
        <div class="prob-card reveal delay-1">
          <div class="prob-icon">💸</div>
          <div>
            <div class="prob-title">Payment for Order Flow (PFOF)</div>
            <div class="prob-body">Your broker sells your orders to market makers who fill you at the worst permissible price — legally, every single trade. Active traders lose $500–$2,000/month invisibly.</div>
          </div>
        </div>
        <div class="prob-card reveal delay-2">
          <div class="prob-icon">🐌</div>
          <div>
            <div class="prob-title">Stale Price Data = Toxic Fills</div>
            <div class="prob-body">When your feed lags 500ms in a liquid market, HFTs are already executing at the real price. You fill at a phantom price that no longer exists. This is not bad luck — it's structural.</div>
          </div>
        </div>
        <div class="prob-card reveal delay-3">
          <div class="prob-icon">🎲</div>
          <div>
            <div class="prob-title">Fixed % Risk is Mathematically Broken</div>
            <div class="prob-body">Static 1% risk ignores regime, edge quality, and compounding mathematics. Gamblers ruin is not a personality flaw — it's an arithmetic certainty when sizing ignores the Kelly Criterion.</div>
          </div>
        </div>
        <div class="prob-card reveal delay-4">
          <div class="prob-icon">😤</div>
          <div>
            <div class="prob-title">No Exit for the Serious Trader</div>
            <div class="prob-body">Every retail platform is either recklessly open or suffocatingly restrictive. There is no system that lets experienced traders access maximum alpha with institutional-grade protection still in place.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════ THE SHIFT ═══════════ -->
<section class="shift">
  <div class="wrap">
    <div style="text-align:center;">
      <div class="sec-label reveal" style="justify-content:center;">The Pi Approach</div>
      <h2 class="sec-h2 reveal delay-1">INSTITUTIONAL TOOLS.<br><span style="color:var(--amber)">RETAIL PRICE.</span></h2>
      <p class="sec-p reveal delay-2" style="margin:0 auto;">Pi does not make retail trading feel safer. It makes retail trading <strong>actually be safer</strong> — by solving the infrastructure problems at the level they exist: the protocol, the execution, the mathematics.</p>
    </div>
    <div class="shift-inner">
      <div class="shift-cell amber reveal">
        <div class="sc-icon">🛡️</div>
        <div class="sc-label">Risk</div>
        <div class="sc-title">Systemic Integrity</div>
        <div class="sc-body">Risk runs as an <strong>air-gapped OS process</strong>. Strategy code cannot corrupt it. Formally verified state machine. Not a setting — a system invariant.</div>
        <div class="sc-pill" style="background:var(--amber-g);color:var(--amber);">Air-Gap Sidecar</div>
      </div>
      <div class="shift-cell cyan reveal delay-1">
        <div class="sc-icon">📡</div>
        <div class="sc-label">Data</div>
        <div class="sc-title">Asymmetric Intelligence</div>
        <div class="sc-body"><strong>L2 Deep Book aggregation</strong> surfaces iceberg orders and HFT activity your broker never shows you. We see more of the market than your counterparty wants us to.</div>
        <div class="sc-pill" style="background:var(--cyan-g);color:var(--cyan);">L2 Depth + Iceberg Detect</div>
      </div>
      <div class="shift-cell green reveal delay-2">
        <div class="sc-icon">🪝</div>
        <div class="sc-label">Execution</div>
        <div class="sc-title">Anti-Fragile Fills</div>
        <div class="sc-body">Passive Liquidity Capture <strong>earns the spread</strong> instead of paying it. Adverse Selection Scoring blacklists providers who front-run you. VWAP proves savings in dollars monthly.</div>
        <div class="sc-pill" style="background:var(--green-g);color:var(--green);">Passive Capture + VWAP</div>
      </div>
      <div class="shift-cell amber reveal delay-3">
        <div class="sc-icon">💰</div>
        <div class="sc-label">Capital</div>
        <div class="sc-title">Collateral Velocity</div>
        <div class="sc-body">Cross-asset collateral lets crypto and gold generate <strong>equity buying power without liquidation</strong>. Real-time portfolio margin maximizes every idle dollar's utility.</div>
        <div class="sc-pill" style="background:var(--amber-g);color:var(--amber);">Cross-Asset + Real-time Margin</div>
      </div>
      <div class="shift-cell red reveal delay-1">
        <div class="sc-icon">⬛</div>
        <div class="sc-label">Safety</div>
        <div class="sc-title">Hard-Coded Kill Switch</div>
        <div class="sc-body">FIX Cancel-on-Disconnect at the <strong>matching engine level</strong>. Survives crashes, power failure, internet loss. Zero Pi code required. The exchange honors it unconditionally.</div>
        <div class="sc-pill" style="background:var(--red-g);color:var(--red);">FIX · Exchange Level</div>
      </div>
      <div class="shift-cell purple reveal delay-2">
        <div class="sc-icon">⛓️</div>
        <div class="sc-label">Trust</div>
        <div class="sc-title">Immutable Accountability</div>
        <div class="sc-body">Every trade hashed and anchored. Every loss categorized: <strong>Slippage / Strategy / Regime / Behavioral</strong>. Cryptographically unforgeable post-mortems. No excuses.</div>
        <div class="sc-pill" style="background:var(--purple-g,rgba(136,88,232,0.1));color:var(--purple);">On-Chain Audit Trail</div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════ FEATURES ═══════════ -->
<section class="features" id="features">
  <div class="wrap">
    <div class="features-header">
      <div class="sec-label reveal" style="justify-content:center;">Core Architecture</div>
      <h2 class="sec-h2 reveal delay-1">6 SYSTEMS.<br>ZERO COMPROMISES.</h2>
      <p class="sec-p reveal delay-2">Every component was designed with one question: how would a $10 billion fund build this? Then we made it available at $500/month.</p>
    </div>

    <div class="feat-grid">
      <div class="feat reveal">
        <div class="feat-num">01</div>
        <div class="feat-icon" style="background:rgba(0,200,128,0.1);">🔗</div>
        <div class="feat-tag" style="color:var(--green);">Execution Core</div>
        <div class="feat-title">Atomic OCO Execution</div>
        <div class="feat-body">Every entry is bracketed: entry + stop-loss + take-profit as a single atomic unit. <strong>No entry fires without a guaranteed exit.</strong> If the OCO pair can't be constructed, the order is never sent. Your stop persists server-side even if your internet dies.</div>
        <div class="feat-fn">build_oco_pair() · guarantee_exit()</div>
      </div>

      <div class="feat reveal delay-1">
        <div class="feat-num">02</div>
        <div class="feat-icon" style="background:rgba(216,56,56,0.1);">🚨</div>
        <div class="feat-tag" style="color:var(--red);">Data Gate</div>
        <div class="feat-title">500ms Stale Feed Gate</div>
        <div class="feat-body">If your price feed hasn't moved in 500ms in a liquid market, <strong>execution is automatically paused</strong>. No order goes out on phantom prices. Toxic flow detection flags HFT exploitation of data lags. Configurable by instrument class.</div>
        <div class="feat-fn">detect_stale_feed() · pause_execution()</div>
      </div>

      <div class="feat reveal delay-2">
        <div class="feat-num">03</div>
        <div class="feat-icon" style="background:rgba(224,152,28,0.1);">🎯</div>
        <div class="feat-tag" style="color:var(--amber);">Sizing Engine</div>
        <div class="feat-title">Half-Kelly Deterministic Sizing</div>
        <div class="feat-body">f* = (bp − q) / b, multiplied by 0.5. <strong>Mathematically prevents Gambler's Ruin</strong> while preserving 75% of geometric growth rate. Regime-adjusted. Hard floor of 2% max per trade. The same framework used by Renaissance Technologies — automated.</div>
        <div class="feat-fn">compute_kelly_fraction() · apply_half_kelly()</div>
      </div>

      <div class="feat reveal">
        <div class="feat-num">04</div>
        <div class="feat-icon" style="background:rgba(0,176,216,0.1);">📊</div>
        <div class="feat-tag" style="color:var(--cyan);">Data Intelligence</div>
        <div class="feat-title">L2 Deep Book Aggregation</div>
        <div class="feat-body">Aggregates full bid/ask depth across multiple venues simultaneously. <strong>Iceberg order detection</strong> surfaces hidden institutional positions HFTs are trying to conceal. See what your broker doesn't want you to see.</div>
        <div class="feat-fn">aggregate_l2_book() · detect_iceberg()</div>
      </div>

      <div class="feat reveal delay-1">
        <div class="feat-num">05</div>
        <div class="feat-icon" style="background:rgba(224,152,28,0.1);">📏</div>
        <div class="feat-tag" style="color:var(--amber);">Accountability</div>
        <div class="feat-title">VWAP Execution Benchmark</div>
        <div class="feat-body">Every fill is measured against VWAP at execution time. <strong>prove_subscription_roi()</strong> generates a monthly report: "Pi saved you $X vs. your broker's routing." Active traders typically recover the subscription cost entirely in execution savings alone.</div>
        <div class="feat-fn">compute_vwap() · prove_subscription_roi()</div>
      </div>

      <div class="feat reveal delay-2">
        <div class="feat-num">06</div>
        <div class="feat-icon" style="background:rgba(136,88,232,0.1);">🧠</div>
        <div class="feat-tag" style="color:var(--purple);">Behavioral Guard</div>
        <div class="feat-title">AI Regime + Behavioral Score</div>
        <div class="feat-body">Classifies market regime with probability scores. Detects revenge trading, overtrading patterns, and discipline violations. <strong>Adverse selection scoring</strong> auto-blacklists liquidity providers who consistently front-run your fills.</div>
        <div class="feat-fn">classify_regime() · score_discipline()</div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════ DYNAMIC ALPHA ═══════════ -->
<section class="dynamic" id="dynamic">
  <div class="wrap">
    <div class="dynamic-header">
      <div>
        <div class="sec-label reveal">Dynamic Alpha Engine</div>
        <h2 class="sec-h2 reveal delay-1">PI IS NOT<br>A CAGE.</h2>
      </div>
      <div>
        <p class="sec-p reveal delay-2">
          The institutional spine protects your floor. The Dynamic Alpha Engine raises your ceiling. As your discipline grows, the system grows with you. <strong>Maximum protection. Maximum upside.</strong>
        </p>
      </div>
    </div>

    <div class="dynamic-cards">

      <!-- Ratcheting Risk -->
      <div class="dcard amber reveal">
        <span class="dcard-em">📈</span>
        <div class="dcard-tag" style="color:var(--amber);">Sizing · Layer 3</div>
        <div class="dcard-title">Ratcheting Risk</div>
        <div class="dcard-body">
          Profit funds higher leverage. At <strong>+5% profit buffer</strong>, Kelly steps from 0.5× to 0.65×. At <strong>+12%</strong> → 0.8×. At <strong>+20%</strong> → full Kelly. The base account is never risked — only realized gains above the high-water mark.
        </div>
        <div class="dcard-compare">
          <div class="dc-old">Fixed 1% risk forever. No reward for consistency.</div>
          <div class="dc-new">Discipline earns higher limits. Winners compound into bigger bets.</div>
        </div>
        <div class="lever">
          <span class="l-lbl">½K</span>
          <div class="l-seg" style="background:var(--green);flex:0.8;opacity:0.6;"></div>
          <div class="l-seg" style="background:var(--amber);flex:1.2;opacity:0.75;"></div>
          <div class="l-seg" style="background:var(--orange);flex:1;opacity:0.9;"></div>
          <div class="l-seg" style="background:var(--red);flex:0.6;"></div>
          <span class="l-lbl" style="color:var(--amber);">Full K  at +20%</span>
        </div>
      </div>

      <!-- Order Flow Exits -->
      <div class="dcard cyan reveal delay-1">
        <span class="dcard-em">🦈</span>
        <div class="dcard-tag" style="color:var(--cyan);">Exit Engine · Layer 5</div>
        <div class="dcard-title">Order Flow Exits</div>
        <div class="dcard-body">
          Exit when <strong>predatory HFTs start selling</strong> — not at an arbitrary % target. Pi monitors L2 for distribution signatures: ask-side depth growth, iceberg sell orders, volume imbalance. The exit fires before the reversal is visible on your chart.
        </div>
        <div class="dcard-compare">
          <div class="dc-old">Fixed 2% target. Leave money on the table in strong trends.</div>
          <div class="dc-new">Hold while momentum is real. Exit when institutions exit.</div>
        </div>
      </div>

      <!-- Regime-Elastic Leverage -->
      <div class="dcard purple reveal">
        <span class="dcard-em">⚡</span>
        <div class="dcard-tag" style="color:var(--purple);">Leverage Engine · Layer 3+4</div>
        <div class="dcard-title">Regime-Elastic Leverage</div>
        <div class="dcard-body">
          Leverage is <strong>not a setting</strong> — it emerges from the AI's confidence in the regime. &lt;70% → 1×–2×. 85–95% → 5×–7×. 95–99% → 7×–10×. <strong>10× is only reached at 99% signal certainty.</strong> Your emotion is removed from the biggest decisions.
        </div>
        <div class="dcard-compare">
          <div class="dc-old">Static 2x–5x. Misses the 10% breakout days entirely.</div>
          <div class="dc-new">Maximum leverage when the system is most certain. Minimum when it's not.</div>
        </div>
        <div class="lever">
          <span class="l-lbl" style="color:var(--green)">1×</span>
          <div class="l-seg" style="background:var(--green);flex:0.6;"></div>
          <div class="l-seg" style="background:var(--amber);flex:1.4;"></div>
          <div class="l-seg" style="background:var(--orange);flex:1;"></div>
          <div class="l-seg" style="background:var(--red);flex:0.8;"></div>
          <span class="l-lbl" style="color:var(--red)">10×  at 99%</span>
        </div>
      </div>

      <!-- Unleash Mode -->
      <div class="dcard unleash reveal delay-1">
        <span class="dcard-em">⚡</span>
        <div class="dcard-tag" style="color:var(--orange);">Override Layer · All Tiers</div>
        <div class="dcard-title" style="background:var(--unleash);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Unleash Mode</div>
        <div class="dcard-body">
          A <strong>gated, acknowledged, time-limited override</strong> for traders who have earned the right to fly at maximum velocity. Full Kelly sizing. Order flow exits. Leverage ceiling raised. Behavioral guards muted. <em>Air-gap risk core and kill switch remain active. Always.</em>
        </div>
        <div class="dcard-compare">
          <div class="dc-old">Trader cancels subscription to escape restrictions. Zero protection.</div>
          <div class="dc-new">Expert trader activates Unleash inside Pi. Maximum alpha, kill switch still armed.</div>
        </div>
      </div>

    </div>
  </div>
</section>

<!-- ═══════════ UNLEASH SECTION ═══════════ -->
<section class="unleash-sec" id="unleash">
  <div class="wrap">
    <div class="unleash-inner">
      <div>
        <div class="sec-label reveal">Unleash Mode</div>
        <div class="unleash-word reveal delay-1">UN<br>LEASH</div>
        <p class="sec-p reveal delay-2" style="margin-top:20px;">
          Not a loophole. A professionally designed high-performance mode for traders who have demonstrated discipline. <strong>4 gated steps. 1 acknowledgment. Maximum alpha.</strong>
        </p>
        <div class="unleash-warning reveal delay-3">
          ⬛ Air-Gap Risk Core & Exchange Kill Switch remain active in all modes. Non-negotiable.
        </div>
      </div>

      <div>
        <div class="unleash-steps">
          <div class="ustep reveal">
            <div class="ustep-num">1</div>
            <div>
              <div class="ustep-title">Eligibility Check</div>
              <div class="ustep-body">Requires 10+ live trades, discipline score &gt;65/100, no behavioral violations in last 5 sessions. Unleash is earned — not available on day one.</div>
            </div>
          </div>
          <div class="ustep reveal delay-1">
            <div class="ustep-num">2</div>
            <div>
              <div class="ustep-title">Live Dollar Exposure Display</div>
              <div class="ustep-body">Shows your maximum session loss in real dollars at selected leverage — not percentages. A live P&L simulation updating with market volatility.</div>
            </div>
          </div>
          <div class="ustep reveal delay-2">
            <div class="ustep-num">3</div>
            <div>
              <div class="ustep-title">Session Hard Stop</div>
              <div class="ustep-body">You set a dollar stop before activating. Written to the air-gapped sidecar — cannot be extended mid-session without full deactivation and re-acknowledgment.</div>
            </div>
          </div>
          <div class="ustep reveal delay-3">
            <div class="ustep-num">4</div>
            <div>
              <div class="ustep-title">Typed Acknowledgment</div>
              <div class="ustep-body">You type: "I accept full risk responsibility for this session." Timestamp, leverage ceiling, and session stop are immutably logged to the audit chain. The session is owned.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════ PRICING ═══════════ -->
<section class="pricing" id="pricing">
  <div class="wrap">
    <div class="pricing-header">
      <div class="sec-label reveal" style="justify-content:center;">Pricing</div>
      <h2 class="sec-h2 reveal delay-1">INSTITUTIONAL<br>TOOLS.</h2>
      <p class="sec-p reveal delay-2">No rookie plans. Pi is for serious traders only. Every tier includes the full institutional spine — the air-gapped risk core, OCO execution, and kill switch are not premium add-ons.</p>
    </div>

    <div class="pricing-grid">

      <!-- Tier 1 -->
      <div class="plan reveal">
        <div class="plan-top">
          <div class="plan-tier" style="color:var(--green)">Tier 1</div>
          <div class="plan-name">Retail Professional</div>
          <div class="plan-desc">The full institutional spine. Every protection. Maximum alpha up to 7×.</div>
          <div class="plan-price">
            <span class="pp-amt" style="color:var(--green)">$500</span>
            <span class="pp-per">/month</span>
          </div>
        </div>
        <div class="plan-body">
          <div class="plan-feats">
            <div class="pf"><span class="ck" style="color:var(--green)">✓</span>Air-Gapped Risk Sidecar — Formally Verified</div>
            <div class="pf"><span class="ck" style="color:var(--green)">✓</span>OCO Atomic Execution — Zero Orphan Guarantee</div>
            <div class="pf"><span class="ck" style="color:var(--green)">✓</span>Half-Kelly → Profit Ratchet Sizing</div>
            <div class="pf"><span class="ck" style="color:var(--green)">✓</span>Regime-Elastic Leverage (1×–7×)</div>
            <div class="pf"><span class="ck" style="color:var(--green)">✓</span>500ms Stale Feed Gate + Toxic Flow Detection</div>
            <div class="pf"><span class="ck" style="color:var(--green)">✓</span>VWAP Benchmark — Prove your ROI monthly</div>
            <div class="pf"><span class="ck" style="color:var(--green)">✓</span>Adverse Selection Score + Auto-Blacklist</div>
            <div class="pf"><span class="ck" style="color:var(--green)">✓</span>Immutable Audit Trail + Loss Attribution</div>
            <div class="pf"><span class="ck" style="color:var(--green)">✓</span>Unleash Mode — 7× ceiling, gated activation</div>
            <div class="pf"><span class="ck" style="color:var(--green)">✓</span>Exchange Kill Switch — FIX protocol level</div>
            <div class="pf"><span class="ck" style="color:var(--green)">✓</span>AI Regime Engine + Signal Alerts</div>
            <div class="pf"><span class="ck" style="color:var(--green)">✓</span>Paper Trading + Backtesting Engine</div>
          </div>
          <button class="plan-btn t1">Start Tier 1 →</button>
        </div>
      </div>

      <!-- Tier 2 -->
      <div class="plan featured reveal delay-1">
        <div class="plan-badge">Most Powerful</div>
        <div class="plan-top">
          <div class="plan-tier" style="color:var(--purple)">Tier 2</div>
          <div class="plan-name">Advanced / Prop</div>
          <div class="plan-desc">Full DMA access, 10× elastic leverage, HFT-grade order flow intelligence.</div>
          <div class="plan-price">
            <span class="pp-amt" style="color:var(--purple)">$1,000</span>
            <span class="pp-per">/month</span>
          </div>
        </div>
        <div class="plan-body">
          <div class="plan-feats">
            <div class="pf"><span class="ck" style="color:var(--purple)">✓</span>Everything in Tier 1</div>
            <div class="pf"><span class="ck" style="color:var(--purple)">✓</span>L2 Deep Book + Full Iceberg Detection</div>
            <div class="pf"><span class="ck" style="color:var(--purple)">✓</span>Order Flow Exits — HFT distribution signals</div>
            <div class="pf"><span class="ck" style="color:var(--purple)">✓</span>Regime-Elastic Leverage up to 10× at 99% signal</div>
            <div class="pf"><span class="ck" style="color:var(--purple)">✓</span>Unleash Mode — Full 10× ceiling</div>
            <div class="pf"><span class="ck" style="color:var(--purple)">✓</span>DMA — PFOF bypass via IBKR FIX</div>
            <div class="pf"><span class="ck" style="color:var(--purple)">✓</span>Passive Liquidity Capture — Earn the spread</div>
            <div class="pf"><span class="ck" style="color:var(--purple)">✓</span>Cross-Asset Collateral (crypto + gold → equity)</div>
            <div class="pf"><span class="ck" style="color:var(--purple)">✓</span>Tail-Hedge Automation (puts + VIX calls)</div>
            <div class="pf"><span class="ck" style="color:var(--purple)">✓</span>Real-Time Portfolio Margin Engine</div>
            <div class="pf"><span class="ck" style="color:var(--purple)">✓</span>FIX/Binary Protocol Access</div>
            <div class="pf"><span class="ck" style="color:var(--purple)">✓</span>Multi-Broker Reconciliation</div>
          </div>
          <button class="plan-btn t2">Start Tier 2 →</button>
        </div>
      </div>

      <!-- Institutional -->
      <div class="plan reveal delay-2">
        <div class="plan-top">
          <div class="plan-tier" style="color:var(--amber)">Institutional</div>
          <div class="plan-name">Brokerage / Fund</div>
          <div class="plan-desc">White-label API, AUM-based pricing, full compliance and investor reporting suite.</div>
          <div class="plan-price">
            <span class="pp-amt" style="color:var(--amber)">Custom</span>
            <span class="pp-per">AUM-based</span>
          </div>
        </div>
        <div class="plan-body">
          <div class="plan-feats">
            <div class="pf"><span class="ck" style="color:var(--amber)">✓</span>Everything in Tier 2</div>
            <div class="pf"><span class="ck" style="color:var(--amber)">✓</span>White-Label API Licensing</div>
            <div class="pf"><span class="ck" style="color:var(--amber)">✓</span>AUM Tracking + Investor Allocation Engine</div>
            <div class="pf"><span class="ck" style="color:var(--amber)">✓</span>Investor Statements + 1099 Tax Reporting</div>
            <div class="pf"><span class="ck" style="color:var(--amber)">✓</span>Full KYC/AML Compliance Layer</div>
            <div class="pf"><span class="ck" style="color:var(--amber)">✓</span>Custom Risk Mandates per Fund</div>
            <div class="pf"><span class="ck" style="color:var(--amber)">✓</span>On-Chain Audit + Regulatory Export</div>
            <div class="pf"><span class="ck" style="color:var(--amber)">✓</span>Dedicated Infrastructure + Uptime SLA</div>
            <div class="pf"><span class="ck" style="color:var(--amber)">✓</span>Unleash Mode configurable per mandate</div>
            <div class="pf"><span class="ck" style="color:var(--amber)">✓</span>0.5% AUM/yr + 10% performance fee model</div>
          </div>
          <button class="plan-btn ti">Contact Sales →</button>
        </div>
      </div>

    </div>
  </div>
</section>

<!-- ═══════════ TRUST ═══════════ -->
<section class="trust-sec" id="trust">
  <div class="wrap">
    <div style="text-align:center;">
      <div class="sec-label reveal" style="justify-content:center;">Accountability</div>
      <h2 class="sec-h2 reveal delay-1">TRUST IS NOT<br>A CLAIM.<br><span style="color:var(--amber)">IT'S PROOF.</span></h2>
      <p class="sec-p reveal delay-2" style="margin:0 auto;">Pi does not ask you to trust its marketing. It gives you cryptographic, immutable, independently verifiable evidence of its own performance — every session.</p>
    </div>
    <div class="trust-grid">
      <div class="tcard amber reveal">
        <div class="tcard-icon">🔐</div>
        <div class="tcard-title">Immutable Audit Trail</div>
        <div class="tcard-body">Every risk decision, fill, and loss is hashed and on-chain anchored before any human can review it. Losses are auto-classified: <strong>Slippage / Strategy / Regime / Behavioral</strong>. Cryptographically unforgeable post-mortems.</div>
      </div>
      <div class="tcard cyan reveal delay-1">
        <div class="tcard-icon">📏</div>
        <div class="tcard-title">VWAP Execution Proof</div>
        <div class="tcard-body">Monthly report shows — in dollars — exactly how much Pi saved vs. standard retail routing. <strong>Active traders typically recover the subscription cost</strong> entirely in execution savings. We stand behind this claim with data.</div>
      </div>
      <div class="tcard red reveal delay-2">
        <div class="tcard-icon">🔒</div>
        <div class="tcard-title">Air-Gapped Risk Verification</div>
        <div class="tcard-body">The risk core runs in an isolated OS process with <strong>formal state verification</strong>. All possible risk transitions are mathematically proven correct at compile time. No logic bug can result in an over-limit trade. Not a claim — a proof.</div>
      </div>
      <div class="tcard green reveal delay-3">
        <div class="tcard-icon">⚠️</div>
        <div class="tcard-title">Adverse Selection Monitoring</div>
        <div class="tcard-body">Every fill is scored: if price moves against you within 1 second, Pi detects it. Providers with <strong>3 consecutive adverse scores are permanently blacklisted</strong> from your routing. Your execution quality improves continuously, automatically.</div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════ CTA ═══════════ -->
<section class="cta-sec">
  <div class="wrap">
    <div class="sec-label reveal" style="justify-content:center;">Get Started</div>
    <h2 class="cta-h2 reveal delay-1">TRADE LIKE<br>THE <span class="grad">INSTITUTION</span><br>YOU ALWAYS WERE.</h2>
    <p class="cta-sub reveal delay-2">The infrastructure exists. The mathematics is proven. The only question is whether you're ready to stop giving your edge to your broker.</p>
    <div class="cta-btns reveal delay-3">
      <a href="#" class="cta-primary">Start at $500/month →</a>
      <a href="#" class="cta-secondary">Schedule a Demo</a>
    </div>
    <div class="cta-fine reveal delay-4">No commitment required on demo · Cancel anytime · Paper trading available on day one</div>
  </div>
</section>

<!-- ═══════════ FOOTER ═══════════ -->
<footer>
  <div class="wrap">
    <div class="footer-inner">
      <div class="footer-brand">
        <div class="nav-pi" style="margin-bottom:12px;width:38px;height:38px;">π</div>
        <div class="footer-name">Pi OS</div>
        <div class="footer-tagline">
          Risk & Capital Allocation<br>Operating System<br>for Leveraged Markets
        </div>
      </div>
      <div class="footer-col">
        <h4>Product</h4>
        <ul>
          <li><a href="#">Architecture</a></li>
          <li><a href="#">Dynamic Alpha Engine</a></li>
          <li><a href="#">Unleash Mode</a></li>
          <li><a href="#">Pricing</a></li>
          <li><a href="#">Changelog</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Integrations</h4>
        <ul>
          <li><a href="#">Alpaca</a></li>
          <li><a href="#">IBKR (FIX)</a></li>
          <li><a href="#">Tradovate</a></li>
          <li><a href="#">TD Ameritrade</a></li>
          <li><a href="#">Polygon.io</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Company</h4>
        <ul>
          <li><a href="#">About</a></li>
          <li><a href="#">Documentation</a></li>
          <li><a href="#">API Reference</a></li>
          <li><a href="#">Contact</a></li>
          <li><a href="#">Risk Disclosure</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="footer-status">
        <div class="footer-dot"></div>
        All systems operational · Risk Core Isolated · Audit Chain Active
      </div>
      <div>© 2025 Pi OS · Trading involves substantial risk of loss · Not financial advice</div>
    </div>
  </div>
</footer>`;

export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    root.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

    const sections = root.querySelectorAll("section[id], div[id]");
    const navLinks = root.querySelectorAll(".nav-links a");

    const onScroll = () => {
      let current = "";
      sections.forEach((sec) => {
        if (window.scrollY >= (sec as HTMLElement).offsetTop - 100) current = sec.id;
      });
      navLinks.forEach((a) => {
        (a as HTMLElement).style.color = a.getAttribute("href") === "#" + current ? "var(--white)" : "";
      });
    };
    window.addEventListener("scroll", onScroll);

    const timeouts: number[] = [];
    const lines = root.querySelectorAll(".t-line");
    lines.forEach((line, i) => {
      const el = line as HTMLElement;
      el.style.opacity = "0";
      el.style.transform = "translateX(-8px)";
      el.style.transition = `opacity 0.3s ease ${i * 0.12}s, transform 0.3s ease ${i * 0.12}s`;
      timeouts.push(
        window.setTimeout(() => {
          el.style.opacity = "1";
          el.style.transform = "translateX(0)";
        }, 600 + i * 120),
      );
    });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      timeouts.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <>
      <style>{css}</style>
      <div ref={rootRef} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </>
  );
}
