/* vault-metrics.js
   Purpose:
   - Track practice time as "sessions" on protected pages.
   - Session ends when:
     • tab becomes hidden
     • page unloads
     • user is idle for 10 minutes
   - If session ended due to idle, any next activity starts a new session without reload.
   - DOES NOT write lastLoginAt/loginCount (do that only on the /members sign-in success handler).
*/

(function(){
  'use strict';

  var PROTECTED_ONLY = true;
  var IDLE_MS = 10 * 60 * 1000;      // 10 minutes
  var TICK_MS = 30 * 1000;           // every 30 seconds
  var TAB_LOCK_TTL_MS = 45 * 1000;   // consider a tab "active leader" if it refreshed lock within 45s

  // --- Guard: only run on protected pages if requested ---
  function isProtectedPage(){
    if (!PROTECTED_ONLY) return true;
    return document.documentElement && document.documentElement.dataset && document.documentElement.dataset.protected === 'true';
  }

  function hasFirebase(){
    return (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore);
  }

  function nowMs(){ return Date.now(); }

  function clampToSeconds(ms){
    var s = Math.floor(ms / 1000);
    return s < 0 ? 0 : s;
  }

  // --- Multi-tab leader lock (prevents double counting across multiple open tabs) ---
  var tabId = 'tab_' + Math.random().toString(36).slice(2) + '_' + nowMs();
  var LOCK_KEY = 'vault_metrics_active_tab';

  function readLock(){
    try {
      var raw = localStorage.getItem(LOCK_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch(e) {
      return null;
    }
  }

  function writeLock(){
    try {
      localStorage.setItem(LOCK_KEY, JSON.stringify({ tabId: tabId, ts: nowMs() }));
    } catch(e) {}
  }

  function isLeader(){
    var lock = readLock();
    if (!lock || !lock.tabId || !lock.ts) return true;
    if (lock.tabId === tabId) return true;
    // If other tab hasn't refreshed lock recently, take over
    if (nowMs() - lock.ts > TAB_LOCK_TTL_MS) return true;
    return false;
  }

  // --- Device helpers ---
  function getDeviceType(){
    try {
      var w = window.innerWidth || 1024;
      // Simple heuristic: narrow screens behave like mobile
      if (w <= 768) return 'mobile';
      return 'desktop';
    } catch(e) {
      return 'other';
    }
  }

  function getDeviceEmoji(type){
    if (type === 'mobile') return '📱';
    if (type === 'desktop') return '🖥️';
    return '💠';
  }

  // --- State ---
  var unsubAuth = null;
  var user = null;

  var sessionActive = false;
  var sessionStartedAtMs = 0;
  var lastTickAtMs = 0;
  var lastActivityAtMs = 0;

  var endedByIdle = false;
  var tickTimer = null;
  var idleCheckTimer = null;

  // Firestore references (resolved per-user)
  function metricsDocRef(uid){
    // Your chosen structure:
    // users/<uid>/metrics/stats  (doc id "stats")
    return firebase.firestore().doc('users/' + uid + '/metrics/stats');
  }

  function safeMergeSet(ref, data){
    return ref.set(data, { merge: true });
  }

  function safeIncSeconds(ref, seconds){
    if (!seconds || seconds <= 0) return Promise.resolve();
    return safeMergeSet(ref, { totalSeconds: firebase.firestore.FieldValue.increment(seconds) });
  }

  function writeDeviceInfoOnce(ref){
    var type = getDeviceType();
    var emoji = getDeviceEmoji(type);
    return safeMergeSet(ref, {
      lastDeviceType: type,
      lastDeviceEmoji: emoji
    });
  }

  // --- Daily practice tracking (for "days practiced this week") ---
  function getTodayDateKey(){
    // Return YYYY-MM-DD in Brisbane timezone
    var now = new Date();
    var offset = 10 * 60; // Brisbane is UTC+10 (ignoring DST for simplicity)
    var localMs = now.getTime() + (offset * 60 * 1000);
    var localDate = new Date(localMs);
    var y = localDate.getUTCFullYear();
    var m = String(localDate.getUTCMonth() + 1).padStart(2, '0');
    var d = String(localDate.getUTCDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function recordDailyPractice(ref){
    var dateKey = getTodayDateKey();
    var dailyRef = ref.parent.doc('daily').collection('sessions').doc(dateKey);
    
    // Set doc with merge to mark this day as practiced
    return dailyRef.set({
      practiced: true,
      lastSessionAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  function stopTimers(){
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    if (idleCheckTimer) { clearInterval(idleCheckTimer); idleCheckTimer = null; }
  }

  function endSession(reason){
    if (!sessionActive) return;

    sessionActive = false;
    stopTimers();

    var endMs = nowMs();
    var elapsedMs = endMs - lastTickAtMs;
    var elapsedSeconds = clampToSeconds(elapsedMs);

    endedByIdle = (reason === 'idle');

    // Flush any remaining seconds since last tick
    if (user && hasFirebase() && elapsedSeconds > 0 && isLeader()){
      try {
        var ref = metricsDocRef(user.uid);
        safeIncSeconds(ref, elapsedSeconds);
      } catch(e) {}
    }
  }

  function startSession(){
    if (!user || !hasFirebase()) return;
    if (!isProtectedPage()) return;

    // Only leader tab should write time
    if (!isLeader()) return;

    // Refresh lock immediately
    writeLock();

    sessionActive = true;
    endedByIdle = false;

    sessionStartedAtMs = nowMs();
    lastTickAtMs = sessionStartedAtMs;
    lastActivityAtMs = sessionStartedAtMs;

    var ref = metricsDocRef(user.uid);

    // Ensure doc exists and record device info (cheap + useful)
    writeDeviceInfoOnce(ref);
    
    // Record that we practiced today (for "days practiced this week" stat)
    recordDailyPractice(ref);

    // Tick: add elapsed seconds every 30 seconds
    tickTimer = setInterval(function(){
      if (!sessionActive) return;

      // Keep leadership fresh
      writeLock();

      // If we lost leadership, stop counting in this tab
      if (!isLeader()){
        endSession('lost-leader');
        return;
      }

      var t = nowMs();
      var elapsedSeconds = clampToSeconds(t - lastTickAtMs);
      lastTickAtMs = t;

      // Add time
      try {
        safeIncSeconds(ref, elapsedSeconds);
      } catch(e) {}

    }, TICK_MS);

    // Idle check: end session if no activity for 10 min
    idleCheckTimer = setInterval(function(){
      if (!sessionActive) return;
      var idleFor = nowMs() - lastActivityAtMs;
      if (idleFor >= IDLE_MS){
        endSession('idle');
      }
    }, 5 * 1000);
  }

  function onActivity(){
    lastActivityAtMs = nowMs();

    // If we ended due to idle, restart without reload on next activity
    if (!sessionActive && endedByIdle){
      // Take leadership if possible; otherwise ignore
      if (isLeader()){
        startSession();
      }
    }
  }

  function bindActivityListeners(){
    var opts = { passive: true };
    ['mousemove','keydown','click','scroll','touchstart'].forEach(function(evt){
      window.addEventListener(evt, onActivity, opts);
    });
  }

  function bindVisibilityAndUnload(){
    document.addEventListener('visibilitychange', function(){
      if (document.hidden){
        endSession('hidden');
      } else {
        // Returning to tab: start a new session only if user is logged in
        if (user && !sessionActive){
          startSession();
        }
      }
    });

    // pagehide is more reliable on mobile than beforeunload
    window.addEventListener('pagehide', function(){
      endSession('unload');
    });

    window.addEventListener('beforeunload', function(){
      endSession('unload');
    });
  }

  function initAuth(){
    if (!hasFirebase()) return;

    // Listen for auth state, but do NOT treat it as a "login event".
    unsubAuth = firebase.auth().onAuthStateChanged(function(u){
      user = u || null;

      // Stop any running session if logged out
      if (!user){
        endSession('logout');
        return;
      }

      // Logged in: start session if page is visible
      if (!document.hidden){
        startSession();
      }
    });
  }

  function boot(){
    if (!isProtectedPage()) return;
    if (!hasFirebase()) return;

    bindActivityListeners();
    bindVisibilityAndUnload();
    initAuth();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

