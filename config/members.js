/* members.js
   Purpose: Members page UI
*/

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
    if (parts.length < 1) return null;
    
    var pathway = parts[0]; // gs, fs, ss, ks
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
  // LESSON TRACKING
  // ============================================

  var LessonTracker = (function(){
    var VAULT_PATH_PREFIX = '/';
    var VAULT_INDEX_PATH = '/';

    function isLessonPage(){
      var path = window.location.pathname;
      if (!path.startsWith('/')) return false;
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

    // VAULT_COURSES is loaded from course-config.js
    // Do not redefine here - use course-config.js as single source of truth


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
            window.location.href = '/' + parsed.pathway + '?c=' + parsed.num + '&l=' + lessonId;
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
      return '/' + parsed.pathway + '?c=' + parsed.num + '&l=' + nextLessonId;
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
        btn.textContent = 'Complete Lesson →';
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
      var courseIndexUrl = '/' + parsed.pathway + '?c=' + parsed.num;
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

    LessonTracker.init();
    CourseProgress.init();

    auth.onAuthStateChanged(function(user){
      currentUser = user || null;
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

document.addEventListener('DOMContentLoaded', function () {
  var tries = 0;

  function start(){
    tries++;
    if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
      if (tries < 80) return setTimeout(start, 50);
      return;
    }

    var auth = firebase.auth();
    var db = firebase.firestore();


    // URLs
    var VAULT_URL = '/';
    var SUPPORT_URL = '/contact';

    // DOM elements
    var loginBox = document.getElementById('members-login');
    var accountBox = document.getElementById('members-account');

    var titleEl =
      document.getElementById('members-title') ||
      document.querySelector('.members-title');

    var msgEl = document.getElementById('members-message');

    var emailInput =
      document.getElementById('auth-email') ||
      document.getElementById('members-email');

    var passInput =
      document.getElementById('auth-password') ||
      document.getElementById('members-pass');

    var loginBtn = document.getElementById('login-btn');
    var resetLink = document.getElementById('reset-link');

    var logoutBtn = document.getElementById('logout-btn');

    function setTitle(t){ 
      if (titleEl) {
        titleEl.textContent = t;
        titleEl.style.marginBottom = '24px'; // Increase gap below title
      }
    }

    function setMessage(text) {
      if (!msgEl) return;
      var msg = String(text || '').trim();
      msgEl.textContent = msg;
      if (msg) {
        msgEl.className = 'error';
        msgEl.style.display = 'block';
      } else {
        msgEl.style.display = 'none';
      }
    }

    function clearMessage(){ setMessage(''); }

    function showLogin(){
      if (loginBox) loginBox.style.display = 'block';
      if (accountBox) accountBox.style.display = 'none';
      setTitle('MEMBER LOGIN');
      clearMessage();
    }

    function showAccount(user){
      if (loginBox) loginBox.style.display = 'none';
      if (accountBox) accountBox.style.display = 'block';
      setTitle('MY ACCOUNT');
      clearMessage();

      buildTabbedAccount(user);
    }

    // ============================================
    // TABBED ACCOUNT INTERFACE
    // ============================================

    function buildTabbedAccount(user){
      if (!accountBox) return;

      // Clear existing content (except logout button which we'll reuse)
      var existingLogout = logoutBtn ? logoutBtn.cloneNode(true) : null;
      accountBox.innerHTML = '';

      // Create tabbed container
      var container = document.createElement('div');
      container.id = 'vault-tabs-container';
      container.style.cssText = 'width:100%;max-width:700px;margin:0 auto;';

      // Tab navigation
      var tabNav = document.createElement('div');
      tabNav.id = 'vault-tab-nav';
      tabNav.style.cssText = 'display:flex;gap:0;border-bottom:2px solid #e0e0e0;position:sticky;top:0;background:#fff;z-index:10;';

      var practiceTab = createTab('🥁', 'Practice', true);
      var profileTab = createTab('👤', 'Profile', false);

      tabNav.appendChild(practiceTab);
      tabNav.appendChild(profileTab);

      // Tab content container
      var tabContent = document.createElement('div');
      tabContent.id = 'vault-tab-content';
      tabContent.style.cssText = 'padding:24px 0;';

      // Create tab panels
      var practicePanel = createPracticePanel(user);
      var profilePanel = createProfilePanel(user, existingLogout);

      practicePanel.style.display = 'block';
      profilePanel.style.display = 'none';

      tabContent.appendChild(practicePanel);
      tabContent.appendChild(profilePanel);

      container.appendChild(tabNav);
      container.appendChild(tabContent);

      accountBox.appendChild(container);

      // Tab switching logic
      function switchTab(targetPanel, targetTab){
        // Hide all panels
        var panels = tabContent.querySelectorAll('.tab-panel');
        for (var i = 0; i < panels.length; i++) {
          panels[i].style.display = 'none';
        }

        // Deactivate all tabs
        var tabs = tabNav.querySelectorAll('.vault-tab');
        for (var j = 0; j < tabs.length; j++) {
          tabs[j].classList.remove('active');
          tabs[j].style.borderBottom = 'none';
          tabs[j].style.color = '#666';
        }

        // Activate target
        targetPanel.style.display = 'block';
        targetTab.classList.add('active');
        targetTab.style.borderBottom = '3px solid #06b3fd';
        targetTab.style.color = '#111';

        // Smooth fade-in
        targetPanel.style.opacity = '0';
        setTimeout(function(){
          targetPanel.style.transition = 'opacity 0.2s ease-in-out';
          targetPanel.style.opacity = '1';
        }, 10);
      }

      practiceTab.addEventListener('click', function(){ switchTab(practicePanel, practiceTab); });
      profileTab.addEventListener('click', function(){ switchTab(profilePanel, profileTab); });
    }

    function createTab(icon, label, isActive){
      var tab = document.createElement('button');
      tab.className = 'vault-tab' + (isActive ? ' active' : '');
      tab.type = 'button';
      tab.style.cssText = 'flex:1;padding:14px 20px;background:none;border:none;border-bottom:' + 
        (isActive ? '3px solid #06b3fd' : 'none') + ';cursor:pointer;font-size:16px;font-weight:500;' +
        'color:' + (isActive ? '#111' : '#666') + ';transition:all 0.2s ease;display:flex;align-items:center;' +
        'justify-content:center;gap:8px;';

      var iconSpan = document.createElement('span');
      iconSpan.textContent = icon;
      iconSpan.style.fontSize = '14px';

      var labelSpan = document.createElement('span');
      labelSpan.textContent = label;
      labelSpan.className = 'tab-label-full';

      var labelShort = document.createElement('span');
      labelShort.textContent = label.split(' ')[0];
      labelShort.className = 'tab-label-short';
      labelShort.style.display = 'none';

      tab.appendChild(iconSpan);
      tab.appendChild(labelSpan);
      tab.appendChild(labelShort);

      // Hover effect
      tab.addEventListener('mouseenter', function(){
        if (!tab.classList.contains('active')){
          tab.style.color = '#111';
          tab.style.background = '#f5f5f5';
        }
      });
      tab.addEventListener('mouseleave', function(){
        if (!tab.classList.contains('active')){
          tab.style.color = '#666';
          tab.style.background = 'none';
        }
      });

      // Mobile responsive: show short label on narrow screens
      if (window.innerWidth <= 480) {
        labelSpan.style.display = 'none';
        labelShort.style.display = 'inline';
      }

      return tab;
    }

    // ============================================
    // PRACTICE TAB PANEL
    // ============================================

    function createOpenSection(title, contentBuilder){
      var section = document.createElement('div');
      section.className = 'section';
      
      var header = document.createElement('div');
      header.className = 'section-header';
      
      var titleEl = document.createElement('h2');
      titleEl.className = 'section-title';
      titleEl.textContent = title;
      
      header.appendChild(titleEl);
      section.appendChild(header);
      
      var content = contentBuilder();
      section.appendChild(content);
      
      return section;
    }

    function createPracticePanel(user){
      var panel = document.createElement('div');
      panel.className = 'tab-panel active';
      panel.id = 'practice-panel';

      // Continue Card
      var continueCard = document.createElement('div');
      continueCard.className = 'continue-card';
      
      var continueLabel = document.createElement('div');
      continueLabel.className = 'continue-label';
      continueLabel.id = 'continue-lesson-label';
      continueLabel.textContent = '';
      
      var continueTitle = document.createElement('div');
      continueTitle.className = 'continue-title';
      continueTitle.id = 'continue-lesson-title';
      continueTitle.textContent = '';
      
      var continueBtn = document.createElement('button');
      continueBtn.className = 'btn-continue';
      continueBtn.id = 'continue-lesson-btn';
      continueBtn.textContent = 'Resume Lesson →';
      
      continueCard.appendChild(continueLabel);
      continueCard.appendChild(continueTitle);
      continueCard.appendChild(continueBtn);
      panel.appendChild(continueCard);

      loadLastLesson(user, continueBtn, continueLabel, continueTitle);

      // Daily quote
      var quoteContainer = document.createElement('div');
      quoteContainer.className = 'quote-box';
      
      var quoteText = document.createElement('p');
      quoteText.className = 'quote-text';
      
      var dailyQuote = 'Practice makes progress';
      if (window.VaultCues && window.VaultCues.getDailyQuote) {
        dailyQuote = window.VaultCues.getDailyQuote();
      }
      
      var emojiSpan = document.createElement('span');
      emojiSpan.textContent = '💡 ';
      emojiSpan.style.fontStyle = 'normal';
      
      var quoteSpan = document.createElement('span');
      quoteSpan.textContent = dailyQuote;
      
      quoteText.appendChild(emojiSpan);
      quoteText.appendChild(quoteSpan);
      quoteContainer.appendChild(quoteText);
      panel.appendChild(quoteContainer);

      // My Progress section
      var progressSection = createOpenSection('My Progress', function(){
        return createPracticeContent(user);
      });
      panel.appendChild(progressSection);

      // My Goals section
      var goalsSection = createOpenSection('My Goals', function(){
        return createGoalsContent(user);
      });
      panel.appendChild(goalsSection);

      // Stats section
      var statsSection = createOpenSection('Stats', function(){
        return createStatsContent(user);
      });
      panel.appendChild(statsSection);

      return panel;
    }


    function mkPrimaryBtn(text, href, isButton){
      var el;
      if (isButton) {
        el = document.createElement('button');
        el.type = 'button';
      } else {
        el = document.createElement('a');
        el.href = href;
      }
      
      el.textContent = text;
      el.style.cssText = 'display:block;padding:14px 20px;background:#06b3fd;border:1px solid #06b3fd;' +
        'border-radius:8px;color:#fff;font-weight:500;text-align:center;cursor:pointer;' +
        'text-decoration:none;transition:all 0.2s ease;line-height:1.4;box-sizing:border-box;';

      el.addEventListener('mouseenter', function(){
        el.style.background = '#0599dc';
        el.style.borderColor = '#0599dc';
      });
      el.addEventListener('mouseleave', function(){
        el.style.background = '#06b3fd';
        el.style.borderColor = '#06b3fd';
      });

      return el;
    }

    function loadLastLesson(user, btnEl, labelEl, titleEl){
      if (!user || !btnEl) return;

      db.collection('users').doc(user.uid).collection('metrics').doc('practice').get()
        .then(function(snap){
          if (!snap.exists) {
            if (labelEl) labelEl.textContent = '';
            if (titleEl) titleEl.textContent = 'Start Your Practice Journey';
            btnEl.disabled = false;
            btnEl.style.opacity = '1';
            btnEl.style.cursor = 'pointer';
            btnEl.textContent = 'Open Practice Vault';
            btnEl.onclick = function(){
              window.location.href = 'https://vault.davedrums.com.au';
            };
              return;
          }

          var data = snap.data() || {};
          var url = data.lastLessonUrl;
          var title = data.lastLessonTitle;

          // MIGRATE OLD URL FORMATS
          if (url) {
            // Old format 1: /vault/gs1?lesson=1.01 → /gs?c=1&l=1.01
            var match1 = url.match(/^\/vault\/([a-z]+)(\d+)\?lesson=(.+)$/);
            if (match1) {
              url = '/' + match1[1] + '?c=' + match1[2] + '&l=' + match1[3];
            } else {
              // Old format 2: /vault?course=gs1&lesson=1.01 → /gs?c=1&l=1.01
              var match2 = url.match(/^\/vault\?course=([a-z]+)(\d+)&lesson=(.+)$/);
              if (match2) {
                url = '/' + match2[1] + '?c=' + match2[2] + '&l=' + match2[3];
              } else {
                // Old format 3: /gs/?c=1&l=1.01 → /gs?c=1&l=1.01 (remove trailing slash)
                url = url.replace(/\/([a-z]+)\/\?/g, '/$1?');
              }
            }
          }

          if (url && title) {
            if (labelEl) labelEl.textContent = 'Continue Where You Left Off';
            if (titleEl) titleEl.textContent = '';
            btnEl.disabled = false;
            btnEl.style.opacity = '1';
            btnEl.style.cursor = 'pointer';
            
            // Shorten title if needed for mobile
            var displayTitle = title;
            if (window.innerWidth <= 600 && title.length > 20) {
              displayTitle = title.substring(0, 20) + '...';
            } else if (title.length > 30) {
              displayTitle = title.substring(0, 30) + '...';
            }
            
            btnEl.textContent = 'Continue: ' + displayTitle;
            
            btnEl.onclick = function(){
              window.location.href = url;
            };
          } else {
            if (labelEl) labelEl.textContent = '';
            if (titleEl) titleEl.textContent = 'Start Your Practice Journey';
            btnEl.disabled = false;
            btnEl.style.opacity = '1';
            btnEl.style.cursor = 'pointer';
            btnEl.textContent = 'Open Practice Vault';
            btnEl.onclick = function(){
              window.location.href = 'https://vault.davedrums.com.au';
            };
              return;
          }
        })
        .catch(function(){
            if (labelEl) labelEl.textContent = '';
            if (titleEl) titleEl.textContent = 'Start Your Practice Journey';
            btnEl.disabled = false;
            btnEl.style.opacity = '1';
            btnEl.style.cursor = 'pointer';
            btnEl.textContent = 'Open Practice Vault';
            btnEl.onclick = function(){
              window.location.href = '/';
            };
            return;
        });
    }

    function createDropdownSection(title, contentBuilder){


      var section = document.createElement('div');
      section.style.cssText = 'margin-bottom:12px;';

      var header = document.createElement('button');
      header.type = 'button';
      header.className = 'vault-dropdown-header';
      header.style.cssText = 'width:100%;padding:14px 18px;background:#fff;border:1px solid #ddd;' +
        'border-radius:8px;cursor:pointer;text-align:left;font-weight:500;font-size:15px;' +
        'display:flex;justify-content:space-between;align-items:center;transition:all 0.2s ease;';
      
      var titleSpan = document.createElement('span');
      titleSpan.textContent = title;
      
      var arrow = document.createElement('span');
      arrow.textContent = '▼';
      arrow.style.cssText = 'font-size:10px;transition:transform 0.2s ease;color:#666;';
      
      header.appendChild(titleSpan);
      header.appendChild(arrow);

      var contentWrapper = document.createElement('div');
      contentWrapper.className = 'vault-dropdown-content';
      contentWrapper.style.cssText = 'display:none;padding:18px;background:#fafafa;border:1px solid #ddd;' +
        'border-top:none;border-radius:0 0 8px 8px;margin-top:-1px;';

      var isOpen = false;

      header.addEventListener('click', function(){
        if (isOpen) {
          // Close
          contentWrapper.style.maxHeight = contentWrapper.scrollHeight + 'px';
          setTimeout(function(){
            contentWrapper.style.maxHeight = '0';
            contentWrapper.style.padding = '0 18px';
          }, 10);
          setTimeout(function(){
            contentWrapper.style.display = 'none';
            contentWrapper.style.padding = '18px';
          }, 200);
          arrow.style.transform = 'rotate(0deg)';
          header.style.borderRadius = '8px';
        } else {
          // Open (build content lazily)
          if (contentWrapper.children.length === 0) {
            var content = contentBuilder();
            contentWrapper.appendChild(content);
          }
          
          contentWrapper.style.display = 'block';
          contentWrapper.style.maxHeight = '0';
          contentWrapper.style.overflow = 'hidden';
          contentWrapper.style.transition = 'max-height 0.2s ease, padding 0.2s ease';
          
          setTimeout(function(){
            contentWrapper.style.maxHeight = contentWrapper.scrollHeight + 'px';
          }, 10);
          
          setTimeout(function(){
            contentWrapper.style.maxHeight = 'none';
            contentWrapper.style.overflow = 'visible';
          }, 200);
          
          arrow.style.transform = 'rotate(180deg)';
          header.style.borderRadius = '8px 8px 0 0';
        }
        isOpen = !isOpen;
      });

      header.addEventListener('mouseenter', function(){
        header.style.background = '#f5f5f5';
      });
      header.addEventListener('mouseleave', function(){
        header.style.background = '#fff';
      });

      section.appendChild(header);
      section.appendChild(contentWrapper);

      return section;
    }

    function createPracticeContent(user){
  var content = document.createElement('div');

  // Load user's active courses first
  db.collection('users').doc(user.uid).get()
    .then(function(userSnap){
      if (!userSnap.exists) {
        content.textContent = 'No active courses found.';
        return;
      }

      var userData = userSnap.data() || {};
      var activeCourses = userData.activeCourses || {};
      
      // Load practice doc to get last lesson
      return db.collection('users').doc(user.uid).collection('metrics').doc('practice').get()
        .then(function(practiceSnap){
          var lastLessonUrl = '';
          if (practiceSnap.exists) {
            lastLessonUrl = practiceSnap.data().lastLessonUrl || '';
          }

          // MIGRATE OLD URL FORMATS
          if (lastLessonUrl) {
            // Old format 1: /vault/gs1?lesson=1.01 → /vault/gs?c=1&l=1.01
            var match1 = lastLessonUrl.match(/^\/vault\/([a-z]+)(\d+)\?lesson=(.+)$/);
            if (match1) {
              lastLessonUrl = '/' + match1[1] + '?c=' + match1[2] + '&l=' + match1[3];
            } else {
              // Old format 2: /vault?course=gs1&lesson=1.01 → /vault/gs?c=1&l=1.01
              var match2 = lastLessonUrl.match(/^\/vault\?course=([a-z]+)(\d+)&lesson=(.+)$/);
              if (match2) {
                lastLessonUrl = '/' + match2[1] + '?c=' + match2[2] + '&l=' + match2[3];
              }
            }
          }

          // Extract course from last lesson URL
          var lastActiveCourseId = null;
          var lastActivePathway = null;
          if (lastLessonUrl) {
            // New format: /vault/gs?c=1&l=1.01
            var pathMatch = lastLessonUrl.match(/^\/vault\/([a-z]+)\?c=(\d+)/);
            if (pathMatch) {
              lastActivePathway = pathMatch[1];
              lastActiveCourseId = pathMatch[1] + pathMatch[2];
              var courseConfig = window.VAULT_COURSES && window.VAULT_COURSES[lastActiveCourseId];
              if (courseConfig) {
                lastActivePathway = courseConfig.pathway;
              }
            }
          }

          renderPathwayCards(content, user.uid, activeCourses, lastActivePathway, lastActiveCourseId);
        });
    })
    .catch(function(e){
      console.error('Failed to load practice content:', e);
      content.textContent = 'Error loading progress.';
    });

  return content;
}

function renderPathwayCards(container, uid, activeCourses, lastActivePathway, lastActiveCourseId){
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';

  var pathways = ['groove', 'fills', 'sticks', 'kicks'];
  var pathwayConfig = {
    groove: { label: 'Groove Studies', key: 'groove' },
    fills: { label: 'Fill Studies', key: 'fills' },
    sticks: { label: 'Stick Studies', key: 'sticks' },
    kicks: { label: 'Kick Studies', key: 'kicks' }
  };

  pathways.forEach(function(pathway){
    var config = pathwayConfig[pathway];
    var courseId = activeCourses[pathway] || null;

    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border:1px solid #ddd;border-radius:8px;padding:16px;' +
      'min-height:100px;display:flex;flex-direction:column;justify-content:center;';

    var labelEl = document.createElement('div');
    labelEl.style.cssText = 'font-size:13px;font-weight:600;color:#333;margin-bottom:8px;text-align:center;';
    labelEl.textContent = config.label;

    var statusEl = document.createElement('div');
    statusEl.style.cssText = 'font-size:11px;color:#666;text-align:center;margin-bottom:4px;';
    
    var progressEl = document.createElement('div');
    progressEl.style.cssText = 'font-size:16px;font-weight:700;color:#06b3fd;text-align:center;margin-bottom:6px;';

    var barContainer = document.createElement('div');
    barContainer.style.cssText = 'width:100%;height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;';
    
    var barFill = document.createElement('div');
    barFill.style.cssText = 'height:100%;background:#06b3fd;transition:width 0.3s ease;width:0%;';
    
    barContainer.appendChild(barFill);

    box.appendChild(labelEl);
    box.appendChild(statusEl);
    box.appendChild(progressEl);
    box.appendChild(barContainer);

    grid.appendChild(box);

    // Load progress if course is active
    if (courseId) {
      statusEl.textContent = 'Last active: ' + courseId.toUpperCase();
      
      var courseConfig = window.VAULT_COURSES && window.VAULT_COURSES[courseId];
      if (courseConfig) {
        loadCourseProgress(uid, courseId, courseConfig, progressEl, barFill);
      } else {
        progressEl.textContent = '—';
        statusEl.textContent = 'Course not configured';
      }
    } else {
      statusEl.textContent = 'No active course';
      progressEl.textContent = '—';
    }

    // Highlight last active pathway
    if (pathway === lastActivePathway) {
      box.style.borderColor = '#06b3fd';
      box.style.borderWidth = '2px';
    }
  });

  container.appendChild(grid);
}

function loadCourseProgress(uid, courseId, courseConfig, progressEl, barFill){
  var db = firebase.firestore();
  db.collection('users').doc(uid).collection('progress').doc(courseId).get()
    .then(function(snap){
      var completedCount = 0;
      if (snap.exists) {
        var data = snap.data();
        var completed = data.completed || {};
        
        // Handle both ARRAY format (new) and OBJECT format (old)
        var completedArray = [];
        if (Array.isArray(completed)) {
          // New format: ["1.01", "1.02", ...]
          completedArray = completed;
        } else if (typeof completed === 'object') {
          // Old format: {"1.01": true, "1.02": true, ...}
          completedArray = Object.keys(completed).filter(function(key) {
            return completed[key] === true;
          });
        }
        
        // Count completed lessons
        courseConfig.lessons.forEach(function(lessonId){
          if (completedArray.indexOf(lessonId) !== -1) {
            completedCount++;
          }
        });
      }

      var totalLessons = courseConfig.lessons.length;
      var percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

      progressEl.textContent = completedCount + '/' + totalLessons;
      barFill.style.width = percent + '%';
    })
    .catch(function(e){
      console.error('Failed to load course progress:', e);
      progressEl.textContent = '—';
    });
}


    
// Auto-update activeCourses when user visits a course
function initActiveCourseTracking(){
  if (typeof firebase === 'undefined' || !firebase.auth) return;
  
  firebase.auth().onAuthStateChanged(function(user){
    if (!user) return;
    
    var db = firebase.firestore();
    
    // Listen for progress changes and update activeCourses
    db.collection('users').doc(user.uid).collection('progress').onSnapshot(function(snapshot){
      var activeCourses = {};
      
      snapshot.forEach(function(doc){
        var courseId = doc.id; // e.g., "gs1", "fs1"
        var match = courseId.match(/^([a-z]+)(\d+)$/);
        if (match) {
          var pathway = match[1];
          var pathwayMap = {
            'gs': 'groove',
            'fs': 'fills',
            'ss': 'sticks',
            'ks': 'kicks'
          };
          var fullPathway = pathwayMap[pathway] || pathway;
          
          // Only set if this course has progress or is higher than current
          var data = doc.data();
          var hasProgress = data && data.completed && Object.keys(data.completed).length > 0;
          
          if (hasProgress) {
            // Use highest course number for each pathway
            var courseNum = parseInt(match[2]);
            if (!activeCourses[fullPathway] || courseNum > parseInt(activeCourses[fullPathway].replace(/[a-z]+/, ''))) {
              activeCourses[fullPathway] = courseId;
            }
          }
        }
      });
      
      // Update user doc with activeCourses
      db.collection('users').doc(user.uid).set({
        activeCourses: activeCourses
      }, { merge: true }).catch(function(err){
        console.error('Could not update activeCourses:', err);
      });
    }, function(err){
      console.error('Error listening to progress:', err);
    });
  });
}

// Initialize tracking
initActiveCourseTracking();

function createGoalsContent(user){
      var content = document.createElement('div');

      var textarea = document.createElement('textarea');
      textarea.id = 'goals-textarea';
      textarea.placeholder = 'Write your practice goals here...';
      textarea.maxLength = 250;
      textarea.style.cssText = 'width:100%;min-height:120px;padding:12px;border:1px solid #ddd;' +
        'border-radius:6px;font-family:inherit;font-size:14px;resize:vertical;box-sizing:border-box;';

      var footer = document.createElement('div');
      footer.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-top:8px;' +
        'font-size:12px;color:#666;';

      var charCount = document.createElement('span');
      charCount.id = 'goals-char-count';
      charCount.textContent = '0/250';

      var timestamp = document.createElement('span');
      timestamp.id = 'goals-timestamp';
      timestamp.style.opacity = '0.75';
      timestamp.textContent = '';

      footer.appendChild(timestamp);
      footer.appendChild(charCount);

      content.appendChild(textarea);
      content.appendChild(footer);

      // Load existing goals
      db.collection('users').doc(user.uid).collection('metrics').doc('practice').get()
        .then(function(snap){
          if (!snap.exists) return;
          var data = snap.data() || {};
          
          if (data.goalsText) {
            textarea.value = data.goalsText;
            charCount.textContent = data.goalsText.length + '/250';
          }

          if (data.goalsUpdatedAt && data.goalsUpdatedAt.toDate) {
            var d = data.goalsUpdatedAt.toDate();
            timestamp.textContent = 'Last edited: ' + d.toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });
          }
        })
        .catch(function(){});

      // Character counter
      textarea.addEventListener('input', function(){
        var len = textarea.value.length;
        charCount.textContent = len + '/250';
        
        if (len > 250) {
          charCount.style.color = '#c00';
        } else {
          charCount.style.color = '#666';
        }
      });

      // Auto-save on blur with debounce
      var saveTimeout;
      textarea.addEventListener('blur', function(){
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(function(){
          saveGoals(user, textarea.value, timestamp);
        }, 300);
      });

      return content;
    }

    function saveGoals(user, text, timestampEl){
      if (!user) return;

      db.collection('users').doc(user.uid).collection('metrics').doc('practice').set({
        goalsText: text,
        goalsUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true })
        .then(function(){
          var now = new Date();
          timestampEl.textContent = 'Last edited: ' + now.toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
          
          // Show brief saved indicator
          var savedMsg = document.createElement('span');
          savedMsg.textContent = ' ✓ Saved';
          savedMsg.style.color = '#0a0';
          savedMsg.style.marginLeft = '8px';
          timestampEl.appendChild(savedMsg);
          
          setTimeout(function(){
            savedMsg.remove();
          }, 2000);
        })
        .catch(function(e){
          console.error('Failed to save goals:', e);
        });
    }

    function createStatsContent(user){
      var content = document.createElement('div');

      // 30-day practice graph
      var graphContainer = document.createElement('div');
      graphContainer.className = 'stats-chart-container';
      
      var graphTitle = document.createElement('div');
      graphTitle.className = 'chart-title';
      graphTitle.textContent = 'Last 30 Days';
      
      var canvasContainer = document.createElement('div');
      canvasContainer.className = 'chart-canvas-wrapper';
      
      var canvas = document.createElement('canvas');
      canvas.id = 'practice-chart';
      
      canvasContainer.appendChild(canvas);
      graphContainer.appendChild(graphTitle);
      graphContainer.appendChild(canvasContainer);
      content.appendChild(graphContainer);

      // Stats Cards
      var statsCards = document.createElement('div');
      statsCards.className = 'stats-cards';

      var stats = [
        { label: 'Total Time', id: 'stat-total-time', value: '—' },
        { label: 'Day Streak', id: 'stat-days-week', value: '—' },
        { label: 'Avg. Session Time', id: 'stat-avg-time', value: '—' }
      ];

      stats.forEach(function(stat){
        var card = document.createElement('div');
        card.className = 'stat-card';

        var valueEl = document.createElement('div');
        valueEl.className = 'stat-value';
        valueEl.id = stat.id;
        valueEl.textContent = stat.value;

        var labelEl = document.createElement('div');
        labelEl.className = 'stat-label';
        labelEl.textContent = stat.label;

        card.appendChild(valueEl);
        card.appendChild(labelEl);
        statsCards.appendChild(card);
      });

      content.appendChild(statsCards);
      loadStatsAndChart(user, canvas);

      return content;
    }


    function loadStatsAndChart(user, canvas){
      if (!user) return;

      // Load main stats
      db.collection('users').doc(user.uid).collection('metrics').doc('stats').get()
        .then(function(snap){
          if (!snap.exists) return;
          var data = snap.data() || {};

          // Total time
          var totalSeconds = data.totalSeconds || 0;
          var totalEl = document.getElementById('stat-total-time');
          if (totalEl) {
            totalEl.textContent = formatDuration(totalSeconds);
          }

          // Avg per session
          var loginCount = data.loginCount || 0;
          var avgEl = document.getElementById('stat-avg-time');
          if (avgEl) {
            if (totalSeconds > 0 && loginCount > 0) {
              avgEl.textContent = formatDuration(Math.round(totalSeconds / loginCount));
            } else {
              avgEl.textContent = '0 min';
            }
          }
        })
        .catch(function(){});

      // Load days practiced this week
      loadDaysThisWeek(user);
      
      // Load and render 30-day chart
      load30DayChart(user, canvas);
    }

    function load30DayChart(user, canvas){
      if (!user || !canvas) return;
      
      // Get date 30 days ago
      var today = new Date();
      var thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 29); // -29 to include today = 30 days total
      
      // Query last 30 days of practice sessions
      db.collection('users').doc(user.uid).collection('metrics')
        .doc('daily').collection('sessions')
        .where('lastSessionAt', '>=', firebase.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .get()
        .then(function(snap){
          // Build data structure: date -> minutes
          var dataByDate = {};
          snap.forEach(function(doc){
            var data = doc.data();
            var seconds = data.totalSeconds || 0;
            var minutes = Math.round(seconds / 60);
            dataByDate[doc.id] = minutes; // doc.id is YYYY-MM-DD
          });
          
          // Build arrays for chart (last 30 days)
          var labels = [];
          var dataPoints = [];
          
          for (var i = 29; i >= 0; i--) {
            var d = new Date(today);
            d.setDate(today.getDate() - i);
            
            var dateKey = d.getFullYear() + '-' + 
              String(d.getMonth() + 1).padStart(2, '0') + '-' + 
              String(d.getDate()).padStart(2, '0');
            
            // Label: show date every 5 days, otherwise empty
            var dayOfMonth = d.getDate();
            var label = '';
            if (i === 29 || i === 0 || dayOfMonth % 5 === 0) {
              label = dayOfMonth + '/' + (d.getMonth() + 1); // DD/MM format
            }
            labels.push(label);
            
            dataPoints.push(dataByDate[dateKey] || 0);
          }
          
          // Render chart with Chart.js
          renderPracticeChart(canvas, labels, dataPoints);
        })
        .catch(function(e){
          console.error('Failed to load chart data:', e);
        });
    }

    function renderPracticeChart(canvas, labels, dataPoints){
      // Check if Chart.js is loaded
      if (typeof Chart === 'undefined') {
        var msg = document.createElement('div');
        msg.style.cssText = 'text-align:center;padding:40px;color:#999;';
        msg.textContent = 'Chart library not loaded. Add Chart.js to page.';
        canvas.parentNode.replaceChild(msg, canvas);
        return;
      }
      
      var ctx = canvas.getContext('2d');
      
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Minutes',
            data: dataPoints,
            backgroundColor: '#06b3fd',
            borderColor: '#06b3fd',
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                title: function(items) {
                  // Show full date on hover
                  var index = items[0].dataIndex;
                  var today = new Date();
                  var d = new Date(today);
                  d.setDate(today.getDate() - (29 - index));
                  return d.toLocaleDateString('en-AU', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  });
                },
                label: function(context) {
                  var mins = context.parsed.y;
                  if (mins === 0) return 'No practice';
                  if (mins < 60) return mins + ' min';
                  var hrs = Math.floor(mins / 60);
                  var rem = mins % 60;
                  return rem === 0 ? hrs + ' hrs' : hrs + ' hrs ' + rem + ' min';
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 10
                }
              }
            },
            y: {
              beginAtZero: true,
              ticks: {
                maxTicksLimit: 5,
                callback: function(value) {
                  return value + 'm';
                },
                font: {
                  size: 10
                }
              },
              grid: {
                color: '#f0f0f0'
              }
            }
          }
        }
      });
    }

    function loadDaysThisWeek(user){
      var daysEl = document.getElementById('stat-days-week');
      if (!daysEl) return;

      // Get Monday-Sunday date range for current week
      var now = new Date();
      var day = now.getDay(); // 0 = Sunday
      var diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
      var monday = new Date(now);
      monday.setDate(now.getDate() + diff);
      monday.setHours(0, 0, 0, 0);

      var sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      // Build array of date keys for this week (YYYY-MM-DD)
      var weekDateKeys = [];
      for (var i = 0; i <= 6; i++) {
        var d = new Date(monday);
        d.setDate(monday.getDate() + i);
        var dateKey = d.getFullYear() + '-' + 
          String(d.getMonth() + 1).padStart(2, '0') + '-' + 
          String(d.getDate()).padStart(2, '0');
        weekDateKeys.push(dateKey);
      }

      // Get all daily sessions and count how many are in this week
      db.collection('users').doc(user.uid).collection('metrics')
        .doc('daily').collection('sessions')
        .get()
        .then(function(snap){
          var count = 0;
          snap.forEach(function(doc){
            if (weekDateKeys.indexOf(doc.id) !== -1) {
              count++;
            }
          });
          daysEl.textContent = count;
        })
        .catch(function(){
          daysEl.textContent = '—';
        });
    }

    function formatDuration(sec){
      sec = Number(sec || 0);
      if (sec <= 0) return '0 min';
      var mins = Math.round(sec / 60);
      if (mins < 60) return mins + ' min';
      var hours = Math.floor(mins / 60);
      var rem = mins % 60;
      return rem === 0 ? hours + ' hrs' : hours + ' hrs ' + rem + ' min';
    }

    // ============================================
    // PROFILE TAB PANEL
    // ============================================

    function mkFormGroup(label, type, value){
      var group = document.createElement('div');
      group.className = 'form-group';
      
      var labelEl = document.createElement('label');
      labelEl.textContent = label;
      
      var input = document.createElement('input');
      input.type = type;
      input.value = value || '';
      if (type === 'password') {
        input.autocomplete = 'current-password';
      }
      
      group.appendChild(labelEl);
      group.appendChild(input);
      
      return group;
    }

    function createProfilePanel(user, existingLogout){
      var panel = document.createElement('div');
      panel.className = 'tab-panel';
      panel.id = 'profile-panel';

      var emailText = document.createElement('p');
      emailText.className = 'profile-email';
      emailText.innerHTML = '🟢 Logged in as <strong>' + (user && user.email ? user.email : '') + '</strong>';
      panel.appendChild(emailText);

      // Change Name Card
      var nameCard = document.createElement('div');
      nameCard.className = 'profile-card';
      
      var nameTitle = document.createElement('div');
      nameTitle.className = 'profile-card-title';
      nameTitle.textContent = 'Change Name';
      nameCard.appendChild(nameTitle);
      
      db.collection('users').doc(user.uid).get().then(function(doc){
        if (doc.exists) {
          var userData = doc.data() || {};
          
          var fnGroup = mkFormGroup('First Name', 'text', userData.firstName || '');
          var lnGroup = mkFormGroup('Last Name', 'text', userData.lastName || '');
          var dnGroup = mkFormGroup('Display Name', 'text', userData.displayName || '');
          
          nameCard.appendChild(fnGroup);
          nameCard.appendChild(lnGroup);
          nameCard.appendChild(dnGroup);
          
          var saveBtn = document.createElement('button');
          saveBtn.className = 'btn-save';
          saveBtn.textContent = 'Save Changes';
          saveBtn.onclick = function(){
            var firstName = fnGroup.querySelector('input').value.trim();
            var lastName = lnGroup.querySelector('input').value.trim();
            var displayName = dnGroup.querySelector('input').value.trim();
            
            db.collection('users').doc(user.uid).update({
              firstName: firstName,
              lastName: lastName,
              displayName: displayName
            }).then(function(){
              window.VaultToast.success('Name updated');
            }).catch(function(e){
              window.VaultToast.error('Failed to update name');
            });
          };
          nameCard.appendChild(saveBtn);
        }
      });
      
      panel.appendChild(nameCard);

      // Change Password Card
      var pwCard = document.createElement('div');
      pwCard.className = 'profile-card';
      
      var pwTitle = document.createElement('div');
      pwTitle.className = 'profile-card-title';
      pwTitle.textContent = 'Change Password';
      pwCard.appendChild(pwTitle);
      
      var currentPwGroup = mkFormGroup('Current Password', 'password', '');
      var newPwGroup = mkFormGroup('New Password', 'password', '');
      var confirmPwGroup = mkFormGroup('Confirm New Password', 'password', '');
      
      pwCard.appendChild(currentPwGroup);
      pwCard.appendChild(newPwGroup);
      pwCard.appendChild(confirmPwGroup);
      
      var pwSaveBtn = document.createElement('button');
      pwSaveBtn.className = 'btn-save';
      pwSaveBtn.textContent = 'Update Password';
      pwSaveBtn.onclick = function(){
        var currentPw = currentPwGroup.querySelector('input').value;
        var newPw = newPwGroup.querySelector('input').value;
        var confirmPw = confirmPwGroup.querySelector('input').value;
        
        if (newPw !== confirmPw) {
          window.VaultToast.error('Passwords do not match');
          return;
        }
        if (newPw.length < 6) {
          window.VaultToast.error('Password must be at least 6 characters');
          return;
        }
        
        var credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPw);
        user.reauthenticateWithCredential(credential).then(function(){
          return user.updatePassword(newPw);
        }).then(function(){
          window.VaultToast.success('Password updated');
          currentPwGroup.querySelector('input').value = '';
          newPwGroup.querySelector('input').value = '';
          confirmPwGroup.querySelector('input').value = '';
        }).catch(function(e){
          window.VaultToast.error(e.message || 'Failed to update password');
        });
      };
      pwCard.appendChild(pwSaveBtn);
      panel.appendChild(pwCard);

      // Change Email Card
      var emailCard = document.createElement('div');
      emailCard.className = 'profile-card';
      
      var emailTitle = document.createElement('div');
      emailTitle.className = 'profile-card-title';
      emailTitle.textContent = 'Change Email';
      emailCard.appendChild(emailTitle);
      
      var emailNote = document.createElement('p');
      emailNote.className = 'profile-note';
      emailNote.innerHTML = 'To change your email address, please <a href="https://vault.davedrums.com.au/contact">contact support</a>.';
      emailCard.appendChild(emailNote);
      panel.appendChild(emailCard);

      // Logout Button
      var logoutBtn = document.createElement('button');
      logoutBtn.className = 'btn-logout';
      logoutBtn.textContent = 'Logout';
      logoutBtn.onclick = function(){
        clearMessage();
        try{
          var u = auth.currentUser;
          if (u) clearLoginMark(u.uid);
          else clearAllLoginMarks();
        } catch(_){}
        auth.signOut();
        window.VaultToast.info('Logged out');
      };
      
      var actionsDiv = document.createElement('div');
      actionsDiv.className = 'profile-actions';
      actionsDiv.appendChild(logoutBtn);
      panel.appendChild(actionsDiv);

      return panel;
    }


    function mkAccountBtn(tag, text, href) {
      var el = document.createElement(tag);
      el.className = 'account-btn';
      el.textContent = text;
      el.style.cssText = 'display:block;padding:14px 18px;background:#fff;border:1px solid #ddd;' +
        'border-radius:8px;cursor:pointer;font-weight:500;text-align:left;transition:all 0.2s ease;font-size:15px;';

      if (tag === 'a') {
        el.href = href || '#';
        el.style.textDecoration = 'none';
        el.style.color = 'inherit';
      } else {
        el.type = 'button';
      }

      el.addEventListener('mouseenter', function(){
        el.style.background = '#f5f5f5';
      });
      el.addEventListener('mouseleave', function(){
        el.style.background = '#fff';
      });

      return el;
    }

    function createEmailSection(user){
      var section = document.createElement('div');

      var header = document.createElement('button');
      header.type = 'button';
      header.className = 'account-btn';
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;width:100%;padding:14px 18px;background:#fff;border:1px solid #ddd;' +
        'border-radius:8px;cursor:pointer;font-weight:500;text-align:left;transition:all 0.2s ease;font-size:15px;';
      
      var titleSpan = document.createElement('span');
      titleSpan.textContent = 'Change Email';
      
      var arrow = document.createElement('span');
      arrow.textContent = '▼';
      arrow.style.cssText = 'font-size:10px;transition:transform 0.2s ease;color:#666;';
      
      header.appendChild(titleSpan);
      header.appendChild(arrow);
      
      var panel = document.createElement('div');
      panel.style.cssText = 'display:none;padding:18px;background:#fafafa;border:1px solid #ddd;' +
        'border-top:none;border-radius:0 0 8px 8px;margin-top:-1px;';

      var message = document.createElement('p');
      message.style.cssText = 'margin:0;line-height:1.5;color:#333;font-size:15px;';
      message.textContent = 'To change your email address, please contact support.';

      panel.appendChild(message);

      var isOpen = false;

      header.addEventListener('click', function(){
        if (isOpen) {
          panel.style.display = 'none';
          header.style.borderRadius = '8px';
          arrow.style.transform = 'rotate(0deg)';
        } else {
          panel.style.display = 'block';
          header.style.borderRadius = '8px 8px 0 0';
          arrow.style.transform = 'rotate(180deg)';
        }
        isOpen = !isOpen;
      });

      section.appendChild(header);
      section.appendChild(panel);

      return section;
    }

    function createNameSection(user){
      var section = document.createElement('div');

      var header = document.createElement('button');
      header.type = 'button';
      header.className = 'account-btn';
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;width:100%;padding:14px 18px;background:#fff;border:1px solid #ddd;' +
        'border-radius:8px;cursor:pointer;font-weight:500;text-align:left;transition:all 0.2s ease;font-size:15px;';
      
      var titleSpan = document.createElement('span');
      titleSpan.textContent = 'Change Name';
      
      var arrow = document.createElement('span');
      arrow.textContent = '▼';
      arrow.style.cssText = 'font-size:10px;transition:transform 0.2s ease;color:#666;';
      
      header.appendChild(titleSpan);
      header.appendChild(arrow);
      
      var panel = document.createElement('div');
      panel.style.cssText = 'display:none;padding:18px;background:#fafafa;border:1px solid #ddd;' +
        'border-top:none;border-radius:0 0 8px 8px;margin-top:-1px;';

      var fnLabel = mkLabel('First name');
      var fn = mkInput('text');
      var lnLabel = mkLabel('Last name');
      var ln = mkInput('text');
      
      var dnLabel = mkLabel('Display name');
      var dn = mkInput('text');
      dn.maxLength = 30;
      
      var dnHelper = document.createElement('div');
      dnHelper.style.cssText = 'font-size:12px;color:#666;margin:-10px 0 14px 0;line-height:1.4;';
      dnHelper.textContent = 'This name appears on your public comments. Max 30 characters.';

      panel.appendChild(fnLabel);
      panel.appendChild(fn);
      panel.appendChild(lnLabel);
      panel.appendChild(ln);
      panel.appendChild(dnLabel);
      panel.appendChild(dn);
      panel.appendChild(dnHelper);

      var actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';

      var closeBtn = mkInlineBtn('Close', false);
      var saveBtn = mkInlineBtn('Save', true);

      actions.appendChild(closeBtn);
      actions.appendChild(saveBtn);
      panel.appendChild(actions);

      var isOpen = false;

      // Function to load existing name data
      function loadNameData(){
        db.collection('users').doc(user.uid).get().then(function(snap){
          if (!snap.exists) return;
          var d = snap.data() || {};
          fn.value = String(d.firstName || '').trim();
          ln.value = String(d.lastName || '').trim();
          dn.value = String(d.displayName || '').trim();
        }).catch(function(){});
      }

      // Load on creation
      loadNameData();

      header.addEventListener('click', function(){
        if (isOpen) {
          panel.style.display = 'none';
          header.style.borderRadius = '8px';
          arrow.style.transform = 'rotate(0deg)';
        } else {
          // Reload data when opening
          loadNameData();
          panel.style.display = 'block';
          header.style.borderRadius = '8px 8px 0 0';
          arrow.style.transform = 'rotate(180deg)';
        }
        isOpen = !isOpen;
      });

      closeBtn.addEventListener('click', function(){
        panel.style.display = 'none';
        header.style.borderRadius = '8px';
        arrow.style.transform = 'rotate(0deg)';
        isOpen = false;
      });

      // saveBtn click handler comes after this...

      saveBtn.addEventListener('click', function(){
        clearMessage();
        var firstName = String(fn.value || '').trim();
        var lastName = String(ln.value || '').trim();
        var displayName = String(dn.value || '').trim();

        if (!firstName || !lastName) {
          setMessage('Please enter your first and last name.');
          return;
        }
        
        if (!displayName) {
          setMessage('Please enter a display name.');
          return;
        }
        
        // Validate display name (letters, numbers, spaces, underscore, hyphen, apostrophe only)
        var validPattern = /^[a-zA-Z0-9 _'\-]+$/;
        if (!validPattern.test(displayName)) {
          setMessage('Display name can only contain letters, numbers, spaces, underscores, hyphens, and apostrophes.');
          return;
        }

        db.collection('users').doc(user.uid).set({
          firstName: firstName,
          lastName: lastName,
          displayName: displayName
        }, { merge: true }).then(function(){
          panel.style.display = 'none';
          header.style.borderRadius = '8px';
          isOpen = false;
          window.VaultToast.success('Name updated');
        }).catch(function(e){
          if (window.VaultErrors) {
            window.VaultErrors.handle(e, 'Update Name');
          } else {
            setMessage(e && e.message ? e.message : 'Missing or insufficient permissions.');
          }
        });
      });

      section.appendChild(header);
      section.appendChild(panel);

      return section;
    }

    function createPasswordSection(user){
      var section = document.createElement('div');

      var header = document.createElement('button');
      header.type = 'button';
      header.className = 'account-btn';
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;width:100%;padding:14px 18px;background:#fff;border:1px solid #ddd;' +
        'border-radius:8px;cursor:pointer;font-weight:500;text-align:left;transition:all 0.2s ease;font-size:15px;';
      
      var titleSpan = document.createElement('span');
      titleSpan.textContent = 'Change Password';
      
      var arrow = document.createElement('span');
      arrow.textContent = '▼';
      arrow.style.cssText = 'font-size:10px;transition:transform 0.2s ease;color:#666;';
      
      header.appendChild(titleSpan);
      header.appendChild(arrow);
      
      var panel = document.createElement('div');
      panel.style.cssText = 'display:none;padding:18px;background:#fafafa;border:1px solid #ddd;' +
        'border-top:none;border-radius:0 0 8px 8px;margin-top:-1px;';

      var curLabel = mkLabel('Current password');
      var curPw = mkInput('password');
      var newLabel = mkLabel('New password');
      var newPw = mkInput('password');
      var new2Label = mkLabel('Repeat new password');
      var newPw2 = mkInput('password');

      panel.appendChild(curLabel);
      panel.appendChild(curPw);
      panel.appendChild(newLabel);
      panel.appendChild(newPw);
      panel.appendChild(new2Label);
      panel.appendChild(newPw2);

      var actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';

      var closeBtn = mkInlineBtn('Close', false);
      var updateBtn = mkInlineBtn('Update', true);

      actions.appendChild(closeBtn);
      actions.appendChild(updateBtn);
      panel.appendChild(actions);

      var isOpen = false;

      header.addEventListener('click', function(){
        if (isOpen) {
          panel.style.display = 'none';
          header.style.borderRadius = '8px';
          arrow.style.transform = 'rotate(0deg)';
        } else {
          panel.style.display = 'block';
          header.style.borderRadius = '8px 8px 0 0';
          arrow.style.transform = 'rotate(180deg)';
        }
        isOpen = !isOpen;
      });

      closeBtn.addEventListener('click', function(){
        panel.style.display = 'none';
        header.style.borderRadius = '8px';
        arrow.style.transform = 'rotate(0deg)';
        isOpen = false;
      });

      updateBtn.addEventListener('click', function(){
        clearMessage();

        var userNow = auth.currentUser;
        if (!userNow || !userNow.email) {
          setMessage('Please log out and use the reset link.');
          return;
        }

var a = String(curPw.value || '').trim();
var b = String(newPw.value || '').trim();
var c = String(newPw2.value || '').trim();

        if (!a || !b || !c) {
          setMessage('Please fill in all password fields.');
          return;
        }
        if (b !== c) {
          setMessage('New passwords do not match.');
          return;
        }

        var cred = firebase.auth.EmailAuthProvider.credential(userNow.email, a);

        userNow.reauthenticateWithCredential(cred)
          .then(function(){ return userNow.updatePassword(b); })
          .then(function(){
            curPw.value = '';
            newPw.value = '';
            newPw2.value = '';
            panel.style.display = 'none';
            header.style.borderRadius = '8px';
            isOpen = false;
            window.VaultToast.success('Password updated');
          })
          .catch(function(e){
            if (window.VaultErrors) {
              window.VaultErrors.handle(e, 'Change Password');
            } else {
              setMessage(e && e.message ? e.message : 'Could not update password.');
            }
          });
      });

      section.appendChild(header);
      section.appendChild(panel);

      return section;
    }

    function mkLabel(text) {
      var l = document.createElement('label');
      l.textContent = text;
      l.style.cssText = 'display:block;margin-bottom:6px;font-weight:500;font-size:15px;';
      return l;
    }

    function mkInput(type) {
      var i = document.createElement('input');
      i.type = type;
      i.style.cssText = 'display:block;width:100%;box-sizing:border-box;padding:10px;' +
        'border:1px solid #ccc;border-radius:6px;margin-bottom:14px;font-size:15px;';
      return i;
    }

    function mkInlineBtn(text, primary) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.style.cssText = 'padding:10px 16px;border-radius:6px;cursor:pointer;font:inherit;font-size:14px;' +
        'border:1px solid ' + (primary ? '#06b3fd' : '#ccc') + ';' +
        'background:' + (primary ? '#06b3fd' : '#f3f3f3') + ';' +
        'color:' + (primary ? '#fff' : '#333') + ';transition:all 0.2s ease;';
      
      if (primary) {
        b.addEventListener('mouseenter', function(){
          b.style.background = '#0599dc';
          b.style.borderColor = '#0599dc';
        });
        b.addEventListener('mouseleave', function(){
          b.style.background = '#06b3fd';
          b.style.borderColor = '#06b3fd';
        });
      }

      return b;
    }

    function openModal(title, bodyText) {
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;' +
        'background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;' +
        'padding:18px;z-index:99999;';

      var box = document.createElement('div');
      box.style.cssText = 'width:100%;max-width:360px;background:#fff;border-radius:10px;' +
        'box-shadow:0 10px 40px rgba(0,0,0,.25);padding:22px;color:#111;';

      var h = document.createElement('h3');
      h.textContent = title;
      h.style.cssText = 'margin:0 0 10px 0;';

      var p = document.createElement('p');
      p.className = 'p2';
      p.textContent = bodyText;
      p.style.cssText = 'line-height:1.5;margin:0 0 16px 0;';

      var actions = document.createElement('div');
      actions.style.cssText = 'display:flex;justify-content:flex-end;';

      var closeBtn = mkInlineBtn('Close', false);
      closeBtn.addEventListener('click', function(){ overlay.remove(); });

      actions.appendChild(closeBtn);

      box.appendChild(h);
      box.appendChild(p);
      box.appendChild(actions);

      overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });

      overlay.appendChild(box);
      document.body.appendChild(overlay);
    }

    // ============================================
    // AUTH WIRING
    // ============================================

    auth.onAuthStateChanged(function(user){
      if (!user) {
        return showLogin();
      }
      showAccount(user);
    });

    if (loginBtn) {
      loginBtn.addEventListener('click', function(){
        clearMessage();
        var email = emailInput ? String(emailInput.value || '').trim().toLowerCase() : '';
        var pass = passInput ? String(passInput.value || '').trim() : '';

        if (!email || !pass) {
          setMessage('Please enter email and password.');
          return;
        }

        auth.signInWithEmailAndPassword(email, pass).catch(function(e){
          if (window.VaultErrors) {
            window.VaultErrors.handle(e, 'Login');
          } else {
            setMessage(e && e.message ? e.message : 'Could not log in.');
          }
        });
      });
    }

    if (resetLink) {
      resetLink.addEventListener('click', function(e){
        e.preventDefault();
        clearMessage();
        var email = emailInput ? String(emailInput.value || '').trim().toLowerCase() : '';
        if (!email) {
          setMessage('Please enter your email first.');
          return;
        }
        auth.sendPasswordResetEmail(email).then(function(){
          if (window.VaultErrors) {
            window.VaultErrors.success('Password reset email sent.');
          } else {
            setMessage('Password reset email sent.');
          }
        }).catch(function(e){
          if (window.VaultErrors) {
            window.VaultErrors.handle(e, 'Password Reset');
          } else {
            setMessage(e && e.message ? e.message : 'Unable to send reset email.');
          }
        });
      });
    }

  } // end start()

  start();
});

