export type RoleStatus = "unread" | "read" | "liked" | "disliked";

export const ROLE_STATUSES: RoleStatus[] = [
  "unread",
  "read",
  "liked",
  "disliked",
];

export const ROLE_STATUS_LABELS: Record<RoleStatus, string> = {
  unread: "Unread",
  read: "Read",
  liked: "Liked",
  disliked: "Disliked",
};
