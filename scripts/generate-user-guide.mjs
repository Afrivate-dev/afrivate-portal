/**
 * AfriVate Portal — User Guide generator
 * Produces docs/AfriVate_Portal_User_Guide.docx
 *
 * Run:  node scripts/generate-user-guide.mjs
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  PageBreak,
  convertInchesToTwip,
  Header,
  Footer,
  PageNumberElement,
} from 'docx'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'docs')
const OUT_FILE = join(OUT_DIR, 'AfriVate_Portal_User_Guide.docx')

// ── Brand colours (RGB) ──────────────────────────────────────────────────────
const PURPLE      = '8D4087'   // primary brand purple
const PURPLE_LIGHT = 'F3E8F3'  // tinted background for headings
const DARK        = '1A1A2E'   // near-black body
const MUTED       = '6B7280'   // secondary text
const WHITE       = 'FFFFFF'
const BORDER_GREY = 'E5E7EB'

// ── Typography helpers ────────────────────────────────────────────────────────
const FONT = 'Calibri'
const FONT_HEADING = 'Calibri'

function run(text, opts = {}) {
  return new TextRun({
    text,
    font: FONT,
    size: opts.size ?? 22,          // half-points; 22 = 11pt
    bold: opts.bold ?? false,
    italics: opts.italic ?? false,
    color: opts.color ?? DARK,
    break: opts.break ?? 0,
  })
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    shading: { type: ShadingType.SOLID, color: PURPLE_LIGHT, fill: PURPLE_LIGHT },
    border: { left: { style: BorderStyle.THICK, size: 8, color: PURPLE } },
    indent: { left: convertInchesToTwip(0.1) },
    children: [
      new TextRun({
        text,
        font: FONT_HEADING,
        size: 36,       // 18pt
        bold: true,
        color: PURPLE,
      }),
    ],
  })
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: PURPLE } },
    children: [
      new TextRun({
        text,
        font: FONT_HEADING,
        size: 28,       // 14pt
        bold: true,
        color: PURPLE,
      }),
    ],
  })
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({
        text,
        font: FONT_HEADING,
        size: 24,       // 12pt
        bold: true,
        color: DARK,
      }),
    ],
  })
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 80, line: 276, lineRule: 'auto' },
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    indent: opts.indent ? { left: convertInchesToTwip(0.25) } : {},
    children: [run(text, opts)],
  })
}

function bullet(text, opts = {}) {
  return new Paragraph({
    bullet: { level: opts.level ?? 0 },
    spacing: { before: 60, after: 60 },
    children: [run(text, { size: 22, ...opts })],
  })
}

function note(text) {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    indent: { left: convertInchesToTwip(0.25), right: convertInchesToTwip(0.25) },
    shading: { type: ShadingType.SOLID, color: PURPLE_LIGHT, fill: PURPLE_LIGHT },
    border: {
      left:   { style: BorderStyle.THICK, size: 6, color: PURPLE },
      top:    { style: BorderStyle.SINGLE, size: 2, color: PURPLE_LIGHT },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: PURPLE_LIGHT },
      right:  { style: BorderStyle.SINGLE, size: 2, color: PURPLE_LIGHT },
    },
    children: [run('ℹ  ' + text, { size: 21, italic: true, color: PURPLE })],
  })
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] })
}

function blankLine() {
  return new Paragraph({ spacing: { before: 0, after: 0 } })
}

// ── Role badge helper (simple coloured-background table cell) ────────────────
function roleRow(roleName, description) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 22, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: PURPLE, fill: PURPLE },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: roleName, font: FONT, size: 22, bold: true, color: WHITE }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 78, type: WidthType.PERCENTAGE },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [new TextRun({ text: description, font: FONT, size: 22, color: DARK })],
          }),
        ],
      }),
    ],
  })
}

function rolesTable() {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 22, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: DARK, fill: DARK },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'Role', font: FONT, size: 22, bold: true, color: WHITE })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 78, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: DARK, fill: DARK },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'Who they are & key permissions', font: FONT, size: 22, bold: true, color: WHITE })],
          }),
        ],
      }),
    ],
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:           { style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY },
      bottom:        { style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY },
      left:          { style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY },
      right:         { style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY },
      insideH:       { style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY },
      insideV:       { style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY },
    },
    rows: [
      headerRow,
      roleRow('Staff', 'Standard team members. Can view the dashboard, submit leave requests, log weekly check-ins, manage personal tasks, recognise colleagues, access documents and their inbox.'),
      roleRow('Assistant Lead', 'All Staff permissions plus the ability to approve or decline leave requests on behalf of their team lead, and view team-wide check-in entries.'),
      roleRow('Team Lead', 'All Assistant Lead permissions plus the ability to manage team tasks, approve leave, view all team check-ins, and access team-level reports.'),
      roleRow('HR (People & Culture)', 'All Team Lead permissions plus full staff directory management, inviting new users, accessing sensitive HR documents, and viewing the admin audit log.'),
      roleRow('Administrator', 'Full access to everything: all HR permissions plus user management, department/team configuration, announcements, training videos, onboarding checklists, and system settings.'),
    ],
  })
}

// ── Feature table helper ─────────────────────────────────────────────────────
function featureRow(feature, staff, aLead, tLead, hr, admin) {
  const tick  = (v) => v ? '✓' : '–'
  const cells = [feature, tick(staff), tick(aLead), tick(tLead), tick(hr), tick(admin)]
  const widths = [40, 12, 12, 12, 12, 12]
  const isHeader = (feature === 'Feature')

  return new TableRow({
    tableHeader: isHeader,
    children: cells.map((text, i) => new TableCell({
      width: { size: widths[i], type: WidthType.PERCENTAGE },
      shading: isHeader
        ? { type: ShadingType.SOLID, color: DARK, fill: DARK }
        : { type: ShadingType.SOLID, color: WHITE, fill: WHITE },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({
        alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
        children: [new TextRun({
          text,
          font: FONT,
          size: 20,
          bold: isHeader,
          color: isHeader ? WHITE : (text === '✓' ? PURPLE : MUTED),
        })],
      })],
    })),
  })
}

function permissionsMatrix() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY },
      left:   { style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY },
      right:  { style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY },
      insideH:{ style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY },
      insideV:{ style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY },
    },
    rows: [
      featureRow('Feature',               'Staff', 'Asst. Lead', 'Team Lead', 'HR', 'Admin'),
      featureRow('Dashboard',              true,  true,  true,  true,  true),
      featureRow('View own tasks',         true,  true,  true,  true,  true),
      featureRow('Create tasks',           true,  true,  true,  true,  true),
      featureRow('Assign tasks to others', false, true,  true,  true,  true),
      featureRow('Edit task due dates',    false, false, false, false, true),
      featureRow('Delete tasks (own)',     true,  true,  true,  true,  true),
      featureRow('Weekly check-in',        true,  true,  true,  true,  true),
      featureRow('View team check-ins',    false, true,  true,  true,  true),
      featureRow('Submit leave request',   true,  true,  true,  true,  true),
      featureRow('Approve/decline leave',  false, true,  true,  true,  true),
      featureRow('View all leave requests',false, false, true,  true,  true),
      featureRow('Staff directory (read)', true,  true,  true,  true,  true),
      featureRow('Invite new users',       false, false, false, true,  true),
      featureRow('Manage user roles',      false, false, false, false, true),
      featureRow('Document library',       true,  true,  true,  true,  true),
      featureRow('HR-only documents',      false, false, false, true,  true),
      featureRow('Management documents',   false, false, true,  true,  true),
      featureRow('Post announcements',     false, false, true,  true,  true),
      featureRow('Delete announcements',   false, false, false, false, true),
      featureRow('Send recognition',       true,  true,  true,  true,  true),
      featureRow('Events calendar (view)', true,  true,  true,  true,  true),
      featureRow('Add/edit events',        false, false, false, false, true),
      featureRow('Inbox / notifications',  true,  true,  true,  true,  true),
      featureRow('Notes (personal)',       true,  true,  true,  true,  true),
      featureRow('Admin panel',            false, false, false, true,  true),
      featureRow('Audit log',              false, false, false, true,  true),
      featureRow('Dept/team management',   false, false, false, false, true),
    ],
  })
}

// ════════════════════════════════════════════════════════════════════════════════
//  DOCUMENT SECTIONS
// ════════════════════════════════════════════════════════════════════════════════

const coverPage = [
  blankLine(),
  blankLine(),
  blankLine(),
  blankLine(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 200 },
    children: [
      new TextRun({
        text: 'AfriVate Technologies Ltd',
        font: FONT_HEADING,
        size: 52,
        bold: true,
        color: PURPLE,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 120 },
    children: [
      new TextRun({
        text: 'Employee Portal',
        font: FONT_HEADING,
        size: 40,
        color: DARK,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 80 },
    border: {
      bottom: { style: BorderStyle.THICK, size: 8, color: PURPLE },
    },
    children: [
      new TextRun({
        text: 'User Guide',
        font: FONT_HEADING,
        size: 44,
        bold: true,
        color: DARK,
      }),
    ],
  }),
  blankLine(),
  blankLine(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [run('Version 1.0  ·  June 2026', { color: MUTED, italic: true })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [run('Internal use only — do not distribute externally', { color: MUTED, italic: true })],
  }),
  blankLine(),
  blankLine(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [run('People & Culture Department', { color: DARK })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [run('hr@afrivate.org', { color: PURPLE })],
  }),
  pageBreak(),
]

const tocSection = [
  heading1('Table of Contents'),
  para('1.  Introduction ........................................................................  3'),
  para('2.  Getting Started ....................................................................  3'),
  para('3.  Role Overview ......................................................................  4'),
  para('4.  Permissions Matrix .................................................................  5'),
  para('5.  Feature Guide by Section ..........................................................  6'),
  para('     5.1  Dashboard .....................................................................  6'),
  para('     5.2  Tasks ...........................................................................  6'),
  para('     5.3  Weekly Check-In ................................................................  7'),
  para('     5.4  Leave Requests ................................................................  7'),
  para('     5.5  Staff Directory ...............................................................  8'),
  para('     5.6  Document Library .............................................................  8'),
  para('     5.7  Announcements .................................................................  9'),
  para('     5.8  Recognition ....................................................................  9'),
  para('     5.9  Events Calendar ..............................................................  9'),
  para('     5.10 Inbox / Notifications .......................................................  10'),
  para('     5.11 Notes ...........................................................................  10'),
  para('     5.12 Admin Panel ...................................................................  10'),
  para('6.  Security & Privacy ..................................................................  11'),
  para('7.  Getting Help .........................................................................  12'),
  pageBreak(),
]

const introSection = [
  heading1('1. Introduction'),
  para(
    'The AfriVate Employee Portal is the central hub for all internal team operations at AfriVate ' +
    'Technologies Ltd (RC 9210092). It brings together task management, leave requests, weekly ' +
    'check-ins, team communications, document access, and recognition into a single, secure, ' +
    'role-based application.'
  ),
  para(
    'This guide covers every section of the portal and explains what each role can see and do. ' +
    'Whether you are a new team member or a returning user, this document will help you get the ' +
    'most out of the platform.'
  ),
  note('The portal is for internal use only. All pages require a valid AfriVate work account. External access is blocked.'),
  blankLine(),
]

const gettingStartedSection = [
  heading1('2. Getting Started'),

  heading2('Accessing the Portal'),
  para('The portal is available at:  https://portal.afrivate.org'),
  para('Open it in a modern browser (Chrome, Edge, Firefox, or Safari). The portal works on desktop and mobile.'),

  heading2('Signing In'),
  bullet('Navigate to https://portal.afrivate.org — you will be taken to the login page automatically.'),
  bullet('Enter your AfriVate work email address (e.g. firstname.lastname@afrivate.org).'),
  bullet('Enter your password and click Sign in.'),
  bullet('If this is your first login, you will have received a setup link by email — use that to set your password before signing in.'),

  heading2('Forgot Your Password?'),
  bullet('Click Forgot your password? on the login page.'),
  bullet('Enter your work email and click Send reset link.'),
  bullet('Check your email for a reset link (valid for 24 hours) and follow the instructions.'),
  bullet('If you do not receive the email, check your spam folder or contact hr@afrivate.org.'),

  heading2('Signing Out'),
  para(
    'On desktop: click your name or avatar in the top-right corner, then select Sign out. ' +
    'On mobile: open the menu (three lines) and scroll to the bottom to find Sign out.'
  ),
  note('For security, always sign out when using a shared or public device.'),
  blankLine(),
  pageBreak(),
]

const roleOverviewSection = [
  heading1('3. Role Overview'),
  para(
    'Every AfriVate portal user is assigned one of five roles. Your role determines which ' +
    'features you can access and what actions you can perform. Roles are assigned by an Administrator ' +
    'and can only be changed by an Administrator.'
  ),
  blankLine(),
  rolesTable(),
  blankLine(),
  note('If you believe your role is incorrect, contact hr@afrivate.org or your line manager.'),
  blankLine(),
  pageBreak(),
]

const permissionsSection = [
  heading1('4. Permissions Matrix'),
  para(
    'The table below summarises which features are available to each role. ' +
    'A tick (✓) means the role has access; a dash (–) means it does not.'
  ),
  blankLine(),
  permissionsMatrix(),
  blankLine(),
  pageBreak(),
]

const featureGuideSection = [
  heading1('5. Feature Guide by Section'),

  // 5.1 Dashboard
  heading2('5.1  Dashboard'),
  para(
    'The dashboard is the first page you see after logging in. It gives you a personalised ' +
    'overview of your work, including:'
  ),
  bullet('Upcoming and overdue tasks assigned to you'),
  bullet('Recent announcements from the organisation'),
  bullet('Your pending leave balance'),
  bullet('Recent recognition posts from colleagues'),
  bullet('A summary of your latest weekly check-in'),
  blankLine(),

  // 5.2 Tasks
  heading2('5.2  Tasks'),
  para(
    'The Tasks section lets you track and manage work items. Tasks can be personal (just for ' +
    'you) or assigned to one or more team members.'
  ),
  heading3('Creating a task'),
  bullet('Click New Task and fill in the title, description, due date (optional), and priority.'),
  bullet('Assign the task to yourself or to other team members (Team Lead and above only).'),
  bullet('Set the task status: To Do, In Progress, or Done.'),
  heading3('Editing a task'),
  bullet('Click any task to open its detail view.'),
  bullet('You can edit the title, description, status, and assignees.'),
  bullet('Only the task owner or an Administrator can change the due date.'),
  heading3('Deleting a task'),
  bullet('Open the task detail view and click Delete. A confirmation prompt will appear.'),
  bullet('Only the task owner or an Administrator can delete a task.'),
  note('Assignees can update task status (e.g. mark as Done) but cannot change the due date — only the task owner or an Admin can do that.'),
  blankLine(),

  // 5.3 Weekly Check-In
  heading2('5.3  Weekly Check-In'),
  para(
    'The Weekly Check-In is a short reflection submitted once per week. It helps your team ' +
    'lead and HR understand how you are doing and what you are working on.'
  ),
  bullet('Navigate to Check-In in the sidebar.'),
  bullet('Answer the prompts: what you accomplished, what you are working on next, any blockers, and your overall mood.'),
  bullet('Click Submit to save your entry.'),
  bullet('You can view your previous check-ins from the history section.'),
  para('Team Leads, HR, and Administrators can view the check-ins of all team members.'),
  blankLine(),

  // 5.4 Leave Requests
  heading2('5.4  Leave Requests'),
  para(
    'Use the Leave Requests section to apply for time off, track the status of your requests, ' +
    'and (for leads) review and action team requests.'
  ),
  heading3('Submitting a leave request'),
  bullet('Click New Leave Request.'),
  bullet('Select the leave type (Annual, Sick, Maternity/Paternity, Compassionate, Unpaid).'),
  bullet('Choose the start and end dates and provide a brief reason.'),
  bullet('Click Submit. Your request will be sent to your line manager for review.'),
  heading3('Checking request status'),
  bullet('Pending — awaiting review by your line manager or HR.'),
  bullet('Approved — your leave has been confirmed.'),
  bullet('Declined — your leave was not approved. The reason will be shown.'),
  heading3('Approving or declining requests (Asst. Lead and above)'),
  bullet('Go to Leave Requests and find requests with Pending status.'),
  bullet('Click the request to open it, then click Approve or Decline.'),
  bullet('Adding a note is optional but recommended when declining.'),
  note('You cannot approve your own leave request. It must be reviewed by a higher-level role.'),
  blankLine(),

  // 5.5 Staff Directory
  heading2('5.5  Staff Directory'),
  para(
    'The Staff Directory shows a searchable list of all active AfriVate team members. ' +
    'You can view a colleague\'s name, role, department, and contact email.'
  ),
  bullet('Use the search bar to filter by name, department, or role.'),
  bullet('Click any profile card to see the full profile.'),
  bullet('Click the email icon to open a pre-filled email to that colleague.'),
  para('Administrators can also edit profiles, change roles, and deactivate accounts from this section.'),
  blankLine(),

  // 5.6 Document Library
  heading2('5.6  Document Library'),
  para(
    'The Document Library stores all company documents, policies, templates, and onboarding ' +
    'materials. Documents are organised into categories.'
  ),
  bullet('Browse or search for a document by name or category.'),
  bullet('Click a document to view a description, then download it.'),
  bullet('Some documents are restricted by role:'),
  bullet('HR-only documents are visible to HR and Administrators only.', { level: 1 }),
  bullet('Management documents are visible to Team Lead, HR, and Administrators.', { level: 1 }),
  bullet('All other documents are visible to all staff.', { level: 1 }),
  para('Administrators can upload, edit, and delete documents.'),
  blankLine(),

  // 5.7 Announcements
  heading2('5.7  Announcements'),
  para(
    'Announcements are company-wide messages posted by Team Leads, HR, or Administrators. ' +
    'They appear on the Dashboard and in the Announcements section.'
  ),
  bullet('All staff can read announcements.'),
  bullet('Team Leads, HR, and Administrators can post new announcements.'),
  bullet('Administrators can delete announcements.'),
  note('Important announcements are pinned to the top of the list.'),
  blankLine(),

  // 5.8 Recognition
  heading2('5.8  Recognition'),
  para(
    'The Recognition section (also called "Shout-Outs") lets you celebrate the great work of ' +
    'your colleagues publicly within the portal.'
  ),
  bullet('Click Give Recognition and select the colleague you want to recognise.'),
  bullet('Write a short message explaining what they did well.'),
  bullet('Choose a category (e.g. Teamwork, Innovation, Customer Focus).'),
  bullet('Click Post. The recognition will appear on the recognition feed and the recipient\'s dashboard.'),
  para('All staff can give and receive recognition. Administrators can delete posts if necessary.'),
  blankLine(),

  // 5.9 Events Calendar
  heading2('5.9  Events Calendar'),
  para(
    'The Events Calendar shows upcoming company events, team meetings, public holidays, ' +
    'and deadlines.'
  ),
  bullet('Use the calendar view to browse events by month.'),
  bullet('Click an event to see its details, location, and description.'),
  bullet('All staff can view events.'),
  bullet('Administrators can add, edit, and delete events.'),
  blankLine(),

  // 5.10 Inbox
  heading2('5.10  Inbox / Notifications'),
  para(
    'The Inbox shows all notifications addressed to you, including task assignments, ' +
    '@mentions, leave request decisions, and system messages.'
  ),
  bullet('Unread notifications are highlighted. Click a notification to open the related item.'),
  bullet('Click Mark all as read to clear the unread badge.'),
  bullet('You only see your own notifications — they are private to you.'),
  blankLine(),

  // 5.11 Notes
  heading2('5.11  Notes'),
  para(
    'Notes is a personal notepad built into the portal. Use it to jot down ideas, meeting notes, ' +
    'or reminders — only you can see your notes.'
  ),
  bullet('Click New Note and give it a title.'),
  bullet('Type your note using the rich-text editor (supports bold, bullet lists, and headings).'),
  bullet('Notes save automatically as you type.'),
  bullet('Click the trash icon to delete a note — a confirmation prompt will appear.'),
  note('Notes are stored in your browser. They will not sync across devices unless you are signed in on the same browser profile.'),
  blankLine(),

  // 5.12 Admin Panel
  heading2('5.12  Admin Panel'),
  para(
    'The Admin Panel is available to HR and Administrators only. It provides tools for managing ' +
    'the organisation structure, users, and content.'
  ),
  heading3('User management (Admin only)'),
  bullet('View all registered users: name, email, role, department, and account status.'),
  bullet('Change a user\'s role using the role dropdown.'),
  bullet('Deactivate or reactivate accounts.'),
  bullet('Invite new users by email (HR and Admin).'),
  heading3('Departments & Teams (Admin only)'),
  bullet('Create, rename, or delete departments.'),
  bullet('Create, rename, or delete teams within departments.'),
  heading3('Announcements management'),
  bullet('Post, edit, and (Admin only) delete company-wide announcements.'),
  heading3('Training videos'),
  bullet('Upload and manage training/onboarding videos visible to all staff.'),
  heading3('Onboarding checklist'),
  bullet('Manage the onboarding tasks that new joiners must complete.'),
  heading3('Audit log (HR and Admin)'),
  bullet('View a timestamped log of significant admin actions: role changes, account approvals, and leave decisions.'),
  bullet('The audit log is read-only and cannot be edited or deleted.'),
  blankLine(),
  pageBreak(),
]

const securitySection = [
  heading1('6. Security & Privacy'),

  heading2('Keeping your account secure'),
  bullet('Use a strong, unique password for your portal account.'),
  bullet('Never share your password with anyone, including IT or HR.'),
  bullet('Always sign out when using a shared device.'),
  bullet('If you suspect your account has been compromised, change your password immediately and inform hr@afrivate.org.'),

  heading2('What data the portal holds about you'),
  para(
    'The portal stores your name, work email, job title, department, role, leave records, ' +
    'check-in entries, task assignments, and recognition posts. Full details are in the ' +
    'Employee Portal Privacy Notice, available under Settings → Privacy Notice inside the portal.'
  ),

  heading2('Your data rights (NDPA 2023)'),
  bullet('Access — you can request a copy of the data we hold about you.'),
  bullet('Correction — you can ask us to correct inaccurate information.'),
  bullet('Deletion — you can request deletion of non-statutory data.'),
  bullet('Objection — you can object to certain types of processing.'),
  para('To exercise any of these rights, contact hr@afrivate.org. We will respond within 30 days.'),

  heading2('Confidentiality'),
  para(
    'Information you access through the portal — including other employees\' personal data, ' +
    'leave records, and HR documents — is strictly confidential. Do not share, copy, or ' +
    'forward this information outside AfriVate without explicit authorisation.'
  ),
  blankLine(),
  pageBreak(),
]

const helpSection = [
  heading1('7. Getting Help'),

  para('If you need help with the portal, use the following contacts:'),
  blankLine(),

  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY },
      left:   { style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY },
      right:  { style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY },
      insideH:{ style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY },
      insideV:{ style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: DARK, fill: DARK },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Issue', font: FONT, size: 22, bold: true, color: WHITE })] })],
          }),
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: DARK, fill: DARK },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Contact', font: FONT, size: 22, bold: true, color: WHITE })] })],
          }),
        ],
      }),
      ...[
        ['Cannot log in / forgot password', 'hr@afrivate.org or use the Forgot password link on the login page'],
        ['Wrong role assigned to your account', 'Your line manager or hr@afrivate.org'],
        ['Bug or technical issue with the portal', 'hr@afrivate.org — include a screenshot and description'],
        ['Question about leave balances', 'hr@afrivate.org'],
        ['Data / privacy request', 'hr@afrivate.org'],
        ['General HR enquiries', 'hr@afrivate.org'],
      ].map(([issue, contact]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: issue, font: FONT, size: 22, color: DARK })] })],
            }),
            new TableCell({
              width: { size: 60, type: WidthType.PERCENTAGE },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: contact, font: FONT, size: 22, color: DARK })] })],
            }),
          ],
        })
      ),
    ],
  }),
  blankLine(),
  blankLine(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY } },
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({ text: 'AfriVate Technologies Ltd  ·  RC 9210092  ·  Abuja, Nigeria', font: FONT, size: 20, color: MUTED }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: 'Employee Portal User Guide  ·  Version 1.0  ·  June 2026', font: FONT, size: 20, color: MUTED }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: 'Internal & Confidential', font: FONT, size: 20, bold: true, color: PURPLE }),
    ],
  }),
]

// ════════════════════════════════════════════════════════════════════════════════
//  BUILD THE DOCUMENT
// ════════════════════════════════════════════════════════════════════════════════

const doc = new Document({
  creator: 'AfriVate Technologies Ltd',
  title: 'AfriVate Employee Portal — User Guide',
  description: 'Internal user guide for the AfriVate employee portal, covering all five roles.',
  keywords: 'internal,confidential,portal,user guide',
  styles: {
    default: {
      document: {
        run: { font: FONT, size: 22, color: DARK },
      },
      heading1: {
        run: { font: FONT_HEADING, size: 36, bold: true, color: PURPLE },
        paragraph: { spacing: { before: 320, after: 160 } },
      },
      heading2: {
        run: { font: FONT_HEADING, size: 28, bold: true, color: PURPLE },
        paragraph: { spacing: { before: 240, after: 120 } },
      },
      heading3: {
        run: { font: FONT_HEADING, size: 24, bold: true, color: DARK },
        paragraph: { spacing: { before: 200, after: 80 } },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top:    convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left:   convertInchesToTwip(1.25),
            right:  convertInchesToTwip(1.25),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: PURPLE } },
              spacing: { after: 80 },
              children: [
                new TextRun({ text: 'AfriVate Employee Portal  ·  User Guide  ·  INTERNAL', font: FONT, size: 18, color: MUTED }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY } },
              spacing: { before: 80 },
              children: [
                new TextRun({ text: 'Page ', font: FONT, size: 18, color: MUTED }),
                new PageNumberElement(),
                new TextRun({ text: '  ·  Confidential — internal use only', font: FONT, size: 18, color: MUTED }),
              ],
            }),
          ],
        }),
      },
      children: [
        ...coverPage,
        ...tocSection,
        ...introSection,
        ...gettingStartedSection,
        ...roleOverviewSection,
        ...permissionsSection,
        ...featureGuideSection,
        ...securitySection,
        ...helpSection,
      ],
    },
  ],
})

mkdirSync(OUT_DIR, { recursive: true })
const buffer = await Packer.toBuffer(doc)
writeFileSync(OUT_FILE, buffer)
console.log(`✓ User guide written to ${OUT_FILE}`)
