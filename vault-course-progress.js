/* vault-course-progress.js - DEBUG VERSION */

(function(){
  'use strict';

  console.log('[PROGRESS] Script loading...');

  if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
    console.error('[PROGRESS] Firebase not available');
    return;
  }

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
    
    console.log('[PROGRESS] Initializing course index page');
    
    try {
      var courseId = getCourseIdFromUrl();
      console.log('[PROGRESS] Course ID:', courseId);
      
      var courseConfig = window.VAULT_COURSES && window.VAULT_COURSES[courseId];
      if (!courseConfig) {
        console.warn('[PROGRESS] No config found for course:', courseId);
        return;
      }

      auth.onAuthStateChanged(function(user){
        if (!user) {
          console.log('[PROGRESS] No user logged in');
          return;
        }
        console.log('[PROGRESS] User logged in:', user.uid);
        updateActiveCourse(user.uid, courseConfig.pathway, courseId);
        loadAndRenderProgress(user.uid, courseId, courseConfig);
      });
    } catch(e) {
      console.error('[PROGRESS] Course index init failed:', e);
    }
  }

  function updateActiveCourse(uid, pathway, courseId){
    console.log('[PROGRESS] Updating active course:', pathway, courseId);
    var update = { activeCourses: {} };
    update.activeCourses[pathway] = courseId;
    db.collection('users').doc(uid).set(update, { merge: true })
      .then(function(){ console.log('[PROGRESS] Active course updated'); })
      .catch(function(e){ console.error('[PROGRESS] Failed to update active course:', e); });
  }

  function loadAndRenderProgress(uid, courseId, courseConfig){
    console.log('[PROGRESS] Loading progress for:', uid, courseId);
    
    db.collection('users').doc(uid).collection('progress').doc(courseId).get()
      .then(function(snap){
        var completed = {};
        if (snap.exists) {
          var data = snap.data() || {};
          completed = data.completed || {};
          console.log('[PROGRESS] Loaded progress:', completed);
        } else {
          console.log('[PROGRESS] No progress document exists yet');
        }
        renderProgressBar(completed, courseConfig.lessons);
        renderStatusCircles(uid, courseId, completed, courseConfig.lessons);
      })
      .catch(function(e){ console.error('[PROGRESS] Failed to load course progress:', e); });
  }

  function renderProgressBar(completed, lessons){
    var progressBar = document.querySelector('.course-progress-bar');
    var progressText = document.querySelector('.course-progress-text');
    if (!progressBar) {
      console.warn('[PROGRESS] Progress bar element not found');
      return;
    }

    var completedCount = 0;
    lessons.forEach(function(lessonId){
      if (completed[lessonId]) completedCount++;
    });

    var totalLessons = lessons.length;
    var percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    console.log('[PROGRESS] Progress:', completedCount, '/', totalLessons, '=', percent + '%');

    progressBar.style.width = percent + '%';
    if (progressText) {
      progressText.textContent = completedCount + '/' + totalLessons + ' (' + percent + '%)';
    }
  }

  function renderStatusCircles(uid, courseId, completed, lessons){
    console.log('[PROGRESS] Rendering status circles for', lessons.length, 'lessons');
    
    db.collection('users').doc(uid).get().then(function(userSnap){
      if (!userSnap.exists) {
        console.error('[PROGRESS] User document does not exist!');
        return;
      }
      
      var userData = userSnap.data();
      var canSelfProgress = userData.selfProgress === true;
      console.log('[PROGRESS] selfProgress enabled:', canSelfProgress, 'userData:', userData);

      lessons.forEach(function(lessonId){
        var lessonItem = document.querySelector('[data-lesson="' + lessonId + '"]');
        if (!lessonItem) {
          console.warn('[PROGRESS] Lesson item not found:', lessonId);
          return;
        }

        var statusCircle = lessonItem.querySelector('.gs1-lesson-status');
        var lessonLink = lessonItem.querySelector('.gs1-lesson-link');
        if (!statusCircle) {
          console.warn('[PROGRESS] Status circle not found for:', lessonId);
          return;
        }
        if (!lessonLink) {
          console.warn('[PROGRESS] Lesson link not found for:', lessonId);
          return;
        }

        var isCompleted = completed[lessonId] === true;
        
        if (isCompleted) {
          statusCircle.classList.remove('incomplete');
          statusCircle.classList.add('completed');
        } else {
          statusCircle.classList.remove('completed');
          statusCircle.classList.add('incomplete');
        }

        if (canSelfProgress) {
          statusCircle.classList.add('clickable');
          console.log('[PROGRESS] Made lesson clickable:', lessonId);
          
          statusCircle.addEventListener('click', function(e){
            e.preventDefault();
            e.stopPropagation();
            console.log('[PROGRESS] Status circle clicked for:', lessonId, 'newState:', !isCompleted);
            toggleCompletion(uid, courseId, lessonId, !isCompleted);
          });
        }
        
        lessonLink.addEventListener('click', function(){
          var url = window.location.pathname + '?lesson=' + lessonId;
          console.log('[PROGRESS] Lesson link clicked, navigating to:', url);
          window.location.href = url;
        });
      });
    }).catch(function(e){
      console.error('[PROGRESS] Failed to load user data:', e);
    });
  }

  function toggleCompletion(uid, courseId, lessonId, newState){
    console.log('[PROGRESS] Toggling completion:', {uid, courseId, lessonId, newState});
    
    var update = {};
    update['completed.' + lessonId] = newState;
    update.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

    console.log('[PROGRESS] Writing to Firestore:', update);

    db.collection('users').doc(uid).collection('progress').doc(courseId)
      .set(update, { merge: true })
      .then(function(){ 
        console.log('[PROGRESS] Successfully saved, reloading page...');
        location.reload(); 
      })
      .catch(function(e){
        console.error('[PROGRESS] Failed to toggle completion:', e);
        console.error('[PROGRESS] Error details:', e.code, e.message);
        alert('Could not update progress. Error: ' + e.message + '\nCheck console for details.');
      });
  }

  function initLessonCompletionButtons(){
    if (!isSingleLessonPage()) return;

    console.log('[PROGRESS] Initializing lesson completion buttons');

    try {
      var params = getQueryParams();
      var courseId = getCourseIdFromUrl();
      var lessonId = params.lesson;

      console.log('[PROGRESS] Lesson page:', {courseId, lessonId});

      if (!courseId || !lessonId) {
        console.warn('[PROGRESS] Missing courseId or lessonId');
        return;
      }

      auth.onAuthStateChanged(function(user){
        if (!user) {
          console.log('[PROGRESS] No user logged in for lesson buttons');
          return;
        }

        console.log('[PROGRESS] User logged in, checking selfProgress...');

        db.collection('users').doc(user.uid).get().then(function(userSnap){
          if (!userSnap.exists) {
            console.error('[PROGRESS] User document does not exist');
            return;
          }
          
          var userData = userSnap.data();
          var canSelfProgress = userData.selfProgress === true;
          
          console.log('[PROGRESS] selfProgress:', canSelfProgress, 'userData:', userData);
          
          if (!canSelfProgress) {
            console.log('[PROGRESS] selfProgress not enabled, skipping button creation');
            return;
          }

          db.collection('users').doc(user.uid).collection('progress').doc(courseId).get()
            .then(function(snap){
              var isCompleted = false;
              if (snap.exists) {
                var completed = snap.data().completed || {};
                isCompleted = completed[lessonId] === true;
              }

              console.log('[PROGRESS] Current lesson completion status:', isCompleted);
              console.log('[PROGRESS] Creating completion buttons...');
              createCompletionButtons(user.uid, courseId, lessonId, isCompleted);
            });
        }).catch(function(e){
          console.error('[PROGRESS] Error checking user/progress:', e);
        });
      });
    } catch(e) {
      console.error('[PROGRESS] Lesson completion init failed:', e);
    }
  }

  function createCompletionButtons(uid, courseId, lessonId, isCompleted){
    console.log('[PROGRESS] createCompletionButtons called');
    
    var courseConfig = window.VAULT_COURSES && window.VAULT_COURSES[courseId];
    if (!courseConfig) {
      console.error('[PROGRESS] No course config for:', courseId);
      return;
    }

    var courseIndexUrl = window.location.pathname;
    var nextLessonUrl = getNextLessonUrl(courseConfig, lessonId);

    console.log('[PROGRESS] courseIndexUrl:', courseIndexUrl);
    console.log('[PROGRESS] nextLessonUrl:', nextLessonUrl);

    var topPlaceholder = document.querySelector('#complete-button-top');
    var bottomPlaceholder = document.querySelector('#complete-button-bottom');
    
    console.log('[PROGRESS] Top placeholder found:', !!topPlaceholder);
    console.log('[PROGRESS] Bottom placeholder found:', !!bottomPlaceholder);

    if (topPlaceholder) {
      var topBtn = createButton(uid, courseId, lessonId, isCompleted, courseIndexUrl, nextLessonUrl);
      topPlaceholder.appendChild(topBtn);
      console.log('[PROGRESS] Top button created');
    }

    if (bottomPlaceholder) {
      var bottomBtn = createButton(uid, courseId, lessonId, isCompleted, courseIndexUrl, nextLessonUrl);
      bottomPlaceholder.appendChild(bottomBtn);
      console.log('[PROGRESS] Bottom button created');
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

    btn.addEventListener('click', function(){
      console.log('[PROGRESS] Complete button clicked');
      if (isCompleted) {
        toggleLessonCompletion(uid, courseId, lessonId, false, courseIndexUrl);
      } else {
        var redirectUrl = nextLessonUrl || courseIndexUrl;
        toggleLessonCompletion(uid, courseId, lessonId, true, redirectUrl);
      }
    });

    return btn;
  }

  function toggleLessonCompletion(uid, courseId, lessonId, newState, redirectUrl){
    console.log('[PROGRESS] toggleLessonCompletion:', {uid, courseId, lessonId, newState, redirectUrl});
    
    var update = {};
    update['completed.' + lessonId] = newState;
    update.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

    console.log('[PROGRESS] Writing update:', update);

    db.collection('users').doc(uid).collection('progress').doc(courseId)
      .set(update, { merge: true })
      .then(function(){
        console.log('[PROGRESS] Save successful, redirecting to:', redirectUrl);
        window.location.href = redirectUrl;
      })
      .catch(function(e){
        console.error('[PROGRESS] Failed to toggle completion:', e);
        console.error('[PROGRESS] Error code:', e.code);
        console.error('[PROGRESS] Error message:', e.message);
        alert('Could not update completion. Error: ' + e.message + '\nCheck console for details.');
      });
  }

  function init(){
    console.log('[PROGRESS] Initializing...');
    console.log('[PROGRESS] isCourseIndexPage:', isCourseIndexPage());
    console.log('[PROGRESS] isSingleLessonPage:', isSingleLessonPage());
    
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
  
  console.log('[PROGRESS] Script loaded successfully');
})();
