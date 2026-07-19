/**
 * Team Login Page — /team/login
 * Simple email/password login for team members (e.g., Sivan)
 * who need CRM/matchmaking access without Manus OAuth.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

export default function TeamLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/team/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "שגיאה בהתחברות");
        setLoading(false);
        return;
      }

      // Store token in localStorage for header-based auth (mobile Safari cookie issues)
      if (data.token) {
        localStorage.setItem("team_token", data.token);
      }

      // Full page reload to ensure cookie is properly sent on next requests
      window.location.href = "/crm/matchmaking";
    } catch (err) {
      setError("שגיאה בהתחברות, נסו שוב");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#191265] to-[#2a1f8a] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">👥</div>
          <h1 className="text-2xl font-black text-[#191265]">כניסת צוות</h1>
          <p className="text-[#727272] text-sm mt-2">הילית כספי — ניהול מאגר</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#191265] font-medium">
              אימייל
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            disabled={loading}
            className="w-full bg-[#191265] hover:bg-[#1800ad] text-white font-bold text-lg py-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] shadow-lg"
          >
            {loading ? "מתחברת..." : "כניסה"}
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
