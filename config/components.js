/* components.js
   Purpose: UI components - toast notifications + hamburger menu navigation + universal site footer + scroll to top button
   Usage: Loaded conditionally on most pages
*/

(function(){
  'use strict';

  window.VaultToast = (function(){
    var container = null;
    
    function init(){
      if(container) return;
      container = document.createElement('div');
      container.id = 'vault-toast-container';
      container.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:999999;pointer-events:none;';
      document.body.appendChild(container);
    }
    
    function show(message, type){
      init();
      
      type = type || 'success';
      var colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6'
      };
      
      var toast = document.createElement('div');
      toast.style.cssText = 
        'background:' + colors[type] + ';' +
        'color:#fff;' +
        'padding:12px 20px;' +
        'border-radius:8px;' +
        'margin-bottom:10px;' +
        'box-shadow:0 4px 12px rgba(0,0,0,.15);' +
        'pointer-events:auto;' +
        'animation:slideIn 0.3s ease;' +
        'font-size:var(--text-ui);' +
        'max-width:300px;';
      toast.textContent = message;
      
      container.appendChild(toast);
      
      setTimeout(function(){ 
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(function(){ toast.remove(); }, 300);
      }, 2500);
    }
    
    return {
      success: function(msg){ show(msg, 'success'); },
      error: function(msg){ show(msg, 'error'); },
      info: function(msg){ show(msg, 'info'); }
    };
  })();

  // Inject animations CSS
  var style = document.createElement('style');
  style.textContent = 
    '@keyframes slideIn {' +
    '  from { transform: translateY(100px); opacity: 0; }' +
    '  to { transform: translateY(0); opacity: 1; }' +
    '}' +
    '@keyframes slideOut {' +
    '  from { transform: translateY(0); opacity: 1; }' +
    '  to { transform: translateY(100px); opacity: 0; }' +
    '}';
  document.head.appendChild(style);
})();
/* vault-footer.js
   Purpose: Universal footer for all pages
   Usage: Automatically added on all pages
*/

