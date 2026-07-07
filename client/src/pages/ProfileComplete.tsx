/**
 * ProfileComplete - Page for users to complete only their missing profile fields
 * Route: /join/complete?token=xxx
 * Shows only the fields that are missing for this specific user.
 * Does NOT require re-filling the entire questionnaire.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useSearch } from "wouter";

const FIELD_LABELS: Record<string, string> = {
  age: "גיל",
  height: "גובה (ס\"מ)",
  city: "עיר מגורים",
  occupation: "עיסוק / תפקיד",
  photoUrl: "תמונת פרופיל",
  lastName: "שם משפחה",
};

type MissingField = "age" | "height" | "city" | "occupation" | "photoUrl" | "lastName";

export default function ProfileComplete() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") || "";

  const { data, isLoading, error } = trpc.singles.getMissingFields.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const updateMutation = trpc.singles.updateMissingFields.useMutation({
    onSuccess: () => setStep("done"),
    onError: (err: any) => setErrorMsg(err.message || "שגיאה בשמירה, נסו שוב"),
  });

  const [step, setStep] = useState<"form" | "submitting" | "done" | "error">("form");
  const [errorMsg, setErrorMsg] = useState("");

  // Form fields
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [city, setCity] = useState("");
  const [occupation, setOccupation] = useState("");
  const [lastName, setLastName] = useState("");
  const [photoBase64, setPhotoBase64] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");

  // Scroll to top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [step]);

  if (!token) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#f0eadc] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-[#191265] mb-2">קישור לא תקין</h1>
          <p className="text-[#555]">הקישור חסר או פג תוקף. אם קיבלת מייל, נסו ללחוץ שוב על הקישור.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#f0eadc] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-[#555]">טוען...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#f0eadc] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-[#191265] mb-2">קישור לא תקין</h1>
          <p className="text-[#555]">לא מצאנו את הפרופיל שלך. ייתכן שהקישור פג תוקף.</p>
        </div>
      </div>
    );
  }

  const { firstName, missingFields } = data;

  if (missingFields.length === 0) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#f0eadc] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-[#191265] mb-2">הפרופיל שלך מלא!</h1>
          <p className="text-[#555]">כל הפרטים שלך מעודכנים. אני עובדת על למצוא לך התאמות מדויקות.</p>
          <p className="text-[#191265] font-medium mt-4">באהבה, הילית 💛</p>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div dir="rtl" className="min-h-screen bg-[#f0eadc] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-xl font-bold text-[#191265] mb-2">תודה רבה!</h1>
          <p className="text-[#555] mb-4">הפרטים עודכנו בהצלחה. עכשיו אני יכולה להתאים לך הצעות טובות יותר.</p>
          <p className="text-[#191265] font-medium">באהבה, הילית 💛</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    setStep("submitting");
    setErrorMsg("");

    const payload: Record<string, any> = { token };

    if (missingFields.includes("age") && age) {
      payload.age = parseInt(age);
    }
    if (missingFields.includes("height") && height) {
      payload.height = parseInt(height);
    }
    if (missingFields.includes("city") && city) {
      payload.city = city;
    }
    if (missingFields.includes("occupation") && occupation) {
      payload.occupation = occupation;
    }
    if (missingFields.includes("lastName") && lastName) {
      payload.lastName = lastName;
    }
    if (missingFields.includes("photoUrl") && photoBase64) {
      payload.photoBase64 = photoBase64;
    }

    // Check at least one field was filled
    const filledCount = Object.keys(payload).filter(k => k !== "token").length;
    if (filledCount === 0) {
      setErrorMsg("יש למלא לפחות שדה אחד");
      setStep("form");
      return;
    }

    updateMutation.mutate(payload as any);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("התמונה גדולה מדי. אנא בחרו תמונה עד 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string || "";
      setPhotoBase64(result);
      setPhotoPreview(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#f0eadc] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">📝</div>
          <h1 className="text-2xl font-black text-[#191265] mb-2">
            היי {firstName}, חסרים לך כמה פרטים
          </h1>
          <p className="text-[#555] text-sm leading-relaxed">
            בלי הפרטים האלה קשה לי למצוא לך התאמות מדויקות.
            <br />
            <strong>אין צורך למלא את כל השאלון מחדש</strong> — רק את מה שחסר.
          </p>
        </div>

        {/* Missing fields indicator */}
        <div className="bg-[#f0eadc] rounded-xl p-3 mb-6">
          <p className="text-xs text-[#727272] mb-1">חסרים לך:</p>
          <div className="flex flex-wrap gap-2">
            {missingFields.map((field) => (
              <span key={field} className="bg-white text-[#191265] text-xs font-medium px-2.5 py-1 rounded-lg border border-[#e9e8e8]">
                {FIELD_LABELS[field] || field}
              </span>
            ))}
          </div>
        </div>

        {/* Form fields - only show what's missing */}
        <div className="space-y-5 mb-6">
          {missingFields.includes("lastName") && (
            <div>
              <label className="block text-[#191265] font-bold text-sm mb-2">שם משפחה</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="למשל: כהן"
                className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] text-[#191265] text-right focus:outline-none focus:border-[#191265] transition-all"
              />
            </div>
          )}

          {missingFields.includes("age") && (
            <div>
              <label className="block text-[#191265] font-bold text-sm mb-2">גיל</label>
              <input
                type="number"
                value={age}
                onChange={e => setAge(e.target.value)}
                min={18} max={80}
                placeholder="למשל: 35"
                className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] text-[#191265] text-right focus:outline-none focus:border-[#191265] transition-all"
              />
            </div>
          )}

          {missingFields.includes("height") && (
            <div>
              <label className="block text-[#191265] font-bold text-sm mb-2">גובה (ס"מ)</label>
              <input
                type="number"
                value={height}
                onChange={e => setHeight(e.target.value)}
                onBlur={e => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 50 && val < 100) {
                    setHeight(String(val + 100));
                  }
                }}
                min={100} max={250}
                placeholder="למשל: 170"
                className={`w-full px-4 py-3 rounded-xl border-2 text-[#191265] text-right focus:outline-none transition-all ${
                  height && (parseInt(height) < 100 || parseInt(height) > 250)
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-[#e9e8e8] focus:border-[#191265]'
                }`}
              />
              {height && parseInt(height) < 100 && parseInt(height) >= 50 && (
                <p className="text-amber-600 text-xs mt-1">נראה שהזנת {height} — האם התכוונת ל-{parseInt(height) + 100} ס"מ?</p>
              )}
            </div>
          )}

          {missingFields.includes("city") && (
            <div>
              <label className="block text-[#191265] font-bold text-sm mb-2">עיר מגורים</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="למשל: תל אביב"
                className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] text-[#191265] text-right focus:outline-none focus:border-[#191265] transition-all"
              />
            </div>
          )}

          {missingFields.includes("occupation") && (
            <div>
              <label className="block text-[#191265] font-bold text-sm mb-2">עיסוק / תפקיד</label>
              <input
                type="text"
                value={occupation}
                onChange={e => setOccupation(e.target.value)}
                placeholder="למשל: מהנדס תוכנה, מורה, עורכת דין..."
                className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] text-[#191265] text-right focus:outline-none focus:border-[#191265] transition-all"
              />
            </div>
          )}

          {missingFields.includes("photoUrl") && (
            <div>
              <label className="block text-[#191265] font-bold text-sm mb-2">תמונת פרופיל</label>
              <p className="text-xs text-[#727272] mb-2">תמונה ברורה של הפנים עוזרת מאוד בתהליך ההתאמה</p>
              <div
                className="border-2 border-dashed border-[#e9e8e8] rounded-xl p-4 text-center cursor-pointer hover:border-[#191265] transition-all"
                onClick={() => document.getElementById("complete-photo-input")?.click()}
              >
                {photoPreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={photoPreview} alt="תמונת פרופיל" className="w-24 h-24 rounded-full object-cover mx-auto" />
                    <p className="text-xs text-green-600 font-medium">התמונה נטענה בהצלחה ✓</p>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPhotoBase64(""); setPhotoPreview(""); }}
                      className="text-xs text-red-500 underline"
                    >
                      הסר תמונה
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <div className="text-3xl">📷</div>
                    <p className="text-sm text-[#727272]">לחצו להעלאת תמונה</p>
                    <p className="text-xs text-[#aaa]">JPG, PNG עד 5MB</p>
                  </div>
                )}
              </div>
              <input
                id="complete-photo-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
          )}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-center">
            <p className="text-red-600 text-sm">{errorMsg}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={step === "submitting"}
          className="w-full bg-[#ffe27c] text-[#191265] font-black text-lg py-4 rounded-2xl hover:bg-[#ffd84a] transition-all duration-300 hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {step === "submitting" ? "שומר..." : "שמירת הפרטים"}
        </button>

        {/* Footer */}
        <p className="text-center text-xs text-[#aaa] mt-4">
          הפרטים שלך מאובטחים ומשמשים אך ורק לצורך התאמות.
        </p>
      </div>
    </div>
  );
}
