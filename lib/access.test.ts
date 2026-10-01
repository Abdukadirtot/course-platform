import { describe, expect, it } from "vitest";
import {
  canWatchLesson,
  hasAllAccess,
  type AccessCourse,
  type AccessEntitlement,
  type AccessLesson,
  type AccessUser,
} from "./access";

const now = new Date("2026-10-01T12:00:00Z");
const tomorrow = new Date("2026-10-02T12:00:00Z");
const yesterday = new Date("2026-09-30T12:00:00Z");

const paidCourse: AccessCourse = { id: "c1", pricing: "paid", status: "published" };
const freeCourse: AccessCourse = { id: "c2", pricing: "free", status: "published" };
const lesson: AccessLesson = { isFreePreview: false, status: "published" };
const preview: AccessLesson = { isFreePreview: true, status: "published" };

function student(...entitlements: Partial<AccessEntitlement>[]): AccessUser {
  return {
    isAdmin: false,
    entitlements: entitlements.map((e) => ({
      kind: "course",
      status: "active",
      courseId: null,
      currentPeriodEnd: null,
      ...e,
    })),
  };
}

const watch = (user: AccessUser | null, course = paidCourse, l = lesson) =>
  canWatchLesson(user, course, l, now);

describe("canWatchLesson", () => {
  it("1. free preview is watchable signed out", () => {
    expect(watch(null, paidCourse, preview)).toBe(true);
  });

  it("2. free course needs sign-in", () => {
    expect(watch(null, freeCourse)).toBe(false);
    expect(watch(student(), freeCourse)).toBe(true);
  });

  it("3. lifetime unlocks every paid course", () => {
    expect(watch(student({ kind: "lifetime" }))).toBe(true);
  });

  it("4. active subscription unlocks paid courses", () => {
    expect(watch(student({ kind: "subscription", currentPeriodEnd: tomorrow }))).toBe(true);
  });

  it("4. canceled subscription keeps access until period end", () => {
    expect(
      watch(student({ kind: "subscription", status: "canceled", currentPeriodEnd: tomorrow })),
    ).toBe(true);
    expect(
      watch(student({ kind: "subscription", status: "canceled", currentPeriodEnd: yesterday })),
    ).toBe(false);
  });

  it("4. revoked subscription has no access", () => {
    expect(
      watch(student({ kind: "subscription", status: "revoked", currentPeriodEnd: tomorrow })),
    ).toBe(false);
  });

  it("5. course purchase unlocks only that course", () => {
    const buyer = student({ kind: "course", courseId: "c1" });
    expect(watch(buyer)).toBe(true);
    expect(watch(buyer, { ...paidCourse, id: "other" })).toBe(false);
  });

  it("refunded (revoked) course purchase has no access", () => {
    expect(watch(student({ kind: "course", courseId: "c1", status: "revoked" }))).toBe(false);
  });

  it("signed-in student with nothing cannot watch a paid lesson", () => {
    expect(watch(student())).toBe(false);
    expect(watch(null)).toBe(false);
  });

  it("drafts are hidden from everyone but admin, even previews", () => {
    const draftCourse = { ...paidCourse, status: "draft" as const };
    const draftLesson = { ...preview, status: "draft" as const };
    expect(watch(student({ kind: "lifetime" }), draftCourse)).toBe(false);
    expect(watch(null, paidCourse, draftLesson)).toBe(false);
    expect(watch({ isAdmin: true, entitlements: [] }, draftCourse, draftLesson)).toBe(true);
  });

  it("archived courses stay watchable for owners", () => {
    const archived = { ...paidCourse, status: "archived" as const };
    expect(watch(student({ kind: "course", courseId: "c1" }), archived)).toBe(true);
    expect(watch(student(), archived)).toBe(false);
  });
});

describe("hasAllAccess", () => {
  it("course purchases are not all-access", () => {
    expect(hasAllAccess(student({ kind: "course", courseId: "c1" }), now)).toBe(false);
    expect(hasAllAccess(student({ kind: "lifetime" }), now)).toBe(true);
    expect(hasAllAccess(null, now)).toBe(false);
  });
});
