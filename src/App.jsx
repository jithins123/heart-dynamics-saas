import { useEffect, useRef } from "react";

/*
 * Heart Dynamics — Coherence System
 * The Mind Academy
 *
 * Faithful React port of the working vanilla build. The interactive engine
 * (Web Bluetooth, Web Audio stress synthesis, the HRV coherence FFT, the
 * requestAnimationFrame loop, and all canvas + DOM animation) runs
 * imperatively inside the effect below — the appropriate pattern for a
 * hardware + animation app. Markup and styles are injected once; the effect
 * wires up every listener and tears them down on unmount.
 *
 * Notes for the developer:
 * - Requires Chrome/Edge over HTTPS for the live KYTO sensor (Web Bluetooth).
 *   When embedded in an <iframe>, the iframe tag must include allow="bluetooth".
 * - Demo mode works anywhere (synthesised signal); the Stress game audio uses
 *   the Web Audio API and needs the user gesture that the Start button provides.
 * - Performance Lock reps are logged to localStorage (key "hd_pl_history");
 *   swap that for your backend/GHL when you want real cross-session history.
 * - The CSS sets html/body styles (full-page dark, centred). If you mount this
 *   inside a larger app rather than its own page/iframe, scope those rules.
 * - Free to refactor into idiomatic hooks/JSX; this preserves tested behaviour.
 */

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500&display=swap');\n";

