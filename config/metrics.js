/* metrics.js
   Purpose: Track user sessions, login activity
   Usage: Load on all pages after Firebase init
   
   Tracks:
   - lastLoginAt, loginCount (on login)
   - lastSeenAt (every 30 seconds while active)
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

    var TICK_MS = 30 * 1000;               // 30 second heartbeat
    var tickTimer = null;

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

    function userDocRef(uid) {
      return db.doc('users/' + uid);
    }

    function safeMergeSet(ref, data) {
      return ref.set(data, { merge: true });
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

    function stopTimers() {
      if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    }

    function startSession() {
      // Don't track on members dashboard or contact page
      if (window.location.pathname === '/members.html' || 
          window.location.pathname === '/members' || 
          window.location.pathname === '/contact.html' || 
          window.location.pathname === '/contact') {
        return;
      }

      if (!currentUser) return;

      var ref = userDocRef(currentUser.uid);
      writeDeviceInfoOnce(ref);

      // Heartbeat every 30 seconds
      tickTimer = setInterval(function() {
        if (!currentUser) {
          stopTimers();
          return;
        }

        try {
          safeMergeSet(ref, { lastSeenAt: firebase.firestore.FieldValue.serverTimestamp() });
        } catch(e) {}
      }, TICK_MS);
    }

    function bindVisibilityAndUnload() {
      document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
          stopTimers();
        } else if (currentUser) {
          startSession();
        }
      });

      window.addEventListener('pagehide', function() { stopTimers(); });
      window.addEventListener('beforeunload', function() { stopTimers(); });
    }

    // Initialize
    bindVisibilityAndUnload();

    // Listen for auth state changes
    firebase.auth().onAuthStateChanged(function(user) {
      currentUser = user || null;
      
      if (!user) {
        stopTimers();
      } else if (!document.hidden) {
        startSession();
      }
    });
  });
})();
