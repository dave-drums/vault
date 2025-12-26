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
    
    // Back to Practice Vault button
    html += '<div class="course-back-nav">';
    html += '<button class="course-back-btn" onclick="window.location.href=\'/index.html\'">← Back to Practice Vault</button>';
    html += '</div>';
    
    // Progress section
    html += '<div class="course-progress-section">';
    html += '<div class="course-progress-header">';
    html += '<p class="course-progress-label">Progress</p>';
    html += '<p class="course-progress-text">0/' + courseConfig.lessons.length + ' (0%)</p>';
    html += '</div>';
    html += '<div class="course-progress-bar-bg">';
    html += '<div class="course-progress-bar-fill course-progress-bar" style="width: 0%;"></div>';
    html += '</div>';
    html += '</div>';
    
    html += '<div style="height: 32px;"></div>'; // Gap before chapters
    
    // Chapters
    structure.chapters.forEach(chapter => {
      html += '<div class="course-chapter">';
      html += '<div class="course-chapter-header">';
      html += '<p class="course-chapter-title">' + escapeHtml(chapter.title) + '</p>';
      html += '<span class="course-chapter-count">' + chapter.lessons.length + ' Lesson' + (chapter.lessons.length !== 1 ? 's' : '') + '</span>';
      html += '</div>';
      html += '<div class="course-lessons-grid">';
      
      chapter.lessons.forEach(lessonId => {
        const lessonTitle = structure.lessonTitles[lessonId] || ('Lesson ' + lessonId);
        
        html += '<div class="course-lesson-item" data-lesson="' + escapeHtml(lessonId) + '">';
        html += '<div class="course-lesson-link">' + escapeHtml(lessonTitle) + '</div>';
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
    
    // Get course config for hero
    const courseConfig = window.VAULT_COURSES && window.VAULT_COURSES[courseId];
    
    // Update hero title (GROOVE STUDIES)
    const heroTitle = document.getElementById('hero-course-name');
    if (heroTitle && courseConfig) {
      heroTitle.textContent = courseConfig.name.toUpperCase();
    }
    
    // Update hero badge to show lesson info (will be updated with actual title after loading)
    const heroBadge = document.getElementById('hero-course-level');
    if (heroBadge) {
      heroBadge.textContent = 'Loading lesson...';
    }
    
    // Show loading state
    container.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-secondary)"><div style="width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;margin:0 auto 16px;animation:spin 1s linear infinite"></div><div style="font-weight:500">Loading lesson...</div></div>';
    
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
    
    console.log('Loading lesson file:', masterPath);
    
    storageRef.child(masterPath).getDownloadURL().then(function(url) {
      return fetch(url);
    }).then(function(response) {
      return response.text();
    }).then(function(masterText) {
      const lessonContent = extractLessonFromMaster(masterText, lessonId);
      
      // Get lesson title from master file
      const lessonTitle = getLessonTitle(masterText, lessonId);
      
      // Update hero badge with lesson info
      const heroBadge = document.getElementById('hero-course-level');
      if (heroBadge && lessonTitle) {
        // Replace first space after lesson ID with dash (G1.01 Start Here -> G1.01 – Start Here)
        const formattedTitle = lessonTitle.replace(/^([A-Z]?\d+\.\d+)\s+/, '$1 – ');
        heroBadge.textContent = 'Lesson ' + formattedTitle;
      }
      
      if (!lessonContent) {
        console.error('No lesson content extracted!');
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#c00;">Lesson not found</div>';
        return;
      }
      
      console.log('About to render lesson...');
      console.log('vaultParse exists?', typeof window.vaultParse === 'object');
      
      // Render using vault-render.js
      if (window.vaultParse && typeof window.vaultParse.tokenise === 'function' && typeof window.vaultParse.render === 'function') {
        console.log('Calling vaultParse...');
        const tokens = window.vaultParse.tokenise(lessonContent);
        console.log('Tokens created:', tokens.length);
        const renderedContent = window.vaultParse.render(tokens);
        console.log('Content rendered');
        container.innerHTML = '';
        
        // Add top navigation buttons
        const topNavHtml = `
          <div class="lesson-nav-top">
            <button class="lesson-nav-back" onclick="window.location.href='${window.location.pathname}?c=${courseId.charAt(courseId.length - 1)}'">
              ← Back to Course
            </button>
            <button class="lesson-nav-complete" id="complete-lesson-top">
              Complete Lesson →
            </button>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', topNavHtml);
        
        container.appendChild(renderedContent);
        console.log('Content appended to container');
        
        // Add bottom navigation buttons
        const bottomNavHtml = `
          <div class="lesson-nav-bottom">
            <button class="lesson-nav-back" onclick="window.location.href='${window.location.pathname}?c=${courseId.charAt(courseId.length - 1)}'">
              ← Back to Course
            </button>
            <button class="lesson-nav-complete" id="complete-lesson-bottom">
              Complete Lesson →
            </button>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', bottomNavHtml);
        
        // Add comments section
        const commentsHtml = `
          <div id="vault-comments" class="vault-comments">
            <h3>Lesson Comments</h3>
            <div id="vault-comments-meta" class="vault-comments-meta">Loading comments...</div>
            <ul id="vault-comments-list" class="vault-comments-list"></ul>
            <form id="vault-comment-form" class="vault-comment-form">
              <textarea id="vault-comment-text" class="vault-comment-textarea" placeholder="Add a comment..." rows="3"></textarea>
              <div class="vault-comment-actions">
                <button type="submit" id="vault-comment-post" class="vault-comment-post-btn">Post Comment</button>
                <span id="vault-comment-status" class="vault-comment-status"></span>
              </div>
            </form>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', commentsHtml);
        
        // Initialize comments system
        if (typeof window.initVaultComments === 'function') {
          window.initVaultComments();
        }
      } else {
        console.warn('vaultParse not found, using fallback');
        container.innerHTML = '<div style="max-width:800px;margin:0 auto;padding:20px"><pre style="white-space:pre-wrap;font-family:monospace;padding:20px;background:#f5f5f5;border-radius:8px">' + lessonContent.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre></div>';
      }
      
      // Add complete lesson handler
      addCompleteLessonHandler(courseId, lessonId, courseConfig, auth, db);
      
    }).catch(function(err) {
      console.error('Error loading lesson:', err);
      container.innerHTML = '<div style="text-align:center;padding:40px;color:#c00;">Error loading lesson</div>';
    });
  }
  
  function getLessonTitle(masterText, lessonId) {
    const lines = masterText.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for === LESSON | with our lesson ID
      if (line.startsWith('===') && line.toUpperCase().includes('LESSON') && line.includes('|')) {
        const match = line.match(/===\s*LESSON\s*\|\s*(.+?)\s*===/i);
        if (match) {
          const titlePart = match[1];
          const pattern = new RegExp('[A-Z]?' + lessonId.replace('.', '\\.'), 'i');
          
          if (pattern.test(titlePart)) {
            return titlePart; // Returns e.g., "G1.01 Start Here"
          }
        }
      }
    }
    
    return lessonId; // Fallback to just the ID
  }
  
  function extractLessonFromMaster(masterText, lessonId) {
    console.log('=== EXTRACTING LESSON ===');
    console.log('Looking for lesson ID:', lessonId);
    console.log('Master text length:', masterText.length);
    
    const lines = masterText.split('\n');
    let inLesson = false;
    let lessonContent = [];
    let foundLessons = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Check for === LESSON | with our lesson ID
      if (trimmed.startsWith('===') && trimmed.toUpperCase().includes('LESSON') && trimmed.includes('|')) {
        const match = trimmed.match(/===\s*LESSON\s*\|\s*(.+?)\s*===/i);
        if (match) {
          const titlePart = match[1];
          foundLessons.push(titlePart);
          
          // Check if this title contains our lesson ID
          const pattern = new RegExp('[A-Z]?' + lessonId.replace('.', '\\.'), 'i');
          
          console.log('Found lesson marker:', titlePart);
          console.log('Testing pattern:', pattern);
          console.log('Match result:', pattern.test(titlePart));
          
          if (pattern.test(titlePart)) {
            console.log('✓ MATCH! Starting extraction at line', i);
            inLesson = true;
            continue;
          }
          
          // If we were in our lesson and hit another, stop
          if (inLesson) {
            console.log('Hit next lesson, stopping extraction at line', i);
            break;
          }
        }
      }
      
      // If we hit a CHAPTER marker while in lesson, stop
      if (inLesson && trimmed.startsWith('===') && trimmed.toUpperCase().includes('CHAPTER')) {
        console.log('Hit chapter marker, stopping extraction at line', i);
        break;
      }
      
      if (inLesson) {
        lessonContent.push(line);
      }
    }
    
    console.log('All lessons found:', foundLessons);
    console.log('Extracted lines:', lessonContent.length);
    const result = lessonContent.join('\n').trim();
    console.log('Result length:', result.length);
    console.log('First 300 chars:', result.substring(0, 300));
    
    return result;
  }
  
  function addCompleteLessonHandler(courseId, lessonId, courseConfig, auth, db) {
    const topBtn = document.getElementById('complete-lesson-top');
    const bottomBtn = document.getElementById('complete-lesson-bottom');
    
    if (!topBtn || !bottomBtn) return;
    
    auth.onAuthStateChanged(function(user) {
      if (!user) {
        topBtn.style.display = 'none';
        bottomBtn.style.display = 'none';
        return;
      }
      
      const uid = user.uid;
      
      // Get user's showProgress setting and current progress
      Promise.all([
        db.collection('users').doc(uid).get(),
        db.collection('users').doc(uid).collection('progress').doc(courseId).get()
      ]).then(function(results) {
        const userDoc = results[0];
        const progressDoc = results[1];
        
        const showProgress = userDoc.exists ? (userDoc.data().showProgress !== false) : true;
        
        let completed = [];
        if (progressDoc.exists) {
          completed = progressDoc.data().completed || [];
          
          // Handle object format
          if (!Array.isArray(completed)) {
            if (typeof completed === 'object' && completed !== null) {
              completed = Object.keys(completed).filter(function(key) {
                return completed[key] === true;
              });
            } else {
              completed = [];
            }
          }
        }
        
        const isCompleted = completed.includes(lessonId);
        
        // Update button states
        if (isCompleted && showProgress) {
          topBtn.textContent = 'Completed ✓';
          bottomBtn.textContent = 'Completed ✓';
          topBtn.classList.add('completed');
          bottomBtn.classList.add('completed');
        }
        
        const handleComplete = function() {
          // Find next lesson
          const currentIndex = courseConfig.lessons.indexOf(lessonId);
          const nextLesson = currentIndex < courseConfig.lessons.length - 1 
            ? courseConfig.lessons[currentIndex + 1] 
            : null;
          
          if (showProgress && !completed.includes(lessonId)) {
            // Mark as complete in Firestore
            const newCompleted = completed.concat([lessonId]);
            
            db.collection('users').doc(uid).collection('progress').doc(courseId).set({
              completed: newCompleted,
              lastLesson: lessonId,
              lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).then(function() {
              console.log('Lesson marked complete');
              
              // Navigate to next lesson or back to course
              if (nextLesson) {
                window.location.href = window.location.pathname + '?c=' + courseId.charAt(courseId.length - 1) + '&l=' + nextLesson;
              } else {
                window.location.href = window.location.pathname + '?c=' + courseId.charAt(courseId.length - 1);
              }
            }).catch(function(err) {
              console.error('Error marking complete:', err);
            });
          } else {
            // Just navigate without marking complete
            if (nextLesson) {
              window.location.href = window.location.pathname + '?c=' + courseId.charAt(courseId.length - 1) + '&l=' + nextLesson;
            } else {
              window.location.href = window.location.pathname + '?c=' + courseId.charAt(courseId.length - 1);
            }
          }
        };
        
        topBtn.addEventListener('click', handleComplete);
        bottomBtn.addEventListener('click', handleComplete);
      }).catch(function(err) {
        console.error('Error setting up complete handler:', err);
      });
    });
  }

})();
