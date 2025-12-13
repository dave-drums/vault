(function(){

/* ---------- CONFIG ---------- */
const CFG = window.VAULT_CONFIG || {};
const BUNNY_LIB = CFG.bunnyLibraryId || "";
const GROOVE_ORIGIN = CFG.grooveOrigin || "";
const GROOVE_EMBED = CFG.grooveEmbedPath || "/GrooveEmbed.html";
const YT_LOGO = CFG.youtubeLogoSrc || "";

/* ---------- UTIL ---------- */
function parseBold(text){
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

/* ---------- YOUTUBE ---------- */
function ytToEmbed(url){
  try{
    const u = new URL(url);
    if(u.hostname.includes("youtu.be")){
      return "https://www.youtube.com/embed/" + u.pathname.slice(1);
    }
    if(u.hostname.includes("youtube.com")){
      return "https://www.youtube.com/embed/" + u.searchParams.get("v");
    }
  }catch(e){}
  return null;
}

function openYT(url){
  const embed = ytToEmbed(url);
  if(!embed) return window.open(url,"_blank");

  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:fixed; inset:0;
    background:rgba(0,0,0,.7);
    z-index:999999;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:1rem;
  `;

  const box = document.createElement("div");
  box.style.cssText = `
    width:100%;
    max-width:900px;
    background:#000;
    border-radius:12px;
    overflow:hidden;
    position:relative;
  `;

  const close = document.createElement("button");
  close.textContent = "×";
  close.style.cssText = `
    position:absolute;
    top:6px;
    right:10px;
    font-size:28px;
    background:none;
    color:#fff;
    border:0;
    cursor:pointer;
    z-index:2;
  `;
  close.onclick = ()=>document.body.removeChild(overlay);

  const wrap = document.createElement("div");
  wrap.style.cssText = "position:relative;padding-top:56.25%;";

  const iframe = document.createElement("iframe");
  iframe.src = embed + "?rel=0&autoplay=1";
  iframe.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0;";
  iframe.allow = "autoplay; encrypted-media; picture-in-picture";
  iframe.allowFullscreen = true;

  wrap.appendChild(iframe);
  box.appendChild(close);
  box.appendChild(wrap);
  overlay.appendChild(box);

  overlay.onclick = e=>{
    if(e.target === overlay) document.body.removeChild(overlay);
  };

  document.body.appendChild(overlay);
}

/* ---------- RENDER ---------- */
document.addEventListener("DOMContentLoaded",()=>{

  document.querySelectorAll(".sqs-block-code,.sqs-block-markdown").forEach(block=>{
    const src = (block.querySelector(".sqs-block-content")||block).textContent.trim();
    if(!src) return;

    const lines = src.split(/\r?\n/);
    const out = document.createElement("div");
    out.className = "vault-seq";

    let i = 0;
    while(i < lines.length){
      const line = lines[i].trim();

      /* VIDEO */
      if(line.startsWith("V>")){
        const id = line.replace("V>","").trim();
        const wrap = document.createElement("div");
        wrap.className = "vault-video-wrapper";
        wrap.innerHTML = `
          <div class="vault-video-embed">
            <iframe src="https://iframe.mediadelivery.net/embed/${BUNNY_LIB}/${id}?autoplay=false"
              allowfullscreen
              allow="autoplay;encrypted-media;picture-in-picture">
            </iframe>
          </div>`;
        out.appendChild(wrap);
        i++; continue;
      }

      /* TEXT */
      if(line.startsWith("T>")){
        const texts = [];
        let yt = null;
        i++;
        while(i < lines.length && lines[i].trim() && !/^[A-Z]{1,2}>/.test(lines[i])){
          const l = lines[i].trim();
          if(/youtube\.com|youtu\.be/.test(l)) yt = l;
          else texts.push(l);
          i++;
        }

        if(yt){
          const row = document.createElement("div");
          row.className = "vault-info-row";

          const main = document.createElement("div");
          main.className = "vault-info vault-info-main";
          main.innerHTML = texts.map(t=>parseBold(t)).join("<br>");

          const btn = document.createElement("button");
          btn.className = "vault-info-yt";
          btn.type = "button";
          btn.onclick = ()=>openYT(yt);
          btn.innerHTML = `<img src="${YT_LOGO}" class="vault-yt-logo" alt="YouTube">`;

          row.appendChild(main);
          row.appendChild(btn);
          out.appendChild(row);
        }else{
          const box = document.createElement("div");
          box.className = "vault-info vault-info-full";
          box.innerHTML = texts.map(t=>parseBold(t)).join("<br>");
          out.appendChild(box);
        }
        continue;
      }

      /* GROOVE */
      if(line.startsWith("G>")){
        const url = line.replace("G>","").trim();
        const p = new URL(url);
        const iframe = document.createElement("iframe");
        iframe.src =
          p.origin === GROOVE_ORIGIN && (p.pathname === "/" || !p.pathname)
          ? GROOVE_ORIGIN + GROOVE_EMBED + p.search
          : url;

        const wrap = document.createElement("div");
        wrap.className = "vault-groove-player";
        wrap.appendChild(iframe);
        out.appendChild(wrap);
        i++; continue;
      }

      /* SPACER */
      if(line.startsWith("BR>")){
        const n = parseFloat(line.replace("BR>","")) || 1;
        const s = document.createElement("div");
        s.className = "vault-spacer";
        s.style.height = n + "rem";
        out.appendChild(s);
        i++; continue;
      }

      i++;
    }

    block.parentNode.replaceChild(out, block);
  });
});

})();
