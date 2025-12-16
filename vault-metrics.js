(function(){
  document.addEventListener('DOMContentLoaded', function(){
    if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) return;

    var auth = firebase.auth();
    var db = firebase.firestore();
    var F = firebase.firestore.FieldValue;

    var HEARTBEAT_MS = 30 * 1000;
    var IDLE_AFTER_MS = 2 * 60 * 1000;

    var lastActivity = Date.now();
    var sessionStart = Date.now();

    function isMobile(){
      var ua = navigator.userAgent || '';
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    }
    function deviceEmoji(){ return isMobile() ? '📱' : '🖥️'; }
    function deviceType(){ return isMobile() ? 'mobile' : 'desktop'; }

    function markActivity(){ lastActivity = Date.now(); }
    ['mousemove','mousedown','keydown','touchstart','scroll'].forEach(function(evt){
      window.addEventListener(evt, markActivity, { passive:true });
    });

    // New location: users/{uid}/metrics/stats
    function metricsRef(uid){
      return db.collection('users').doc(uid).collection('metrics').doc('stats');
    }

    function onLogin(uid){
      return metricsRef(uid).set({
        lastLoginAt: F.serverTimestamp(),
        lastSeenAt: F.serverTimestamp(),
        loginCount: F.increment(1),
        lastDeviceType: deviceType(),
        lastDeviceEmoji: deviceEmoji()
      }, { merge:true });
    }

    function heartbeat(uid){
      // every 30s, but only if they've been active recently
      if ((Date.now() - lastActivity) > IDLE_AFTER_MS) return Promise.resolve();
      return metricsRef(uid).set({
        lastSeenAt: F.serverTimestamp()
      }, { merge:true });
    }

    function flushSeconds(uid){
      var seconds = Math.max(0, Math.round((Date.now() - sessionStart) / 1000));
      if (!seconds) return Promise.resolve();
      sessionStart = Date.now();
      return metricsRef(uid).set({
        totalSeconds: F.increment(seconds)
      }, { merge:true });
    }

    auth.onAuthStateChanged(function(user){
      if (!user) return;

      sessionStart = Date.now();
      markActivity();

      onLogin(user.uid).catch(function(){});

      var hb = setInterval(function(){
        heartbeat(user.uid).catch(function(){});
      }, HEARTBEAT_MS);

      function end(){
        try { clearInterval(hb); } catch(e){}
        flushSeconds(user.uid).catch(function(){});
      }

      window.addEventListener('beforeunload', end);
      document.addEventListener('visibilitychange', function(){
        if (document.visibilityState === 'hidden') end();
        if (document.visibilityState === 'visible') { sessionStart = Date.now(); markActivity(); }
      });
    });
  });
})();
