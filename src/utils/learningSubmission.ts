import type { LearningSubmission } from '@/types/hr'

/** True when the user already has a pending or approved submission for this assignment. */
export function hasBlockingLearningSubmission(
  assignmentId: string,
  userId: string,
  submissions: Pick<LearningSubmission, 'assignmentId' | 'userId' | 'status'>[],
): boolean {
  return submissions.some(
    (s) =>
      s.assignmentId === assignmentId &&
      s.userId === userId &&
      (s.status === 'pending' || s.status === 'approved'),
  )
}

export function findLearningSubmission(
  assignmentId: string,
  userId: string,
  submissions: LearningSubmission[],
): LearningSubmission | undefined {
  return submissions.find((s) => s.assignmentId === assignmentId && s.userId === userId)
}
