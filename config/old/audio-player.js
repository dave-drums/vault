(function(){

  /* =========================================
     Inject CSS (updated layout + sizing)
     ========================================= */
  const css = `
  .bunny-audio{
    --border: rgba(0,0,0,.08);
    --shadow: 0 2px 8px rgba(0,0,0,0.06);
    --radius: 12px;

    width: 100%;
    margin: 18px 0;
    background: #fff;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 12px;
    box-sizing: border-box;
  }

  .bunny-audio *{ box-sizing:border-box; }

  /* Layout:
     Left = big play button column (spans both rows)
     Right = header row (title+time left, speed right)
             controls row (seek + volume)
  */
  .bunny-audio__grid{
    display: grid;
    grid-template-columns: 84px 1fr;
    grid-template-rows: auto auto;
    column-gap: 16px;
    row-gap: 10px;
    align-items: center;
  }

  /* Big button: takes up far-left column only */
  .bunny-audio__playwrap{
    grid-column: 1;
    grid-row: 1 / span 2;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .bunny-audio__btn{
    width: 62px;
    height: 62px;
    border-radius: 16px;
    border: 1px solid var(--border);
    background: #fff;
    display: grid;
    place-items: center;
    cursor: pointer;
    user-select: none;
  }

  .bunny-audio__btn:active{
    transform: scale(.97);
  }

  .bunny-audio__icon{
    width: 22px;
    height: 22px;
    display: block;
  }

  /* Header row (right side): text block left, speed right */
  .bunny-audio__head{
    grid-column: 2;
    grid-row: 1;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
  }

  .bunny-audio__text{
    min-width: 0;
  }

  /* Title: P2 + bold */
  .bunny-audio__title{
    margin: 0;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    font: var(--paragraphLargeFont, inherit);
    font-weight: 700;
  }

  /* Timer under title: P3 normal */
  .bunny-audio__time{
    margin: 4px 0 0 0;
    opacity: .7;

    font: var(--paragraphSmallFont, inherit);
    font-weight: 400;
    font-variant-numeric: tabular-nums;
  }

  .bunny-audio__speed{
    flex: 0 0 auto;
    border: 1px solid var(--border);
    background: #fff;
    border-radius: 10px;
    padding: 6px 10px;

    font: var(--paragraphSmallFont, inherit);
    font-weight: 400;
    cursor: pointer;
    white-space: nowrap;
  }

  /* Controls row: seek + volume only */
  .bunny-audio__controls{
    grid-column: 2;
    grid-row: 2;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .bunny-audio__seek{
    width: 100%;
    min-width: 0;
  }

  .bunny-audio__vol{
    width: 140px;
    flex: 0 0 auto;
  }

  @media (max-width: 520px){
    .bunny-audio__grid{
      grid-template-columns: 76px 1fr;
      column-gap: 14px;
    }
    .bunny-audio__btn{
      width: 58px;
      height: 58px;
      border-radius: 15px;
    }
    /* Mobile: volume shorter, time bar longer */
    .bunny-audio__vol{
      width: 86px;
    }
  }
  `;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  /* =========================================
     Helpers
     ========================================= */
  function fmt(t){
    if(!isFinite(t) || t < 0) return "0:00";
    const m = Math.floor(t/60);
    const s = Math.floor(t%60);
    return m + ":" + String(s).padStart(2,"0");
  }

  function mount(el){
    if(el.dataset.mounted === "1") return;
    el.dataset.mounted = "1";

    const src = el.dataset.src;
    const title = el.dataset.title || "Audio";

    el.innerHTML = `
      <div class="bunny-audio__grid">
        <div class="bunny-audio__playwrap">
          <button class="bunny-audio__btn" type="button" aria-label="Play or pause">
            <svg class="bunny-audio__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path class="icon-play" d="M9 7l10 5-10 5z" fill="currentColor"></path>
              <path class="icon-pause" d="M8 7h3v10H8zm5 0h3v10h-3z" fill="currentColor" style="display:none"></path>
            </svg>
          </button>
        </div>

        <div class="bunny-audio__head">
          <div class="bunny-audio__text">
            <p class="bunny-audio__title">${title}</p>
            <p class="bunny-audio__time">0:00 / 0:00</p>
          </div>
          <button class="bunny-audio__speed" type="button" aria-label="Playback speed">1.0×</button>
        </div>

        <div class="bunny-audio__controls">
          <input class="bunny-audio__seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek">
          <input class="bunny-audio__vol" type="range" min="0" max="1" value="1" step="0.01" aria-label="Volume">
        </div>
      </div>
    `;

    if(!src){
      el.querySelector(".bunny-audio__time").textContent = "Missing audio URL";
      return;
    }

    const audio = new Audio(src);
    audio.preload = "metadata";

    const btn = el.querySelector(".bunny-audio__btn");
    const playIcon = el.querySelector(".icon-play");
    const pauseIcon = el.querySelector(".icon-pause");
    const timeEl = el.querySelector(".bunny-audio__time");
    const seek = el.querySelector(".bunny-audio__seek");
    const vol = el.querySelector(".bunny-audio__vol");
    const speedBtn = el.querySelector(".bunny-audio__speed");

    function setIcons(isPlaying){
      playIcon.style.display = isPlaying ? "none" : "";
      pauseIcon.style.display = isPlaying ? "" : "none";
    }

    // Auto-pause other players
    audio.addEventListener("play", () => {
      document.querySelectorAll(".bunny-audio").forEach(other => {
        if(other !== el && other._audio && !other._audio.paused){
          other._audio.pause();
        }
      });
      setIcons(true);
    });

    audio.addEventListener("pause", () => setIcons(false));
    audio.addEventListener("ended", () => setIcons(false));

    btn.addEventListener("click", () => {
      if(audio.paused){
        audio.play();
      }else{
        audio.pause();
      }
    });

    audio.addEventListener("loadedmetadata", () => {
      timeEl.textContent = `${fmt(0)} / ${fmt(audio.duration)}`;
    });

    audio.addEventListener("timeupdate", () => {
      if(isFinite(audio.duration) && audio.duration > 0){
        seek.value = Math.floor((audio.currentTime / audio.duration) * 1000);
        timeEl.textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
      }
    });

    seek.addEventListener("input", () => {
      if(isFinite(audio.duration) && audio.duration > 0){
        audio.currentTime = (seek.value / 1000) * audio.duration;
      }
    });

    vol.addEventListener("input", () => {
      audio.volume = parseFloat(vol.value || "1");
    });

    const speeds = [0.75, 1.0, 1.25, 1.5];
    speedBtn.addEventListener("click", () => {
      const cur = audio.playbackRate || 1.0;
      const idx = speeds.indexOf(cur);
      const next = speeds[(idx + 1) % speeds.length];
      audio.playbackRate = next;
      speedBtn.textContent = next.toFixed(2).replace(/\.00$/,".0") + "×";
    });

    el._audio = audio;
  }

  function mountAll(){
    document.querySelectorAll(".bunny-audio").forEach(mount);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", mountAll);
  }else{
    mountAll();
  }

  new MutationObserver(mountAll)
    .observe(document.documentElement, { childList:true, subtree:true });

})();
