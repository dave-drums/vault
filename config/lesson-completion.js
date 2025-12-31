/* lesson-completion.js
   Lesson completion button logic for course pages
   Uses VaultUtils for shared functions
   Uses VaultProgress for all progress writes
*/

(function(){
  'use strict';

  if (!window.firebase || !firebase.firestore) return;

  var db = firebase.firestore();

  // ============================================
  // LESSON COMPLETION FUNCTIONS
  // ============================================

  function getNextLessonUrl(courseConfig, currentLessonId, courseId){
    var lessons = courseConfig.lessons;
    var currentIndex = lessons.indexOf(currentLessonId);
    
    if (currentIndex === -1 || currentIndex === lessons.length - 1) {
      return null;
    }
    
    var nextLessonId = lessons[currentIndex + 1];
    var parsed = VaultUtils.parseCourseId(courseId);
    if (!parsed) return null;
    return '/' + parsed.pathway + '?c=' + parsed.num + '&l=' + nextLessonId;
  }

  function toggleLessonCompletion(uid, courseId, lessonId, newState, redirectUrl){
    // ALWAYS use user-progress.js - it's guaranteed to be loaded
    if (!window.VaultProgress || !window.VaultProgress.updateProgress) {
      console.error('VaultProgress not available - check HTML script loading order');
      if (window.VaultToast) {
        window.VaultToast.error('Unable to update progress');
      }
      return;
    }

    window.VaultProgress.updateProgress(courseId, lessonId, uid)
      .then(function(){
        window.location.href = redirectUrl;
      })
      .catch(function(e){
        console.error('Failed to toggle completion:', e);
        if (window.VaultToast) {
          window.VaultToast.error('Could not update completion');
        } else {
          alert('Could not update completion: ' + e.message);
        }
      });
  }

  function createButton(uid, courseId, lessonId, isCompleted, courseIndexUrl, nextLessonUrl, selfProgress){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vault-lesson-complete-btn';
    
    if (!selfProgress) {
      btn.textContent = nextLessonUrl ? 'Next Lesson →' : 'Back to Course';
      btn.className += ' inactive';
      
      btn.onclick = function(){
        window.location.href = nextLessonUrl || courseIndexUrl;
      };
      
      return btn;
    }
    
    if (isCompleted) {
      btn.textContent = 'Mark Incomplete';
      btn.className += ' completed';
    } else if (nextLessonUrl) {
      btn.textContent = 'Complete Lesson →';
      btn.className += ' active';
    } else {
      btn.textContent = 'Complete Lesson';
      btn.className += ' active';
    }

    btn.onclick = function(){
      if (isCompleted) {
        toggleLessonCompletion(uid, courseId, lessonId, false, courseIndexUrl);
      } else {
        var redirectUrl = nextLessonUrl || courseIndexUrl;
        toggleLessonCompletion(uid, courseId, lessonId, true, redirectUrl);
      }
    };

    return btn;
  }

  function createCompletionButton(uid, courseId, lessonId, isCompleted, selfProgress){
    var courseConfig = window.VAULT_COURSES && window.VAULT_COURSES[courseId];
    if (!courseConfig) {
      console.warn('Course config not found for:', courseId);
      return;
    }

    var parsed = VaultUtils.parseCourseId(courseId);
    if (!parsed) {
      console.warn('Could not parse course ID:', courseId);
      return;
    }
    
    var courseIndexUrl = '/' + parsed.pathway + '?c=' + parsed.num;
    var nextLessonUrl = getNextLessonUrl(courseConfig, lessonId, courseId);
    var btn = createButton(uid, courseId, lessonId, isCompleted, courseIndexUrl, nextLessonUrl, selfProgress);

    var topPlaceholder = document.querySelector('#complete-button-top');
    if (topPlaceholder && !topPlaceholder.querySelector('.vault-lesson-complete-btn')) {
      topPlaceholder.appendChild(btn);
    }
  }

  function watchForButtonPlaceholder(user){
    var params = VaultUtils.getQueryParams();
    if (!params.l || !user) return;

    var courseId = VaultUtils.getCourseIdFromUrl();
    var lessonId = params.l;

    if (!courseId || !lessonId) return;

    db.collection('users').doc(user.uid).get().then(function(userSnap){
      var canSelfProgress = userSnap.exists && userSnap.data().selfProgress === true;

      db.collection('users').doc(user.uid).collection('progress').doc(courseId).get()
        .then(function(snap){
          var isCompleted = false;
          if (snap.exists && canSelfProgress) {
            var completed = snap.data().completed || {};
            isCompleted = completed[lessonId] === true;
          }

          // Use MutationObserver to watch for placeholder
          var buttonObserver = new MutationObserver(function(){
            var placeholder = document.querySelector('#complete-button-top');
            if (placeholder && !placeholder.querySelector('.vault-lesson-complete-btn')) {
              createCompletionButton(user.uid, courseId, lessonId, isCompleted, canSelfProgress);
              if (buttonObserver) {
                buttonObserver.disconnect();
                buttonObserver = null;
              }
            }
          });

          buttonObserver.observe(document.body, { childList: true, subtree: true });

          // Also try immediately in case placeholder already exists
          var existingPlaceholder = document.querySelector('#complete-button-top');
          if (existingPlaceholder) {
            createCompletionButton(user.uid, courseId, lessonId, isCompleted, canSelfProgress);
            if (buttonObserver) {
              buttonObserver.disconnect();
              buttonObserver = null;
            }
          }
        })
        .catch(function(e){
          console.error('Error loading progress:', e);
        });
    }).catch(function(e){
      console.error('Error loading user data:', e);
    });
  }

  // ============================================
  // INITIALIZE ON LESSON PAGES
  // ============================================

  function init(){
    var params = VaultUtils.getQueryParams();
    if (!params.l) return; // Not a lesson page

    if (firebase.auth) {
      firebase.auth().onAuthStateChanged(function(user){
        if (user) {
          watchForButtonPlaceholder(user);
        }
      });
    }
  }

  // Wait for utils.js to be available
  if (window.VaultUtils) {
    init();
  } else {
    // Wait for VaultUtils
    var checkUtils = setInterval(function(){
      if (window.VaultUtils) {
        clearInterval(checkUtils);
        init();
      }
    }, 50);
  }

  // Export for use by course-loader if needed
  window.VaultLessonCompletion = {
    createCompletionButton: createCompletionButton,
    watchForButtonPlaceholder: watchForButtonPlaceholder
  };

})();
