(function() {
  'use strict';
  
  const urlParams = new URLSearchParams(window.location.search);
  const lessonId = urlParams.get('l');
  
  // Extract courseId from URL path: /gs/?c=1 → gs1
  const path = window.location.pathname;
  const pathParts = path.split('/').filter(p => p); // Remove empty strings
  
  // Find pathway from URL structure (e.g., /gs/ or /vault/test/gs/)
  let pathway = null;
  for (let i = pathParts.length - 1; i >= 0; i--) {
    const part = pathParts[i];
    // Check if this part is a known pathway (gs, fs, ss, ks)
    if (part === 'gs' || part === 'fs' || part === 'ss' || part === 'ks') {
      pathway = part;
      break;
    }
  }
  
  const courseNum = urlParams.get('c');
  const courseId = (pathway && courseNum) ? pathway + courseNum : null;
  
  if (!courseId) {
    document.getElementById('course-index').innerHTML = 
      '<div style="text-align:center;padding:40px;color:#c00;">Invalid course URL</div>';
    return;
  }
  
  // Check if course exists in config
  const courseConfig = window.VAULT_COURSES && window.VAULT_COURSES[courseId];
  if (!courseConfig) {
    document.getElementById('course-index').innerHTML = 
      '<div style="text-align:center;padding:40px;color:#c00;">Course "' + courseId + '" not found</div>';
    return;
  }
  
  if (lessonId) {
    // Show individual lesson
    document.getElementById('course-index').style.display = 'none';
    document.getElementById('lesson-content').style.display = 'block';
    
    // Wait for Firebase to be fully initialized
    waitForFirebase(function() {
      loadLesson(courseId, lessonId);
    });
  } else {
    // Show course index
    waitForFirebase(function() {
      loadCourseIndex(courseId, courseConfig);
    });
  }
  
  function waitForFirebase(callback) {
    var attempts = 0;
    var maxAttempts = 300; // 30 seconds
    
    var checkFirebase = setInterval(function() {
      attempts++;
      
      if (typeof firebase !== 'undefined' && 
          firebase.auth && 
          firebase.firestore && 
          firebase.storage) {
        clearInterval(checkFirebase);
        callback();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkFirebase);
        console.error('Firebase failed to load');
        document.getElementById('course-index').innerHTML = 
          '<div style="text-align:center;padding:40px;color:#c00;">Failed to load Firebase. Please refresh the page.</div>';
      }
    }, 100);
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  function loadCourseIndex(courseId, courseConfig) {
    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage();
    const container = document.getElementById('course-index');
    
    // Populate hero header with course name and level
    const heroNameEl = document.getElementById('hero-course-name');
    const heroLevelEl = document.getElementById('hero-course-level');
    if (heroNameEl && courseConfig.name) {
      heroNameEl.textContent = courseConfig.name;
    }
    if (heroLevelEl && courseConfig.level) {
      heroLevelEl.textContent = courseConfig.level;
    }
    
    // Parse lessons from course master file
    const storageRef = storage.ref();
    const masterPath = 'courses/' + courseId + '.txt';
    
    storageRef.child(masterPath).getDownloadURL().then(function(url) {
      return fetch(url);
    }).then(function(response) {
      return response.text();
    }).then(function(masterText) {
      const structure = parseChaptersFromMaster(masterText, courseConfig.lessons);
      renderCourseIndex(container, courseId, courseConfig, structure, auth, db);
    }).catch(function(err) {
      console.error('Error loading master file:', err);
      container.innerHTML = '<div style="text-align:center;padding:40px;color:#c00;">Error loading course content</div>';
    });
  }
  
  function parseChaptersFromMaster(masterText, lessonIds) {
    const lines = masterText.split('\n');
    const chapters = [];
    let currentChapter = null;
    const lessonTitles = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Chapter header: === CHAPTER | Title ===
      if (line.startsWith('===') && line.toUpperCase().includes('CHAPTER') && line.includes('|')) {
        const match = line.match(/===\s*CHAPTER\s*\|\s*(.+?)\s*===/i);
        if (match) {
          const chapterTitle = match[1].trim();
          currentChapter = {
            title: chapterTitle,
            lessons: []
          };
          chapters.push(currentChapter);
        }
        continue;
      }
      
      // Lesson header: === LESSON | G1.01 Start Here ===
      if (line.startsWith('===') && line.toUpperCase().includes('LESSON') && line.includes('|')) {
        const match = line.match(/===\s*LESSON\s*\|\s*(.+?)\s*===/i);
        if (match) {
          const fullTitle = match[1].trim();
          
          // Extract lesson ID (matches pattern like G1.01, F1.02, 1.01, etc)
          const idMatch = fullTitle.match(/^[A-Z]?(\d+\.\d+)/i);
          
          if (idMatch) {
            const lessonId = idMatch[1]; // Just the numeric part (1.01)
            const lessonTitle = fullTitle; // Keep the full title including ID
            
            lessonTitles[lessonId] = lessonTitle;
            
            if (currentChapter) {
              currentChapter.lessons.push(lessonId);
            }
          }
        }
      }
    }
    
    return { chapters: chapters, lessonTitles: lessonTitles };
  }
  
  function renderCourseIndex(container, courseId, courseConfig, structure, auth, db) {
    let html = '';
    
    // Progress section
    html += '<div class="course-progress-section">';
    html += '<div class="course-progress-header">';
    html += '<p class="sqsrte-medium course-progress-text">0/' + courseConfig.lessons.length + ' (0%)</p>';
    html += '<p class="sqsrte-small course-progress-label">Progress</p>';
    html += '</div>';
    html += '<div class="course-progress-bar-bg">';
    html += '<div class="course-progress-bar-fill course-progress-bar" style="width: 0%;"></div>';
    html += '</div>';
    html += '</div>';
    
    // Chapters
    structure.chapters.forEach(chapter => {
      html += '<div class="course-chapter">';
      html += '<div class="course-chapter-header">';
      html += '<p class="course-chapter-title sqsrte-large">' + escapeHtml(chapter.title) + '</p>';
      html += '<span class="course-chapter-count">' + chapter.lessons.length + ' Lesson' + (chapter.lessons.length !== 1 ? 's' : '') + '</span>';
      html += '</div>';
      html += '<div class="course-lessons-grid">';
      
      chapter.lessons.forEach(lessonId => {
        const lessonTitle = structure.lessonTitles[lessonId] || ('Lesson ' + lessonId);
        
        html += '<div class="course-lesson-item" data-lesson="' + escapeHtml(lessonId) + '">';
        html += '<div class="course-lesson-link sqsrte-small">' + escapeHtml(lessonTitle) + '</div>';
        html += '<div class="course-lesson-status incomplete"></div>';
        html += '</div>';
      });
      
      html += '</div>';
      html += '</div>';
    });
    
    container.innerHTML = html;
    
    // Add click handlers
    const lessonItems = container.querySelectorAll('.course-lesson-item');
    lessonItems.forEach(function(item) {
      item.addEventListener('click', function() {
        const lessonId = item.getAttribute('data-lesson');
        window.location.href = '?c=' + courseId.charAt(courseId.length - 1) + '&l=' + lessonId;
      });
    });
    
    // Load progress data and update UI
    auth.onAuthStateChanged(function(user) {
      if (!user) {
        console.log('No user signed in');
        return;
      }
      
      const uid = user.uid;
      
      db.collection('users').doc(uid).collection('progress').doc(courseId).get()
        .then(function(doc) {
          if (!doc.exists) {
            console.log('No progress data found');
            return;
          }
          
          const data = doc.data();
          let completed = data.completed || [];
          
          // Handle both array and object formats
          if (!Array.isArray(completed)) {
            if (typeof completed === 'object' && completed !== null) {
              completed = Object.keys(completed).filter(function(key) {
                return completed[key] === true;
              });
            } else {
              completed = [];
            }
          }
          
          const totalLessons = courseConfig.lessons.length;
          const completedCount = completed.length;
          const percent = Math.round((completedCount / totalLessons) * 100);
          
          // Update progress bar
          const progressText = document.querySelector('.course-progress-text');
          const progressBar = document.querySelector('.course-progress-bar');
          
          if (progressText) {
            progressText.textContent = completedCount + '/' + totalLessons + ' (' + percent + '%)';
          }
          if (progressBar) {
            progressBar.style.width = percent + '%';
          }
          
          // Mark completed lessons
          completed.forEach(function(lessonId) {
            const lessonItem = container.querySelector('[data-lesson="' + lessonId + '"]');
            if (lessonItem) {
              const status = lessonItem.querySelector('.course-lesson-status');
              if (status) {
                status.classList.remove('incomplete');
                status.classList.add('completed');
              }
            }
          });
        })
        .catch(function(err) {
          console.error('Error loading progress:', err);
        });
    });
  }
  
  function loadLesson(courseId, lessonId) {
    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage();
    const container = document.getElementById('lesson-content');
    
    // Show back button
    const backBtn = document.getElementById('back-to-course');
    if (backBtn) {
      backBtn.style.display = 'block';
      backBtn.onclick = function() {
        window.location.href = window.location.pathname + '?c=' + courseId.charAt(courseId.length - 1);
      };
    }
    
    // Load lesson from master file
    const storageRef = storage.ref();
    const masterPath = 'courses/' + courseId + '.txt';
    
    storageRef.child(masterPath).getDownloadURL().then(function(url) {
      return fetch(url);
    }).then(function(response) {
      return response.text();
    }).then(function(masterText) {
      const lessonContent = extractLessonFromMaster(masterText, lessonId);
      
      if (!lessonContent) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#c00;">Lesson not found</div>';
        return;
      }
      
      // Render using vault-render.js
      if (typeof window.vaultRender === 'function') {
        window.vaultRender(lessonContent, container);
      } else {
        container.innerHTML = '<pre>' + lessonContent + '</pre>';
      }
      
      // Add complete button handler
      addCompleteButtonHandler(courseId, lessonId, auth, db);
      
    }).catch(function(err) {
      console.error('Error loading lesson:', err);
      container.innerHTML = '<div style="text-align:center;padding:40px;color:#c00;">Error loading lesson</div>';
    });
  }
  
  function extractLessonFromMaster(masterText, lessonId) {
    const lines = masterText.split('\n');
    let inLesson = false;
    let lessonContent = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Check for === LESSON | with our lesson ID
      // Matches: === LESSON | G1.01 ... === or === LESSON | 1.01 ... ===
      if (trimmed.startsWith('===') && trimmed.toUpperCase().includes('LESSON') && trimmed.includes('|')) {
        const match = trimmed.match(/===\s*LESSON\s*\|\s*(.+?)\s*===/i);
        if (match) {
          const titlePart = match[1];
          // Check if this title contains our lesson ID
          const pattern = new RegExp('[A-Z]?' + lessonId.replace('.', '\\.'), 'i');
          
          if (pattern.test(titlePart)) {
            inLesson = true;
            continue;
          }
          
          // If we were in our lesson and hit another, stop
          if (inLesson) {
            break;
          }
        }
      }
      
      // If we hit a CHAPTER marker while in lesson, stop
      if (inLesson && trimmed.startsWith('===') && trimmed.toUpperCase().includes('CHAPTER')) {
        break;
      }
      
      if (inLesson) {
        lessonContent.push(line);
      }
    }
    
    return lessonContent.join('\n').trim();
  }
  
  function addCompleteButtonHandler(courseId, lessonId, auth, db) {
    const completeBtn = document.getElementById('complete-lesson');
    if (!completeBtn) return;
    
    auth.onAuthStateChanged(function(user) {
      if (!user) {
        completeBtn.style.display = 'none';
        return;
      }
      
      const uid = user.uid;
      completeBtn.style.display = 'inline-block';
      
      // Check if already completed
      db.collection('users').doc(uid).collection('progress').doc(courseId).get()
        .then(function(doc) {
          if (doc.exists) {
            const completed = doc.data().completed || [];
            if (completed.includes(lessonId)) {
              completeBtn.textContent = 'Completed ✓';
              completeBtn.classList.add('completed');
            }
          }
        });
      
      completeBtn.addEventListener('click', function() {
        if (completeBtn.classList.contains('completed')) {
          return;
        }
        
        const progressDoc = db.collection('users').doc(uid).collection('progress').doc(courseId);
        
        progressDoc.get().then(function(doc) {
          const currentCompleted = doc.exists ? (doc.data().completed || []) : [];
          
          if (!currentCompleted.includes(lessonId)) {
            currentCompleted.push(lessonId);
          }
          
          // Update both progress completion AND last lesson tracking
          return progressDoc.set({
            completed: currentCompleted,
            lastLesson: lessonId,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }).then(function() {
          completeBtn.textContent = 'Completed ✓';
          completeBtn.classList.add('completed');
        }).catch(function(err) {
          console.error('Error marking complete:', err);
          alert('Error saving progress');
        });
      });
    });
  }
  
})();
