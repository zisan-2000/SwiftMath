import { Role } from "@/lib/generated/prisma/enums";

export const PERMISSIONS = {
  TEACHER_CREATE: "teacher:create",
  TEACHER_DISABLE: "teacher:disable",
  TEACHER_RESET_PASSWORD: "teacher:reset_password",
  TEACHER_PERMISSIONS_MANAGE: "teacher:permissions:manage",

  STUDENT_CREATE: "student:create",
  STUDENT_DISABLE: "student:disable",
  STUDENT_RESET_PASSWORD: "student:reset_password",
  STUDENT_ASSIGN_GROUP: "student:assign_group",
  STUDENT_ASSIGN_LEVEL: "student:assign_level",
  STUDENT_EXPORT: "student:export",
  STUDENT_PERMISSIONS_MANAGE: "student:permissions:manage",

  GROUP_MANAGE: "group:manage",
  GROUP_ASSIGN_TEACHER: "group:assign_teacher",
  GROUP_QUESTION_OVERRIDE: "group:question:override",

  LEVEL_MANAGE: "level:manage",
  QUESTION_MANAGE: "question:manage",
  QUESTION_PUBLISH: "question:publish",
  CURRICULUM_PUBLISH: "curriculum:publish",

  EXAM_SCHEDULE: "exam:schedule",
  EXAM_CANCEL: "exam:cancel",

  INSTITUTE_SETTINGS: "institute:settings",
  INSTITUTE_BRANDING: "institute:branding",

  ANALYTICS_VIEW: "analytics:view",
  ACTIVITY_VIEW: "activity:view",

  INSTITUTE_CREATE: "institute:create",
  INSTITUTE_UPDATE: "institute:update",
  INSTITUTE_TOGGLE_ACTIVE: "institute:toggle_active",
  ADMIN_CREATE: "admin:create",
  ADMIN_DISABLE: "admin:disable",
  ADMIN_RESET_PASSWORD: "admin:reset_password",
  ADMIN_PERMISSIONS_MANAGE: "admin:permissions:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type PermissionScope = "institute" | "platform";

export interface PermissionMetadata {
  label: string;
  description: string;
  domain: string;
  scope: PermissionScope;
  assignableTo: Role[];
}

export const PERMISSION_METADATA = {
  [PERMISSIONS.TEACHER_CREATE]: {
    label: "Create teachers",
    description: "Create teacher accounts inside an institute.",
    domain: "Teachers",
    scope: "institute",
    assignableTo: [Role.ADMIN],
  },
  [PERMISSIONS.TEACHER_DISABLE]: {
    label: "Disable teachers",
    description: "Enable or disable teacher accounts.",
    domain: "Teachers",
    scope: "institute",
    assignableTo: [Role.ADMIN],
  },
  [PERMISSIONS.TEACHER_RESET_PASSWORD]: {
    label: "Reset teacher passwords",
    description: "Set a new password for teacher accounts.",
    domain: "Teachers",
    scope: "institute",
    assignableTo: [Role.ADMIN],
  },
  [PERMISSIONS.TEACHER_PERMISSIONS_MANAGE]: {
    label: "Manage teacher permissions",
    description: "Control teacher capabilities inside the institute.",
    domain: "Teachers",
    scope: "institute",
    assignableTo: [Role.ADMIN],
  },
  [PERMISSIONS.STUDENT_CREATE]: {
    label: "Create students",
    description: "Create student accounts and place them into groups.",
    domain: "Students",
    scope: "institute",
    assignableTo: [Role.ADMIN, Role.TEACHER],
  },
  [PERMISSIONS.STUDENT_DISABLE]: {
    label: "Disable students",
    description: "Enable or disable student accounts.",
    domain: "Students",
    scope: "institute",
    assignableTo: [Role.ADMIN],
  },
  [PERMISSIONS.STUDENT_RESET_PASSWORD]: {
    label: "Reset student passwords",
    description: "Set a new password for student accounts.",
    domain: "Students",
    scope: "institute",
    assignableTo: [Role.ADMIN, Role.TEACHER],
  },
  [PERMISSIONS.STUDENT_ASSIGN_GROUP]: {
    label: "Move students",
    description: "Assign or move students between groups.",
    domain: "Students",
    scope: "institute",
    assignableTo: [Role.ADMIN, Role.TEACHER],
  },
  [PERMISSIONS.STUDENT_ASSIGN_LEVEL]: {
    label: "Assign levels",
    description: "Set a student's current practice level.",
    domain: "Students",
    scope: "institute",
    assignableTo: [Role.ADMIN, Role.TEACHER],
  },
  [PERMISSIONS.STUDENT_EXPORT]: {
    label: "Export students",
    description: "Download institute student progress reports.",
    domain: "Students",
    scope: "institute",
    assignableTo: [Role.ADMIN],
  },
  [PERMISSIONS.STUDENT_PERMISSIONS_MANAGE]: {
    label: "Manage student permissions",
    description: "Control student capabilities inside the institute.",
    domain: "Students",
    scope: "institute",
    assignableTo: [Role.ADMIN],
  },
  [PERMISSIONS.GROUP_MANAGE]: {
    label: "Manage groups",
    description: "Create, update, and delete groups.",
    domain: "Groups",
    scope: "institute",
    assignableTo: [Role.ADMIN, Role.TEACHER],
  },
  [PERMISSIONS.GROUP_ASSIGN_TEACHER]: {
    label: "Assign group teachers",
    description: "Choose which teacher owns an institute group.",
    domain: "Groups",
    scope: "institute",
    assignableTo: [Role.ADMIN],
  },
  [PERMISSIONS.GROUP_QUESTION_OVERRIDE]: {
    label: "Override group questions",
    description: "Enable or disable bank questions for a teacher group.",
    domain: "Groups",
    scope: "institute",
    assignableTo: [Role.ADMIN, Role.TEACHER],
  },
  [PERMISSIONS.LEVEL_MANAGE]: {
    label: "Manage levels",
    description: "Create, edit, archive, and restore curriculum levels.",
    domain: "Curriculum",
    scope: "institute",
    assignableTo: [Role.ADMIN],
  },
  [PERMISSIONS.QUESTION_MANAGE]: {
    label: "Manage questions",
    description: "Create, edit, import, reorder, and delete bank questions.",
    domain: "Curriculum",
    scope: "institute",
    assignableTo: [Role.ADMIN],
  },
  [PERMISSIONS.QUESTION_PUBLISH]: {
    label: "Publish questions",
    description: "Publish or unpublish bank questions for live sessions.",
    domain: "Curriculum",
    scope: "institute",
    assignableTo: [Role.ADMIN],
  },
  [PERMISSIONS.CURRICULUM_PUBLISH]: {
    label: "Publish curriculum",
    description: "Start a new active curriculum generation.",
    domain: "Curriculum",
    scope: "institute",
    assignableTo: [Role.ADMIN],
  },
  [PERMISSIONS.EXAM_SCHEDULE]: {
    label: "Schedule exams",
    description: "Schedule timed exams for groups.",
    domain: "Exams",
    scope: "institute",
    assignableTo: [Role.TEACHER],
  },
  [PERMISSIONS.EXAM_CANCEL]: {
    label: "Cancel exams",
    description: "Cancel scheduled exams before attempts exist.",
    domain: "Exams",
    scope: "institute",
    assignableTo: [Role.TEACHER],
  },
  [PERMISSIONS.INSTITUTE_SETTINGS]: {
    label: "Institute settings",
    description: "Update operational institute settings.",
    domain: "Institute",
    scope: "institute",
    assignableTo: [Role.ADMIN],
  },
  [PERMISSIONS.INSTITUTE_BRANDING]: {
    label: "Institute branding",
    description: "Update institute name, logo, tagline, and primary color.",
    domain: "Institute",
    scope: "institute",
    assignableTo: [Role.ADMIN],
  },
  [PERMISSIONS.ANALYTICS_VIEW]: {
    label: "View analytics",
    description: "View dashboards and performance analytics.",
    domain: "Analytics",
    scope: "institute",
    assignableTo: [Role.ADMIN, Role.TEACHER],
  },
  [PERMISSIONS.ACTIVITY_VIEW]: {
    label: "View activity",
    description: "View audit and activity logs.",
    domain: "Analytics",
    scope: "institute",
    assignableTo: [Role.ADMIN, Role.TEACHER],
  },
  [PERMISSIONS.INSTITUTE_CREATE]: {
    label: "Create institutes",
    description: "Provision new tenant institutes.",
    domain: "Platform",
    scope: "platform",
    assignableTo: [Role.SUPER_ADMIN],
  },
  [PERMISSIONS.INSTITUTE_UPDATE]: {
    label: "Update institutes",
    description: "Update tenant identity and platform-managed branding.",
    domain: "Platform",
    scope: "platform",
    assignableTo: [Role.SUPER_ADMIN],
  },
  [PERMISSIONS.INSTITUTE_TOGGLE_ACTIVE]: {
    label: "Enable or disable institutes",
    description: "Control tenant active state.",
    domain: "Platform",
    scope: "platform",
    assignableTo: [Role.SUPER_ADMIN],
  },
  [PERMISSIONS.ADMIN_CREATE]: {
    label: "Create admins",
    description: "Create institute admin accounts.",
    domain: "Platform",
    scope: "platform",
    assignableTo: [Role.SUPER_ADMIN],
  },
  [PERMISSIONS.ADMIN_DISABLE]: {
    label: "Disable admins",
    description: "Enable or disable institute admin accounts.",
    domain: "Platform",
    scope: "platform",
    assignableTo: [Role.SUPER_ADMIN],
  },
  [PERMISSIONS.ADMIN_RESET_PASSWORD]: {
    label: "Reset admin passwords",
    description: "Set a new password for institute admins.",
    domain: "Platform",
    scope: "platform",
    assignableTo: [Role.SUPER_ADMIN],
  },
  [PERMISSIONS.ADMIN_PERMISSIONS_MANAGE]: {
    label: "Manage admin permissions",
    description: "Control institute admin capabilities.",
    domain: "Platform",
    scope: "platform",
    assignableTo: [Role.SUPER_ADMIN],
  },
} satisfies Record<Permission, PermissionMetadata>;

export const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

export function isKnownPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as string[]).includes(value);
}

