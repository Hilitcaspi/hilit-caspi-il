import { useEffect, lazy, Suspense } from "react";
import { useRef } from "react";
import { trackPageView } from "@/lib/track";
import { initBehaviorTracker, resetBehaviorTracker } from "@/lib/behaviorTracker";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Eagerly loaded (critical path)
import Home from "@/pages/Home";
import DnaQuiz from "@/pages/DnaQuiz";
import NotFound from "@/pages/NotFound";

// Lazy loaded (non-critical)
const Register = lazy(() => import("@/pages/Register"));
const Matches = lazy(() => import("@/pages/Matches"));
const Admin = lazy(() => import("@/pages/Admin"));
const CRM = lazy(() => import("@/pages/CRM"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const EmailPreview = lazy(() => import("@/pages/EmailPreview"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const Speaking = lazy(() => import("@/pages/Speaking"));
const BlogAdmin = lazy(() => import("@/pages/BlogAdmin"));
const ThankYouDatabase = lazy(() => import("@/pages/ThankYouDatabase"));
const ThankYouDigital = lazy(() => import("@/pages/ThankYouDigital"));
const ThankYouCoaching = lazy(() => import("@/pages/ThankYouCoaching"));
const GuideSales = lazy(() => import("@/pages/GuideSales"));
const GuideFree = lazy(() => import("@/pages/GuideFree"));
const TermsGuide = lazy(() => import("@/pages/TermsGuide"));
const CoachingSales = lazy(() => import("@/pages/CoachingSales"));
const CourseSales = lazy(() => import("@/pages/CourseSales"));
const TermsCoaching = lazy(() => import("@/pages/TermsCoaching"));
const TermsCourse = lazy(() => import("@/pages/TermsCourse"));
const DatabaseSales = lazy(() => import("@/pages/DatabaseSales"));
const DatabaseLanding = lazy(() => import("@/pages/DatabaseLanding"));
const TermsDatabase = lazy(() => import("@/pages/TermsDatabase"));
const ThankYouCourse = lazy(() => import("@/pages/ThankYouCourse"));
const GuideView = lazy(() => import("@/pages/GuideView"));
const GuideAccess = lazy(() => import("@/pages/GuideAccess"));
const CourseView = lazy(() => import("@/pages/CourseView"));
const SingleSessionSales = lazy(() => import("@/pages/SingleSessionSales"));
const ThankYouSession = lazy(() => import("@/pages/ThankYouSession"));
const MatchRespond = lazy(() => import("@/pages/MatchRespond"));
const MatchOwnerApprove = lazy(() => import("@/pages/MatchOwnerApprove"));
const CRMMatchmaking = lazy(() => import("@/pages/CRMMatchmaking"));
const ScientificQuestionnaire = lazy(() => import("@/pages/ScientificQuestionnaire"));
const UserDashboard = lazy(() => import("@/pages/UserDashboard"));
const LeadCall = lazy(() => import("@/pages/LeadCall"));
const LiveEvent = lazy(() => import("@/pages/LiveEvent"));
const LiveEventThankYou = lazy(() => import("@/pages/LiveEventThankYou"));
const SignsGuide = lazy(() => import("@/pages/SignsGuide"));
const LaMekabel = lazy(() => import("@/pages/LaMekabel"));
const Brain = lazy(() => import("@/pages/Brain"));
const TermsSingleSession = lazy(() => import("@/pages/TermsSingleSession"));

// US English (EN) pages
const EnHome = lazy(() => import("@/pages/en/Home"));
const EnDatabaseSales = lazy(() => import("@/pages/en/DatabaseSales"));
const EnRegister = lazy(() => import("@/pages/en/Register"));
const EnAbout = lazy(() => import("@/pages/en/About"));
const EnCoaching = lazy(() => import("@/pages/en/Coaching"));
const EnSession = lazy(() => import("@/pages/en/Session"));
const EnCourse = lazy(() => import("@/pages/en/Course"));
const EnGuide = lazy(() => import("@/pages/en/Guide"));
const EnDnaQuiz = lazy(() => import("@/pages/en/DnaQuiz"));
const EnBlogIndex = lazy(() => import("@/pages/en/blog/Index"));
const EnTerms = lazy(() => import("@/pages/en/Terms"));
const EnPrivacy = lazy(() => import("@/pages/en/Privacy"));
const EnRefunds = lazy(() => import("@/pages/en/Refunds"));
const EnSpeaking = lazy(() => import("@/pages/en/Speaking"));
const EnUnsubscribe = lazy(() => import("@/pages/en/Unsubscribe"));
const EnUserDashboard = lazy(() => import("@/pages/en/UserDashboard"));
const EnThankYouDatabase = lazy(() => import("@/pages/en/ThankYouDatabase"));
const EnThankYouCoaching = lazy(() => import("@/pages/en/ThankYouCoaching"));
const EnThankYouCourse = lazy(() => import("@/pages/en/ThankYouCourse"));
const EnThankYouSession = lazy(() => import("@/pages/en/ThankYouSession"));
const EnThankYouDigital = lazy(() => import("@/pages/en/ThankYouDigital"));

// Detect press article referrer on first visit and save to localStorage.
// Also persist UTM params to sessionStorage so they survive navigation within the site
// (e.g. user lands on home with ?utm_source=instagram, then navigates to /guide).
function ReferrerDetector() {
  useEffect(() => {
    try {
      const ref = document.referrer || "";
      const p = new URLSearchParams(window.location.search);
      const utm = p.get("utm_source") || "";
      if ((ref.includes("atmag.co.il") || utm === "atmag") && !localStorage.getItem("traffic_source")) {
        localStorage.setItem("traffic_source", "press_article");
        localStorage.setItem("traffic_source_detail", "atmag_april2026");
      }
      // Persist UTM params to BOTH sessionStorage AND localStorage
      // localStorage survives cross-domain redirects (e.g. Grow payment page → back to site)
      // sessionStorage is cleared when user leaves the domain
      const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
      let capturedAny = false;
      utmKeys.forEach(key => {
        const val = p.get(key);
        if (val) {
          sessionStorage.setItem(key, val);
          localStorage.setItem(key, val);
          capturedAny = true;
        }
      });
      if (capturedAny) {
        // Store timestamp so we can expire old UTM after 30 days
        localStorage.setItem("utm_captured_at", String(Date.now()));
      }
    } catch {}
  }, []);
  return null;
}

// Scroll to top on every route change
function ScrollToTop() {
  const [location] = useLocation();
  const isBackRef = useRef(false);

  // Listen for popstate (browser back/forward) to set flag
  useEffect(() => {
    const onPop = () => { isBackRef.current = true; };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (isBackRef.current) {
      // Back navigation: restore saved scroll position
      isBackRef.current = false;
      const savedScroll = sessionStorage.getItem(`__scroll_${location}`);
      if (savedScroll) {
        setTimeout(() => window.scrollTo({ top: parseInt(savedScroll), left: 0, behavior: "instant" }), 80);
        sessionStorage.removeItem(`__scroll_${location}`);
      }
    } else {
      // Forward navigation: save current scroll for the page we're leaving, then scroll to top
      const prevPath = sessionStorage.getItem("__prev_path");
      if (prevPath && prevPath !== location) {
        sessionStorage.setItem(`__scroll_${prevPath}`, String(window.scrollY));
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    sessionStorage.setItem("__prev_path", location);
    // Track page view on every route change
    trackPageView(location);
    resetBehaviorTracker(location);
  }, [location]);
  return null;
}

// Detect if we're on the US domain
const isUsDomain = () =>
  typeof window !== "undefined" &&
  (window.location.hostname === "matchbyhilit.com" ||
    window.location.hostname === "www.matchbyhilit.com");

function UsRouter() {
  return (
    <>
      <ReferrerDetector />
      <ScrollToTop />
      <Suspense fallback={<div className="min-h-screen bg-[#191265] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#ffe27c] border-t-transparent rounded-full animate-spin"></div></div>}>
        <Switch>
          <Route path={"/"} component={EnHome} />
          <Route path={"/database"} component={EnDatabaseSales} />
          <Route path={"/join/questionnaire"} component={ScientificQuestionnaire} />
          <Route path={"/join/:token"} component={EnRegister} />
          <Route path={"/join"} component={EnRegister} />
          <Route path={"/about"} component={EnAbout} />
          <Route path={"/coaching"} component={EnCoaching} />
          <Route path={"/session"} component={EnSession} />
          <Route path={"/course"} component={EnCourse} />
          <Route path={"/guide"} component={EnGuide} />
          <Route path={"/dna"} component={EnDnaQuiz} />
          <Route path={"/blog/:slug"} component={lazy(() => import("@/pages/en/blog/Index"))} />
          <Route path={"/blog"} component={EnBlogIndex} />
          <Route path={"/speaking"} component={EnSpeaking} />
          <Route path={"/unsubscribe"} component={EnUnsubscribe} />
          <Route path={"/my-profile"} component={EnUserDashboard} />
          <Route path={"/thank-you/database"} component={EnThankYouDatabase} />
          <Route path={"/thank-you/coaching"} component={EnThankYouCoaching} />
          <Route path={"/thank-you/course"} component={EnThankYouCourse} />
          <Route path={"/thank-you/session"} component={EnThankYouSession} />
          <Route path={"/thank-you/digital"} component={EnThankYouDigital} />
          <Route path={"/terms"} component={EnTerms} />
          <Route path={"/privacy"} component={EnPrivacy} />
          <Route path={"/refunds"} component={EnRefunds} />
          <Route path={"/crm/matchmaking"} component={CRMMatchmaking} />
          <Route path={"/crm/analytics"} component={Analytics} />
          <Route path={"/crm/emails"} component={EmailPreview} />
          <Route path={"/crm/blog"} component={BlogAdmin} />
          <Route path={"/crm"} component={CRM} />
          <Route path={"/match/respond"} component={MatchRespond} />
          <Route path={"/match/owner-approve"} component={MatchOwnerApprove} />
          <Route path={"/404"} component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </>
  );
}

function HeRouter() {
  return (
    <>
      <ReferrerDetector />
      <ScrollToTop />
      <Suspense fallback={<div className="min-h-screen bg-[#191265] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#ffe27c] border-t-transparent rounded-full animate-spin"></div></div>}>
        <Switch>
          <Route path={"/"} component={Home} />
          <Route path={"/dna-quiz"} component={DnaQuiz} />
          <Route path={"/join/questionnaire"} component={ScientificQuestionnaire} />
          <Route path={"/join/:token"} component={Register} />
          <Route path={"/join"} component={Register} />
          <Route path={"/matches"} component={Matches} />
          <Route path={"/admin"} component={Admin} />
          <Route path={"/crm/matchmaking"} component={CRMMatchmaking} />
          <Route path={"/crm/analytics"} component={Analytics} />
          <Route path={"/crm/emails"} component={EmailPreview} />
          <Route path={"/crm/blog"} component={BlogAdmin} />
          <Route path={"/crm"} component={CRM} />
          <Route path={"/unsubscribe"} component={Unsubscribe} />
          <Route path={"/course"} component={CourseSales} />
          <Route path={"/blog/:slug"} component={BlogPost} />
          <Route path={"/blog"} component={Blog} />
          <Route path={"/speaking"} component={Speaking} />
          <Route path={"/thank-you/database"} component={ThankYouDatabase} />
          <Route path={"/guide-free"} component={GuideFree} />
          <Route path={"/guide/view"} component={GuideView} />
          <Route path={"/guide/access"} component={GuideAccess} />
          <Route path={"/guide"} component={GuideSales} />
          <Route path={"/terms/guide"} component={TermsGuide} />
          <Route path={"/thank-you/digital"} component={ThankYouDigital} />
          <Route path={"/thank-you/coaching"} component={ThankYouCoaching} />
          <Route path={"/coaching"} component={CoachingSales} />
          <Route path={"/terms/coaching"} component={TermsCoaching} />
          <Route path={"/terms/course"} component={TermsCourse} />
          <Route path={"/database"} component={DatabaseSales} />
          <Route path={"/maagar"} component={DatabaseLanding} />
          <Route path={"/terms/database"} component={TermsDatabase} />
          <Route path={"/thank-you/course"} component={ThankYouCourse} />
          <Route path={"/course-sales"} component={CourseSales} />
          <Route path={"/course/view"} component={CourseView} />
          <Route path={"/single-session"} component={SingleSessionSales} />
          <Route path={"/terms/single-session"} component={TermsSingleSession} />
          <Route path={"/thank-you/session"} component={ThankYouSession} />
          <Route path={"/match/respond"} component={MatchRespond} />
          <Route path={"/match/return-to-pool"} component={lazy(() => import("./pages/MatchReturnToPool"))} />
          <Route path={"/match/owner-approve"} component={MatchOwnerApprove} />
          <Route path={"/live/thank-you"} component={LiveEventThankYou} />
          <Route path={"/live"} component={LiveEvent} />
          <Route path={"/my-profile"} component={UserDashboard} />
          <Route path={"/lead"} component={LeadCall} />
          <Route path={"/signs"} component={SignsGuide} />
          <Route path={"/lamekabel"} component={LaMekabel} />
          <Route path={"/brain"} component={Brain} />
          {/* Keep /en/* routes for backward compat */}
          <Route path={"/en/database"} component={EnDatabaseSales} />
          <Route path={"/en/join"} component={EnRegister} />
          <Route path={"/en/about"} component={EnAbout} />
          <Route path={"/en/coaching"} component={EnCoaching} />
          <Route path={"/en/session"} component={EnSession} />
          <Route path={"/en/course"} component={EnCourse} />
          <Route path={"/en/guide"} component={EnGuide} />
          <Route path={"/en/dna"} component={EnDnaQuiz} />
          <Route path={"/en/blog/:slug"} component={lazy(() => import("@/pages/en/blog/Index"))} />
          <Route path={"/en/blog"} component={EnBlogIndex} />
          <Route path={"/en/terms"} component={EnTerms} />
          <Route path={"/en/privacy"} component={EnPrivacy} />
          <Route path={"/en/refunds"} component={EnRefunds} />
          <Route path={"/en/speaking"} component={EnSpeaking} />
          <Route path={"/en/unsubscribe"} component={EnUnsubscribe} />
          <Route path={"/en/my-profile"} component={EnUserDashboard} />
          <Route path={"/en/thank-you/database"} component={EnThankYouDatabase} />
          <Route path={"/en/thank-you/coaching"} component={EnThankYouCoaching} />
          <Route path={"/en/thank-you/course"} component={EnThankYouCourse} />
          <Route path={"/en/thank-you/session"} component={EnThankYouSession} />
          <Route path={"/en/thank-you/digital"} component={EnThankYouDigital} />
          <Route path={"/en"} component={EnHome} />
          <Route path={"/404"} component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </>
  );
}

function App() {
  const usMode = isUsDomain();
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          {usMode ? <UsRouter /> : <HeRouter />}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
