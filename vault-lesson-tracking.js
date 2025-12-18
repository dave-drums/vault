/* vault-lesson-tracking.js
   Purpose: Automatically track when users view lessons in /vault/*
   - Tracks pages under /vault/ that are NOT the vault index page
   - Stores: lastLessonUrl (WITH params), lastLessonTitle, lastLessonViewedAt
   - Location: users/<uid>/metrics/practice
*/

(function(){
  'use strict';

  var VAULT_PATH_PREFIX = '/vault/';
  var VAULT_INDEX_PATH = '/vault';

  function hasFirebase(){
    return (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore);
  }

  function isLessonPage(){
    var path = window.location.pathname;
    
    // Must start with /vault/
    if (path.indexOf(VAULT_PATH_PREFIX) !== 0) return false;
    
    // But NOT the vault index page itself
    if (path === VAULT_INDEX_PATH || path === VAULT_INDEX_PATH + '/') return false;
    
    return true;
  }

  function getLessonTitle(){
    // Try to get page title from various sources
    var title = '';
    
    // 1. Try h1 on page (CRITICAL for injected lessons)
    var h1 = document.querySelector('h1');
    if (h1 && h1.textContent) {
      title = h1.textContent.trim();
    }
    
    // 2. Fallback to document title (remove site name if present)
    if (!title && document.title) {
      title = document.title.split('|')[0].split('—')[0].split('-')[0].trim();
    }
    
    // 3. Last resort: extract from URL path
    if (!title) {
      var path = window.location.pathname;
      var parts = path.split('/').filter(function(p){ return p.length > 0; });
      if (parts.length > 1) {
        title = parts[parts.length - 1]
          .replace(/-/g, ' ')
          .replace(/\b\w/g, function(l){ return l.toUpperCase(); });
      }
    }
    
    return title || 'Untitled Lesson';
  }

  function getFullLessonUrl(){
    // CRITICAL: Include query params for single-page injection system
    return window.location.pathname + window.location.search;
  }

  function trackLessonView(user){
    if (!user || !user.uid) return;
    if (!isLessonPage()) return;
    
    var db = firebase.firestore();
    var practiceDoc = db.collection('users').doc(user.uid).collection('metrics').doc('practice');
    
    var lessonUrl = getFullLessonUrl(); // NOW includes ?course=gs1&lesson=1.01
    var lessonTitle = getLessonTitle();
    
    // Update last lesson viewed
    practiceDoc.set({
      lastLessonUrl: lessonUrl,
      lastLessonTitle: lessonTitle,
      lastLessonViewedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(function(e){
      console.error('Failed to track lesson view:', e);
    });
  }

  function init(){
    if (!hasFirebase()) return;
    
    firebase.auth().onAuthStateChanged(function(user){
      if (user && isLessonPage()) {
        // Track immediately
        trackLessonView(user);
        
        // Also track if they navigate via history (back/forward)
        window.addEventListener('popstate', function(){
          if (isLessonPage()) {
            trackLessonView(user);
          }
        });
      }
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
