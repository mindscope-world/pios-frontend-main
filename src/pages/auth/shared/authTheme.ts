// Shared design system for the auth screens (Login, Signup). Self-contained
// CSS-in-JS, same technique as pages/landing/LandingPage.tsx, deliberately
// NOT the dashboard's Tailwind @theme tokens (src/index.css) — the auth
// screens extend the landing page's terminal/marketing visual language,
// which is its own separate design system with its own token values.

export const authCss = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap');

:root {
  --bg-void: #0A0A0C;
  --bg-panel: #101114;
  --border-hair: rgba(255,255,255,0.08);
  --border-hover: rgba(232,163,61,0.35);
  --text-primary: #F2F2F0;
  --text-secondary: #8A8F98;
  --accent: #E8A33D;
  --accent-dim: rgba(232,163,61,0.12);
  --success: #3ED598;
  --warn: #E8A33D;
  --danger: #E5484D;
  --info-blue: #4DA3E5;
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
}

.auth-root{
  min-height:100vh;
  background:var(--bg-void);
  color:var(--text-primary);
  font-family:'IBM Plex Sans',sans-serif;
  position:relative;
  overflow-x:hidden;
}

.auth-root::before{
  content:'';position:fixed;inset:0;
  background-image:
    linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);
  background-size:64px 64px;
  pointer-events:none;z-index:0;
}

.auth-root *{box-sizing:border-box;}

/* ── Header ─────────────────────────────────────────────────── */
.auth-header{
  position:sticky;top:0;z-index:20;
  height:44px;display:flex;align-items:center;
  background:rgba(10,10,12,0.9);
  backdrop-filter:blur(10px);
  border-bottom:1px solid var(--border-hair);
  padding:0 24px;
  gap:20px;
}

.auth-home{
  display:flex;align-items:center;gap:9px;
  text-decoration:none;color:inherit;
  background:none;border:none;cursor:pointer;
  padding:0;flex-shrink:0;
}

.auth-home-mark{
  width:24px;height:24px;border-radius:50%;
  border:1.5px solid var(--accent);
  display:flex;align-items:center;justify-content:center;
  font-family:'Bebas Neue',sans-serif;font-size:13px;
  color:var(--accent);
  transition:transform 200ms var(--ease), box-shadow 200ms var(--ease);
}

.auth-home:hover .auth-home-mark{
  transform:rotate(8deg);
  box-shadow:0 0 10px rgba(232,163,61,0.4);
}

.auth-home-word{
  font-family:'Bebas Neue',sans-serif;font-size:15px;
  letter-spacing:1.5px;color:var(--text-primary);
}

/* ── Ticker (auth variant: slower, dimmer) ─────────────────────*/
.auth-ticker{
  flex:1;overflow:hidden;
  mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);
}

.auth-ticker-track{
  display:flex;white-space:nowrap;
  animation:auth-ticker 70s linear infinite;
}

@keyframes auth-ticker{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}

.auth-ticker-item{
  display:flex;align-items:center;gap:6px;
  padding:0 18px;border-right:1px solid var(--border-hair);
  font-family:'IBM Plex Mono',monospace;font-size:9.5px;
  color:var(--text-secondary);opacity:0.7;
}
.auth-ticker-item b{color:var(--text-primary);font-weight:600;letter-spacing:.4px;}
.auth-ticker-up{color:var(--success);}
.auth-ticker-dn{color:var(--danger);}

/* ── Shell / split layout ───────────────────────────────────── */
.auth-shell{
  position:relative;z-index:1;
  min-height:calc(100vh - 44px);
  display:grid;grid-template-columns:45% 55%;
}

@media (max-width:1023px){
  .auth-shell{grid-template-columns:1fr;}
  .auth-panel-col{display:none;}
  .auth-mobile-strip{
    display:flex;align-items:center;gap:8px;
    padding:10px 24px;
    background:var(--bg-panel);
    border-bottom:1px solid var(--border-hair);
    font-family:'IBM Plex Mono',monospace;font-size:10px;
    color:var(--text-secondary);
  }
}
@media (min-width:1024px){
  .auth-mobile-strip{display:none;}
}

.auth-form-col{
  display:flex;align-items:center;
  padding:48px 24px;
}
@media (min-width:1024px){
  .auth-form-col{padding-left:96px;padding-right:40px;}
}