const CSS = `:root{
    --bg:#08080a; --strip:#0b0b0e; --panel:#0e0e12; --panel2:#101015;
    --green:#c5ff3c; --green-soft:rgba(197,255,60,.55); --green-faint:rgba(197,255,60,.14);
    --amber:#ff6b4a; --amber-soft:rgba(255,107,74,.5);
    --ink:#eef0ea; --ink2:#cfd0c8; --dim:#6c6d66; --faint:#34352f;
    --line:rgba(255,255,255,.07); --line2:rgba(255,255,255,.04); --warn:#d98b4a;
    --font:'Jost',system-ui,sans-serif;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{background:var(--bg);color:var(--ink);font-family:var(--font);-webkit-font-smoothing:antialiased;font-feature-settings:"tnum"}
  body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .lbl{font-size:11px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--dim)}
  .num{font-variant-numeric:tabular-nums}

  .monitor{width:100%;max-width:1320px;background:var(--strip);border:1px solid var(--line);border-radius:20px;padding:24px 30px 28px}

  .hd{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
  .hd-l{display:flex;align-items:center;gap:15px}
  .mark{position:relative;width:30px;height:30px;flex:none;border:1.4px solid var(--green);border-radius:50%;display:flex;align-items:center;justify-content:center}
  .mark::after{content:'';width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green)}
  .wm{font-size:25px;font-weight:500;letter-spacing:.01em}
  .wm em{font-style:italic;font-weight:400;color:var(--green)}
  .badge{font-size:11px;font-weight:500;letter-spacing:.2em;color:var(--green);border:1px solid var(--green-soft);border-radius:6px;padding:6px 11px;transition:.3s}
  .hd-r{display:flex;align-items:center;gap:9px}
  .hd-r .d{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green)}
  .hd-r span{font-size:12px;font-weight:400;letter-spacing:.16em;color:var(--ink2);text-transform:uppercase}
  .rule{height:1px;background:var(--line);margin:18px 0 24px}

  .stage{display:grid;grid-template-columns:240px 1fr 240px;gap:22px;align-items:stretch}
  @media(max-width:900px){.stage{grid-template-columns:1fr}}
  .pnl{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:22px;display:flex;flex-direction:column}
  .divider{height:1px;background:var(--line);margin:18px 0}

  /* left */
  .hr-top{display:flex;align-items:center;justify-content:space-between}
  .pulse{width:9px;height:9px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);transform:scale(.5);opacity:.4}
  .hr-num{font-weight:300;font-size:68px;line-height:.95;color:var(--ink);margin-top:14px;letter-spacing:-.01em}
  .hr-num span{font-size:18px;font-weight:400;color:var(--dim);margin-left:6px}
  .hr-rr{font-size:13px;font-weight:400;color:var(--ink2);margin-top:8px;letter-spacing:.04em}
  .hr-spark{margin-top:16px;position:relative;height:60px}
  .hr-spark canvas{position:absolute;inset:0;width:100%;height:100%}
  .dial-wrap{display:flex;flex-direction:column;align-items:center;margin-top:auto}
  .dial{position:relative;width:140px;height:140px}
  .dial .center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .dial .val{font-weight:300;font-size:32px;color:var(--ink);line-height:1;transition:color .4s}
  .dial .vlbl{font-size:9px;font-weight:500;letter-spacing:.16em;color:var(--dim);margin-top:3px;text-transform:uppercase}
  .dial-cap{font-size:10px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin-top:10px;text-align:center}

  /* center pacer + stress arena */
  .pacer-pnl{align-items:center;justify-content:center;text-align:center;position:relative;overflow:hidden;
    background:radial-gradient(120% 90% at 50% 35%,rgba(197,255,60,.04),transparent 60%),var(--panel);transition:border-color .3s,box-shadow .3s}
  .pacer-pnl.stressing{border-color:var(--amber-soft)}
  .strobe{position:absolute;inset:0;z-index:1;pointer-events:none;border-radius:inherit;opacity:0;
    background:radial-gradient(circle at 50% 50%,rgba(255,60,40,.0),rgba(255,40,30,.45));transition:opacity .12s}
  .stress-layer{position:absolute;inset:0;z-index:4;pointer-events:none;overflow:hidden;border-radius:inherit}
  .stress-icon{position:absolute;will-change:transform,opacity}
  .stress-icon svg{display:block;filter:drop-shadow(0 0 6px currentColor)}
  .rings{position:relative;z-index:6;width:360px;height:360px;max-width:74vw;max-height:74vw;display:flex;align-items:center;justify-content:center;margin:6px 0 18px}
  .ring{position:absolute;border:1px solid rgba(197,255,60,.13);border-radius:50%}
  .ring.a{inset:0} .ring.b{inset:32px;border-color:rgba(197,255,60,.09)} .ring.c{inset:66px;border-color:rgba(197,255,60,.06)}
  .breath{position:absolute;inset:92px;border-radius:50%;border:1.6px solid var(--green);
    background:radial-gradient(circle at 50% 42%,rgba(197,255,60,.10),rgba(197,255,60,.02) 70%);
    box-shadow:0 0 50px rgba(197,255,60,.16),inset 0 0 30px rgba(197,255,60,.05);will-change:transform}
  .cue-box{position:relative;z-index:6;display:flex;flex-direction:column;align-items:center;gap:5px}
  .cue{font-weight:300;font-size:24px;letter-spacing:.14em;color:var(--ink);transition:color .4s;line-height:1;text-transform:lowercase}
  .cue-secs{font-size:12px;font-weight:400;letter-spacing:.18em;color:var(--dim)}
  .pace-meta{position:relative;z-index:6;display:flex;gap:30px}
  .pace-meta div{text-align:center}
  .pace-meta .v{font-size:13px;font-weight:400;color:var(--ink2);margin-top:5px}

  /* right coherence */
  .coh-pnl{align-items:center}
  .coh-pnl .lbl{align-self:flex-start}
  .coh-lamp{font-size:10px;font-weight:500;letter-spacing:.18em;color:var(--faint);margin:12px 0 12px;transition:.4s}
  .coh-lamp.on{color:var(--green);text-shadow:0 0 12px rgba(197,255,60,.6)}
  .bar-wrap{flex:1;display:flex;gap:12px;align-items:stretch;width:100%;justify-content:center;min-height:230px}
  .scale{display:flex;flex-direction:column;justify-content:space-between;font-size:10px;color:var(--faint);padding:2px 0}
  .bar{position:relative;width:46px;background:var(--panel2);border:1px solid var(--line);border-radius:24px;overflow:hidden}
  .bar .fill{position:absolute;left:0;right:0;bottom:0;height:0%;background:linear-gradient(180deg,rgba(197,255,60,.4),rgba(197,255,60,.12));transition:height .5s,background .5s,box-shadow .5s}
  .bar.coh .fill{background:linear-gradient(180deg,var(--green),rgba(197,255,60,.45));box-shadow:0 0 30px rgba(197,255,60,.5)}
  .bar .thresh{position:absolute;left:0;right:0;bottom:60%;height:1px;background:var(--green-soft);opacity:.5}
  .bar .thresh::after{content:'';position:absolute;right:-2px;top:-2px;width:5px;height:5px;border-radius:50%;background:var(--green-soft)}
  .coh-score{font-weight:300;font-size:42px;color:var(--ink);margin-top:14px;transition:color .4s}
  .coh-state{font-size:11px;font-weight:400;letter-spacing:.1em;color:var(--dim);margin-top:2px}
  .tic{width:100%;text-align:center}
  .tic .t{font-weight:300;font-size:30px;color:var(--ink2);transition:color .4s}
  .tic.on .t{color:var(--green)}

  /* stress bar */
  .stress-bar{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-top:22px;padding:16px 20px;
    background:var(--panel);border:1px solid var(--line);border-radius:14px}
  .stress-bar.active{border-color:var(--amber-soft);box-shadow:0 0 24px rgba(255,107,74,.12)}
  .sb-l{display:flex;flex-direction:column;gap:3px}
  .sb-sub{font-size:12px;font-weight:400;color:var(--amber);letter-spacing:.04em}
  .levels{display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}
  .levels button{background:transparent;color:var(--dim);font-family:var(--font);font-size:13px;font-weight:500;
    padding:9px 14px;border:none;border-radius:0;cursor:pointer;transition:.15s}
  .levels button:hover{color:var(--ink2)}
  .levels button.active{background:var(--amber);color:#1a0e08}
  .btn.stress{background:var(--amber);color:#1a0e08}
  .btn.stress:hover{filter:brightness(1.07)}
  .composure{font-size:13px;color:var(--ink2)}
  .composure b{font-weight:500;font-size:20px;color:var(--green);margin-left:6px}
  .composure.low b{color:var(--amber)}

  /* protocol console */
  .protocols{margin-top:22px}
  .ptabs{display:flex;gap:8px;margin-bottom:14px}
  .ptab{background:transparent;color:var(--dim);font-family:var(--font);font-size:13px;font-weight:500;padding:9px 16px;border:1px solid var(--line);border-radius:9px;cursor:pointer;transition:.15s}
  .ptab:hover{color:var(--ink2)}
  .ptab.active{background:var(--green-faint);border-color:var(--green-soft);color:var(--green)}
  /* performance lock overlay (lives inside the arena) */
  .pl-top,.pl-bottom{position:absolute;left:0;right:0;z-index:7;display:flex;flex-direction:column;align-items:center;padding:0 28px;text-align:center;pointer-events:none}
  .pl-top{top:24px} .pl-bottom{bottom:22px;gap:13px}
  .pl-bottom>*{pointer-events:auto}
  .pl-step{font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--dim);margin-bottom:9px}
  .pl-prompt{font-size:18px;font-weight:300;line-height:1.5;color:var(--ink);max-width:400px}
  .pl-prompt.big{font-size:21px;color:var(--ink)}
  .pl-prog{width:250px;max-width:62vw;height:5px;border-radius:5px;background:var(--line);overflow:hidden}
  .pl-prog i{display:block;height:100%;width:0;background:var(--green);transition:width .3s}
  .pl-progtxt{font-size:11px;color:var(--dim);font-variant-numeric:tabular-nums}
  .pl-ratings{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-width:400px}
  .pl-ratings button{width:34px;height:34px;border-radius:8px;border:1px solid var(--line);background:transparent;color:var(--ink2);font-family:var(--font);font-size:14px;cursor:pointer;transition:.14s}
  .pl-ratings button:hover{border-color:var(--green-soft);color:var(--green);background:var(--green-faint)}
  .pl-input{background:var(--panel2);border:1px solid var(--line);border-radius:8px;color:var(--ink);font-family:var(--font);font-size:13px;padding:8px 12px;width:250px;max-width:62vw;text-align:center;outline:none}
  .pl-input:focus{border-color:var(--green-soft)}
  .pl-break{font-size:13px;font-weight:400;color:var(--amber);opacity:0;transition:opacity .4s;max-width:360px}
  .pl-break.show{opacity:1}
  .pl-delta{font-size:15px;color:var(--ink2)}
  .pl-delta b{font-size:42px;font-weight:300;color:var(--green);margin:0 6px;vertical-align:-6px}
  .pl-stats{font-size:12px;color:var(--dim);line-height:1.8;font-variant-numeric:tabular-nums}
  .pl-row{display:flex;gap:10px;justify-content:center}
  .pl-status{font-size:12px;color:var(--green-soft);letter-spacing:.04em}
  .pl-frame{font-size:21px;font-weight:300;line-height:1.5;color:var(--ink);max-width:420px}
  .pl-mode .pace-meta{display:none}

  /* exercises */
  .ex{margin-top:22px;border-top:1px solid var(--line);padding-top:22px}
  .ex-head{display:flex;align-items:center;gap:12px;margin-bottom:16px}
  .ex-head .tag{font-size:10px;font-weight:500;letter-spacing:.16em;color:var(--green-soft);border:1px solid var(--line);border-radius:5px;padding:3px 8px}
  .ex-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  @media(max-width:900px){.ex-grid{grid-template-columns:1fr 1fr}}
  .tile{background:var(--panel);border:1px solid var(--line);border-radius:13px;padding:16px 17px;position:relative;opacity:.62;transition:.18s}
  .tile.live{opacity:1;border-color:var(--amber-soft);cursor:pointer}
  .tile:hover{opacity:.85}
  .tile h3{font-weight:400;font-size:16px;color:var(--ink);margin-bottom:4px}
  .tile p{font-size:12px;font-weight:300;color:var(--dim);line-height:1.45}
  .tile .soon{position:absolute;top:14px;right:15px;font-size:9px;font-weight:500;letter-spacing:.14em;color:var(--faint)}
  .tile.live .soon{color:var(--amber)}

  /* controls */
  .bar2{display:flex;align-items:center;gap:13px;flex-wrap:wrap;margin-top:22px;padding-top:20px;border-top:1px solid var(--line)}
  button{font-family:var(--font);cursor:pointer;border:none;border-radius:8px;transition:.16s}
  .btn{background:var(--green);color:#15200a;font-weight:600;font-size:13px;padding:10px 18px}
  .btn:hover{filter:brightness(1.08)} .btn:disabled{opacity:.3;cursor:not-allowed}
  .btn.ghost{background:transparent;color:var(--ink2);border:1px solid var(--line);font-weight:500}
  .btn.ghost:hover{border-color:var(--green-soft);color:var(--green)}
  .status{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dim)}
  .sdot{width:7px;height:7px;border-radius:50%;background:var(--faint);transition:.3s}
  .sdot.on{background:var(--green);box-shadow:0 0 8px var(--green)} .sdot.warn{background:var(--warn)}
  .grp{display:flex;align-items:center;gap:9px}
  .grp .lbl{white-space:nowrap}
  input[type=range]{-webkit-appearance:none;width:90px;height:2px;background:var(--line);border-radius:2px;outline:none}
  input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:var(--green);cursor:pointer}
  input[type=range]::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:var(--green);border:none;cursor:pointer}
  .seg{display:flex;border:1px solid var(--line);border-radius:7px;overflow:hidden}
  .seg button{background:transparent;color:var(--dim);font-size:11px;padding:7px 9px;border-radius:0}
  .seg button.active{background:var(--green);color:#15200a;font-weight:600}
  .toggle{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--dim);cursor:pointer;user-select:none}
  .toggle .sw{width:34px;height:19px;border-radius:19px;background:var(--line);position:relative;transition:.2s}
  .toggle .sw::after{content:'';position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;background:var(--dim);transition:.2s}
  .toggle.on .sw{background:var(--green-faint)} .toggle.on .sw::after{left:17px;background:var(--green)}
  .spacer{flex:1}
  .err{width:100%;background:rgba(217,139,74,.12);border:1px solid rgba(217,139,74,.4);color:#e9bb8e;font-size:12px;padding:9px 12px;border-radius:8px;display:none;margin-top:12px;line-height:1.5}
  .err.show{display:block} .err code{color:var(--green)}
  /* learn-the-technique modal */
  .modal{position:fixed;inset:0;z-index:50;display:none;align-items:center;justify-content:center;background:rgba(5,5,7,.72);backdrop-filter:blur(3px);padding:20px}
  .modal.show{display:flex}
  .modal-card{background:var(--panel);border:1px solid var(--line-bright);border-radius:18px;padding:34px 36px;max-width:520px;width:100%;position:relative}
  .modal-card h2{font-size:23px;font-weight:400;letter-spacing:.01em}
  .modal-card h2 em{font-style:italic;color:var(--green)}
  .modal-card .msub{font-size:13px;color:var(--dim);margin:6px 0 24px}
  .learn-step{display:flex;gap:14px;margin-bottom:18px;align-items:flex-start}
  .learn-step .n{flex:none;width:26px;height:26px;border-radius:50%;border:1px solid var(--green-soft);color:var(--green);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:500}
  .learn-step .b h4{font-size:15px;font-weight:500;margin-bottom:3px}
  .learn-step .b p{font-size:13px;font-weight:300;color:var(--ink2);line-height:1.55}
  .modal-x{position:absolute;top:16px;right:18px;background:transparent;color:var(--dim);font-size:22px;line-height:1;cursor:pointer;border:none}
  .modal-x:hover{color:var(--ink)}
  .modal-card .btn{margin-top:8px}
  .compat-row{font-size:13px;color:var(--ink2);line-height:1.7;margin:3px 0}
  .compat-row b{color:var(--green);font-weight:500}
  .compat-row.bad b{color:var(--amber)}`;

