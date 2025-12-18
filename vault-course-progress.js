/* vault-course-progress.js
   Handles all course progress features:
   - Course config (bundled)
   - Progress bars on course index pages
   - Status circles on course index pages
   - Completion buttons on single lesson pages
   - Active course tracking
*/

(function(){
  'use strict';

  if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) return;

  /* ============================================
     COURSE CONFIG (bundled inline)
     ============================================ */
  
  window.VAULT_COURSES = {
    'gs1': {
      name: 'Groove Studies 1',
      pathway: 'groove',
      lessons: [
        '1.01', '1.02', '1.03', '1.04', '1.05', '1.06', '1.07', '1.08', 
        '1.09', '1.10', '1.11', '1.12', '1.13', '1.14', '1.15', '1.16',
        '1.17', '1.18', '1.19', '1.20', '1.21', '1.22', '1.23'
      ]
    }
    // Add more courses here: 'fs1', 'ss1', 'ks1', 'gs2', etc.
  };

  window.VAULT_PATHWAY_NAMES = {
    groove: 'Groove Studies',
    fills: 'Fill Studies',
    sticks: 'Stick Studies',
    kicks: 'Kick Studies'
  };

  /* ============================================
     SHARED UTILITIES
     ============================================ */

  var auth = firebase.auth();
  var db = firebase.firestore();

  function getCourseIdFromUrl(){
    // Try path first: /vault/gs1 -> gs1
    var path = window.location.pathname;
    var parts = path.split('/').filter(function(p){ return p.length > 0; });
    if (parts.length >= 2 && parts[0] === 'vault') {
      return parts[1];
    }
    
    // Try query param: ?course=gs1
    var params = getQueryParams();
    if (params.course) {
      return params.course;
    }
    
    return null;
  }

  function getQueryParams(){
    var params = {};
    var search = window.location.search.substring(1);
    if (!search) return params;
    
    search.split('&').forEach(function(pair){
      var parts = pair.split('=');
      if (parts.length === 2) {
        params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
      }
    });
    return params;
  }

  function isCourseIndexPage(){
    var courseId = getCourseIdFromUrl();
    if (!courseId) return false;
    
    // Must be /vault/gs1, not /vault/gs1/something or /vault?course=gs1
    var path = window.location.pathname;
    var expectedPath = '/vault/' + courseId;
    return (path === expectedPath || path === expectedPath + '/') && !window.location.search;
  }

  function isSingleLessonPage(){
    var params = getQueryParams();
    return params.course && params.lesson;
  }

  /* ============================================
     COURSE INDEX PAGE: Progress Bar + Status Circles
     ============================================ */

  function initCourseIndexPage(){
    if (!isCourseIndexPage()) return;
    
    try {
      var courseId = getCourseIdFromUrl();
      var courseConfig = window.VAULT_COURSES && window.VAULT_COURSES[courseId];
      if (!courseConfig) {
        console.warn('No config found for course:', courseId);
        return;
      }

      auth.onAuthStateChanged(function(user){
        if (!user) return;

        // Update active course for this pathway
        updateActiveCourse(user.uid, courseConfig.pathway, courseId);

        // Load completion data and render
        loadAndRenderProgress(user.uid, courseId, courseConfig);
      });
    } catch(e) {
      console.error('Course index init failed:', e);
    }
  }

  function updateActiveCourse(uid, pathway, courseId){
    var update = { activeCourses: {} };
    update.activeCourses[pathway] = courseId;
    
    db.collection('users').doc(uid).set(update, { merge: true })
      .catch(function(e){
        console.error('Failed to update active course:', e);
      });
  }

  function loadAndRenderProgress(uid, courseId, courseConfig){
    db.collection('users').doc(uid).collection('progress').doc(courseId).get()
      .then(function(snap){
        var completed = {};
        if (snap.exists) {
          var data = snap.data() || {};
          completed = data.completed || {};
        }

        renderProgressBar(completed, courseConfig.lessons);
        renderStatusCircles(uid, courseId, completed, courseConfig.lessons);
      })
      .catch(function(e){
        console.error('Failed to load course progress:', e);
      });
  }

  function renderProgressBar(completed, lessons){
    var progressBar = document.querySelector('.course-progress-bar');
    var progressText = document.querySelector('.course-progress-text');
    
    if (!progressBar) return;

    var completedCount = 0;
    lessons.forEach(function(lessonId){
      if (completed[lessonId]) completedCount++;
    });

    var totalLessons = lessons.length;
    var percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    progressBar.style.width = percent + '%';
    if (progressText) {
      progressText.textContent = completedCount + '/' + totalLessons + ' (' + percent + '%)';
    }
  }

  function renderStatusCircles(uid, courseId, completed, lessons){
    db.collection('users').doc(uid).get().then(function(userSnap){
      var canSelfProgress = userSnap.exists && userSnap.data().selfProgress === true;

      lessons.forEach(function(lessonId){
        // Find lesson item by data-lesson attribute
        var lessonItem = document.querySelector('[data-lesson="' + lessonId + '"]');
        if (!lessonItem) return;

        // Find status circle within the lesson item
        var statusCircle = lessonItem.querySelector('.gs1-lesson-status');
        if (!statusCircle) return;

        var isCompleted = completed[lessonId] === true;
        
        // Update visual state
        if (isCompleted) {
          statusCircle.classList.remove('incomplete');
          statusCircle.classList.add('completed');
        } else {
          statusCircle.classList.remove('completed');
          statusCircle.classList.add('incomplete');
        }

        // Add click handler if user can self-progress
        if (canSelfProgress) {
          lessonItem.style.cursor = 'pointer';
          
          // Prevent default link behavior when clicking on the item
          lessonItem.addEventListener('click', function(e){
            // If clicking the status circle, toggle completion instead of navigating
            if (e.target === statusCircle || statusCircle.contains(e.target)) {
              e.preventDefault();
              toggleCompletion(uid, courseId, lessonId, !isCompleted);
            }
            // Otherwise, allow normal link navigation
          });
        }
      });
    });
  }

  function toggleCompletion(uid, courseId, lessonId, newState){
    var update = { completed: {} };
    update.completed[lessonId] = newState;
    update.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

    db.collection('users').doc(uid).collection('progress').doc(courseId)
      .set(update, { merge: true })
      .then(function(){
        location.reload();
      })
      .catch(function(e){
        console.error('Failed to toggle completion:', e);
        alert('Could not update progress. Please try again.');
      });
  }

  /* ============================================
     SINGLE LESSON PAGE: Completion Buttons
     ============================================ */

  function initLessonCompletionButtons(){
    if (!isSingleLessonPage()) return;

    try {
      var params = getQueryParams();
      var courseId = params.course;
      var lessonId = params.lesson;

      auth.onAuthStateChanged(function(user){
        if (!user) return;

        db.collection('users').doc(user.uid).get().then(function(userSnap){
          var canSelfProgress = userSnap.exists && userSnap.data().selfProgress === true;
          
          if (!canSelfProgress) return;

          db.collection('users').doc(user.uid).collection('progress').doc(courseId).get()
            .then(function(snap){
              var isCompleted = false;
              if (snap.exists) {
                var completed = snap.data().completed || {};
                isCompleted = completed[lessonId] === true;
              }

              createCompletionButtons(user.uid, courseId, lessonId, isCompleted);
            });
        });
      });
    } catch(e) {
      console.error('Lesson completion init failed:', e);
    }
  }

  function createCompletionButtons(uid, courseId, lessonId, isCompleted){
    var courseIndexUrl = '/vault/' + courseId;

    // Top button
    var topBtn = createButton(uid, courseId, lessonId, isCompleted, courseIndexUrl);
    var contentTop = document.querySelector('.sqs-block-content');
    if (contentTop && contentTop.firstChild) {
      contentTop.insertBefore(topBtn, contentTop.firstChild);
    }

    // Bottom button
    var bottomBtn = createButton(uid, courseId, lessonId, isCompleted, courseIndexUrl);
    var contentBottom = document.querySelector('.sqs-block-content');
    if (contentBottom) {
      contentBottom.appendChild(bottomBtn);
    }
  }

  function createButton(uid, courseId, lessonId, isCompleted, courseIndexUrl){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vault-lesson-complete-btn';
    btn.textContent = isCompleted ? 'Mark Incomplete' : 'Complete Lesson';
    btn.style.cssText = 'display:block;width:100%;max-width:400px;margin:20px auto;padding:14px 24px;' +
      'background:' + (isCompleted ? '#10b981' : '#06b3fd') + ';' +
      'border:none;border-radius:8px;color:#fff;font-size:16px;font-weight:600;cursor:pointer;' +
      'transition:all 0.2s ease;';

    btn.addEventListener('mouseenter', function(){
      btn.style.opacity = '0.9';
    });
    btn.addEventListener('mouseleave', function(){
      btn.style.opacity = '1';
    });

    btn.addEventListener('click', function(){
      toggleLessonCompletion(uid, courseId, lessonId, !isCompleted, courseIndexUrl);
    });

    return btn;
  }

  function toggleLessonCompletion(uid, courseId, lessonId, newState, courseIndexUrl){
    var update = { completed: {} };
    update.completed[lessonId] = newState;
    update.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

    db.collection('users').doc(uid).collection('progress').doc(courseId)
      .set(update, { merge: true })
      .then(function(){
        window.location.href = courseIndexUrl;
      })
      .catch(function(e){
        console.error('Failed to toggle completion:', e);
        alert('Could not update completion. Please try again.');
      });
  }

  /* ============================================
     INITIALIZATION
     ============================================ */

  function init(){
    if (isCourseIndexPage()) {
      initCourseIndexPage();
    } else if (isSingleLessonPage()) {
      initLessonCompletionButtons();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
