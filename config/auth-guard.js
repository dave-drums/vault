/* auth-guard.js
   Purpose: Unified authentication guard for protected pages
   Usage: Load as first script on protected pages (after Firebase init)
   
   Features:
   - Checks if user is logged in
   - Redirects to /members if not authenticated
   - For admin pages: checks if user has admin flag
   - Redirects to / if not admin (on admin pages)
   - Shows body only after auth passes
*/

(function() {
  'use strict';
  
  // Check if this page requires protection
  var isProtected = document.documentElement && 
                    document.documentElement.dataset && 
                    document.documentElement.dataset.protected === 'true';
  
  if (!isProtected) {
    // Not a protected page, show body immediately
    if (document.body) document.body.style.opacity = '1';
    return;
  }
  
  // Check if this is the admin page
  var isAdminPage = window.location.pathname.includes('/admin');
  
  var authCheckComplete = false;
  
function showBody() {
  if (authCheckComplete) return;
  authCheckComplete = true;
  
  // Minimum 2 second delay for admin page security
  var delay = isAdminPage ? 2000 : 0;
  
  setTimeout(function() {
    if (document.body) {
      document.body.style.opacity = '1';
      document.body.classList.add('auth-checked');
      
      // Remove loading screen if present
      var loading = document.querySelector('.auth-loading');
      if (loading) loading.remove();
    }
  }, delay);
}
  
  function redirectToMembers() {
    var next = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
    window.location.href = '/members?next=' + next;
  }
  
  function redirectToHome() {
    window.location.href = '/';
  }
  
  // Check if user is admin by checking /admins collection
  function checkIsAdmin(user) {
    if (!user || !firebase.firestore) return Promise.resolve(false);
    
    return firebase.firestore()
      .collection('admins')
      .doc(user.uid)
      .get()
      .then(function(doc) {
        return doc.exists;
      })
      .catch(function(err) {
        console.error('[Auth Guard] Admin check error:', err);
        return false;
      });
  }
  
  // Failsafe: reveal page after 2.5 seconds even if auth check fails
  var failsafe = setTimeout(showBody, 2500);
  
  // Wait for Firebase to be ready
  function waitForFirebase(callback) {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      callback();
    } else {
      setTimeout(function() { waitForFirebase(callback); }, 100);
    }
  }
  
  waitForFirebase(function() {
    firebase.auth().onAuthStateChanged(function(user) {
      clearTimeout(failsafe);
      
      if (!user) {
        // Not logged in - redirect to members login
        redirectToMembers();
        return;
      }
      
      // User is logged in
      if (isAdminPage) {
        // Admin page - check if user is admin
        checkIsAdmin(user).then(function(isAdmin) {
          if (!isAdmin) {
            // Not admin - redirect to home
            redirectToHome();
          } else {
            // Is admin - show page
            showBody();
          }
        });
      } else {
        // Regular protected page - just show it
        showBody();
      }
    });
  });
  
})();
