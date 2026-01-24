import React, { useState } from 'react';
import { Send, Sparkles, FileSearch, MessageSquare, Wand2 } from 'lucide-react';

const AITab = () => {
    const [prompt, setPrompt] = useState("");

    const aiFeatures = [
        { title: "Rank Candidates", desc: "Compare applicants based on job requirements", icon: FileSearch, color: "text-blue-500" },
        { title: "Draft Email", desc: "Generate interview invites or offer letters", icon: MessageSquare, color: "text-emerald-500" },
        { title: "Smart Screen", desc: "Summarize top 5 resumes for any role", icon: Wand2, color: "text-purple-500" },
    ];

    return (
        <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
            {/* AI HERO SECTION */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10 max-w-2xl">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-emerald-500 rounded-lg">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <span className="text-emerald-400 font-bold uppercase tracking-widest text-[10px]">AI Recruitment Intelligence</span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight mb-4">How can I assist your hiring today?</h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8">
                        I can help you rank candidates, summarize interview notes, or generate personalized outreach emails in seconds.
                    </p>
                    
                    <div className="relative group">
                        <input 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g. 'Identify the best 3 candidates for the Frontend role...'"
                            className="w-full bg-white/10 border border-white/10 rounded-2xl py-5 pl-6 pr-16 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all backdrop-blur-md"
                        />
                        <button className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                            <Send size={20} />
                        </button>
                    </div>
                </div>
                
                {/* Decorative AI Brain Icon */}
                <Sparkles className="absolute -right-10 -bottom-10 text-white/5 w-80 h-80" />
            </div>

            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-3 gap-6">
                {aiFeatures.map((feature, idx) => (
                    <button key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5 transition-all text-left group">
                        <feature.icon className={`${feature.color} mb-4 group-hover:scale-110 transition-transform`} size={28} />
                        <h3 className="font-bold text-slate-800 mb-1">{feature.title}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">{feature.desc}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default AITab;