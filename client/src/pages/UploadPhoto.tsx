import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Public page: /upload-photo?token=XXXX
 * Allows a single to upload their profile photo using a unique token.
 */
export default function UploadPhoto() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch single info by token
  const { data, isLoading, error: fetchError } = trpc.photoUpload.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const saveMutation = trpc.photoUpload.savePhoto.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setUploading(false);
    },
    onError: (err: { message?: string }) => {
      setError(err.message || "שגיאה בשמירת התמונה");
      setUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError("הקובץ גדול מדי (מקסימום 5MB)");
      return;
    }
    setFile(f);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleUpload = async () => {
    if (!file || !token) return;
    setUploading(true);
    setError(null);

    try {
      // Upload the file to the server
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-photo", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("שגיאה בהעלאת הקובץ");
      const { url } = await res.json();

      // Save the photo URL to the single's profile
      saveMutation.mutate({ token, photoUrl: url });
    } catch (err: any) {
      setError(err.message || "שגיאה בהעלאת התמונה");
      setUploading(false);
    }
  };

  // No token
  if (!token) {
    return (
      <PageWrapper>
        <ErrorCard message="קישור לא תקין. אם קיבלת מייל עם קישור להעלאת תמונה, לחץ עליו שוב." />
      </PageWrapper>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <PageWrapper>
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-[#191265] border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-600">טוען...</p>
        </div>
      </PageWrapper>
    );
  }

  // Token invalid or expired
  if (fetchError || !data) {
    return (
      <PageWrapper>
        <ErrorCard message="הקישור פג תוקף או לא תקין. אם את/ה צריך/ה קישור חדש, צור/י קשר עם הילית." />
      </PageWrapper>
    );
  }

  // Success state
  if (success) {
    return (
      <PageWrapper>
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#191265] mb-2">התמונה הועלתה בהצלחה!</h2>
          <p className="text-gray-600">תודה רבה, הפרופיל שלך עודכן. עכשיו נוכל ליצור לך התאמות מדויקות יותר.</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-[#191265] text-center mb-2">
          היי {data.firstName}!
        </h1>
        <p className="text-gray-600 text-center mb-6">
          חסרה לנו רק התמונה שלך כדי שנוכל ליצור לך התאמות מדויקות.
          <br />
          העלאת תמונה לוקחת דקה אחת בלבד.
        </p>

        {/* Existing photo */}
        {data.existingPhotoUrl && (
          <div className="mb-4 text-center">
            <p className="text-sm text-gray-500 mb-2">התמונה הנוכחית שלך:</p>
            <img
              src={data.existingPhotoUrl}
              alt="Current"
              className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-gray-200"
            />
          </div>
        )}

        {/* Upload area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#191265] transition-colors"
        >
          {preview ? (
            <img src={preview} alt="Preview" className="w-32 h-32 rounded-full object-cover mx-auto" />
          ) : (
            <>
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500">לחץ כאן לבחירת תמונה</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG עד 5MB</p>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {error && (
          <p className="text-red-500 text-sm text-center mt-3">{error}</p>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full mt-6 py-3 px-6 rounded-xl font-bold text-[#191265] bg-[#ffe27c] hover:bg-[#ffd84a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? "מעלה..." : "העלאת תמונה לפרופיל"}
        </button>

        <p className="text-xs text-gray-400 text-center mt-4">
          הילית כספי | מאגר רווקים ורווקות
        </p>
      </div>
    </PageWrapper>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center p-4" dir="rtl">
      {children}
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <p className="text-gray-700">{message}</p>
    </div>
  );
}
