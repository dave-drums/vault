/* vault-unified.js - Consolidated metrics, tracking, and progress */

(function(){
  'use strict';

  // ============================================
  // SHARED UTILITIES
  // ============================================

  function hasFirebase(){
    return (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore);
  }

  var auth = hasFirebase() ? firebase.auth() : null;
  var db = hasFirebase() ? firebase.firestore() : null;
  var currentUser = null;

  function getCourseIdFromUrl(){
    var path = window.location.pathname;
    var parts = path.split('/').filter(function(p){ return p.length > 0; });
    if (parts.length < 2 || parts[0] !== 'vault') return null;
    
    var pathway = parts[1]; // gs, fs, ss, ks
    var params = getQueryParams();
    var courseNum = params.c;
    
    if (!courseNum) return null;
    return pathway + courseNum; // gs1, fs2, etc
  }

  function parseCourseId(courseId){
    // gs1 → {pathway: 'gs', num: '1'}
    var match = courseId.match(/^([a-z]+)(\d+)$/);
    if (!match) return null;
    return { pathway: match[1], num: match[2] };
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
    return !params.l;
  }

  function isSingleLessonPage(){
    var params = getQueryParams();
    return params.c && params.l;
  }

  function isProtectedPage(){
    return document.documentElement && 
           document.documentElement.dataset && 
           document.documentElement.dataset.protected === 'true';
  }

  // ============================================
  // METRICS TRACKING
  // ============================================

  var MetricsTracker = (function(){
    var IDLE_MS = 10 * 60 * 1000;
    var TICK_MS = 30 * 1000;
    var TAB_LOCK_TTL_MS = 45 * 1000;
    var LOCK_KEY = 'vault_metrics_active_tab';

    var tabId = 'tab_' + Math.random().toString(36).slice(2) + '_' + Date.now();
    var sessionActive = false;
    var sessionStartedAtMs = 0;
    var lastTickAtMs = 0;
    var lastActivityAtMs = 0;
    var endedByIdle = false;
    var tickTimer = null;
    var idleCheckTimer = null;

    function nowMs(){ return Date.now(); }

    function clampToSeconds(ms){
      var s = Math.floor(ms / 1000);
      return s < 0 ? 0 : s;
    }

    function readLock(){
      try {
        var raw = localStorage.getItem(LOCK_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch(e) {
        return null;
      }
    }

    function writeLock(){
      try {
        localStorage.setItem(LOCK_KEY, JSON.stringify({ tabId: tabId, ts: nowMs() }));
      } catch(e) {}
    }

    function isLeader(){
      var lock = readLock();
      if (!lock || !lock.tabId || !lock.ts) return true;
      if (lock.tabId === tabId) return true;
      if (nowMs() - lock.ts > TAB_LOCK_TTL_MS) return true;
      return false;
    }

    function getDeviceType(){
      try {
        var w = window.innerWidth || 1024;
        return w <= 768 ? 'mobile' : 'desktop';
      } catch(e) {
        return 'other';
      }
    }

    function getDeviceEmoji(type){
      if (type === 'mobile') return '📱';
      if (type === 'desktop') return '🖥️';
      return '🧩';
    }

    function getTodayDateKey(){
      var now = new Date();
      var offset = 10 * 60;
      var localMs = now.getTime() + (offset * 60 * 1000);
      var localDate = new Date(localMs);
      var y = localDate.getUTCFullYear();
      var m = String(localDate.getUTCMonth() + 1).padStart(2, '0');
      var d = String(localDate.getUTCDate()).padStart(2, '0');
      return y + '-' + m + '-' + d;
    }

    function metricsDocRef(uid){
      return db.doc('users/' + uid + '/metrics/stats');
    }

    function safeMergeSet(ref, data){
      return ref.set(data, { merge: true });
    }

    function safeIncSeconds(ref, seconds){
      if (!seconds || seconds <= 0) return Promise.resolve();
      return safeMergeSet(ref, { totalSeconds: firebase.firestore.FieldValue.increment(seconds) });
    }

    function writeDeviceInfoOnce(ref){
      var type = getDeviceType();
      var emoji = getDeviceEmoji(type);
      return safeMergeSet(ref, {
        lastDeviceType: type,
        lastDeviceEmoji: emoji
      });
    }

    function recordDailyPractice(ref, seconds){
      var dateKey = getTodayDateKey();
      var dailyRef = ref.parent.doc('daily').collection('sessions').doc(dateKey);
      var data = {
        practiced: true,
        lastSessionAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (seconds && seconds > 0) {
        data.totalSeconds = firebase.firestore.FieldValue.increment(seconds);
      }
      return dailyRef.set(data, { merge: true });
    }

    function stopTimers(){
      if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
      if (idleCheckTimer) { clearInterval(idleCheckTimer); idleCheckTimer = null; }
    }

    function endSession(reason){
      if (!sessionActive) return;
      sessionActive = false;
      stopTimers();

      var endMs = nowMs();
      var elapsedMs = endMs - lastTickAtMs;
      var elapsedSeconds = clampToSeconds(elapsedMs);
      endedByIdle = (reason === 'idle');

      if (currentUser && elapsedSeconds > 0 && isLeader()){
        try {
          var ref = metricsDocRef(currentUser.uid);
          safeIncSeconds(ref, elapsedSeconds);
          recordDailyPractice(ref, elapsedSeconds);
        } catch(e) {}
      }
    }

    function startSession(){
      if (!currentUser || !isProtectedPage() || !isLeader()) return;

      writeLock();
      sessionActive = true;
      endedByIdle = false;

      sessionStartedAtMs = nowMs();
      lastTickAtMs = sessionStartedAtMs;
      lastActivityAtMs = sessionStartedAtMs;

      var ref = metricsDocRef(currentUser.uid);
      writeDeviceInfoOnce(ref);
      recordDailyPractice(ref);

      tickTimer = setInterval(function(){
        if (!sessionActive) return;
        writeLock();
        if (!isLeader()){
          endSession('lost-leader');
          return;
        }

        var t = nowMs();
        var elapsedSeconds = clampToSeconds(t - lastTickAtMs);
        lastTickAtMs = t;

        try {
          safeIncSeconds(ref, elapsedSeconds);
          recordDailyPractice(ref, elapsedSeconds);
        } catch(e) {}
      }, TICK_MS);

      idleCheckTimer = setInterval(function(){
        if (!sessionActive) return;
        var idleFor = nowMs() - lastActivityAtMs;
        if (idleFor >= IDLE_MS){
          endSession('idle');
        }
      }, 5 * 1000);
    }

    function onActivity(){
      lastActivityAtMs = nowMs();
      if (!sessionActive && endedByIdle && isLeader()){
        startSession();
      }
    }

    function bindActivityListeners(){
      var opts = { passive: true };
      ['mousemove','keydown','click','scroll','touchstart'].forEach(function(evt){
        window.addEventListener(evt, onActivity, opts);
      });
    }

    function bindVisibilityAndUnload(){
      document.addEventListener('visibilitychange', function(){
        if (document.hidden){
          endSession('hidden');
        } else if (currentUser && !sessionActive){
          startSession();
        }
      });

      window.addEventListener('pagehide', function(){ endSession('unload'); });
      window.addEventListener('beforeunload', function(){ endSession('unload'); });
    }

    return {
      init: function(){
        if (!isProtectedPage()) return;
        bindActivityListeners();
        bindVisibilityAndUnload();
      },
      onUserChange: function(user){
        if (!user){
          endSession('logout');
        } else if (!document.hidden){
          startSession();
        }
      }
    };
  })();

  // ============================================
  // LESSON TRACKING
  // ============================================

  var LessonTracker = (function(){
    var VAULT_PATH_PREFIX = '/vault/';
    var VAULT_INDEX_PATH = '/vault';

    function isLessonPage(){
      var path = window.location.pathname;
      if (!path.startsWith('/vault/')) return false;
      var params = getQueryParams();
      return params.c && params.l;
    }

    function getLessonTitle(){
      var title = '';
      var h1 = document.querySelector('#lesson-content h1');
      if (h1 && h1.textContent) {
        title = h1.textContent.trim();
      }
      if (!title && document.title) {
        var titleParts = document.title.split('|');
        if (titleParts.length > 1) {
          // After render: "Start Here | Groove Studies 1"
          title = titleParts[0].trim();
        } else {
          title = document.title.split('—')[0].split('-')[0].trim();
        }
      }
      if (!title) {
        var params = getQueryParams();
        var lessonId = params.l;
        if (lessonId) {
          title = 'Lesson ' + lessonId;
        }
      }
      return title || 'Untitled Lesson';
    }

    function getFullLessonUrl(){
      return window.location.pathname + window.location.search;
    }

    function trackLessonView(){
      if (!currentUser || !isLessonPage()) return;
      
      // Wait for h1 to be rendered by lesson_code_block
      var attempts = 0;
      var checkForTitle = function(){
        attempts++;
        var h1 = document.querySelector('#lesson-content h1');
        if (h1 || attempts > 20) {
          var practiceDoc = db.collection('users').doc(currentUser.uid).collection('metrics').doc('practice');
          var lessonUrl = getFullLessonUrl();
          var lessonTitle = getLessonTitle();
          
          practiceDoc.set({
            lastLessonUrl: lessonUrl,
            lastLessonTitle: lessonTitle,
            lastLessonViewedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true }).catch(function(e){
            console.error('Failed to track lesson view:', e);
          });
        } else {
          setTimeout(checkForTitle, 100);
        }
      };
      checkForTitle();
    }

    return {
      init: function(){
        if (isLessonPage()) {
          trackLessonView();
          window.addEventListener('popstate', function(){
            if (isLessonPage()) {
              trackLessonView();
            }
          });
        }
      },
      onUserChange: function(user){
        if (user && isLessonPage()) {
          trackLessonView();
        }
      }
    };
  })();

  // ============================================
  // COURSE PROGRESS
  // ============================================

  var CourseProgress = (function(){
    var currentCourseId = null;
    var buttonObserver = null;

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

    window.vaultToggleLesson = function(lessonId, currentState){
      if (!currentUser || !currentCourseId) return;
      toggleCompletion(currentUser.uid, currentCourseId, lessonId, !currentState);
    };

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
        
        if (isCompleted) {
          statusCircle.classList.remove('incomplete');
          statusCircle.classList.add('completed');
        } else {
          statusCircle.classList.remove('completed');
          statusCircle.classList.add('incomplete');
        }
        
        lessonItem.onclick = function(){
          var parsed = parseCourseId(courseId);
          if (parsed) {
            window.location.href = '/vault/' + parsed.pathway + '?c=' + parsed.num + '&l=' + lessonId;
          }
        };
      });
    }

    function toggleCompletion(uid, courseId, lessonId, newState){
      db.collection('users').doc(uid).collection('progress').doc(courseId)
        .set({
          completed: {
            [lessonId]: newState
          },
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
        .then(function(){ 
          location.reload(); 
        })
        .catch(function(e){
          console.error('Toggle failed:', e);
          alert('Could not update progress: ' + e.message);
        });
    }

    function initCourseIndex(){
      var courseId = getCourseIdFromUrl();
      currentCourseId = courseId;
      
      var courseConfig = window.VAULT_COURSES && window.VAULT_COURSES[courseId];
      if (!courseConfig || !currentUser) return;

      updateActiveCourse(currentUser.uid, courseConfig.pathway, courseId);
      loadAndRenderProgress(currentUser.uid, courseId, courseConfig);
    }

    function getNextLessonUrl(courseConfig, currentLessonId, courseId){
      var lessons = courseConfig.lessons;
      var currentIndex = lessons.indexOf(currentLessonId);
      
      if (currentIndex === -1 || currentIndex === lessons.length - 1) {
        return null;
      }
      
      var nextLessonId = lessons[currentIndex + 1];
      var parsed = parseCourseId(courseId);
      if (!parsed) return null;
      return '/vault/' + parsed.pathway + '?c=' + parsed.num + '&l=' + nextLessonId;
    }

    function createButton(uid, courseId, lessonId, isCompleted, courseIndexUrl, nextLessonUrl, selfProgress){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vault-lesson-complete-btn';
      
      // Non-selfProgress users get simple Next Lesson button
      if (!selfProgress) {
        btn.textContent = nextLessonUrl ? 'Next Lesson →' : 'Back to Course';
        btn.style.cssText = 'display:inline-block;padding:10px 16px;' +
          'background:#f3f3f3;border:1px solid #ddd;border-radius:6px;' +
          'color:#333;font-size:14px;cursor:pointer;transition:all 0.2s;' +
          'text-decoration:none;box-sizing:border-box;';
        
        btn.addEventListener('mouseenter', function(){ btn.style.background = '#e8e8e8'; });
        btn.addEventListener('mouseleave', function(){ btn.style.background = '#f3f3f3'; });
        
        btn.onclick = function(){
          window.location.href = nextLessonUrl || courseIndexUrl;
        };
        
        return btn;
      }
      
      // selfProgress users get Complete Lesson button
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
        'transition:all 0.2s;text-decoration:none;box-sizing:border-box;';

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

    function createCompletionButton(uid, courseId, lessonId, isCompleted, selfProgress){
      var courseConfig = window.VAULT_COURSES && window.VAULT_COURSES[courseId];
      if (!courseConfig) return;

      var parsed = parseCourseId(courseId);
      if (!parsed) return;
      var courseIndexUrl = '/vault/' + parsed.pathway + '?c=' + parsed.num;
      var nextLessonUrl = getNextLessonUrl(courseConfig, lessonId, courseId);
      var btn = createButton(uid, courseId, lessonId, isCompleted, courseIndexUrl, nextLessonUrl, selfProgress);

      var topPlaceholder = document.querySelector('#complete-button-top');
      if (topPlaceholder && !topPlaceholder.querySelector('.vault-lesson-complete-btn')) {
        topPlaceholder.appendChild(btn);
      }
    }

    function watchForButtonPlaceholder(){
      if (!isSingleLessonPage() || !currentUser) return;

      var params = getQueryParams();
      var courseId = getCourseIdFromUrl();
      var lessonId = params.l;
      currentCourseId = courseId;

      if (!courseId || !lessonId) return;

      db.collection('users').doc(currentUser.uid).get().then(function(userSnap){
        var canSelfProgress = userSnap.exists && userSnap.data().selfProgress === true;

        db.collection('users').doc(currentUser.uid).collection('progress').doc(courseId).get()
          .then(function(snap){
            var isCompleted = false;
            if (snap.exists && canSelfProgress) {
              var completed = snap.data().completed || {};
              isCompleted = completed[lessonId] === true;
            }

            // Use MutationObserver to watch for placeholder
            buttonObserver = new MutationObserver(function(){
              var placeholder = document.querySelector('#complete-button-top');
              if (placeholder && !placeholder.querySelector('.vault-lesson-complete-btn')) {
                createCompletionButton(currentUser.uid, courseId, lessonId, isCompleted, canSelfProgress);
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
              createCompletionButton(currentUser.uid, courseId, lessonId, isCompleted, canSelfProgress);
              if (buttonObserver) {
                buttonObserver.disconnect();
                buttonObserver = null;
              }
            }
          });
      }).catch(function(e){
        console.error('Button init failed:', e);
      });
    }

    return {
      init: function(){
        if (isCourseIndexPage()) {
          initCourseIndex();
        } else if (isSingleLessonPage()) {
          watchForButtonPlaceholder();
        }
      },
      onUserChange: function(user){
        if (user) {
          if (isCourseIndexPage()) {
            initCourseIndex();
          } else if (isSingleLessonPage()) {
            watchForButtonPlaceholder();
          }
        }
      }
    };
  })();

  // ============================================
  // UNIFIED INITIALIZATION
  // ============================================

  function init(){
    if (!hasFirebase()) return;

    MetricsTracker.init();
    LessonTracker.init();
    CourseProgress.init();

    auth.onAuthStateChanged(function(user){
      currentUser = user || null;
      MetricsTracker.onUserChange(user);
      LessonTracker.onUserChange(user);
      CourseProgress.onUserChange(user);
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
