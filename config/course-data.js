/* course-data.js
   Purpose: SINGLE SOURCE OF TRUTH for all course data and progress loading
   Used by: index.html, members.html, admin.html, gs.html, and all course pages
   
   This file contains:
   1. Course definitions (lessons, names, levels)
   2. Index page progress loader (for homepage pathway cards)
   
   NO OTHER FILES NEEDED for course data or index progress!
*/

(function(){
  'use strict';
  
  // ===========================================
  // COURSE DEFINITIONS - SINGLE SOURCE OF TRUTH
  // ===========================================
  
  window.VAULT_COURSES = {
    'gs1': {
      name: 'Groove Studies',
      level: 'Level 1 – Beginner',
      pathway: 'groove',
      lessons: ['1.01', '1.02', '1.03', '1.04', '1.05', '1.06', '1.07', '1.08', 
                '1.09', '1.10', '1.11', '1.12', '1.13', '1.14', '1.15', '1.16',
                '1.17', '1.18', '1.19', '1.20', '1.21', '1.22', '1.23']
    },
    'gs2': { name: 'Groove Studies', level: 'Level 2 – Intermediate 1', pathway: 'groove', lessons: [] },
    'gs3': { name: 'Groove Studies', level: 'Level 3 – Intermediate 2', pathway: 'groove', lessons: [] },
    'gs4': { name: 'Groove Studies', level: 'Level 4 – Advanced', pathway: 'groove', lessons: [] },
    'fs1': { 
       name: 'Fill Studies',
       level: 'Level 1 – Beginner',
       pathway: 'fills', 
       lessons: ['1.01', '1.02', '1.03', '1.04', '1.05', '1.06', '1.07', '1.08', 
                '1.09', '1.10', '1.11', '1.12', '1.13', '1.14', '1.15']
    },
    'fs2': { name: 'Fill Studies', level: 'Level 2 – Intermediate 1', pathway: 'fills', lessons: [] },
    'fs3': { name: 'Fill Studies', level: 'Level 3 – Intermediate 2', pathway: 'fills', lessons: [] },
    'fs4': { name: 'Fill Studies', level: 'Level 4 – Advanced', pathway: 'fills', lessons: [] },
    'ss1': { name: 'Stick Studies', level: 'Level 1 – Beginner', pathway: 'sticks', lessons: [] },
    'ss2': { name: 'Stick Studies', level: 'Level 2 – Intermediate 1', pathway: 'sticks', lessons: [] },
    'ss3': { name: 'Stick Studies', level: 'Level 3 – Intermediate 2', pathway: 'sticks', lessons: [] },
    'ss4': { name: 'Stick Studies', level: 'Level 4 – Advanced', pathway: 'sticks', lessons: [] },
    'ks1': { name: 'Kick Studies', level: 'Level 1 – Beginner', pathway: 'kicks', lessons: [] },
    'ks2': { name: 'Kick Studies', level: 'Level 2 – Intermediate', pathway: 'kicks', lessons: [] },
    'ks3': { name: 'Kick Studies', level: 'Level 3 – Advanced', pathway: 'kicks', lessons: [] }
  };
  
  // ===========================================
  // INDEX PAGE PROGRESS LOADER
  // Automatically loads progress for homepage
  // ===========================================
  
  function loadIndexProgress() {
    // Only run on index page (has pathway cards)
    if (!document.querySelector('.pathway')) return;
    
    // Wait for Firebase
    if (typeof firebase === 'undefined' || !firebase.auth) {
      setTimeout(loadIndexProgress, 100);
      return;
    }
    
    firebase.auth().onAuthStateChanged(function(user) {
      if (!user) return;
      
      var db = firebase.firestore();
      
      // Loop through all courses and load progress for any that have elements on page
      for (var courseId in window.VAULT_COURSES) {
        var progressEl = document.getElementById(courseId + '-progress');
        if (!progressEl) continue;
        
        var courseConfig = window.VAULT_COURSES[courseId];
        if (!courseConfig.lessons || courseConfig.lessons.length === 0) continue;
        
        // Use IIFE to capture variables in loop
        (function(cId, el, config) {
          db.collection('users').doc(user.uid).collection('progress').doc(cId)
            .get()
            .then(function(snap) {
              var total = config.lessons.length;
              var count = 0;
              
              if (snap.exists) {
                var completed = snap.data().completed || {};
                for (var key in completed) {
                  if (completed[key] === true) count++;
                }
              }
              
              el.textContent = total + ' lessons • ' + count + '/' + total + ' complete';
            })
            .catch(function(err) {
              console.error('Progress load error for ' + cId + ':', err);
            });
        })(courseId, progressEl, courseConfig);
      }
    });
  }
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadIndexProgress);
  } else {
    loadIndexProgress();
  }
  
})();

// Updated: 2024-12-27
