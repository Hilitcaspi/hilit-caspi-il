import { useEffect } from "react";

const WHATSAPP_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("Hi Hilit, I just purchased the guide and would love your help getting started!");

export default function EnThankYouDigital() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Your Guide is Ready | Match by Hilit";
  }, []);

  return (
    <div className="min-h-screen bg-[#f0eadc] flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full text-center">
        <div className="text-6xl mb-6">📖</div>
        <h1 className="text-3xl md:text-4xl font-black text-[#191265] mb-4">
          Your guide is on its way!
        </h1>
        <p className="text-[#444] text-lg leading-relaxed mb-8">
          Check your inbox for an email with your access link. If you do not see it within a few minutes, check your spam folder.
        </p>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h3 className="font-bold text-[#191265] mb-4">Getting the most from your guide</h3>
          <div className="space-y-3 text-left">
            {[
              "Read it in a quiet place where you can reflect",
              "Take notes as you go through each section",
              "Apply one insight at a time, do not rush",
              "Revisit it after a week with fresh eyes",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-[#ffe27c] font-bold mt-0.5">✓</span>
                <p className="text-[#444] text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-[#25D366] text-white font-bold px-8 py-3 rounded-full hover:bg-[#1da851] transition-all"
        >
          Questions? Message Hilit on WhatsApp
        </a>

        <p className="mt-8 text-[#727272] text-sm">
          <a href="/en" className="hover:underline">Back to home</a>
        </p>
      </div>
    </div>
  );
}