export function permissionsByScope(scope: PermissionScope): Permission[] {
  return ALL_PERMISSIONS.filter(
    (permission) => PERMISSION_METADATA[permission].scope === scope,
  );
}

export function getRoleDefaultPermissions(role: Role): Set<Permission> {
  switch (role) {
    case Role.SUPER_ADMIN:
      return new Set(permissionsByScope("platform"));
    case Role.ADMIN:
      return new Set(permissionsByScope("institute"));
    case Role.TEACHER:
      return new Set([
        PERMISSIONS.GROUP_MANAGE,
        PERMISSIONS.GROUP_QUESTION_OVERRIDE,
        PERMISSIONS.STUDENT_CREATE,
        PERMISSIONS.STUDENT_ASSIGN_GROUP,
        PERMISSIONS.STUDENT_ASSIGN_LEVEL,
        PERMISSIONS.STUDENT_RESET_PASSWORD,
        PERMISSIONS.EXAM_SCHEDULE,
        PERMISSIONS.EXAM_CANCEL,
        PERMISSIONS.ANALYTICS_VIEW,
        PERMISSIONS.ACTIVITY_VIEW,
      ]);
    case Role.STUDENT:
      return new Set();
    default:
      return new Set();
  }
}

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return getRoleDefaultPermissions(role).has(permission);
}
