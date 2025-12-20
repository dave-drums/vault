/**
 * Vault Lesson Comments System
 * Version: 2.0 (Optimized)
 * Load this once per page before the comments container
 */

(function(){
  'use strict';

  // Check if already loaded
  if (window.VaultCommentsLoaded) return;
  window.VaultCommentsLoaded = true;

  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
.vault-comments{
  width: min(860px, 100%);
  margin: 24px auto 0;
  padding: 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  box-sizing: border-box;
  color: #111;
}

    .vault-comments h3{
      margin: 0 0 6px 0;
    }

    .vault-comments-meta{
      font-size: .95rem;
      opacity: .7;
      margin-bottom: 20px;
    }

    .vault-comments-list{
      display: grid;
      gap: 16px;
      margin: 0 0 20px 0;
      padding: 0;
      list-style: none;
    }

    .vault-comment{
      background: #fafafa;
      border-radius: 12px;
      padding: 16px 18px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.05);
      transition: box-shadow 0.2s ease;
    }

    .vault-comment:hover{
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .vault-comment-top{
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }

    .vault-comment-name{
      font-weight: 700;
      font-size: 1.05rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 65%;
      color: #111;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .vault-comment-name.admin{
      color: #06b3fd;
    }

    .vault-comment-admin-badge{
      font-size: 0.9rem;
      line-height: 1;
    }

    .vault-comment-date{
      font-size: 0.9rem;
      opacity: .6;
      white-space: nowrap;
    }

    .vault-comment-text{
      white-space: pre-wrap;
      line-height: 1.5;
      font-size: 1.05rem;
      margin-bottom: 10px;
      word-break: break-word;
    }

    .vault-comment-deleted{
      opacity: 0.5;
      font-style: italic;
    }

    .vault-comment-actions{
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }

    .vault-comment-actions button{
      appearance: none;
      background: none;
      border: none;
      cursor: pointer;
      font-size: .9rem;
      opacity: .7;
      transition: opacity 0.2s ease;
      font-weight: 500;
      padding: 4px 0;
      color: inherit;
    }

    .vault-comment-actions button:hover{
      opacity: 1;
    }

    .reply-btn{
      color: #06b3fd;
    }

    .delete-btn{
      color: #d32f2f;
    }

    .vault-replies{
      margin-top: 14px;
      padding-left: 20px;
      border-left: 3px solid #e0e0e0;
      list-style: none;
      display: grid;
      gap: 12px;
    }

    .vault-reply-form{
      display: none;
      padding: 12px;
      margin-top: 10px;
      background: #fff;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .vault-reply-form.open{
      display: block;
    }

    .vault-reply-form textarea{
      width: 100%;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 10px;
      resize: vertical;
      min-height: 80px;
      font-size: 1rem;
      font-family: inherit;
      color: #111;
      box-sizing: border-box;
      margin-bottom: 10px;
    }

    .vault-reply-form textarea:focus{
      outline: none;
      border-color: #06b3fd;
    }

    .vault-reply-form-actions{
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      align-items: center;
    }

    .vault-reply-form-actions button{
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid #ddd;
      background: #fff;
      font-size: 0.95rem;
    }

    .vault-reply-form-actions button:hover{
      background: #f5f5f5;
    }

    .vault-reply-form-actions .reply-post-btn{
      background: #06b3fd;
      color: #fff;
      border-color: #06b3fd;
    }

    .vault-reply-form-actions .reply-post-btn:hover{
      background: #0590d4;
    }

    .vault-reply-form-actions .reply-cancel-btn{
      background: #f5f5f5;
      border-color: #ddd;
    }

    .vault-comment-form{
      display: none;
      grid-template-rows: 1fr auto;
      gap: 10px;
    }

    .vault-comment-form textarea{
      width: 100%;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 12px;
      resize: vertical;
      min-height: 100px;
      font-size: 1.05rem;
      font-family: inherit;
      color: #111;
      box-sizing: border-box;
    }

    .vault-comment-form textarea:focus{
      outline: none;
      border-color: #06b3fd;
    }

    .vault-comment-form-actions{
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .vault-comment-form-actions button{
      padding: 10px 24px;
      background: #06b3fd;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .vault-comment-form-actions button:disabled{
      opacity: 0.5;
      cursor: not-allowed;
    }

    .vault-comment-form-actions button:not(:disabled):hover{
      background: #0590d4;
    }

    .vault-comment-status{
      font-size: .9rem;
      color: #666;
    }

    @media (max-width: 600px){
      .vault-comments{
        padding: 18px;
      }
      .vault-comment{
        padding: 14px 16px;
      }
      .vault-replies{
        padding-left: 14px;
      }
    }
  `;
  document.head.appendChild(style);

  // Initialize function
  window.initVaultComments = function() {
    const container = document.getElementById('vault-comments');
    if (!container) {
      console.error('Vault Comments: Container #vault-comments not found');
      return;
    }

    // Check if already initialized
    if (container.dataset.initialized === 'true') return;
    container.dataset.initialized = 'true';

    // Get Firebase instances from window (must be loaded first)
    if (!window.firebase || !window.firebase.auth || !window.firebase.firestore) {
      console.error('Vault Comments: Firebase not loaded');
      return;
    }

    const auth = firebase.auth();
    const db = firebase.firestore();

    const form = document.getElementById('vault-comment-form');
    const textEl = document.getElementById('vault-comment-text');
    const postBtn = document.getElementById('vault-comment-post');
    const status = document.getElementById('vault-comment-status');
    const list = document.getElementById('vault-comments-list');
    const meta = document.getElementById('vault-comments-meta');

    if (!form || !textEl || !postBtn || !status || !list || !meta) {
      console.error('Vault Comments: Required elements not found');
      return;
    }

// Generate thread ID from URL path + lesson param
function getThreadId(){
  const path = window.location.pathname;
  const parts = path.split('/').filter(p => p.length > 0);
  const params = new URLSearchParams(window.location.search);
  
  if (parts.length < 2 || parts[0] !== 'vault') return 'vault_home';
  
  const pathway = parts[1]; // gs, fs, ss, ks
  const courseNum = params.get('c');
  const lesson = params.get('l');
  
  if (!courseNum) return 'vault_home';
  
  const courseId = pathway + courseNum; // gs1, fs2, etc
  const base = 'vault_' + courseId;
  return lesson ? base + '_lesson_' + lesson : base;
}

    const threadId = getThreadId();
    const colRef = db.collection('lessonComments').doc(threadId).collection('comments');

    function esc(str){
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function fmt(ts){
      if (!ts || !ts.toDate) return '';
      const d = ts.toDate();
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return diffMins + 'm ago';
      if (diffHours < 24) return diffHours + 'h ago';
      if (diffDays < 7) return diffDays + 'd ago';

      return d.toLocaleDateString('en-AU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }

    function getLessonTitle(){
      const h1 = document.querySelector('h1');
      if (h1 && h1.textContent) return h1.textContent.trim();
      if (document.title) return document.title.split('|')[0].split('—')[0].split('-')[0].trim();
      return 'Lesson';
    }

    let unsub;
    let currentUser = null;
    let userDisplayName = '';
    
    // OPTIMIZATION 4: Pagination variables
    const COMMENTS_PER_PAGE = 10;
    let allComments = [];
    let displayedCount = 0;

    async function getUserDisplayName(uid){
      try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          return userData.displayName || userData.firstName || userData.email?.split('@')[0] || 'Member';
        }
      } catch(e) {
        console.error('Error getting user displayName:', e);
      }
      return 'Member';
    }

    function buildCommentTree(docs){
      const all = docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const topLevel = all.filter(c => !c.parentId);
      const replies = all.filter(c => c.parentId);

      topLevel.forEach(comment => {
        comment.replies = replies.filter(r => r.parentId === comment.id)
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return aTime - bTime;
          });
      });

      return topLevel.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return aTime - bTime;
      });
    }

    function renderComment(comment, isReply = false){
      const li = document.createElement('li');
      li.className = 'vault-comment';
      li.dataset.commentId = comment.id;

      const isOwn = currentUser && comment.uid === currentUser.uid;
      const isAdmin = currentUser && currentUser.email === 'info@davedrums.com.au';
      const commentAuthorIsAdmin = comment.authorIsAdmin === true;
      const isDeleted = comment.deleted === true;

      let displayText = '';
      let displayName = comment.displayName || 'Member';

      if (isDeleted) {
        if (comment.deletedBy === 'admin') {
          displayText = '[Comment deleted]';
        } else {
          displayText = '[Comment deleted by user]';
        }
      } else {
        displayText = esc(comment.text || '');
      }

      const nameClass = commentAuthorIsAdmin ? 'vault-comment-name admin' : 'vault-comment-name';
      const adminBadge = commentAuthorIsAdmin ? '<span class="vault-comment-admin-badge">⭐</span>' : '';

      li.innerHTML = `
        <div class="vault-comment-top">
          <div class="${nameClass}">${adminBadge}${esc(displayName)}</div>
          <div class="vault-comment-date">${fmt(comment.createdAt)}</div>
        </div>
        <div class="vault-comment-text ${isDeleted ? 'vault-comment-deleted' : ''}">${displayText}</div>
        <div class="vault-comment-actions"></div>
        <div class="vault-reply-form"></div>
      `;

      const actions = li.querySelector('.vault-comment-actions');

      // Show actions based on state
      if (isDeleted) {
        // Admin can view deleted comments and remove permanently
        if (isAdmin) {
          if (comment.originalText) {
            const viewBtn = document.createElement('button');
            viewBtn.textContent = 'View Comment';
            viewBtn.className = 'reply-btn';
            viewBtn.onclick = () => {
              alert('Original comment:\n\n' + comment.originalText);
            };
            actions.appendChild(viewBtn);
          }
          
          // Always show Remove Permanently for admin, even on deleted comments
          const removeBtn = document.createElement('button');
          removeBtn.textContent = 'Remove Permanently';
          removeBtn.className = 'delete-btn';
          removeBtn.onclick = () => {
            if (confirm('Permanently remove this comment' + (comment.replies?.length ? ' and all its replies' : '') + '? This cannot be undone.')) {
              removeCommentPermanently(comment.id);
            }
          };
          actions.appendChild(removeBtn);
        }
      } else {
        // Reply button (only on top-level comments)
        if (!isReply && currentUser) {
          const replyBtn = document.createElement('button');
          replyBtn.textContent = 'Reply';
          replyBtn.className = 'reply-btn';
          replyBtn.onclick = () => toggleReplyForm(li, comment.id);
          actions.appendChild(replyBtn);
        }

        // Delete button (owner or admin)
        if (isOwn || isAdmin) {
          const deleteBtn = document.createElement('button');
          deleteBtn.textContent = 'Delete';
          deleteBtn.className = 'delete-btn';
          deleteBtn.onclick = () => {
            if (confirm('Delete this comment' + (comment.replies?.length ? ' and mark all its replies as deleted' : '') + '?')) {
              deleteComment(comment.id, isAdmin, comment.text);
            }
          };
          actions.appendChild(deleteBtn);
        }

        // Remove permanently button (admin only)
        if (isAdmin) {
          const removeBtn = document.createElement('button');
          removeBtn.textContent = 'Remove Permanently';
          removeBtn.className = 'delete-btn';
          removeBtn.onclick = () => {
            if (confirm('Permanently remove this comment' + (comment.replies?.length ? ' and all its replies' : '') + '? This cannot be undone.')) {
              removeCommentPermanently(comment.id);
            }
          };
          actions.appendChild(removeBtn);
        }
      }

      // Render replies
      if (comment.replies && comment.replies.length > 0) {
        const repliesContainer = document.createElement('ul');
        repliesContainer.className = 'vault-replies';
        comment.replies.forEach(reply => {
          const replyLi = renderComment(reply, true);
          repliesContainer.appendChild(replyLi);
        });
        li.appendChild(repliesContainer);
      }

      return li;
    }

    function toggleReplyForm(commentLi, parentId){
      const replyFormDiv = commentLi.querySelector('.vault-reply-form');
      if (replyFormDiv.classList.contains('open')) {
        replyFormDiv.classList.remove('open');
        replyFormDiv.innerHTML = '';
        return;
      }

      replyFormDiv.innerHTML = `
        <textarea class="reply-textarea" maxlength="1000" placeholder="Write a reply…"></textarea>
        <div class="vault-reply-form-actions">
          <button class="reply-cancel-btn" type="button">Cancel</button>
          <button class="reply-post-btn" type="button">Post Reply</button>
        </div>
      `;
      replyFormDiv.classList.add('open');

      const replyText = replyFormDiv.querySelector('.reply-textarea');
      const replyPostBtn = replyFormDiv.querySelector('.reply-post-btn');
      const replyCancelBtn = replyFormDiv.querySelector('.reply-cancel-btn');

      replyCancelBtn.onclick = () => {
        replyFormDiv.classList.remove('open');
        replyFormDiv.innerHTML = '';
      };

      replyPostBtn.onclick = async () => {
        const text = replyText.value.trim();
        if (!text || !currentUser) return;

        replyPostBtn.disabled = true;
        const isAdmin = currentUser.email === 'info@davedrums.com.au';

        try {
          const newReply = await colRef.add({
            uid: currentUser.uid,
            displayName: userDisplayName,
            text: text,
            parentId: parentId,
            deleted: false,
            authorIsAdmin: isAdmin,
            createdAt: firebase.firestore.Timestamp.now()
          });

          // Find parent comment's author
          const parentDoc = await colRef.doc(parentId).get();
          if (parentDoc.exists) {
            const parentData = parentDoc.data();
            if (parentData.uid !== currentUser.uid) {
              await db.collection('users').doc(parentData.uid).collection('notifications').add({
                type: 'comment_reply',
                fromUid: currentUser.uid,
                fromName: userDisplayName,
                commentText: text,
                lessonUrl: window.location.pathname,
                lessonTitle: getLessonTitle(),
                parentCommentId: parentId,
                read: false,
                createdAt: firebase.firestore.Timestamp.now()
              });
            }
          }

          replyFormDiv.classList.remove('open');
          replyFormDiv.innerHTML = '';
          if (window.VaultToast) {
            window.VaultToast.success('Reply posted');
          }
        } catch (e) {
          console.error('Error posting reply:', e);
          if (window.VaultToast) {
            window.VaultToast.error('Failed to post reply');
          }
        } finally {
          replyPostBtn.disabled = false;
        }
      };
    }

    function deleteComment(commentId, isAdmin, originalText){
      // Soft delete: mark as deleted and store original text for admin viewing
      colRef.doc(commentId).update({
        deleted: true,
        deletedBy: isAdmin ? 'admin' : 'user',
        deletedAt: firebase.firestore.Timestamp.now(),
        originalText: originalText || ''
      }).then(() => {
        // Update any notifications pointing to this comment
        return updateNotificationsForDeletedComment(commentId, isAdmin);
      }).catch(e => {
        console.error('Error deleting comment:', e);
        if (window.VaultToast) {
          window.VaultToast.error('Failed to delete comment');
        }
      });

      // Also mark all replies as deleted
      colRef.where('parentId', '==', commentId).get().then(snap => {
        const batch = db.batch();
        snap.docs.forEach(doc => {
          const replyData = doc.data();
          batch.update(doc.ref, {
            deleted: true,
            deletedBy: isAdmin ? 'admin' : 'user',
            deletedAt: firebase.firestore.Timestamp.now(),
            originalText: replyData.text || ''
          });
        });
        return batch.commit();
      }).catch(e => {
        console.error('Error deleting replies:', e);
      });
    }

    async function updateNotificationsForDeletedComment(commentId, isAdmin){
      // OPTIMIZATION 3: Use collectionGroup query instead of scanning all users
      try {
        const notifSnap = await db.collectionGroup('notifications')
          .where('parentCommentId', '==', commentId)
          .get();
        
        if (!notifSnap.empty) {
          const batch = db.batch();
          notifSnap.docs.forEach(notifDoc => {
            batch.update(notifDoc.ref, {
              commentDeleted: true,
              deletedBy: isAdmin ? 'admin' : 'user'
            });
          });
          await batch.commit();
        }
      } catch (e) {
        console.error('Error updating notifications:', e);
        // If collectionGroup query fails (missing index), fall back to old method
        if (e.code === 'failed-precondition') {
          console.warn('Missing Firestore index. Create index at:', e.message);
          await updateNotificationsForDeletedCommentFallback(commentId, isAdmin);
        }
      }
    }

    // Fallback method if collectionGroup index doesn't exist
    async function updateNotificationsForDeletedCommentFallback(commentId, isAdmin){
      try {
        const allUsers = await db.collection('users').get();
        
        for (const userDoc of allUsers.docs) {
          const notifSnap = await userDoc.ref.collection('notifications')
            .where('parentCommentId', '==', commentId)
            .get();
          
          if (!notifSnap.empty) {
            const batch = db.batch();
            notifSnap.docs.forEach(notifDoc => {
              batch.update(notifDoc.ref, {
                commentDeleted: true,
                deletedBy: isAdmin ? 'admin' : 'user'
              });
            });
            await batch.commit();
          }
        }
      } catch (e) {
        console.error('Error updating notifications (fallback):', e);
      }
    }

    function removeCommentPermanently(commentId){
      // Hard delete: actually remove from database
      colRef.doc(commentId).delete().then(() => {
        // Mark notifications as permanently removed
        return updateNotificationsForRemovedComment(commentId);
      }).catch(e => {
        console.error('Error removing comment:', e);
        if (window.VaultToast) {
          window.VaultToast.error('Failed to remove comment');
        }
      });

      // Also remove all replies
      colRef.where('parentId', '==', commentId).get().then(snap => {
        const batch = db.batch();
        snap.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        return batch.commit();
      }).catch(e => {
        console.error('Error removing replies:', e);
      });
    }

    async function updateNotificationsForRemovedComment(commentId){
      // OPTIMIZATION 3: Use collectionGroup query instead of scanning all users
      try {
        const notifSnap = await db.collectionGroup('notifications')
          .where('parentCommentId', '==', commentId)
          .get();
        
        if (!notifSnap.empty) {
          const batch = db.batch();
          notifSnap.docs.forEach(notifDoc => {
            batch.update(notifDoc.ref, {
              commentPermanentlyRemoved: true,
              commentDeleted: true
            });
          });
          await batch.commit();
        }
      } catch (e) {
        console.error('Error updating notifications for removed comment:', e);
        // If collectionGroup query fails (missing index), fall back to old method
        if (e.code === 'failed-precondition') {
          console.warn('Missing Firestore index. Create index at:', e.message);
          await updateNotificationsForRemovedCommentFallback(commentId);
        }
      }
    }

    // Fallback method if collectionGroup index doesn't exist
    async function updateNotificationsForRemovedCommentFallback(commentId){
      try {
        const allUsers = await db.collection('users').get();
        
        for (const userDoc of allUsers.docs) {
          const notifSnap = await userDoc.ref.collection('notifications')
            .where('parentCommentId', '==', commentId)
            .get();
          
          if (!notifSnap.empty) {
            const batch = db.batch();
            notifSnap.docs.forEach(notifDoc => {
              batch.update(notifDoc.ref, {
                commentPermanentlyRemoved: true,
                commentDeleted: true
              });
            });
            await batch.commit();
          }
        }
      } catch (e) {
        console.error('Error updating notifications for removed comment (fallback):', e);
      }
    }

    function render(docs, user){
      // OPTIMIZATION 4: Store all comments and render paginated
      allComments = buildCommentTree(docs);
      const totalComments = docs.length;

      meta.textContent = totalComments + (totalComments === 1 ? ' comment' : ' comments');
      
      if (!totalComments){
        list.innerHTML = '';
        meta.textContent = 'No comments yet. Be the first to comment!';
        return;
      }

      // Render first page
      displayedCount = 0;
      list.innerHTML = '';
      renderNextPage();
    }

    function renderNextPage(){
      const start = displayedCount;
      const end = Math.min(start + COMMENTS_PER_PAGE, allComments.length);
      
      // Remove existing load more button if present
      const existingBtn = document.getElementById('load-more-comments');
      if (existingBtn) existingBtn.remove();
      
      // Render comments for this page
      for (let i = start; i < end; i++) {
        const li = renderComment(allComments[i]);
        list.appendChild(li);
      }
      
      displayedCount = end;
      
      // Add "Load More" button if there are more comments
      if (displayedCount < allComments.length) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = 'load-more-comments';
        loadMoreBtn.textContent = `Load More (${allComments.length - displayedCount} remaining)`;
        loadMoreBtn.style.cssText = 'width:100%;padding:12px;background:#f3f3f3;border:1px solid #ddd;' +
          'border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;color:#666;' +
          'transition:all 0.2s ease;margin-top:12px;';
        
        loadMoreBtn.addEventListener('mouseenter', () => {
          loadMoreBtn.style.background = '#e8e8e8';
          loadMoreBtn.style.borderColor = '#bbb';
        });
        loadMoreBtn.addEventListener('mouseleave', () => {
          loadMoreBtn.style.background = '#f3f3f3';
          loadMoreBtn.style.borderColor = '#ddd';
        });
        
        loadMoreBtn.onclick = () => {
          renderNextPage();
        };
        
        list.appendChild(loadMoreBtn);
      }
    }

    function listen(user){
      if (unsub) unsub();
      currentUser = user;
      unsub = colRef.orderBy('createdAt','asc')
        .onSnapshot(s => render(s.docs, user));
    }

    // OPTIMIZATION 5: Detach listeners when tab is hidden to save reads
    let isListenerActive = true;
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && unsub && isListenerActive) {
        // Tab hidden - detach listener
        unsub();
        unsub = null;
        isListenerActive = false;
      } else if (!document.hidden && !unsub && currentUser && isListenerActive === false) {
        // Tab visible again - reattach listener
        listen(currentUser);
        isListenerActive = true;
      }
    });

    postBtn.onclick = async () => {
      const u = auth.currentUser;
      if (!u) return;

      const t = textEl.value.trim();
      if (!t) return;

      postBtn.disabled = true;
      status.textContent = 'Posting…';

      const isAdmin = u.email === 'info@davedrums.com.au';

      try {
        await colRef.add({
          uid: u.uid,
          displayName: userDisplayName,
          text: t,
          parentId: null,
          deleted: false,
          authorIsAdmin: isAdmin,
          createdAt: firebase.firestore.Timestamp.now()
        });

        textEl.value = '';
        status.textContent = '';
        if (window.VaultToast) {
          window.VaultToast.success('Comment posted');
        }
      } catch (e) {
        console.error('Error posting comment:', e);
        status.textContent = 'Failed to post';
        if (window.VaultToast) {
          window.VaultToast.error('Failed to post comment');
        }
      } finally {
        postBtn.disabled = false;
      }
    };

    // Listen for auth and load user's displayName
    auth.onAuthStateChanged(async user => {
      if (!user){
        form.style.display = 'none';
        meta.textContent = '';
        list.innerHTML = '';
        if (unsub) unsub();
        currentUser = null;
        userDisplayName = '';
        return;
      }

      currentUser = user;

      // Get the user's displayName and birthdate from Firestore
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        userDisplayName = userData.displayName || userData.firstName || user.email?.split('@')[0] || 'Member';
        
        // Check age restriction
        if (userData.birthdate) {
          const age = calculateAge(userData.birthdate);
          if (age < 16) {
            // Hide comment form and list, show age restriction message
            form.style.display = 'none';
            list.style.display = 'none';
            
            const ageNotice = document.createElement('div');
            ageNotice.id = 'vault-comments-age-notice';
            ageNotice.style.cssText = 'padding:16px 20px;background:#fff3cd;border:1px solid #ffc107;' +
              'border-radius:10px;color:#856404;font-size:0.95rem;line-height:1.5;text-align:center;';
            ageNotice.textContent = 'Comments are restricted for users under 16 years of age.';
            
            const existingNotice = document.getElementById('vault-comments-age-notice');
            if (existingNotice) existingNotice.remove();
            
            container.appendChild(ageNotice);
            
            // OPTIMIZATION 1: Don't create listener for under-16 users
            // Just get count once (no real-time updates)
            colRef.get().then(snap => {
              const count = snap.docs.length;
              meta.textContent = count + (count === 1 ? ' comment' : ' comments');
            }).catch(() => {
              meta.textContent = '0 comments';
            });
            
            return;
          }
        }
      } else {
        userDisplayName = user.email?.split('@')[0] || 'Member';
      }

      form.style.display = 'grid';
      listen(user);

      // Listen for displayName changes in the user's document
      db.collection('users').doc(user.uid).onSnapshot(doc => {
        if (doc.exists) {
          const userData = doc.data();
          const newDisplayName = userData.displayName || userData.firstName || user.email?.split('@')[0] || 'Member';
          
          if (newDisplayName !== userDisplayName) {
            userDisplayName = newDisplayName;
            
            // Update all of this user's comments
            colRef.where('uid', '==', user.uid).get().then(snap => {
              const batch = db.batch();
              snap.docs.forEach(doc => {
                batch.update(doc.ref, { displayName: newDisplayName });
              });
              return batch.commit();
            }).catch(e => {
              console.error('Failed to update comment names:', e);
            });
          }
        }
      });
    });

    function calculateAge(birthdate){
      if (!birthdate) return 100; // Default to allow if no birthdate
      
      let birthDate;
      if (typeof birthdate === 'string') {
        // Parse DD/MM/YYYY
        const parts = birthdate.split('/');
        if (parts.length === 3) {
          birthDate = new Date(parts[2], parts[1] - 1, parts[0]);
        }
      } else if (birthdate.toDate) {
        // Firestore timestamp
        birthDate = birthdate.toDate();
      }
      
      if (!birthDate || isNaN(birthDate)) return 100;
      
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    }
  };

  // Auto-initialize if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof window.initVaultComments === 'function') {
        window.initVaultComments();
      }
    });
  } else {
    // DOM already loaded, check if container exists
    if (document.getElementById('vault-comments')) {
      window.initVaultComments();
    }
  }
})();
