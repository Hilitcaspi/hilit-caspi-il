import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

const WHATSAPP_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("Hi Hilit, I just joined the singles database and would love your help getting started!");

export default function EnThankYouDatabase() {
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Welcome to the Database | Match by Hilit";
  }, []);

  const getLinkMutation = trpc.singles.getQuestionnaireLink.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else if ((data as any).alreadyCompleted) {
        setErrorMsg("Your questionnaire is already complete! You can access your personal area.");
      } else if ((data as any).notFound) {
        setErrorMsg("Email not found. Your payment may still be processing. Please try again in a minute, or reach out via WhatsApp.");
      } else {
        setErrorMsg("Something went wrong. Please reach out via WhatsApp and we will sort it out.");
      }
    },
    onError: () => {
      setErrorMsg("Something went wrong. Please reach out via WhatsApp and we will sort it out.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email.trim()) return;
    getLinkMutation.mutate({ email: email.trim().toLowerCase(), origin: window.location.origin });
  };

  return (
    <div className="min-h-screen bg-[#f0eadc] flex flex-col items-center justify-center px-6 py-16">
      <div className="relative z-10 max-w-lg w-full text-center">
        <div className="text-6xl mb-6">💛</div>
        <h1 className="text-3xl md:text-4xl font-black text-[#191265] mb-4">
          You are officially in the database!
        </h1>
        <p className="text-[#444] text-lg leading-relaxed mb-8">
          Welcome. Your profile is being set up. To complete your registration and activate your profile, please fill out the compatibility questionnaire below.
        </p>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 text-left">
          <h2 className="text-xl font-bold text-[#191265] mb-2 text-center">Access your questionnaire</h2>
          <p className="text-[#727272] text-sm text-center mb-6">Enter the email address you used for payment</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="px-4 py-3 rounded-xl border-2 border-[#e9e8e8] text-[#191265] placeholder-[#aaa] focus:outline-none focus:border-[#191265] text-base transition-all"
            />
            {errorMsg && <p className="text-red-500 text-sm text-center">{errorMsg}</p>}
            <button
              type="submit"
              disabled={getLinkMutation.isPending}
              className="bg-[#191265] text-white font-bold py-3 rounded-xl hover:bg-[#0f0b3d] transition-all disabled:opacity-50"
            >
              {getLinkMutation.isPending ? "Loading..." : "Go to my questionnaire"}
            </button>
          </form>
        </div>

        <div className="bg-[#191265]/5 rounded-2xl p-6 mb-8">
          <h3 className="font-bold text-[#191265] mb-3">What happens next?</h3>
          <div className="space-y-3 text-left">
            {[
              { step: "1", text: "Complete your compatibility questionnaire (takes about 10 minutes)" },
              { step: "2", text: "Your profile is reviewed and activated in the database" },
              { step: "3", text: "When a compatible match is found, you will receive a personal introduction" },
              { step: "4", text: "Both parties approve before any contact details are shared" },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#ffe27c] text-[#191265] font-bold text-sm flex items-center justify-center flex-shrink-0 mt-0.5">{step}</div>
                <p className="text-[#444] text-sm">{text}</p>
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
          Questions? Chat with Hilit on WhatsApp
        </a>

        <p className="mt-8 text-[#727272] text-sm">
          <a href="/en" className="hover:underline">Back to home</a>
        </p>
      </div>
    </div>
  );
}
