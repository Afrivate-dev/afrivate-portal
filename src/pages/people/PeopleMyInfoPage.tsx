import { useEffect, useMemo, useState } from 'react'
import { useAvaFormDraft, useAvaPageDraft } from '@/hooks/useAvaDraft'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useHr } from '@/context/HrContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { PersonnelQuestionnaireForm } from '@/components/people/PersonnelQuestionnaireForm'
import { notifySuccess, notifyError } from '@/lib/notify'
import {
  emptyPersonnelQuestionnaire,
  personalFieldsFromProfile,
} from '@/lib/personnelFile'
import type { EmployeePersonalFields } from '@/types/hr'

export function PeopleMyInfoPage() {
  const { user } = useAuth()
  const { users } = useData()
  const { employeeProfiles, ensureEmployeeProfile, saveEmployeePersonalFields } = useHr()
  const [draft, setDraft] = useState<EmployeePersonalFields>({
    questionnaire: emptyPersonnelQuestionnaire(),
  })
  const [skillsText, setSkillsText] = useState('')

  const managerName = useMemo(
    () => (user?.reportsToId ? users.find((u) => u.id === user.reportsToId)?.name : undefined),
    [user?.reportsToId, users],
  )

  useEffect(() => {
    if (!user) return
    const profile = ensureEmployeeProfile(user.id)
    const fields = personalFieldsFromProfile(profile)
    const q = fields.questionnaire ?? emptyPersonnelQuestionnaire()
    setDraft({
      ...fields,
      legalName: fields.legalName || user.name,
      phone: fields.phone || user.phone,
      workLocation: fields.workLocation || user.workLocation,
      pronouns: fields.pronouns || user.pronouns,
      linkedinUrl: fields.linkedinUrl || user.linkedinUrl,
      bio: fields.bio || user.bio,
      skills: fields.skills ?? user.skills,
      startDate: fields.startDate || user.joinedAt?.slice(0, 10),
      questionnaire: {
        ...q,
        statedJobTitle: q.statedJobTitle || user.jobTitle,
        statedDepartment: q.statedDepartment || user.department,
        statedManagerName: q.statedManagerName || managerName,
      },
    })
    setSkillsText((fields.skills ?? user.skills ?? []).join(', '))
  }, [user, ensureEmployeeProfile, managerName])

  useAvaPageDraft(
    'my_info',
    {
      preferredName: draft.preferredName ?? '',
      legalName: draft.legalName ?? '',
      personalEmail: draft.personalEmail ?? '',
      phone: draft.phone ?? '',
      workLocation: draft.workLocation ?? '',
      addressCountry: draft.addressCountry ?? '',
      dateOfBirth: draft.dateOfBirth ?? '',
      pronouns: draft.pronouns ?? '',
      linkedinUrl: draft.linkedinUrl ?? '',
      bio: draft.bio ?? '',
      skills: skillsText,
      emergencyContactName: draft.emergencyContact?.name ?? '',
      emergencyContactPhone: draft.emergencyContact?.phone ?? '',
      emergencyContactRelationship: draft.emergencyContact?.relationship ?? '',
      nextOfKinNotes: draft.nextOfKinNotes ?? '',
    },
  )

  useAvaFormDraft('my_info', (d) => {
    setDraft((prev) => {
      const next = { ...prev }
      if (d.fields.preferredName) next.preferredName = d.fields.preferredName
      if (d.fields.legalName) next.legalName = d.fields.legalName
      if (d.fields.personalEmail) next.personalEmail = d.fields.personalEmail
      if (d.fields.phone) next.phone = d.fields.phone
      if (d.fields.workLocation) next.workLocation = d.fields.workLocation
      if (d.fields.addressCountry) next.addressCountry = d.fields.addressCountry
      if (d.fields.dateOfBirth) next.dateOfBirth = d.fields.dateOfBirth
      if (d.fields.pronouns) next.pronouns = d.fields.pronouns
      if (d.fields.linkedinUrl) next.linkedinUrl = d.fields.linkedinUrl
      if (d.fields.bio) next.bio = d.fields.bio
      if (d.fields.nextOfKinNotes) next.nextOfKinNotes = d.fields.nextOfKinNotes
      if (
        d.fields.emergencyContactName ||
        d.fields.emergencyContactPhone ||
        d.fields.emergencyContactRelationship
      ) {
        next.emergencyContact = {
          name: d.fields.emergencyContactName || prev.emergencyContact?.name || '',
          phone: d.fields.emergencyContactPhone || prev.emergencyContact?.phone || '',
          relationship:
            d.fields.emergencyContactRelationship || prev.emergencyContact?.relationship || '',
          address: prev.emergencyContact?.address,
        }
      }
      return next
    })
    if (d.fields.skills) setSkillsText(d.fields.skills)
  })

  if (!user) return null

  const profile = employeeProfiles.find((p) => p.userId === user.id)

  const save = () => {
    const legalName = draft.legalName?.trim()
    const phone = draft.phone?.trim()
    const emergencyName = draft.emergencyContact?.name?.trim()
    const emergencyPhone = draft.emergencyContact?.phone?.trim()
    if (!legalName) {
      notifyError('Full legal name is required.')
      return
    }
    if (!draft.dateOfBirth) {
      notifyError('Date of birth is required.')
      return
    }
    if (!phone) {
      notifyError('Personal phone number is required.')
      return
    }
    if (!emergencyName || !emergencyPhone) {
      notifyError('Emergency contact name and phone are required.')
      return
    }
    const q = draft.questionnaire ?? emptyPersonnelQuestionnaire()
    const acknowledgementSignedAt =
      q.acknowledgementName?.trim() && !q.acknowledgementSignedAt
        ? new Date().toISOString().slice(0, 10)
        : q.acknowledgementSignedAt
    saveEmployeePersonalFields(user.id, {
      ...draft,
      legalName,
      phone,
      emergencyContact: {
        name: emergencyName,
        phone: emergencyPhone,
        relationship: draft.emergencyContact?.relationship ?? '',
        address: draft.emergencyContact?.address,
      },
      skills: skillsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      questionnaire: { ...q, acknowledgementSignedAt },
    })
    notifySuccess('Your personnel questionnaire was saved.')
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <PageHeader
        title="My info"
        description="Fill this personnel questionnaire and save. People & Culture and administrators can export the file for payroll, onboarding, and records."
      />
      <PersonnelQuestionnaireForm
        user={user}
        managerName={managerName}
        draft={draft}
        skillsText={skillsText}
        completeness={profile?.profileCompleteness ?? 0}
        hrRequestsUpdate={profile?.hrRequestsUpdate}
        onChangeDraft={setDraft}
        onChangeSkillsText={setSkillsText}
        onSave={save}
      />
    </div>
  )
}
