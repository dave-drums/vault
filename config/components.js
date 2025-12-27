/* components.js
   Purpose: UI components - toast notifications + hamburger menu navigation + universal site footer
   Usage: Loaded conditionally on /vault and /members pages
*/

/* Auth Protection - Redirect non-logged-in users on protected pages */
(function(){
  'use strict';
  
  // Check if page is marked as protected
  var isProtected = document.documentElement && 
                    document.documentElement.dataset && 
                    document.documentElement.dataset.protected === 'true';
  
  if (!isProtected) return; // Not a protected page
  
  // Wait for Firebase to be ready
  function checkAuth() {
    if (typeof firebase === 'undefined' || !firebase.auth) {
      setTimeout(checkAuth, 50);
      return;
    }
    
    var auth = firebase.auth();
    
    auth.onAuthStateChanged(function(user) {
      if (user) {
        // User is logged in - show page
        document.body.style.opacity = '1';
      } else {
        // User not logged in - redirect to members page
        window.location.href = '/members.html';
      }
    });
  }
  
  checkAuth();
})();

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
        'font-size:14px;' +
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
    '  from { transform: translateX(400px); opacity: 0; }' +
    '  to { transform: translateX(0); opacity: 1; }' +
    '}' +
    '@keyframes slideOut {' +
    '  from { transform: translateX(0); opacity: 1; }' +
    '  to { transform: translateX(400px); opacity: 0; }' +
    '}';
  document.head.appendChild(style);
})();

/* vault-hamburger-menu.js
   Purpose: Hamburger menu navigation for logged-in users
   Usage: Loaded conditionally on course pages
*/

