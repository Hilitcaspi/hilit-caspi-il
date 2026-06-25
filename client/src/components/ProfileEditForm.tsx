/**
 * ProfileEditForm - allows singles to submit a profile update request
 * All changes go through Hilit's approval before being applied
 */
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";

interface ProfileEditFormProps {
  profile: any;
  token: string;
  onClose: () => void;
  onSubmitted: () => void;
}

const EDUCATION_OPTIONS = [
  { value: "high_school", label: "תיכון" },
  { value: "vocational", label: "הכשרה מקצועית / תעודה" },
  { value: "technician", label: "הנדסאי" },
  { value: "student", label: "סטודנט/ית (לומד/ת כרגע)" },
  { value: "bachelor", label: "תואר ראשון" },
  { value: "master", label: "תואר שני" },
  { value: "phd", label: "דוקטורט" },
  { value: "other", label: "אחר" },
];

const RELIGIOSITY_OPTIONS = [
  { value: "secular", label: "חילוני/ת" },
  { value: "traditional", label: "מסורתי/ת" },
  { value: "religious", label: "דתי/ת" },
  { value: "orthodox", label: "חרדי/ת" },
];

const MARITAL_OPTIONS = [
  { value: "single", label: "רווק/ה" },
  { value: "divorced", label: "גרוש/ה" },
  { value: "widowed", label: "אלמן/ה" },
];

const WANTS_KIDS_OPTIONS = [
  { value: "yes", label: "כן" },
  { value: "no", label: "לא" },
  { value: "open", label: "פתוח/ה לאפשרות" },
];

const STEP_PARENT_OPTIONS = [
  { value: "yes", label: "כן, בשמחה" },
  { value: "open", label: "תלוי בנסיבות" },
  { value: "no", label: "לא" },
];

const PACE_OPTIONS = [
  { value: "slow", label: "אט אט" },
  { value: "medium", label: "בקצב סביר" },
  { value: "fast", label: "מהר" },
];

