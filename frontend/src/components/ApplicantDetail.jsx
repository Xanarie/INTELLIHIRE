import React, { useEffect, useState } from "react";
import axios from "axios";
import { X, Mail, Briefcase, User, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import ReactMarkdown from "react-markdown"; 

const API_BASE_URL = "http://localhost:8000/api/admin";

const HIRING_STAGES = [
  "Pre-screening",
  "Screening",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
];

const ApplicantDetail = ({ applicantId, onClose, onRefresh }) => {
  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [rerunning, setRerunning] = useState(false); 

  const fetchApplicant = async () => { 
    if (!applicantId) return; 
    setLoading(true); 
    try { 
      const res = await axios.get(`${API_BASE_URL}/applicants/${applicantId}`); 
      setApplicant(res.data); 
      setSelectedStatus(res.data.hiring_status || "Pre-screening"); 
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    } 
  }; 

  useEffect(() => {
    fetchApplicant(); 
  }, [applicantId]); 

  const handleConfirmMove = async () => {
    try {
        setSaving(true);
        await axios.patch(`${API_BASE_URL}/applicants/${applicantId}`, {
            hiring_status: selectedStatus,
        });
      
        await onRefresh(); 
      
        setApplicant(prev => ({ ...prev, hiring_status: selectedStatus }));
        
        console.log("Move confirmed, board refreshed.");
    } catch (err) {
        console.error("Move failed:", err);
    } finally {
        setSaving(false);
    }
};

  // NEW: Run / Re-run Prescreen
  const handleRunPrescreen = async () => {
    try {
      setRerunning(true); 
      await axios.post(
        `${API_BASE_URL}/applicants/${applicantId}/prescreen`
      );
      await fetchApplicant(); 
      await onRefresh();      
    } catch (err) {
      console.error("Prescreen failed:", err);
    } finally {
      setRerunning(false); 
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading candidate...</div>;
  if (!applicant) return null;

  const hasChanged = selectedStatus !== applicant.hiring_status;

  return (
    <Card className="h-full rounded-none border-l shadow-2xl bg-white overflow-y-auto">
      <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 pb-6">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold text-slate-800">
            Candidate Profile
          </CardTitle>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
            ID: #{applicantId}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-200">
          <X className="h-5 w-5 text-slate-500" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-8 pt-6">
        {/* READ-ONLY PERSONAL INFORMATION */}
        <div className="space-y-6">
          <DetailItem 
            label="Full Name" 
            value={`${applicant.f_name} ${applicant.l_name}`} 
            icon={<User className="h-4 w-4 text-[#2A5C9A]" />} 
          />
          <DetailItem 
            label="Email Address" 
            value={applicant.email} 
            icon={<Mail className="h-4 w-4 text-[#2A5C9A]" />} 
          />
          <DetailItem 
            label="Applied Position" 
            value={applicant.applied_position} 
            icon={<Briefcase className="h-4 w-4 text-[#2A5C9A]" />} 
          />
        </div>

        <Separator />

        {/* EDITABLE HIRING STAGE DROPDOWN */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Move to Column
            </label>
          </div>
          
          <Select 
            value={selectedStatus} 
            onValueChange={(value) => setSelectedStatus(value)} // Only updates local state
          >
            <SelectTrigger className="w-full h-12 border-2 border-slate-100 bg-slate-50 font-bold text-[#2A5C9A]">
              <SelectValue placeholder="Select stage..." />
            </SelectTrigger>
    
            <SelectContent className="z-[100]" position="popper" sideOffset={5}>
              {HIRING_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* NEW CONFIRM BUTTON: Only visible if a change is detected */}
          {hasChanged && (
            <Button 
              onClick={handleConfirmMove}
              disabled={saving}
              className="w-full h-12 bg-[#2A5C9A] hover:bg-[#1e4470] text-white font-bold rounded-xl shadow-lg transition-all animate-in slide-in-from-bottom-2"
            >
              {saving ? (
                "Updating..."
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> 
                  Confirm Move to {selectedStatus}
                </>
              )}
            </Button>
          )}

          {/* RUN PRESCREEN BUTTON */}
          <Button
            onClick={handleRunPrescreen}
            disabled={rerunning}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2"
          >
            <Sparkles size={16} />
            {rerunning ? "Running Prescreen..." : "Run Prescreen"}
          </Button>
          
          <p className="text-[10px] text-slate-400 italic">
            * Selected applicant will remain in their current column until you click "Confirm Move".
          </p>
        </div>
      
        {/* IntelliHire AI Prescreening Summary */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            IntelliHire AI Prescreening Summary
          </h3>

          {typeof applicant?.ai_prescreening_summary === "string" &&
          applicant.ai_prescreening_summary.trim().length > 0 ? (
            <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm leading-relaxed">
              <ReactMarkdown>
                {applicant.ai_prescreening_summary || ""}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <p className="text-sm text-slate-500">No prescreening summary yet.</p>
            </div>
          )}
        </div>

        {/* IntelliHire AI Match Scoring */}
        <div className="space-y-2 mt-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            IntelliHire AI Match Insights
          </h3>

          {applicant?.ai_match_json ? (
            <div className="grid grid-cols-3 gap-4">
              {/* Score */}
              <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm text-center">
                <p className="text-xs text-slate-400 uppercase font-bold">Score</p>
                <p className="text-xl font-black text-[#2A5C9A]">
                  {Math.round(applicant.ai_match_json.score)}/100
                </p>
              </div>

              {/* Job Compatibility */}
              <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm text-center">
                <p className="text-xs text-slate-400 uppercase font-bold">
                  Job Compatibility
                </p>
                <p
                  className={`text-sm font-black ${
                    applicant.ai_match_json.bucket === "Qualified"
                      ? "text-green-600"
                      : applicant.ai_match_json.bucket === "Borderline"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {applicant.ai_match_json.bucket}
                </p>
              </div>

              {/* Suggested Role */}
              <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm text-center">
                <p className="text-xs text-slate-400 uppercase font-bold">
                  Suggested Role
                </p>
                <p className="text-sm font-bold text-slate-700">
                  {applicant.applied_position || "—"}
                </p>
              </div>
            </div>
            ) : (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <p className="text-sm text-slate-500">
                No AI match data available yet.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const DetailItem = ({ label, value, icon }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
      {icon}
      <span className="text-sm font-bold text-slate-700">{value || "N/A"}</span>
    </div>
  </div>
);

export default ApplicantDetail;