(function(){
  'use strict';

  if (typeof firebase === 'undefined') return;

  function init(){
    if (!firebase.auth || !firebase.firestore) {
      setTimeout(init, 100);
      return;
    }
    
    var auth = firebase.auth();
    var db = firebase.firestore();
    
    injectStyles();
    
    auth.onAuthStateChanged(function(user){
      if(user){
        document.body.classList.add('vault-logged-in');
        createHamburgerMenu(user.uid, auth, db);
      } else {
        document.body.classList.remove('vault-logged-in');
        removeHamburgerMenu();
      }
    });
  }
  
  function createHamburgerMenu(uid, auth, db){
    removeHamburgerMenu();
    
    // Create hamburger button inside hero
    var hamburger = document.createElement('button');
    hamburger.id = 'vault-hamburger-btn';
    hamburger.className = 'vault-hamburger-btn';
    hamburger.innerHTML = '<span></span><span></span><span></span>';
    
    // Find hero and insert hamburger
    var hero = document.querySelector('.course-hero, .vault-hero, .members-hero, .create-hero, .groove-hero');
    if (hero) {
      hero.appendChild(hamburger);
    } else {
      document.body.appendChild(hamburger);
    }
    
    // Create backdrop
    var backdrop = document.createElement('div');
    backdrop.id = 'vault-menu-backdrop';
    backdrop.className = 'vault-menu-backdrop';
    document.body.appendChild(backdrop);
    
    // Create menu overlay
    var menu = document.createElement('div');
    menu.id = 'vault-menu-overlay';
    menu.className = 'vault-menu-overlay';
    
    var menuHTML = 
      '<div class="vault-menu-header">' +
      '  <img src="/assets/dwd-logo-500px.webp" alt="Dave Drums" class="vault-menu-logo">' +
      '  <button class="vault-menu-close" id="vault-menu-close">&times;</button>' +
      '</div>' +
      '<div class="vault-menu-content">' +
      '  <div class="vault-menu-section">' +
      '    <div class="vault-menu-section-title">Navigation</div>' +
      '    <a href="/" class="vault-menu-link">Practice Vault</a>' +
      '    <a href="/members" class="vault-menu-link">Members Area</a>' +
      '    <a href="/groove.html" class="vault-menu-link">GrooveScribe</a>' +
      '  </div>' +
      '  <div class="vault-menu-divider"></div>' +
      '  <div class="vault-menu-section" id="vault-menu-courses">' +
      '    <div class="vault-menu-section-title">Courses</div>' +
      '    <a href="/gs?c=1" class="vault-menu-link" data-pathway="gs">Groove Studies</a>' +
      '    <a href="/" class="vault-menu-link" data-pathway="fs">Fill Studies</a>' +
      '    <a href="/" class="vault-menu-link" data-pathway="ss">Stick Studies</a>' +
      '    <a href="/" class="vault-menu-link" data-pathway="ks">Kick Studies</a>' +
      '  </div>' +
      '  <div class="vault-menu-divider"></div>' +
      '  <div class="vault-menu-section">' +
      '    <a href="https://www.davedrums.com.au/contact" target="_blank" class="vault-menu-link">Contact Support</a>' +
      '    <button class="vault-menu-btn vault-menu-logout" id="vault-menu-logout">Logout</button>' +
      '  </div>' +
      '</div>';
    
    menu.innerHTML = menuHTML;
    document.body.appendChild(menu);
    
    // Event handlers
    var closeBtn = document.getElementById('vault-menu-close');
    var logoutBtn = document.getElementById('vault-menu-logout');
    
    function openMenu(){
      hamburger.classList.add('open');
      backdrop.classList.add('open');
      menu.classList.add('open');
    }
    
    function closeMenu(){
      hamburger.classList.remove('open');
      backdrop.classList.remove('open');
      menu.classList.remove('open');
    }
    
    hamburger.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);
    backdrop.addEventListener('click', closeMenu);
    
    logoutBtn.addEventListener('click', function(){
      auth.signOut().then(function(){
        window.location.href = '/members.html';
      });
    });
    
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') closeMenu();
    });
    
    highlightActive(menu);
    loadSmartCourseLinks(uid, db);
  }
  
  function loadSmartCourseLinks(uid, db){
    // Get all progress docs to find highest course in each pathway
    db.collection('users').doc(uid).collection('progress').get()
      .then(function(snap){
        var pathwayProgress = {gs: 1, fs: 1, ss: 1, ks: 1}; // defaults
        
        snap.forEach(function(doc){
          var courseId = doc.id; // e.g., "gs2", "fs1"
          var match = courseId.match(/^([a-z]+)(\d+)$/);
          if(match){
            var pathway = match[1];
            var courseNum = parseInt(match[2]);
            if(pathwayProgress[pathway] !== undefined && courseNum > pathwayProgress[pathway]){
              pathwayProgress[pathway] = courseNum;
            }
          }
        });
        
        // Update course links
        var courseLinks = document.querySelectorAll('[data-pathway]');
        courseLinks.forEach(function(link){
          var pathway = link.getAttribute('data-pathway');
          var courseNum = pathwayProgress[pathway];
          if(courseNum && pathway === 'gs'){
            link.href = '/' + pathway + '?c=' + courseNum;
          }
          // Other pathways stay as "/" until they're created
        });
      })
      .catch(function(err){
        console.log('Could not load course progress:', err);
      });
  }
  
  function removeHamburgerMenu(){
    var hamburger = document.getElementById('vault-hamburger-btn');
    var backdrop = document.getElementById('vault-menu-backdrop');
    var menu = document.getElementById('vault-menu-overlay');
    if(hamburger) hamburger.remove();
    if(backdrop) backdrop.remove();
    if(menu) menu.remove();
  }
  
  function highlightActive(menu){
    var path = window.location.pathname;
    var links = menu.querySelectorAll('.vault-menu-link');
    links.forEach(function(link){
      var href = link.getAttribute('href');
      if(href && href.indexOf('http') === -1 && path.indexOf(href) === 0 && href !== '/'){
        link.classList.add('active');
      }
    });
  }
  
  function injectStyles(){
    var css = `
    .vault-hamburger-btn {
      position: absolute;
      top: 20px;
      right: 20px;
      z-index: 3;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      padding: 10px 12px;
      cursor: pointer;
      display: none;
      flex-direction: column;
      gap: 5px;
      width: 44px;
      height: 44px;
      justify-content: center;
      align-items: center;
      transition: all 0.2s;
    }
    body.vault-logged-in .vault-hamburger-btn {
      display: flex;
    }
    .vault-hamburger-btn:hover {
      background: rgba(255,255,255,0.15);
      border-color: rgba(255,255,255,0.3);
    }
    .vault-hamburger-btn span {
      width: 24px;
      height: 2px;
      background: #fff;
      border-radius: 2px;
      transition: all 0.3s;
      display: block;
    }
    .vault-hamburger-btn.open span:nth-child(1) {
      transform: translateY(7px) rotate(45deg);
    }
    .vault-hamburger-btn.open span:nth-child(2) {
      opacity: 0;
    }
    .vault-hamburger-btn.open span:nth-child(3) {
      transform: translateY(-7px) rotate(-45deg);
    }
    .vault-menu-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 9998;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s;
    }
    .vault-menu-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }
    .vault-menu-overlay {
      position: fixed;
      top: 0;
      right: -100%;
      width: 100%;
      max-width: 320px;
      height: 100vh;
      background: rgba(26, 26, 46, 0.98);
      backdrop-filter: blur(10px);
      z-index: 9999;
      transition: right 0.3s ease;
      box-shadow: -4px 0 20px rgba(0,0,0,0.3);
    }
    .vault-menu-overlay.open {
      right: 0;
    }
    .vault-menu-header {
      padding: 24px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .vault-menu-logo {
      height: 48px;
      width: auto;
      opacity: 0.9;
    }
    .vault-menu-close {
      background: none;
      border: none;
      color: #fff;
      font-size: 32px;
      cursor: pointer;
      padding: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: background 0.2s;
      font-family: inherit;
    }
    .vault-menu-close:hover {
      background: rgba(255,255,255,0.1);
    }
    .vault-menu-content {
      padding: 24px;
    }
    .vault-menu-section {
      margin-bottom: 24px;
    }
    .vault-menu-divider {
      height: 1px;
      background: rgba(255,255,255,0.1);
      margin: 16px 0;
    }
    .vault-menu-section-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: rgba(255,255,255,0.5);
      margin-bottom: 12px;
      font-weight: 600;
    }
    .vault-menu-link {
      display: block;
      padding: 12px 16px;
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      margin-bottom: 4px;
      transition: all 0.2s;
      font-size: 15px;
    }
    .vault-menu-link:hover {
      background: rgba(255,255,255,0.1);
      transform: translateX(4px);
    }
    .vault-menu-link.active {
      background: rgba(6,179,253,0.2);
      color: #06b3fd;
    }
    .vault-menu-btn {
      display: block;
      width: 100%;
      padding: 14px 16px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      color: #fff;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
      text-align: left;
    }
    .vault-menu-btn:hover {
      background: rgba(255,255,255,0.15);
      border-color: rgba(255,255,255,0.3);
    }
    .vault-menu-logout {
      background: rgba(239,68,68,0.1);
      border-color: rgba(239,68,68,0.3);
      color: #ef4444;
    }
    .vault-menu-logout:hover {
      background: rgba(239,68,68,0.15);
    }
    @media (max-width: 768px) {
      .vault-menu-overlay {
        max-width: 280px;
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
      '    <a href="https://www.davedrums.com.au/contact" target="_blank" rel="noopener">Contact</a>' +
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
      font-size: 14px;
      transition: color 0.2s;
    }
    .vault-footer-links a:hover {
      color: #06b3fd;
    }
    .vault-footer-copyright {
      color: rgba(255,255,255,0.5);
      font-size: 13px;
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

/* vault-scroll-to-top.js
   Purpose: Scroll to top button for all pages
   Usage: Automatically added on all pages
*/

(function(){
  'use strict';
  
  function init(){
    injectStyles();
    createScrollButton();
  }
  
  function createScrollButton(){
    var btn = document.createElement('button');
    btn.id = 'vault-scroll-top';
    btn.className = 'vault-scroll-top';
    btn.innerHTML = '↑';
    btn.setAttribute('aria-label', 'Scroll to top');
    document.body.appendChild(btn);
    
    // Show/hide based on scroll position
    function toggleButton(){
      if(window.pageYOffset > 300){
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }
    
    window.addEventListener('scroll', toggleButton);
    toggleButton(); // Check initial position
    
    // Scroll to top on click
    btn.addEventListener('click', function(){
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
  
  function injectStyles(){
    var css = `
    .vault-scroll-top {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 48px;
      height: 48px;
      background: rgba(6, 179, 253, 0.9);
      border: none;
      border-radius: 50%;
      color: #fff;
      font-size: 24px;
      cursor: pointer;
      z-index: 9997;
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .vault-scroll-top.visible {
      opacity: 1;
      pointer-events: auto;
    }
    .vault-scroll-top:hover {
      background: rgba(5, 153, 220, 0.9);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.2);
    }
    @media (max-width: 768px) {
      .vault-scroll-top {
        bottom: 20px;
        right: 20px;
        width: 44px;
        height: 44px;
        font-size: 20px;
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

/* vault-index-progress.js
   Purpose: Load course progress on index page
   Usage: Auto-runs when index page loads
*/

(function(){
  'use strict';
  
  // Only run on index page (check for pathway cards)
  if (!document.querySelector('.pathway')) return;
  
  function loadIndexProgress() {
    try {
      if (typeof firebase === 'undefined' || !firebase.auth || !window.VAULT_COURSES) return;
      
      firebase.auth().onAuthStateChanged(function(user){
        if (!user) return;
        
        var db = firebase.firestore();
        
        // Loop through all courses and load progress for elements that exist
        Object.keys(window.VAULT_COURSES).forEach(function(courseId){
          var progressEl = document.getElementById(courseId + '-progress');
          if (!progressEl) return;
          
          var courseConfig = window.VAULT_COURSES[courseId];
          if (!courseConfig || !courseConfig.lessons || courseConfig.lessons.length === 0) return;
          
          // Load progress from Firestore
          db.collection('users').doc(user.uid).collection('progress').doc(courseId).get()
            .then(function(snap){
              var total = courseConfig.lessons.length;
              var completedCount = 0;
              
              if (snap.exists) {
                var completed = snap.data().completed || {};
                var keys = Object.keys(completed);
                for (var i = 0; i < keys.length; i++) {
                  if (completed[keys[i]] === true) completedCount++;
                }
              }
              
              progressEl.textContent = total + ' lessons • ' + completedCount + '/' + total + ' complete';
            })
            .catch(function(e){ 
              console.error('Error loading ' + courseId + ' progress:', e); 
            });
        });
      });
    } catch(e) {
      console.error('Index progress error:', e);
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadIndexProgress);
  } else {
    loadIndexProgress();
  }
})();
