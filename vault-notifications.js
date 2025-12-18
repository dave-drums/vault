/* vault-notifications.js
   Purpose: Track and display comment reply notifications
   - Shows notification bell icon with count
   - Displays popup with unread notifications
   - Links to lesson pages
*/

(function(){
  'use strict';

  if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) return;

  const auth = firebase.auth();
  const db = firebase.firestore();

  let unsubNotifications = null;
  let notificationCount = 0;

  function createNotificationIcon(){
    // Find the account title element
    const titleEl = document.querySelector('.members-title');
    if (!titleEl || titleEl.textContent !== 'ACCOUNT') return;

    // Check if icons already exist
    if (document.getElementById('vault-notification-icon')) return;

    // Drum logo (left side, links to /vault)
    const drumContainer = document.createElement('div');
    drumContainer.id = 'vault-drum-container';
    drumContainer.style.cssText = 'position:absolute;top:24px;left:24px;';
    
    const drumLink = document.createElement('a');
    drumLink.href = '/vault';
    drumLink.style.cssText = 'display:block;width:40px;height:40px;border-radius:50%;' +
      'background:#f3f3f3;border:1px solid #ddd;display:flex;align-items:center;' +
      'justify-content:center;transition:all 0.2s ease;overflow:hidden;';
    
    const drumImg = document.createElement('img');
    drumImg.src = 'https://dave-drums.github.io/vault/drum-blue-200.png';
    drumImg.alt = 'Practice Vault';
    drumImg.style.cssText = 'width:28px;height:28px;display:block;';
    
    drumLink.appendChild(drumImg);
    drumContainer.appendChild(drumLink);
    
    drumLink.addEventListener('mouseenter', () => {
      drumLink.style.background = '#e8e8e8';
      drumLink.style.borderColor = '#bbb';
    });
    drumLink.addEventListener('mouseleave', () => {
      drumLink.style.background = '#f3f3f3';
      drumLink.style.borderColor = '#ddd';
    });

    // Notification icon (right side)
    const notifContainer = document.createElement('div');
    notifContainer.id = 'vault-notification-container';
    notifContainer.style.cssText = 'position:absolute;top:24px;right:24px;';
    
    const icon = document.createElement('button');
    icon.id = 'vault-notification-icon';
    icon.type = 'button';
    icon.style.cssText = 'position:relative;background:#f3f3f3;border:1px solid #ddd;' +
      'border-radius:50%;width:40px;height:40px;cursor:pointer;display:flex;' +
      'align-items:center;justify-content:center;transition:all 0.2s ease;';
    icon.innerHTML = '🔔';
    icon.title = 'Notifications';

    icon.addEventListener('mouseenter', () => {
      icon.style.background = '#e8e8e8';
      icon.style.borderColor = '#bbb';
    });

    icon.addEventListener('mouseleave', () => {
      icon.style.background = '#f3f3f3';
      icon.style.borderColor = '#ddd';
    });

    const badge = document.createElement('span');
    badge.id = 'vault-notification-badge';
    badge.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#c00;' +
      'color:#fff;border-radius:10px;min-width:20px;height:20px;font-size:11px;' +
      'font-weight:700;display:none;align-items:center;justify-content:center;' +
      'padding:0 5px;box-shadow:0 2px 4px rgba(0,0,0,0.2);';

    icon.appendChild(badge);
    notifContainer.appendChild(icon);
    
    // Insert into members-wrap
    const membersWrap = document.getElementById('members-wrap');
    if (membersWrap) {
      membersWrap.style.position = 'relative';
      membersWrap.appendChild(drumContainer);
      membersWrap.appendChild(notifContainer);
    }

    icon.addEventListener('click', showNotificationPopup);

    return { icon, badge };
  }

  function updateBadge(count){
    notificationCount = count;
    const badge = document.getElementById('vault-notification-badge');
    if (!badge) return;

    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  function showNotificationPopup(){
    const user = auth.currentUser;
    if (!user) return;

    // Mark all notifications as seen (clear badge)
    markAllAsSeen(user.uid);

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;' +
      'background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;' +
      'padding:18px;z-index:99999;';

    const popup = document.createElement('div');
    popup.style.cssText = 'width:100%;max-width:480px;max-height:80vh;background:#fff;' +
      'border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.25);display:flex;' +
      'flex-direction:column;overflow:hidden;';

    const header = document.createElement('div');
    header.style.cssText = 'padding:20px 24px;border-bottom:1px solid #e0e0e0;' +
      'display:flex;align-items:center;justify-content:space-between;';

    const title = document.createElement('h3');
    title.textContent = 'Notifications';
    title.style.cssText = 'margin:0;color:#111;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.type = 'button';
    closeBtn.style.cssText = 'background:none;border:none;font-size:32px;line-height:1;' +
      'cursor:pointer;color:#666;padding:0;width:32px;height:32px;' +
      'display:flex;align-items:center;justify-content:center;';
    closeBtn.onclick = () => overlay.remove();

    header.appendChild(title);
    header.appendChild(closeBtn);

    const content = document.createElement('div');
    content.style.cssText = 'flex:1;overflow-y:auto;padding:0;';

    const loadingDiv = document.createElement('div');
    loadingDiv.textContent = 'Loading notifications...';
    loadingDiv.style.cssText = 'padding:40px 24px;text-align:center;color:#666;font-size:13px;';
    content.appendChild(loadingDiv);

    popup.appendChild(header);
    popup.appendChild(content);
    overlay.appendChild(popup);

    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);

    // Load notifications
    loadNotifications(user.uid, content);
  }

  async function loadNotifications(uid, contentDiv){
    try {
      const snap = await db.collection('users').doc(uid).collection('notifications')
        .orderBy('createdAt', 'desc')
        .limit(3)
        .get();

      contentDiv.innerHTML = '';

      if (snap.empty) {
        const empty = document.createElement('div');
        empty.textContent = 'No notifications yet';
        empty.style.cssText = 'padding:40px 24px;text-align:center;color:#666;font-size:13px;';
        contentDiv.appendChild(empty);
        return;
      }

      snap.forEach(doc => {
        const notif = doc.data();
        const item = createNotificationItem(notif, doc.id);
        contentDiv.appendChild(item);
      });
      
      // Add clear notifications button
      const clearBtn = document.createElement('button');
      clearBtn.textContent = 'Clear Notifications';
      clearBtn.style.cssText = 'width:calc(100% - 48px);margin:16px 24px;padding:10px;' +
        'background:#f3f3f3;border:1px solid #ddd;border-radius:8px;cursor:pointer;' +
        'font-size:13px;font-weight:600;color:#666;transition:all 0.2s ease;';
      
      clearBtn.addEventListener('mouseenter', () => {
        clearBtn.style.background = '#e8e8e8';
        clearBtn.style.borderColor = '#bbb';
      });
      clearBtn.addEventListener('mouseleave', () => {
        clearBtn.style.background = '#f3f3f3';
        clearBtn.style.borderColor = '#ddd';
      });
      
      clearBtn.addEventListener('click', async () => {
        if (confirm('Clear all notifications?')) {
          clearBtn.disabled = true;
          clearBtn.textContent = 'Clearing...';
          
          const allNotifs = await db.collection('users').doc(uid).collection('notifications').get();
          const batch = db.batch();
          allNotifs.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          
          contentDiv.innerHTML = '<div style="padding:40px 24px;text-align:center;color:#666;font-size:13px;">No notifications yet</div>';
        }
      });
      
      contentDiv.appendChild(clearBtn);

    } catch (e) {
      console.error('Error loading notifications:', e);
      const errorDiv = document.createElement('div');
      errorDiv.textContent = 'Failed to load notifications';
      errorDiv.style.cssText = 'padding:40px 24px;text-align:center;color:#c00;font-size:13px;';
      contentDiv.innerHTML = '';
      contentDiv.appendChild(errorDiv);
    }
  }

  function createNotificationItem(notif, notifId){
    const item = document.createElement('div');
    item.style.cssText = 'padding:16px 24px;border-bottom:1px solid #f0f0f0;' +
      'cursor:pointer;transition:background 0.2s ease;' +
      (notif.read ? 'opacity:0.7;' : 'background:#f8f9fa;');

    item.addEventListener('mouseenter', () => {
      item.style.background = '#f0f0f0';
    });

    item.addEventListener('mouseleave', () => {
      item.style.background = notif.read ? '#fff' : '#f8f9fa';
    });

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;' +
      'gap:12px;margin-bottom:6px;';

    const fromName = document.createElement('div');
    fromName.textContent = notif.fromName || 'Someone';
    fromName.style.cssText = 'font-weight:700;color:#111;font-size:13px;';

    const time = document.createElement('div');
    time.textContent = formatTime(notif.createdAt);
    time.style.cssText = 'color:#666;white-space:nowrap;opacity:0.8;font-size:12px;';

    header.appendChild(fromName);
    header.appendChild(time);

    const message = document.createElement('div');
    message.style.cssText = 'line-height:1.4;margin-bottom:6px;color:#111;font-size:13px;';

    if (notif.type === 'comment_reply') {
      message.textContent = 'replied to your comment';
    } else {
      message.textContent = 'sent you a notification';
    }

    const preview = document.createElement('div');
    
    // Check if comment is deleted or permanently removed
    if (notif.commentPermanentlyRemoved) {
      preview.textContent = '[Comment permanently removed]';
      preview.style.cssText = 'color:#999;font-style:italic;margin-bottom:8px;font-size:12px;opacity:0.5;';
    } else if (notif.commentDeleted) {
      preview.textContent = notif.deletedBy === 'admin' ? '[Comment deleted]' : '[Comment deleted by user]';
      preview.style.cssText = 'color:#999;font-style:italic;margin-bottom:8px;font-size:12px;opacity:0.7;';
    } else {
      preview.textContent = '"' + (notif.commentText || '').slice(0, 100) + (notif.commentText?.length > 100 ? '...' : '') + '"';
      preview.style.cssText = 'color:#666;font-style:italic;margin-bottom:8px;font-size:12px;';
    }

    const lessonLink = document.createElement('div');
    lessonLink.textContent = '→ ' + (notif.lessonTitle || 'View lesson');
    lessonLink.style.cssText = 'color:#06b3fd;font-weight:600;font-size:13px;';

    item.appendChild(header);
    item.appendChild(message);
    item.appendChild(preview);
    item.appendChild(lessonLink);

    item.addEventListener('click', () => {
      markAsRead(notifId);
      if (notif.lessonUrl) {
        window.location.href = notif.lessonUrl;
      }
    });

    return item;
  }

  function formatTime(timestamp){
    if (!timestamp || !timestamp.toDate) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return diffMins + 'm ago';
    if (diffHours < 24) return diffHours + 'h ago';
    if (diffDays < 7) return diffDays + 'd ago';

    return date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short'
    });
  }

  function markAsRead(notifId){
    const user = auth.currentUser;
    if (!user) return;

    db.collection('users').doc(user.uid).collection('notifications')
      .doc(notifId)
      .update({ read: true })
      .catch(e => console.error('Error marking notification as read:', e));
  }

  function markAllAsSeen(uid){
    // Mark all unread notifications as read when popup is opened
    db.collection('users').doc(uid).collection('notifications')
      .where('read', '==', false)
      .get()
      .then(snap => {
        if (snap.empty) return;
        
        const batch = db.batch();
        snap.docs.forEach(doc => {
          batch.update(doc.ref, { read: true });
        });
        return batch.commit();
      })
      .catch(e => console.error('Error marking all as seen:', e));
  }

  function listenToNotifications(uid){
    if (unsubNotifications) unsubNotifications();

    unsubNotifications = db.collection('users').doc(uid).collection('notifications')
      .where('read', '==', false)
      .onSnapshot(snap => {
        const count = snap.size;
        updateBadge(count);
      }, err => {
        console.error('Error listening to notifications:', err);
      });
  }

  function init(){
    auth.onAuthStateChanged(user => {
      if (!user) {
        if (unsubNotifications) {
          unsubNotifications();
          unsubNotifications = null;
        }
        // Remove both icons when logged out
        const drumContainer = document.getElementById('vault-drum-container');
        const notifContainer = document.getElementById('vault-notification-container');
        if (drumContainer) drumContainer.remove();
        if (notifContainer) notifContainer.remove();
        return;
      }

      // Wait for account view to be rendered
      const checkInterval = setInterval(() => {
        const titleEl = document.querySelector('.members-title');
        if (titleEl && titleEl.textContent === 'ACCOUNT') {
          clearInterval(checkInterval);
          createNotificationIcon();
          listenToNotifications(user.uid);
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => clearInterval(checkInterval), 5000);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
