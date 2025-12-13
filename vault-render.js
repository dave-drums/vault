(function(){
  "use strict";
  if (window.__VAULT_RENDERER_LOADED__) return;
  window.__VAULT_RENDERER_LOADED__ = true;

  var CFG = window.VAULT_CONFIG || {};
  var BUNNY_LIBRARY_ID = CFG.bunnyLibraryId || "556221";
  var GROOVE_ORIGIN = CFG.grooveOrigin || "https://groove.davedrums.com.au";
  var GROOVE_EMBED_PATH = CFG.grooveEmbedPath || "/GrooveEmbed.html";
  var YT_LOGO_SRC = CFG.youtubeLogoSrc || "/s/youtube-logo.png";

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

  function hasVaultMarkers(rawText){
    return /(^|\n)\s*(V>|G>)/.test(rawText);
  }

  function parseItems(rawText){
    var lines = rawText.split(/\r?\n/);
    var items = [];

    for(var i=0;i<lines.length;i++){
      var line = (lines[i] || "").trim();
      if(!line) continue;

      // VIDEO: Bunny Embed (ID only)
      if(line.indexOf("V>") === 0){
        var id = line.replace(/^V>\s*/,"").trim();
        if(!id) continue;

        var embedUrl =
          "https://iframe.mediadelivery.net/embed/" +
          encodeURIComponent(BUNNY_LIBRARY_ID) + "/" +
          encodeURIComponent(id) +
          "?autoplay=false&loop=false&muted=false&preload=false&responsive=true";

        var infoLines = [];
        var j = i + 1;

        while(j < lines.length){
          var nextLine = (lines[j] || "").trim();
          if(!nextLine || nextLine.indexOf("V>") === 0 || nextLine.indexOf("G>") === 0) break;
          infoLines.push(nextLine);
          j++;
        }

        items.push({ type:"video", url:embedUrl, infoLines:infoLines });
        i = j - 1;
        continue;
      }

      // GROOVE BLOCK
      if(line.indexOf("G>") === 0){
        var title = line.replace(/^G>\s*/,"").trim();
        var desc = "";
        var k = i + 1;

        // skip empty lines after G>
        while(k < lines.length && !(lines[k] || "").trim()) k++;

        // optional description line: must NOT be another block and must NOT be a URL
        if(
          k < lines.length &&
          (lines[k] || "").trim().indexOf("G>") !== 0 &&
          (lines[k] || "").trim().indexOf("V>") !== 0 &&
          !/^https?:\/\//i.test((lines[k] || "").trim())
        ){
          desc = (lines[k] || "").trim();
          k++;
        }

        // collect GrooveScribe URLs
        var gsUrls = [];
        while(k < lines.length){
          var qLine = (lines[k] || "").trim();
          if(!qLine){ k++; continue; }
          if(qLine.indexOf("G>") === 0 || qLine.indexOf("V>") === 0) break;
          gsUrls.push(qLine);
          k++;
        }

        items.push({ type:"groove", title:title, desc:desc, urls:gsUrls });
        i = k - 1;
        continue;
      }
    }

    return items;
  }

  function appendInfoLines(target, label, detail, extras){
    [label, detail].concat(extras || []).forEach(function(txt){
      if(!txt) return;
      var d = document.createElement("div");
      d.textContent = txt;
      target.appendChild(d);
    });
  }

  function normaliseGrooveUrl(singleUrl){
    var fixedUrl = singleUrl;
    try{
      var parsed = new URL(singleUrl);
      if(parsed.hostname === "groove.davedrums.com.au" && (parsed.pathname === "/" || parsed.pathname === "")){
        fixedUrl = GROOVE_ORIGIN + GROOVE_EMBED_PATH + parsed.search;
      }
    }catch(e){
      fixedUrl = singleUrl;
    }
    return fixedUrl;
  }

  function renderItems(items){
    var container = document.createElement("div");

    items.forEach(function(item){

      // VIDEO
      if(item.type === "video"){
        var vWrap = document.createElement("div");
        vWrap.className = "vault-video-wrapper";

        var vEmbed = document.createElement("div");
        vEmbed.className = "vault-video-embed";

        var vIframe = document.createElement("iframe");
        vIframe.src = item.url;
        vIframe.loading = "lazy";
        vIframe.setAttribute("allowfullscreen", "true");
        vIframe.setAttribute("allow", "accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;");
        vEmbed.appendChild(vIframe);
        vWrap.appendChild(vEmbed);

        // Parse info lines: first = label, second = detail, any line with YouTube is YT link, rest extra
        var labelLine = null, detailLine = null, ytLine = null, extraLines = [];

        (item.infoLines || []).forEach(function(txt){
          if(!txt) return;

          var isYT = /youtu\.?be|youtube\.com/i.test(txt) ||
            (/^https?:\/\//i.test(txt) && txt.indexOf("youtu") !== -1);

          if(isYT && !ytLine){ ytLine = txt; return; }

          if(!labelLine) labelLine = txt;
          else if(!detailLine) detailLine = txt;
          else extraLines.push(txt);
        });

        if(labelLine || detailLine || extraLines.length || ytLine){
          if(ytLine){
            var row = document.createElement("div");
            row.className = "vault-info-row";

            var left = document.createElement("div");
            left.className = "vault-info vault-info-main";
            appendInfoLines(left, labelLine, detailLine, extraLines);
            row.appendChild(left);

            var right = document.createElement("div");
            right.className = "vault-info vault-info-yt";

            var ytLink = document.createElement("a");
            ytLink.href = "javascript:void(0)";
            ytLink.addEventListener("click", function(){ openYouTubeLightbox(ytLine); });

            var logo = document.createElement("img");
            logo.src = YT_LOGO_SRC;
            logo.alt = "YouTube";
            logo.className = "vault-yt-logo";

            ytLink.appendChild(logo);
            right.appendChild(ytLink);
            row.appendChild(right);

            vWrap.appendChild(row);
          }else{
            var full = document.createElement("div");
            full.className = "vault-info vault-info-full";
            appendInfoLines(full, labelLine, detailLine, extraLines);
            vWrap.appendChild(full);
          }
        }

        container.appendChild(vWrap);
      }

      // GROOVE
      if(item.type === "groove"){
        var gWrap = document.createElement("div");
        gWrap.className = "vault-wrapper";

        var levelDiv = document.createElement("div");
        levelDiv.className = "vault-exercise";

        if(item.title){
          var strong = document.createElement("strong");
          strong.textContent = item.title;
          levelDiv.appendChild(strong);
        }
        if(item.desc){
          levelDiv.appendChild(document.createElement("br"));
          levelDiv.appendChild(document.createTextNode(item.desc));
        }

        gWrap.appendChild(levelDiv);

        var playerDiv = document.createElement("div");
        playerDiv.className = "vault-groove-player";

        (item.urls || []).forEach(function(singleUrl, idx){
          var gsIframe = document.createElement("iframe");
          gsIframe.src = normaliseGrooveUrl(singleUrl);
          gsIframe.width = "100%";
          gsIframe.height = "150";
          gsIframe.loading = "lazy";
          gsIframe.setAttribute("frameborder", "0");
          gsIframe.setAttribute("allow", "autoplay");
          if(idx > 0) gsIframe.style.marginTop = "1rem";
          playerDiv.appendChild(gsIframe);
        });

        gWrap.appendChild(playerDiv);
        container.appendChild(gWrap);
      }
    });

    return container;
  }

  function runVaultRenderer(){
    // Squarespace sometimes injects content after DOM ready; run once now and once after a short delay.
    var blocks = document.querySelectorAll(".sqs-block-code, .sqs-block-markdown");
    blocks.forEach(function(block){
      if(block.__vaultProcessed) return;

      var content = block.querySelector(".sqs-block-content") || block;
      var rawText = (content.textContent || "").trim();
      if(!rawText || !hasVaultMarkers(rawText)) return;

      var items = parseItems(rawText);
      if(!items.length) return;

      var container = renderItems(items);
      block.__vaultProcessed = true;
      block.parentNode.replaceChild(container, block);
    });
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", runVaultRenderer);
  }else{
    runVaultRenderer();
  }
  setTimeout(runVaultRenderer, 600);

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
