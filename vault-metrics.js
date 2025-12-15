document.addEventListener('DOMContentLoaded', function () {
  if (document.body) document.body.style.opacity = '1';

  if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
    return;
  }

  var auth = firebase.auth();
  var db = firebase.firestore();
  var adminEmail = 'info@davedrums.com.au';

  var startTime = null;
  var ended = false;
  var userRef = null;

  var idleMs = 10 * 60 * 1000;
  var idleTimer = null;

  function getDeviceType() {
    try {
      var ua = (navigator.userAgent || '').toLowerCase();
      if (/ipad|tablet/.test(ua)) return 'tablet';
      if (/mobi|iphone|android/.test(ua)) return 'mobile';
      return 'desktop';
    } catch (e) {
      return 'other';
    }
  }

  function deviceEmoji(type) {
    if (type === 'mobile') return '📱';
    if (type === 'tablet') return '📱';
    if (type === 'desktop') return '🖥️';
    return '❓';
  }

  function resetIdleTimer() {
    if (ended && auth.currentUser && userRef) {
      ended = false;
      startTime = Date.now();
    }

    if (idleTimer) clearTimeout(idleTimer);

    idleTimer = setTimeout(function () {
      endSession();
    }, idleMs);
  }

  function hookActivityListeners() {
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(function (evt) {
      window.addEventListener(evt, resetIdleTimer, { passive: true });
    });
    resetIdleTimer();
  }

  function setMerge(extra) {
    if (!userRef || !auth.currentUser) return Promise.resolve();

    var data = {
      email: auth.currentUser.email || '',
      lastActive: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (extra) {
      for (var k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) {
          data[k] = extra[k];
        }
      }
    }

    return userRef.set(data, { merge: true });
  }

  function ensureJoinedAtOnce() {
    if (!userRef) return Promise.resolve();

    return userRef.get().then(function (snap) {
      var d = snap.exists ? (snap.data() || {}) : {};
      if (!d.joinedAt) {
        return userRef.set({ joinedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      }
    });
  }

  function bumpLoginCountAndDevice() {
    if (!userRef) return Promise.resolve();

    var type = getDeviceType();

    return userRef.set({
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      loginCount: firebase.firestore.FieldValue.increment(1),
      lastDeviceType: type,
      lastDeviceEmoji: deviceEmoji(type)
    }, { merge: true });
  }

  function endSession() {
    if (!auth.currentUser || !userRef || ended) return;
    ended = true;

    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }

    var durSec = Math.round((Date.now() - startTime) / 1000);
    if (durSec < 0) durSec = 0;

    setMerge({
      totalSeconds: firebase.firestore.FieldValue.increment(durSec)
    }).catch(function () {});
  }

  auth.onAuthStateChanged(function (user) {
    if (!user) return;

    if ((user.email || '').toLowerCase() === adminEmail.toLowerCase()) {
      return;
    }

    userRef = db.collection('users_admin').doc(user.uid);
    startTime = Date.now();
    ended = false;

    setMerge({}).catch(function () {});

    ensureJoinedAtOnce().catch(function () {});
    bumpLoginCountAndDevice().catch(function () {});

    setMerge({}).catch(function () {});
    hookActivityListeners();

    window.addEventListener('beforeunload', endSession);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        endSession();
      }
    });
  });
});

