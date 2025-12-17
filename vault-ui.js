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

    // Login metrics (once per tab session)
    var LOGIN_MARK_PREFIX = 'vault_login_mark_v1:';
    var LAST_UID_KEY = 'vault_last_uid_v1';

    function markKeyForUser(uid){
      return LOGIN_MARK_PREFIX + uid;
    }

    function hasMarkedLogin(uid){
      try { return sessionStorage.getItem(markKeyForUser(uid)) === '1'; } catch(_) { return false; }
    }

    function markLogin(uid){
      try { sessionStorage.setItem(markKeyForUser(uid), '1'); sessionStorage.setItem(LAST_UID_KEY, uid); } catch(_) {}
    }

    function clearLoginMark(uid){
      try { if (uid) sessionStorage.removeItem(markKeyForUser(uid)); } catch(_) {}
    }

    function clearAllLoginMarks(){
      try{
        for (var i = sessionStorage.length - 1; i >= 0; i--){
          var k = sessionStorage.key(i);
          if (k && k.indexOf(LOGIN_MARK_PREFIX) === 0) sessionStorage.removeItem(k);
        }
        sessionStorage.removeItem(LAST_UID_KEY);
      } catch(_){}
    }

    function detectDevice(){
      try {
        var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
        var coarse = false;
        try {
          coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        } catch(_) {}

        if (isTouch || coarse) return { type: 'mobile', emoji: '📱' };
        return { type: 'desktop', emoji: '🖥️' };
      } catch(e) {
        return { type: 'other', emoji: '🧩' };
      }
    }

    function recordLoginOnce(user){
      if (!user || !user.uid) return;
      if (hasMarkedLogin(user.uid)) return;

      markLogin(user.uid);

      var device = detectDevice();

      var userDoc = db.collection('users').doc(user.uid);
      userDoc.set({
        email: user.email || null
      }, { merge: true }).catch(function(){});

      var statsDoc = userDoc.collection('metrics').doc('stats');
      statsDoc.set({
        loginCount: firebase.firestore.FieldValue.increment(1),
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastDeviceType: device.type,
        lastDeviceEmoji: device.emoji
      }, { merge: true }).catch(function(){});
    }

    // URLs
    var VAULT_URL = '/vault';
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

    function setTitle(t){ if (titleEl) titleEl.textContent = t; }

    function setMessage(text) {
      if (!msgEl) return;
      msgEl.textContent = String(text || '').trim();
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
      setTitle('ACCOUNT');
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
        (isActive ? '3px solid #06b3fd' : 'none') + ';cursor:pointer;font-size:15px;font-weight:500;' +
        'color:' + (isActive ? '#111' : '#666') + ';transition:all 0.2s ease;display:flex;align-items:center;' +
        'justify-content:center;gap:8px;';

      var iconSpan = document.createElement('span');
      iconSpan.textContent = icon;
      iconSpan.style.fontSize = '20px';

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

    function createPracticePanel(user){
      var panel = document.createElement('div');
      panel.className = 'tab-panel';
      panel.id = 'practice-panel';

      // Daily quote
      var quoteContainer = document.createElement('div');
      quoteContainer.style.cssText = 'background:#f9f9f9;border-left:4px solid #06b3fd;padding:14px 18px;' +
        'margin-bottom:20px;border-radius:6px;';
      
      var quoteText = document.createElement('p');
      quoteText.className = 'p3';
      quoteText.style.cssText = 'margin:0;font-style:italic;color:#333;line-height:1.5;word-wrap:break-word;font-size:14px;';
      
      // Get daily quote from VaultCues if available
      var dailyQuote = 'Practice makes progress';
      if (window.VaultCues && window.VaultCues.getDailyQuote) {
        dailyQuote = window.VaultCues.getDailyQuote();
      }
      quoteText.textContent = '💡 ' + dailyQuote;
      
      quoteContainer.appendChild(quoteText);
      panel.appendChild(quoteContainer);

      // Continue Practice Buttons Row
      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;';
      
      // Stack on mobile
      if (window.innerWidth <= 600) {
        btnRow.style.gridTemplateColumns = '1fr';
      }

      var vaultBtn = mkPrimaryBtn('Open Practice Vault', VAULT_URL);
      var continueBtn = mkPrimaryBtn('Jump back into lesson', '#', true); // Will update with real URL
      continueBtn.id = 'continue-lesson-btn';
      continueBtn.style.background = '#06b3fd';
      continueBtn.style.borderColor = '#06b3fd';

      btnRow.appendChild(vaultBtn);
      btnRow.appendChild(continueBtn);
      panel.appendChild(btnRow);

      // Load last lesson data
      loadLastLesson(user, continueBtn);

      // My Progress dropdown
      var practiceSection = createDropdownSection('My Progress', function(){
        return createPracticeContent(user);
      });
      panel.appendChild(practiceSection);

      // My Goals dropdown
      var goalsSection = createDropdownSection('My Goals', function(){
        return createGoalsContent(user);
      });
      panel.appendChild(goalsSection);

      // Stats dropdown
      var statsSection = createDropdownSection('Stats', function(){
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
        'text-decoration:none;transition:all 0.2s ease;';

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

    function loadLastLesson(user, btnEl){
      if (!user || !btnEl) return;

      db.collection('users').doc(user.uid).collection('metrics').doc('practice').get()
        .then(function(snap){
          if (!snap.exists) {
            btnEl.disabled = true;
            btnEl.style.opacity = '0.5';
            btnEl.style.cursor = 'not-allowed';
            btnEl.textContent = 'No Recent Lesson';
            return;
          }

          var data = snap.data() || {};
          var url = data.lastLessonUrl;
          var title = data.lastLessonTitle;

          if (url && title) {
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
            btnEl.disabled = true;
            btnEl.style.opacity = '0.5';
            btnEl.style.cursor = 'not-allowed';
            btnEl.textContent = 'No Recent Lesson';
          }
        })
        .catch(function(){
          btnEl.disabled = true;
          btnEl.style.opacity = '0.5';
          btnEl.style.cursor = 'not-allowed';
          btnEl.textContent = 'No Recent Lesson';
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
      arrow.style.cssText = 'font-size:12px;transition:transform 0.2s ease;';
      
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

      // 2x2 grid of progress areas
      var grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';

      var areas = [
        { label: 'Groove Studies', key: 'grooves' },
        { label: 'Fill Studies', key: 'fills' },
        { label: 'Stick Studies', key: 'hands' },
        { label: 'Kick Studies', key: 'feet' }
      ];

      areas.forEach(function(area){
        var box = document.createElement('div');
        box.style.cssText = 'background:#fff;border:1px solid #ddd;border-radius:8px;padding:16px;' +
          'text-align:center;min-height:70px;display:flex;flex-direction:column;justify-content:center;';

        var labelEl = document.createElement('div');
        labelEl.style.cssText = 'font-size:13px;font-weight:600;color:#333;margin-bottom:6px;';
        labelEl.textContent = area.label;

        var valueEl = document.createElement('div');
        valueEl.style.cssText = 'font-size:20px;font-weight:700;color:#06b3fd;';
        valueEl.textContent = '—';
        valueEl.id = 'progress-' + area.key;

        box.appendChild(labelEl);
        box.appendChild(valueEl);

        grid.appendChild(box);
      });

      content.appendChild(grid);

      // Load progress data
      db.collection('users').doc(user.uid).collection('metrics').doc('progress').get()
        .then(function(snap){
          if (!snap.exists) return;
          var data = snap.data() || {};
          
          areas.forEach(function(area){
            var el = document.getElementById('progress-' + area.key);
            if (el) {
              var val = data[area.key];
              el.textContent = val || '—';
            }
          });
        })
        .catch(function(){});

      return content;
    }

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
      graphContainer.style.cssText = 'background:#fff;border:1px solid #ddd;border-radius:8px;padding:16px;margin-bottom:16px;';
      
      var graphTitle = document.createElement('div');
      graphTitle.style.cssText = 'font-size:14px;font-weight:600;color:#333;margin-bottom:12px;text-align:center;';
      graphTitle.textContent = 'Last 30 Days';
      
      var canvasContainer = document.createElement('div');
      canvasContainer.style.cssText = 'position:relative;height:200px;';
      
      var canvas = document.createElement('canvas');
      canvas.id = 'practice-chart';
      canvas.style.cssText = 'max-width:100%;';
      
      canvasContainer.appendChild(canvas);
      graphContainer.appendChild(graphTitle);
      graphContainer.appendChild(canvasContainer);
      content.appendChild(graphContainer);

      // Stats grid below graph
      var grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;';

      var stats = [
        { label: 'Days This Week', id: 'stat-days-week', value: '—', icon: '📅' },
        { label: 'Total Time', id: 'stat-total-time', value: '—', icon: '⏱️' },
        { label: 'Avg Per Session', id: 'stat-avg-time', value: '—', icon: '📊' }
      ];

      stats.forEach(function(stat){
        var box = document.createElement('div');
        box.style.cssText = 'background:#fff;border:1px solid #ddd;border-radius:8px;padding:14px;' +
          'text-align:center;';

        var iconEl = document.createElement('div');
        iconEl.textContent = stat.icon;
        iconEl.style.cssText = 'font-size:24px;margin-bottom:6px;';

        var valueEl = document.createElement('div');
        valueEl.style.cssText = 'font-size:20px;font-weight:700;color:#06b3fd;margin-bottom:4px;';
        valueEl.id = stat.id;
        valueEl.textContent = stat.value;

        var labelEl = document.createElement('div');
        labelEl.style.cssText = 'font-size:12px;color:#666;';
        labelEl.textContent = stat.label;

        box.appendChild(iconEl);
        box.appendChild(valueEl);
        box.appendChild(labelEl);

        grid.appendChild(box);
      });

      content.appendChild(grid);

      // Load stats and render chart
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
              label = (d.getMonth() + 1) + '/' + dayOfMonth;
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

      // Query daily sessions for this week
      db.collection('users').doc(user.uid).collection('metrics')
        .doc('daily').collection('sessions')
        .where('lastSessionAt', '>=', firebase.firestore.Timestamp.fromDate(monday))
        .where('lastSessionAt', '<=', firebase.firestore.Timestamp.fromDate(sunday))
        .get()
        .then(function(snap){
          daysEl.textContent = snap.size;
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

    function createProfilePanel(user, existingLogout){
      var panel = document.createElement('div');
      panel.className = 'tab-panel';
      panel.id = 'profile-panel';

      // Logged in as
      var emailText = document.createElement('p');
      emailText.className = 'p3';
      emailText.textContent = 'Logged in as ' + (user && user.email ? user.email : '');
      emailText.style.cssText = 'margin:0 0 20px 0;color:#666;text-align:center;';
      panel.appendChild(emailText);

      // Button container
      var btnContainer = document.createElement('div');
      btnContainer.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

      // Change Email (modal)
      var emailBtn = mkAccountBtn('button', 'Change Email');
      emailBtn.addEventListener('click', function(){
        clearMessage();
        openModal('Change Email', 'To change your email address, please contact support.');
      });
      btnContainer.appendChild(emailBtn);

      // Change Name (dropdown)
      var nameSection = createNameSection(user);
      btnContainer.appendChild(nameSection);

      // Change Password (dropdown)
      var pwSection = createPasswordSection(user);
      btnContainer.appendChild(pwSection);

      // Contact Support
      var supportBtn = mkAccountBtn('a', 'Contact Support', SUPPORT_URL);
      btnContainer.appendChild(supportBtn);

      // Logout button
      if (existingLogout) {
        existingLogout.id = 'logout-btn';
        existingLogout.style.marginTop = '10px';
        btnContainer.appendChild(existingLogout);
        
        // Re-attach event listener
        existingLogout.addEventListener('click', function(){
          clearMessage();
          try{
            var u = auth.currentUser;
            if (u) clearLoginMark(u.uid);
            else clearAllLoginMarks();
          } catch(_){}
          auth.signOut();
          window.VaultToast.info('Logged out');
        });
      }

      panel.appendChild(btnContainer);

      return panel;
    }

    function mkAccountBtn(tag, text, href) {
      var el = document.createElement(tag);
      el.className = 'account-btn';
      el.textContent = text;
      el.style.cssText = 'display:block;padding:14px 18px;background:#fff;border:1px solid #ddd;' +
        'border-radius:8px;cursor:pointer;font-weight:500;text-align:left;transition:all 0.2s ease;';

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

    function createNameSection(user){
      var section = document.createElement('div');

      var header = mkAccountBtn('button', 'Change Name');
      
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

      header.addEventListener('click', function(){
        if (isOpen) {
          panel.style.display = 'none';
          header.style.borderRadius = '8px';
        } else {
          panel.style.display = 'block';
          header.style.borderRadius = '8px 8px 0 0';
        }
        isOpen = !isOpen;
      });

      closeBtn.addEventListener('click', function(){
        panel.style.display = 'none';
        header.style.borderRadius = '8px';
        isOpen = false;
      });

      // Load existing name
      db.collection('users').doc(user.uid).get().then(function(snap){
        if (!snap.exists) return;
        var d = snap.data() || {};
        fn.value = String(d.firstName || '').trim();
        ln.value = String(d.lastName || '').trim();
        dn.value = String(d.displayName || '').trim();
      }).catch(function(){});

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
        
        // Validate display name (letters, numbers, spaces, underscore, hyphen only)
        var validPattern = /^[a-zA-Z0-9 _-]+$/;
        if (!validPattern.test(displayName)) {
          setMessage('Display name can only contain letters, numbers, spaces, underscores, and hyphens.');
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
          setMessage(e && e.message ? e.message : 'Missing or insufficient permissions.');
        });
      });

      section.appendChild(header);
      section.appendChild(panel);

      return section;
    }

    function createPasswordSection(user){
      var section = document.createElement('div');

      var header = mkAccountBtn('button', 'Change Password');
      
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
        } else {
          panel.style.display = 'block';
          header.style.borderRadius = '8px 8px 0 0';
        }
        isOpen = !isOpen;
      });

      closeBtn.addEventListener('click', function(){
        panel.style.display = 'none';
        header.style.borderRadius = '8px';
        isOpen = false;
      });

      updateBtn.addEventListener('click', function(){
        clearMessage();

        var userNow = auth.currentUser;
        if (!userNow || !userNow.email) {
          setMessage('Please log out and use the reset link.');
          return;
        }

        var a = String(curPw.value || '');
        var b = String(newPw.value || '');
        var c = String(newPw2.value || '');

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
            setMessage(e && e.message ? e.message : 'Could not update password.');
          });
      });

      section.appendChild(header);
      section.appendChild(panel);

      return section;
    }

    function mkLabel(text) {
      var l = document.createElement('label');
      l.textContent = text;
      l.style.cssText = 'display:block;margin-bottom:6px;font-weight:500;';
      return l;
    }

    function mkInput(type) {
      var i = document.createElement('input');
      i.type = type;
      i.style.cssText = 'display:block;width:100%;box-sizing:border-box;padding:10px;' +
        'border:1px solid #ccc;border-radius:6px;margin-bottom:14px;';
      return i;
    }

    function mkInlineBtn(text, primary) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.style.cssText = 'padding:10px 16px;border-radius:6px;cursor:pointer;font:inherit;' +
        'border:1px solid ' + (primary ? '#06b3fd' : '#ccc') + ';' +
        'background:' + (primary ? '#06b3fd' : '#fff') + ';' +
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
      box.style.cssText = 'width:100%;max-width:420px;background:#fff;border-radius:10px;' +
        'box-shadow:0 10px 40px rgba(0,0,0,.25);padding:22px;color:#111;';

      var h = document.createElement('h3');
      h.textContent = title;
      h.style.cssText = 'margin:0 0 10px 0;';

      var p = document.createElement('p');
      p.className = 'p2';
      p.textContent = bodyText;
      p.style.cssText = 'opacity:.9;line-height:1.5;margin:0 0 16px 0;';

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
        clearAllLoginMarks();
        return showLogin();
      }
      recordLoginOnce(user);
      showAccount(user);
    });

    if (loginBtn) {
      loginBtn.addEventListener('click', function(){
        clearMessage();
        var email = emailInput ? String(emailInput.value || '').trim() : '';
        var pass = passInput ? String(passInput.value || '') : '';

        if (!email || !pass) {
          setMessage('Please enter email and password.');
          return;
        }

        auth.signInWithEmailAndPassword(email, pass).catch(function(e){
          setMessage(e && e.message ? e.message : 'Could not log in.');
        });
      });
    }

    if (resetLink) {
      resetLink.addEventListener('click', function(e){
        e.preventDefault();
        clearMessage();
        var email = emailInput ? String(emailInput.value || '').trim() : '';
        if (!email) {
          setMessage('Please enter your email first.');
          return;
        }
        auth.sendPasswordResetEmail(email).then(function(){
          setMessage('Password reset email sent.');
        }).catch(function(e){
          setMessage(e && e.message ? e.message : 'Unable to send reset email.');
        });
      });
    }

  } // end start()

  start();
});

