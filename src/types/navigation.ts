export const SIDEBAR_GROUP_IDS = [
  'main',
  'accounts',
  'family',
  'planning',
  'organization',
  'tools',
] as const

export type SidebarGroupId = typeof SIDEBAR_GROUP_IDS[number]

export type SidebarPreferences = {
  collapsedGroups: Record<SidebarGroupId, boolean>
}

export type SidebarGroupPreferenceInput = {
  groupId: SidebarGroupId
  collapsed: boolean
}
