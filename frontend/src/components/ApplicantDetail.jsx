{/* SIDE PANELS */}
import React, { useEffect, useState } from "react";
import axios from "axios";
import { X, Save, Edit3, Mail, Briefcase } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const API_BASE_URL = "http://localhost:8000/api/admin";

const HIRING_STAGES = [
  "Applied",
  "1st Interview",
  "2nd Interview",
  "Final Interview",
  "Hired",
  "Failed",
];

const ApplicantDetail = ({ applicantId, onClose, onRefresh }) => {
  const [applicant, setApplicant] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    f_name: "",
    l_name: "",
    email: "",
    applied_position: "",
    hiring_status: "",
  });

  useEffect(() => {
    if (!applicantId) return;

    axios
      .get(`${API_BASE_URL}/applicants/${applicantId}`)
      .then((res) => {
        setApplicant(res.data);
        setFormData({
          f_name: res.data.f_name ?? "",
          l_name: res.data.l_name ?? "",
          email: res.data.email ?? "",
          applied_position: res.data.applied_position ?? "",
          hiring_status: res.data.hiring_status ?? "Applied",
        });
      })
      .catch((err) => console.error(err));
  }, [applicantId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.patch(`${API_BASE_URL}/applicants/${applicantId}`, formData);
      setIsEditing(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  if (!applicant)
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-sm text-muted-foreground">
          Loading applicant...
        </span>
      </div>
    );

  return (
    <Card className="h-full rounded-none border-l">
      {/* HEADER */}
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>
            {isEditing
              ? "Edit Applicant"
              : `${applicant.f_name} ${applicant.l_name}`}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Candidate Overview
          </p>
        </div>

        <div className="flex gap-2">
          {!isEditing && (
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <Separator />

      {/* BODY */}
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name">
            {isEditing ? (
              <Input
                value={formData.f_name}
                onChange={(e) =>
                  setFormData({ ...formData, f_name: e.target.value })
                }
              />
            ) : (
              applicant.f_name
            )}
          </Field>

          <Field label="Last Name">
            {isEditing ? (
              <Input
                value={formData.l_name}
                onChange={(e) =>
                  setFormData({ ...formData, l_name: e.target.value })
                }
              />
            ) : (
              applicant.l_name
            )}
          </Field>
        </div>

        <Field label="Email">
          {isEditing ? (
            <Input
              icon={<Mail className="h-4 w-4" />}
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          ) : (
            applicant.email
          )}
        </Field>

        <Field label="Applied Position">
          {isEditing ? (
            <Input
              value={formData.applied_position}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  applied_position: e.target.value,
                })
              }
            />
          ) : (
            applicant.applied_position
          )}
        </Field>

        <Field label="Hiring Stage">
          <Select
            disabled={!isEditing}
            value={formData.hiring_status}
            onValueChange={(value) =>
              setFormData({ ...formData, hiring_status: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HIRING_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </CardContent>

      {/* FOOTER */}
      {isEditing && (
        <>
          <Separator />
          <div className="p-4 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};

const Field = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-muted-foreground">
      {label}
    </label>
    <div className="text-sm font-medium">{children}</div>
  </div>
);

export default ApplicantDetail;
