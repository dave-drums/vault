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
      var hero = document.querySelector('.hero');
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
            ← Back to Course
          </button>
          
          <div class="practice-center-controls">
            <div class="practice-center-btn">
              <button class="practice-btn" id="practice-btn">
                <span class="practice-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <circle cx="12" cy="13" r="9"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4l2.5 2.5M9.5 4h5"/>
                  </svg>
                </span>
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
            
            <button class="metronome-btn" id="metronome-btn">
              <span class="metronome-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 769 1024" fill="currentColor">
                  <path d="m65 1024l79-550L6 242q-8-12-4-25.5T18.5 196t26-3.5T65 208l94 158l34-238L417 0l224 128l128 896zm96-192h195L200 569zm416-640L417 64L257 192l-41 271l169 283V160q0-13 9.5-22.5T417 128t22.5 9.5T449 160v672h224z"/>
                </svg>
              </span>
              <span class="metronome-text">Metronome</span>
            </button>
          </div>
          
          <button class="lesson-nav-complete" id="complete-lesson-btn">
            Next Lesson →
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
            completeBtn.innerHTML = 'Complete Lesson ✓';
          } else {
            completeBtn.innerHTML = 'Next Lesson →';
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
      
      // Metronome button - opens mini popup
      var metronomeBtn = document.getElementById('metronome-btn');
      if (metronomeBtn) {
        var metronomeBpm = 120;
        var metronomeInterval = null;
        var metronomeIsPlaying = false;
        var metronomeBeat = 0;
        var metronomeBeatsPerBar = 4;
        var metronomeAudioContext = null;
        
        metronomeBtn.addEventListener('click', function() {
          // Create modal overlay
          var overlay = document.createElement('div');
          overlay.id = 'metronome-overlay';
          overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
          
          // Create popup (same style as practice dropdown)
          var popup = document.createElement('div');
          popup.id = 'metronome-popup';
          popup.style.cssText = 'background:rgba(26,26,46,0.98);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:12px;border:1px solid rgba(6,179,253,0.3);box-shadow:0 4px 20px rgba(0,0,0,0.4);padding:20px;width:280px;';
          
          popup.innerHTML = `
            <div style="text-align:center;margin-bottom:20px;">
              <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px;">
                <button id="metro-minus" style="width:40px;height:40px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:#fff;font-size:20px;font-weight:600;cursor:pointer;transition:all 0.2s;">−</button>
                <input type="text" id="metro-bpm" value="${metronomeBpm}" style="font-family:'Inter',sans-serif;font-size:48px;font-weight:600;color:#38bdf8;background:transparent;border:none;outline:none;text-align:center;width:120px;font-variant-numeric:tabular-nums;" />
                <button id="metro-plus" style="width:40px;height:40px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:#fff;font-size:20px;font-weight:600;cursor:pointer;transition:all 0.2s;">+</button>
              </div>
              <div style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;font-family:'Inter',sans-serif;margin-bottom:20px;">Beats Per Minute</div>
              
              <div id="metro-beats" style="display:flex;gap:8px;justify-content:center;margin-bottom:20px;"></div>
              
              <button id="metro-toggle" style="width:100%;padding:12px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;font-family:'Inter',sans-serif;">▶ Start</button>
            </div>
          `;
          
          overlay.appendChild(popup);
          document.body.appendChild(overlay);
          
          // Render beat circles
          function renderBeats() {
            var beatsContainer = popup.querySelector('#metro-beats');
            beatsContainer.innerHTML = '';
            for (var i = 0; i < metronomeBeatsPerBar; i++) {
              var circle = document.createElement('div');
              circle.id = 'metro-beat-' + i;
              circle.style.cssText = 'width:40px;height:40px;border-radius:50%;background:' + (i === 0 ? 'rgba(6,179,253,0.15)' : '#f8f9fa') + ';border:2px solid ' + (i === 0 ? '#06b3fd' : '#e9ecef') + ';transition:all 0.1s;';
              beatsContainer.appendChild(circle);
            }
          }
          renderBeats();
          
          // Click metronome sound
          function playMetronomeClick(isAccent) {
            if (!metronomeAudioContext) {
              metronomeAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            var osc = metronomeAudioContext.createOscillator();
            var gain = metronomeAudioContext.createGain();
            osc.connect(gain);
            gain.connect(metronomeAudioContext.destination);
            osc.frequency.value = isAccent ? 1200 : 800;
            gain.gain.value = 0.3;
            osc.start(metronomeAudioContext.currentTime);
            osc.stop(metronomeAudioContext.currentTime + 0.05);
          }
          
          // Update beat visual
          function updateBeatVisual() {
            for (var i = 0; i < metronomeBeatsPerBar; i++) {
              var circle = popup.querySelector('#metro-beat-' + i);
              if (i === metronomeBeat) {
                circle.style.background = i === 0 ? 'linear-gradient(135deg,#06b3fd,#38bdf8)' : '#06b3fd';
                circle.style.border = 'none';
                circle.style.transform = 'scale(1.1)';
                circle.style.boxShadow = '0 4px 12px rgba(6,179,253,0.4)';
              } else {
                circle.style.background = i === 0 ? 'rgba(6,179,253,0.15)' : '#f8f9fa';
                circle.style.border = '2px solid ' + (i === 0 ? '#06b3fd' : '#e9ecef');
                circle.style.transform = 'scale(1)';
                circle.style.boxShadow = 'none';
              }
            }
          }
          
          // Start/stop metronome
          function toggleMetronome() {
            metronomeIsPlaying = !metronomeIsPlaying;
            var toggleBtn = popup.querySelector('#metro-toggle');
            
            if (metronomeIsPlaying) {
              toggleBtn.textContent = '⏹ Stop';
              toggleBtn.style.background = 'rgba(6,179,253,0.2)';
              toggleBtn.style.borderColor = 'rgba(6,179,253,0.5)';
              toggleBtn.style.color = '#38bdf8';
              
              metronomeBeat = 0;
              playMetronomeClick(true);
              updateBeatVisual();
              
              var interval = (60 / metronomeBpm) * 1000;
              metronomeInterval = setInterval(function() {
                metronomeBeat = (metronomeBeat + 1) % metronomeBeatsPerBar;
                playMetronomeClick(metronomeBeat === 0);
                updateBeatVisual();
              }, interval);
            } else {
              toggleBtn.textContent = '▶ Start';
              toggleBtn.style.background = 'rgba(255,255,255,0.1)';
              toggleBtn.style.borderColor = 'rgba(255,255,255,0.2)';
              toggleBtn.style.color = '#fff';
              
              if (metronomeInterval) {
                clearInterval(metronomeInterval);
                metronomeInterval = null;
              }
              renderBeats();
            }
          }
          
          // Event handlers
          popup.querySelector('#metro-minus').addEventListener('click', function() {
            metronomeBpm = Math.max(40, metronomeBpm - 5);
            popup.querySelector('#metro-bpm').value = metronomeBpm;
            if (metronomeIsPlaying) {
              toggleMetronome();
              toggleMetronome();
            }
          });
          
          popup.querySelector('#metro-plus').addEventListener('click', function() {
            metronomeBpm = Math.min(240, metronomeBpm + 5);
            popup.querySelector('#metro-bpm').value = metronomeBpm;
            if (metronomeIsPlaying) {
              toggleMetronome();
              toggleMetronome();
            }
          });
          
          popup.querySelector('#metro-bpm').addEventListener('change', function(e) {
            var val = parseInt(e.target.value);
            if (!isNaN(val)) {
              metronomeBpm = Math.max(40, Math.min(240, val));
              e.target.value = metronomeBpm;
              if (metronomeIsPlaying) {
                toggleMetronome();
                toggleMetronome();
              }
            }
          });
          
          popup.querySelector('#metro-toggle').addEventListener('click', toggleMetronome);
          
          // Close on overlay click
          overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
              if (metronomeInterval) clearInterval(metronomeInterval);
              if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }
          });
          
          // Hover effects
          popup.querySelector('#metro-minus').addEventListener('mouseenter', function() {
            this.style.background = 'rgba(255,255,255,0.15)';
          });
          popup.querySelector('#metro-minus').addEventListener('mouseleave', function() {
            this.style.background = 'rgba(255,255,255,0.1)';
          });
          popup.querySelector('#metro-plus').addEventListener('mouseenter', function() {
            this.style.background = 'rgba(255,255,255,0.15)';
          });
          popup.querySelector('#metro-plus').addEventListener('mouseleave', function() {
            this.style.background = 'rgba(255,255,255,0.1)';
          });
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
