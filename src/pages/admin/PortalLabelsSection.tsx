import { Tags } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { InlineCategoryManager } from '@/components/admin/InlineCategoryManager'

/** Central HR/admin UI for portal-wide labels, categories, and tags. */
export function PortalLabelsSection() {
  const {
    taskCategories,
    addTaskCategory,
    updateTaskCategory,
    deleteTaskCategory,
    documentCategories,
    addDocumentCategory,
    updateDocumentCategory,
    deleteDocumentCategory,
    recognitionTags,
    addRecognitionTag,
    updateRecognitionTag,
    deleteRecognitionTag,
    awardCategories,
    addAwardCategory,
    updateAwardCategory,
    deleteAwardCategory,
    grievanceCategories,
    addGrievanceCategory,
    updateGrievanceCategory,
    deleteGrievanceCategory,
    exitReasons,
    addExitReason,
    updateExitReason,
    deleteExitReason,
    memoCategories,
    addMemoCategory,
    updateMemoCategory,
    deleteMemoCategory,
  } = useData()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-fg">
          <Tags className="h-5 w-5 text-accent" />
          Portal labels & categories
        </h2>
        <p className="text-sm text-muted">
          HR and admin can add, rename, or remove labels used across tasks, resources, shout-outs,
          awards, grievances, memos, and exit interviews.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <InlineCategoryManager
          title="Task categories"
          description="Used when creating and filtering tasks."
          items={taskCategories}
          onAdd={addTaskCategory}
          onUpdate={updateTaskCategory}
          onDelete={deleteTaskCategory}
        />
        <InlineCategoryManager
          title="Document categories"
          description="Organize files in Resources."
          items={documentCategories}
          onAdd={addDocumentCategory}
          onUpdate={updateDocumentCategory}
          onDelete={deleteDocumentCategory}
        />
        <InlineCategoryManager
          title="Shout-out tags"
          description="Tags on recognition posts."
          items={recognitionTags}
          onAdd={addRecognitionTag}
          onUpdate={updateRecognitionTag}
          onDelete={deleteRecognitionTag}
        />
        <InlineCategoryManager
          title="Award categories"
          description="Quarterly Afrivate Awards."
          items={awardCategories}
          onAdd={addAwardCategory}
          onUpdate={updateAwardCategory}
          onDelete={deleteAwardCategory}
        />
        <InlineCategoryManager
          title="Grievance categories"
          description="Options when staff submit concerns."
          items={grievanceCategories}
          onAdd={addGrievanceCategory}
          onUpdate={updateGrievanceCategory}
          onDelete={deleteGrievanceCategory}
        />
        <InlineCategoryManager
          title="Exit interview reasons"
          description="Reasons HR logs when someone leaves."
          items={exitReasons}
          onAdd={addExitReason}
          onUpdate={updateExitReason}
          onDelete={deleteExitReason}
        />
        <InlineCategoryManager
          title="Memo types"
          description="Announcement and memo categories."
          items={memoCategories}
          onAdd={addMemoCategory}
          onUpdate={updateMemoCategory}
          onDelete={deleteMemoCategory}
        />
      </div>
    </div>
  )
}
