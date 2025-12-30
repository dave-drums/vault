/* practice-tracker.js
   Purpose: Manual practice session tracking with timer UI
   Usage: Load on lesson pages only (gs.html, fs.html, rs.html, etc)
   
   Creates:
   - Sticky practice bar with timer
   - Practice sessions saved to users/{uid}/practice/sessions/
   - Aggregate stats in users/{uid}/practice/stats
*/

(function(){
  'use strict';

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

    // Only run on lesson pages (has ?l= parameter)
    var urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.get('l')) return;

    // ============================================
    // TIMER STATE
    // ============================================
    var isPlaying = false;
    var isPaused = false;
    var seconds = 0;
    var timerInterval = null;
    var lastActivityTime = Date.now();
    var idleCheckInterval = null;
    var wasPlayingBeforeModal = false;
    
    var IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

    // ============================================
    // GET LESSON INFO
    // ============================================
    function getCurrentLessonInfo() {
      var courseNum = urlParams.get('c');
      var lessonId = urlParams.get('l');
      
      // Get pathway from URL (gs, fs, rs, etc)
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
      
      var courseId = pathway && courseNum ? pathway + courseNum : null;
      
      // Get lesson title from hero badge
      var heroBadge = document.getElementById('hero-course-level');
      var lessonTitle = heroBadge ? heroBadge.textContent.trim() : '';
      if (lessonTitle.startsWith('Lesson ')) {
        lessonTitle = lessonTitle.substring(7); // Remove "Lesson " prefix
      }
      
      return {
        courseId: courseId,
        lessonId: lessonId,
        lessonTitle: lessonTitle
      };
    }

    // ============================================
    // DATE HELPERS
    // ============================================
    function getTodayDateKey() {
      var now = new Date();
      var offset = 10 * 60; // 10 hour offset for Brisbane time
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
      }, 1000);
      
      // Start idle detection
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
      
      var practiceTime = document.getElementById('practice-time');
      var dropdownTimer = document.getElementById('dropdown-timer');
      var summaryTimer = document.getElementById('summary-timer');
      
      if (practiceTime) practiceTime.textContent = timeStr;
      if (dropdownTimer) dropdownTimer.textContent = timeStr;
      if (summaryTimer) summaryTimer.textContent = timeStr;
    }

    function updateUI() {
      var practiceBtn = document.getElementById('practice-btn');
      var practiceText = document.getElementById('practice-text');
      var practiceTime = document.getElementById('practice-time');
      var playDropdownBtn = document.getElementById('btn-play-dropdown');
      var playDropdownText = document.getElementById('play-dropdown-text');
      
      if (!practiceBtn) return;
      
      // Update main button
      if (isPlaying) {
        practiceBtn.classList.add('active');
        practiceText.textContent = 'Practicing';
        practiceText.style.display = 'block';
        practiceTime.style.display = 'block';
      } else if (seconds > 0) {
        practiceBtn.classList.remove('active');
        practiceText.textContent = 'Practice Timer';
        practiceText.style.display = 'block';
        practiceTime.style.display = 'block';
      } else {
        practiceBtn.classList.remove('active');
        practiceText.textContent = 'Practice Timer';
        practiceText.style.display = 'block';
        practiceTime.style.display = 'none';
      }
      
      // Update dropdown button
      if (playDropdownBtn) {
        if (isPlaying) {
          playDropdownBtn.classList.add('active');
          playDropdownText.textContent = '⏸ Pause';
        } else {
          playDropdownBtn.classList.remove('active');
          playDropdownText.textContent = '▶ Start';
        }
      }
    }

    // ============================================
    // IDLE DETECTION
    // ============================================
    function startIdleCheck() {
      if (idleCheckInterval) clearInterval(idleCheckInterval);
      
      lastActivityTime = Date.now();
      
      // Check every 10 seconds
      idleCheckInterval = setInterval(function() {
        var idleTime = Date.now() - lastActivityTime;
        if (idleTime >= IDLE_TIMEOUT && isPlaying) {
          // Auto-pause
          togglePlayPause();
          isPaused = true;
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
      
      // If paused due to idle, resume
      if (isPaused && !isPlaying) {
        isPaused = false;
      }
    }

    // Bind activity listeners
    var activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach(function(evt) {
      window.addEventListener(evt, onActivity, { passive: true });
    });

    // ============================================
    // PLAY/PAUSE/SAVE
    // ============================================
    function togglePlayPause() {
      isPlaying = !isPlaying;
      
      if (isPlaying) {
        startTimer();
      } else {
        stopTimer();
      }
      
      updateUI();
    }

    function showModal() {
      wasPlayingBeforeModal = isPlaying;
      
      if (isPlaying) {
        isPlaying = false;
        stopTimer();
        updateUI();
      }
      
      var modal = document.getElementById('end-session-modal');
      if (modal) modal.classList.add('show');
      
      closeDropdown();
    }

    function hideModal() {
      var modal = document.getElementById('end-session-modal');
      if (modal) modal.classList.remove('show');
      
      if (wasPlayingBeforeModal) {
        isPlaying = true;
        startTimer();
        updateUI();
        wasPlayingBeforeModal = false;
      }
    }

    function saveSession() {
      if (!currentUser || seconds === 0) {
        hideModal();
        resetTimer();
        return;
      }
      
      var lessonInfo = getCurrentLessonInfo();
      var notes = document.getElementById('practice-notes');
      var notesText = notes ? notes.value.trim() : '';
      
      var sessionId = Date.now().toString();
      var dateKey = getTodayDateKey();
      var device = getDeviceType();
      
      var sessionData = {
        courseId: lessonInfo.courseId,
        lessonId: lessonInfo.lessonId,
        lessonTitle: lessonInfo.lessonTitle,
        duration: seconds,
        notes: notesText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        date: dateKey,
        device: device
      };
      
      // Save session
      db.collection('users').doc(currentUser.uid).collection('practice').doc('sessions')
        .collection('items').doc(sessionId)
        .set(sessionData)
        .then(function() {
          // Update aggregate stats
          return updatePracticeStats(seconds);
        })
        .then(function() {
          if (window.VaultToast) {
            window.VaultToast.success('Practice session saved!');
          }
          hideModal();
          resetTimer();
        })
        .catch(function(err) {
          console.error('Error saving session:', err);
          if (window.VaultToast) {
            window.VaultToast.error('Failed to save session');
          }
        });
    }

    function updatePracticeStats(sessionSeconds) {
      var statsRef = db.collection('users').doc(currentUser.uid).collection('practice').doc('stats');
      var dateKey = getTodayDateKey();
      
      return statsRef.set({
        totalSeconds: firebase.firestore.FieldValue.increment(sessionSeconds),
        sessionCount: firebase.firestore.FieldValue.increment(1),
        lastPracticeDate: dateKey
      }, { merge: true });
    }

    function resetTimer() {
      isPlaying = false;
      isPaused = false;
      seconds = 0;
      wasPlayingBeforeModal = false;
      stopTimer();
      updateTimerDisplays();
      updateUI();
      
      var notes = document.getElementById('practice-notes');
      if (notes) notes.value = '';
    }

    // ============================================
    // DROPDOWN CONTROL
    // ============================================
    var dropdownOpen = false;
    
    function toggleDropdown() {
      dropdownOpen = !dropdownOpen;
      var dropdown = document.getElementById('practice-dropdown');
      if (dropdown) {
        dropdown.classList.toggle('show', dropdownOpen);
      }
    }

    function closeDropdown() {
      dropdownOpen = false;
      var dropdown = document.getElementById('practice-dropdown');
      if (dropdown) {
        dropdown.classList.remove('show');
      }
    }

    // ============================================
    // INJECT UI
    // ============================================
    function injectUI() {
      // Check if we're on a lesson page (not course index)
      var lessonContent = document.getElementById('lesson-content');
      if (!lessonContent || lessonContent.style.display === 'none') return;
      
      // Find the hero element
      var hero = document.querySelector('.course-hero');
      if (!hero) return;
      
      // Create sticky bar
      var stickyBar = document.createElement('div');
      stickyBar.className = 'practice-sticky-bar';
      stickyBar.innerHTML = `
        <div class="practice-bar-inner">
          <button class="lesson-nav-back" onclick="window.location.href=window.location.pathname + '?c=' + new URLSearchParams(window.location.search).get('c')">
            ← Back to Course
          </button>
          
          <div class="practice-center-btn">
            <button class="practice-btn" id="practice-btn">
              <span class="practice-icon">⏱️</span>
              <span class="practice-text" id="practice-text">Practice Timer</span>
              <span class="practice-time" id="practice-time" style="display:none;">00:00</span>
            </button>
            
            <div class="practice-dropdown" id="practice-dropdown">
              <div class="dropdown-header">
                <div class="dropdown-timer" id="dropdown-timer">00:00</div>
                <div class="dropdown-lesson">Loading...</div>
              </div>
              
              <div class="dropdown-controls">
                <button class="btn-play-dropdown" id="btn-play-dropdown">
                  <span id="play-dropdown-text">▶ Start</span>
                </button>
                <button class="btn-end-dropdown" id="btn-end-dropdown">✓ End Session</button>
              </div>
              
              <div class="dropdown-divider"></div>
              
              <div class="dropdown-stats">
                Total today: 0:00
              </div>
            </div>
          </div>
          
          <button class="lesson-nav-complete" id="complete-lesson-btn">
            Complete Lesson →
          </button>
        </div>
      `;
      
      // Insert after hero
      hero.parentNode.insertBefore(stickyBar, hero.nextSibling);
      
      // Create modal
      var modal = document.createElement('div');
      modal.className = 'end-session-modal';
      modal.id = 'end-session-modal';
      modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2>End Practice Session</h2>
            <button class="modal-close" id="modal-close">&times;</button>
          </div>
          
          <div class="modal-body">
            <div class="session-summary">
              <div class="summary-timer" id="summary-timer">00:00</div>
              <div class="summary-label">Total Practice Time</div>
            </div>
            
            <div class="form-group">
              <label for="practice-notes">Practice Notes (Optional)</label>
              <textarea id="practice-notes" placeholder="What did you work on? Any breakthroughs or challenges?"></textarea>
              <p class="form-hint">Jot down what you practiced, any struggles, or improvements you noticed.</p>
            </div>
          </div>
          
          <div class="modal-actions">
            <button class="btn-cancel" id="btn-cancel">Cancel</button>
            <button class="btn-save" id="btn-save">Save Session</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Update lesson name in dropdown
      var lessonInfo = getCurrentLessonInfo();
      var dropdownLesson = document.querySelector('.dropdown-lesson');
      if (dropdownLesson && lessonInfo.lessonTitle) {
        dropdownLesson.textContent = lessonInfo.lessonTitle;
      }
      
      // Bind events
      bindEvents();
      
      // Inject styles
      injectStyles();
    }

    function bindEvents() {
      var practiceBtn = document.getElementById('practice-btn');
      var playDropdownBtn = document.getElementById('btn-play-dropdown');
      var endDropdownBtn = document.getElementById('btn-end-dropdown');
      var modalClose = document.getElementById('modal-close');
      var btnCancel = document.getElementById('btn-cancel');
      var btnSave = document.getElementById('btn-save');
      var completeBtn = document.getElementById('complete-lesson-btn');
      
      if (practiceBtn) {
        practiceBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          toggleDropdown();
        });
      }
      
      if (playDropdownBtn) {
        playDropdownBtn.addEventListener('click', togglePlayPause);
      }
      
      if (endDropdownBtn) {
        endDropdownBtn.addEventListener('click', showModal);
      }
      
      if (modalClose) modalClose.addEventListener('click', hideModal);
      if (btnCancel) btnCancel.addEventListener('click', hideModal);
      if (btnSave) btnSave.addEventListener('click', saveSession);
      
      // Complete lesson button - find existing handler
      if (completeBtn) {
        var existingCompleteBtn = document.getElementById('complete-lesson-top') || 
                                   document.getElementById('complete-lesson-bottom');
        if (existingCompleteBtn) {
          completeBtn.addEventListener('click', function() {
            existingCompleteBtn.click();
          });
        }
      }
      
      // Close dropdown when clicking outside
      document.addEventListener('click', function(e) {
        var practiceBtn = document.getElementById('practice-btn');
        var dropdown = document.getElementById('practice-dropdown');
        if (practiceBtn && dropdown && 
            !practiceBtn.contains(e.target) && 
            !dropdown.contains(e.target)) {
          closeDropdown();
        }
      });
    }

    function injectStyles() {
      if (document.getElementById('practice-tracker-styles')) return;
      
      var style = document.createElement('style');
      style.id = 'practice-tracker-styles';
      style.textContent = `
        /* Practice Sticky Bar */
        .practice-sticky-bar {
          position: sticky;
          top: 0;
          background: rgba(26, 26, 46, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 2px solid rgba(6, 179, 253, 0.3);
          box-shadow: -4px 0 20px rgba(0,0,0,0.3);
          z-index: 50;
          transition: all 0.3s;
        }
        
        .practice-bar-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 14px 20px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 16px;
        }
        
        .lesson-nav-back {
          justify-self: start;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
        }
        
        .lesson-nav-back:hover {
          background: rgba(255,255,255,0.15);
          border-color: rgba(255,255,255,0.3);
        }
        
        .practice-center-btn {
          justify-self: center;
          position: relative;
        }
        
        .practice-btn {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          padding: 10px 20px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: white;
        }
        
        .practice-btn:hover {
          background: rgba(255,255,255,0.15);
          border-color: rgba(255,255,255,0.3);
        }
        
        .practice-btn.active {
          background: rgba(6,179,253,0.2);
          border-color: rgba(6,179,253,0.5);
          color: #38bdf8;
        }
        
        .practice-icon {
          font-size: 18px;
          line-height: 1;
        }
        
        .practice-text {
          font-size: 14px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
        }
        
        .practice-time {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          color: #38bdf8;
        }
        
        .lesson-nav-complete {
          justify-self: end;
          background: linear-gradient(135deg, #06b3fd 0%, #38bdf8 100%);
          border: none;
          color: #fff;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
          box-shadow: 0 2px 8px rgba(6,179,253,0.3);
        }
        
        .lesson-nav-complete:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(6,179,253,0.4);
        }
        
        /* Dropdown */
        .practice-dropdown {
          position: absolute;
          top: calc(100% + 12px);
          left: 50%;
          transform: translateX(-50%);
          background: rgba(26, 26, 46, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 12px;
          border: 1px solid rgba(6, 179, 253, 0.3);
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          padding: 20px;
          width: 300px;
          display: none;
          z-index: 100;
        }
        
        .practice-dropdown.show {
          display: block;
        }
        
        .practice-dropdown::before {
          content: '';
          position: absolute;
          top: -6px;
          left: 50%;
          width: 12px;
          height: 12px;
          background: rgba(26, 26, 46, 0.85);
          border-left: 1px solid rgba(6, 179, 253, 0.3);
          border-top: 1px solid rgba(6, 179, 253, 0.3);
          transform: translateX(-50%) rotate(45deg);
        }
        
        .dropdown-header {
          text-align: center;
          margin-bottom: 16px;
        }
        
        .dropdown-timer {
          font-family: 'Oswald', sans-serif;
          font-size: 36px;
          color: #38bdf8;
          font-weight: 400;
          margin-bottom: 8px;
          letter-spacing: -1px;
          font-variant-numeric: tabular-nums;
        }
        
        .dropdown-lesson {
          font-size: 13px;
          color: rgba(255,255,255,0.6);
          margin-bottom: 16px;
        }
        
        .dropdown-controls {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        
        .btn-play-dropdown,
        .btn-end-dropdown {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }
        
        .btn-play-dropdown {
          background: rgba(255,255,255,0.1);
          color: white;
          border: 1px solid rgba(255,255,255,0.2);
        }
        
        .btn-play-dropdown:hover {
          background: rgba(255,255,255,0.15);
          border-color: rgba(255,255,255,0.3);
        }
        
        .btn-play-dropdown.active {
          background: rgba(6,179,253,0.2);
          border-color: rgba(6,179,253,0.5);
          color: #38bdf8;
        }
        
        .btn-end-dropdown {
          background: #06b3fd;
          color: white;
        }
        
        .btn-end-dropdown:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(6,179,253,0.3);
        }
        
        .dropdown-divider {
          height: 1px;
          background: rgba(255,255,255,0.1);
          margin: 16px 0;
        }
        
        .dropdown-stats {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          text-align: center;
        }
        
        /* Modal */
        .end-session-modal {
          position: fixed;
          inset: 0;
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        
        .end-session-modal.show {
          display: flex;
        }
        
        .modal-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.5);
        }
        
        .modal-content {
          position: relative;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .modal-header {
          padding: 24px;
          border-bottom: 1px solid #e9ecef;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .modal-header h2 {
          font-family: 'Inter', sans-serif;
          font-size: 18px;
          font-weight: 500;
          color: #1a1a1a;
        }
        
        .modal-close {
          background: none;
          border: none;
          font-size: 28px;
          color: #6c757d;
          cursor: pointer;
          line-height: 1;
          padding: 0;
          width: 32px;
          height: 32px;
        }
        
        .modal-close:hover {
          color: #1a1a1a;
        }
        
        .modal-body {
          padding: 24px;
        }
        
        .session-summary {
          background: linear-gradient(135deg, rgba(6,179,253,0.05), rgba(56,189,248,0.05));
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
          text-align: center;
        }
        
        .summary-timer {
          font-family: 'Oswald', sans-serif;
          font-size: 42px;
          color: #06b3fd;
          font-weight: 400;
          margin-bottom: 8px;
          letter-spacing: -1px;
        }
        
        .summary-label {
          font-size: 13px;
          color: #6c757d;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          font-weight: 600;
          font-size: 14px;
          color: #1a1a1a;
          margin-bottom: 8px;
        }
        
        .form-group textarea {
          width: 100%;
          min-height: 120px;
          padding: 12px;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          resize: vertical;
          transition: all 0.2s;
        }
        
        .form-group textarea:focus {
          outline: none;
          border-color: #06b3fd;
          box-shadow: 0 0 0 3px rgba(6,179,253,0.1);
        }
        
        .form-hint {
          font-size: 12px;
          color: #6c757d;
          margin-top: 6px;
        }
        
        .modal-actions {
          display: flex;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid #e9ecef;
        }
        
        .btn-cancel,
        .btn-save {
          flex: 1;
          padding: 14px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }
        
        .btn-cancel {
          background: white;
          border: 1px solid #e9ecef;
          color: #1a1a1a;
        }
        
        .btn-cancel:hover {
          background: #f8f9fa;
        }
        
        .btn-save {
          background: #06b3fd;
          border: none;
          color: white;
        }
        
        .btn-save:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(6,179,253,0.3);
        }
        
        /* Mobile */
        @media (max-width: 768px) {
          .practice-bar-inner {
            padding: 10px 12px;
            gap: 8px;
          }
          
          .lesson-nav-back,
          .lesson-nav-complete {
            font-size: 13px;
            padding: 8px 12px;
          }
          
          .practice-btn {
            font-size: 13px;
            padding: 8px 14px;
          }
          
          .practice-icon {
            font-size: 16px;
          }
          
          .practice-dropdown {
            width: 280px;
          }
        }
        
        @media (max-width: 640px) {
          .practice-bar-inner {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto;
            gap: 8px;
          }
          
          .lesson-nav-back {
            justify-self: stretch;
            grid-row: 1;
            grid-column: 1;
          }
          
          .practice-center-btn {
            justify-self: stretch;
            grid-row: 2;
            grid-column: 1;
          }
          
          .practice-btn {
            width: 100%;
            justify-content: center;
          }
          
          .lesson-nav-complete {
            justify-self: stretch;
            grid-row: 3;
            grid-column: 1;
          }
          
          .practice-dropdown {
            left: 50%;
            right: auto;
          }
        }
      `;
      
      document.head.appendChild(style);
    }

    // ============================================
    // INITIALIZE
    // ============================================
    auth.onAuthStateChanged(function(user) {
      currentUser = user;
      
      if (user) {
        // Wait for page to be ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() {
            setTimeout(injectUI, 500);
          });
        } else {
          setTimeout(injectUI, 500);
        }
      }
    });
  });
})();