.auth-panel-col{
  background:var(--bg-panel);
  border-left:1px solid var(--border-hair);
  display:flex;align-items:center;justify-content:center;
  padding:48px;
  position:relative;overflow:hidden;
}
.auth-panel-col::before{
  content:'';position:absolute;
  top:-10%;left:50%;transform:translateX(-50%);
  width:700px;height:500px;
  background:radial-gradient(ellipse,var(--accent-dim) 0%,transparent 70%);
  opacity:0.5;pointer-events:none;
}

/* ── Status pill (mobile) ───────────────────────────────────── */
.auth-status-pill{
  display:inline-flex;align-items:center;gap:6px;
  padding:3px 9px;border-radius:2px;
  background:rgba(62,213,152,0.08);
  border:1px solid rgba(62,213,152,0.25);
  color:var(--success);
}
.auth-status-pill::before{
  content:'';width:5px;height:5px;border-radius:50%;
  background:var(--success);animation:auth-blink 2s ease-in-out infinite;
}

@keyframes auth-blink{0%,100%{opacity:1;}50%{opacity:0.25;}}

/* ── Form card ──────────────────────────────────────────────── */
.auth-card{width:100%;max-width:400px;}

.auth-eyebrow{
  display:inline-flex;align-items:center;gap:7px;
  padding:4px 10px;margin-bottom:22px;
  background:var(--accent-dim);
  border:1px solid rgba(232,163,61,0.22);
  border-radius:2px;
  font-family:'IBM Plex Mono',monospace;
  font-size:9.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
  color:var(--accent);
}
.auth-eyebrow::before{
  content:'';width:5px;height:5px;border-radius:50%;
  background:var(--accent);animation:auth-blink 2s ease-in-out infinite;
}

