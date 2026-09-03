/**
 * Team Login Page — /team/login
 * Uses a native HTML form POST to /api/team/login-form for maximum browser compatibility.
 * The server sets the cookie and redirects to /crm/matchmaking.
 * This approach works on ALL browsers (Chrome, Safari, Firefox) without any JS fetch issues.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TeamLogin() {
  const [error, setError] = useState("");

  // Check URL params for error messages from server redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "invalid") setError("אימייל או סיסמה שגויים");
    else if (err === "missing") setError("יש למלא אימייל וסיסמה");
    else if (err === "server") setError("שגיאה בשרת, נסי שוב");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#191265] to-[#2a1f8a] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">👥</div>
          <h1 className="text-2xl font-black text-[#191265]">כניסת צוות</h1>
          <p className="text-[#727272] text-sm mt-2">הילית כספי — ניהול מאגר</p>
        </div>

        {/* Native HTML form - no JavaScript needed for submission */}
        <form action="/api/team/login-form" method="POST" className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#191265] font-medium">
              אימייל
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              className="text-left"
              dir="ltr"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#191265] font-medium">
              סיסמה
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              dir="ltr"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-[#191265] hover:bg-[#1800ad] text-white font-bold text-lg py-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] shadow-lg"
          >
            כניסה
          </Button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-[#727272] text-xs hover:text-[#191265] transition-colors">
            חזרה לאתר
          </a>
        </div>
      </div>
    </div>
  );
}
