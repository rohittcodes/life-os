export const queryKeys = {
  todos: () => ["todos"] as const,
  habitLog: (date: string) => ["habit-log", date] as const,
  financeEntries: (monthStart: string) => ["finance-entries", monthStart] as const,
  conversations: () => ["ai-conversations"] as const,
  contacts: () => ["contacts"] as const,
  jobs: () => ["jobs"] as const,
}