const MARKUP = `<div class="monitor">

  <div class="hd">
    <div class="hd-l">
      <div class="mark"></div>
      <div class="wm">Heart <em>Dynamics</em></div>
      <div class="badge" id="badge">COMING SOON</div>
    </div>
    <div class="hd-r"><span class="d"></span><span>The Mind Academy · Coherence System</span></div>
  </div>
  <div class="rule"></div>

  <div class="stage">
    <!-- LEFT -->
    <div class="pnl">
      <div class="hr-top"><span class="lbl">Heart Rate</span><span class="pulse" id="pulse"></span></div>
      <div class="hr-num num"><span id="hrNum">––</span><span>bpm</span></div>
      <div class="hr-rr num" id="hrRR">RR –– ms</div>
      <div class="hr-spark"><canvas id="spark"></canvas></div>
      <div class="dial-wrap">
        <div class="divider" style="width:100%"></div>
        <div class="dial">
          <svg viewBox="0 0 140 140" width="140" height="140">
            <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="6" stroke-linecap="round" stroke-dasharray="273.3 364.4" transform="rotate(135 70 70)"/>
            <circle id="dialProg" cx="70" cy="70" r="58" fill="none" stroke="var(--green-soft)" stroke-width="6" stroke-linecap="round" stroke-dasharray="0 364.4" transform="rotate(135 70 70)" style="transition:stroke-dasharray .4s,stroke .4s"/>
          </svg>
          <div class="center"><div class="val num" id="dialVal">—</div><div class="vlbl">to coherence</div></div>
        </div>
        <div class="dial-cap">Time to initial coherence</div>
      </div>
    </div>

    <!-- CENTER -->
    <div class="pnl pacer-pnl" id="arena">
      <div class="strobe" id="strobe"></div>
      <div class="stress-layer" id="stressLayer"></div>
      <div class="pl-top" id="plTop" style="display:none"></div>
      <div class="pl-bottom" id="plBottom" style="display:none"></div>
      <div class="rings">
        <div class="ring a"></div><div class="ring b"></div><div class="ring c"></div>
        <div class="breath" id="breath"></div>
        <div class="cue-box">
          <div class="cue" id="cue">inhale</div>
          <div class="cue-secs num" id="cueSecs">5.5</div>
        </div>
      </div>
      <div class="pace-meta">
        <div><div class="lbl">Rate</div><div class="v num"><span id="rateMeta">5.5</span> br/min</div></div>
        <div><div class="lbl">Pattern</div><div class="v num" id="paceSecs">5.5s · 5.5s</div></div>
      </div>
    </div>

    <!-- RIGHT -->
    <div class="pnl coh-pnl">
      <span class="lbl">Coherence</span>
      <div class="coh-lamp" id="cohLamp">COHERENT</div>
      <div class="bar-wrap">
        <div class="scale"><span>10</span><span>8</span><span>6</span><span>4</span><span>2</span><span>0</span></div>
        <div class="bar" id="bar"><div class="thresh"></div><div class="fill" id="fill"></div></div>
      </div>
      <div class="coh-score num" id="cohScore">––</div>
      <div class="coh-state num" id="cohState">awaiting</div>
      <div class="divider" style="width:100%"></div>
      <div class="tic" id="tic"><div class="lbl">Time in Coherence</div><div class="t num" id="ticVal">00:00</div></div>
    </div>
  </div>

  <!-- PROTOCOLS -->
  <div class="protocols">
    <div class="ptabs">
      <button class="ptab active" data-proto="stress">Stress Inoculation</button>
      <button class="ptab" data-proto="lock">Performance Lock</button>
    </div>

    <div class="stress-bar" id="stressBar">
      <div class="sb-l"><span class="lbl">Stress Training</span><span class="sb-sub" id="stressName">Level 3 · Challenging</span></div>
      <div class="levels" id="levelSeg">
        <button data-l="1">1</button><button data-l="2">2</button><button data-l="3" class="active">3</button><button data-l="4">4</button><button data-l="5">5</button>
      </div>
      <button class="btn stress" id="stressBtn">Start Stress</button>
      <label class="toggle on" id="soundToggle"><span class="sw"></span><span>Sound</span></label>
      <div class="spacer"></div>
      <div class="composure" id="composure" style="display:none">Composure <b id="compVal">––%</b></div>
    </div>

    <div class="stress-bar" id="lockBar" style="display:none">
      <div class="sb-l"><span class="lbl">Performance Lock</span><span class="sb-sub" id="lockName" style="color:var(--green-soft)">Level 1 · From a distance</span></div>
      <div class="levels" id="lockSeg">
        <button data-l="1" class="active">1</button><button data-l="2">2</button><button data-l="3">3</button>
      </div>
      <button class="btn" id="lockBtn">Start Lock</button>
      <div class="spacer"></div>
      <div class="pl-status" id="lockStatus"></div>
    </div>
  </div>

  <!-- EXERCISES -->
  <div class="ex">
    <div class="ex-head"><span class="lbl">Exercises</span><span class="tag">IN DEVELOPMENT</span></div>
    <div class="ex-grid">
      <div class="tile live" id="tileLearn"><span class="soon">GUIDE</span><h3>Learn the Technique</h3><p>Heart-focused breathing and the awe state — the core method.</p></div>
      <div class="tile live" id="tileCore"><span class="soon">PLAYABLE</span><h3>Coherence Practice</h3><p>The core coherence breath training. Find it and hold it.</p></div>
      <div class="tile live" id="tileStress"><span class="soon">PLAYABLE</span><h3>Stress Training</h3><p>Hold coherence while chaos fires around you. Five levels.</p></div>
      <div class="tile live" id="tileLock"><span class="soon">PLAYABLE</span><h3>Performance Lock</h3><p>Rehearse the moment that takes you — and hold coherence through it.</p></div>
    </div>
  </div>

  <!-- CONTROLS -->
  <div class="bar2">
    <div class="status"><span class="sdot" id="sdot"></span><span id="statusTxt">Disconnected</span></div>
    <button class="btn" id="connectBtn">Connect Sensor</button>
    <button class="btn ghost" id="sessionBtn">Begin Session</button>
    <div class="spacer"></div>
    <div class="grp"><span class="lbl">Rate</span><input type="range" id="rate" min="4.5" max="6.5" step="0.5" value="5.5"><span class="lbl num" id="rateVal" style="color:var(--green-soft)">5.5</span></div>
    <div class="seg" id="ratioSeg"><button data-r="1" class="active">5:5</button><button data-r="1.5">4:6</button></div>
    <label class="toggle" id="demoToggle"><span class="sw"></span><span>Demo</span></label>
    <div class="err" id="err"></div>
  </div>
</div>

<div class="modal" id="learnModal">
  <div class="modal-card">
    <button class="modal-x" id="learnClose" aria-label="Close">&times;</button>
    <h2>The Coherence <em>Breath</em></h2>
    <div class="msub">The core technique behind every exercise in Heart Dynamics.</div>
    <div class="learn-step"><div class="n">1</div><div class="b"><h4>Breathe with the circle</h4><p>Slow and even — about five and a half seconds in, five and a half out. Let your breath follow the ring as it grows and settles.</p></div></div>
    <div class="learn-step"><div class="n">2</div><div class="b"><h4>Breathe through the heart</h4><p>Rest your attention in the centre of your chest, and imagine the breath flowing in and out through that space.</p></div></div>
    <div class="learn-step"><div class="n">3</div><div class="b"><h4>Hold a feeling of awe</h4><p>Bring to mind something vast or wondrous — a night sky, the open ocean, a moment that moved you. Let the image rest in your mind and the feeling rest in your chest as you breathe.</p></div></div>
    <button class="btn" id="learnStart">Start practising</button>
  </div>
</div>

<div class="modal" id="compatGate">
  <div class="modal-card">
    <h2>Open in <em>Chrome</em> or <em>Edge</em></h2>
    <div class="msub" id="compatMsg">Heart Dynamics connects to your sensor through your browser.</div>
    <div class="compat-row"><b>Works:</b> Chrome or Edge on Windows or Mac · Chrome on Android</div>
    <div class="compat-row bad"><b>Not supported:</b> Safari, iPhone, iPad</div>
    <button class="btn" id="compatDemo" style="margin-top:18px">Explore in demo mode</button>
  </div>
</div>`;

