// Real-time Notification Component for QualityStudio
// Shows notifications bell with badge and dropdown

import React, { useState, useEffect } from 'react';
import { notificationSocket } from '../api/localBackendClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../components/ui/dropdown-menu';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const Bell = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

const AlertCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const CheckCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const priorityColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  normal: 'bg-blue-500',
  low: 'bg-gray-500',
};

const typeIcons = {
  defect_critical: '🚨',
  defect_created: '📋',
  complaint_created: '📩',
  rca_completed: '✅',
  capa_overdue: '⏰',
  kpi_update: '📊',
  system_alert: 'ℹ️',
};

export function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket
    notificationSocket.connect(userId);

    // Add listener for notifications
    const removeListener = notificationSocket.addListener((data) => {
      if (data.type === 'connection') {
        setConnected(data.status === 'connected');
      } else if (data.type === 'notification') {
        setNotifications((prev) => {
          const updated = [{ ...data, id: Date.now(), read: false }, ...prev].slice(0, 20);
          return updated;
        });
        setUnreadCount((prev) => prev + 1);
      }
    });

    // Cleanup
    return () => {
      removeListener();
      notificationSocket.disconnect();
    };
  }, [userId]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="notification-bell">
          <Bell className={connected ? '' : 'text-gray-400'} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          <div className="flex gap-2">
            {connected ? (
              <Badge variant="outline" className="text-green-500 border-green-500 text-xs">
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-400 border-gray-400 text-xs">
                Offline
              </Badge>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-gray-500">
              <Bell className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1">You'll see alerts here in real-time</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start px-3 py-2 cursor-pointer ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-2 w-full">
                  <span className="text-lg">
                    {typeIcons[notification.notification_type] || 'ℹ️'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{notification.title}</p>
                      {notification.priority !== 'normal' && (
                        <span className={`w-2 h-2 rounded-full ${priorityColors[notification.priority]}`}></span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatTime(notification.timestamp)}</p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="flex gap-2 px-3 py-2">
              <Button variant="ghost" size="sm" onClick={markAllRead} className="flex-1 text-xs">
                Mark all read
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAll} className="flex-1 text-xs text-red-500">
                Clear all
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationBell;
