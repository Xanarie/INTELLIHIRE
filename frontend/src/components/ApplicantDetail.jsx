import React, { useEffect, useState } from "react";
import axios from "axios";
import { X, Mail, Briefcase, User, Send } from "lucide-react";

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

  useEffect(() => {
    if (!applicantId) return;
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/applicants/${applicantId}`)
      .then((res) => {
        setApplicant(res.data);
        setSelectedStatus(res.data.hiring_status || "Pre-screening");
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
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
          
          <p className="text-[10px] text-slate-400 italic">
            * Selected applicant will remain in their current column until you click "Confirm Move".
          </p>
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