export default function HeartDynamics() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let __raf = 0;


  "use strict";
  const S={connected:false,demo:false,sessionRunning:false,beats:[],rrSupported:false,
    lastHR:null,lastRR:null,battery:null,score:0,scoreEMA:0,peakHz:null,
    sessionStart:0,lastTick:0,inCohSec:0,ttc:null,ttcDone:false,
    breathRate:5.5,ratio:1,device:null,hrChar:null,seenBeats:0,demoScatter:false};
  const COH=6, DIAL_MAX=90, ARC=273.3, CIRC=364.4;
  const $=id=>root.querySelector('#'+id);
  const sdot=$("sdot"),statusTxt=$("statusTxt"),connectBtn=$("connectBtn"),err=$("err"),
    breath=$("breath"),cue=$("cue"),cueSecs=$("cueSecs"),paceSecs=$("paceSecs"),rateMeta=$("rateMeta"),
    hrNum=$("hrNum"),hrRR=$("hrRR"),pulse=$("pulse"),sparkC=$("spark"),
    fill=$("fill"),barEl=$("bar"),cohLamp=$("cohLamp"),cohScore=$("cohScore"),cohState=$("cohState"),
    ticEl=$("tic"),ticVal=$("ticVal"),dialProg=$("dialProg"),dialVal=$("dialVal"),
    rate=$("rate"),rateVal=$("rateVal"),sessionBtn=$("sessionBtn"),demoToggle=$("demoToggle"),badge=$("badge");

  function showErr(h){err.innerHTML=h;err.classList.add("show");}
  function clearErr(){err.classList.remove("show");}
  function setStatus(k,t){statusTxt.textContent=t;sdot.className="sdot"+(k==="on"?" on":(k==="scan"||k==="warn")?" warn":"");}

  // ===== BLUETOOTH =====
  async function connect(){
    console.log("Connect clicked");
    console.log("navigator.bluetooth:", navigator.bluetooth);
    console.log("isSecureContext:", window.isSecureContext);
      
    if(S.demo)disableDemo();
    if (!window.isSecureContext) {
  showErr("Bluetooth requires HTTPS. Open this from your live https:// Vercel URL, not an insecure preview.");
  return;
}

if (!browserCanUseBluetooth()) {
  showBluetoothPopup();
  return;
}
    try{
      clearErr();setStatus("scan","Scanning…");
      const device=await navigator.bluetooth.requestDevice({filters:[{services:['heart_rate']}],optionalServices:['heart_rate','battery_service']});
      S.device=device;device.addEventListener('gattserverdisconnected',onDisconnect);
      setStatus("scan","Connecting…");
      const server=await device.gatt.connect();
      const hs=await server.getPrimaryService('heart_rate');
      const hc=await hs.getCharacteristic('heart_rate_measurement');
      await hc.startNotifications();hc.addEventListener('characteristicvaluechanged',onHR);S.hrChar=hc;
      try{const bs=await server.getPrimaryService('battery_service');const bc=await bs.getCharacteristic('battery_level');S.battery=(await bc.readValue()).getUint8(0);}catch(e){}
      S.connected=true;S.beats=[];
      setStatus("on",(device.name||"KYTO")+(S.battery!=null?"  ·  "+S.battery+"%":""));
      connectBtn.textContent="Disconnect";
    }catch(e){
      if(e&&e.name==='NotFoundError'){setStatus("off","Disconnected");clearErr();}
      else{showErr("Connection failed: "+(e.message||e));setStatus("off","Disconnected");}
    }
  }
  function disconnect(){try{if(S.device&&S.device.gatt.connected)S.device.gatt.disconnect();}catch(e){}onDisconnect();}
  function onDisconnect(){S.connected=false;S.hrChar=null;S.lastHR=null;setStatus("off","Disconnected");connectBtn.textContent="Connect Sensor";}
  function onHR(ev){
    const v=ev.target.value,flags=v.getUint8(0);let i=1,hr;
    if(flags&0x01){hr=v.getUint16(i,true);i+=2;}else{hr=v.getUint8(i);i+=1;}
    if(flags&0x08)i+=2;
    const rrs=[];if(flags&0x10){for(;i+1<v.byteLength;i+=2)rrs.push(v.getUint16(i,true)*(1000/1024));}
    ingest(hr,rrs);
  }
  function ingest(hr,rrs){
    S.lastHR=hr;const now=performance.now()/1000;
    if(rrs&&rrs.length){S.rrSupported=true;S.lastRR=rrs[rrs.length-1];
      let t=now-rrs.reduce((a,b)=>a+b,0)/1000;for(const rr of rrs){t+=rr/1000;S.beats.push({t,hr:60000/rr});}}
    else{S.lastRR=Math.round(60000/hr);S.beats.push({t:now,hr});}
    trim();
  }
  function trim(){const c=performance.now()/1000-90;while(S.beats.length&&S.beats[0].t<c)S.beats.shift();}
  connectBtn.addEventListener('click',()=>S.connected?disconnect():connect());

  // ===== DEMO =====
  let demoTimer=null;
  function enableDemo(){
    S.demo=true;demoToggle.classList.add("on");if(S.connected)disconnect();
    S.beats=[];S.rrSupported=true;setStatus("warn","Demo");connectBtn.disabled=true;
    const base=62;
    demoTimer=setInterval(()=>{
      let hr;
      if(S.demoScatter){ hr=base+(Math.random()-0.5)*30; }          // erratic — simulate losing coherence
      else { const f=S.breathRate/60,resp=Math.sin(2*Math.PI*f*(performance.now()/1000)); hr=base+9*resp+(Math.random()-0.5)*1.2; }
      S.lastRR=Math.round(60000/hr);S.lastHR=Math.round(hr);
      S.beats.push({t:performance.now()/1000,hr});trim();
    },850);
  }
  function disableDemo(){
    S.demo=false;demoToggle.classList.remove("on");connectBtn.disabled=false;
    if(demoTimer){clearInterval(demoTimer);demoTimer=null;}
    S.beats=[];S.rrSupported=false;S.lastHR=null;S.lastRR=null;if(!S.connected)setStatus("off","Disconnected");
  }
  demoToggle.addEventListener('click',()=>S.demo?disableDemo():enableDemo());
  // In Demo mode, press & hold the centre to simulate breaking coherence (so the feedback loop can be tested without a sensor)
  $("arena").addEventListener('pointerdown',()=>{if(S.demo)S.demoScatter=true;});
  window.addEventListener('pointerup',()=>{S.demoScatter=false;});
  window.addEventListener('pointercancel',()=>{S.demoScatter=false;});

  // ===== COHERENCE ENGINE =====
  const FS=4,N=128;  // 32-second analysis window (faster reaction than HeartMath's 64s)
  function computeCoherence(){
    const b=S.beats;if(b.length<8)return null;
    const tEnd=b[b.length-1].t,tStart=tEnd-(N/FS);
    if(b[0].t>tEnd-20)return null;
    const grid=new Float64Array(N);let bi=0;
    for(let k=0;k<N;k++){const tk=tStart+k/FS;
      while(bi<b.length-1&&b[bi+1].t<tk)bi++;
      const a=b[Math.max(0,bi)],c=b[Math.min(b.length-1,bi+1)];
      grid[k]=c.t===a.t?a.hr:a.hr+(c.hr-a.hr)*Math.max(0,Math.min(1,(tk-a.t)/(c.t-a.t)));}
    let sx=0,sy=0,sxx=0,sxy=0;for(let k=0;k<N;k++){sx+=k;sy+=grid[k];sxx+=k*k;sxy+=k*grid[k];}
    const slope=(N*sxy-sx*sy)/(N*sxx-sx*sx),inter=(sy-slope*sx)/N;
    const re=new Float64Array(N),im=new Float64Array(N);
    for(let k=0;k<N;k++){const w=0.5-0.5*Math.cos(2*Math.PI*k/(N-1));re[k]=(grid[k]-(slope*k+inter))*w;}
    fft(re,im);
    const df=FS/N,P=new Float64Array(N/2);for(let k=0;k<N/2;k++)P[k]=re[k]*re[k]+im[k]*im[k];
    const lo=Math.round(0.04/df),hi=Math.round(0.26/df);
    let pk=lo,pp=0;for(let k=lo;k<=hi;k++)if(P[k]>pp){pp=P[k];pk=k;}
    const win=Math.max(1,Math.round(0.015/df));let wp=0;for(let k=pk-win;k<=pk+win;k++)if(k>=0&&k<N/2)wp+=P[k];
    const thi=Math.round(0.40/df);let tp=0;for(let k=lo;k<=thi;k++)tp+=P[k];
    if(tp<=0)return null;return{ratio:wp/tp,peakHz:pk*df};
  }
  function fft(re,im){const n=re.length;
    for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;
      if(i<j){const tr=re[i];re[i]=re[j];re[j]=tr;const ti=im[i];im[i]=im[j];im[j]=ti;}}
    for(let len=2;len<=n;len<<=1){const ang=-2*Math.PI/len,wr=Math.cos(ang),wi=Math.sin(ang);
      for(let i=0;i<n;i+=len){let cwr=1,cwi=0;
        for(let k=0;k<len/2;k++){const ur=re[i+k],ui=im[i+k];
          const vr=re[i+k+len/2]*cwr-im[i+k+len/2]*cwi,vi=re[i+k+len/2]*cwi+im[i+k+len/2]*cwr;
          re[i+k]=ur+vr;im[i+k]=ui+vi;re[i+k+len/2]=ur-vr;im[i+k+len/2]=ui-vi;
          const ncwr=cwr*wr-cwi*wi;cwi=cwr*wi+cwi*wr;cwr=ncwr;}}}}
  const ratioToScore=r=>Math.max(0,Math.min(10,Math.pow(r,0.6)*11));
  const stateFor=s=>s>=COH?"Coherent":s>=4?"Building":s>=2?"Low":"Incoherent";

  function updateMetrics(){
    const c=computeCoherence();
    if(c){
      const raw=ratioToScore(c.ratio);
      if(!S.scoreEMA){S.scoreEMA=raw;} else {const a=raw<S.scoreEMA?0.5:0.16; S.scoreEMA=S.scoreEMA*(1-a)+raw*a;}
      S.score=S.scoreEMA;S.peakHz=c.peakHz;
      fill.style.height=Math.max(0,Math.min(100,S.score*10))+"%";
      const coherent=S.score>=COH;
      barEl.classList.toggle("coh",coherent);cohLamp.classList.toggle("on",coherent);
      cohScore.textContent=S.score.toFixed(2);cohScore.style.color=coherent?"var(--green)":"var(--ink)";
      cohState.textContent=c.peakHz.toFixed(3)+" Hz · "+stateFor(S.score);
    }
    if(S.lastHR!=null)hrNum.textContent=Math.round(S.lastHR);
    if(S.lastRR!=null)hrRR.textContent="RR "+Math.round(S.lastRR)+" ms";
  }

  // ===== sparkline + pulse =====
  const sctx=sparkC.getContext('2d');
  function sizeSpark(){const r=sparkC.getBoundingClientRect(),dpr=window.devicePixelRatio||1;sparkC.width=r.width*dpr;sparkC.height=r.height*dpr;sctx.setTransform(dpr,0,0,dpr,0,0);}
  window.addEventListener('resize',sizeSpark);
  function drawSpark(){
    const r=sparkC.getBoundingClientRect(),w=r.width,h=r.height;sctx.clearRect(0,0,w,h);
    const b=S.beats;if(b.length<2)return;
    const tEnd=b[b.length-1].t,span=24,tStart=tEnd-span,vis=b.filter(x=>x.t>=tStart);
    let mn=1e9,mx=-1e9;for(const x of vis){mn=Math.min(mn,x.hr);mx=Math.max(mx,x.hr);}
    if(mx-mn<3){const m=(mn+mx)/2;mn=m-3;mx=m+3;}const pad=(mx-mn)*0.25;mn-=pad;mx+=pad;
    const X=t=>((t-tStart)/span)*w,Y=v=>h-((v-mn)/(mx-mn))*h;
    sctx.beginPath();vis.forEach((x,i)=>{const px=X(x.t),py=Y(x.hr);i?sctx.lineTo(px,py):sctx.moveTo(px,py);});
    sctx.strokeStyle="rgba(197,255,60,0.8)";sctx.lineWidth=1.5;sctx.lineJoin="round";sctx.stroke();
  }
  let pulseT=0;
  function beatPulse(now){
    if(S.beats.length>S.seenBeats){S.seenBeats=S.beats.length;pulseT=now;}
    const k=Math.max(0,1-(now-pulseT)/600);
    pulse.style.transform="scale("+(0.5+k*0.9)+")";pulse.style.opacity=(0.4+k*0.6).toFixed(2);
  }

  // ===== PACER =====
  let pacerStart=null;
  function animatePacer(now){
    if(pacerStart===null)pacerStart=now;
    const period=60/S.breathRate,inhaleFrac=1/(1+S.ratio);
    const t=((now-pacerStart)/1000)%period,inhaleT=period*inhaleFrac;
    let scale,phase,remain;
    if(t<inhaleT){scale=0.6+0.55*ease(t/inhaleT);phase="inhale";remain=inhaleT-t;}
    else{scale=1.15-0.55*ease((t-inhaleT)/(period-inhaleT));phase="exhale";remain=period-t;}
    breath.style.transform="scale("+scale+")";
    cue.textContent=phase;cue.style.color=phase==="inhale"?"var(--ink)":"var(--green-soft)";
    cueSecs.textContent=remain.toFixed(1);
  }
  const ease=p=>p<0.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
  function updatePaceSecs(){const period=60/S.breathRate,inS=period/(1+S.ratio),outS=period-inS;
    paceSecs.textContent=inS.toFixed(1)+"s · "+outS.toFixed(1)+"s";rateMeta.textContent=S.breathRate.toFixed(1);}

  // ===== session / timing =====
  const fmt=s=>{s=Math.max(0,Math.floor(s));return String(Math.floor(s/60)).padStart(2,'0')+":"+String(s%60).padStart(2,'0');};
  const fmtTTC=s=>s<60?Math.round(s)+"s":fmt(s);
  function setDial(value,done){
    const frac=value==null?0:Math.min(value/DIAL_MAX,1);
    dialProg.style.strokeDasharray=(frac*ARC).toFixed(1)+" "+CIRC;
    dialProg.style.stroke=done?"var(--green)":"var(--green-soft)";
    dialVal.textContent=value==null?"—":fmtTTC(value);
    dialVal.style.color=done?"var(--green)":"var(--ink)";
  }
  function updateBadge(){
    if(STRESS.active){badge.textContent="● STRESS L"+STRESS.level;badge.style.color="var(--amber)";badge.style.borderColor="var(--amber-soft)";}
    else if(PL.active){badge.textContent="● LOCK L"+PL.level;badge.style.color="var(--green)";badge.style.borderColor="var(--green-soft)";}
    else if(S.sessionRunning){badge.textContent="● LIVE";badge.style.color="var(--green)";badge.style.borderColor="var(--green-soft)";}
    else{badge.textContent="COMING SOON";badge.style.color="var(--green)";badge.style.borderColor="var(--green-soft)";}
  }
  function startSession(){
    S.sessionRunning=true;S.sessionStart=performance.now();S.lastTick=performance.now();
    S.inCohSec=0;S.ttc=null;S.ttcDone=false;
    ticVal.textContent="00:00";ticEl.classList.remove("on");setDial(0,false);
    sessionBtn.textContent="End Session";updateBadge();
  }
  function endSession(){
    S.sessionRunning=false;sessionBtn.textContent="Begin Session";
    if(STRESS.active)stopStress();
    updateBadge();
  }
  function tickSession(now){
    if(!S.sessionRunning)return;
    if(!S.lastTick)S.lastTick=now;
    const dt=(now-S.lastTick)/1000;S.lastTick=now;
    const elapsed=(now-S.sessionStart)/1000;
    const coherent=S.score>=COH;
    if(coherent)S.inCohSec+=dt;
    ticVal.textContent=fmt(S.inCohSec);ticEl.classList.toggle("on",coherent);
    if(!S.ttcDone){ if(coherent){S.ttcDone=true;S.ttc=elapsed;setDial(S.ttc,true);} else setDial(elapsed,false); }
    if(STRESS.active){ STRESS.total+=dt; if(coherent)STRESS.held+=dt;
      const pct=STRESS.total>0?Math.round(STRESS.held/STRESS.total*100):0;
      $("compVal").textContent=pct+"%"; $("composure").classList.toggle("low",pct<50); }
  }

  // ===================== STRESS TRAINING =====================
  const LEVELS={
    1:{name:'Mild',      spawnMs:1500, burst:1, sMin:24,sMax:34, op:.5,  soundMs:3200, vol:.20, shake:0, strobeMs:0,    sint:18},
    2:{name:'Moderate',  spawnMs:1000, burst:1, sMin:28,sMax:42, op:.65, soundMs:2000, vol:.30, shake:1, strobeMs:0,    sint:40},
    3:{name:'Challenging',spawnMs:640, burst:1, sMin:32,sMax:50, op:.8,  soundMs:1150, vol:.40, shake:2, strobeMs:2600, sint:70},
    4:{name:'Intense',   spawnMs:400,  burst:2, sMin:38,sMax:62, op:.92, soundMs:760,  vol:.50, shake:4, strobeMs:1300, sint:110},
    5:{name:'Extreme',   spawnMs:230,  burst:3, sMin:42,sMax:78, op:1,   soundMs:420,  vol:.60, shake:6, strobeMs:650,  sint:150}
  };
  const STRESS={active:false,level:3,total:0,held:0,spawnT:null,soundT:null,strobeT:null,sound:true};
  const arena=$("arena"),stressLayer=$("stressLayer"),strobe=$("strobe");

  const ICONS=[
    '<path d="M12 3 L22 20 H2 Z"/><path d="M12 9v5"/><circle cx="12" cy="17.6" r="0.7" fill="currentColor"/>',           // warning
    '<path d="M13 2 L4 14 h6 l-2 8 9-13 h-6 z"/>',                                                                         // bolt
    '<path d="M6 16 v-5 a6 6 0 0 1 12 0 v5 l2 2 H4 z"/><path d="M10 21 a2 2 0 0 0 4 0"/>',                                  // bell
    '<path d="M3 11 v2 l5 1 2 5 h2 l-1-4 8 3 V5 L10 10 H3 z"/>',                                                            // megaphone
    '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.2h2"/>',                                            // phone
    '<path d="M3 13 l2-5 h14 l2 5 v4 H3 z"/><circle cx="7" cy="17" r="1.5"/><circle cx="17" cy="17" r="1.5"/>',            // car
    '<path d="M12 3 c3 4 5 6 5 9 a5 5 0 0 1-10 0 c0-2 2-4 3-6 1 2.5 2 2 2-3 z"/>',                                          // flame
    '<path d="M12 2 l2 5 5-2 -2 5 5 2 -5 2 2 5 -5-2 -2 5 -2-5 -5 2 2-5 -5-2 5-2 -2-5 z"/>',                                 // burst
    '<circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><circle cx="12" cy="16.4" r="0.7" fill="currentColor"/>',           // exclaim
    '<path d="M6 14 a4 4 0 0 1 1-8 a5 5 0 0 1 9.5 1 a3 3 0 0 1-0.5 7 z"/><path d="M11 16 l-2 4 M14 16 l-2 4"/>'             // storm cloud
  ];
  const STRESS_COLORS=['#ff3b30','#ff8c1a','#ffd60a','#ff5e57','#ff2d55'];

  function spawnIcon(L){
    const r=stressLayer.getBoundingClientRect(),w=r.width,h=r.height;if(!w)return;
    const size=L.sMin+Math.random()*(L.sMax-L.sMin);
    const color=STRESS_COLORS[(Math.random()*STRESS_COLORS.length)|0];
    const ang=Math.random()*Math.PI*2, rad=0.42+Math.random()*0.52;
    let x=w/2+Math.cos(ang)*rad*(w/2)-size/2, y=h/2+Math.sin(ang)*rad*(h/2)-size/2;
    x=Math.max(2,Math.min(w-size-2,x)); y=Math.max(2,Math.min(h-size-2,y));
    const rot=(Math.random()-0.5)*50;
    const el=document.createElement('div');el.className='stress-icon';
    el.style.left=x+'px';el.style.top=y+'px';el.style.color=color;
    el.innerHTML='<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+ICONS[(Math.random()*ICONS.length)|0]+'</svg>';
    stressLayer.appendChild(el);
    const life=620+Math.random()*520, steps=9, kf=[];
    for(let i=0;i<=steps;i++){const f=i/steps;let sc,o;
      if(f<0.15){sc=(f/0.15)*1.18;o=L.op*(f/0.15);}
      else if(f<0.82){sc=1.04+0.08*Math.sin(f*36);o=L.op;}
      else{const g=(f-0.82)/0.18;sc=1-0.35*g;o=L.op*(1-g);}
      const jx=(Math.random()-0.5)*9,jy=(Math.random()-0.5)*9;
      kf.push({transform:'translate('+jx.toFixed(1)+'px,'+jy.toFixed(1)+'px) scale('+sc.toFixed(3)+') rotate('+rot+'deg)',opacity:o.toFixed(2)});}
    const an=el.animate(kf,{duration:life,easing:'linear'});
    an.onfinish=()=>el.remove();
  }
  function flashStrobe(){
    strobe.style.opacity=(0.25+Math.random()*0.25).toFixed(2);
    setTimeout(()=>{strobe.style.opacity=0;},90+Math.random()*70);
  }
  function schedSpawn(){if(!STRESS.active)return;const L=LEVELS[STRESS.level];for(let i=0;i<L.burst;i++)spawnIcon(L);
    STRESS.spawnT=setTimeout(schedSpawn,L.spawnMs*(0.7+Math.random()*0.6));}
  function schedSound(){if(!STRESS.active)return;const L=LEVELS[STRESS.level];
    if(STRESS.sound){FX.playRandom(L.vol);if(STRESS.level>=4&&Math.random()<0.5)setTimeout(()=>FX.playRandom(L.vol*0.8),120);}
    STRESS.soundT=setTimeout(schedSound,L.soundMs*(0.6+Math.random()*0.7));}
  function schedStrobe(){if(!STRESS.active)return;const L=LEVELS[STRESS.level];
    if(L.strobeMs){flashStrobe();STRESS.strobeT=setTimeout(schedStrobe,L.strobeMs*(0.7+Math.random()*0.6));}}

  function startStress(){
    if(PL.active)plStop();
    STRESS.active=true;STRESS.total=0;STRESS.held=0;
    arena.classList.add('stressing');$("stressBar").classList.add('active');
    $("stressBtn").textContent="Stop Stress";
    $("composure").style.display="";$("compVal").textContent="––%";
    FX.init();if(STRESS.sound)FX.resume();
    if(!S.sessionRunning)startSession();
    updateBadge();schedSpawn();schedSound();schedStrobe();
  }
  function stopStress(){
    STRESS.active=false;
    [STRESS.spawnT,STRESS.soundT,STRESS.strobeT].forEach(clearTimeout);
    arena.classList.remove('stressing');$("stressBar").classList.remove('active');
    arena.style.boxShadow="";stressLayer.style.transform="";strobe.style.opacity=0;
    $("stressBtn").textContent="Start Stress";
    [...stressLayer.children].forEach(c=>c.remove());
    updateBadge();
  }
  $("stressBtn").addEventListener('click',()=>STRESS.active?stopStress():startStress());
  $("levelSeg").addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    [...e.currentTarget.children].forEach(x=>x.classList.remove('active'));b.classList.add('active');
    STRESS.level=+b.dataset.l;$("stressName").textContent="Level "+STRESS.level+" · "+LEVELS[STRESS.level].name;
    if(STRESS.active)updateBadge();});
  $("soundToggle").addEventListener('click',function(){STRESS.sound=!STRESS.sound;this.classList.toggle('on',STRESS.sound);FX.setMute(!STRESS.sound);});
  $("tileStress").addEventListener('click',()=>{selectProto('stress');if(!STRESS.active)startStress();});

  // arena shake (icons layer + panel glow), driven in main loop
  function stressFrame(){
    if(!STRESS.active){return;}
    const L=LEVELS[STRESS.level];
    const a=L.shake;
    stressLayer.style.transform=a?('translate('+((Math.random()-0.5)*a).toFixed(1)+'px,'+((Math.random()-0.5)*a).toFixed(1)+'px)'):'';
    arena.style.boxShadow='inset 0 0 '+L.sint+'px rgba(255,55,40,0.18)';
  }

  // ===================== PERFORMANCE LOCK =====================
  const PL_NAME="Performance Lock";   // rename the protocol here, in one place
  const PL_LEVELS={1:"From a distance",2:"Close up",3:"Through your own eyes"};
  const PL_FRAMES={
    1:"View the performance moment from a distance.",
    2:"View the performance moment close up.",
    3:"View the performance moment through your own eyes — as if you are there."
  };
  const PL={active:false,level:1,step:'idle',stepStart:0,
    baselineNeed:30,baselineHeld:0,baselineValue:null,lockTime:null,
    preCharge:null,postCharge:null,
    recallDur:90,recallElapsed:0,heldSec:0,totalSec:0,
    breaks:0,recovering:false,breakStart:0,recoveries:[],wasCoherent:true};
  const plTop=$("plTop"),plBottom=$("plBottom");
  let plLast=0;
  const escapeHtml=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function buildRatings(container,cb){for(let i=1;i<=10;i++){const b=document.createElement('button');b.textContent=i;b.addEventListener('click',()=>cb(i));container.appendChild(b);}}

  function plStart(){
    if(STRESS.active)stopStress();
    PL.active=true;plLast=0;
    arena.classList.add('pl-mode');
    plTop.style.display='';plBottom.style.display='';
    $("lockBtn").textContent="Stop Lock";
    setStep('baseline');updateBadge();
  }
  function plStop(){
    PL.active=false;arena.classList.remove('pl-mode');
    plTop.style.display='none';plBottom.style.display='none';
    $("lockBtn").textContent="Start Lock";$("lockStatus").textContent="";
    updateBadge();
  }
  function setStep(s){
    PL.step=s;PL.stepStart=performance.now();plLast=0;
    if(s==='baseline'){
      PL.baselineHeld=0;
      plTop.innerHTML='<div class="pl-step">Step 1 · Baseline lock</div><div class="pl-prompt">Find coherence first. Breathe with the circle and let the bar climb into the green — then hold it steady.</div>';
      plBottom.innerHTML='<div class="pl-prog"><i id="plProgFill"></i></div><div class="pl-progtxt" id="plProgTxt">hold the green · 0 / '+PL.baselineNeed+'s</div>';
      $("lockStatus").textContent="Locking baseline…";
    } else if(s==='precharge'){
      plTop.innerHTML='<div class="pl-step">Step 2 · Pre-charge</div><div class="pl-prompt">Baseline locked. Bring your performance moment to mind. How charged is it, right now?</div>';
      plBottom.innerHTML='<div class="pl-ratings" id="plRate"></div>';
      buildRatings($("plRate"),v=>{PL.preCharge=v;setStep('recall');});
      $("lockStatus").textContent="Rate the charge 1–10";
    } else if(s==='recall'){
      PL.recallElapsed=0;PL.heldSec=0;PL.totalSec=0;PL.breaks=0;PL.recovering=false;PL.recoveries=[];PL.wasCoherent=true;
      plTop.innerHTML='<div class="pl-step">Step 3 · Hold under recall · L'+PL.level+'</div><div class="pl-frame" id="plFrame">'+PL_FRAMES[PL.level]+'</div>';
      plBottom.innerHTML='<div class="pl-break" id="plBreak">Coherence dropped. Recover it while keeping the image in mind — stay, don&rsquo;t flee.</div>'+
        '<div class="pl-prog"><i id="plRecFill"></i></div>'+
        '<div class="pl-progtxt"><span id="plHeld">held 0%</span> · <span id="plRecTxt">0 / '+PL.recallDur+'s</span></div>'+
        '<div class="pl-row"><button class="btn ghost" id="plEnd">End hold</button></div>';
      $("plEnd").addEventListener('click',()=>setStep('postcharge'));
      $("lockStatus").textContent="Hold coherence under recall";
    } else if(s==='postcharge'){
      plTop.innerHTML='<div class="pl-step">Step 4 · Post-charge</div><div class="pl-prompt">Come back to the same moment once more. How charged is it now?</div>';
      plBottom.innerHTML='<div class="pl-ratings" id="plRate2"></div>';
      buildRatings($("plRate2"),v=>{PL.postCharge=v;finishRep();});
      $("lockStatus").textContent="Re-rate the charge 1–10";
    } else if(s==='summary'){
      const held=PL.totalSec>0?Math.round(PL.heldSec/PL.totalSec*100):0;
      const avgRec=PL.recoveries.length?(PL.recoveries.reduce((a,b)=>a+b,0)/PL.recoveries.length):null;
      plTop.innerHTML='<div class="pl-step">Rep complete</div><div class="pl-delta">Charge <b>'+PL.preCharge+'</b> &rarr; <b>'+PL.postCharge+'</b></div>';
      plBottom.innerHTML='<div class="pl-stats">held in coherence '+held+'%  ·  breaks '+PL.breaks+(avgRec!=null?'  ·  avg recovery '+avgRec.toFixed(1)+'s':'  ·  no breaks')+'<br>baseline lock '+(PL.lockTime!=null?PL.lockTime.toFixed(0)+'s':'—')+'</div>'+
        '<div class="pl-row"><button class="btn" id="plAgain">New rep</button><button class="btn ghost" id="plDone">Finish</button></div>';
      $("plAgain").addEventListener('click',()=>setStep('baseline'));
      $("plDone").addEventListener('click',plStop);
      $("lockStatus").textContent="Rep complete";
    }
  }
  function finishRep(){
    const held=PL.totalSec>0?Math.round(PL.heldSec/PL.totalSec*100):0;
    const avgRec=PL.recoveries.length?(PL.recoveries.reduce((a,b)=>a+b,0)/PL.recoveries.length):null;
    const rep={t:Date.now(),proto:PL_NAME,level:PL.level,
      baseline:PL.baselineValue!=null?+PL.baselineValue.toFixed(2):null,lockTime:PL.lockTime!=null?+PL.lockTime.toFixed(1):null,
      pre:PL.preCharge,post:PL.postCharge,delta:PL.preCharge-PL.postCharge,heldPct:held,breaks:PL.breaks,
      recoveries:PL.recoveries.map(r=>+r.toFixed(1)),avgRecovery:avgRec!=null?+avgRec.toFixed(1):null};
    try{const k='hd_pl_history';const h=JSON.parse(localStorage.getItem(k)||'[]');h.push(rep);localStorage.setItem(k,JSON.stringify(h));}catch(e){}
    setStep('summary');
  }
  function tickPL(now){
    if(!PL.active)return;
    if(!plLast)plLast=now;
    const dt=(now-plLast)/1000;plLast=now;
    const coherent=S.score>=COH;
    if(PL.step==='baseline'){
      if(coherent)PL.baselineHeld+=dt; else PL.baselineHeld=Math.max(0,PL.baselineHeld-dt*2);
      const pf=$("plProgFill"),pt=$("plProgTxt");
      if(pf)pf.style.width=Math.min(100,PL.baselineHeld/PL.baselineNeed*100)+'%';
      if(pt)pt.textContent='hold the green · '+Math.min(PL.baselineNeed,PL.baselineHeld).toFixed(0)+' / '+PL.baselineNeed+'s';
      if(PL.baselineHeld>=PL.baselineNeed){PL.baselineValue=S.score;PL.lockTime=(now-PL.stepStart)/1000;setStep('precharge');}
    } else if(PL.step==='recall'){
      PL.recallElapsed+=dt;PL.totalSec+=dt;if(coherent)PL.heldSec+=dt;
      if(PL.wasCoherent&&!coherent){PL.breaks++;PL.recovering=true;PL.breakStart=now;const bc=$("plBreak");if(bc)bc.classList.add('show');}
      if(PL.recovering&&coherent){PL.recoveries.push((now-PL.breakStart)/1000);PL.recovering=false;const bc=$("plBreak");if(bc)bc.classList.remove('show');}
      PL.wasCoherent=coherent;
      const rf=$("plRecFill"),hl=$("plHeld"),rt=$("plRecTxt");
      if(rf)rf.style.width=Math.min(100,PL.recallElapsed/PL.recallDur*100)+'%';
      if(hl)hl.textContent='held '+(PL.totalSec>0?Math.round(PL.heldSec/PL.totalSec*100):0)+'%';
      if(rt)rt.textContent=Math.min(PL.recallDur,PL.recallElapsed).toFixed(0)+' / '+PL.recallDur+'s';
      if(PL.recallElapsed>=PL.recallDur)setStep('postcharge');
    }
  }
  // PL controls
  $("lockBtn").addEventListener('click',()=>PL.active?plStop():plStart());
  $("lockSeg").addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    [...e.currentTarget.children].forEach(x=>x.classList.remove('active'));b.classList.add('active');
    PL.level=+b.dataset.l;$("lockName").textContent="Level "+PL.level+" · "+PL_LEVELS[PL.level];
    if(PL.active&&PL.step==='recall'){const p=$("plFrame");if(p)p.textContent=PL_FRAMES[PL.level];}
    if(PL.active)updateBadge();});
  // protocol tabs
  function selectProto(proto){
    root.querySelectorAll('.ptab').forEach(x=>x.classList.toggle('active',x.dataset.proto===proto));
    if(proto==='stress'){$("stressBar").style.display='';$("lockBar").style.display='none';if(PL.active)plStop();}
    else{$("lockBar").style.display='';$("stressBar").style.display='none';if(STRESS.active)stopStress();}
  }
  root.querySelector('.ptabs').addEventListener('click',e=>{const t=e.target.closest('.ptab');if(t)selectProto(t.dataset.proto);});
  $("tileLock").addEventListener('click',()=>selectProto('lock'));
  // Coherence Practice — the basic core training
  function startCore(){ if(STRESS.active)stopStress(); if(PL.active)plStop(); if(!S.sessionRunning)startSession(); }
  $("tileCore").addEventListener('click',startCore);
  // Learn the Technique — teaching overlay
  const learnModal=$("learnModal");
  $("tileLearn").addEventListener('click',()=>learnModal.classList.add('show'));
  $("learnClose").addEventListener('click',()=>learnModal.classList.remove('show'));
  $("learnStart").addEventListener('click',()=>{learnModal.classList.remove('show');startCore();});
  learnModal.addEventListener('click',e=>{if(e.target===learnModal)learnModal.classList.remove('show');});

  // ===================== AUDIO SYNTH =====================
  const FX=(function(){
    let ctx=null,master=null,noiseBuf=null,muted=false;
    function init(){ if(ctx)return; const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;
      ctx=new AC(); master=ctx.createGain(); master.gain.value=muted?0:0.5; master.connect(ctx.destination);
      noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate); const d=noiseBuf.getChannelData(0);
      for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1; }
    function resume(){ if(ctx&&ctx.state==='suspended')ctx.resume(); }
    function setMute(m){ muted=m; if(master)master.gain.value=m?0:0.5; }
    function env(g,t,a,vol,dur){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+a);g.gain.linearRampToValueAtTime(0.0001,t+dur);}
    function horn(vol){const t=ctx.currentTime,g=ctx.createGain();g.connect(master);env(g,t,0.02,vol,0.6);
      [418,442].forEach(f=>{const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.connect(g);o.start(t);o.stop(t+0.62);});}
    function siren(vol){const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';
      o.frequency.setValueAtTime(600,t);o.frequency.linearRampToValueAtTime(1000,t+0.5);o.frequency.linearRampToValueAtTime(600,t+1.0);
      env(g,t,0.05,vol*0.8,1.1);o.connect(g);g.connect(master);o.start(t);o.stop(t+1.12);}
    function bark(vol){const t=ctx.currentTime;[0,0.22].forEach(off=>{const at=t+off;
      const s=ctx.createBufferSource();s.buffer=noiseBuf;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=900;bp.Q.value=1.1;
      const g=ctx.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(vol,at+0.01);g.gain.exponentialRampToValueAtTime(0.001,at+0.17);
      s.connect(bp);bp.connect(g);g.connect(master);s.start(at);s.stop(at+0.18);
      const o=ctx.createOscillator();o.type='square';o.frequency.setValueAtTime(320,at);o.frequency.exponentialRampToValueAtTime(150,at+0.14);
      const g2=ctx.createGain();g2.gain.setValueAtTime(vol*0.5,at);g2.gain.exponentialRampToValueAtTime(0.001,at+0.15);o.connect(g2);g2.connect(master);o.start(at);o.stop(at+0.16);});}
    function shout(vol){const t=ctx.currentTime,g=ctx.createGain();g.connect(master);env(g,t,0.03,vol,0.42);
      const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1100;bp.Q.value=0.7;bp.connect(g);
      [0,7,-6].forEach(dd=>{const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=180+dd;
        const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=11;lg.gain.value=8;lfo.connect(lg);lg.connect(o.frequency);lfo.start(t);lfo.stop(t+0.43);
        o.connect(bp);o.start(t);o.stop(t+0.43);});
      const n=ctx.createBufferSource();n.buffer=noiseBuf;const ng=ctx.createGain();ng.gain.value=vol*0.25;n.connect(ng);ng.connect(g);n.start(t);n.stop(t+0.43);}
    function alarm(vol){const t=ctx.currentTime;for(let i=0;i<3;i++){const at=t+i*0.17;const o=ctx.createOscillator();o.type='square';o.frequency.value=channelHz(i);
      const g=ctx.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(vol*0.5,at+0.01);g.gain.setValueAtTime(vol*0.5,at+0.09);g.gain.linearRampToValueAtTime(0.0001,at+0.11);
      o.connect(g);g.connect(master);o.start(at);o.stop(at+0.12);}}
    function channelHz(i){return i%2?740:880;}
    function crash(vol){const t=ctx.currentTime,s=ctx.createBufferSource();s.buffer=noiseBuf;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2600;
      const g=ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.4);s.connect(lp);lp.connect(g);g.connect(master);s.start(t);s.stop(t+0.42);}
    function buzz(vol){const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.value=110;
      env(g,t,0.01,vol*0.7,0.45);o.connect(g);g.connect(master);o.start(t);o.stop(t+0.47);}
    const TYPES=[horn,siren,bark,shout,alarm,crash,buzz];
    function playRandom(vol){ if(!ctx||muted)return; try{TYPES[(Math.random()*TYPES.length)|0](vol);}catch(e){} }
    return {init,resume,setMute,playRandom};
  })();

  // ===== loop =====
  let acc=0;
  function loop(now){animatePacer(now);beatPulse(now);drawSpark();tickSession(now);stressFrame();tickPL(now);
    acc+=16;if(acc>=1000){acc=0;updateMetrics();}__raf=requestAnimationFrame(loop);}

  // ===== controls =====
  rate.addEventListener('input',()=>{S.breathRate=parseFloat(rate.value);rateVal.textContent=S.breathRate.toFixed(1);updatePaceSecs();});
  $("ratioSeg").addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn)return;
    [...e.currentTarget.children].forEach(x=>x.classList.remove('active'));btn.classList.add('active');
    S.ratio=parseFloat(btn.dataset.r);updatePaceSecs();});
  sessionBtn.addEventListener('click',()=>S.sessionRunning?endSession():startSession());

  updatePaceSecs();sizeSpark();setDial(null,false);
  // Browser capability gate — Web Bluetooth is Chrome/Edge/Android only (never Safari or iOS)
