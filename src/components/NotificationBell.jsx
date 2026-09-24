import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, X, Check } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Poll for notifications every 30 seconds
  useEffect(() => {
    if (!user || user.role === 'Viewer') return;

    const fetchNotifications = async () => {
      try {
        const { data } = await apiClient.get('/notifications');
        setNotifications(data);
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (e, id) => {
    e.stopPropagation();
    try {
      await apiClient.put(`/notifications/${id}/read`);
      setNotifications(notifications.filter((n) => n._id !== id));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    for (const n of notifications) {
      await apiClient.put(`/notifications/${n._id}/read`);
    }
    setNotifications([]);
    setLoading(false);
    setIsOpen(false);
  };

  if (!user || user.role === 'Viewer') return null;

  const unreadCount = notifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 bg-ink-900 border border-ink-800 rounded hover:bg-ink-800 transition-colors text-slate-400 hover:text-paper-50"
        title="Alerts & Notifications"
      >
        {unreadCount > 0 ? (
          <>
            <BellRing size={14} className="text-vermilion-500 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-vermilion-500 text-[8px] font-bold text-white shadow-sm ring-2 ring-ink-950">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </>
        ) : (
          <Bell size={14} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-paper-50 border border-ink-800/10 shadow-2xl rounded z-[100] overflow-hidden">
          <div className="bg-ink-950 px-4 py-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-paper-50 font-bold flex items-center gap-2">
              <Bell size={12} className="text-brass-500" />
              Automated Alerts
            </span>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead} 
                disabled={loading}
                className="font-mono text-[9px] uppercase text-slate-450 hover:text-paper-50 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
          
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-slate-450">
                No active alerts
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n._id} className="p-4 border-b border-ink-800/5 hover:bg-black/5 transition-colors group relative cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider ${
                          n.type === 'HIGH_RISK' ? 'bg-vermilion-500/10 text-vermilion-600 border border-vermilion-500/20' : 
                          'bg-marigold-500/10 text-marigold-600 border border-marigold-500/20'
                        }`}>
                          {n.type.replace('_', ' ')}
                        </span>
                        <span className="text-[9px] font-mono text-slate-450">
                          {n.createdAt && !isNaN(new Date(n.createdAt).getTime())
                            ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
                            : 'Recently'}
                        </span>
                      </div>
                      <p className="text-xs text-ink-900 leading-snug pr-4">{n.message}</p>
                    </div>
                    <button 
                      onClick={(e) => markAsRead(e, n._id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-vermilion-500 hover:bg-vermilion-500/10 rounded transition-all shrink-0"
                      title="Dismiss alert"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
