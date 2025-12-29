/* metrics.js
   Purpose: Track user sessions, login activity, and practice time
   Usage: Load on all pages after Firebase init
   
   Tracks:
   - lastLoginAt, loginCount (on login)
   - lastSeenAt (every 30 seconds while active)
   - totalSeconds (practice time accumulation)
   - Daily practice sessions
*/

(function(){
  'use strict';

  // Wait for Firebase
  function waitForFirebase(callback) {
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
      callback();
    } else {
      setTimeout(function() { waitForFirebase(callback); }, 100);
    }
  }

  waitForFirebase(function() {
    var db = firebase.firestore();
    var currentUser = null;

    // ============================================
    // SESSION TRACKING
    // ============================================

    var IDLE_MS = 10 * 60 * 1000;          // 10 minutes idle timeout
    var TICK_MS = 30 * 1000;               // 30 second heartbeat
    var TAB_LOCK_TTL_MS = 45 * 1000;       // 45 second tab lock TTL
    var LOCK_KEY = 'vault_metrics_active_tab';

    var tabId = 'tab_' + Math.random().toString(36).slice(2) + '_' + Date.now();
    var sessionActive = false;
    var sessionStartedAtMs = 0;
    var lastTickAtMs = 0;
    var lastActivityAtMs = 0;
    var endedByIdle = false;
    var tickTimer = null;
    var idleCheckTimer = null;

    function nowMs() { return Date.now(); }

    function clampToSeconds(ms) {
      var s = Math.floor(ms / 1000);
      return s < 0 ? 0 : s;
    }

    function readLock() {
      try {
        var raw = localStorage.getItem(LOCK_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch(e) {
        return null;
      }
    }

    function writeLock() {
      try {
        localStorage.setItem(LOCK_KEY, JSON.stringify({ tabId: tabId, ts: nowMs() }));
      } catch(e) {}
    }

    function isLeader() {
      var lock = readLock();
      if (!lock || !lock.tabId || !lock.ts) return true;
      if (lock.tabId === tabId) return true;
      if (nowMs() - lock.ts > TAB_LOCK_TTL_MS) return true;
      return false;
    }

    function getDeviceType() {
      try {
        var w = window.innerWidth || 1024;
        return w <= 768 ? 'mobile' : 'desktop';
      } catch(e) {
        return 'other';
      }
    }

    function getDeviceEmoji(type) {
      if (type === 'mobile') return '📱';
      if (type === 'desktop') return '🖥️';
      return '🧩';
    }

    function getTodayDateKey() {
      var now = new Date();
      var offset = 10 * 60; // 10 hour offset for Brisbane time
      var localMs = now.getTime() + (offset * 60 * 1000);
      var localDate = new Date(localMs);
      var y = localDate.getUTCFullYear();
      var m = String(localDate.getUTCMonth() + 1).padStart(2, '0');
      var d = String(localDate.getUTCDate()).padStart(2, '0');
      return y + '-' + m + '-' + d;
    }

    function metricsDocRef(uid) {
      return db.doc('users/' + uid + '/metrics/stats');
    }

    function safeMergeSet(ref, data) {
      return ref.set(data, { merge: true });
    }

    function safeIncSeconds(ref, seconds) {
      if (!seconds || seconds <= 0) return Promise.resolve();
      return safeMergeSet(ref, { totalSeconds: firebase.firestore.FieldValue.increment(seconds) });
    }

    function writeDeviceInfoOnce(ref) {
      var type = getDeviceType();
      var emoji = getDeviceEmoji(type);
      return safeMergeSet(ref, {
        lastDeviceType: type,
        lastDeviceEmoji: emoji,
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastSeenAt: firebase.firestore.FieldValue.serverTimestamp(),
        loginCount: firebase.firestore.FieldValue.increment(1)
      });
    }

    function recordDailyPractice(ref, seconds) {
      var dateKey = getTodayDateKey();
      var dailyRef = ref.parent.doc('daily').collection('sessions').doc(dateKey);
      var data = {
        practiced: true,
        lastSessionAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (seconds && seconds > 0) {
        data.totalSeconds = firebase.firestore.FieldValue.increment(seconds);
      }
      return dailyRef.set(data, { merge: true });
    }

    function stopTimers() {
      if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
      if (idleCheckTimer) { clearInterval(idleCheckTimer); idleCheckTimer = null; }
    }

    function endSession(reason) {
      if (!sessionActive) return;
      sessionActive = false;
      stopTimers();

      var endMs = nowMs();
      var elapsedMs = endMs - lastTickAtMs;
      var elapsedSeconds = clampToSeconds(elapsedMs);
      endedByIdle = (reason === 'idle');

      if (currentUser && elapsedSeconds > 0 && isLeader()) {
        try {
          var ref = metricsDocRef(currentUser.uid);
          safeIncSeconds(ref, elapsedSeconds);
          recordDailyPractice(ref, elapsedSeconds);
        } catch(e) {}
      }
    }

    function startSession() {
      // Don't track on members dashboard or contact page
      if (window.location.pathname === '/members.html' || 
          window.location.pathname === '/members' || 
          window.location.pathname === '/contact.html' || 
          window.location.pathname === '/contact') {
        return;
      }

      if (!currentUser || !isLeader()) return;

      writeLock();
      sessionActive = true;
      endedByIdle = false;

      sessionStartedAtMs = nowMs();
      lastTickAtMs = sessionStartedAtMs;
      lastActivityAtMs = sessionStartedAtMs;

      var ref = metricsDocRef(currentUser.uid);
      writeDeviceInfoOnce(ref);
      recordDailyPractice(ref);

      // Heartbeat every 30 seconds
      tickTimer = setInterval(function() {
        if (!sessionActive) return;
        writeLock();
        if (!isLeader()) {
          endSession('lost-leader');
          return;
        }

        var t = nowMs();
        var elapsedSeconds = clampToSeconds(t - lastTickAtMs);
        lastTickAtMs = t;

        try {
          safeIncSeconds(ref, elapsedSeconds);
          recordDailyPractice(ref, elapsedSeconds);
          safeMergeSet(ref, { lastSeenAt: firebase.firestore.FieldValue.serverTimestamp() });
        } catch(e) {}
      }, TICK_MS);

      // Idle check every 5 seconds
      idleCheckTimer = setInterval(function() {
        if (!sessionActive) return;
        var idleFor = nowMs() - lastActivityAtMs;
        if (idleFor >= IDLE_MS) {
          endSession('idle');
        }
      }, 5 * 1000);
    }

    function onActivity() {
      lastActivityAtMs = nowMs();
      if (!sessionActive && endedByIdle && isLeader()) {
        startSession();
      }
    }

    function bindActivityListeners() {
      var opts = { passive: true };
      ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(function(evt) {
        window.addEventListener(evt, onActivity, opts);
      });
    }

    function bindVisibilityAndUnload() {
      document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
          endSession('hidden');
        } else if (currentUser && !sessionActive) {
          startSession();
        }
      });

      window.addEventListener('pagehide', function() { endSession('unload'); });
      window.addEventListener('beforeunload', function() { endSession('unload'); });
    }

    // Initialize activity listeners
    bindActivityListeners();
    bindVisibilityAndUnload();

    // Listen for auth state changes
    firebase.auth().onAuthStateChanged(function(user) {
      currentUser = user || null;
      
      if (!user) {
        endSession('logout');
      } else if (!document.hidden) {
        startSession();
      }
    });
  });
})();
