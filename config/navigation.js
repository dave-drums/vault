/* navigation.js
   Purpose: Responsive navigation system
   Desktop: Left sidebar with collapse/expand (≥769px)
   Mobile: Slide-in menu from left (≤768px)
   Only visible for logged-in users
*/

(function(){
  'use strict';

  // SVG icon definitions
  var NAV_ICONS = {
    home: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>',
    music: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" /></svg>',
    clock: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 769 1024" fill="currentColor"><path d="m65 1024l79-550L6 242q-8-12-4-25.5T18.5 196t26-3.5T65 208l94 158l34-238L417 0l224 128l128 896zm96-192h195L200 569zm416-640L417 64L257 192l-41 271l169 283V160q0-13 9.5-22.5T417 128t22.5 9.5T449 160v672h224z"/></svg>',
    chart: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>',
    user: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>',
    megaphone: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" /></svg>',
    chat: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>',
    logout: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>',
    drums: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 319.467 319.467" fill="currentColor"><path d="M23.809,258.657l35.053-35.408C69.296,238.1,82.5,250.858,97.735,260.77l-28.192,39.281c-4.153,6.131-3.061,14.022,2.438,17.632c5.497,3.609,13.318,1.569,17.477-4.562l26.968-42.107c17.849,8.108,37.663,12.665,58.554,12.665c78.335,0,141.84-63.505,141.84-141.839C316.819,63.501,253.314,0,174.979,0C96.642,0,33.14,63.501,33.14,141.839c0,22.598,5.308,43.941,14.708,62.904l-40.75,37.044c-5.359,5.137-5.965,13.08-1.351,17.74C10.367,264.188,18.447,263.794,23.809,258.657z M54.35,141.839c0-66.513,54.117-120.63,120.629-120.63c66.514,0,120.63,54.117,120.63,120.63c0,66.513-54.116,120.629-120.63,120.629c-16.66,0-32.542-3.396-46.983-9.527L230.365,93.066c3.599-0.603,7.482-3.213,10.252-7.296c4.319-6.377,4.268-13.88-0.118-16.759c-4.392-2.879-11.444-0.049-15.768,6.331c-2.849,4.205-3.754,8.87-2.817,12.407L110.141,243.485c-14.374-9.207-26.68-21.354-36.044-35.62L208.249,72.361c3.646,0.143,8.006-1.608,11.578-5.03c5.577-5.352,7.115-12.702,3.434-16.417c-3.677-3.718-11.185-2.397-16.767,2.954c-3.672,3.526-5.552,7.904-5.38,11.558L64.312,189.788C57.917,175.072,54.35,158.87,54.35,141.839z"/></svg>',
    // drums: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><path d="m494.9,28.4c-8.1-7.9-21-7.8-28.9,0.3l-111.5,113.5c-33.6-6.4-71-9.6-108.2-9.6-22.4,0-44.9,1.2-66.5,3.5l-117-119c-7.9-8-20.8-8.2-28.8-0.2-8,7.9-8.2,20.8-0.3,28.9l96.3,98.1c-68.1,14.1-119,41.5-119,81.4v183c0,60.8 118.3,92.7 235.2,92.7 116.9,0 235.2-31.8 235.2-92.7v-183c0-32.1-32.9-56-81-71.6l94.7-96.5c7.9-8 7.8-20.9-0.2-28.8zm-54.3,379.9c0,15.5-66.1,51.8-194.4,51.8-128.3,0-194.4-36.3-194.4-51.8v-128.5c44.7,25.2 119.8,38.2 194.4,38.2 74.6,0 149.8-13 194.4-38.1v128.4zm0-183c0,15.5-66.1,51.8-194.4,51.8-128.3,0-194.4-36.3-194.4-51.8 0-11.8 38.2-35.6 112.7-46.3l28.1,28.6c5.1,5.6 18.5,10.6 28.9,0.3 8-8 9.3-23.4-4.5-33.7 0,0 19.1-0.7 29.2-0.7 27.2,0 51.7,1.6 73.3,4.4l-32.5,33.1c-7.9,8-7.7,20.9 0.3,28.9 10.3,10.3 23.6,5 28.9-0.3l51.9-52.9c48,12 72.5,29.2 72.5,38.6z"/></svg>',
    chevronLeft: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>',
    chevronRight: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>'
  };

  // Init function
  function init(){
    // Check Firebase is loaded and initialized
    if (typeof firebase === 'undefined' || !firebase.auth) {
      setTimeout(init, 100);
      return;
    }
    
    var auth, db;
    try {
      auth = firebase.auth();
      db = firebase.firestore ? firebase.firestore() : null;
    } catch(e) {
      // Firebase not ready yet
      setTimeout(init, 100);
      return;
    }
    
    injectStyles();
    
  // Auth state change listener
auth.onAuthStateChanged(function(user){
  if(user && db){
    document.body.classList.add('vault-logged-in');
    createDesktopSidebar(user.uid, auth, db);
    createMobileMenu(user.uid, auth, db);
  } else {
    document.body.classList.remove('vault-logged-in');
    createLoggedOutSidebar(auth);
    createLoggedOutMobileMenu(auth);
  }
  
  // Hide page loader after auth check
  setTimeout(function(){
    var loader = document.getElementById('page-loader');
    if(loader) {
      loader.classList.add('hidden');
      setTimeout(function(){ 
        if(loader.parentNode) loader.parentNode.removeChild(loader); 
      }, 500);
    }
  }, 100);
});
  }
  
  // Desktop sidebar (≥769px)
  function createDesktopSidebar(uid, auth, db){
    if(window.innerWidth < 769) return;
    
    var existingSidebar = document.getElementById('vault-sidebar');
    if(existingSidebar) existingSidebar.remove();
    
    var sidebar = document.createElement('div');
    sidebar.id = 'vault-sidebar';
    sidebar.className = 'vault-sidebar';
    
    // Check localStorage for collapsed state (default: expanded)
    var isExpanded = localStorage.getItem('vaultSidebarExpanded') !== 'false';
    if(!isExpanded) sidebar.classList.add('collapsed');
    
    document.body.appendChild(sidebar);
    document.body.classList.add('has-sidebar');
    if(!isExpanded) document.body.classList.add('sidebar-collapsed');
    
    // Fetch user data from Firestore
Promise.all([
  db.collection('users').doc(uid).get(),
  db.collection('users').doc(uid).collection('progress').get()
]).then(function(res){
  var firstName = (res[0].exists && res[0].data().firstName) || 'there';
  
  // Find most recently updated course
  var mostRecent = null;
  var mostRecentTime = 0;
  
  if (res[1] && !res[1].empty) {
    res[1].forEach(function(doc) {
      var data = doc.data();
      var time = data.lastUpdated ? data.lastUpdated.toMillis() : 0;
      
      if (time > mostRecentTime && data.lastLesson) {
        mostRecentTime = time;
        var courseId = doc.id;
        var pathway = courseId.match(/^[a-z]+/)[0];
        var slug = window.VAULT_COURSES[courseId].slug;
        
        mostRecent = {
          url: '/' + pathway + '?' + slug + '&l=' + data.lastLesson,
          title: data.lastLessonTitle || ('Lesson ' + data.lastLesson)
        };
      }
    });
  }
  
  var lastLessonUrl = mostRecent ? mostRecent.url : null;
  var lastLessonTitle = mostRecent ? mostRecent.title : 'Resume Last Lesson';
      
      // Greeting 
      var continueSection = lastLessonUrl 
        ? '<div class="sidebar-greeting">Hi, ' + firstName + '.</div>' +
          '<div class="sidebar-section">' +
          '  <div class="sidebar-section-title">Continue with</div>' +
          '  <a href="' + lastLessonUrl + '" class="sidebar-btn sidebar-continue">' +
          '    <span class="nav-icon">' + NAV_ICONS.drums + '</span>' +
          '    <span class="sidebar-btn-text">' + lastLessonTitle + '</span>' +
          '  </a>' +
          '</div><div class="sidebar-divider"></div>'
        : '';
      
      sidebar.innerHTML = 
        '<div class="sidebar-header">' +
        '  <img src="/assets/dwd-logo-500px.webp" alt="Dave Drums" class="sidebar-logo">' +
        '  <button class="sidebar-toggle" id="sidebar-toggle">' +
        '    <span class="nav-icon">' + (isExpanded ? NAV_ICONS.chevronLeft : NAV_ICONS.chevronRight) + '</span>' +
        '  </button>' +
        '</div>' +
        '<div class="sidebar-content">' +
        continueSection +
        '  <div class="sidebar-section">' +
        '    <div class="sidebar-section-title">Practice Vault</div>' +
        '    <a href="/" class="sidebar-link"><span class="nav-icon">' + NAV_ICONS.home + '</span><span>Courses</span></a>' +
        '    <a href="/groove" class="sidebar-link"><span class="nav-icon">' + NAV_ICONS.music + '</span><span>GrooveScribe</span></a>' +
        '    <a href="/metronome" class="sidebar-link"><span class="nav-icon">' + NAV_ICONS.clock + '</span><span>Metronome</span></a>' +
        '    <a href="/stats" class="sidebar-link"><span class="nav-icon">' + NAV_ICONS.chart + '</span><span>My Stats</span></a>' +
        '    <a href="/profile" class="sidebar-link"><span class="nav-icon">' + NAV_ICONS.user + '</span><span>My Profile</span></a>' +
        '    <a href="/updates" class="sidebar-link"><span class="nav-icon">' + NAV_ICONS.megaphone + '</span><span>Updates</span></a>' +
        '    <a href="/contact" class="sidebar-link"><span class="nav-icon">' + NAV_ICONS.chat + '</span><span>Contact</span></a>' +
        '    <button class="sidebar-btn sidebar-logout" id="sidebar-logout">' +
        '      <span class="nav-icon">' + NAV_ICONS.logout + '</span>' +
        '      <span>Logout</span>' +
        '    </button>' +
        '  </div>' +
        '</div>';
      
      highlightActive(sidebar);
      setupSidebarHandlers(sidebar, auth);
    }).catch(function(){
      // Fallback without user data
      sidebar.innerHTML = 
        '<div class="sidebar-header">' +
        '  <img src="/assets/dwd-logo-500px.webp" alt="Dave Drums" class="sidebar-logo">' +
        '  <button class="sidebar-toggle" id="sidebar-toggle">' +
        '    <span class="nav-icon">' + (isExpanded ? NAV_ICONS.chevronLeft : NAV_ICONS.chevronRight) + '</span>' +
        '  </button>' +
        '</div>' +
        '<div class="sidebar-content">' +
        '  <div class="sidebar-section">' +
        '    <div class="sidebar-section-title">Practice Vault</div>' +
        '    <a href="/" class="sidebar-link"><span class="nav-icon">' + NAV_ICONS.home + '</span><span>Courses</span></a>' +
        '    <a href="/groove" class="sidebar-link"><span class="nav-icon">' + NAV_ICONS.music + '</span><span>GrooveScribe</span></a>' +
        '    <a href="/metronome" class="sidebar-link"><span class="nav-icon">' + NAV_ICONS.clock + '</span><span>Metronome</span></a>' +
        '    <a href="/stats" class="sidebar-link"><span class="nav-icon">' + NAV_ICONS.chart + '</span><span>My Stats</span></a>' +
        '    <a href="/profile" class="sidebar-link"><span class="nav-icon">' + NAV_ICONS.user + '</span><span>My Profile</span></a>' +
        '    <a href="/updates" class="sidebar-link"><span class="nav-icon">' + NAV_ICONS.megaphone + '</span><span>Updates</span></a>' +
        '    <a href="/contact" class="sidebar-link"><span class="nav-icon">' + NAV_ICONS.chat + '</span><span>Contact</span></a>' +
        '    <button class="sidebar-btn sidebar-logout" id="sidebar-logout">' +
        '      <span class="nav-icon">' + NAV_ICONS.logout + '</span>' +
        '      <span>Logout</span>' +
        '    </button>' +
        '  </div>' +
        '</div>';
      highlightActive(sidebar);
      setupSidebarHandlers(sidebar, auth);
    });
  }
  
  // Sidebar event handlers
  function setupSidebarHandlers(sidebar, auth){
    var toggleBtn = document.getElementById('sidebar-toggle');
    var logoutBtn = document.getElementById('sidebar-logout');
    
    // Toggle collapse/expand
    toggleBtn.addEventListener('click', function(){
      var isCollapsed = sidebar.classList.toggle('collapsed');
      document.body.classList.toggle('sidebar-collapsed', isCollapsed);
      
      var icon = toggleBtn.querySelector('.nav-icon');
      icon.innerHTML = isCollapsed ? NAV_ICONS.chevronRight : NAV_ICONS.chevronLeft;
      
      localStorage.setItem('vaultSidebarExpanded', !isCollapsed);
    });
    
    // Logout functionality
    logoutBtn.addEventListener('click', function(){
      auth.signOut().then(function(){
        window.location.href = '/login.html';
      });
    });
  }
  
  // Mobile menu from original createHamburgerMenu function
  function createMobileMenu(uid, auth, db){
  // Only create mobile menu on screens ≤768px
  if(window.innerWidth > 768) return;
    removeMobileMenu();
    
    // Create hamburger button
    var hamburger = document.createElement('button');
    hamburger.id = 'vault-hamburger-btn';
    hamburger.className = 'vault-hamburger-btn';
    hamburger.innerHTML = '<span></span><span></span><span></span>';
    
    var hero = document.querySelector('.hero');
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
    document.body.appendChild(menu);
    
    // Fetch user data and build menu
    Promise.all([
  db.collection('users').doc(uid).get(),
  db.collection('users').doc(uid).collection('progress').get()
]).then(function(res){
  var firstName = (res[0].exists && res[0].data().firstName) || 'there';
  
  // Find most recently updated course
  var mostRecent = null;
  var mostRecentTime = 0;
  
  if (res[1] && !res[1].empty) {
    res[1].forEach(function(doc) {
      var data = doc.data();
      var time = data.lastUpdated ? data.lastUpdated.toMillis() : 0;
      
      if (time > mostRecentTime && data.lastLesson) {
        mostRecentTime = time;
        var courseId = doc.id;
        var pathway = courseId.match(/^[a-z]+/)[0];
        var slug = window.VAULT_COURSES[courseId].slug;
        
        mostRecent = {
          url: '/' + pathway + '?' + slug + '&l=' + data.lastLesson,
          title: data.lastLessonTitle || ('Lesson ' + data.lastLesson)
        };
      }
    });
  }
  
  var lastLessonUrl = mostRecent ? mostRecent.url : null;
  var lastLessonTitle = mostRecent ? mostRecent.title : 'Resume Last Lesson';
      
      // Greeting without emoji, SVG icons, Metronome added
      var continueSection = lastLessonUrl 
        ? '<div class="vault-menu-section">' +
          '  <div style="font-size:var(--text-body);color:#fff;margin-bottom:16px;font-weight:500;">Hi, ' + firstName + '.</div>' +
          '  <div class="vault-menu-section-title">Continue with</div>' +
          '  <a href="' + lastLessonUrl + '" class="vault-menu-btn vault-menu-continue"><span class="nav-icon">' + NAV_ICONS.drums + '</span><span>' + lastLessonTitle + '</span></a>' +
          '</div><div class="vault-menu-divider"></div>'
        : '';
      
      menu.innerHTML = 
        '<div class="vault-menu-header">' +
        '  <img src="/assets/dwd-logo-500px.webp" alt="Dave Drums" class="vault-menu-logo">' +
        '  <button class="vault-menu-close" id="vault-menu-close">&times;</button>' +
        '</div>' +
        '<div class="vault-menu-content">' +
        continueSection +
        '  <div class="vault-menu-section">' +
        '    <div class="vault-menu-section-title">Practice Vault</div>' +
        '    <a href="/" class="vault-menu-link"><span class="nav-icon">' + NAV_ICONS.home + '</span><span>Courses</span></a>' +
        '    <a href="/groove" class="vault-menu-link"><span class="nav-icon">' + NAV_ICONS.music + '</span><span>GrooveScribe</span></a>' +
        '    <a href="/metronome" class="vault-menu-link"><span class="nav-icon">' + NAV_ICONS.clock + '</span><span>Metronome</span></a>' +
        '    <a href="/stats" class="vault-menu-link"><span class="nav-icon">' + NAV_ICONS.chart + '</span><span>My Stats</span></a>' +
        '    <a href="/profile" class="vault-menu-link"><span class="nav-icon">' + NAV_ICONS.user + '</span><span>My Profile</span></a>' +
        '    <a href="/updates" class="vault-menu-link"><span class="nav-icon">' + NAV_ICONS.megaphone + '</span><span>Updates</span></a>' +
        '    <a href="/contact" class="vault-menu-link"><span class="nav-icon">' + NAV_ICONS.chat + '</span><span>Contact</span></a>' +
        '    <button class="vault-menu-btn vault-menu-logout" id="vault-menu-logout"><span class="nav-icon">' + NAV_ICONS.logout + '</span><span>Logout</span></button>' +
        '  </div>' +
        '</div>';
      
      highlightActive(menu);
      setupMobileHandlers();
    }).catch(function(){
      // Fallback without user data
      menu.innerHTML = 
        '<div class="vault-menu-header">' +
        '  <img src="/assets/dwd-logo-500px.webp" alt="Dave Drums" class="vault-menu-logo">' +
        '  <button class="vault-menu-close" id="vault-menu-close">&times;</button>' +
        '</div>' +
        '<div class="vault-menu-content">' +
        '  <div class="vault-menu-section">' +
        '    <div class="vault-menu-section-title">Practice Vault</div>' +
        '    <a href="/" class="vault-menu-link"><span class="nav-icon">' + NAV_ICONS.home + '</span><span>Courses</span></a>' +
        '    <a href="/groove" class="vault-menu-link"><span class="nav-icon">' + NAV_ICONS.music + '</span><span>GrooveScribe</span></a>' +
        '    <a href="/metronome" class="vault-menu-link"><span class="nav-icon">' + NAV_ICONS.clock + '</span><span>Metronome</span></a>' +
        '    <a href="/stats" class="vault-menu-link"><span class="nav-icon">' + NAV_ICONS.chart + '</span><span>My Stats</span></a>' +
        '    <a href="/profile" class="vault-menu-link"><span class="nav-icon">' + NAV_ICONS.user + '</span><span>My Profile</span></a>' +
        '    <a href="/updates" class="vault-menu-link"><span class="nav-icon">' + NAV_ICONS.megaphone + '</span><span>Updates</span></a>' +
        '    <a href="/contact" class="vault-menu-link"><span class="nav-icon">' + NAV_ICONS.chat + '</span><span>Contact</span></a>' +
        '    <button class="vault-menu-btn vault-menu-logout" id="vault-menu-logout"><span class="nav-icon">' + NAV_ICONS.logout + '</span><span>Logout</span></button>' +
        '  </div>' +
        '</div>';
      highlightActive(menu);
      setupMobileHandlers();
    });


    
    // ✅ PRESERVED: Mobile menu event handlers (original lines 201-230)
    function setupMobileHandlers(){
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
      
      // ✅ PRESERVED: Logout functionality (original lines 221-225)
      logoutBtn.addEventListener('click', function(){
        auth.signOut().then(function(){
          window.location.href = '/login.html';
        });
      });
      
      // ✅ PRESERVED: ESC key closes menu (original lines 227-229)
      document.addEventListener('keydown', function(e){
        if(e.key === 'Escape') closeMenu();
      });
    }
  }

   // Logged-out desktop sidebar
  function createLoggedOutSidebar(auth){
    if(window.innerWidth < 769) return;
    
    var existingSidebar = document.getElementById('vault-sidebar');
    if(existingSidebar) existingSidebar.remove();
    
    var sidebar = document.createElement('div');
    sidebar.id = 'vault-sidebar';
    sidebar.className = 'vault-sidebar';
    document.body.appendChild(sidebar);
    document.body.classList.add('has-sidebar');
    
    sidebar.innerHTML = 
      '<div class="sidebar-header">' +
      '  <img src="/assets/dwd-logo-500px.webp" alt="Dave Drums" class="sidebar-logo">' +
      '  <button class="sidebar-toggle" id="sidebar-toggle">' +
      '    <span class="nav-icon">' + NAV_ICONS.chevronLeft + '</span>' +
      '  </button>' +
      '</div>' +
      '<div class="sidebar-content">' +
      '  <div class="sidebar-section">' +
      '    <a href="/login.html" class="sidebar-btn sidebar-continue">' +
      '      <span class="nav-icon">' + NAV_ICONS.user + '</span>' +
      '      <span>Login</span>' +
      '    </a>' +
      '  </div>' +
      '  <div class="sidebar-divider"></div>' +
      '  <div class="sidebar-section">' +
      '    <a href="/groove" class="sidebar-link"><span class="nav-icon">' + NAV_ICONS.music + '</span><span>GrooveScribe</span></a>' +
      '    <a href="/metronome" class="sidebar-link"><span class="nav-icon">' + NAV_ICONS.clock + '</span><span>Metronome</span></a>' +
      '    <a href="/contact" class="sidebar-link"><span class="nav-icon">' + NAV_ICONS.chat + '</span><span>Contact</span></a>' +
      '  </div>' +
      '</div>';
    
    highlightActive(sidebar);
    addPageTransition(sidebar);
    setupLoggedOutSidebarHandlers(sidebar);
  }
  
  function setupLoggedOutSidebarHandlers(sidebar){
    var toggleBtn = document.getElementById('sidebar-toggle');
    
    toggleBtn.addEventListener('click', function(){
      var isCollapsed = sidebar.classList.toggle('collapsed');
      document.body.classList.toggle('sidebar-collapsed', isCollapsed);
      
      var icon = toggleBtn.querySelector('.nav-icon');
      icon.innerHTML = isCollapsed ? NAV_ICONS.chevronRight : NAV_ICONS.chevronLeft;
      
      localStorage.setItem('vaultSidebarExpanded', !isCollapsed);
    });
  }

     // Logged-out mobile menu
  function createLoggedOutMobileMenu(auth){
    if(window.innerWidth > 768) return;
    removeMobileMenu();
    
    var hamburger = document.createElement('button');
    hamburger.id = 'vault-hamburger-btn';
    hamburger.className = 'vault-hamburger-btn';
    hamburger.innerHTML = '<span></span><span></span><span></span>';
    
    var hero = document.querySelector('.hero');
    if (hero) {
      hero.appendChild(hamburger);
    } else {
      document.body.appendChild(hamburger);
    }
    
    var backdrop = document.createElement('div');
    backdrop.id = 'vault-menu-backdrop';
    backdrop.className = 'vault-menu-backdrop';
    document.body.appendChild(backdrop);
    
    var menu = document.createElement('div');
    menu.id = 'vault-menu-overlay';
    menu.className = 'vault-menu-overlay';
    document.body.appendChild(menu);
    
    menu.innerHTML = 
      '<div class="vault-menu-header">' +
      '  <img src="/assets/dwd-logo-500px.webp" alt="Dave Drums" class="vault-menu-logo">' +
      '  <button class="vault-menu-close" id="vault-menu-close">&times;</button>' +
      '</div>' +
      '<div class="vault-menu-content">' +
      '  <div class="vault-menu-section">' +
      '    <a href="/login.html" class="vault-menu-btn vault-menu-continue"><span class="nav-icon">' + NAV_ICONS.user + '</span><span>Login</span></a>' +
      '  </div>' +
      '  <div class="vault-menu-divider"></div>' +
      '  <div class="vault-menu-section">' +
      '    <a href="/groove" class="vault-menu-link"><span class="nav-icon">' + NAV_ICONS.music + '</span><span>GrooveScribe</span></a>' +
      '    <a href="/metronome" class="vault-menu-link"><span class="nav-icon">' + NAV_ICONS.clock + '</span><span>Metronome</span></a>' +
      '    <a href="/contact" class="vault-menu-link"><span class="nav-icon">' + NAV_ICONS.chat + '</span><span>Contact</span></a>' +
      '  </div>' +
      '</div>';
    
    highlightActive(menu);
    addPageTransition(menu);
    setupLoggedOutMobileHandlers();
    
    function setupLoggedOutMobileHandlers(){
      var closeBtn = document.getElementById('vault-menu-close');
      
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
      
      document.addEventListener('keydown', function(e){
        if(e.key === 'Escape') closeMenu();
      });
    }
  }

   
  // Remove mobile menu elements
  function removeMobileMenu(){
    var hamburger = document.getElementById('vault-hamburger-btn');
    var backdrop = document.getElementById('vault-menu-backdrop');
    var menu = document.getElementById('vault-menu-overlay');
    if(hamburger) hamburger.remove();
    if(backdrop) backdrop.remove();
    if(menu) menu.remove();
  }
  
  // Remove all navigation elements
  function removeNavigation(){
    removeMobileMenu();
    var sidebar = document.getElementById('vault-sidebar');
    if(sidebar) sidebar.remove();
    document.body.classList.remove('has-sidebar', 'sidebar-collapsed');
  }
  
  // Active page highlighting
  function highlightActive(container){
    var path = window.location.pathname;
    var links = container.querySelectorAll('.sidebar-link, .vault-menu-link');
    links.forEach(function(link){
      var href = link.getAttribute('href');
      if(href && href.indexOf('http') === -1 && path.indexOf(href) === 0 && href !== '/'){
        link.classList.add('active');
      }
    });
  }

     function highlightActive(container){
    var path = window.location.pathname;
    var links = container.querySelectorAll('a[href]');
    links.forEach(function(link){
      if(link.getAttribute('href') === path) {
        link.classList.add('active');
      }
    });
  }
  
  // Show page loader on navigation (for smooth transitions)
  function addPageTransition(container){
    var links = container.querySelectorAll('a[href^="/"]');
    links.forEach(function(link){
      link.addEventListener('click', function(e){
        // Don't show loader if it's the current page
        if(link.href === window.location.href) {
          e.preventDefault();
          return;
        }
        
        // Show page loader
        var loader = document.getElementById('page-loader');
        if(loader) loader.classList.remove('hidden');
      });
    });
  }
  
  // Inject all styles
  function injectStyles(){
    var css = `
    /* Icon wrapper */
    .nav-icon {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .nav-icon svg {
      width: 100%;
      height: 100%;
    }
    
    /* ============================================
       DESKTOP SIDEBAR (≥769px)
       ============================================ */
    @media (min-width: 769px) {
      .vault-sidebar {
        position: fixed;
        left: 0;
        top: 0;
        width: 240px;
        height: 100vh;
        background: rgba(26, 26, 46, 0.98);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-right: 1px solid rgba(6, 179, 253, 0.2);
        z-index: 1000;
        transition: width 0.3s ease;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
.vault-sidebar.collapsed {
  width: 72px;
}
      
      /* Sidebar header with logo and toggle */
      .sidebar-header {
        padding: 24px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        min-height: 116px;
      }
      
      .sidebar-logo {
        height: 68px;
        width: auto;
        opacity: 0.9;
        transition: opacity 0.2s;
      }
      
      .sidebar-toggle {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        padding: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        color: #fff;
      }
      
      .sidebar-toggle:hover {
        background: rgba(255,255,255,0.1);
        border-color: rgba(255,255,255,0.2);
      }
      
      /* Hide logo when collapsed */
      .vault-sidebar.collapsed .sidebar-logo {
        display: none;
      }
      
      .vault-sidebar.collapsed .sidebar-header {
        justify-content: center;
        padding: 16px;
      }
      
      /* Sidebar content */
      .sidebar-content {
        padding: 16px;
        flex: 1;
        overflow-y: auto;
        scrollbar-width: none;
      }
      
      .sidebar-content::-webkit-scrollbar {
        display: none;
      }
      
      .sidebar-greeting {
        color: #fff;
        font-size: 16px;
        margin-bottom: 16px;
        font-weight: 500;
      }
      
      .sidebar-section {
        margin-bottom: 20px;
      }
      
      .sidebar-section-title {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: rgba(255,255,255,0.5);
        margin-bottom: 12px;
        font-weight: 600;
      }
      
      .sidebar-divider {
        height: 1px;
        background: rgba(255,255,255,0.1);
        margin: 16px 0;
      }
      
      /* Sidebar links */
      .sidebar-link {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        color: #fff;
        text-decoration: none;
        border-radius: 8px;
        margin-bottom: 4px;
        transition: all 0.2s;
        font-size: 15px;
        position: relative;
      }
      
      .sidebar-link:hover {
        background: rgba(255,255,255,0.08);
        transform: translateX(2px);
      }
      
      .sidebar-link.active {
        background: rgba(6,179,253,0.15);
        color: #06b3fd;
        padding-left: 12px;
      }
      
      /* Sidebar buttons */
      .sidebar-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        color: #fff;
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
        text-align: left;
        width: 100%;
        text-decoration: none;
      }
      
      .sidebar-btn:hover {
        background: rgba(255,255,255,0.1);
        border-color: rgba(255,255,255,0.2);
      }
      
      .sidebar-continue {
        background: rgba(6,179,253,0.15);
        border-color: rgba(6,179,253,0.3);
        color: #06b3fd;
      }
      
      .sidebar-continue:hover {
        background: rgba(6,179,253,0.25);
        border-color: rgba(6,179,253,0.4);
      }
      
      .sidebar-logout {
        background: rgba(239,68,68,0.1);
        border-color: rgba(239,68,68,0.3);
        color: #ef4444;
      }
      
      .sidebar-logout:hover {
        background: rgba(239,68,68,0.15);
      }
      
      /* Collapsed state - hide text */
      .vault-sidebar.collapsed .sidebar-greeting,
      .vault-sidebar.collapsed .sidebar-section-title,
      .vault-sidebar.collapsed .sidebar-link span:not(.nav-icon),
      .vault-sidebar.collapsed .sidebar-btn span:not(.nav-icon),
      .vault-sidebar.collapsed .sidebar-btn-text {
        display: none;
      }
      
      .vault-sidebar.collapsed .sidebar-link,
      .vault-sidebar.collapsed .sidebar-btn {
        justify-content: center;
        padding: 10px 8px;
      }
      
      .vault-sidebar.collapsed .sidebar-link.active {
        border-left: none;
        padding-right: 10px;
      }
      
      /* Page content adjustment */
      body.has-sidebar {
        margin-left: 240px;
        transition: margin-left 0.3s ease;
      }
      
      body.has-sidebar.sidebar-collapsed {
        margin-left: 72px;
      }
      
    }
    
    /* ============================================
       MOBILE MENU (≤768px)
       ============================================ */
    @media (max-width: 768px) {
      /* Hide desktop sidebar on mobile */
      .vault-sidebar {
        display: none;
      }
      
      /* Hamburger button moved to LEFT */
      .vault-hamburger-btn {
        position: absolute;
        top: 20px;
        left: 20px;
        z-index: 3;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 8px;
        padding: 10px 12px;
        cursor: pointer;
        display: flex; 
        flex-direction: column;
        gap: 5px;
        width: 44px;
        height: 44px;
        justify-content: center;
        align-items: center;
        transition: all 0.2s;
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
      
      /* Backdrop */
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
      
      /* Menu overlay slides from LEFT */
      .vault-menu-overlay {
        position: fixed;
        top: 0;
        left: -100%;
        width: 100%;
        max-width: 280px;
        height: 100vh;
        background: rgba(26, 26, 46, 0.98);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-right: 2px solid rgba(6, 179, 253, 0.3);
        z-index: 9999;
        transition: left 0.3s ease;
        box-shadow: 4px 0 20px rgba(0,0,0,0.3);
        display: flex;
        flex-direction: column;
      }
      
      .vault-menu-overlay.open {
        left: 0;
      }
      
      /* Menu header */
      .vault-menu-header {
        padding: 24px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }
      
      /* Logo */
      .vault-menu-logo {
        height: 68px;
        width: auto;
        opacity: 0.9;
      }
      
      /* Close button */
      .vault-menu-close {
        background: none;
        border: none;
        color: #fff;
        font-size: var(--heading-section);
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
      
      /* Menu content */
      .vault-menu-content {
        padding: 16px;
        flex: 1;
        overflow-y: auto;
        scrollbar-width: none;
      }
      
      .vault-menu-content::-webkit-scrollbar {
        display: none;
      }
      
      /* Menu section */
      .vault-menu-section {
        margin-bottom: 16px;
      }
      
      /* Divider */
      .vault-menu-divider {
        height: 1px;
        background: rgba(255,255,255,0.1);
        margin: 16px 0;
      }
      
      /* Section title */
      .vault-menu-section-title {
        font-size: var(--text-micro);
        text-transform: uppercase;
        letter-spacing: 1px;
        color: rgba(255,255,255,0.5);
        margin-bottom: 12px;
        font-weight: 600;
      }
      
      /* Menu link with flex for icons */
      .vault-menu-link {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        color: #fff;
        text-decoration: none;
        border-radius: 8px;
        margin-bottom: 4px;
        transition: all 0.2s;
        font-size: var(--text-ui);
      }
      
      .vault-menu-link:hover {
        background: rgba(255,255,255,0.08);
        transform: translateX(4px);
      }
      
      .vault-menu-link.active {
        background: rgba(6,179,253,0.15);
        color: #06b3fd;
      }
      
      /* Menu button with flex for icons */
      .vault-menu-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 12px 14px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        color: #fff;
        font-size: var(--text-ui);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
        text-align: left;
      }
      
      .vault-menu-btn:hover {
        background: rgba(255,255,255,0.1);
        border-color: rgba(255,255,255,0.2);
      }
      
      /* Logout button styling */
      .vault-menu-logout {
        background: rgba(239,68,68,0.1);
        border-color: rgba(239,68,68,0.3);
        color: #ef4444;
      }
      
      .vault-menu-logout:hover {
        background: rgba(239,68,68,0.15);
      }
      
      /* Continue button styling */
      .vault-menu-continue {
        background: rgba(6,179,253,0.15);
        border-color: rgba(6,179,253,0.3);
        color: #06b3fd;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .vault-menu-continue:hover {
        background: rgba(6,179,253,0.25);
        border-color: rgba(6,179,253,0.4);
      }
      
      /* Mobile max-width */
      .vault-menu-overlay {
        max-width: 260px;
      }
    }
    `;
    
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }
  
  // Wait for DOM to be ready before initializing
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(init, 50);
    });
  } else {
    setTimeout(init, 50);
  }
   // Failsafe: hide loader after 3s if auth hangs
setTimeout(function(){
  var loader = document.getElementById('page-loader');
  if(loader && !loader.classList.contains('hidden')) {
    loader.classList.add('hidden');
    setTimeout(function(){ 
      if(loader.parentNode) loader.parentNode.removeChild(loader); 
    }, 500);
  }
}, 3000);
})();
