/** AVA — AfriVate Virtual Assistant shared types */

export type AvaRole = 'staff' | 'assistant_lead' | 'team_lead' | 'hr' | 'admin'

export interface AvaChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AvaLink {
  label: string
  path: string
}

export type AvaSuggestedAction =
  | {
      type: 'navigate'
      label: string
      path: string
    }
  | {
      type: 'draft_leave'
      label: string
      payload: {
        leaveType: 'annual' | 'sick' | 'emergency'
        startDate: string
        endDate: string
        reason: string
      }
    }
  | {
      type: 'draft_checkin'
      label: string
      payload: {
        completed: string
        nextWeek: string
        blockers?: string
        hoursWorked: number
      }
    }

export interface AvaResponse {
  reply: string
  citations?: string[]
  links?: AvaLink[]
  suggestedActions?: AvaSuggestedAction[]
  source: 'gemini' | 'local'
}

/** Role-scoped snapshot sent to the model (already filtered client-side). */
export interface AvaUserContext {
  userId: string
  name: string
  role: AvaRole
  department?: string
  jobTitle?: string
  personal?: {
    openTasks: number
    overdueTasks: number
    pendingLeave: number
    recentLeave: Array<{ type: string; status: string; startDate: string; endDate: string }>
    learningPending: number
    openSurveys: number
    checkInThisWeek: boolean
    myInfoCompleteness?: number
  }
  lead?: {
    pendingLeaveToReview: number
    teamCheckInsThisWeek: number
  }
  hr?: {
    pendingApprovals: number
    pendingLeaveOrg: number
    activePips: number
    pendingDiscipline: number
    pendingLearningReviews: number
  }
}
