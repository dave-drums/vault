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
      lessons: ['GS1.01', 'GS1.02', 'GS1.03', 'GS1.04', 'GS1.05', 'GS1.06', 'GS1.07', 'GS1.08', 
                'GS1.09', 'GS1.10', 'GS1.11', 'GS1.12', 'GS1.13', 'GS1.14', 'GS1.15', 'GS1.16',
                'GS1.17', 'GS1.18', 'GS1.19', 'GS1.20', 'GS1.21', 'GS1.22', 'GS1.23']
    },
    'gs2': { name: 'Groove Studies', level: 'Level 2 – Intermediate 1', pathway: 'groove', lessons: [] },
    'gs3': { name: 'Groove Studies', level: 'Level 3 – Intermediate 2', pathway: 'groove', lessons: [] },
    'gs4': { name: 'Groove Studies', level: 'Level 4 – Advanced', pathway: 'groove', lessons: [] },
    'fs1': { 
       name: 'Fill Studies',
       level: 'Level 1 – Beginner',
       pathway: 'fills', 
       lessons: ['FS1.01', 'FS1.02', 'FS1.03', 'FS1.04', 'FS1.05', 'FS1.06', 'FS1.07', 'FS1.08', 
                'FS1.09', 'FS1.10', 'FS1.11', 'FS1.12', 'FS1.13', 'FS1.14', 'FS1.15']
    },
    'fs2': { name: 'Fill Studies', level: 'Level 2 – Intermediate 1', pathway: 'fills', lessons: [] },
    'fs3': { name: 'Fill Studies', level: 'Level 3 – Intermediate 2', pathway: 'fills', lessons: [] },
    'fs4': { name: 'Fill Studies', level: 'Level 4 – Advanced', pathway: 'fills', lessons: [] },
    'ss1': { name: 'Stick Studies', level: 'Hand Speed & Endurance', pathway: 'sticks', lessons: [] },
    'ss2': { name: 'Stick Studies', level: 'Rudiments & Patterns', pathway: 'sticks', lessons: [] },
    'ss3': { name: 'Stick Studies', level: 'Technique', pathway: 'sticks', lessons: [] },
    'ss4': { name: 'Stick Studies', level: 'Weak Hand Development', pathway: 'sticks', lessons: [] },
    'ks1': { name: 'Kick Studies', level: 'Single Pedal', pathway: 'kicks', lessons: [] },
    'ks2': { name: 'Kick Studies', level: 'Double Pedal', pathway: 'kicks', lessons: [] },
    'ks3': { name: 'Kick Studies', level: 'Technique & Pedal Settings', pathway: 'kicks', lessons: [] }
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
