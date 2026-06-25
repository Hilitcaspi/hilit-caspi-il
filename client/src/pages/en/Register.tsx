/**
 * US English Registration Page — /en/join
 * US states dropdown, Zoom preference, both genders, Stripe payment placeholder
 * Connects to the same backend registerBasicProfile procedure with market="us"
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";

const WA_LINK = "https://wa.me/972544530975?text=Hi%20Hilit%2C%20I%27m%20interested%20in%20learning%20more%20about%20your%20services.";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
];

const EDUCATION_OPTIONS = [
  { value: "high_school", label: "High School" },
  { value: "vocational", label: "Vocational / Trade School" },
  { value: "bachelor", label: "Bachelor's Degree" },
  { value: "master", label: "Master's Degree" },
  { value: "phd", label: "PhD / Doctorate" },
  { value: "other", label: "Other" },
];

const MARITAL_OPTIONS = [
  { value: "single", label: "Never married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

type Step = "profile" | "preferences" | "payment" | "success";

const slideIn = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -30 },
  transition: { duration: 0.4 },
};

export default function EnRegister() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);

  const [step, setStep] = useState<Step>("profile");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [step]);

  // Profile fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"female" | "male">("female");
  const [age, setAge] = useState("");
  const [usState, setUsState] = useState("");
  const [city, setCity] = useState(""); // city within state
  const [zoomOk, setZoomOk] = useState(false);
  const [education, setEducation] = useState("");
  const [occupation, setOccupation] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("single");
  const [hasKids, setHasKids] = useState(false);
  const [numKids, setNumKids] = useState(0);
  const [wantsKids, setWantsKids] = useState<"yes" | "no" | "open">("open");
  const [about, setAbout] = useState("");

  // Preferences
  const [minAge, setMinAge] = useState("28");
  const [maxAge, setMaxAge] = useState("55");
  const [seekingGender, setSeekingGender] = useState<"female" | "male" | "any">("any");
  const [locationPreference, setLocationPreference] = useState<"close" | "anywhere">("close");
  const [partnerDescription, setPartnerDescription] = useState("");
  const [consentMatchmaking, setConsentMatchmaking] = useState(false);
  const [consentDataSharing, setConsentDataSharing] = useState(false);
  const [consentEmailMarketing, setConsentEmailMarketing] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [registeredSingleId, setRegisteredSingleId] = useState<number | null>(null);

  const registerMutation = trpc.singles.registerBasicProfile.useMutation();

  const validateProfile = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "First name is required";
    if (!email.trim()) e.email = "Email is required";
    if (!age || isNaN(Number(age)) || Number(age) < 18 || Number(age) > 99) e.age = "Please enter a valid age (18-99)";
    if (!usState) e.usState = "Please select your state";
    if (!city.trim()) e.city = "Please enter your city";
    if (!education) e.education = "Please select your education level";
    if (!maritalStatus) e.maritalStatus = "Please select your marital status";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validatePreferences = () => {
    const e: Record<string, string> = {};
    if (!consentMatchmaking) e.consent = "You must agree to receive match proposals to join the database";
    if (!consentDataSharing) e.consent = "You must agree to the data sharing terms to join the database";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleProfileNext = () => {
    if (validateProfile()) setStep("preferences");
  };

  const handlePreferencesNext = async () => {
    if (!validatePreferences()) return;

    try {
      const result = await registerMutation.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || "",
        gender,
        age: Number(age),
        city: city.trim() || usState || "US",
        usState,
        country: "US",
        market: "us",
        zoomOk,
        education: education as any,
        occupation: occupation.trim() || undefined,
        maritalStatus: maritalStatus as any,
        hasKids,
        numKids: hasKids ? numKids : 0,
        wantsKids,
        about: about.trim() || undefined,
        seekingGender,
        minAgePreference: Number(minAge),
        maxAgePreference: Number(maxAge),
        locationPreference,
        partnerDescription: partnerDescription.trim() || undefined,
        consentMatchmaking,
        consentDataSharing,
        consentEmailMarketing,
        registrationSource: "us_web",
        utmSource: params.get("utm_source") || undefined,
        utmMedium: params.get("utm_medium") || undefined,
        utmCampaign: params.get("utm_campaign") || undefined,
        utmContent: params.get("utm_content") || undefined,
      });
      setRegisteredSingleId(result.singleId);
      setStep("payment");
    } catch (err: any) {
      setErrors({ submit: err.message || "Something went wrong. Please try again." });
    }
  };

  return (
    <div className="min-h-screen bg-[#f0eadc] font-sans" dir="ltr">

      {/* ── NAVBAR ── */}
      <nav className="bg-[#191265] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/en" className="text-white font-bold text-xl">Hilit Caspi</Link>
          <Link href="/database" className="text-white/70 text-sm hover:text-white transition-colors">← Back to Database Info</Link>
        </div>
      </nav>

      {/* ── PROGRESS BAR ── */}
      <div className="bg-white border-b border-[#e0d8cc]">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2">
            {(["profile", "preferences", "payment"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step === s ? "bg-[#191265] text-white" :
                  (["profile", "preferences", "payment", "success"].indexOf(step) > i) ? "bg-[#ffe27c] text-[#191265]" :
                  "bg-[#e0d8cc] text-[#727272]"
                }`}>{i + 1}</div>
                <span className={`text-sm font-medium hidden sm:block ${step === s ? "text-[#191265]" : "text-[#727272]"}`}>
                  {s === "profile" ? "Your Profile" : s === "preferences" ? "Preferences" : "Payment"}
                </span>
                {i < 2 && <div className="flex-1 h-0.5 bg-[#e0d8cc] mx-2" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">

          {/* ── STEP 1: PROFILE ── */}
          {step === "profile" && (
            <motion.div key="profile" {...slideIn}>
              <h1 className="text-3xl font-black text-[#191265] mb-2">Tell us about yourself</h1>
              <p className="text-[#727272] mb-8">This information helps us match you with the right people.</p>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#191265] mb-1">First Name *</label>
                    <input value={firstName} onChange={e => setFirstName(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-[#191265] focus:outline-none focus:border-[#191265] transition-all ${errors.firstName ? "border-red-400" : "border-[#e0d8cc]"}`}
                      placeholder="First name" />
                    {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#191265] mb-1">Last Name</label>
                    <input value={lastName} onChange={e => setLastName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-[#e0d8cc] bg-white text-[#191265] focus:outline-none focus:border-[#191265] transition-all"
                      placeholder="Last name" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#191265] mb-1">Email *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-[#191265] focus:outline-none focus:border-[#191265] transition-all ${errors.email ? "border-red-400" : "border-[#e0d8cc]"}`}
                    placeholder="your@email.com" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#191265] mb-1">Phone</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#e0d8cc] bg-white text-[#191265] focus:outline-none focus:border-[#191265] transition-all"
                    placeholder="+1 (555) 000-0000" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#191265] mb-1">I am *</label>
                    <div className="flex gap-3">
                      {(["female", "male"] as const).map(g => (
                        <button key={g} type="button" onClick={() => setGender(g)}
                          className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${gender === g ? "bg-[#191265] border-[#191265] text-white" : "bg-white border-[#e0d8cc] text-[#191265] hover:border-[#191265]"}`}>
                          {g === "female" ? "Woman" : "Man"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#191265] mb-1">Age *</label>
                    <input type="number" value={age} onChange={e => setAge(e.target.value)} min={18} max={99}
                      className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-[#191265] focus:outline-none focus:border-[#191265] transition-all ${errors.age ? "border-red-400" : "border-[#e0d8cc]"}`}
                      placeholder="Age" />
                    {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#191265] mb-1">State *</label>
                    <select value={usState} onChange={e => setUsState(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-[#191265] focus:outline-none focus:border-[#191265] transition-all ${errors.usState ? "border-red-400" : "border-[#e0d8cc]"}`}>
                      <option value="">Select state...</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.usState && <p className="text-red-500 text-xs mt-1">{errors.usState}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#191265] mb-1">City *</label>
                    <input value={city} onChange={e => setCity(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-[#191265] focus:outline-none focus:border-[#191265] transition-all ${errors.city ? "border-red-400" : "border-[#e0d8cc]"}`}
                      placeholder="Your city" />
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                  </div>
                </div>

                {/* Zoom preference */}
                <div className="bg-white rounded-xl border-2 border-[#e0d8cc] p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={zoomOk} onChange={e => setZoomOk(e.target.checked)}
                      className="mt-1 w-5 h-5 accent-[#191265]" />
                    <div>
                      <span className="font-semibold text-[#191265]">I'm open to Zoom-first introductions</span>
                      <p className="text-[#727272] text-sm mt-1">This expands your match pool significantly. You can be introduced to compatible singles across the US, with a video call as the first step.</p>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#191265] mb-1">Education *</label>
                  <select value={education} onChange={e => setEducation(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-[#191265] focus:outline-none focus:border-[#191265] transition-all ${errors.education ? "border-red-400" : "border-[#e0d8cc]"}`}>
                    <option value="">Select education level...</option>
                    {EDUCATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {errors.education && <p className="text-red-500 text-xs mt-1">{errors.education}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#191265] mb-1">Occupation</label>
                  <input value={occupation} onChange={e => setOccupation(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#e0d8cc] bg-white text-[#191265] focus:outline-none focus:border-[#191265] transition-all"
                    placeholder="What do you do for work?" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#191265] mb-1">Relationship history *</label>
                  <div className="flex gap-3 flex-wrap">
                    {MARITAL_OPTIONS.map(o => (
                      <button key={o.value} type="button" onClick={() => setMaritalStatus(o.value)}
                        className={`px-4 py-2 rounded-xl border-2 font-medium text-sm transition-all ${maritalStatus === o.value ? "bg-[#191265] border-[#191265] text-white" : "bg-white border-[#e0d8cc] text-[#191265] hover:border-[#191265]"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer mb-3">
                    <input type="checkbox" checked={hasKids} onChange={e => setHasKids(e.target.checked)}
                      className="w-5 h-5 accent-[#191265]" />
                    <span className="font-semibold text-[#191265]">I have children</span>
                  </label>
                  {hasKids && (
                    <div className="ml-8">
                      <label className="block text-sm font-semibold text-[#191265] mb-1">How many?</label>
                      <input type="number" value={numKids} onChange={e => setNumKids(Number(e.target.value))} min={1} max={10}
                        className="w-24 px-4 py-3 rounded-xl border-2 border-[#e0d8cc] bg-white text-[#191265] focus:outline-none focus:border-[#191265] transition-all" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#191265] mb-2">Do you want children?</label>
                  <div className="flex gap-3">
                    {[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" },
                      { value: "open", label: "Open to it" },
                    ].map(o => (
                      <button key={o.value} type="button" onClick={() => setWantsKids(o.value as any)}
                        className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-all ${wantsKids === o.value ? "bg-[#191265] border-[#191265] text-white" : "bg-white border-[#e0d8cc] text-[#191265] hover:border-[#191265]"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#191265] mb-1">About you</label>
                  <textarea value={about} onChange={e => setAbout(e.target.value)} rows={4}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#e0d8cc] bg-white text-[#191265] focus:outline-none focus:border-[#191265] transition-all resize-none"
                    placeholder="Tell us a bit about yourself: your personality, what you enjoy, what makes you who you are..." />
                </div>

                <button onClick={handleProfileNext}
                  className="w-full bg-[#191265] text-white font-black text-lg py-4 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 hover:scale-[1.01] shadow-lg">
                  Continue to Preferences →
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: PREFERENCES ── */}
          {step === "preferences" && (
            <motion.div key="preferences" {...slideIn}>
              <h1 className="text-3xl font-black text-[#191265] mb-2">What are you looking for?</h1>
              <p className="text-[#727272] mb-8">Help us understand your ideal match.</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-[#191265] mb-2">I'm looking for</label>
                  <div className="flex gap-3">
                    {[
                      { value: "female", label: "A woman" },
                      { value: "male", label: "A man" },
                      { value: "any", label: "Either" },
                    ].map(o => (
                      <button key={o.value} type="button" onClick={() => setSeekingGender(o.value as any)}
                        className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-all ${seekingGender === o.value ? "bg-[#191265] border-[#191265] text-white" : "bg-white border-[#e0d8cc] text-[#191265] hover:border-[#191265]"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#191265] mb-2">Age range</label>
                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <label className="text-xs text-[#727272] mb-1 block">From</label>
                      <input type="number" value={minAge} onChange={e => setMinAge(e.target.value)} min={18} max={99}
                        className="w-full px-4 py-3 rounded-xl border-2 border-[#e0d8cc] bg-white text-[#191265] focus:outline-none focus:border-[#191265] transition-all" />
                    </div>
                    <span className="text-[#727272] mt-5">to</span>
                    <div className="flex-1">
                      <label className="text-xs text-[#727272] mb-1 block">To</label>
                      <input type="number" value={maxAge} onChange={e => setMaxAge(e.target.value)} min={18} max={99}
                        className="w-full px-4 py-3 rounded-xl border-2 border-[#e0d8cc] bg-white text-[#191265] focus:outline-none focus:border-[#191265] transition-all" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#191265] mb-2">Geographic preference</label>
                  <div className="flex gap-3">
                    {[
                      { value: "close", label: "Prefer someone nearby" },
                      { value: "anywhere", label: "Open to anywhere" },
                    ].map(o => (
                      <button key={o.value} type="button" onClick={() => setLocationPreference(o.value as any)}
                        className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-all ${locationPreference === o.value ? "bg-[#191265] border-[#191265] text-white" : "bg-white border-[#e0d8cc] text-[#191265] hover:border-[#191265]"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#191265] mb-1">Describe your ideal partner</label>
                  <textarea value={partnerDescription} onChange={e => setPartnerDescription(e.target.value)} rows={4}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#e0d8cc] bg-white text-[#191265] focus:outline-none focus:border-[#191265] transition-all resize-none"
                    placeholder="What qualities matter most to you? What kind of relationship are you building toward?" />
                </div>

                {/* Consent checkboxes */}
                <div className="bg-white rounded-xl border-2 border-[#e0d8cc] p-5 space-y-4">
                  <h3 className="font-bold text-[#191265]">Consent &amp; Terms</h3>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={consentMatchmaking} onChange={e => setConsentMatchmaking(e.target.checked)}
                      className="mt-1 w-5 h-5 accent-[#191265]" />
                    <span className="text-sm text-[#727272]">
                      I agree to receive match proposals from Hilit Caspi. I understand that my profile will be shared with proposed matches only upon mutual consent. *
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={consentDataSharing} onChange={e => setConsentDataSharing(e.target.checked)}
                      className="mt-1 w-5 h-5 accent-[#191265]" />
                    <span className="text-sm text-[#727272]">
                      I agree that my profile information may be used for the purpose of matchmaking within the Hilit Caspi database. *
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={consentEmailMarketing} onChange={e => setConsentEmailMarketing(e.target.checked)}
                      className="mt-1 w-5 h-5 accent-[#191265]" />
                    <span className="text-sm text-[#727272]">
                      I'd like to receive relationship tips, insights, and updates from Hilit Caspi. (Optional)
                    </span>
                  </label>
                  {errors.consent && <p className="text-red-500 text-xs">{errors.consent}</p>}
                </div>

                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
                    {errors.submit}
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep("profile")}
                    className="flex-1 border-2 border-[#191265] text-[#191265] font-bold py-4 rounded-2xl hover:bg-[#191265] hover:text-white transition-all duration-300">
                    ← Back
                  </button>
                  <button onClick={handlePreferencesNext} disabled={registerMutation.isPending}
                    className="flex-2 bg-[#191265] text-white font-black text-lg py-4 px-8 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 hover:scale-[1.01] shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
                    {registerMutation.isPending ? "Saving..." : "Continue to Payment →"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: PAYMENT ── */}
          {step === "payment" && (
            <motion.div key="payment" {...slideIn}>
              <h1 className="text-3xl font-black text-[#191265] mb-2">Complete your registration</h1>
              <p className="text-[#727272] mb-8">One payment of $149 gives you full access to the database and personal matching.</p>

              <div className="bg-[#191265] rounded-3xl p-8 mb-6">
                <div className="text-[#ffe27c] text-sm font-semibold uppercase tracking-widest mb-2">Your order</div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-white font-bold">Singles Database: Full Access</span>
                  <span className="text-[#ffe27c] font-black text-2xl">$149</span>
                </div>
                <div className="border-t border-white/20 pt-4 space-y-2">
                  {[
                    "Access to 4,000+ curated singles",
                    "Personal match proposals",
                    "DNA personality quiz",
                    "Scientific questionnaire",
                    "Double opt-in introductions",
                  ].map(item => (
                    <div key={item} className="flex gap-2 items-center text-white/70 text-sm">
                      <span className="text-[#ffe27c]">✓</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stripe Payment Placeholder */}
              <div className="bg-white rounded-2xl border-2 border-[#e0d8cc] p-6 mb-6">
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">💳</div>
                  <h3 className="text-[#191265] font-bold text-xl mb-2">Secure Payment</h3>
                  <p className="text-[#727272] text-sm mb-6">
                    Stripe payment integration is being set up. In the meantime, please contact us directly to complete your registration.
                  </p>
                  <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                    className="inline-block bg-[#ffe27c] text-[#191265] font-black text-lg px-8 py-4 rounded-2xl hover:bg-[#ffd84a] transition-all duration-300 hover:scale-[1.02] shadow-lg">
                    Chat on WhatsApp to Complete Registration
                  </a>
                  <p className="text-[#727272] text-xs mt-4">
                    Your profile has been saved. Reference ID: #{registeredSingleId}
                  </p>
                </div>
              </div>

              <p className="text-[#727272] text-xs text-center">
                By completing registration, you agree to our{" "}
                                  <Link href="/terms/database" className="text-[#191265] underline">Terms of Service</Link>.
                Payments are non-refundable.
              </p>
            </motion.div>
          )}

          {/* ── SUCCESS ── */}
          {step === "success" && (
            <motion.div key="success" {...slideIn} className="text-center py-12">
              <div className="text-6xl mb-6">💛</div>
              <h1 className="text-3xl font-black text-[#191265] mb-4">Welcome to the database!</h1>
              <p className="text-[#727272] text-lg mb-8">
                Your profile is now active. Check your email for next steps, including the scientific questionnaire that will help us find your best matches.
              </p>
              <Link href="/en"
                className="inline-block bg-[#191265] text-white font-bold px-8 py-4 rounded-2xl hover:bg-[#1800ad] transition-all duration-300">
                Back to Home
              </Link>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
