import { useEffect, useId, useState } from "react";
import { Loader2, Pencil, Puzzle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type MatchingDifficultyProfile = {
  id: number;
  isMatchingDifficult?: boolean | null;
  matchingDifficultyNote?: string | null;
};

type ProfileMatchingDifficultyControlProps = {
  profile: MatchingDifficultyProfile;
  compact?: boolean;
};

/** Omit note entirely: marking/unmarking must retain the stored private reason. */
export function matchingDifficultyToggleInput(profile: MatchingDifficultyProfile) {
  return { id: profile.id, isMatchingDifficult: profile.isMatchingDifficult !== true };
}

export function matchingDifficultyNoteInput(profile: MatchingDifficultyProfile, note: string) {
  return { id: profile.id, isMatchingDifficult: profile.isMatchingDifficult === true, note };
}

/** Staff gating also keeps the private editor and mutation hooks out of nonstaff views. */
export default function ProfileMatchingDifficultyControl({
  profile,
  compact = false,
}: ProfileMatchingDifficultyControlProps) {
  // Static/public server rendering has no authenticated client session or editor.
  if (typeof window === "undefined") return null;
  return <AuthenticatedMatchingDifficultyControl profile={profile} compact={compact} />;
}

function AuthenticatedMatchingDifficultyControl({ profile, compact }: ProfileMatchingDifficultyControlProps) {
  const { user, loading, error } = useAuth();
  const isStaff = user?.role === "admin" || Boolean(user && "isTeamMember" in user && user.isTeamMember === true);
  if (loading || error || !isStaff) return null;
  return <StaffMatchingDifficultyControl key={profile.id} profile={profile} compact={compact} />;
}

function StaffMatchingDifficultyControl({ profile, compact }: ProfileMatchingDifficultyControlProps) {
  const utils = trpc.useUtils();
  const noteId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState({
    isMatchingDifficult: profile.isMatchingDifficult === true,
    matchingDifficultyNote: profile.matchingDifficultyNote || "",
  });

  useEffect(() => {
    setSaved({
      isMatchingDifficult: profile.isMatchingDifficult === true,
      matchingDifficultyNote: profile.matchingDifficultyNote || "",
    });
  }, [profile.isMatchingDifficult, profile.matchingDifficultyNote]);

  const mutation = trpc.matchmaking.setMatchingDifficulty.useMutation({
    onMutate: input => {
      const previous = saved;
      setSaved(current => ({ ...current, isMatchingDifficult: input.isMatchingDifficult }));
      return { previous };
    },
    onSuccess: async (result, input) => {
      setSaved({
        isMatchingDifficult: result.isMatchingDifficult,
        matchingDifficultyNote: result.matchingDifficultyNote || "",
      });
      if (input.note !== undefined) {
        setOpen(false);
        setDraft("");
      }
      toast.success(input.note !== undefined ? "הסיבה הפרטית נשמרה" : "סימון הקושי בהתאמה עודכן");
      // Refresh all staff matching surfaces, including detail, waiting and candidate caches.
      await utils.matchmaking.invalidate();
    },
    onError: (_error, _input, context) => {
      if (context) setSaved(context.previous);
      toast.error("לא ניתן לשמור את סימון הקושי בהתאמה. נסו שוב.");
    },
  });

  const pending = mutation.isPending;
  const marked = saved.isMatchingDifficult;
  const toggleLabel = marked ? "ביטול סימון קשה להתאמה" : "סימון קשה להתאמה";
  const currentProfile = { id: profile.id, ...saved };

  const handleOpenChange = (nextOpen: boolean) => {
    if (pending) return;
    if (nextOpen) setDraft(saved.matchingDifficultyNote);
    else setDraft("");
    setOpen(nextOpen);
  };

  return (
    <div
      className="inline-flex flex-wrap items-center gap-1.5"
      data-profile-matching-difficulty-control="true"
      onClick={event => event.stopPropagation()}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={toggleLabel}
        aria-pressed={marked}
        title={toggleLabel}
        disabled={pending}
        onClick={() => mutation.mutate(matchingDifficultyToggleInput(currentProfile))}
        className={`gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-100 focus-visible:ring-emerald-500 ${compact ? "size-8 p-0" : "h-9 px-3 text-xs"} ${marked ? "bg-emerald-100" : "bg-white"}`}
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Puzzle className="size-4" aria-hidden="true" />}
        {!compact && <span>קשה להתאמה</span>}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="עריכת סיבה פרטית לקושי בהתאמה"
        title="עריכת סיבה פרטית לקושי בהתאמה"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={pending}
        onClick={() => handleOpenChange(true)}
        className={`gap-1.5 border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50 focus-visible:ring-emerald-500 ${compact ? "size-8 p-0" : "h-9 px-3 text-xs"}`}
      >
        <Pencil className="size-3.5" aria-hidden="true" />
        {!compact && <span>סיבה פרטית</span>}
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent dir="rtl" className="border-emerald-200 sm:max-w-lg" showCloseButton={!pending}>
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle className="text-emerald-900">סיבה פרטית לקושי בהתאמה</DialogTitle>
            <DialogDescription>
              לצוות בלבד. הסיבה אינה מוצגת לחברי המאגר ואינה נשלחת בהודעות.
              אפשר לסמן או לבטל סימון ללא סיבה; ביטול הסימון אינו מוחק את הסיבה השמורה.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={noteId}>סיבה פרטית — לצוות בלבד (לא חובה)</Label>
            <Textarea
              id={noteId}
              value={draft}
              onChange={event => setDraft(event.target.value)}
              maxLength={2000}
              disabled={pending}
              className="min-h-32 border-emerald-200 focus-visible:ring-emerald-500"
              aria-describedby={`${noteId}-limit`}
            />
            <p id={`${noteId}-limit`} className="text-xs text-muted-foreground">{draft.length} / 2000 תווים</p>
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="button" variant="outline" disabled={pending} onClick={() => handleOpenChange(false)}>ביטול</Button>
            <Button
              type="button"
              disabled={pending || draft.length > 2000}
              onClick={() => mutation.mutate(matchingDifficultyNoteInput(currentProfile, draft))}
              className="bg-emerald-700 text-white hover:bg-emerald-800"
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              שמירת סיבה פרטית
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
