/* vault-course-progress.js - CLICK-FIX VERSION */

(function(){
  'use strict';

  if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) return;

  window.VAULT_COURSES = {
    'gs1': {
      name: 'Groove Studies 1',
      pathway: 'groove',
      lessons: [
        '1.01', '1.02', '1.03', '1.04', '1.05', '1.06', '1.07', '1.08', 
        '1.09', '1.10', '1.11', '1.12', '1.13', '1.14', '1.15', '1.16',
        '1.17', '1.18', '1.19', '1.20', '1.21', '1.22', '1.23'
      ]
    },
    'gs2': { name: 'Groove Studies 2', pathway: 'groove', lessons: [] },
    'gs3': { name: 'Groove Studies 3', pathway: 'groove', lessons: [] },
    'gs4': { name: 'Groove Studies 4', pathway: 'groove', lessons: [] },
    'fs1': { name: 'Fill Studies 1', pathway: 'fills', lessons: [] },
    'fs2': { name: 'Fill Studies 2', pathway: 'fills', lessons: [] },
    'fs3': { name: 'Fill Studies 3', pathway: 'fills', lessons: [] },
    'fs4': { name: 'Fill Studies 4', pathway: 'fills', lessons: [] },
    'ss1': { name: 'Stick Studies 1', pathway: 'sticks', lessons: [] },
    'ss2': { name: 'Stick Studies 2', pathway: 'sticks', lessons: [] },
    'ss3': { name: 'Stick Studies 3', pathway: 'sticks', lessons: [] },
    'ss4': { name: 'Stick Studies 4', pathway: 'sticks', lessons: [] },
    'ks1': { name: 'Kick Studies 1', pathway: 'kicks', lessons: [] },
    'ks2': { name: 'Kick Studies 2', pathway: 'kicks', lessons: [] },
    'ks3': { name: 'Kick Studies 3', pathway: 'kicks', lessons: [] }
  };

  window.VAULT_PATHWAY_NAMES = {
    groove: 'Groove Studies',
    fills: 'Fill Studies',
    sticks: 'Stick Studies',
    kicks: 'Kick Studies'
  };

  var auth = firebase.auth();
  var db = firebase.firestore();
  var currentUser = null;
  var currentCourseId = null;

  // Make toggle function globally accessible
  window.vaultToggleLesson = function(lessonId, currentState){
    console.log('[CLICK] vaultToggleLesson called:', lessonId, 'current:', currentState);
    if (!currentUser || !currentCourseId) {
      console.error('[CLICK] No user or course ID');
      return;
    }
    toggleCompletion(currentUser.uid, currentCourseId, lessonId, !currentState);
  };

  function getCourseIdFromUrl(){
    var path = window.location.pathname;
    var parts = path.split('/').filter(function(p){ return p.length > 0; });
    if (parts.length >= 2 && parts[0] === 'vault') {
      return parts[1];
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
    var params = getQueryParams();
    return !params.lesson;
  }

  function isSingleLessonPage(){
    var params = getQueryParams();
    return params.lesson;
  }

  function initCourseIndexPage(){
    if (!isCourseIndexPage()) return;
    
    try {
      var courseId = getCourseIdFromUrl();
      currentCourseId = courseId;
      
      var courseConfig = window.VAULT_COURSES && window.VAULT_COURSES[courseId];
      if (!courseConfig) {
        console.warn('No config found for course:', courseId);
        return;
      }

      auth.onAuthStateChanged(function(user){
        if (!user) return;
        currentUser = user;
        updateActiveCourse(user.uid, courseConfig.pathway, courseId);
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
      .catch(function(e){ console.error('Failed to update active course:', e); });
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
      .catch(function(e){ console.error('Failed to load course progress:', e); });
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
    lessons.forEach(function(lessonId){
      var lessonItem = document.querySelector('[data-lesson="' + lessonId + '"]');
      if (!lessonItem) return;

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
      
      // Make whole bubble clickable to navigate
      lessonItem.onclick = function(){
        window.location.href = window.location.pathname + '?lesson=' + lessonId;
      };
    });
  }

function toggleCompletion(uid, courseId, lessonId, newState){
    console.log('[TOGGLE] Setting lesson', lessonId, 'to', newState);
    
    db.collection('users').doc(uid).collection('progress').doc(courseId)
      .set({
        completed: {
          [lessonId]: newState
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true })
      .then(function(){ 
        console.log('[TOGGLE] Success, reloading...');
        location.reload(); 
      })
      .catch(function(e){
        console.error('[TOGGLE] Failed:', e);
        alert('Could not update progress: ' + e.message);
      });
  }

  function initLessonCompletionButtons(){
    if (!isSingleLessonPage()) {
      console.log('[BTN] Not a lesson page');
      return;
    }

    console.log('[BTN] Init started');

    try {
      var params = getQueryParams();
      var courseId = getCourseIdFromUrl();
      var lessonId = params.lesson;
      currentCourseId = courseId;

      console.log('[BTN] courseId:', courseId, 'lessonId:', lessonId);

      if (!courseId || !lessonId) {
        console.log('[BTN] Missing courseId or lessonId');
        return;
      }

      auth.onAuthStateChanged(function(user){
        console.log('[BTN] Auth changed, user:', user ? user.uid : 'none');
        if (!user) return;
        currentUser = user;

        db.collection('users').doc(user.uid).get().then(function(userSnap){
          console.log('[BTN] User doc exists:', userSnap.exists);
          console.log('[BTN] User data:', userSnap.data());
          var canSelfProgress = userSnap.exists && userSnap.data().selfProgress === true;
          
          console.log('[BTN] canSelfProgress:', canSelfProgress);
          
          if (!canSelfProgress) {
            console.log('[BTN] selfProgress is false, exiting');
            return;
          }

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
    console.log('[BTN] createCompletionButtons called');
    var courseConfig = window.VAULT_COURSES && window.VAULT_COURSES[courseId];
    if (!courseConfig) {
      console.log('[BTN] No course config found');
      return;
    }

    var courseIndexUrl = window.location.pathname;
    var nextLessonUrl = getNextLessonUrl(courseConfig, lessonId);

    var topBtn = createButton(uid, courseId, lessonId, isCompleted, courseIndexUrl, nextLessonUrl);
    var topPlaceholder = document.querySelector('#complete-button-top');
    console.log('[BTN] Top placeholder exists:', !!topPlaceholder);
    if (topPlaceholder) {
      topPlaceholder.appendChild(topBtn);
      console.log('[BTN] Top button added');
    } else {
      console.log('[BTN] Top placeholder not found, waiting...');
      setTimeout(function() {
        var retry = document.querySelector('#complete-button-top');
        if (retry) {
          retry.appendChild(topBtn);
          console.log('[BTN] Top button added (retry)');
        }
      }, 500);
    }

    var bottomBtn = createButton(uid, courseId, lessonId, isCompleted, courseIndexUrl, nextLessonUrl);
    var bottomPlaceholder = document.querySelector('#complete-button-bottom');
    if (bottomPlaceholder) {
      bottomPlaceholder.appendChild(bottomBtn);
    }
  }

  function getNextLessonUrl(courseConfig, currentLessonId){
    var lessons = courseConfig.lessons;
    var currentIndex = lessons.indexOf(currentLessonId);
    
    if (currentIndex === -1 || currentIndex === lessons.length - 1) {
      return null;
    }
    
    var nextLessonId = lessons[currentIndex + 1];
    return window.location.pathname + '?lesson=' + nextLessonId;
  }

  function createButton(uid, courseId, lessonId, isCompleted, courseIndexUrl, nextLessonUrl){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vault-lesson-complete-btn';
    
    if (isCompleted) {
      btn.textContent = 'Mark Incomplete';
    } else if (nextLessonUrl) {
      btn.textContent = 'Complete & Next Lesson →';
    } else {
      btn.textContent = 'Complete Lesson';
    }
    
    btn.style.cssText = 'display:inline-block;padding:10px 16px;' +
      'background:' + (isCompleted ? '#10b981' : '#06b3fd') + ';' +
      'border:1px solid ' + (isCompleted ? '#10b981' : '#06b3fd') + ';' +
      'border-radius:6px;color:#fff;font-size:14px;cursor:pointer;' +
      'transition:all 0.2s ease;text-decoration:none;';

    btn.addEventListener('mouseenter', function(){ btn.style.opacity = '0.9'; });
    btn.addEventListener('mouseleave', function(){ btn.style.opacity = '1'; });

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

function toggleLessonCompletion(uid, courseId, lessonId, newState, redirectUrl){
    db.collection('users').doc(uid).collection('progress').doc(courseId)
      .set({
        completed: {
          [lessonId]: newState
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true })
      .then(function(){
        window.location.href = redirectUrl;
      })
      .catch(function(e){
        console.error('Failed to toggle completion:', e);
        alert('Could not update completion: ' + e.message);
      });
  }

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