export default function ProfileEditForm({ profile, token, onClose, onSubmitted }: ProfileEditFormProps) {
  const [form, setForm] = useState({
    height: profile.height || "",
    education: profile.education || "",
    religiosity: profile.religiosity || "",
    occupation: profile.occupation || "",
    aboutMe: profile.about || "",
    partnerDescription: profile.partnerDescription || "",
    city: profile.city || "",
    maritalStatus: profile.maritalStatus || "",
    wantsChildren: profile.wantsKids || "",
    hasChildren: profile.hasKids || false,
    numberOfChildren: profile.numKids || 0,
    hasPets: profile.hasPets || false,
    petType: profile.petType || "",
    acceptsPets: profile.acceptsPets != null ? String(profile.acceptsPets) : "",
    minAgePreference: profile.minAgePreference || "",
    maxAgePreference: profile.maxAgePreference || "",
    minHeightPreference: profile.minHeightPreference || "",
    maxHeightPreference: profile.maxHeightPreference || "",
    stepParentOpenness: profile.stepParentOpenness || "",
    relationshipPace: profile.relationshipPace || "",
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(profile.photoUrl || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitMutation = trpc.profileUpdates.submit.useMutation();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("התמונה גדולה מדי. מקסימום 5MB.");
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (): Promise<string | undefined> => {
    if (!photoFile) return undefined;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", photoFile);
      const res = await fetch("/api/upload-photo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data.url;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let photoUrl: string | undefined;
    if (photoFile) {
      photoUrl = await uploadPhoto();
    }

    const changes: Record<string, any> = {};
    if (form.height) changes.height = Number(form.height);
    if (form.education) changes.education = form.education;
    if (form.religiosity) changes.religiosity = form.religiosity;
    if (form.occupation) changes.occupation = form.occupation;
    if (form.aboutMe) changes.aboutMe = form.aboutMe;
    if (form.partnerDescription) changes.partnerDescription = form.partnerDescription;
    if (form.city) changes.city = form.city;
    if (form.maritalStatus) changes.maritalStatus = form.maritalStatus;
    if (form.wantsChildren) changes.wantsChildren = form.wantsChildren;
    changes.hasChildren = form.hasChildren;
    if (form.hasChildren) changes.numberOfChildren = Number(form.numberOfChildren);
    changes.hasPets = form.hasPets;
    if (form.hasPets && form.petType) changes.petType = form.petType;
    if (form.acceptsPets !== "") changes.acceptsPets = form.acceptsPets === "true";
    if (form.minAgePreference) changes.minAgePreference = Number(form.minAgePreference);
    if (form.maxAgePreference) changes.maxAgePreference = Number(form.maxAgePreference);
    if (form.minHeightPreference) changes.minHeightPreference = Number(form.minHeightPreference);
    if (form.maxHeightPreference) changes.maxHeightPreference = Number(form.maxHeightPreference);
    if (form.stepParentOpenness) changes.stepParentOpenness = form.stepParentOpenness;
    if (form.relationshipPace) changes.relationshipPace = form.relationshipPace;
    if (photoUrl) changes.photoUrl = photoUrl;

    await submitMutation.mutateAsync({ token, changes });
    onSubmitted();
  };

  const isSubmitting = submitMutation.isPending || uploading;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#f0f0f0] px-5 py-4 flex items-center justify-between z-10">
          <button onClick={onClose} className="text-[#727272] hover:text-[#191265] text-sm font-medium">ביטול</button>
          <h2 className="font-black text-[#191265] text-lg">עדכון פרופיל</h2>
          <div className="w-12" />
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-6">
          {/* Notice */}
          <div className="bg-[#f0eadc] rounded-xl p-4 text-sm text-[#555] text-right">
            <p className="font-bold text-[#191265] mb-1">📋 שים/י לב</p>
            <p>השינויים יישלחו להילית לאישור לפני שיופיעו בפרופיל שלך. בדרך כלל תוך 24 שעות.</p>
          </div>

          {/* Photo */}
          <div>
            <p className="text-sm font-bold text-[#191265] mb-3">תמונה</p>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#ffe27c] shrink-0">
                {photoPreview ? (
                  <img src={photoPreview} alt="תצוגה מקדימה" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#f0eadc] flex items-center justify-center text-3xl">
                    {profile.firstName?.[0] || "?"}
                  </div>
                )}
              </div>
              <div>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="bg-[#191265] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#1800ad] transition-colors">
                  {photoPreview ? "החלף תמונה" : "העלה תמונה"}
                </button>
                <p className="text-xs text-[#aaa] mt-1">JPG/PNG עד 5MB</p>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div>
            <p className="text-sm font-bold text-[#191265] mb-3 border-b border-[#f0f0f0] pb-2">פרטים אישיים</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#727272] block mb-1">עיר מגורים</label>
                <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#191265]" />
              </div>
              <div>
                <label className="text-xs text-[#727272] block mb-1">גובה (ס"מ)</label>
                <input type="number" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                  min={140} max={220}
                  className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#191265]" />
              </div>
              <div>
                <label className="text-xs text-[#727272] block mb-1">השכלה</label>
                <select value={form.education} onChange={e => setForm(f => ({ ...f, education: e.target.value }))}
                  className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#191265] bg-white">
                  <option value="">בחר/י</option>
                  {EDUCATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#727272] block mb-1">זהות דתית</label>
                <select value={form.religiosity} onChange={e => setForm(f => ({ ...f, religiosity: e.target.value }))}
                  className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#191265] bg-white">
                  <option value="">בחר/י</option>
                  {RELIGIOSITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#727272] block mb-1">מצב משפחתי</label>
                <select value={form.maritalStatus} onChange={e => setForm(f => ({ ...f, maritalStatus: e.target.value }))}
                  className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#191265] bg-white">
                  <option value="">בחר/י</option>
                  {MARITAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#727272] block mb-1">עיסוק</label>
                <input type="text" value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))}
                  className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#191265]" />
              </div>
            </div>
          </div>

          {/* About */}
          <div>
            <p className="text-sm font-bold text-[#191265] mb-3 border-b border-[#f0f0f0] pb-2">על עצמי ועל מה שאני מחפש/ת</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#727272] block mb-1">ספר/י על עצמך</label>
                <textarea value={form.aboutMe} onChange={e => setForm(f => ({ ...f, aboutMe: e.target.value }))}
                  rows={3} placeholder="מה חשוב לך שהצד השני ידע עלייך?"
                  className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#191265] resize-none" />
              </div>
              <div>
                <label className="text-xs text-[#727272] block mb-1">מה אני מחפש/ת בבן/בת זוג</label>
                <textarea value={form.partnerDescription} onChange={e => setForm(f => ({ ...f, partnerDescription: e.target.value }))}
                  rows={3} placeholder="תאר/י את בן/בת הזוג האידיאלי/ת עבורך"
                  className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#191265] resize-none" />
              </div>
            </div>
          </div>

          {/* Family */}
          <div>
            <p className="text-sm font-bold text-[#191265] mb-3 border-b border-[#f0f0f0] pb-2">משפחה וילדים</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#727272] block mb-1">רצון בילדים</label>
                <select value={form.wantsChildren} onChange={e => setForm(f => ({ ...f, wantsChildren: e.target.value }))}
                  className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#191265] bg-white">
                  <option value="">בחר/י</option>
                  {WANTS_KIDS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-[#555] flex-1">יש לי ילדים</label>
                <button type="button" onClick={() => setForm(f => ({ ...f, hasChildren: !f.hasChildren }))}
                  className={`w-12 h-6 rounded-full transition-colors ${form.hasChildren ? "bg-[#191265]" : "bg-[#e0e0e0]"} relative`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.hasChildren ? "right-1" : "left-1"}`} />
                </button>
              </div>
              {form.hasChildren && (
                <div>
                  <label className="text-xs text-[#727272] block mb-1">מספר ילדים</label>
                  <input type="number" value={form.numberOfChildren} onChange={e => setForm(f => ({ ...f, numberOfChildren: Number(e.target.value) }))}
                    min={0} max={10}
                    className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#191265]" />
                </div>
              )}
              {(form.maritalStatus === "divorced" || form.maritalStatus === "widowed") && (
                <div>
                  <label className="text-xs text-[#727272] block mb-1">פתיחות להיות הורה חורג</label>
                  <select value={form.stepParentOpenness} onChange={e => setForm(f => ({ ...f, stepParentOpenness: e.target.value }))}
                    className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#191265] bg-white">
                    <option value="">בחר/י</option>
                    {STEP_PARENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Pets */}
          <div>
            <p className="text-sm font-bold text-[#191265] mb-3 border-b border-[#f0f0f0] pb-2">חיות מחמד</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-[#555] flex-1">יש לי חיית מחמד</label>
                <button type="button" onClick={() => setForm(f => ({ ...f, hasPets: !f.hasPets }))}
                  className={`w-12 h-6 rounded-full transition-colors ${form.hasPets ? "bg-[#191265]" : "bg-[#e0e0e0]"} relative`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.hasPets ? "right-1" : "left-1"}`} />
                </button>
              </div>
              {form.hasPets && (
                <div>
                  <label className="text-xs text-[#727272] block mb-1">איזה חיית מחמד?</label>
                  <input type="text" value={form.petType} onChange={e => setForm(f => ({ ...f, petType: e.target.value }))}
                    placeholder="כלב, חתול..."
                    className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#191265]" />
                </div>
              )}
              <div>
                <label className="text-xs text-[#727272] block mb-1">פתיחות לבן/בת זוג עם חיית מחמד</label>
                <select value={form.acceptsPets} onChange={e => setForm(f => ({ ...f, acceptsPets: e.target.value }))}
                  className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#191265] bg-white">
                  <option value="">בחר/י</option>
                  <option value="true">כן, בסדר גמור</option>
                  <option value="false">לא, מעדיף/ה בלי</option>
                </select>
              </div>
            </div>
          </div>

          {/* Partner Preferences */}
          <div>
            <p className="text-sm font-bold text-[#191265] mb-3 border-b border-[#f0f0f0] pb-2">העדפות לבן/בת זוג</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#727272] block mb-1">גיל מינימלי</label>
                <input type="number" value={form.minAgePreference} onChange={e => setForm(f => ({ ...f, minAgePreference: e.target.value }))}
                  min={18} max={99}
                  className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#191265]" />
              </div>
              <div>
                <label className="text-xs text-[#727272] block mb-1">גיל מקסימלי</label>
                <input type="number" value={form.maxAgePreference} onChange={e => setForm(f => ({ ...f, maxAgePreference: e.target.value }))}
                  min={18} max={99}
                  className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#191265]" />
              </div>
              <div>
                <label className="text-xs text-[#727272] block mb-1">גובה מינימלי (ס"מ)</label>
                <input type="number" value={form.minHeightPreference} onChange={e => setForm(f => ({ ...f, minHeightPreference: e.target.value }))}
                  min={140} max={220}
                  className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#191265]" />
              </div>
              <div>
                <label className="text-xs text-[#727272] block mb-1">גובה מקסימלי (ס"מ)</label>
                <input type="number" value={form.maxHeightPreference} onChange={e => setForm(f => ({ ...f, maxHeightPreference: e.target.value }))}
                  min={140} max={220}
                  className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#191265]" />
              </div>
            </div>
          </div>

          {/* Relationship Pace */}
          <div>
            <p className="text-sm font-bold text-[#191265] mb-3 border-b border-[#f0f0f0] pb-2">קצב הזוגיות</p>
            <select value={form.relationshipPace} onChange={e => setForm(f => ({ ...f, relationshipPace: e.target.value }))}
              className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#191265] bg-white">
              <option value="">בחר/י</option>
              {PACE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Submit */}
          <div className="pb-4">
            <button type="submit" disabled={isSubmitting}
              className="w-full bg-[#191265] text-white font-black text-lg py-4 rounded-2xl hover:bg-[#1800ad] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? "שולח/ת בקשה..." : "שלח/י לאישור הילית ✓"}
            </button>
            {submitMutation.isError && (
              <p className="text-red-500 text-sm text-center mt-2">שגיאה בשליחה. נסה/י שוב.</p>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