(function(){
  'use strict';
  
  function init(){
    injectStyles();
    createFooter();
  }
  
  function createFooter(){
    var footer = document.createElement('footer');
    footer.id = 'vault-footer';
    footer.className = 'vault-footer';
    
    var footerHTML = 
      '<div class="vault-footer-content">' +
      '  <img src="/assets/dwd-logo-500px.webp" alt="Dave Drums" class="vault-footer-logo">' +
      '  <nav class="vault-footer-links">' +
      '    <a href="https://www.davedrums.com.au/about" target="_blank" rel="noopener">About</a>' +
      '    <a href="https://vault.davedrums.com.au/contact" target="_blank" rel="noopener">Contact</a>' +
      '    <a href="https://www.davedrums.com.au/terms" target="_blank" rel="noopener">Terms</a>' +
      '    <a href="https://www.davedrums.com.au/privacy" target="_blank" rel="noopener">Privacy</a>' +
      '  </nav>' +
      '  <div class="vault-footer-copyright">© 2026 Dave D\'Amore Drums</div>' +
      '</div>';
    
    footer.innerHTML = footerHTML;
    document.body.appendChild(footer);
  }
  
  function injectStyles(){
    var css = `
    .vault-footer {
      background: #1a1a2e;
      padding: 32px 20px;
      color: #fff;
      border-top: 3px solid #06b3fd;
      margin-top: 60px;
    }
    .vault-footer-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    .vault-footer-logo {
      height: 64px;
      width: auto;
      opacity: 0.9;
    }
    .vault-footer-links {
      display: flex;
      gap: 32px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .vault-footer-links a {
      color: rgba(255,255,255,0.8);
      text-decoration: none;
      font-size: var(--text-small);
      transition: color 0.2s;
    }
    .vault-footer-links a:hover {
      color: #06b3fd;
    }
    .vault-footer-copyright {
      color: rgba(255,255,255,0.5);
      font-size: var(--text-tiny);
    }
    @media (max-width: 768px) {
      .vault-footer {
        padding: 28px 20px;
      }
      .vault-footer-links {
        gap: 24px;
      }
    }
    `;
    
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* vault-practice-timer.js
   Purpose: Practice session timer with bottom sticky bar
   Usage: Automatically added on lesson pages, /metronome, and /groove
   
   Features:
   - Timer persists across page navigation (same browser session)
   - Auto-saves every 5 minutes while running
   - Saves on page close/navigation
   - Minimal Firestore operations (sessionStorage for state)
*/

(function(){
  'use strict';
  
  // Check if we should show timer (lesson pages, metronome, groove)
  function shouldShowTimer() {
    var path = window.location.pathname;
    var search = window.location.search;
    
    // Metronome or Groove pages
    if (path.includes('/metronome') || path.includes('/groove')) {
      return true;
    }
    
    // Lesson pages (has l= parameter)
    if (search.includes('l=')) {
      return true;
    }
    
    return false;
  }
  
    if (!shouldShowTimer()) {
    // On non-timer pages, just clear sessionStorage
    // The session was already saved via beforeunload when leaving the timer page
    try {
      sessionStorage.removeItem('vault_timer_seconds');
      sessionStorage.removeItem('vault_timer_playing');
      sessionStorage.removeItem('vault_timer_session_id');
      sessionStorage.removeItem('vault_timer_last_update');
    } catch(e) {}
    return;
  }
  
  // Wait for Firebase
  function waitForFirebase(callback) {
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
      callback();
    } else {
      setTimeout(function() { waitForFirebase(callback); }, 100);
    }
  }
  
  waitForFirebase(function() {
    var db = firebase.firestore();
    var auth = firebase.auth();
    var currentUser = null;
    
    // ============================================
    // TIMER STATE
    // ============================================
    var isPlaying = false;
    var isPaused = false;
    var seconds = 0;
    var timerInterval = null;
    var lastActivityTime = Date.now();
    var idleCheckInterval = null;
    var autoSaveInterval = null;
    var currentSessionId = null;
    
    var IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    var AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes
    
    // ============================================
    // SESSION STORAGE (persist across pages)
    // ============================================
    function saveTimerState() {
      try {
        sessionStorage.setItem('vault_timer_seconds', seconds.toString());
        sessionStorage.setItem('vault_timer_playing', isPlaying.toString());
        sessionStorage.setItem('vault_timer_session_id', currentSessionId || '');
        sessionStorage.setItem('vault_timer_last_update', Date.now().toString());
      } catch(e) {
        console.warn('Failed to save timer state:', e);
      }
    }
    
    function restoreTimerState() {
      try {
        var savedSeconds = sessionStorage.getItem('vault_timer_seconds');
        var savedPlaying = sessionStorage.getItem('vault_timer_playing');
        var savedSessionId = sessionStorage.getItem('vault_timer_session_id');
        var lastUpdate = sessionStorage.getItem('vault_timer_last_update');
        
        if (savedSeconds) {
          seconds = parseInt(savedSeconds, 10) || 0;
          
          // Add elapsed time if timer was playing
          if (savedPlaying === 'true' && lastUpdate) {
            var elapsed = Math.floor((Date.now() - parseInt(lastUpdate, 10)) / 1000);
            seconds += elapsed;
          }
        }
        
        if (savedSessionId) {
          currentSessionId = savedSessionId;
        }
        
        if (savedPlaying === 'true') {
          isPlaying = true;
          startTimer();
          startPeriodicAutoSave();
        }
        
        updateTimerDisplays();
        updateUI();
      } catch(e) {
        console.warn('Failed to restore timer state:', e);
      }
    }
    
    function clearTimerState() {
      try {
        sessionStorage.removeItem('vault_timer_seconds');
        sessionStorage.removeItem('vault_timer_playing');
        sessionStorage.removeItem('vault_timer_session_id');
        sessionStorage.removeItem('vault_timer_last_update');
      } catch(e) {}
    }
    
    // ============================================
    // LESSON INFO HELPERS
    // ============================================
    function getCurrentLessonInfo() {
      var urlParams = new URLSearchParams(window.location.search);
      var slug = Array.from(urlParams.keys()).find(function(k) { return k !== 'l'; });
      var lessonId = urlParams.get('l');
      
      var path = window.location.pathname;
      var parts = path.split('/').filter(function(p) { return p; });
      var pathway = null;
      for (var i = parts.length - 1; i >= 0; i--) {
        var part = parts[i];
        if (part === 'gs' || part === 'fs' || part === 'rs' || part === 'ks' || part === 'ss') {
          pathway = part;
          break;
        }
      }
      
      var courseId = null;
      if (pathway && slug && window.getCourseBySlug) {
        var result = window.getCourseBySlug(pathway, slug);
        courseId = result ? result.courseId : null;
      }
      
      var heroBadge = document.getElementById('hero-course-level');
      var lessonTitle = heroBadge ? heroBadge.textContent.trim() : '';
      if (lessonTitle.startsWith('Lesson ')) {
        lessonTitle = lessonTitle.substring(7);
      }
      
      return {
        courseId: courseId,
        lessonId: lessonId,
        lessonTitle: lessonTitle
      };
    }
    
    function getTodayDateKey() {
      var now = new Date();
      var offset = 10 * 60; // Brisbane time (UTC+10)
      var localMs = now.getTime() + (offset * 60 * 1000);
      var localDate = new Date(localMs);
      var y = localDate.getUTCFullYear();
      var m = String(localDate.getUTCMonth() + 1).padStart(2, '0');
      var d = String(localDate.getUTCDate()).padStart(2, '0');
      return y + '-' + m + '-' + d;
    }
    
    function getDeviceType() {
      try {
        var w = window.innerWidth || 1024;
        return w <= 768 ? 'mobile' : 'desktop';
      } catch(e) {
        return 'other';
      }
    }
    
    // ============================================
    // TIMER FUNCTIONS
    // ============================================
    function startTimer() {
      if (timerInterval) clearInterval(timerInterval);
      
      timerInterval = setInterval(function() {
        seconds++;
        updateTimerDisplays();
        saveTimerState();
      }, 1000);
      
      startIdleCheck();
    }
    
    function stopTimer() {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      stopIdleCheck();
    }
    
    function updateTimerDisplays() {
      var mins = Math.floor(seconds / 60);
      var secs = seconds % 60;
      var timeStr = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
      
      var timerBtn = document.getElementById('vault-timer-btn-time');
      if (timerBtn) timerBtn.textContent = timeStr;
    }
        
     function updateUI() {
      var timerBtn = document.getElementById('vault-timer-btn');
      if (!timerBtn) return;
      
      if (isPlaying) {
        timerBtn.classList.add('active');
      } else {
        timerBtn.classList.remove('active');
      }
    }
    
    
    // ============================================
    // IDLE DETECTION
    // ============================================
    function startIdleCheck() {
      if (idleCheckInterval) clearInterval(idleCheckInterval);
      lastActivityTime = Date.now();
      
      idleCheckInterval = setInterval(function() {
        var idleTime = Date.now() - lastActivityTime;
        if (idleTime >= IDLE_TIMEOUT && isPlaying) {
          togglePlayPause();
          isPaused = true;
          if (window.VaultToast) {
            window.VaultToast.info('Timer paused due to inactivity');
          }
        }
      }, 10000);
    }
    
    function stopIdleCheck() {
      if (idleCheckInterval) {
        clearInterval(idleCheckInterval);
        idleCheckInterval = null;
      }
    }
    
    function onActivity() {
      lastActivityTime = Date.now();
      if (isPaused && !isPlaying) {
        isPaused = false;
      }
    }
    
    var activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach(function(evt) {
      window.addEventListener(evt, onActivity, { passive: true });
    });
    
    // ============================================
    // FIRESTORE SESSION MANAGEMENT
    // ============================================
    function createNewSession() {
      currentSessionId = Date.now().toString();
      
      var lessonInfo = getCurrentLessonInfo();
      var dateKey = getTodayDateKey();
      var device = getDeviceType();
      
      var sessionData = {
        courseId: lessonInfo.courseId || 'metronome-groove',
        lessonId: lessonInfo.lessonId || window.location.pathname,
        lessonTitle: lessonInfo.lessonTitle || document.title,
        duration: seconds,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        date: dateKey,
        device: device,
        status: 'active'
      };
      
      db.collection('users').doc(currentUser.uid).collection('practice')
        .doc('sessions').collection('items').doc(currentSessionId)
        .set(sessionData)
        .then(function() {
          console.log('Session created:', currentSessionId);
          saveTimerState();
        })
        .catch(function(err) {
          console.error('Failed to create session:', err);
        });
    }
    
    function updateActiveSession() {
      if (!currentUser || !currentSessionId || seconds < 10) return;
      
      var lessonInfo = getCurrentLessonInfo();
      
      db.collection('users').doc(currentUser.uid).collection('practice')
        .doc('sessions').collection('items').doc(currentSessionId)
        .update({
          duration: seconds,
          courseId: lessonInfo.courseId || 'metronome-groove',
          lessonId: lessonInfo.lessonId || window.location.pathname,
          lessonTitle: lessonInfo.lessonTitle || document.title,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(function() {
          console.log('Session updated:', seconds, 'seconds');
        })
        .catch(function(err) {
          console.warn('Failed to update session:', err);
        });
    }
    
    function finalizeSession() {
      if (!currentUser || !currentSessionId || seconds < 10) {
        clearTimerState();
        currentSessionId = null;
        return;
      }
      
      var dateKey = getTodayDateKey();
      
      // Final update to session
      db.collection('users').doc(currentUser.uid).collection('practice')
        .doc('sessions').collection('items').doc(currentSessionId)
        .update({
          duration: seconds,
          status: 'completed',
          completedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .catch(function(err) {
          console.warn('Failed to finalize session:', err);
        });
      
      // Update total stats
      db.collection('users').doc(currentUser.uid).collection('practice').doc('stats')
        .set({
          totalSeconds: firebase.firestore.FieldValue.increment(seconds),
          sessionCount: firebase.firestore.FieldValue.increment(1),
          lastPracticeDate: dateKey
        }, { merge: true })
        .catch(function(err) {
          console.warn('Failed to update stats:', err);
        });
      
      console.log('Session finalized:', currentSessionId, seconds, 'seconds');
      
      // Reset
      seconds = 0;
      currentSessionId = null;
      clearTimerState();
      updateTimerDisplays();
    }
    
    // ============================================
    // PERIODIC AUTO-SAVE
    // ============================================
    function startPeriodicAutoSave() {
      if (autoSaveInterval) clearInterval(autoSaveInterval);
      
      autoSaveInterval = setInterval(function() {
        if (isPlaying && currentUser && currentSessionId) {
          updateActiveSession();
        }
      }, AUTO_SAVE_INTERVAL);
    }
    
    function stopPeriodicAutoSave() {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
      }
    }
    
    // ============================================
    // PLAY/PAUSE TOGGLE
    // ============================================
    function togglePlayPause() {
      if (isPlaying) {
        // STOP
        isPlaying = false;
        stopTimer();
        stopPeriodicAutoSave();
        finalizeSession();
        
        // Show toast
        if (window.VaultToast) {
          window.VaultToast.info('Practice session stopped');
        }
      } else {
        // START
        isPlaying = true;
        
        // Create new session if none exists
        if (!currentSessionId) {
          createNewSession();
        }
        
        startTimer();
        startPeriodicAutoSave();
        
        // Show toast
        if (window.VaultToast) {
          window.VaultToast.success('Practice session started');
        }
      }
      updateUI();
    }
    

    
    // ============================================
    // UI INJECTION
    // ============================================
     function injectUI() {
      injectStyles();
      
      // Timer button (bottom right) - click to start/stop
      var btn = document.createElement('button');
      btn.id = 'vault-timer-btn';
      btn.className = 'vault-timer-btn';
      btn.innerHTML = 
        '<div class="vault-timer-icon">' +
        '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">' +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />' +
        '</svg>' +
        '</div>' +
        '<div id="vault-timer-btn-time" class="vault-timer-time">00:00</div>';
      
      btn.onclick = togglePlayPause;
      document.body.appendChild(btn);
    }

     function injectStyles() {
      var css = `
        .vault-timer-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 72px;
          height: 72px;
          background: rgba(6, 179, 253, 0.9);
          border: none;
          border-radius: 50%;
          color: #fff;
          cursor: pointer;
          z-index: 9997;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: all 0.3s ease;
        }
        
        .vault-timer-btn:hover {
          background: rgba(5, 153, 220, 0.9);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.2);
        }
        
        .vault-timer-btn.active {
          background: rgba(16, 185, 129, 0.9);
        }
        
        .vault-timer-icon {
          width: 28px;
          height: 28px;
        }
        
        .vault-timer-icon svg {
          width: 100%;
          height: 100%;
        }
        
        .vault-timer-time {
          font-size: var(--text-micro);
          font-weight: 600;
          font-family: 'Inter', monospace;
          font-variant-numeric: tabular-nums;
        }
        
        @media (max-width: 768px) {
          .vault-timer-btn {
            bottom: 20px;
            right: 20px;
            width: 64px;
            height: 64px;
          }
          
          .vault-timer-icon {
            width: 24px;
            height: 24px;
          }
        }
      `;
      
      var style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
    }

    
    
    // ============================================
    // PAGE LIFECYCLE - AUTO-SAVE ON NAVIGATION
    // ============================================
    var lastAutoSave = 0;
    
   function autoSaveOnPageChange() {
      if (!currentUser) return;
      
      // Debounce (prevent duplicate saves)
      var now = Date.now();
      if (now - lastAutoSave < 2000) return;
      lastAutoSave = now;
      
      // If timer is running, finalize the session
      // (we don't know if next page will be a timer page or not)
      if (currentSessionId && seconds >= 10 && isPlaying) {
        var dateKey = getTodayDateKey();
        
        // Final update to session
        db.collection('users').doc(currentUser.uid).collection('practice')
          .doc('sessions').collection('items').doc(currentSessionId)
          .update({
            duration: seconds,
            status: 'completed',
            completedAt: firebase.firestore.FieldValue.serverTimestamp()
          })
          .catch(function(err) {
            console.warn('Failed to finalize session:', err);
          });
        
        // Update stats
        db.collection('users').doc(currentUser.uid).collection('practice').doc('stats')
          .set({
            totalSeconds: firebase.firestore.FieldValue.increment(seconds),
            sessionCount: firebase.firestore.FieldValue.increment(1),
            lastPracticeDate: dateKey
          }, { merge: true })
          .catch(function(err) {
            console.warn('Failed to update stats:', err);
          });
      } else if (currentSessionId && seconds >= 10) {
        // Timer is paused, just update duration
        updateActiveSession();
      }
      
      // Save state for restoration
      saveTimerState();
    }
    
    window.addEventListener('beforeunload', autoSaveOnPageChange);
    window.addEventListener('pagehide', autoSaveOnPageChange);
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        autoSaveOnPageChange();
      }
    });
    
    // ============================================
    // INITIALIZE
    // ============================================
    auth.onAuthStateChanged(function(user) {
      currentUser = user;
      
      if (user) {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
              injectUI();
              restoreTimerState();
            }, 1500);
          });
        } else {
          setTimeout(function() {
            injectUI();
            restoreTimerState();
          }, 1500);
        }
      }
    });
  });
})();
