import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const WHATSAPP_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("Hi Hilit, I have a question about my profile in the singles database.");

export default function EnUserDashboard() {
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    document.title = "My Profile | Match by Hilit";
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center">
        <div className="text-[#191265] text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-6">🔒</div>
          <h1 className="text-2xl font-black text-[#191265] mb-4">Please log in</h1>
          <p className="text-[#555] mb-8">You need to be logged in to view your profile.</p>
          <a href={getLoginUrl()}
            className="bg-[#191265] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#0f0b3d] transition-all">
            Log in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0eadc]">
      {/* NAV */}
      <nav className="bg-[#191265] py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/en" className="text-white font-bold text-xl">Match by Hilit</a>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
            className="bg-[#ffe27c] text-[#191265] font-bold px-4 py-2 rounded-full text-sm hover:bg-white transition-all">
            Contact Hilit
          </a>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-black text-[#191265] mb-2">My Profile</h1>
        <p className="text-[#555] mb-8">Welcome back, {user.name || "friend"}.</p>

        {/* Account Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-[#191265] mb-4">Account</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#727272]">Name</span>
              <span className="font-medium text-[#191265]">{user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#727272]">Email</span>
              <span className="font-medium text-[#191265]">{user.email}</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-[#191265] mb-4">Quick Access</h2>
          <div className="space-y-3">
            <a href="/database" className="flex items-center justify-between p-3 bg-[#f0eadc] rounded-xl hover:bg-[#e8e0d0] transition-all">
              <span className="font-medium text-[#191265]">Singles Database</span>
              <span className="text-[#727272]">→</span>
            </a>
            <a href="/dna" className="flex items-center justify-between p-3 bg-[#f0eadc] rounded-xl hover:bg-[#e8e0d0] transition-all">
              <span className="font-medium text-[#191265]">Relationship DNA Quiz</span>
              <span className="text-[#727272]">→</span>
            </a>
            <a href="/coaching" className="flex items-center justify-between p-3 bg-[#f0eadc] rounded-xl hover:bg-[#e8e0d0] transition-all">
              <span className="font-medium text-[#191265]">Coaching Programs</span>
              <span className="text-[#727272]">→</span>
            </a>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-[#191265]/5 rounded-2xl p-6">
          <h2 className="font-bold text-[#191265] mb-2">Need help?</h2>
          <p className="text-[#555] text-sm mb-4">Reach out directly and Hilit will get back to you.</p>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
            className="inline-block bg-[#25D366] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1da851] transition-all text-sm">
            Message Hilit on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
