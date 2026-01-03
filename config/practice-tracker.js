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
          playDropdownText.textContent = 'Stop ⏹';
        } else {
          playDropdownBtn.classList.remove('active');
          playDropdownText.textContent = 'Start ▶';
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
        // Save session when stopping
        if (seconds > 0) {
          saveSession();
        }
      }
      
      updateUI();
    }

    function saveSession() {
      if (!currentUser || seconds === 0) {
        resetTimer();
        return;
      }
      
      var lessonInfo = getCurrentLessonInfo();
      var sessionId = Date.now().toString();
      var dateKey = getTodayDateKey();
      var device = getDeviceType();
      
      var sessionData = {
        courseId: lessonInfo.courseId,
        lessonId: lessonInfo.lessonId,
        lessonTitle: lessonInfo.lessonTitle,
        duration: seconds,
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
            window.VaultToast.success('Practice session logged');
          }
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
      stopTimer();
      updateTimerDisplays();
      updateUI();
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
      if (!lessonContent) return;
      
      // Check if it's hidden using computed style instead of inline style
      var isHidden = lessonContent.hasAttribute('style') && 
                     lessonContent.getAttribute('style').includes('display: none');
      if (isHidden) return;
      
      // Find the hero element
      var hero = document.querySelector('.course-hero');
      if (!hero) return;
      
      // Check if user has selfProgress enabled
      var selfProgress = false;
      if (currentUser) {
        db.doc('users/' + currentUser.uid).get().then(function(snap) {
          if (snap.exists) {
            var data = snap.data();
            selfProgress = data.selfProgress === true;
          }
        }).catch(function() {});
      }
      
      // Create sticky bar
      var stickyBar = document.createElement('div');
      stickyBar.className = 'practice-sticky-bar';
      stickyBar.innerHTML = `
        <div class="practice-bar-inner">
          <button class="lesson-nav-back" onclick="window.location.href=window.location.pathname + '?c=' + new URLSearchParams(window.location.search).get('c')">
            ← Back
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
              </div>
              
              <div class="dropdown-controls">
                <button class="btn-play-dropdown" id="btn-play-dropdown">
                  <span id="play-dropdown-text">Start ▶</span>
                </button>
              </div>
              
              <div class="dropdown-divider"></div>
              
              <div class="dropdown-stats">
                Today's total: 0:00
              </div>
            </div>
          </div>
          
          <button class="lesson-nav-complete" id="complete-lesson-btn">
            Next →
          </button>
        </div>
      `;
      
      // Insert after hero
      hero.parentNode.insertBefore(stickyBar, hero.nextSibling);
      
      // Load today's total practice time
      if (currentUser) {
        var todayKey = getTodayDateKey();
        db.collection('users').doc(currentUser.uid).collection('practice')
          .doc('sessions').collection('items')
          .where('date', '==', todayKey)
          .get()
          .then(function(snap) {
            var totalSeconds = 0;
            snap.forEach(function(doc) {
              totalSeconds += doc.data().duration || 0;
            });
            var mins = Math.floor(totalSeconds / 60);
            var secs = totalSeconds % 60;
            var timeStr = mins + ':' + String(secs).padStart(2, '0');
            var statsEl = document.querySelector('.dropdown-stats');
            if (statsEl) {
              statsEl.textContent = 'Today\'s total: ' + timeStr;
            }
          })
          .catch(function(err) {
            console.error('Error loading today total:', err);
          });
      }
      
      // Bind events
      bindEvents();
      
      // Inject styles
      injectStyles();
    }

    function bindEvents() {
      var practiceBtn = document.getElementById('practice-btn');
      var playDropdownBtn = document.getElementById('btn-play-dropdown');
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
      
      // Complete lesson button - implement the logic directly
      if (completeBtn && currentUser) {
        var lessonInfo = getCurrentLessonInfo();
        var courseNum = urlParams.get('c');
        
        // Get user's selfProgress setting and setup button
        db.doc('users/' + currentUser.uid).get().then(function(userSnap) {
          var selfProgress = userSnap.exists && userSnap.data().selfProgress === true;
          
          // Update button text based on selfProgress
          if (selfProgress) {
            completeBtn.innerHTML = 'Complete ✓';
          } else {
            completeBtn.innerHTML = 'Next →';
          }
          
          // Check if already completed (only if selfProgress)
          if (selfProgress) {
            db.collection('users').doc(currentUser.uid).collection('progress')
              .doc(lessonInfo.courseId).get()
              .then(function(progressSnap) {
                if (progressSnap.exists && progressSnap.data().completed) {
                  var completedData = progressSnap.data().completed;
                  var completed = Array.isArray(completedData) ? completedData : 
                                 (typeof completedData === 'object' ? Object.keys(completedData).filter(function(k) { return completedData[k]; }) : []);
                  
                  if (completed.indexOf(lessonInfo.lessonId) !== -1) {
                    completeBtn.classList.add('completed');
                  }
                }
              });
          }
          
          // Add click handler
          completeBtn.addEventListener('click', function() {
            // Get course config to find next lesson
            var courseConfig = window.VAULT_COURSES && window.VAULT_COURSES[lessonInfo.courseId];
            if (!courseConfig) return;
            
            var currentIndex = courseConfig.lessons.indexOf(lessonInfo.lessonId);
            var nextLesson = currentIndex < courseConfig.lessons.length - 1 ? 
                            courseConfig.lessons[currentIndex + 1] : null;
            
            if (selfProgress) {
              // Check if already completed
              db.collection('users').doc(currentUser.uid).collection('progress')
                .doc(lessonInfo.courseId).get()
                .then(function(progressSnap) {
                  var completed = [];
                  if (progressSnap.exists && progressSnap.data().completed) {
                    var completedData = progressSnap.data().completed;
                    completed = Array.isArray(completedData) ? completedData : 
                               (typeof completedData === 'object' ? Object.keys(completedData).filter(function(k) { return completedData[k]; }) : []);
                  }
                  
                  var isCompleted = completed.indexOf(lessonInfo.lessonId) !== -1;
                  
                  if (!isCompleted) {
                    // Mark as complete
                    var newCompleted = completed.concat([lessonInfo.lessonId]);
                    db.collection('users').doc(currentUser.uid).collection('progress')
                      .doc(lessonInfo.courseId).set({
                        completed: newCompleted,
                        lastLesson: lessonInfo.lessonId,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                      }, { merge: true })
                      .then(function() {
                        navigate();
                      })
                      .catch(function(err) {
                        console.error('Error marking complete:', err);
                      });
                  } else {
                    navigate();
                  }
                });
            } else {
              navigate();
            }
            
            function navigate() {
              if (nextLesson) {
                window.location.href = window.location.pathname + '?c=' + courseNum + '&l=' + nextLesson;
              } else {
                window.location.href = window.location.pathname + '?c=' + courseNum;
              }
            }
          });
        }).catch(function(err) {
          console.error('Error setting up complete button:', err);
        });
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
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          z-index: 50;
          transition: all 0.3s;
          margin-top: -4px;
        }
        
        .practice-bar-inner {
          max-width: 860px;
          margin: 0 auto;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        
        .lesson-nav-back {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: var(--text-small);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
          white-space: nowrap;
        }
        
        .lesson-nav-back:hover {
          background: rgba(255,255,255,0.15);
          border-color: rgba(255,255,255,0.3);
        }
        
        .practice-center-btn {
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
          font-size: var(--text-small);
          font-weight: 600;
          color: white;
          white-space: nowrap;
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
          font-size: var(--text-small);
          font-weight: 600;
          font-family: 'Inter', sans-serif;
        }
        
        .practice-time {
          font-family: 'Inter', sans-serif;
          font-size: var(--text-small);
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          color: #38bdf8;
        }
        
        .lesson-nav-complete {
          background: linear-gradient(135deg, #06b3fd 0%, #38bdf8 100%);
          border: none;
          color: #fff;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: var(--text-small);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
          box-shadow: 0 2px 8px rgba(6,179,253,0.3);
          white-space: nowrap;
        }
        
        .lesson-nav-complete:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(6,179,253,0.4);
        }
        
        .lesson-nav-complete.completed {
          background: #10b981;
          box-shadow: 0 2px 8px rgba(16,185,129,0.3);
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
          padding: 16px;
          width: 200px;
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
          margin-bottom: 16px;
          letter-spacing: -1px;
          font-variant-numeric: tabular-nums;
        }
        
        .dropdown-controls {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        
        .btn-play-dropdown {
          width: 100%;
          padding: 10px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
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
        
        .dropdown-divider {
          height: 1px;
          background: rgba(255,255,255,0.1);
          margin: 16px 0;
        }
        
        .dropdown-stats {
          font-size: var(--text-small);
          color: rgba(255,255,255,0.5);
          text-align: center;
        }
        
        /* Mobile */
        @media (max-width: 768px) {
          .practice-bar-inner {
            padding: 10px 12px;
            gap: 8px;
          }
          
          .lesson-nav-back,
          .lesson-nav-complete {
            font-size: var(--text-small);
            padding: 12px 16px;
          }
          
          .practice-btn {
            font-size: var(--text-small);
            padding: 12px 18px;
          }
          
          .practice-icon {
            font-size: 16px;
          }
          
          .practice-dropdown {
            width: 200px;
          }
        }
        
        @media (max-width: 640px) {
          .practice-bar-inner {
            gap: 6px;
          }
          
          .lesson-nav-back,
          .lesson-nav-complete,
          .practice-btn {
            font-size: var(--text-small);
            padding: 12px 14px;
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
        // Wait for page AND styles to be ready
        function waitForStyles() {
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
              // Extra delay to ensure styles are loaded
              setTimeout(injectUI, 1500);
            });
          } else {
            // Check if styles are loaded
            if (document.styleSheets.length > 0) {
              setTimeout(injectUI, 1500);
            } else {
              // Wait a bit more for styles
              setTimeout(waitForStyles, 100);
            }
          }
        }
        waitForStyles();
        
        // Auto-save on page close/navigation
        var lastAutoSave = 0;
        
        function autoSave() {
          // Only if timer has meaningful time
          if (seconds < 10 || !currentUser) return;
          
          // Prevent duplicate saves (5 second cooldown)
          var now = Date.now();
          if (now - lastAutoSave < 5000) return;
          lastAutoSave = now;
          
          var lessonInfo = getCurrentLessonInfo();
          var sessionId = Date.now().toString();
          var dateKey = getTodayDateKey();
          var device = getDeviceType();
          
          var sessionData = {
            courseId: lessonInfo.courseId,
            lessonId: lessonInfo.lessonId,
            lessonTitle: lessonInfo.lessonTitle,
            duration: seconds,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            date: dateKey,
            device: device
          };
          
          // Queue writes - Firebase handles delivery
          db.collection('users').doc(currentUser.uid).collection('practice').doc('sessions')
            .collection('items').doc(sessionId).set(sessionData);
            
          db.collection('users').doc(currentUser.uid).collection('practice').doc('stats')
            .set({
              totalSeconds: firebase.firestore.FieldValue.increment(seconds),
              sessionCount: firebase.firestore.FieldValue.increment(1),
              lastPracticeDate: dateKey
            }, { merge: true });
        }
        
        window.addEventListener('beforeunload', autoSave);
        window.addEventListener('pagehide', autoSave);
        document.addEventListener('visibilitychange', function() {
          if (document.hidden) autoSave();
        });
      }
    });
  });
})();
