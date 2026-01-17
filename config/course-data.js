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
      'gs-eighth-note': { slug: 'eighth-note', pathway: 'gs', pathwayName: 'Groove Studies', topic: 'Eighth Note', levels: ['beg', 'int'], lessons: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] },
      'gs-quarter-note': { slug: 'quarter-note', pathway: 'gs', pathwayName: 'Groove Studies', topic: 'Quarter Note', levels: ['beg', 'int'], lessons: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] },
      'gs-sixteenth-note-1': { slug: 'sixteenth-note-1', pathway: 'gs', pathwayName: 'Groove Studies', topic: 'Sixteenth Note 1', levels: ['beg', 'int'], lessons: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] },
      'gs-sixteenth-note-2': { slug: 'sixteenth-note-2', pathway: 'gs', pathwayName: 'Groove Studies', topic: 'Sixteenth Note 2', levels: ['beg', 'int'], lessons: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] },
      'gs-hihat-control': { slug: 'hihat-control', pathway: 'gs', pathwayName: 'Groove Studies', topic: 'Hi-Hat Control', levels: ['beg', 'int'], lessons: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18'] },
      
      'gs-half-double-time': { slug: 'half-double-time', pathway: 'gs', pathwayName: 'Groove Studies', topic: 'Half & Double Time', levels: ['int'], lessons: [] },
      'gs-triplet-grooves': { slug: 'triplet-grooves', pathway: 'gs', pathwayName: 'Groove Studies', topic: 'Triplet Grooves', levels: ['int'], lessons: [] },
      'gs-linear-grooves': { slug: 'linear-grooves', pathway: 'gs', pathwayName: 'Groove Studies', topic: 'Linear Grooves', levels: ['int', 'adv'], lessons: [] },
      'gs-hihat-ride-vars': { slug: 'hihat-ride-vars', pathway: 'gs', pathwayName: 'Groove Studies', topic: 'Hi-Hat & Ride Variations', levels: ['int'], lessons: [] },
      'gs-shuffle': { slug: 'shuffle', pathway: 'gs', pathwayName: 'Groove Studies', topic: 'The Shuffle', levels: ['adv'], lessons: [] },
      'gs-triple-meter': { slug: 'triple-meter', pathway: 'gs', pathwayName: 'Groove Studies', topic: 'Triple Meter', levels: ['int'], lessons: [] },
      'gs-ghost-notes': { slug: 'ghost-notes', pathway: 'gs', pathwayName: 'Groove Studies', topic: 'Ghost Notes', levels: ['int', 'adv'], lessons: [] },
      'gs-jazz': { slug: 'jazz', pathway: 'gs', pathwayName: 'Groove Studies', topic: 'Jazz', levels: ['int', 'adv'], lessons: [] },
      'gs-world-grooves': { slug: 'world-grooves', pathway: 'gs', pathwayName: 'Groove Studies', topic: 'World Grooves', levels: ['int', 'adv'], lessons: [] },
      'gs-odd-time': { slug: 'odd-time', pathway: 'gs', pathwayName: 'Groove Studies', topic: 'Odd Time', levels: ['int', 'adv'], lessons: [] },

      'fs-eighth-note': { slug: 'eighth-note', pathway: 'fs', pathwayName: 'Fill Studies', topic: 'Eighth Note', levels: ['beg'], lessons: ['01', '02', '03', '04', '05', '06', '07'] },
      'fs-sixteenth-note': { slug: 'sixteenth-note', pathway: 'fs', pathwayName: 'Fill Studies', topic: 'Sixteenth Note', levels: ['beg', 'int'], lessons: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18'] },
      'fs-fill-grooves': { slug: 'fill-grooves', pathway: 'fs', pathwayName: 'Fill Studies', topic: 'Fill Grooves', levels: ['beg', 'int'], lessons: ['01', '02', '03'] },
      'fs-eighth-note-triplet': { slug: 'eighth-note-triplet', pathway: 'fs', pathwayName: 'Fill Studies', topic: 'Eighth Note Triplet', levels: ['int'], lessons: ['01', '02', '03', '04', '05'] },
      
      'fs-linear-fills': { slug: 'linear-fills', pathway: 'fs', pathwayName: 'Fill Studies', topic: 'Linear Fills', levels: ['int', 'adv'], lessons: [] },
      'fs-triplet-fills': { slug: 'triplet-fills', pathway: 'fs', pathwayName: 'Fill Studies', topic: 'Triplet Fills', levels: ['beg', 'int'], lessons: [] },
      'fs-open-hat-fills': { slug: 'open-hat-fills', pathway: 'fs', pathwayName: 'Fill Studies', topic: 'Open Hi-Hat Fills', levels: ['int', 'adv'], lessons: [] },
      'fs-triple-meter': { slug: 'triple-meter', pathway: 'fs', pathwayName: 'Fill Studies', topic: 'Triple Meter', levels: ['int'], lessons: [] },

      'ss-singles': { slug: 'singles', pathway: 'ss', pathwayName: 'Stick Studies', topic: 'Single Stroke Roll', levels: ['beg', 'int', 'adv'], lessons: ['70', '80', '90', '100', '110', '120', '130', '140', '150', '160', '170', '180', '190'] },
      'ss-doubles': { slug: 'doubles', pathway: 'ss', pathwayName: 'Stick Studies', topic: 'Double Stroke Roll', levels: ['beg', 'int', 'adv'], lessons: ['70', '80', '90', '100', '110', '120', '130', '140', '150', '160', '170', '180', '190'] },
      'ss-paradiddle': { slug: 'paradiddle', pathway: 'ss', pathwayName: 'Stick Studies', topic: 'Paradiddles', levels: ['beg', 'int', 'adv'], lessons: [] },
      'ss-flams': { slug: 'flams', pathway: 'ss', pathwayName: 'Stick Studies', topic: 'Flams', levels: ['beg', 'int', 'adv'], lessons: [] },
      'ss-left-hand': { slug: 'left-hand', pathway: 'ss', pathwayName: 'Stick Studies', topic: 'Left Hand Control', levels: ['beg', 'int', 'adv'], lessons: [] },
      'ss-patterns': { slug: 'patterns', pathway: 'ss', pathwayName: 'Stick Studies', topic: 'Other Patterns', levels: ['beg', 'int', 'adv'], lessons: [] },
      'ss-technique': { slug: 'technique', pathway: 'ss', pathwayName: 'Stick Studies', topic: 'Technique', levels: ['beg', 'int'], lessons: [] },

      'ks-single-pedal': { slug: 'single-pedal', pathway: 'ks', pathwayName: 'Kick Studies', topic: 'Single Pedal', levels: ['beg', 'int', 'adv'], lessons: ['01', '02', '03', '04', '05', '06', '07', '08', '09'] },
      'ks-double-pedal': { slug: 'double-pedal', pathway: 'ks', pathwayName: 'Kick Studies', topic: 'Double Pedal', levels: ['beg', 'int', 'adv'], lessons: ['01', '02', '03', '04', '05', '06', '07', '08'] },
      'ks-technique': { slug: 'technique', pathway: 'ks', pathwayName: 'Kick Studies', topic: 'Technique & Setup', levels: ['beg', 'int'], lessons: [] },

      'rs-quarter-eighth-note': { slug: 'quarter-eighth-note', pathway: 'rs', pathwayName: 'Rhythm Studies', topic: 'Quarter & Eighth Note', levels: ['beg'], lessons: ['01', '02', '03', '04'] },
      'rs-sixteenth-note': { slug: 'sixteenth-note', pathway: 'rs', pathwayName: 'Rhythm Studies', topic: 'Sixteenth Note', levels: ['beg'], lessons: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15'] },
      
      'rs-triple meter': { slug: 'triple-meter', pathway: 'rs', pathwayName: 'Rhythm Studies', topic: 'Triple Meters', levels: ['beg', 'int'], lessons: [] },
      'rs-odd-time': { slug: 'odd-time', pathway: 'rs', pathwayName: 'Rhythm Studies', topic: 'Odd Time', levels: ['int', 'adv'], lessons: [] },
      
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
