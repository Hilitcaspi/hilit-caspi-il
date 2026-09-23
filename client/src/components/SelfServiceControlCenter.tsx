import { Database, MessageCircleQuestion, Palette, Workflow } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import DatabaseOperationsSection from "@/components/DatabaseOperationsSection";
import DashboardAssistantSection from "@/components/DashboardAssistantSection";
import ContentStudioSection from "@/components/ContentStudioSection";
import UsageShiftSection from "@/components/UsageShiftSection";

const sections = [
  { value: "database", label: "ניהול המאגר", icon: Database },
  { value: "assistant", label: "שאלי את הדשבורד", icon: MessageCircleQuestion },
  { value: "studio", label: "סטודיו יצירה", icon: Palette },
  { value: "shift", label: "מה עבר לביצוע עצמי", icon: Workflow },
] as const;

/** מרכז שליטה עצמאי לפעולות צוות; אינו מפעיל שליחות או חיוב. */
export default function SelfServiceControlCenter() {
  const requestedSection = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("center") : null;
  const defaultSection = sections.some(section => section.value === requestedSection) ? requestedSection! : "database";
  return (
    <section dir="rtl" className="w-full bg-[#f8f8fc] px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl bg-[#191265] px-5 py-7 text-white shadow-[0_20px_55px_rgba(25,18,101,0.20)] sm:px-8 sm:py-9">
          <Badge className="border-0 bg-[#ffe27c] text-[#191265] hover:bg-[#ffe27c]">
            מרכז שליטה לצוות
          </Badge>
          <div className="mt-4 max-w-2xl">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">כל מה שצריך לנהל, במקום אחד</h1>
            <p className="mt-2 text-sm leading-6 text-white/80 sm:text-base">
              ניווט מהיר למאגר, תובנות מהדשבורד, יצירת חומרים ותיעוד עבודה שעברה לביצוע עצמאי.
            </p>
          </div>
        </div>

        <Tabs defaultValue={defaultSection} className="mt-5">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-sm sm:grid-cols-4">
            {sections.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="min-h-14 whitespace-normal rounded-xl px-2 py-2 text-xs font-semibold text-[#191265] data-[state=active]:bg-[#191265] data-[state=active]:text-white sm:text-sm"
              >
                <Icon className="ml-1.5 size-4 shrink-0" aria-hidden="true" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="database" className="mt-5 focus-visible:outline-none">
            <DatabaseOperationsSection />
          </TabsContent>
          <TabsContent value="assistant" className="mt-5 focus-visible:outline-none">
            <DashboardAssistantSection />
          </TabsContent>
          <TabsContent value="studio" className="mt-5 focus-visible:outline-none">
            <ContentStudioSection />
          </TabsContent>
          <TabsContent value="shift" className="mt-5 focus-visible:outline-none">
            <UsageShiftSection />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

export { SelfServiceControlCenter };
