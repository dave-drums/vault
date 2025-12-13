/*!
 * vault-render.js (Dave Drums – Practice Vault)
 * Identifier-driven renderer with full placement control.
 *
 * Supported identifiers (must be at line start):
 *  V> <bunny_video_id>
 *  G> <groovescribe_url_or_query>
 *  T> <text...>          (collects following lines until next identifier; YouTube link line becomes YT bubble)
 *  A> <name> | <url>     (preferred) OR A> <name> <url>
 *  BR> <number>          (vertical space in rem)
 *  H> <heading>
 *  HR>
 *
 * Config (optional) via window.VAULT_CONFIG:
 *  bunnyLibraryId, grooveOrigin, grooveEmbedPath, youtubeLogoSrc, debug
 */

(function(){
  "use strict";
  if (window.__VAULT_RENDERER_LOADED__) return;
  window.__VAULT_RENDERER_LOADED__ = true;

  var CFG = window.VAULT_CONFIG || {};
  var BUNNY_LIBRARY_ID = CFG.bunnyLibraryId || "556221";
  var GROOVE_ORIGIN = CFG.grooveOrigin || "https://groove.davedrums.com.au";
  var GROOVE_EMBED_PATH = CFG.grooveEmbedPath || "/GrooveEmbed.html";
  var YT_LOGO_SRC = CFG.youtubeLogoSrc || "/s/youtube-logo.png";
  var DEBUG = !!CFG.debug;

  var ID_RE = /^(V|G|T|A|BR|H|HR)>\s*(.*)$/;

  function log(){
    if(!DEBUG) return;
    try{ console.log.apply(console, arguments); }catch(e){}
  }

  function hasMarkers(text){
    return /(^|\n)\s*(V>|G>|T>|A>|BR>|H>|HR>)/.test(text || "");
  }

  /* ---------- YouTube helpers ---------- */
  function isYouTubeLine(txt){
    if(!txt) return false;
    return /youtu\.?be|youtube\.com/i.test(txt) || (/^https?:\/\//i.test(txt) && txt.indexOf("youtu") !== -1);
  }

  function convertYouTubeUrlToEmbed(originalUrl){
    try{
      var urlObj = new URL(originalUrl);
      var host = (urlObj.hostname || "").toLowerCase();
      var videoId = null;

      if(host.indexOf("youtu.be") !== -1){
        videoId = (urlObj.pathname || "").replace("/","").split("/")[0];
      }else if(host.indexOf("youtube.com") !== -1){
        videoId = urlObj.searchParams.get("v");
      }
      if(!videoId) return null;
      return "https://www.youtube.com/embed/" + videoId;
    }catch(e){
      return null;
    }
  }

  function openYouTubeLightbox(originalUrl){
    var embedUrl = convertYouTubeUrlToEmbed(originalUrl);
    if(!embedUrl){
      window.open(originalUrl, "_blank");
      return;
    }

    var overlay = document.createElement("div");
    overlay.className = "vault-yt-overlay";

    var inner = document.createElement("div");
    inner.className = "vault-yt-inner";

    var closeBtn = document.createElement("button");
    closeBtn.className = "vault-yt-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", function(){
      if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });

    var wrap = document.createElement("div");
    wrap.className = "vault-yt-iframe-wrap";

    var iframe = document.createElement("iframe");
    iframe.src = embedUrl + (embedUrl.indexOf("?") === -1 ? "?rel=0" : "&rel=0");
    iframe.setAttribute("allowfullscreen", "true");
    iframe.setAttribute("allow", "accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;");

    wrap.appendChild(iframe);
    inner.appendChild(closeBtn);
    inner.appendChild(wrap);
    overlay.appendChild(inner);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function(e){
      if(e.target === overlay && overlay.parentNode){
        overlay.parentNode.removeChild(overlay);
      }
    });

    function escHandler(e){
      if(e.key === "Escape"){
        if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
        document.removeEventListener("keydown", escHandler);
      }
    }
    document.addEventListener("keydown", escHandler);
  }

  /* ---------- Normalisers ---------- */
  function normaliseGrooveUrl(input){
    var u = (input || "").trim();
    if(!u) return "";

    // Query-only form: ?TimeSig=...
    if(u[0] === "?"){
      return GROOVE_ORIGIN + GROOVE_EMBED_PATH + u;
    }

    // If it's a full URL to your groove host root, convert to GrooveEmbed.html
    try{
      var parsed = new URL(u);
      if(parsed.hostname === "groove.davedrums.com.au" && (parsed.pathname === "/" || parsed.pathname === "")){
        return GROOVE_ORIGIN + GROOVE_EMBED_PATH + parsed.search;
      }
    }catch(e){
      // not a URL, leave as-is (could be relative)
    }

    return u;
  }

  function bunnyVideoUrl(id){
    return (
      "https://iframe.mediadelivery.net/embed/" +
      encodeURIComponent(BUNNY_LIBRARY_ID) + "/" +
      encodeURIComponent(id) +
      "?autoplay=false&loop=false&muted=false&preload=false&responsive=true"
    );
  }

  function parseAudioLine(rest){
    // Preferred: Name | URL
    var s = (rest || "").trim();
    if(!s) return { name:"", url:"" };

    var pipeIdx = s.indexOf("|");
    if(pipeIdx !== -1){
      var name = s.slice(0, pipeIdx).trim();
      var url = s.slice(pipeIdx + 1).trim();
      return { name:name, url:url };
    }

    // Fallback: last token that looks like a URL is the URL, everything before is name
    var parts = s.split(/\s+/);
    var url = "";
    for(var i=parts.length-1;i>=0;i--){
      if(/^https?:\/\//i.test(parts[i])){
        url = parts[i];
        parts.splice(i, 1);
        break;
      }
    }
    return { name: parts.join(" ").trim(), url: (url || "").trim() };
  }

  /* ---------- Tokeniser ---------- */
  function tokenise(rawText){
    var lines = (rawText || "").split(/\r?\n/);
    var tokens = [];

    for(var i=0;i<lines.length;i++){
      var raw = lines[i] || "";
      var line = raw.trim();
      if(!line) continue;

      var m = line.match(ID_RE);
      if(!m) continue;

      var tag = m[1];
      var rest = (m[2] || "").trim();

      if(tag === "HR"){
        tokens.push({ type:"hr" });
        continue;
      }

      if(tag === "BR"){
        var n = parseFloat(rest);
        if(!isFinite(n)) n = 1;
        tokens.push({ type:"br", rem:n });
        continue;
      }

      if(tag === "H"){
        tokens.push({ type:"h", text:rest });
        continue;
      }

      if(tag === "V"){
        if(!rest) continue;
        tokens.push({ type:"video", id:rest });
        continue;
      }

      if(tag === "G"){
        if(!rest) continue;
        tokens.push({ type:"groove", url:rest });
        continue;
      }

      if(tag === "A"){
        var au = parseAudioLine(rest);
        if(!au.url) continue;
        tokens.push({ type:"audio", name:au.name, url:au.url });
        continue;
      }

      if(tag === "T"){
        // Collect multi-line text until the next identifier
        var textLines = [];
        var ytLine = null;

        if(rest) textLines.push(rest);

        var j = i + 1;
        while(j < lines.length){
          var nxtRaw = lines[j] || "";
          var nxt = nxtRaw.trim();

          if(nxt && ID_RE.test(nxt)) break; // next identifier

          if(nxt === ""){
            // preserve blank lines inside bubble
            textLines.push("");
            j++;
            continue;
          }

          if(isYouTubeLine(nxt) && !ytLine){
            ytLine = nxt;
          }else{
            textLines.push(nxtRaw.replace(/\s+$/,""));
          }
          j++;
        }

        tokens.push({ type:"text", lines:textLines, yt:ytLine });
        i = j - 1;
        continue;
      }
    }

    return tokens;
  }

  /* ---------- Renderer ---------- */
  function el(tag, cls){
    var x = document.createElement(tag);
    if(cls) x.className = cls;
    return x;
  }

  function renderTokens(tokens){
    var container = el("div", "vault-seq");

    tokens.forEach(function(t){

      if(t.type === "h"){
        var h = el("div", "vault-heading");
        h.textContent = t.text || "";
        container.appendChild(h);
        return;
      }

      if(t.type === "hr"){
        container.appendChild(el("div", "vault-divider"));
        return;
      }

      if(t.type === "br"){
        var sp = el("div", "vault-spacer");
        sp.style.height = (t.rem || 1) + "rem";
        container.appendChild(sp);
        return;
      }

      if(t.type === "video"){
        var vWrap = el("div", "vault-video-wrapper");
        var vEmbed = el("div", "vault-video-embed");

        var vIframe = document.createElement("iframe");
        vIframe.src = bunnyVideoUrl(t.id);
        vIframe.loading = "lazy";
        vIframe.setAttribute("allowfullscreen", "true");
        vIframe.setAttribute("allow", "accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;");

        vEmbed.appendChild(vIframe);
        vWrap.appendChild(vEmbed);
        container.appendChild(vWrap);
        return;
      }

      if(t.type === "groove"){
        var gWrap = el("div", "vault-groove-only");
        var player = el("div", "vault-groove-player");

        var gsIframe = document.createElement("iframe");
        gsIframe.src = normaliseGrooveUrl(t.url);
        gsIframe.width = "100%";
        gsIframe.height = "150";
        gsIframe.loading = "lazy";
        gsIframe.setAttribute("frameborder", "0");
        gsIframe.setAttribute("allow", "autoplay");

        player.appendChild(gsIframe);
        gWrap.appendChild(player);
        container.appendChild(gWrap);
        return;
      }

      if(t.type === "text"){
        if(t.yt){
          var row = el("div", "vault-info-row");
          var left = el("div", "vault-info vault-info-main");
          (t.lines || []).forEach(function(line){
            var d = document.createElement("div");
            if(line === "") d.innerHTML = "&nbsp;";
            else d.textContent = line;
            left.appendChild(d);
          });
          row.appendChild(left);

          var right = el("div", "vault-info vault-info-yt");
          var a = document.createElement("a");
          a.href = "javascript:void(0)";
          a.addEventListener("click", function(){ openYouTubeLightbox(t.yt); });

          var img = document.createElement("img");
          img.src = YT_LOGO_SRC;
          img.alt = "YouTube";
          img.className = "vault-yt-logo";

          a.appendChild(img);
          right.appendChild(a);
          row.appendChild(right);

          container.appendChild(row);
        }else{
          var bubble = el("div", "vault-info vault-info-full");
          (t.lines || []).forEach(function(line){
            var d2 = document.createElement("div");
            if(line === "") d2.innerHTML = "&nbsp;";
            else d2.textContent = line;
            bubble.appendChild(d2);
          });
          container.appendChild(bubble);
        }
        return;
      }

      if(t.type === "audio"){
        var aWrap = el("div", "vault-audio-wrap");
        var node = el("div", "vault-audio");
        node.setAttribute("data-audio-title", (t.name || "").trim());
        node.setAttribute("data-audio-src", (t.url || "").trim());

        var title = el("div", "vault-audio-title");
        title.textContent = (t.name || "").trim() || "Audio";
        node.appendChild(title);

        var fallback = document.createElement("a");
        fallback.className = "vault-audio-fallback";
        fallback.href = t.url;
        fallback.target = "_blank";
        fallback.rel = "noopener";
        fallback.textContent = "Open audio";
        node.appendChild(fallback);

        aWrap.appendChild(node);
        container.appendChild(aWrap);

        try{
          if(window.VaultAudioPlayer && typeof window.VaultAudioPlayer.scan === "function"){
            window.VaultAudioPlayer.scan();
          }else if(typeof window.__vaultAudioScan === "function"){
            window.__vaultAudioScan();
          }
        }catch(e){}

        return;
      }
    });

    return container;
  }

  /* ---------- Block processor ---------- */
  function getBlockText(block){
    var content = block.querySelector(".sqs-block-content") || block;
    return (content.textContent || "").trim();
  }

  function runRenderer(){
    var blocks = document.querySelectorAll(".sqs-block");
    blocks.forEach(function(block){
      if(block.__vaultProcessed) return;

      var rawText = getBlockText(block);
      if(!rawText || !hasMarkers(rawText)) return;

      var tokens = tokenise(rawText);
      if(!tokens.length) return;

      log("[Vault] tokens:", tokens);

      var container = renderTokens(tokens);
      block.__vaultProcessed = true;
      block.parentNode.replaceChild(container, block);
    });
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", runRenderer);
  }else{
    runRenderer();
  }
  setTimeout(runRenderer, 600);
  setTimeout(runRenderer, 2000);

  /* ---------- GrooveScribe auto-resize via postMessage ---------- */
  window.addEventListener("message", function(event){
    if(event.origin !== GROOVE_ORIGIN) return;
    var data = event.data || {};
    if(data.type !== "grooveHeight") return;

    document.querySelectorAll(".vault-groove-player iframe").forEach(function(iframe){
      if(iframe.contentWindow === event.source){
        iframe.style.height = data.height + "px";
      }
    });
  });
})();
