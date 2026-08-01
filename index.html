<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>STREET YEET</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  :root{
    --ink:#12101a; --pop:#ffd23f; --hot:#ff3b6b; --cool:#3fd0ff; --good:#5ef38c;
    --face:'Arial Black','Arial Bold',Impact,system-ui,sans-serif;
  }
  html,body{width:100%;height:100%;overflow:hidden;background:#0a0910;color:#fff;
    font-family:var(--face);-webkit-font-smoothing:antialiased;cursor:default}
  #app,canvas{display:block;width:100%;height:100%}
  .hidden{display:none!important}
  #hud{position:fixed;inset:0;pointer-events:none;z-index:10;
    text-transform:uppercase;letter-spacing:.04em;user-select:none}

  /* ---- score / records ---- */
  .panel{position:absolute;padding:10px 16px;border-radius:14px;
    background:rgba(10,9,16,.55);backdrop-filter:blur(6px);
    box-shadow:0 6px 0 rgba(0,0,0,.35), inset 0 0 0 2px rgba(255,255,255,.09)}
  #scorePanel{top:18px;left:18px}
  #scorePanel .lbl{font-size:11px;opacity:.6;letter-spacing:.22em}
  #scoreVal{font-size:40px;line-height:.95;color:var(--pop);
    text-shadow:0 3px 0 #a8730a,0 0 26px rgba(255,210,63,.5)}
  #bestPanel{top:18px;right:18px;text-align:right}
  #bestPanel .lbl{font-size:11px;opacity:.6;letter-spacing:.22em}
  #bestVal{font-size:28px;color:var(--cool);text-shadow:0 3px 0 #0a5d78}
  #lastVal{font-size:13px;opacity:.75;margin-top:2px}

  /* ---- charge meter ---- */
  #meterWrap{position:absolute;bottom:34px;left:50%;transform:translateX(-50%);
    width:420px;max-width:70vw;text-align:center}
  #meterLbl{font-size:12px;letter-spacing:.3em;opacity:.85;margin-bottom:7px;
    text-shadow:0 2px 0 rgba(0,0,0,.6)}
  #meter{height:22px;border-radius:12px;overflow:hidden;position:relative;
    background:rgba(8,7,14,.65);box-shadow:inset 0 0 0 3px rgba(255,255,255,.13),0 5px 0 rgba(0,0,0,.4)}
  #meterFill{position:absolute;inset:3px;width:0%;border-radius:9px;
    background:linear-gradient(90deg,#5ef38c,#ffd23f 55%,#ff3b6b);
    transition:width .04s linear}
  #meter.max #meterFill{animation:pulse .18s infinite alternate}
  #meter.max{box-shadow:inset 0 0 0 3px #fff,0 0 34px var(--hot),0 5px 0 rgba(0,0,0,.4)}
  @keyframes pulse{from{filter:brightness(1)}to{filter:brightness(1.7)}}
  #meterTicks{position:absolute;inset:0;display:flex;pointer-events:none}
  #meterTicks i{flex:1;border-right:2px solid rgba(0,0,0,.28)}
  #meterTicks i:last-child{border:0}

  /* ---- combo + big callouts ---- */
  #combo{position:absolute;top:46%;right:6vw;text-align:right;opacity:0;
    transform:translateY(10px) rotate(-4deg);transition:opacity .12s,transform .12s}
  #combo.on{opacity:1;transform:translateY(0) rotate(-4deg)}
  #comboX{font-size:58px;color:var(--hot);text-shadow:0 4px 0 #7a0a26,0 0 30px rgba(255,59,107,.6)}
  #comboLbl{font-size:12px;letter-spacing:.3em;opacity:.8}
  #callout{position:absolute;top:22%;left:50%;transform:translateX(-50%);
    font-size:clamp(30px,7vw,86px);text-align:center;opacity:0;white-space:nowrap;
    color:#fff;text-shadow:0 6px 0 #000,0 0 40px var(--pop)}
  #callout.go{animation:slam .9s cubic-bezier(.2,1.6,.3,1) forwards}
  @keyframes slam{0%{opacity:0;transform:translateX(-50%) scale(2.6) rotate(-9deg)}
    22%{opacity:1;transform:translateX(-50%) scale(1) rotate(-3deg)}
    72%{opacity:1;transform:translateX(-50%) scale(1) rotate(-3deg)}
    100%{opacity:0;transform:translateX(-50%) scale(.86) rotate(-3deg)}}

  /* ---- toasts ---- */
  #toasts{position:absolute;bottom:96px;left:22px;display:flex;
    flex-direction:column-reverse;gap:8px}
  .toast{padding:9px 15px;border-radius:11px;font-size:14px;
    background:rgba(10,9,16,.7);box-shadow:inset 0 0 0 2px rgba(255,255,255,.12);
    animation:tin .3s ease-out, tout .4s ease-in 2.6s forwards}
  .toast b{color:var(--pop)}
  @keyframes tin{from{opacity:0;transform:translateX(-30px)}}
  @keyframes tout{to{opacity:0;transform:translateX(-30px)}}

  /* ---- reticle + hints ---- */
  #fist{position:absolute;left:50%;top:50%;width:26px;height:26px;
    margin:-13px 0 0 -13px;opacity:.5;transition:opacity .15s,transform .15s}
  #fist:before,#fist:after{content:'';position:absolute;background:#fff;
    box-shadow:0 0 8px rgba(0,0,0,.8)}
  #fist:before{left:11px;top:0;width:4px;height:26px}
  #fist:after{left:0;top:11px;width:26px;height:4px}
  #fist.hot{opacity:1;transform:scale(1.5) rotate(45deg)}
  #hints{position:absolute;bottom:12px;right:18px;font-size:11px;
    opacity:.45;letter-spacing:.12em;text-align:right;line-height:1.7}
  #hints kbd{background:rgba(255,255,255,.14);padding:2px 6px;border-radius:5px;
    font-family:inherit}

  /* ---- fullscreen fx ---- */
  #flash{position:fixed;inset:0;background:#fff;opacity:0;z-index:9;pointer-events:none}
  #vig{position:fixed;inset:0;z-index:8;pointer-events:none;
    box-shadow:inset 0 0 22vw rgba(0,0,0,.55)}
  #lines{position:fixed;inset:0;z-index:7;pointer-events:none;opacity:0;
    transition:opacity .18s;
    background:repeating-conic-gradient(from 0deg at 50% 50%,
      rgba(255,255,255,.16) 0deg 1.1deg, transparent 1.1deg 5deg);
    mask:radial-gradient(circle,transparent 26%,#000 72%);
    -webkit-mask:radial-gradient(circle,transparent 26%,#000 72%)}
  #lines.on{opacity:1}

  /* ---- title / pause ---- */
  #title{position:fixed;inset:0;z-index:20;display:flex;align-items:center;
    justify-content:center;text-align:center;cursor:pointer;
    background:radial-gradient(ellipse at 50% 45%,#2b2350,#0a0910 72%)}
  #title h1{font-size:clamp(46px,13vw,150px);line-height:.86;letter-spacing:-.02em;
    color:var(--pop);text-shadow:0 8px 0 #b3400f,0 14px 0 rgba(0,0,0,.4),0 0 70px rgba(255,210,63,.45);
    transform:rotate(-3deg)}
  #title h1 span{display:block;color:#fff;text-shadow:0 8px 0 var(--hot),0 14px 0 rgba(0,0,0,.4)}
  #title .sub{margin-top:26px;font-size:13px;letter-spacing:.34em;opacity:.75}
  #title .keys{margin-top:30px;font-size:12px;opacity:.7;line-height:2.1;letter-spacing:.14em}
  #title .keys kbd{background:rgba(255,255,255,.13);padding:3px 9px;border-radius:6px;
    font-family:inherit;margin:0 3px}
  #title .go{margin-top:34px;font-size:19px;color:#fff;animation:blink 1s infinite alternate}
  @keyframes blink{to{opacity:.32}}
  #loading{position:fixed;inset:0;z-index:30;display:flex;align-items:center;
    justify-content:center;background:#0a0910;font-size:14px;letter-spacing:.3em;opacity:.8}
</style>
</head>
<body>
<div id="app"></div>

<div id="hud" class="hidden">
  <div id="scorePanel" class="panel">
    <div class="lbl">yeet points</div><div id="scoreVal">0</div>
  </div>
  <div id="bestPanel" class="panel">
    <div class="lbl">longest yeet</div><div id="bestVal">0 m</div>
    <div id="lastVal">last: &mdash;</div>
  </div>
  <div id="combo"><div id="comboX">x2</div><div id="comboLbl">combo</div></div>
  <div id="callout"></div>
  <div id="toasts"></div>
  <div id="fist"></div>
  <div id="meterWrap">
    <div id="meterLbl">yeet-o-meter</div>
    <div id="meter"><div id="meterFill"></div>
      <div id="meterTicks"><i></i><i></i><i></i><i></i></div>
    </div>
  </div>
  <div id="hints">
    <kbd>WASD</kbd> move &nbsp; <kbd>shift</kbd> sprint &nbsp; <kbd>space</kbd> hop<br>
    <kbd>hold LMB</kbd> wind up &nbsp; <kbd>release</kbd> YEET &nbsp; <kbd>F</kbd> taunt<br>
    <kbd>R</kbd> restock street &nbsp; <kbd>M</kbd> mute &nbsp; <kbd>esc</kbd> pause
  </div>
</div>

<div id="title">
  <div>
    <h1>STREET<span>YEET</span></h1>
    <div class="sub">one fist. zero survivors. infinite distance.</div>
    <div class="keys">
      <kbd>WASD</kbd> walk the block &nbsp;&middot;&nbsp; <kbd>mouse</kbd> look<br>
      <kbd>hold left click</kbd> charge the fist &nbsp;&middot;&nbsp; <kbd>let go</kbd> to yeet<br>
      punch anything. cars. pigeons. that guy. all of it.
    </div>
    <div class="go">&#9654; click to play</div>
  </div>
</div>

<div id="flash"></div><div id="vig"></div><div id="lines"></div>
<div id="loading">building the block&hellip;</div>

<script src="vendor/three.min.js"></script>
<script src="js/audio.js"></script>
<script src="js/fx.js"></script>
<script src="js/city.js"></script>
<script src="js/actors.js"></script>
<script src="js/game.js"></script>
</body>
</html>
