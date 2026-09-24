import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../api/client";
import { ShieldAlert, UserPlus, CheckCircle2 } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { mode, colors, header } = useTheme();
  const isDark = mode === 'dark';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'Official', email: '', phoneNumber: '' });
  const [formStatus, setFormStatus] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await apiClient.get('/auth/users');
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormStatus({ type: 'loading', msg: 'Creating user...' });
    try {
      await apiClient.post('/auth/register', formData);
      setFormStatus({ type: 'success', msg: 'User created successfully!' });
      setFormData({ username: '', password: '', role: 'Official', email: '', phoneNumber: '' });
      fetchUsers();
      setTimeout(() => {
        setShowAddForm(false);
        setFormStatus(null);
      }, 2000);
    } catch (err) {
      setFormStatus({ type: 'error', msg: err.response?.data?.message || 'Failed to create user' });
    }
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="p-10 flex items-center justify-center h-full">
        <div className="flex flex-col items-center opacity-50" style={{ color: header.text }}>
          <ShieldAlert size={48} className="mb-4" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p>Only Administrators can view User Management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto p-6 animate-fade-in pb-20">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: header.text }}>User Management</h1>
          <p className="text-sm" style={{ color: header.textMuted }}>Manage Officials and Viewers across the registry.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-[#14213d] bg-[#fca311] hover:bg-[#e5940f] transition-colors"
        >
          <UserPlus size={16} />
          Add Official
        </button>
      </div>

      {showAddForm && (
        <div 
          className="mb-8 p-6 rounded-xl border relative overflow-hidden"
          style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
        >
          <h3 className="text-lg font-bold mb-4">Register New User</h3>
          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold mb-1 opacity-70">Username</label>
              <input 
                required
                type="text" 
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full px-3 py-2 rounded-md text-sm border bg-transparent"
                style={{ borderColor: colors.border }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 opacity-70">Password</label>
              <input 
                required
                type="password" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-3 py-2 rounded-md text-sm border bg-transparent"
                style={{ borderColor: colors.border }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 opacity-70">Role</label>
              <select 
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="w-full px-3 py-2 rounded-md text-sm border bg-transparent"
                style={{ borderColor: colors.border, colorScheme: isDark ? "dark" : "light" }}
              >
                <option value="Official">Official (Project Manager)</option>
                <option value="Viewer">Viewer (Read Only)</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 opacity-70">Email Address (for alerts)</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 rounded-md text-sm border bg-transparent"
                style={{ borderColor: colors.border }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 opacity-70">Phone Number (optional)</label>
              <input 
                type="tel" 
                value={formData.phoneNumber}
                onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                className="w-full px-3 py-2 rounded-md text-sm border bg-transparent"
                style={{ borderColor: colors.border }}
              />
            </div>
            <div className="md:col-start-3 flex justify-end">
              <button 
                type="submit" 
                disabled={formStatus?.type === 'loading'}
                className="px-6 py-2 rounded-md text-sm font-semibold bg-white text-black hover:bg-gray-200 transition-colors"
              >
                {formStatus?.type === 'loading' ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>

          {formStatus && (
            <div className={`mt-4 p-3 rounded-md text-sm flex items-center gap-2 ${formStatus.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
              {formStatus.type === 'success' && <CheckCircle2 size={16} />}
              {formStatus.type === 'error' && <ShieldAlert size={16} />}
              {formStatus.msg}
            </div>
          )}
        </div>
      )}

      <div 
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ backgroundColor: colors.surfaceMuted, borderBottom: `1px solid ${colors.border}` }}>
              <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider opacity-70">Username</th>
              <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider opacity-70">Role</th>
              <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider opacity-70">Created Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" className="px-5 py-8 text-center opacity-50">Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="3" className="px-5 py-8 text-center opacity-50">No users found.</td></tr>
            ) : (
              users.map(u => (
                <tr key={u._id} className="border-b last:border-0 hover:bg-black/5" style={{ borderColor: colors.border }}>
                  <td className="px-5 py-3 font-medium">{u.username}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      u.role === 'Admin' ? 'bg-red-500/10 text-red-500' : 
                      u.role === 'Official' ? 'bg-[#fca311]/10 text-[#fca311]' : 
                      'bg-slate-500/10 text-slate-400'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 opacity-70">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
