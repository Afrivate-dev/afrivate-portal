/** Map technical errors to plain language for people using the portal. */

const PHRASE_MAP: [RegExp, string][] = [
  [/permission denied for table portal_task_categories/i, 'Work categories are using the standard list for now.'],
  [/permission denied/i, "You don't have permission to do that. Ask an administrator if you need access."],
  [/row-level security|rls policy/i, "This change wasn't allowed. You may not have the right access level."],
  [/could not find the function|pgrst202/i, 'This feature is still being set up. Please try again later or contact support.'],
  [/edge function|404.*not found/i, 'This feature is temporarily unavailable. Please try again later.'],
  [/jwt expired|invalid jwt|session/i, 'Your session has expired. Please sign in again.'],
  [/network|fetch failed|failed to fetch/i, "We couldn't reach the server. Check your internet connection and try again."],
  [/duplicate key|already exists/i, 'That already exists. Try a different name or refresh the page.'],
  [/violates foreign key/i, "This item is still linked to something else. Remove those links first."],
  [/violates check constraint/i, "Some of the information you entered isn't valid. Please check and try again."],
]

const ACTION_LABELS: Record<string, string> = {
  'load task categories': 'load work categories',
  'create task': 'save your task',
  'update task': 'update your task',
  'delete task': 'delete this task',
  'submit check-in': 'send your weekly update',
  'update check-in': 'update your weekly update',
  'create announcement': 'post this update',
  'update announcement': 'save this update',
  'delete announcement': 'delete this update',
  'mark announcement read': 'mark this update as read',
  'mark all announcements read': 'mark all updates as read',
  'submit leave request': 'send your time-off request',
  'review leave request': 'update this time-off request',
  'save onboarding progress': 'save your progress',
  'upload document': 'upload this file',
  'delete document': 'remove this file',
  'send recognition': 'send your shout-out',
  'save notification': 'save this notification',
  'add task category': 'add this category',
  'update task category': 'rename this category',
  'delete task category': 'delete this category',
}

function humanizeAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ')
}

/** Turn a technical error into a short, friendly sentence. */
export function friendlyErrorMessage(action: string, raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return `We couldn't ${humanizeAction(action)}. Please try again.`

  for (const [pattern, message] of PHRASE_MAP) {
    if (pattern.test(trimmed)) return message
  }

  if (trimmed.length > 120 || /postgres|supabase|postgrest|rpc|sql/i.test(trimmed)) {
    return `We couldn't ${humanizeAction(action)}. Please try again.`
  }

  return `We couldn't ${humanizeAction(action)}: ${trimmed}`
}
