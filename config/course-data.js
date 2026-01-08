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
  
  // ADD THIS FUNCTION HERE (line 12)
  function normalizeCompleted(completed) {
    if (!completed) return [];
    if (Array.isArray(completed)) return completed;
    if (typeof completed === 'object' && completed !== null) {
      return Object.keys(completed).filter(function(key) {
        return completed[key] === true;
      });
    }
    return [];
  }
  
  // Expose globally so other files can use it
  window.normalizeCompleted = normalizeCompleted;

   // Slug lookup helper
window.getCourseBySlug = function(pathway, slug) {
  for (var courseId in window.VAULT_COURSES) {
    var course = window.VAULT_COURSES[courseId];
    if (course.pathway === pathway && course.slug === slug) {
      return { courseId: courseId, config: course };
    }
  }
  return null;
};
   
   window.VAULT_COURSES = {
      'gs-eighth-note': { slug: 'eighth-note', pathway: 'gs', pathwayName: 'Groove Studies', topic: 'Eighth Note', levels: ['beg', 'int'], lessons: ['01', '02', '03', '04'] },
      'gs-quarter-note': { slug: 'quarter-note', pathway: 'gs', pathwayName: 'Groove Studies', topic: 'Quarter Note', levels: ['beg', 'int'], lessons: ['01', '02', '03', '04'] },
      'gs-sixteenth-note-1': { slug: 'sixteenth-note-1', pathway: 'gs', pathwayName: 'Groove Studies', topic: 'Sixteenth Note 1', levels: ['beg', 'int'], lessons: ['01', '02', '03', '04'] },
      'gs-sixteenth-note-2': { slug: 'sixteenth-note-2', pathway: 'gs', pathwayName: 'Groove Studies', topic: 'Sixteenth Note 2', levels: ['beg', 'int'], lessons: ['01', '02', '03', '04'] },

      'fs-eighth-note': { slug: 'eighth-note', pathway: 'fs', pathwayName: 'Fill Studies', topic: 'Eighth Note', levels: ['beg', 'int'], lessons: ['01', '02', '03', '04', '05', '06', '07'] },
      'fs-sixteenth-note': { slug: 'sixteenth-note', pathway: 'fs', pathwayName: 'Fill Studies', topic: 'Sixteenth Note', levels: ['beg', 'int'], lessons: ['01', '02', '03', '04', '05'] },
      'fs-fill-grooves': { slug: 'fill-grooves', pathway: 'fs', pathwayName: 'Fill Studies', topic: 'Fill Grooves', levels: ['beg', 'int'], lessons: ['01', '02', '03'] },

      'ss-rudiments': { slug: 'rudiments', pathway: 'ss', pathwayName: 'Stick Studies', topic: 'Rudiments', levels: ['beg', 'int', 'adv'], lessons: [] },

      'ks-double-pedal': { slug: 'double-pedal', pathway: 'ks', pathwayName: 'Kick Studies', topic: 'Double Pedal', levels: ['beg', 'int', 'adv'], lessons: ['01', '02', '03', '04', '05', '06', '07', '08'] },

      'rs-quarter-eighth-note': { slug: 'quarter-eighth-note', pathway: 'rs', pathwayName: 'Rhythm Studies', topic: 'Quarter & Eighth Note', levels: ['beg'], lessons: ['01', '02', '03', '04'] },
      'rs-sixteenth-note': { slug: 'sixteenth-note', pathway: 'rs', pathwayName: 'Rhythm Studies', topic: 'Sixteenth Note', levels: ['beg'], lessons: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15'] },
      
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
              
var completed = snap.exists ? snap.data().completed : null;
var completedArray = normalizeCompleted(completed);
config.lessons.forEach(function(lessonId) {
  if (completedArray.indexOf(lessonId) !== -1) count++;
});
              
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
