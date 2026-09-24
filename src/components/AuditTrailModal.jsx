import React, { useEffect, useState } from 'react';
import { X, Clock, User, ShieldAlert } from 'lucide-react';
import { apiClient } from '../api/client';
import { formatDistanceToNow } from 'date-fns';

export default function AuditTrailModal({ projectId, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const url = projectId ? `/audit?projectId=${projectId}` : '/audit';
        const { data } = await apiClient.get(url);
        setLogs(data);
      } catch (err) {
        setError('Failed to load audit trails or unauthorized access.');
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [projectId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-ink-900 border border-ink-800 shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-ink-800">
          <div className="flex items-center gap-2 text-paper-50 font-display">
            <ShieldAlert size={18} className="text-brass-500" />
            <h2 className="text-lg">System Audit Trail</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-slate-500 text-sm font-mono text-center py-8">Loading secure logs...</div>
          ) : error ? (
            <div className="text-vermilion-500 text-sm font-mono bg-vermilion-500/10 p-4 border border-vermilion-500/30 text-center">
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-slate-500 text-sm font-mono text-center py-8">No audit records found.</div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log._id} className="flex gap-4 p-4 border border-ink-800 bg-ink-950 rounded-lg">
                  <div className="mt-1">
                    <div className="w-8 h-8 rounded bg-brass-600/10 border border-brass-600/30 flex items-center justify-center text-brass-500">
                      <User size={14} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono text-xs text-brass-500">{log.userId}</span>
                      <span className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock size={10} />
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-paper-50 font-medium">{log.action}</p>
                    {log.details && (
                      <p className="text-xs text-slate-400 mt-1">{log.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
