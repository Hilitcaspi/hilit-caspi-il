export const REGISTRATION_RESUME_REQUIRED = "resume-required";

export function registrationErrorMessage(error: unknown): string {
  if (typeof error === "string") return error.trim();
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message.trim();
  }
  return "";
}

export function isRegistrationResumeRequired(error: unknown): boolean {
  return registrationErrorMessage(error) === REGISTRATION_RESUME_REQUIRED;
}

export function shouldRetryRegistrationSave(error: unknown): boolean {
  if (isRegistrationResumeRequired(error)) return false;
  if (error && typeof error === "object" && "data" in error) {
    const data = error.data;
    if (data && typeof data === "object" && "code" in data) {
      return !["BAD_REQUEST", "FORBIDDEN", "UNAUTHORIZED", "CONFLICT", "NOT_FOUND"].includes(String(data.code));
    }
  }
  return true;
}

export function registrationSaveErrorForDisplay(error: unknown): string {
  if (isRegistrationResumeRequired(error)) return REGISTRATION_RESUME_REQUIRED;
  return registrationErrorMessage(error) || "לא הצלחנו לשמור את הפרטים. הפרטים נשארו בטופס ולא נפתח חיוב.";
}
