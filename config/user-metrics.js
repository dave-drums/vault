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

    var LOGIN_TRACKED_KEY = 'vault_login_tracked';
    
    function writeDeviceInfoOnce(ref, isNewLogin) {
      var type = getDeviceType();
      var emoji = getDeviceEmoji(type);
      
      var updateData = {
        lastDeviceType: type,
        lastDeviceEmoji: emoji,
        lastSeenAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Only update lastLoginAt and increment loginCount on new logins
      if (isNewLogin) {
        updateData.lastLoginAt = firebase.firestore.FieldValue.serverTimestamp();
        updateData.loginCount = firebase.firestore.FieldValue.increment(1);
      }
      
      return safeMergeSet(ref, updateData);
    }
    
    function isLoginAlreadyTracked() {
      try {
        var tracked = sessionStorage.getItem(LOGIN_TRACKED_KEY);
        return tracked === 'true';
      } catch(e) {
        return false;
      }
    }
    
    function markLoginTracked() {
      try {
        sessionStorage.setItem(LOGIN_TRACKED_KEY, 'true');
      } catch(e) {}
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
      
      // Check if we've already tracked login in this browser session
      var isNewLogin = !isLoginAlreadyTracked();
      
      // Write device info and conditionally track login
      writeDeviceInfoOnce(ref, isNewLogin);
      
      // Mark login as tracked for this session
      if (isNewLogin) {
        markLoginTracked();
      }

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
