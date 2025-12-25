/* vault-sidenav.js
   Purpose: Side navigation for logged-in users
   Usage: Loaded conditionally on /vault and /members pages
*/

(function(){
  'use strict';

  if (typeof firebase === 'undefined') return;

  // Wait for Firebase to be ready
  function init(){
    if (!firebase.auth || !firebase.firestore) {
      setTimeout(init, 100);
      return;
    }
    
    var auth = firebase.auth();
    var db = firebase.firestore();
    
    // Inject styles
    injectStyles();
    
    auth.onAuthStateChanged(function(user){
      if(user){
        document.body.classList.add('vault-logged-in');
        createSideNav(user.uid);
      } else {
        document.body.classList.remove('vault-logged-in');
        var nav = document.getElementById('vault-side-nav');
        var toggle = document.getElementById('vault-side-nav-toggle');
        if(nav) nav.remove();
        if(toggle) toggle.remove();
      }
    });
    
    function createSideNav(uid){
      var existing = document.getElementById('vault-side-nav');
      var existingToggle = document.getElementById('vault-side-nav-toggle');
      if(existing) existing.remove();
      if(existingToggle) existingToggle.remove();
      
      var toggle = document.createElement('button');
      toggle.id = 'vault-side-nav-toggle';
      toggle.innerHTML = '☰';
      toggle.setAttribute('aria-label', 'Toggle navigation');
      document.body.appendChild(toggle);
      
      var nav = document.createElement('div');
      nav.id = 'vault-side-nav';
      
      var links = [
        {text: 'Practice Vault', url: '/vault'},
        {text: 'Continue...', url: '/vault', id: 'vault-continue'},
        {text: 'GrooveScribe', url: '/groove'},
        {text: 'Members Area', url: '/members'}
      ];
      
      links.forEach(function(link){
        var a = document.createElement('a');
        a.href = link.url;
        a.textContent = link.text;
        if(link.id) a.id = link.id;
        nav.appendChild(a);
      });
      
      var hr = document.createElement('hr');
      nav.appendChild(hr);
      
      var logoutBtn = document.createElement('button');
      logoutBtn.textContent = 'Logout';
      logoutBtn.onclick = function(){
        auth.signOut().then(function(){
          window.location.href = '/members';
        });
      };
      nav.appendChild(logoutBtn);
      
      document.body.appendChild(nav);
      
      toggle.onclick = function(){
        nav.classList.toggle('open');
      };
      
      document.addEventListener('click', function(e){
        if(!nav.contains(e.target) && e.target !== toggle){
          nav.classList.remove('open');
        }
      });
      
      loadLastLesson(uid);
      highlightActive();
    }
    
    function loadLastLesson(uid){
      db.collection('users').doc(uid).collection('metrics').doc('practice').get()
        .then(function(snap){
          var continueLink = document.getElementById('vault-continue');
          if(!continueLink) return;
          
          if(!snap.exists){
            continueLink.style.display = 'none';
            return;
          }
          
          var data = snap.data() || {};
          var url = data.lastLessonUrl;
          var title = data.lastLessonTitle || '';
          
          if(url && title){
            if(title.length > 20) title = title.substring(0, 20) + '...';
            continueLink.textContent = 'Continue: ' + title;
            continueLink.href = url;
            continueLink.style.display = 'block';
          } else {
            continueLink.style.display = 'none';
          }
        })
        .catch(function(){
          var continueLink = document.getElementById('vault-continue');
          if(continueLink) continueLink.style.display = 'none';
        });
    }
    
    function highlightActive(){
      var path = window.location.pathname;
      var nav = document.getElementById('vault-side-nav');
      if(!nav) return;
      
      var links = nav.querySelectorAll('a');
      links.forEach(function(link){
        var href = link.getAttribute('href');
        if(href && href.indexOf('http') === -1 && path.indexOf(href) === 0 && href !== '/'){
          link.classList.add('active');
        }
      });
    }
  }

  function injectStyles(){
    var css = `
#vault-side-nav-toggle {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(40, 40, 40, 0.7);
  backdrop-filter: blur(10px);
  border: none;
  border-radius: 8px 0 0 8px;
  padding: 12px 8px;
  cursor: pointer;
  z-index: 9998;
  color: #fff;
  font-size: 18px;
  display: none;
  transition: background 0.2s;
}
#vault-side-nav-toggle:hover {
  background: rgba(40, 40, 40, 0.85);
}
body.vault-logged-in #vault-side-nav-toggle {
  display: block;
}
#vault-side-nav {
  position: fixed;
  right: -250px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(40, 40, 40, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 12px 0 0 12px;
  padding: 16px;
  z-index: 9999;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  width: 220px;
  transition: right 0.3s ease;
  font-family: inherit;
}
#vault-side-nav.open {
  right: 0;
}
#vault-side-nav a,
#vault-side-nav button {
  display: block;
  color: #fff;
  text-decoration: none;
  padding: 10px 14px;
  margin: 4px 0;
  border-radius: 8px;
  font-size: inherit;
  white-space: nowrap;
  transition: background 0.2s;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
  font-family: inherit;
}
#vault-side-nav a:hover,
#vault-side-nav button:hover {
  background: rgba(255,255,255,0.1);
}
#vault-side-nav a.active {
  background: #06b3fd;
}
#vault-side-nav hr {
  border: none;
  border-top: 1px solid rgba(255,255,255,0.2);
  margin: 8px 0;
}
@media (max-width: 768px) {
  #vault-side-nav {
    width: 200px;
    right: -220px;
  }
}
`;
    
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // Start initialization when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
