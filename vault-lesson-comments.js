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
    // Find the account title element - check for both 'MY ACCOUNT' and 'ACCOUNT'
    const titleEl = document.querySelector('.members-title');
    if (!titleEl) return;
    
    const titleText = titleEl.textContent.trim();
    if (titleText !== 'MY ACCOUNT' && titleText !== 'ACCOUNT') return;

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
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    loadNotifications(user.uid, content);
  }

  function loadNotifications(uid, container){
    db.collection('users').doc(uid).collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()
      .then(snap => {
        container.innerHTML = '';

        if (snap.empty) {
          const emptyDiv = document.createElement('div');
          emptyDiv.textContent = 'No notifications yet';
          emptyDiv.style.cssText = 'padding:40px 24px;text-align:center;color:#999;font-size:14px;';
          container.appendChild(emptyDiv);
          return;
        }

        snap.forEach(doc => {
          const data = doc.data();
          const item = createNotificationItem(data, doc.id, uid);
          container.appendChild(item);
        });
      })
      .catch(err => {
        container.innerHTML = '<div style="padding:40px 24px;text-align:center;color:#c00;font-size:14px;">Error loading notifications</div>';
        console.error('Error loading notifications:', err);
      });
  }

  function createNotificationItem(data, notifId, uid){
    const item = document.createElement('div');
    item.style.cssText = 'padding:16px 24px;border-bottom:1px solid #f0f0f0;' +
      'cursor:pointer;transition:background 0.15s ease;' +
      (data.seen ? '' : 'background:#f9f9f9;');

    item.addEventListener('mouseenter', () => { item.style.background = '#f5f5f5'; });
    item.addEventListener('mouseleave', () => { item.style.background = data.seen ? '#fff' : '#f9f9f9'; });

    const title = document.createElement('div');
    title.style.cssText = 'font-weight:' + (data.seen ? '400' : '600') + ';margin-bottom:4px;color:#111;font-size:14px;';
    title.textContent = data.title || 'New reply to your comment';

    const message = document.createElement('div');
    message.style.cssText = 'color:#666;font-size:13px;margin-bottom:6px;line-height:1.4;';
    message.textContent = data.message || '';

    const time = document.createElement('div');
    time.style.cssText = 'color:#999;font-size:12px;';
    time.textContent = data.createdAt ? formatRelativeTime(data.createdAt.toDate()) : '';

    item.appendChild(title);
    item.appendChild(message);
    item.appendChild(time);

    item.addEventListener('click', () => {
      markAsRead(uid, notifId);
      if (data.link) {
        window.location.href = data.link;
      }
    });

    return item;
  }

  function formatRelativeTime(date){
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return minutes + 'm ago';
    if (hours < 24) return hours + 'h ago';
    if (days < 7) return days + 'd ago';
    return date.toLocaleDateString();
  }

  function markAllAsSeen(uid){
    db.collection('users').doc(uid).collection('notifications')
      .where('seen', '==', false)
      .get()
      .then(snap => {
        const batch = db.batch();
        snap.forEach(doc => {
          batch.update(doc.ref, { seen: true });
        });
        return batch.commit();
      })
      .then(() => {
        updateBadge(0);
      })
      .catch(err => console.error('Error marking notifications as seen:', err));
  }

  function markAsRead(uid, notifId){
    db.collection('users').doc(uid).collection('notifications').doc(notifId)
      .update({ read: true })
      .catch(err => console.error('Error marking notification as read:', err));
  }

  function listenToNotifications(uid){
    if (unsubNotifications) unsubNotifications();

    unsubNotifications = db.collection('users').doc(uid).collection('notifications')
      .where('seen', '==', false)
      .onSnapshot(snap => {
        updateBadge(snap.size);
      }, err => {
        console.error('Error listening to notifications:', err);
      });
  }

  function init(){
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    // Wait for account page to load
    const checkInterval = setInterval(() => {
      const titleEl = document.querySelector('.members-title');
      if (titleEl && (titleEl.textContent.trim() === 'MY ACCOUNT' || titleEl.textContent.trim() === 'ACCOUNT')) {
        clearInterval(checkInterval);
        
        auth.onAuthStateChanged(user => {
          if (user) {
            createNotificationIcon();
            listenToNotifications(user.uid);
          } else {
            if (unsubNotifications) unsubNotifications();
          }
        });
      }
    }, 100);

    // Stop checking after 10 seconds
    setTimeout(() => clearInterval(checkInterval), 10000);
  }

  init();
})();
