import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Landmark, Lock, User, Key, ShieldAlert } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    const result = await login(username, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E5E5E5] flex flex-col items-center justify-center font-sans text-[#14213D] p-6 relative overflow-hidden">
      
      {/* Background Grid Texture */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#14213D 1px, transparent 1px), linear-gradient(90deg, #14213D 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="relative w-full max-w-[380px] bg-white border border-[#14213D]/10 p-8 shadow-xl rounded-xl">
        
        {/* Header / Logo */}
        <div className="flex flex-col items-center mb-8 border-b border-[#14213D]/10 pb-6">
          <div className="w-12 h-12 bg-[#FCA311]/10 border border-[#FCA311]/20 rounded-xl flex items-center justify-center mb-4 text-[#FCA311]">
            <Landmark size={24} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#14213D]">PrediXa</h1>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#14213D]/50 mt-1.5">
            Restricted Access
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-medium p-3 rounded flex items-start gap-2">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#14213D]/60 mb-1.5">
              Stakeholder ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#14213D]/40">
                <User size={16} />
              </div>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-[#E5E5E5]/50 border border-[#14213D]/10 text-[#14213D] text-sm pl-10 pr-3 py-2.5 rounded focus:outline-none focus:border-[#FCA311] focus:ring-1 focus:ring-[#FCA311]/30 transition-all placeholder:text-[#14213D]/40 font-medium"
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#14213D]/60 mb-1.5">
              Clearance Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#14213D]/40">
                <Key size={16} />
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#E5E5E5]/50 border border-[#14213D]/10 text-[#14213D] text-sm pl-10 pr-3 py-2.5 rounded focus:outline-none focus:border-[#FCA311] focus:ring-1 focus:ring-[#FCA311]/30 transition-all placeholder:text-[#14213D]/40 font-medium"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#14213D] hover:bg-[#FCA311] text-white hover:text-[#14213D] text-sm font-semibold py-3 rounded transition-colors mt-2 disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Lock size={16} />
            )}
            {isLoading ? 'Authenticating...' : 'Secure Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-[#14213D]/10 pt-6">
          <p className="text-[11px] font-medium text-[#14213D]/50 flex items-center justify-center gap-2">
            <ShieldAlert size={12} />
            Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
}
