export type Role = "member" | "trainer" | "admin";

/** Where each role lands after signing in, and the only area it may open. */
export const roleHome: Record<Role, string> = {
  member: "/member/overview",
  trainer: "/trainer",
  admin: "/admin",
};

export const roleArea: Record<Role, string> = {
  member: "/member",
  trainer: "/trainer",
  admin: "/admin",
};

export function isRole(value: unknown): value is Role {
  return value === "member" || value === "trainer" || value === "admin";
}