.auth-h1{
  font-family:'Bebas Neue',sans-serif;
  font-size:clamp(36px,4.4vw,52px);
  line-height:0.98;letter-spacing:0.5px;
  color:#fff;margin:0 0 12px;
}
.auth-h1 .accent{
  background:linear-gradient(135deg,#f0b750,var(--accent));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}

.auth-sub{
  font-size:14px;color:var(--text-secondary);
  line-height:1.65;margin:0 0 30px;max-width:360px;
}

/* ── Fields (real <label>, floats on focus/filled via CSS sibling
   selectors — label sits after input in the DOM) ─────────────── */
.auth-field{position:relative;margin-bottom:24px;}

.auth-field-input-wrap{position:relative;}

.auth-field input{
  width:100%;background:transparent;border:none;
  border-bottom:1px solid var(--border-hair);
  color:var(--text-primary);font-size:15px;
  padding:19px 26px 8px 2px;outline:none;
  font-family:'IBM Plex Sans',sans-serif;
  transition:color 150ms var(--ease);
}
.auth-field input::placeholder{color:transparent;}
.auth-field input:focus{color:#fff;}

.auth-field-label{
  position:absolute;left:2px;top:19px;
  font-size:15px;color:var(--text-secondary);
  pointer-events:none;transform-origin:left top;
  transition:transform 150ms var(--ease), top 150ms var(--ease), color 150ms var(--ease);
  font-family:'IBM Plex Sans',sans-serif;
}
.auth-field input:focus + .auth-field-label,
.auth-field input:not(:placeholder-shown) + .auth-field-label{
  top:0;transform:scale(0.72);color:var(--accent);
}

.auth-field-underline{
  position:absolute;left:0;right:0;bottom:0;height:1px;
  background:var(--accent);
  transform:scaleX(0);transform-origin:left;
  transition:transform 200ms var(--ease);
}
.auth-field input:focus ~ .auth-field-underline{transform:scaleX(1);}

.auth-field.has-error input{border-bottom-color:var(--danger);color:#fff;}
.auth-field.has-error .auth-field-underline{background:var(--danger);transform:scaleX(1);}
.auth-field.has-error .auth-field-label{color:var(--danger);}

.auth-field-error{
  overflow:hidden;height:0;
  transition:height 150ms var(--ease);
  font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--danger);
}
.auth-field-error.show{height:18px;margin-top:5px;}
.auth-field-error::before{content:'> ';color:var(--danger);opacity:0.7;}

.auth-eye-btn{
  position:absolute;right:2px;top:6px;
  background:none;border:none;cursor:pointer;
  color:var(--text-secondary);opacity:0.4;
  transition:opacity 150ms var(--ease);
  padding:4px;display:flex;
}
.auth-eye-btn:hover{opacity:1;}

.auth-capslock{
  overflow:hidden;height:0;
  transition:height 150ms var(--ease);
  font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:var(--accent);
}
.auth-capslock.show{height:16px;margin-top:5px;}

/* ── Row: checkbox + link ───────────────────────────────────── */
.auth-row{
  display:flex;align-items:center;justify-content:space-between;
  margin-bottom:26px;font-size:12.5px;
}

.auth-checkbox{display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;color:var(--text-secondary);}

.auth-checkbox-box{
  width:15px;height:15px;flex-shrink:0;
  border:1.5px solid var(--border-hair);border-radius:2px;
  display:flex;align-items:center;justify-content:center;
  transition:border-color 150ms var(--ease), background 150ms var(--ease);
}
.auth-checkbox input{position:absolute;opacity:0;width:0;height:0;}
.auth-checkbox input:checked ~ .auth-checkbox-box{
  border-color:var(--accent);background:var(--accent-dim);
}
.auth-checkbox-check{
  width:9px;height:9px;color:var(--accent);
  opacity:0;transform:scale(0.4);
  transition:opacity 150ms var(--ease), transform 150ms var(--ease);
}
.auth-checkbox input:checked ~ .auth-checkbox-box .auth-checkbox-check{
  opacity:1;transform:scale(1);
}

.auth-link{
  color:var(--accent);text-decoration:none;
  background-image:linear-gradient(var(--accent),var(--accent));
  background-repeat:no-repeat;background-position:0 100%;background-size:0% 1px;
  transition:background-size 200ms var(--ease);
  padding-bottom:1px;
}
.auth-link:hover{background-size:100% 1px;}
.auth-link.muted{color:var(--text-secondary);}

/* ── Primary button ─────────────────────────────────────────── */
.auth-btn{
  width:100%;padding:14px;
  background:var(--accent);color:#0A0A0C;
  border:none;border-radius:2px;cursor:pointer;
  font-family:'IBM Plex Mono',monospace;
  font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
  display:flex;align-items:center;justify-content:center;gap:8px;
  transition:background 150ms var(--ease), transform 150ms var(--ease), box-shadow 150ms var(--ease);
  position:relative;overflow:hidden;
}
.auth-btn:hover:not(:disabled){background:#f0b750;transform:translateY(-1px);box-shadow:0 6px 18px rgba(232,163,61,0.25);}
.auth-btn:disabled{cursor:not-allowed;opacity:0.55;}
.auth-btn:active:not(:disabled){transform:translateY(0);}

.auth-btn-arrow{display:inline-block;transition:transform 150ms var(--ease);}
.auth-btn:hover:not(:disabled) .auth-btn-arrow{transform:translateX(3px);}

.auth-btn.success{background:transparent;border:1.5px solid var(--success);color:var(--success);}

.auth-btn-loading{
  font-family:'IBM Plex Mono',monospace;font-size:11px;
  white-space:nowrap;overflow:hidden;
}

/* ── Divider ────────────────────────────────────────────────── */
.auth-divider{
  display:flex;align-items:center;gap:14px;
  margin:22px 0;
  font-family:'IBM Plex Mono',monospace;font-size:10px;
  color:var(--text-secondary);letter-spacing:1px;
}
.auth-divider::before,.auth-divider::after{
  content:'';flex:1;height:1px;background:var(--border-hair);
}

.auth-ghost-btn{
  width:100%;padding:11px;margin-bottom:8px;
  background:transparent;border:1px solid var(--border-hair);
  color:var(--text-secondary);border-radius:2px;cursor:pointer;
  font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;letter-spacing:.5px;
  transition:border-color 150ms var(--ease), color 150ms var(--ease);
}
.auth-ghost-btn:hover{border-color:var(--border-hover);color:var(--text-primary);}

/* ── Footer line ────────────────────────────────────────────── */
.auth-footer-line{
  margin-top:28px;text-align:center;
  font-size:13px;color:var(--text-secondary);
}

/* ── Terminal window ────────────────────────────────────────── */
.auth-terminal{
  width:100%;max-width:440px;
  background:#0d0e11;
  border:1px solid var(--border-hair);
  border-radius:5px;overflow:hidden;
  box-shadow:0 30px 70px rgba(0,0,0,0.5);
  position:relative;z-index:1;
}

.auth-terminal-bar{
  display:flex;align-items:center;gap:6px;
  padding:9px 13px;
  background:#131418;border-bottom:1px solid var(--border-hair);
}
.auth-tb-dot{width:8px;height:8px;border-radius:50%;}
.auth-tb-dot:nth-child(1){background:var(--danger);}
.auth-tb-dot:nth-child(2){background:var(--accent);}
.auth-tb-dot:nth-child(3){background:var(--success);}
.auth-tb-title{
  margin-left:auto;font-size:9.5px;color:#4a4d54;
  font-family:'IBM Plex Mono',monospace;
}

.auth-terminal-body{padding:16px;font-family:'IBM Plex Mono',monospace;font-size:11px;min-height:210px;}

.auth-t-line{
  display:flex;gap:8px;margin-bottom:8px;line-height:1.5;
  opacity:0;animation:auth-line-in 400ms var(--ease) both;
}
@keyframes auth-line-in{
  from{opacity:0;transform:translateX(-6px);}
  to{opacity:1;transform:translateX(0);}
}
.auth-t-prompt{color:var(--accent);flex-shrink:0;}
.auth-t-comment{color:#4a4d54;font-style:italic;}
.auth-t-key{color:var(--info-blue);}
.auth-t-val{color:#c9cdd4;}
.auth-t-pass{color:var(--success);font-weight:600;transition:color 250ms var(--ease);}
.auth-t-pending{color:#5a5d64;font-weight:600;transition:color 250ms var(--ease);}
.auth-t-progress{color:var(--accent);font-weight:600;transition:color 250ms var(--ease);}

.auth-t-divider{flex:1;height:1px;background:var(--border-hair);margin:2px 0 8px;}

.auth-cursor{
  display:inline-block;width:6px;height:12px;
  background:var(--accent);margin-left:2px;
  animation:auth-cursor-blink 1s steps(1) infinite;
  vertical-align:middle;
}
@keyframes auth-cursor-blink{0%,49%{opacity:1;}50%,100%{opacity:0;}}

.auth-terminal-stats{
  display:grid;grid-template-columns:repeat(3,1fr);
  gap:1px;background:var(--border-hair);
  border-top:1px solid var(--border-hair);
}
.auth-ts{background:#131418;padding:11px 10px;text-align:center;}
.auth-ts-val{font-family:'Bebas Neue',sans-serif;font-size:19px;line-height:1;margin-bottom:3px;}
.auth-ts-lbl{font-size:7.5px;color:#4a4d54;letter-spacing:.8px;text-transform:uppercase;font-family:'IBM Plex Mono',monospace;}

.auth-reboot{animation:auth-reboot-flicker 220ms steps(2);}
@keyframes auth-reboot-flicker{
  0%{filter:brightness(1);}
  30%{filter:brightness(2.4);}
  60%{filter:brightness(0.6);}
  100%{filter:brightness(1);}
}

/* ── Confirmation panel (forgot password success) ──────────────*/
.auth-confirm{text-align:center;padding:20px 0;}
.auth-confirm-icon{
  width:52px;height:52px;border-radius:50%;
  border:1.5px solid var(--success);
  display:flex;align-items:center;justify-content:center;
  margin:0 auto 18px;color:var(--success);
  animation:auth-check-in 350ms var(--ease) both;
}
@keyframes auth-check-in{
  from{opacity:0;transform:scale(0.6);}
  to{opacity:1;transform:scale(1);}
}
.auth-confirm-title{font-family:'Bebas Neue',sans-serif;font-size:24px;color:#fff;margin-bottom:8px;}
.auth-confirm-sub{font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:16px;}
.auth-confirm-countdown{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#4a4d54;}

/* ── Card swap transition (forgot password / stepper) ──────────*/
.auth-card-content{animation:auth-card-in 260ms var(--ease) both;}
@keyframes auth-card-in{
  from{opacity:0;transform:translateY(8px);}
  to{opacity:1;transform:translateY(0);}
}

.auth-back-link{
  display:inline-flex;align-items:center;gap:5px;
  margin-bottom:18px;background:none;border:none;cursor:pointer;padding:0;
  font-family:'IBM Plex Mono',monospace;font-size:11px;
  color:var(--text-secondary);transition:color 150ms var(--ease);
}
.auth-back-link:hover{color:var(--text-primary);}
.auth-back-link .arrow{transition:transform 150ms var(--ease);}
.auth-back-link:hover .arrow{transform:translateX(-3px);}

/* ── Stepper (signup) ───────────────────────────────────────── */
.auth-stepper{margin-bottom:28px;}
.auth-stepper-track{
  display:flex;gap:4px;height:2px;
  background:var(--border-hair);border-radius:1px;overflow:hidden;margin-bottom:10px;
}
.auth-stepper-seg{
  flex:1;background:var(--border-hair);position:relative;overflow:hidden;
}
.auth-stepper-seg::after{
  content:'';position:absolute;inset:0;background:var(--accent);
  transform:scaleX(0);transform-origin:left;
  transition:transform 300ms var(--ease);
}
.auth-stepper-seg.done::after,.auth-stepper-seg.active::after{transform:scaleX(1);}

.auth-stepper-labels{
  display:flex;justify-content:space-between;
  font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:1px;
  color:#4a4d54;
}
.auth-stepper-labels span.active{color:var(--accent);}
.auth-stepper-labels span.done{color:var(--text-secondary);}

.auth-step-pane{animation:auth-step-in 260ms var(--ease) both;}
@keyframes auth-step-in{
  from{opacity:0;transform:translateX(16px);}
  to{opacity:1;transform:translateX(0);}
}
.auth-step-pane.back{animation-name:auth-step-in-back;}
@keyframes auth-step-in-back{
  from{opacity:0;transform:translateX(-16px);}
  to{opacity:1;transform:translateX(0);}
}

.auth-step-actions{display:flex;gap:10px;margin-top:6px;}
.auth-step-actions .auth-btn{flex:1;}
.auth-step-back-btn{
  flex:0 0 auto;padding:14px 18px;
  background:transparent;border:1px solid var(--border-hair);
  color:var(--text-secondary);border-radius:2px;cursor:pointer;
  font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;
  transition:border-color 150ms var(--ease), color 150ms var(--ease);
}
.auth-step-back-btn:hover{border-color:var(--border-hover);color:var(--text-primary);}

/* ── Password strength ──────────────────────────────────────── */
.auth-strength{margin-top:10px;}
.auth-strength-track{height:4px;background:var(--border-hair);border-radius:2px;overflow:hidden;margin-bottom:6px;}
.auth-strength-fill{
  height:100%;border-radius:2px;
  transition:width 250ms var(--ease), background 250ms var(--ease);
}
.auth-strength-label{
  font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:1px;text-transform:uppercase;
  transition:color 250ms var(--ease);
}

/* ── Risk profile radio cards ───────────────────────────────── */
.auth-risk-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:22px;}
.auth-risk-card{
  padding:12px 8px;text-align:center;cursor:pointer;
  border:1px solid var(--border-hair);border-radius:3px;
  background:transparent;
  transition:border-color 150ms var(--ease), background 150ms var(--ease);
}
.auth-risk-card input{position:absolute;opacity:0;width:0;height:0;}
.auth-risk-card.selected{border-color:var(--border-hover);background:var(--accent-dim);}
.auth-risk-label{font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.5px;color:var(--text-primary);margin-bottom:3px;}
.auth-risk-sub{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--text-secondary);}

/* ── Toggle switch (2FA opt-in) ─────────────────────────────── */
.auth-toggle-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;}
.auth-toggle-label{font-size:12.5px;color:var(--text-secondary);}
.auth-toggle{
  width:36px;height:20px;border-radius:10px;
  background:var(--border-hair);border:none;cursor:pointer;position:relative;
  transition:background 150ms var(--ease);flex-shrink:0;
}
.auth-toggle.on{background:var(--accent);}
.auth-toggle-thumb{
  position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;
  background:#fff;transition:transform 180ms var(--ease);
}
.auth-toggle.on .auth-toggle-thumb{transform:translateX(16px);}

/* ── Focus ring (keyboard nav) ───────────────────────────────── */
.auth-root a:focus-visible,
.auth-root button:focus-visible,
.auth-root input:focus-visible,
.auth-root [tabindex]:focus-visible{
  outline:2px solid var(--accent);outline-offset:2px;
}

/* ── Reduced motion ─────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce){
  .auth-ticker-track,.auth-eyebrow::before,.auth-status-pill::before,
  .auth-cursor,.auth-btn-arrow,.auth-home-mark,.auth-t-line,
  .auth-card-content,.auth-step-pane,.auth-confirm-icon,.auth-reboot{
    animation:none !important;transition-duration:0.01ms !important;
  }
  .auth-t-line{opacity:1;transform:none;}
}
`;
