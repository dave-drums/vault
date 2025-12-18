(function(){
  "use strict";

  const CFG = window.VAULT_CONFIG || {};
  const BUNNY_LIB = CFG.bunnyLibraryId || "556221";
  const GROOVE_ORIGIN = CFG.grooveOrigin || "https://groove.davedrums.com.au";
  const GROOVE_EMBED = CFG.grooveEmbedPath || "/GrooveEmbed.html";
  const YT_LOGO = CFG.youtubeLogoSrc || "/s/youtube-logo.png";

  const ID_RE = /^(V|G|T|A|BR|H|HR)>\s*(.*)$/;

  function parseBold(text){
    return String(text || "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  /* ---------- YouTube ---------- */
  function ytToEmbed(url){
    try{
      const u = new URL(url);
      if (u.hostname.includes("youtu.be")) {
        const id = (u.pathname || "").replace("/", "");
        return id ? "https://www.youtube.com/embed/" + id : null;
      }
      if (u.hostname.includes("youtube.com")) {
        const id = u.searchParams.get("v");
        return id ? "https://www.youtube.com/embed/" + id : null;
      }
    }catch(e){}
    return null;
  }

  function openYT(url){
    const embed = ytToEmbed(url);
    if(!embed) return window.open(url, "_blank");

    const overlay = document.createElement("div");
    overlay.className = "vault-yt-overlay";

    const box = document.createElement("div");
    box.className = "vault-yt-inner";

    const close = document.createElement("button");
    close.className = "vault-yt-close";
    close.type = "button";
    close.innerHTML = "&times;";
    close.onclick = () => overlay.remove();

    const wrap = document.createElement("div");
    wrap.className = "vault-yt-iframe-wrap";

    const iframe = document.createElement("iframe");
    iframe.src = embed + "?rel=0&autoplay=1";
    iframe.allow = "autoplay; encrypted-media; picture-in-picture";
    iframe.allowFullscreen = true;

    wrap.appendChild(iframe);
    box.appendChild(close);
    box.appendChild(wrap);
    overlay.appendChild(box);

    overlay.addEventListener("click", (e)=>{
      if(e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  /* ---------- Groove URL normalise ---------- */
  function normaliseGrooveUrl(input){
    const u = (input || "").trim();
    if(!u) return "";

    if(u[0] === "?"){
      return GROOVE_ORIGIN + GROOVE_EMBED + u;
    }

    try{
      const parsed = new URL(u);
      if(parsed.hostname === "groove.davedrums.com.au" && (parsed.pathname === "/" || parsed.pathname === "")){
        return GROOVE_ORIGIN + GROOVE_EMBED + parsed.search;
      }
    }catch(e){}

    return u;
  }

  /* ---------- AUDIO LINE PARSE ---------- */
  function parseAudio(rest){
    const s = (rest || "").trim();
    if(!s) return {name:"", url:""};

    const pipe = s.indexOf("|");
    if(pipe !== -1){
      return {
        name: s.slice(0, pipe).trim(),
        url: s.slice(pipe+1).trim()
      };
    }

    const parts = s.split(/\s+/);
    let url = "";
    for(let i=parts.length-1;i>=0;i--){
      if(/^https?:\/\//i.test(parts[i])){
        url = parts[i];
        parts.splice(i,1);
        break;
      }
    }
    return { name: parts.join(" ").trim(), url: url.trim() };
  }

  /* ---------- BUILD TOKENS (keeps your exact order) ---------- */
  function tokenise(raw){
    const lines = (raw || "").split(/\r?\n/);
    const tokens = [];

    for(let i=0;i<lines.length;i++){
      const line = (lines[i] || "").trim();
      if(!line) continue;

      const m = line.match(ID_RE);
      if(!m) continue;

      const tag = m[1];
      const rest = (m[2] || "").trim();

      if(tag === "V"){
        if(rest) tokens.push({type:"video", id:rest});
        continue;
      }

      if(tag === "G"){
        if(rest) tokens.push({type:"groove", url:rest});
        continue;
      }

      if(tag === "BR"){
        const n = parseFloat(rest);
        tokens.push({type:"br", rem: (isFinite(n) ? n : 1)});
        continue;
      }

      if(tag === "HR"){
        tokens.push({type:"hr"});
        continue;
      }

      if(tag === "H"){
        tokens.push({type:"h", text:rest});
        continue;
      }

      if(tag === "A"){
        const au = parseAudio(rest);
        if(au.url) tokens.push({type:"audio", name:au.name, url:au.url});
        continue;
      }

      if(tag === "T"){
        const textLines = [];
        let ytLine = null;

        if(rest) textLines.push(rest);

        let j = i + 1;
        while(j < lines.length){
          const nxtRaw = lines[j] || "";
          const nxtTrim = nxtRaw.trim();

          if(nxtTrim && ID_RE.test(nxtTrim)) break;

          if(nxtTrim && (nxtTrim.includes("youtube.com") || nxtTrim.includes("youtu.be")) && !ytLine){
            ytLine = nxtTrim;
          }else{
            textLines.push(nxtRaw.replace(/\s+$/,""));
          }
          j++;
        }

        while(textLines.length && String(textLines[0]).trim() === "") textLines.shift();
        while(textLines.length && String(textLines[textLines.length-1]).trim() === "") textLines.pop();

        tokens.push({type:"text", lines:textLines, yt:ytLine});
        i = j - 1;
        continue;
      }
    }

    return tokens;
  }

  function render(tokens){
    const out = document.createElement("div");
    out.className = "vault-seq";

    tokens.forEach(t=>{
      if(t.type === "video"){
        const wrap = document.createElement("div");
        wrap.className = "vault-video-wrapper";
        wrap.innerHTML =
          `<div class="vault-video-embed">
             <iframe
               src="https://iframe.mediadelivery.net/embed/${encodeURIComponent(BUNNY_LIB)}/${encodeURIComponent(t.id)}?autoplay=false&loop=false&muted=false&preload=false&responsive=true"
               loading="lazy"
               allowfullscreen="true"
               allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;">
             </iframe>
           </div>`;
        out.appendChild(wrap);
        return;
      }

      if(t.type === "br"){
        const s = document.createElement("div");
        s.className = "vault-spacer";
        s.style.height = (t.rem || 1) + "rem";
        out.appendChild(s);
        return;
      }

      if(t.type === "hr"){
        const d = document.createElement("div");
        d.className = "vault-divider";
        out.appendChild(d);
        return;
      }

      if(t.type === "h"){
        const h = document.createElement("div");
        h.className = "vault-heading";
        h.textContent = t.text || "";
        out.appendChild(h);
        return;
      }

      if(t.type === "text"){
        if(t.yt){
          const row = document.createElement("div");
          row.className = "vault-info-row";

          const main = document.createElement("div");
          main.className = "vault-info vault-info-main";
          main.innerHTML = (t.lines || []).map(l=>{
            const s = String(l || "");
            return s.trim() === "" ? "<div>&nbsp;</div>" : `<div>${parseBold(s)}</div>`;
          }).join("");

          const btn = document.createElement("button");
          btn.className = "vault-info-yt";
          btn.type = "button";
          btn.addEventListener("click", ()=>openYT(t.yt));
          btn.innerHTML = `<img src="${YT_LOGO}" class="vault-yt-logo" alt="YouTube">`;

          row.appendChild(main);
          row.appendChild(btn);
          out.appendChild(row);
        }else{
          const box = document.createElement("div");
          box.className = "vault-info vault-info-full";
          box.innerHTML = (t.lines || []).map(l=>{
            const s = String(l || "");
            return s.trim() === "" ? "<div>&nbsp;</div>" : `<div>${parseBold(s)}</div>`;
          }).join("");
          out.appendChild(box);
        }
        return;
      }

      if(t.type === "groove"){
        const wrap = document.createElement("div");
        wrap.className = "vault-groove-wrap";

        const player = document.createElement("div");
        player.className = "vault-groove-player";

        const iframe = document.createElement("iframe");
        iframe.src = normaliseGrooveUrl(t.url);
        iframe.loading = "lazy";
        iframe.setAttribute("frameborder","0");
        iframe.setAttribute("allow","autoplay");

        /* IMPORTANT: small default height, then GrooveEmbed auto-resizes it */
        iframe.style.height = "150px";

        player.appendChild(iframe);
        wrap.appendChild(player);
        out.appendChild(wrap);
        return;
      }

      if(t.type === "audio"){
        const aWrap = document.createElement("div");
        aWrap.className = "vault-audio-wrap";

        const node = document.createElement("div");
        node.className = "vault-audio";
        node.setAttribute("data-audio-title", (t.name||"").trim());
        node.setAttribute("data-audio-src", (t.url||"").trim());

        const title = document.createElement("div");
        title.className = "vault-audio-title";
        title.textContent = (t.name||"").trim() || "Audio";
        node.appendChild(title);

        aWrap.appendChild(node);
        out.appendChild(aWrap);

        try{
          if(window.VaultAudioPlayer && typeof window.VaultAudioPlayer.scan === "function"){
            window.VaultAudioPlayer.scan();
          }
        }catch(e){}

        return;
      }
    });

    return out;
  }

  function hasMarkers(text){
    return /(^|\n)\s*(V>|G>|T>|A>|BR>|H>|HR>)/.test(text || "");
  }

  function run(){
    document.querySelectorAll(".sqs-block-code,.sqs-block-markdown").forEach(block=>{
      if(block.__vaultDone) return;

      const content = block.querySelector(".sqs-block-content") || block;
      const raw = (content.textContent || "").trim();
      if(!raw || !hasMarkers(raw)) return;

      const tokens = tokenise(raw);
      if(!tokens.length) return;

      const out = render(tokens);
      block.__vaultDone = true;
      block.parentNode.replaceChild(out, block);
    });
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();

  setTimeout(run, 600);
  setTimeout(run, 2000);

  /* ---------- GrooveEmbed auto-resize via postMessage ---------- */
  window.addEventListener("message", function(event){
    if(event.origin !== GROOVE_ORIGIN) return;
    const data = event.data || {};
    if(data.type !== "grooveHeight") return;

    document.querySelectorAll(".vault-groove-player iframe").forEach(function(iframe){
      if(iframe.contentWindow === event.source){
        iframe.style.height = (data.height || 150) + "px";
      }
    });
  });

  window.vaultRender = run;  // Added line for the new one-page lesson UI
  
})();
