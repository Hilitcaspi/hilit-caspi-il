import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, ShieldCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ProfileClosureDialogProps = {
  profile: {
    id: number;
    firstName: string;
    lastName?: string | null;
    isActive: boolean;
  };
  onClosed: () => void | Promise<void>;
};

function createIdempotencyKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export default function ProfileClosureDialog({ profile, onClosed }: ProfileClosureDialogProps) {
  const api = trpc as any;
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const previewQuery = api.controlCenter.profileActionPreview.useQuery(
    { singleId: profile.id, action: "close_profile" },
    { enabled: open, refetchOnWindowFocus: false },
  );
  const preview = previewQuery.data;
  const apply = api.controlCenter.applyProfileAction.useMutation({
    onSuccess: async () => {
      toast.success("הפרופיל נסגר לחלוטין ונחסם מהתאמות ומדיוור");
      setConfirmation("");
      setOpen(false);
      await onClosed();
    },
    onError: (error: any) => toast.error(error?.message || "הסגירה לא הושלמה"),
  });

  useEffect(() => {
    if (!open) setConfirmation("");
  }, [open]);

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const canConfirm = Boolean(
    preview?.canApply
      && confirmation.trim() === preview.confirmationPhrase
      && !apply.isPending,
  );

  const closeProfile = () => {
    if (!canConfirm || !preview) return;
    apply.mutate({
      singleId: profile.id,
      action: "close_profile",
      expectedUpdatedAt: preview.profile?.updatedAt,
      confirmation: confirmation.trim(),
      idempotencyKey: createIdempotencyKey(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={event => event.stopPropagation()}
          className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
        >
          <UserX className="ml-1 inline size-3.5" aria-hidden="true" />
          {profile.isActive ? "סגירה מלאה" : "השלמת סגירה"}
        </button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto border-red-100 sm:max-w-xl">
        <DialogHeader className="text-right sm:text-right">
          <div className="mb-2 grid size-11 place-items-center rounded-2xl bg-red-50 text-red-700">
            <UserX className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle className="text-xl text-[#191265]">סגירה מלאה של {fullName}</DialogTitle>
          <DialogDescription className="leading-6">
            זו אינה רק השהיה. הפעולה מוציאה את הפרופיל מהמאגר הפעיל, סוגרת התאמות וקישורים ועוצרת מיילים, SMS ופניות עתידיות.
          </DialogDescription>
        </DialogHeader>

        {previewQuery.isFetching && (
          <div className="flex items-center gap-2 rounded-xl bg-[#191265]/5 p-4 text-sm text-[#191265]">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            בודקים את כל ההשפעות לפני הסגירה…
          </div>
        )}

        {previewQuery.error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
            {previewQuery.error.message || "לא ניתן לבדוק את הפרופיל כרגע."}
          </div>
        )}

        {preview && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-[#191265]/10 bg-[#fafaff] p-4">
              <div className="mb-2 flex items-center gap-2 text-[#191265]">
                <ShieldCheck className="size-5" aria-hidden="true" />
                <h3 className="font-bold">מה ייסגר</h3>
              </div>
              <ul className="space-y-1.5 text-sm leading-6 text-slate-700">
                {preview.plannedChanges?.map((item: string) => <li key={item}>• {item}</li>)}
              </ul>
            </section>

            {preview.warnings?.length > 0 && (
              <section className="rounded-2xl bg-amber-50 p-4 text-amber-950">
                <p className="mb-1 flex items-center gap-1.5 text-sm font-bold"><AlertTriangle className="size-4" />לשים לב</p>
                {preview.warnings.map((item: string) => <p key={item} className="text-sm leading-6">• {item}</p>)}
              </section>
            )}

            {preview.blockers?.length > 0 && (
              <section className="rounded-2xl bg-red-50 p-4 text-red-900">
                <p className="mb-1 flex items-center gap-1.5 text-sm font-bold"><AlertTriangle className="size-4" />לא ניתן לסגור כרגע</p>
                {preview.blockers.map((item: string) => <p key={item} className="text-sm leading-6">• {item}</p>)}
              </section>
            )}

            {preview.canApply && (
              <div className="space-y-2">
                <Label htmlFor={`close-profile-${profile.id}`}>
                  כדי למנוע טעות, הקלידי בדיוק: <strong>{preview.confirmationPhrase}</strong>
                </Label>
                <Input
                  id={`close-profile-${profile.id}`}
                  value={confirmation}
                  onChange={event => setConfirmation(event.target.value)}
                  placeholder={preview.confirmationPhrase}
                  autoComplete="off"
                  className="border-red-200 focus-visible:ring-red-300"
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={apply.isPending}
          >
            ביטול
          </Button>
          {preview?.canApply && (
            <Button
              type="button"
              onClick={closeProfile}
              disabled={!canConfirm}
              className="bg-red-700 text-white hover:bg-red-800"
            >
              {apply.isPending && <Loader2 className="ml-1 size-4 animate-spin" />}
              סגירה מלאה וסופית
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ProfileClosureDialog };