function browserCanUseBluetooth() {
  return window.isSecureContext && !!navigator.bluetooth;
}

function showBluetoothPopup() {
  $("compatMsg").innerHTML = `
    Heart Dynamics requires Web Bluetooth to connect to your heart sensor.<br><br>

    <b>Supported:</b><br>
    Chrome or Edge on Windows/Mac<br>
    Chrome on Android<br><br>

    <b>Not supported:</b><br>
    iPhone, iPad, Safari, Firefox, Brave, or unsupported/private browsers.<br><br>

    You can still explore the system using Demo Mode.
  `;

  $("compatGate").classList.add("show");
}

$("compatDemo").addEventListener("click", () => {
  $("compatGate").classList.remove("show");
  enableDemo();
});
  __raf=requestAnimationFrame(loop);


    return () => {
      try { cancelAnimationFrame(__raf); } catch (e) {}
      try { if (typeof demoTimer !== "undefined" && demoTimer) clearInterval(demoTimer); } catch (e) {}
      try { [STRESS.spawnT, STRESS.soundT, STRESS.strobeT].forEach(clearTimeout); } catch (e) {}
      try { if (S.device && S.device.gatt && S.device.gatt.connected) S.device.gatt.disconnect(); } catch (e) {}
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT + CSS }} />
      <div className="hd-root" ref={rootRef} dangerouslySetInnerHTML={{ __html: MARKUP }} />
    </>
  );
}
