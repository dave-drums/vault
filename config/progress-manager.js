/* progress-manager.js
   Purpose: Unified progress management for all courses
   Usage: Load on pages that need to read/write lesson progress
   
   Features:
   - getProgress(courseId, uid) - returns progress for a course
   - updateProgress(courseId, lessonId, uid) - marks lesson complete
   - getAllProgress(uid) - returns all course progress for a user
   - Caching to reduce Firestore reads
*/

(function() {
  'use strict';
  
  // Check for Firebase
  if (typeof firebase === 'undefined' || !firebase.firestore) {
    console.warn('[Progress Manager] Firebase not available');
    return;
  }
  
  var db = firebase.firestore();
  var cache = {}; // Simple in-memory cache: { uid: { courseId: { completed: [...], lastUpdated: timestamp } } }
  var CACHE_TTL = 30000; // 30 seconds
  
  // Normalize progress data (handles both array and object format)
  function normalizeCompleted(completed) {
    if (!completed) return [];
    
    if (Array.isArray(completed)) {
      return completed;
    }
    
    // Convert object format { "1.01": true, "1.02": true } to array ["1.01", "1.02"]
    if (typeof completed === 'object' && completed !== null) {
      return Object.keys(completed).filter(function(key) {
        return completed[key] === true;
      });
    }
    
    return [];
  }
  
  // Get cache key
  function getCacheKey(uid, courseId) {
    return uid + '::' + courseId;
  }
  
  // Check if cache is valid
  function isCacheValid(cacheEntry) {
    if (!cacheEntry) return false;
    if (!cacheEntry.timestamp) return false;
    return (Date.now() - cacheEntry.timestamp) < CACHE_TTL;
  }
  
  // Get progress for a specific course
  function getProgress(courseId, uid) {
    if (!courseId || !uid) {
      return Promise.reject(new Error('courseId and uid required'));
    }
    
    var cacheKey = getCacheKey(uid, courseId);
    var cached = cache[cacheKey];
    
    // Return cached data if valid
    if (isCacheValid(cached)) {
      return Promise.resolve({
        courseId: courseId,
        completed: cached.completed || [],
        total: cached.total || 0,
        lastLesson: cached.lastLesson || null,
        lastUpdated: cached.lastUpdated || null
      });
    }
    
    // Fetch from Firestore
    return db.collection('users').doc(uid).collection('progress').doc(courseId)
      .get()
      .then(function(doc) {
        var data = doc.exists ? doc.data() : {};
        var completed = normalizeCompleted(data.completed);
        
        // Get total lessons from course config
        var total = 0;
        if (window.VAULT_COURSES && window.VAULT_COURSES[courseId]) {
          total = window.VAULT_COURSES[courseId].lessons.length;
        }
        
        // Cache the result
        cache[cacheKey] = {
          completed: completed,
          total: total,
          lastLesson: data.lastLesson || null,
          lastUpdated: data.lastUpdated || null,
          timestamp: Date.now()
        };
        
        return {
          courseId: courseId,
          completed: completed,
          total: total,
          lastLesson: data.lastLesson || null,
          lastUpdated: data.lastUpdated || null
        };
      })
      .catch(function(err) {
        console.error('[Progress Manager] Error loading progress for ' + courseId + ':', err);
        throw err;
      });
  }
  
  // Update progress (mark lesson complete)
  function updateProgress(courseId, lessonId, uid) {
    if (!courseId || !lessonId || !uid) {
      return Promise.reject(new Error('courseId, lessonId, and uid required'));
    }
    
    // First get current progress
    return getProgress(courseId, uid)
      .then(function(current) {
        var completed = current.completed || [];
        
        // Check if already completed
        if (completed.indexOf(lessonId) !== -1) {
          console.log('[Progress Manager] Lesson ' + lessonId + ' already complete');
          return current;
        }
        
        // Add to completed array
        var newCompleted = completed.concat([lessonId]);
        
        // Update Firestore
        return db.collection('users').doc(uid).collection('progress').doc(courseId)
          .set({
            completed: newCompleted,
            lastLesson: lessonId,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true })
          .then(function() {
            // Invalidate cache
            var cacheKey = getCacheKey(uid, courseId);
            delete cache[cacheKey];
            
            console.log('[Progress Manager] Lesson ' + lessonId + ' marked complete');
            
            return {
              courseId: courseId,
              completed: newCompleted,
              total: current.total,
              lastLesson: lessonId,
              lastUpdated: new Date()
            };
          });
      })
      .catch(function(err) {
        console.error('[Progress Manager] Error updating progress:', err);
        throw err;
      });
  }
  
  // Get all progress for a user (used by members dashboard and admin)
  function getAllProgress(uid) {
    if (!uid) {
      return Promise.reject(new Error('uid required'));
    }
    
    return db.collection('users').doc(uid).collection('progress')
      .get()
      .then(function(snapshot) {
        var allProgress = {};
        
        snapshot.forEach(function(doc) {
          var courseId = doc.id;
          var data = doc.data();
          var completed = normalizeCompleted(data.completed);
          
          // Get total lessons from course config
          var total = 0;
          if (window.VAULT_COURSES && window.VAULT_COURSES[courseId]) {
            total = window.VAULT_COURSES[courseId].lessons.length;
          }
          
          allProgress[courseId] = {
            courseId: courseId,
            completed: completed,
            total: total,
            lastLesson: data.lastLesson || null,
            lastUpdated: data.lastUpdated || null
          };
          
          // Cache each course
          var cacheKey = getCacheKey(uid, courseId);
          cache[cacheKey] = {
            completed: completed,
            total: total,
            lastLesson: data.lastLesson || null,
            lastUpdated: data.lastUpdated || null,
            timestamp: Date.now()
          };
        });
        
        return allProgress;
      })
      .catch(function(err) {
        console.error('[Progress Manager] Error loading all progress:', err);
        throw err;
      });
  }
  
  // Clear cache (useful for forcing refresh)
  function clearCache(uid, courseId) {
    if (courseId) {
      var cacheKey = getCacheKey(uid, courseId);
      delete cache[cacheKey];
    } else if (uid) {
      // Clear all cache for this user
      Object.keys(cache).forEach(function(key) {
        if (key.startsWith(uid + '::')) {
          delete cache[key];
        }
      });
    } else {
      // Clear all cache
      cache = {};
    }
  }
  
  // Expose API
  window.VaultProgress = {
    getProgress: getProgress,
    updateProgress: updateProgress,
    getAllProgress: getAllProgress,
    clearCache: clearCache
  };
  
})();
