import { motion } from 'framer-motion';
import { ShieldAlert, Map, LineChart, BellRing, Users, ArrowRight, BrainCircuit } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  { icon: <BrainCircuit className="w-5 h-5" />, title: "AI/ML Prediction", desc: "Delay probability & risk scoring" },
  { icon: <Map className="w-5 h-5" />, title: "GIS Risk Map", desc: "Interactive visualization of project risks" },
  { icon: <LineChart className="w-5 h-5" />, title: "Analytics Dashboard", desc: "State & district-wise trends" },
  { icon: <BellRing className="w-5 h-5" />, title: "Smart Alerts", desc: "Real-time escalation notifications" },
  { icon: <Users className="w-5 h-5" />, title: "Collaborative Workflows", desc: "Inter-department coordination" },
  { icon: <ShieldAlert className="w-5 h-5" />, title: "Explainable AI", desc: "Transparent delay driver analysis" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#E5E5E5] text-[#14213D] font-sans selection:bg-[#FCA311]/30 selection:text-[#14213D] overflow-hidden relative">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#14213D]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg tracking-tight text-white">
            <div className="w-7 h-7 rounded-lg bg-[#FCA311] flex items-center justify-center text-[#14213D] shadow-[0_0_15px_rgba(252,163,17,0.4)]">
              <Map className="w-4 h-4" />
            </div>
            Predixa
          </div>
          <div className="flex items-center gap-6">

            <Link to="/login" className="h-9 px-5 rounded-full bg-[#FCA311] hover:bg-[#e5940f] text-[#14213D] text-sm font-bold transition-all shadow-sm flex items-center">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Wrapper for Hero and Marquee with Background Image */}
      <div 
        className="relative w-full min-h-screen flex flex-col"
        style={{
          backgroundImage: `url('/bg-image.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Navy overlay for readability */}
        <div className="absolute inset-0 bg-[#14213D]/85 z-0 pointer-events-none" />
        
        {/* Subtle Grid Background Pattern overlay */}
        <div 
          className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none mix-blend-overlay" 
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%23ffffff' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Hero Section */}
        <main className="flex-1 pt-32 pb-16 px-6 relative z-10 flex flex-col items-center justify-center overflow-hidden">
          
          {/* Subtle glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FCA311]/20 blur-[150px] rounded-full pointer-events-none z-0" />
          
          <div className="max-w-5xl mx-auto text-center relative z-10 flex flex-col items-center">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-medium mb-8 backdrop-blur-xl shadow-lg"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FCA311] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FCA311]"></span>
              </span>
              <span>System Active</span> <span className="text-white/40 mx-1">|</span> PS-26017
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl md:text-7xl font-semibold tracking-tighter text-balance mb-6 text-white leading-[1.05]"
            >
              Predict land acquisition delays <br className="hidden md:block"/>
              <span className="text-[#FCA311] drop-shadow-[0_0_15px_rgba(252,163,17,0.3)]">before they happen.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 text-balance leading-relaxed"
            >
              An AI-enabled decision support platform to detect, predict, and manage potential delays for infrastructure projects using advanced machine learning and geospatial data.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4 w-full"
            >
              <Link 
                to="/dashboard"
                className="group flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-[#FCA311] text-[#000000] font-bold text-base hover:bg-[#e5940f] transition-all shadow-[0_0_20px_-5px_rgba(252,163,17,0.5)] hover:-translate-y-0.5 w-full sm:w-auto"
              >
                Launch Dashboard
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

            </motion.div>
          </div>
        </main>

        {/* Horizontal Scroll Banner section */}
        <section className="py-6 border-t border-white/10 bg-[#14213D]/60 backdrop-blur-xl overflow-hidden relative z-10 mt-auto">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#14213D] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#14213D] to-transparent z-10 pointer-events-none"></div>
          
          <div className="flex w-fit animate-marquee">
            {/* Set 1 */}
            <div className="flex shrink-0 items-center gap-12 px-6">
              {features.map((item, i) => (
                <div key={`set1-${i}`} className="flex items-center gap-4 text-white hover:text-[#FCA311] transition-colors cursor-default">
                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 text-[#FCA311]">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                  </div>
                </div>
              ))}
            </div>
            {/* Set 2 */}
            <div className="flex shrink-0 items-center gap-12 px-6">
              {features.map((item, i) => (
                <div key={`set2-${i}`} className="flex items-center gap-4 text-white hover:text-[#FCA311] transition-colors cursor-default">
                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 text-[#FCA311]">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                  </div>
                </div>
              ))}
            </div>
            {/* Set 3 */}
            <div className="flex shrink-0 items-center gap-12 px-6">
              {features.map((item, i) => (
                <div key={`set3-${i}`} className="flex items-center gap-4 text-white hover:text-[#FCA311] transition-colors cursor-default">
                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 text-[#FCA311]">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                  </div>
                </div>
              ))}
            </div>
            {/* Set 4 */}
            <div className="flex shrink-0 items-center gap-12 px-6">
              {features.map((item, i) => (
                <div key={`set4-${i}`} className="flex items-center gap-4 text-white hover:text-[#FCA311] transition-colors cursor-default">
                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 text-[#FCA311]">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Grid Features - High End Light Bento Grid (White, Navy, Gold Palette) */}
      <section className="py-32 px-6 max-w-[1400px] mx-auto relative z-10 bg-[#E5E5E5]">
        <div className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-3xl">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tighter text-[#14213D] mb-6 leading-[1.1]">
              Shifting from <span className="text-[#14213D]/50">reactive</span> <br/>
              to <span className="text-[#FCA311]">proactive</span>.
            </h2>
            <p className="text-xl text-[#14213D]/70 leading-relaxed max-w-2xl">
              Our model identifies high-risk projects early, allowing administrators to take corrective action before deadlines are impacted.
            </p>
          </div>
          <button className="flex items-center gap-2 h-12 px-6 rounded-full bg-[#14213D] hover:bg-[#000000] text-white text-sm font-medium transition-all w-fit shadow-md">
            Explore Documentation <ArrowRight className="w-4 h-4 text-[#FCA311]" />
          </button>
        </div>

        {/* 5-Cell Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-6 auto-rows-[300px]">
          
          {/* Cell 1: Explainable AI (2x2) */}
          <div className="col-span-1 md:col-span-2 row-span-2 bg-[#FFFFFF] rounded-[2.5rem] p-10 relative overflow-hidden group border border-[#E5E5E5] shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FCA311]/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-[#FFFFFF] rounded-2xl flex items-center justify-center text-[#FCA311] mb-6 shadow-sm border border-[#E5E5E5]">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <h3 className="text-2xl md:text-3xl font-semibold mb-3 text-[#14213D] tracking-tight">Explainable AI Predictions</h3>
                <p className="text-[#14213D]/70 leading-relaxed max-w-sm text-base">
                  Generate project-wise risk scores and identify major drivers of delay using SHAP-based machine learning models.
                </p>
              </div>
              
              {/* Complex Inner UI Component */}
              <div className="bg-[#FFFFFF] rounded-[2rem] border border-[#E5E5E5] p-6 flex flex-col gap-5 relative overflow-hidden mt-8 shadow-xl shadow-[#14213D]/5">
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-xs font-bold text-[#14213D]/60 uppercase tracking-widest">Project Risk Score</span>
                  <span className="text-xs font-bold text-[#14213D] flex items-center gap-2 bg-[#FCA311]/20 border border-[#FCA311]/30 px-3 py-1.5 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FCA311] animate-pulse"></div>
                    84% High Risk
                  </span>
                </div>
                <div className="w-full bg-[#E5E5E5] rounded-full h-2 relative z-10 overflow-hidden">
                  <div className="bg-[#FCA311] h-full rounded-full w-[84%] relative"></div>
                </div>
                <div className="space-y-2 mt-2 relative z-10">
                  <div className="flex items-center gap-4 text-sm text-[#14213D] font-semibold bg-[#E5E5E5]/30 p-3.5 rounded-2xl">
                    <div className="w-6 h-6 rounded-full bg-[#14213D] flex items-center justify-center text-white text-xs font-bold">1</div> 
                    Legal Dispute 
                    <span className="ml-auto text-[#14213D]/60 font-semibold">+32%</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-[#14213D] font-semibold bg-[#E5E5E5]/30 p-3.5 rounded-2xl">
                    <div className="w-6 h-6 rounded-full bg-[#14213D] flex items-center justify-center text-white text-xs font-bold">2</div> 
                    Document Pending 
                    <span className="ml-auto text-[#14213D]/60 font-semibold">+15%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cell 2: GIS Map (1x2) - Dark Navy Contrast Card */}
          <div className="col-span-1 md:col-span-1 row-span-2 bg-[#14213D] rounded-[2.5rem] p-8 relative overflow-hidden group shadow-lg flex flex-col justify-between">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'2\' cy=\'2\' r=\'1\' fill=\'rgba(255,255,255,0.05)\'/%3E%3C/svg%3E')]"></div>
            
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-center text-[#FCA311] mb-6 backdrop-blur-md">
                <Map className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 tracking-tight text-white">GIS Risk Mapping</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Visualize high-risk projects state-wise to allocate resources effectively.
              </p>
            </div>
            
            <div className="w-full h-48 rounded-[1.5rem] border border-white/10 bg-[#000000]/20 flex items-center justify-center relative overflow-hidden mt-8 z-10 shadow-inner">
               <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
               <div className="relative w-full h-full">
                  <div className="absolute top-1/3 left-1/3 w-3 h-3 rounded-full bg-[#FCA311] shadow-[0_0_20px_rgba(252,163,17,0.8)] animate-pulse">
                    <div className="absolute inset-0 rounded-full bg-[#FCA311] animate-ping opacity-50"></div>
                  </div>
                  <div className="absolute top-2/3 left-1/2 w-2 h-2 rounded-full bg-white opacity-60"></div>
                  <div className="absolute top-1/4 right-1/4 w-2 h-2 rounded-full bg-white opacity-40"></div>
                  
                  <div className="absolute bottom-3 left-3 right-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-3">
                    <div className="text-[9px] uppercase tracking-widest text-white/70 mb-0.5">Active Region</div>
                    <div className="text-xs font-semibold text-white">District 12 (Critical)</div>
                  </div>
               </div>
            </div>
          </div>

          {/* Cell 3: Smart Alerts (1x1) */}
          <div className="col-span-1 md:col-span-1 row-span-1 bg-[#FFFFFF] rounded-[2.5rem] p-8 relative overflow-hidden group border border-[#E5E5E5] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="relative z-10">
              <div className="w-10 h-10 bg-[#FCA311]/10 rounded-xl flex items-center justify-center text-[#FCA311] mb-5">
                <BellRing className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-[#14213D]">Smart Alerts</h3>
              <p className="text-[#14213D]/60 text-sm leading-relaxed">
                Real-time escalation notifications for impending delays.
              </p>
            </div>
          </div>

          {/* Cell 4: Analytics (1x1) */}
          <div className="col-span-1 md:col-span-1 row-span-1 bg-[#FFFFFF] rounded-[2.5rem] p-8 relative overflow-hidden group border border-[#E5E5E5] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="relative z-10">
              <div className="w-10 h-10 bg-[#14213D]/5 rounded-xl flex items-center justify-center text-[#14213D] mb-5">
                <LineChart className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-[#14213D]">Analytics</h3>
              <p className="text-[#14213D]/60 text-sm leading-relaxed">
                State & district-wise trend analysis dashboards.
              </p>
            </div>
            {/* Minimal chart visual */}
            <div className="flex items-end gap-2 h-12 mt-4 opacity-50 group-hover:opacity-100 transition-opacity">
              <div className="w-full bg-[#E5E5E5] rounded-t-sm h-[40%]"></div>
              <div className="w-full bg-[#E5E5E5] rounded-t-sm h-[60%]"></div>
              <div className="w-full bg-[#14213D]/40 rounded-t-sm h-[80%]"></div>
              <div className="w-full bg-[#FCA311] rounded-t-sm h-[100%] shadow-[0_0_15px_rgba(252,163,17,0.3)]"></div>
            </div>
          </div>

          {/* Cell 5: Collaboration (2x1) */}
          <div className="col-span-1 md:col-span-2 row-span-1 bg-[#FFFFFF] rounded-[2.5rem] p-8 md:px-10 relative overflow-hidden group border border-[#E5E5E5] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-center">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#FFFFFF] rounded-xl border border-[#E5E5E5] shadow-sm flex items-center justify-center text-[#14213D]">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#14213D]">Collaborative Workflows</h3>
                </div>
                <p className="text-[#14213D]/70 text-sm leading-relaxed max-w-sm">
                  Seamless inter-department coordination with automated task routing and approvals.
                </p>
              </div>
              
              {/* Avatars */}
              <div className="flex -space-x-3">
                <div className="w-12 h-12 rounded-full border-2 border-[#FFFFFF] bg-[#14213D] flex items-center justify-center text-xs font-bold text-white shadow-sm z-30">JD</div>
                <div className="w-12 h-12 rounded-full border-2 border-[#FFFFFF] bg-[#14213D]/90 flex items-center justify-center text-xs font-bold text-white shadow-sm z-20">AL</div>
                <div className="w-12 h-12 rounded-full border-2 border-[#FFFFFF] bg-[#14213D]/80 flex items-center justify-center text-xs font-bold text-white shadow-sm z-10">MK</div>
                <div className="w-12 h-12 rounded-full border-2 border-[#FFFFFF] bg-[#FCA311] flex items-center justify-center text-xs font-bold text-[#14213D] shadow-sm z-0">+4</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-[#14213D] relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold text-lg tracking-tight text-white">
            <Map className="w-5 h-5 text-[#FCA311]" />
            Predixa
          </div>
          <p className="text-sm text-white/60 font-medium">Predixa — AI-Enabled Land Acquisition Support. Built for SIH PS-26017.</p>
          <div className="flex items-center gap-4 text-sm text-white/60">
            <button className="hover:text-[#FCA311] transition-colors">Privacy</button>
            <button className="hover:text-[#FCA311] transition-colors">Terms</button>
          </div>
        </div>
      </footer>

    </div>
  );
}
