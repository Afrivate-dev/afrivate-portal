import { useEffect, useState } from 'react'
import { useAvaFormDraft, useAvaPageDraft } from '@/hooks/useAvaDraft'
import { peekAvaDraft } from '@/lib/ava/avaDrafts'
import { useAuth } from '@/context/AuthContext'
import { useHr } from '@/context/HrContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { notifySuccess } from '@/lib/notify'
import type { EmployeePersonalFields } from '@/types/hr'

export function PeopleMyInfoPage() {
  const { user } = useAuth()
  const { employeeProfiles, ensureEmployeeProfile, saveEmployeePersonalFields } = useHr()
  const [draft, setDraft] = useState<EmployeePersonalFields>({})
  const [skillsText, setSkillsText] = useState('')

  useEffect(() => {
    if (!user) return
    const profile = ensureEmployeeProfile(user.id)
    setDraft({
      preferredName: profile.preferredName,
      legalName: profile.legalName ?? user.name,
      personalEmail: profile.personalEmail,
      phone: profile.phone ?? user.phone,
      workLocation: profile.workLocation ?? user.workLocation,
      addressCountry: profile.addressCountry,
      dateOfBirth: profile.dateOfBirth,
      pronouns: profile.pronouns ?? user.pronouns,
      linkedinUrl: profile.linkedinUrl ?? user.linkedinUrl,
      bio: profile.bio ?? user.bio,
      skills: profile.skills ?? user.skills,
      emergencyContact: profile.emergencyContact,
      nextOfKinNotes: profile.nextOfKinNotes,
    })
    setSkillsText((profile.skills ?? user.skills ?? []).join(', '))
    const pending = peekAvaDraft('my_info')
    if (!pending) return
    setDraft((prev) => ({
      ...prev,
      ...(pending.fields.preferredName ? { preferredName: pending.fields.preferredName } : {}),
      ...(pending.fields.legalName ? { legalName: pending.fields.legalName } : {}),
      ...(pending.fields.personalEmail ? { personalEmail: pending.fields.personalEmail } : {}),
      ...(pending.fields.phone ? { phone: pending.fields.phone } : {}),
      ...(pending.fields.bio ? { bio: pending.fields.bio } : {}),
      ...(pending.fields.nextOfKinNotes ? { nextOfKinNotes: pending.fields.nextOfKinNotes } : {}),
    }))
    if (pending.fields.skills) setSkillsText(pending.fields.skills)
  }, [user, employeeProfiles, ensureEmployeeProfile])

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
        }
      }
      return next
    })
    if (d.fields.skills) setSkillsText(d.fields.skills)
  })

  if (!user) return null

  const profile = employeeProfiles.find((p) => p.userId === user.id)

  const save = () => {
    saveEmployeePersonalFields(user.id, {
      ...draft,
      skills: skillsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    })
    notifySuccess('Your info was saved.')
  }

  return (
    <div className="av-contain space-y-6">
      <PageHeader
        title="My info"
        description="Update personal and contact details. Job and contract fields are managed by People & Culture."
      />

      {profile?.hrRequestsUpdate ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          People & Culture has asked you to review and update your personal information.
        </div>
      ) : null}

      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Preferred name"
            value={draft.preferredName ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, preferredName: e.target.value }))}
          />
          <Input
            label="Legal name"
            value={draft.legalName ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, legalName: e.target.value }))}
          />
          <Input
            label="Personal email"
            type="email"
            value={draft.personalEmail ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, personalEmail: e.target.value }))}
          />
          <Input
            label="Phone"
            value={draft.phone ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
          />
          <Input
            label="Work location"
            value={draft.workLocation ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, workLocation: e.target.value }))}
          />
          <Input
            label="Country"
            value={draft.addressCountry ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, addressCountry: e.target.value }))}
          />
          <Input
            label="Date of birth"
            type="date"
            value={draft.dateOfBirth ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, dateOfBirth: e.target.value }))}
          />
          <Input
            label="Pronouns"
            value={draft.pronouns ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, pronouns: e.target.value }))}
          />
          <Input
            label="LinkedIn URL"
            value={draft.linkedinUrl ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, linkedinUrl: e.target.value }))}
            className="sm:col-span-2"
          />
        </div>
        <Textarea
          label="Bio"
          value={draft.bio ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
          rows={3}
        />
        <Input
          label="Skills (comma-separated)"
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Emergency contact name"
            value={draft.emergencyContact?.name ?? ''}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                emergencyContact: {
                  name: e.target.value,
                  phone: d.emergencyContact?.phone ?? '',
                  relationship: d.emergencyContact?.relationship ?? '',
                },
              }))
            }
          />
          <Input
            label="Emergency contact phone"
            value={draft.emergencyContact?.phone ?? ''}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                emergencyContact: {
                  name: d.emergencyContact?.name ?? '',
                  phone: e.target.value,
                  relationship: d.emergencyContact?.relationship ?? '',
                },
              }))
            }
          />
          <Input
            label="Relationship"
            value={draft.emergencyContact?.relationship ?? ''}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                emergencyContact: {
                  name: d.emergencyContact?.name ?? '',
                  phone: d.emergencyContact?.phone ?? '',
                  relationship: e.target.value,
                },
              }))
            }
          />
        </div>
        <Textarea
          label="Next of kin notes"
          value={draft.nextOfKinNotes ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, nextOfKinNotes: e.target.value }))}
          rows={2}
        />
        <div className="av-action-row items-stretch sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--color-muted)]">
            Profile completeness: {profile?.profileCompleteness ?? 0}%
          </p>
          <Button type="button" onClick={save}>
            Save my info
          </Button>
        </div>
      </Card>
    </div>
  )
}
