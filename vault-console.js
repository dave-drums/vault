document.addEventListener('DOMContentLoaded', function () {
  if (document.body) document.body.style.opacity = '1';

  if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
    return;
  }

  var auth = firebase.auth();
  var db = firebase.firestore();
  var rootEl = document.getElementById('vault-admin-root');
  var loaded = false;

  function isAdminByRules() {
    // Admins are allowed to list users_admin; students are blocked by rules
    return db.collection('users_admin').limit(1).get()
      .then(function () { return true; })
      .catch(function () { return false; });
  }

  function loadOnce() {
    if (loaded) return Promise.resolve();
    loaded = true;

    // your existing admin loading logic stays here
    return Promise.resolve();
  }

  auth.onAuthStateChanged(function (user) {
    if (!user) {
      rootEl.textContent = 'Please log in.';
      return;
    }

    isAdminByRules().then(function (ok) {
      if (!ok) {
        rootEl.textContent = 'You do not have permission to view this page.';
        return;
      }

      loadOnce().catch(function (e) {
        rootEl.textContent = (e && e.message) ? e.message : 'Error loading admin data.';
      });

      setInterval(function () {
        loadOnce().catch(function () {});
      }, 15000);
    });
  });
});
