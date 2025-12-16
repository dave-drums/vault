(function () {
  "use strict";

  function safeNow() {
    return Date.now();
  }

  function getDeviceType() {
    // Simple heuristic
    var w = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    if (w <= 768) return "mobile";
    return "desktop";
  }

  function getDeviceEmoji(type) {
    if (type === "mobile") return "📱";
    if (type === "desktop") return "🖥️";
    return "💡";
  }

  function run() {
    try {
      if (document.documentElement.dataset.protected !== "true") return;
      if (typeof firebase === "undefined" || !firebase.auth || !firebase.firestore) return;

      var auth = firebase.auth();
      var db = firebase.firestore();

      var sessionStartMs = 0;
      var committed = false;

      function statsRef(uid) {
        return db.collection("users").doc(uid).collection("metrics").doc("stats");
      }

      function commitSession(uid) {
        if (!uid) return;
        if (committed) return;

        var nowMs = safeNow();
        if (!sessionStartMs) sessionStartMs = nowMs;

        var seconds = Math.max(0, Math.round((nowMs - sessionStartMs) / 1000));
        if (seconds <= 0) {
          committed = true;
          return;
        }

        committed = true;

        // Use increment so it’s safe with multiple tabs
        statsRef(uid).set(
          {
            totalSeconds: firebase.firestore.FieldValue.increment(seconds)
          },
          { merge: true }
        ).catch(function () {});
      }

      auth.onAuthStateChanged(function (user) {
        if (!user) return;

        sessionStartMs = safeNow();
        committed = false;

        var type = getDeviceType();
        var emoji = getDeviceEmoji(type);

        // Count a login once per page load/session
        statsRef(user.uid).set(
          {
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
            loginCount: firebase.firestore.FieldValue.increment(1),
            lastDeviceType: type,
            lastDeviceEmoji: emoji
          },
          { merge: true }
        ).catch(function () {});

        // Commit time when leaving or hiding the page
        window.addEventListener("beforeunload", function () {
          commitSession(user.uid);
        });

        document.addEventListener("visibilitychange", function () {
          if (document.visibilityState === "hidden") {
            commitSession(user.uid);
          }
        });
      });
    } catch (e) {
      // no-op
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
