// Pure access rules — no I/O, so every rule is unit-testable.
// Callers load the course, lesson and the user's entitlements, then ask here.

export type AccessCourse = {
  id: string;
  pricing: "free" | "paid";
  status: "draft" | "published" | "archived";
};

export type AccessLesson = {
  isFreePreview: boolean;
  status: "draft" | "published";
};

export type AccessEntitlement = {
  kind: "course" | "subscription" | "lifetime";
  status: "active" | "canceled" | "revoked";
  courseId: string | null;
  currentPeriodEnd: Date | null;
};

export type AccessUser = {
  isAdmin: boolean;
  entitlements: AccessEntitlement[];
};

function isLive(entitlement: AccessEntitlement, now: Date): boolean {
  if (entitlement.status === "revoked") return false;
  if (entitlement.kind !== "subscription") return entitlement.status === "active";
  // Polar keeps a past-due subscription `active` while retrying payment, and a
  // canceled one stays usable until the paid period ends; `subscription.revoked` ends it.
  if (entitlement.status === "active") return true;
  return entitlement.currentPeriodEnd !== null && now < entitlement.currentPeriodEnd;
}

export function hasAllAccess(user: AccessUser | null, now = new Date()): boolean {
  if (!user) return false;
  return user.entitlements.some(
    (e) => (e.kind === "lifetime" || e.kind === "subscription") && isLive(e, now),
  );
}

export function ownsCourse(user: AccessUser | null, courseId: string, now = new Date()): boolean {
  if (!user) return false;
  return user.entitlements.some(
    (e) => e.kind === "course" && e.courseId === courseId && isLive(e, now),
  );
}

export function canWatchLesson(
  user: AccessUser | null,
  course: AccessCourse,
  lesson: AccessLesson,
  now = new Date(),
): boolean {
  if (user?.isAdmin) return true;
  // Drafts are admin-only. Archived courses stay watchable for anyone who already has access.
  if (course.status === "draft" || lesson.status === "draft") return false;
  if (lesson.isFreePreview) return true;
  if (!user) return false;
  if (course.pricing === "free") return true;
  return hasAllAccess(user, now) || ownsCourse(user, course.id, now);
}
