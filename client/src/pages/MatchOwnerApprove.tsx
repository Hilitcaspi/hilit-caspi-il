import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Owner approval page: Hilit clicks "approve" or "reject" from the email.
 * URL: /match/owner-approve?token=xxx&action=approve|reject
 */
export default function MatchOwnerApprove() {
  const [status, setStatus] = useState<"loading" | "approved" | "rejected" | "error">("loading");
  const [message, setMessage] = useState("");

  const approveMutation = trpc.matchmaking.ownerApproveMatch.useMutation({
    onSuccess: (data: { success: boolean; action: string; sentTo?: (string | null)[] }) => {
      if (data.action === "approved") {
        setStatus("approved");
        setMessage(`ההצעה נשלחה בהצלחה! שני הצדדים יקבלו מייל עם ההצעה.`);
      } else {
        setStatus("rejected");
        setMessage("ההתאמה בוטלה.");
      }
    },
    onError: (err: { message?: string }) => {
      setStatus("error");
      setMessage(err.message || "שגיאה בעיבוד הבקשה");
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const action = params.get("action") as "approve" | "reject" | null;
    if (!token || !action || (action !== "approve" && action !== "reject")) {
      setStatus("error");
      setMessage("קישור לא תקין");
      return;
    }
    approveMutation.mutate({ token, action });
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#f0eadc", fontFamily: "Rubik, Arial, sans-serif", direction: "rtl" }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "48px 40px",
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 8px 40px rgba(25,18,101,0.10)",
        }}
      >
        {status === "loading" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h2 style={{ color: "#191265", fontSize: 22, marginBottom: 8 }}>מעבד את הבקשה...</h2>
          </>
        )}
        {status === "approved" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: "#191265", fontSize: 24, marginBottom: 12 }}>ההתאמה אושרה!</h2>
            <p style={{ color: "#555", fontSize: 16, lineHeight: 1.7 }}>{message}</p>
          </>
        )}
        {status === "rejected" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h2 style={{ color: "#191265", fontSize: 24, marginBottom: 12 }}>ההתאמה בוטלה</h2>
            <p style={{ color: "#555", fontSize: 16 }}>{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ color: "#191265", fontSize: 24, marginBottom: 12 }}>שגיאה</h2>
            <p style={{ color: "#555", fontSize: 16 }}>{message}</p>
          </>
        )}
        <a
          href="/"
          style={{
            display: "inline-block",
            marginTop: 24,
            background: "#191265",
            color: "#ffe27c",
            fontWeight: "bold",
            padding: "12px 28px",
            borderRadius: 12,
            textDecoration: "none",
            fontSize: 15,
          }}
        >
          חזרה לאתר
        </a>
      </div>
    </div>
  );
}
