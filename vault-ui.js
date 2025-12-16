(function(){
  // Vault metrics
  // Tracks:
  // - totalSeconds (accumulated practice time)
  // - loginCount (times logged in)
  // - lastLoginAt (timestamp of last login)
  // - lastDeviceType / lastDeviceEmoji (best-effort)
  //
  // Session rules:
  // - Session starts when user is authenticated AND page is visible
  // - Session ends when: tab hidden, unload, or idle for 10 minutes
  // - If a session ended due to idle, the next user activity restarts a new session without reload
  // - Updates totalSeconds every 30 seconds + flush on end

  if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) return;

  var auth = firebase.auth();
  var db = firebase.firestore();
  var FV = firebase.firestore.FieldValue;

  var USERS_COL = 'users';
  var METRICS_SUBCOL = 'metrics';
  var STATS_DOC = 'stats';

  var HEARTBEAT_MS = 30 * 1000;
  var IDLE_MS = 10 * 60 * 1000;

  var LOGIN_MARK_KEY = 'vault_login_mark';
  var PREV_UID_KEY = 'vault_prev_uid';

  function statsRef(uid){
    return db.collection(USERS_COL).doc(uid).collection(METRICS_SUBCOL).doc(STATS_DOC);
  }

  function getDevice(){
    var ua = (navigator.userAgent || '').toLowerCase();
    var isMobile = /android|iphone|ipad|ipod|mobile/.test(ua);
    if (isMobile) return { type:'mobile', emoji:'📱' };
    return { type:'desktop', emoji:'🖥️' };
  }

  function markLogin(user){
    // Only mark once per authenticated session for this tab.
    var key = LOGIN_MARK_KEY + ':' + user.uid;
    if (sessionStorage.getItem(key)) return Promise.resolve();
    sessionStorage.setItem(key, '1');
    sessionStorage.setItem(PREV_UID_KEY, user.uid);

    var device = getDevice();

    // Cleaner option:
    // Update lastLoginAt only when we increment loginCount (once per auth session).
    return statsRef(user.uid).set({
      loginCount: FV.increment(1),
      lastLoginAt: FV.serverTimestamp(),
      lastDeviceType: device.type,
      lastDeviceEmoji: device.emoji
    }, { merge:true });
  }

  function clearLoginMark(){
    var prev = sessionStorage.getItem(PREV_UID_KEY);
    if (prev) {
      sessionStorage.removeItem(LOGIN_MARK_KEY + ':' + prev);
      sessionStorage.removeItem(PREV_UID_KEY);
    }
  }

  var currentUser = null;

  var sessionRunning = false;
  var sessionEndedByIdle = false;

  var lastTickMs = 0;
  var lastActivityMs = 0;

  var heartbeatTimer = null;
  var idleTimer = null;

  function nowMs(){ return Date.now(); }

  function isPageVisible(){
    return !document.hidden;
  }

  function recordActivity(){
    lastActivityMs = nowMs();

    // Auto-restart after idle end, without requiring reload.
    if (currentUser && !sessionRunning && sessionEndedByIdle && isPageVisible()) {
      startSession('resume-after-idle');
    }
  }

  function startSession(reason){
    if (!currentUser) return;
    if (sessionRunning) return;
    if (!isPageVisible()) return;

    sessionRunning = true;
    sessionEndedByIdle = false;

    lastTickMs = nowMs();
    lastActivityMs = lastActivityMs || lastTickMs;

    // Heartbeat: add seconds in 30s blocks.
    heartbeatTimer = setInterval(onHeartbeat, HEARTBEAT_MS);

    // Idle watchdog: checks every 15s.
    idleTimer = setInterval(checkIdle, 15 * 1000);
  }

  function endSession(reason){
    if (!sessionRunning) return;
    sessionRunning = false;

    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    if (idleTimer) { clearInterval(idleTimer); idleTimer = null; }

    var ms = nowMs() - lastTickMs;
    lastTickMs = nowMs();

    var seconds = Math.floor(ms / 1000);
    if (seconds > 0 && currentUser) {
      // Flush any remaining seconds.
      statsRef(currentUser.uid).set({
        totalSeconds: FV.increment(seconds)
      }, { merge:true });
    }

    if (reason === 'idle') {
      sessionEndedByIdle = true;
    } else {
      sessionEndedByIdle = false;
    }
  }

  function onHeartbeat(){
    if (!sessionRunning || !currentUser) return;

    // If page became hidden, stop.
    if (!isPageVisible()) {
      endSession('hidden');
      return;
    }

    var ms = nowMs() - lastTickMs;
    lastTickMs = nowMs();

    var seconds = Math.floor(ms / 1000);
    if (seconds <= 0) return;

    statsRef(currentUser.uid).set({
      totalSeconds: FV.increment(seconds)
    }, { merge:true });
  }

  function checkIdle(){
    if (!sessionRunning || !currentUser) return;

    var idleFor = nowMs() - (lastActivityMs || nowMs());
    if (idleFor >= IDLE_MS) {
      endSession('idle');
    }
  }

  // Activity listeners (restart after idle without reload)
  ['mousemove','keydown','click','scroll','touchstart'].forEach(function(evt){
    window.addEventListener(evt, recordActivity, { passive:true });
  });

  // Visibility
  document.addEventListener('visibilitychange', function(){
    if (!currentUser) return;

    if (document.hidden) {
      endSession('hidden');
    } else {
      // Re-focus: treat as activity and start if needed.
      recordActivity();
      startSession('visible');
    }
  });

  // Unload
  window.addEventListener('beforeunload', function(){
    endSession('unload');
  });

  // Auth
  auth.onAuthStateChanged(function(user){
    if (!user) {
      endSession('logout');
      clearLoginMark();
      currentUser = null;
      return;
    }

    // If user changed, reset state cleanly.
    if (currentUser && currentUser.uid !== user.uid) {
      endSession('user-changed');
      clearLoginMark();
    }

    currentUser = user;

    markLogin(user).finally(function(){
      // Start timing immediately if visible.
      recordActivity();
      startSession('auth');
    });
  });

})();
