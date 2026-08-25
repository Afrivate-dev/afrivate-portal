import { hrSignBlockIssuedHtml } from '../hr-signature.mjs'

function paras(text) {
  return text
    .trim()
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, '<br />')}</p>`)
    .join('\n')
}

function pills(words) {
  return `<div class="pills">${words
    .map((w) => `<span class="pill">${w}</span>`)
    .join('')}</div>`
}

function videoCard({ n, title, slug, purpose, tone, beats, highlights, script, pageBreak = true }) {
  return `
  <article class="shot${pageBreak ? ' page-break' : ''}">
    <div class="shot-head">
      <div>
        <span class="ep">Video ${n} of 8</span>
        <h3>${title}</h3>
      </div>
      <div class="shot-meta">60–90 seconds · 2–3 takes</div>
    </div>
    <div class="split">
      <div class="box">
        <h4>Purpose</h4>
        <p>${purpose}</p>
      </div>
      <div class="box">
        <h4>Tone</h4>
        <p>${tone}</p>
      </div>
    </div>
    <h4>Hit these beats</h4>
    <ol class="beats">
      ${beats.map((b) => `<li>${b}</li>`).join('\n')}
    </ol>
    <h4>Words to land (for on-screen highlights)</h4>
    ${pills(highlights)}
    <h4>Suggested script — a guide, not a teleprompter</h4>
    <div class="script">${paras(script)}</div>
    <p class="take-note">If you stumble, pause and repeat the sentence. Keep rolling. Label files <code>AFRI-CVS-V${n}-${slug}-Take1.MOV</code>.</p>
  </article>`
}

const videos = [
  {
    n: 1,
    title: 'Welcome to AfriVate',
    slug: 'Welcome',
    purpose: 'A personal introduction and a reminder that every person on this team is contributing to the same vision.',
    tone: 'Warm, direct, and welcoming. Speak as if you are greeting one person, not addressing a crowd.',
    beats: [
      'Introduce yourself as Joshua, CEO of AfriVate Technologies.',
      'Speak to both long-standing and new team members.',
      'We are not just building a company — we are building something that can make a meaningful difference across Africa.',
      'Remote work can feel separate; name that, then close it: we are one team.',
      'Name the work: design, code, research, problem-solving, conversations.',
      'Close with: your contribution matters. Welcome. Let’s build something meaningful together.',
    ],
    highlights: ['Vision', 'Contribution', 'Together'],
    script: `Hi everyone.

I'm Joshua, the CEO of AfriVate Technologies.

I wanted to take a moment to speak directly to everyone who is part of this team.

Whether you've been here from the beginning or you're just joining us, I want you to understand something very important about AfriVate.

We are not just building a company.

We're building something that we believe can make a meaningful difference in people's lives across Africa.

And because we're a remote team, it can sometimes be easy to feel like we're all working separately.

But we're not.

Every person on this team is contributing to the same vision.

The designs you're creating, the code you're writing, the research you're doing, the problems you're solving, and the conversations you're having all contribute to what AfriVate becomes.

So I'm excited to have you here.

And I want you to know that your contribution matters.

Welcome to AfriVate.

Let's build something meaningful together.`,
  },
  {
    n: 2,
    title: 'Why AfriVate Exists',
    slug: 'Why-We-Exist',
    purpose: 'Help everyone connect daily work to the reason AfriVate exists.',
    tone: 'Thoughtful and grounded. Less pep talk, more clarity. Pause on the three questions.',
    beats: [
      'Open with the question: why do we exist?',
      'We are a technology company — but technology is not the reason we are here.',
      'Real problems across Africa need better solutions; technology is how we build them.',
      'Goal: digital products that are useful, scalable, and capable of improving quality of life.',
      'Whatever your role, connect your work to the bigger picture.',
      'Replace “What task am I supposed to complete?” with: Why are we doing this? Who does this help? How can I do it better?',
    ],
    highlights: ['Why', 'Impact', 'Better'],
    script: `I want to talk about something that I think every person at AfriVate should understand.

Why do we exist?

At the simplest level, we're a technology company.

But technology isn't the reason we're here.

We're here because there are real problems across Africa that need better solutions.

And we believe technology gives us an opportunity to build those solutions.

Our goal is to create digital products that are useful, scalable and capable of improving people's quality of life.

That means that whatever your role is at AfriVate, you should always be able to connect your work to the bigger picture.

Don't just ask yourself, "What task am I supposed to complete?"

Ask yourself:

"Why are we doing this?"

"Who does this help?"

"And how can I do it better?"

That's the mindset I want us to have as we build AfriVate.`,
  },
  {
    n: 3,
    title: 'Our Values',
    slug: 'Values',
    purpose: 'Explain the values that should guide how we work every day — not words that sit in a document.',
    tone: 'Clear and steady. Give each value a beat of its own. This is the values film.',
    beats: [
      'Values are not decoration. They should influence how we work every day.',
      'Ownership — if it is yours, take it. Do not wait to be reminded.',
      'Excellence — ask how to make the work better, not only how to finish it.',
      'Integrity — be honest, be accountable, speak up when something is not going well.',
      'Impact — what we build needs to matter.',
      'These apply in every role: developer, designer, researcher, marketer, operations.',
    ],
    highlights: ['Ownership', 'Excellence', 'Integrity', 'Impact'],
    script: `At AfriVate, our values aren't supposed to be words that sit inside a document.

They're supposed to influence how we work every day.

One of the most important things we value is ownership.

If something is your responsibility, take ownership of it. Don't wait for someone to constantly remind you.

We also value excellence.

We should always be asking ourselves how we can make our work better — not just how we can finish it.

We value integrity.

Be honest. Be accountable. Communicate when something isn't going well.

And we value impact.

At the end of the day, what we're building needs to matter.

I want everyone at AfriVate to understand that these values apply regardless of your role.

Whether you're a developer, designer, researcher, marketer, or you're working in operations, these principles should guide how you work.

That's the culture we're trying to build.`,
  },
  {
    n: 4,
    title: 'Working Remotely at AfriVate',
    slug: 'Remote',
    purpose: 'Reinforce trust, communication, and accountability as the basis of remote work.',
    tone: 'Calm and adult. This is about trust, not surveillance. Do not sound like a warning.',
    beats: [
      'AfriVate is a remote team — that freedom comes with responsibility.',
      'The culture is not about being watched. It is about trust.',
      'Trust comes from communication, accountability, and consistency.',
      'Keep the team informed. Speak up when stuck. Flag missed deadlines early. Own mistakes. Take responsibility seriously.',
      'Remote does not mean disconnected — we have tools and processes.',
      'Good remote work comes down to people who can be trusted.',
    ],
    highlights: ['Trust', 'Communication', 'Accountability'],
    script: `One thing that makes AfriVate different is the way we work.

We're a remote team.

And remote work gives us a lot of freedom, but it also comes with responsibility.

Because I can't physically see you working, I don't want the culture here to be about being watched.

I want it to be about trust.

And trust comes from communication, accountability and consistency.

If you're working on something, keep your team informed.

If you're stuck, speak up.

If you're going to miss a deadline, communicate early.

If you've made a mistake, own it.

And if you've been given responsibility for something, take it seriously.

Remote work doesn't mean we're disconnected.

We have tools, systems and processes that help us work together.

But ultimately, good remote work comes down to people who can be trusted.

That's the kind of team I want us to become.`,
  },
  {
    n: 5,
    title: 'What I Expect From You',
    slug: 'Expectations',
    purpose: 'State the standards and behaviours you expect from every member of the team.',
    tone: 'Direct, fair, and encouraging. Number the four expectations so they land.',
    beats: [
      'First — ownership. Do not wait to be told every step. If you see a problem, help solve it.',
      'Second — communication. Do not disappear when stuck. Do not wait until a deadline has passed.',
      'Third — keep learning. You do not need to know everything on day one. You do need to be willing to grow.',
      'Fourth — care about quality. We are building things that represent AfriVate. Build them well.',
    ],
    highlights: ['Ownership', 'Communication', 'Learning', 'Quality'],
    script: `As the CEO of AfriVate, there are a few things I expect from everyone on this team.

First, I expect you to take ownership.

Don't wait for someone to tell you every single step.

If you see a problem, think about how you can help solve it.

Second, I expect communication.

Especially because we're remote, communication is extremely important.

Don't disappear when you're stuck.

Don't wait until a deadline has passed before explaining that something went wrong.

Communicate.

Third, I expect you to keep learning.

You don't need to know everything when you join AfriVate.

But you should be willing to learn, improve and grow.

And finally, I expect you to care about the quality of your work.

We're building things that represent AfriVate.

So let's build them well.

Those are the standards I want us to hold ourselves to.`,
  },
  {
    n: 6,
    title: 'A Message About Growth',
    slug: 'Growth',
    purpose: 'Encourage people to take responsibility for their own learning and development.',
    tone: 'Encouraging and honest. You are not asking for perfection — you are asking for intention.',
    beats: [
      'This should be a place where people grow.',
      'You should not be the same person in six months.',
      'Know more. Be better at what you do. Be more confident. See progress in your work.',
      'Growth is not automatic — be intentional.',
      'Ask questions. Take feedback seriously. Learn from mistakes and from the people around you. Try something difficult.',
      'I do not expect perfection. I expect a willingness to learn. If everyone gets better, AfriVate gets better.',
    ],
    highlights: ['Growth', 'Learn', 'Improve'],
    script: `I want everyone at AfriVate to understand something.

This is a place where you should be growing.

You shouldn't be the same person six months from now that you are today.

You should know more.

You should be better at what you do.

You should be more confident.

And you should be able to look back at your work and see progress.

But growth doesn't happen automatically.

You have to be intentional about it.

Ask questions.

Take feedback seriously.

Learn from your mistakes.

Learn from the people around you.

And don't be afraid to try something difficult.

I don't expect perfection from anyone on this team.

What I expect is a willingness to learn and improve.

If we can build a culture where everyone is continuously getting better, then AfriVate will continuously get better too.`,
  },
  {
    n: 7,
    title: 'What Success Looks Like',
    slug: 'Success',
    purpose: 'Define success as creating value — not completing tasks, attending meetings, or being busy.',
    tone: 'Quietly ambitious. Let the line “I helped build that” land. Pause before it.',
    beats: [
      'Success is not completing tasks, attending meetings, or being busy.',
      'Success is creating value: solving problems, moving the team forward, improving your skills, producing work you are proud of.',
      'Contribute to something bigger than your individual role.',
      'The test: one day, look at AfriVate and say, “I helped build that.”',
    ],
    highlights: ['Value', 'Proud', 'I helped build that'],
    script: `What does success at AfriVate look like?

It's not simply completing your tasks.

It's not simply attending meetings.

And it's not simply being busy.

Success means you're creating value.

You're solving problems.

You're helping the team move forward.

You're improving your skills.

You're producing work that you're proud of.

And you're contributing to something bigger than your individual role.

I want everyone here to eventually look at AfriVate and say:

"I helped build that."

That's what success means to me.

And that's the kind of culture I want us to create together.`,
  },
  {
    n: 8,
    title: 'Final Message From Joshua',
    slug: 'Close',
    purpose: 'Close the series with an encouraging message about the journey ahead.',
    tone: 'Warm close. Smile more here. Leave people proud to be on the team.',
    beats: [
      'We are still building, still learning, still figuring things out. Challenges are part of building something meaningful.',
      'Keep moving forward together.',
      'Take pride in the work. Challenge yourself. Support the people around you.',
      'Remember why: digital products that elevate life in Africa. Bigger than any one person.',
      'Glad you are part of the journey. Let’s keep building. I’ll see you in the next one.',
    ],
    highlights: ['Together', 'Elevate life in Africa', 'Keep building'],
    script: `Before I end this series, I just want to say something to everyone on the AfriVate team.

We're still building.

We're still learning.

We're still figuring things out.

And there will be challenges along the way.

But that's part of building something meaningful.

What matters is that we keep moving forward together.

I want you to take pride in the work that you do here.

I want you to challenge yourself.

I want you to support the people around you.

And most importantly, I want you to remember why we're doing all of this.

We're building digital products that we believe can elevate life in Africa.

That's bigger than any one person.

And I'm glad you're part of the journey.

Let's keep building.

I'll see you in the next one.`,
  },
]

export const ceoVideoSeriesGuideBody = `
  <div class="note"><strong>How to use this guide:</strong> Read the setup once. Then shoot from the video cards — one card per film. The scripts are a structure, not a memorisation test. Use your own words wherever that sounds more like you. This is an operational brief, not a policy.</div>

  <p>Hi Joshua,</p>
  <p>We want a short series in which you speak directly to the AfriVate team about the company, our vision, our values, how we work, and what you expect as we keep building AfriVate.</p>
  <p>These films should feel <strong>personal, authentic, and conversational</strong> — like a one-to-one with you as CEO, not a corporate advertisement or a formal presentation. Because AfriVate is remote, there is no need to imitate an office. A simple, clean, comfortable place where you can speak naturally is exactly right.</p>

  <h2>1. Series at a glance</h2>
  <p>Eight films. Same setup throughout so they cut as one series. Shoot in order if you can; if not, keep clothing, lighting, and camera position consistent across the day.</p>
  <table>
    <thead>
      <tr><th>Video</th><th>Title</th><th>What it does</th><th>Words to land</th></tr>
    </thead>
    <tbody>
      <tr><td>1</td><td>Welcome to AfriVate</td><td>Personal welcome; every contribution counts</td><td>Vision · Contribution</td></tr>
      <tr><td>2</td><td>Why AfriVate Exists</td><td>The reason behind the work</td><td>Why · Impact</td></tr>
      <tr><td>3</td><td>Our Values</td><td>How we work every day</td><td>Ownership · Excellence · Integrity · Impact</td></tr>
      <tr><td>4</td><td>Working Remotely</td><td>Trust, communication, accountability</td><td>Trust · Communication</td></tr>
      <tr><td>5</td><td>What I Expect From You</td><td>Standards for everyone on the team</td><td>Ownership · Learning · Quality</td></tr>
      <tr><td>6</td><td>A Message About Growth</td><td>Own your development</td><td>Growth · Improve</td></tr>
      <tr><td>7</td><td>What Success Looks Like</td><td>Value over busyness</td><td>Value · “I helped build that”</td></tr>
      <tr><td>8</td><td>Final Message</td><td>Close the series; the journey ahead</td><td>Together · Keep building</td></tr>
    </tbody>
  </table>

  <h2>2. Creative direction</h2>
  <div class="split">
    <div class="box do">
      <h4>Do</h4>
      <ul>
        <li>Speak to one person on the other side of the lens.</li>
        <li>Use your normal voice and pace.</li>
        <li>Smile where it is natural — especially Videos 1 and 8.</li>
        <li>Pause after important lines so we can cut and highlight.</li>
        <li>Add a personal example if it helps a point land.</li>
      </ul>
    </div>
    <div class="box dont">
      <h4>Avoid</h4>
      <ul>
        <li>Reading as if it is a press statement.</li>
        <li>A stiff “corporate” posture or forced office backdrop.</li>
        <li>Rushing to stay inside 90 seconds — we would rather trim a strong take.</li>
        <li>Stopping the recording after a small mistake.</li>
        <li>Looking at your own image instead of the camera lens.</li>
      </ul>
    </div>
  </div>
  <p>Imagine you are speaking to one member of the AfriVate team. That is the whole brief for performance.</p>

  <h2>3. Technical specifications</h2>
  <table>
    <thead><tr><th>Item</th><th>Specification</th></tr></thead>
    <tbody>
      <tr><td>Orientation</td><td>Vertical — hold or mount the phone in portrait</td></tr>
      <tr><td>Aspect ratio</td><td>9:16</td></tr>
      <tr><td>Device</td><td>Mobile phone (rear camera preferred if someone can operate it)</td></tr>
      <tr><td>Resolution</td><td>1080p minimum; 4K if the phone supports it</td></tr>
      <tr><td>Frame rate</td><td>30 fps</td></tr>
      <tr><td>Length</td><td>60–90 seconds per video (a little over is fine; we will cut)</td></tr>
      <tr><td>Takes</td><td>2–3 complete takes of each video</td></tr>
      <tr><td>Format</td><td>Native camera app (HEVC/H.264). Do not use a heavy filter or beauty mode</td></tr>
    </tbody>
  </table>
  <div class="note"><strong>Lock the look:</strong> Before Video 1, set the camera position, sit where you will sit, and do not move the phone until the series is done. Consistency across eight films matters more than a “perfect” single take.</div>

  <h2>4. Set, frame, light, and sound</h2>
  <h3>4.1 Where to record</h3>
  <p>Any clean, quiet place where you feel comfortable: a home office, a simple desk, a quiet room, or a well-lit spot near a window. No staged office set. The remote nature of AfriVate is part of who we are.</p>
  <ul>
    <li>Clear clutter behind you. A shelf, a plant, or a plain wall is enough.</li>
    <li>Silence notifications. Close doors. Pause fans if they hum on the microphone.</li>
    <li>Record at a time of day when the light is stable — late morning or mid-afternoon is usually kinder than mixed evening lamps.</li>
  </ul>

  <h3>4.2 Camera position</h3>
  <div class="frame">
    <div class="phone" aria-hidden="true">
      <div class="headroom"></div>
      <div class="bust"></div>
    </div>
    <div>
      <ul>
        <li>Phone <strong>vertical</strong>, at approximately <strong>eye level</strong>. A stack of books or a small tripod is better than holding it.</li>
        <li>Frame from about the <strong>chest upward</strong>, with a little space above your head. Do not crop the top of your head.</li>
        <li>Sit a comfortable distance from the lens — close enough to feel present, far enough that the background can breathe.</li>
        <li>Look into the <strong>camera lens</strong>, not at your preview on the screen. If the preview distracts you, cover it with a small note, or have someone else tap record.</li>
      </ul>
    </div>
  </div>

  <h3>4.3 Lighting</h3>
  <ul>
    <li>Natural light is ideal. Face a window or another soft light source so your face is clearly lit.</li>
    <li>Do not sit with a bright window directly behind you — it will silhouette your face.</li>
    <li>If you use a lamp, keep it slightly off to one side, not straight under your chin.</li>
    <li>Check the first take: if your face looks grey or the background is blown out, move before you shoot the rest.</li>
  </ul>

  <h3>4.4 Audio</h3>
  <p>Clear audio is as important as the picture. If you have a lapel or wireless microphone, use it. If not, record somewhere quiet, keep the phone about an arm’s length away, and do a ten-second sound check: play it back on earphones. If you can hear echo, a fridge, traffic, or rustling clothes, fix that first.</p>

  <h3>4.5 Appearance</h3>
  <p>Wear what you would wear on a good video call: neat, comfortable, and like yourself. Solid colours read well on camera. AfriVate purple, navy, black, cream, or white all work. Avoid busy patterns, large third-party logos, and noisy jewellery. If you wear glasses, tilt the light so they do not flare.</p>

  <h2>5. How to deliver</h2>
  <ol>
    <li>Read the card for that video once. Get the beats, not the sentences.</li>
    <li>Put the phone in position. Do a five-second framing check.</li>
    <li>Look at the lens. Take a breath. Start.</li>
    <li>Speak naturally. Use your normal tone. Gesture if that is how you talk.</li>
    <li>Pause between important points — those pauses become jump cuts and on-screen words.</li>
    <li>If you miss a line, pause, then say the sentence again. Do not stop the recording unless something is unusable (a door slam, a phone ringing through).</li>
    <li>Do two or three full takes. The second take is often the one we use.</li>
  </ol>
  <p>The most important thing is that the message sounds like <strong>you</strong>.</p>

  <h2>6. Pre-shoot checklist</h2>
  <div class="check-grid">
    <div class="tick"><span class="box-tick"></span> Phone charged; storage free; Do Not Disturb on</div>
    <div class="tick"><span class="box-tick"></span> Rear camera, 1080p or 4K, 30 fps, portrait</div>
    <div class="tick"><span class="box-tick"></span> Phone locked at eye level; framing checked</div>
    <div class="tick"><span class="box-tick"></span> Face lit; no bright window behind you</div>
    <div class="tick"><span class="box-tick"></span> Room quiet; mic tested on playback</div>
    <div class="tick"><span class="box-tick"></span> Background tidy; same seat for all eight films</div>
    <div class="tick"><span class="box-tick"></span> Water nearby; this guide open on another device</div>
    <div class="tick"><span class="box-tick"></span> 10–15 minutes blocked per video, including retakes</div>
  </div>

  <h2>7. File naming and delivery</h2>
  <p>Please do not edit the clips yourself. Send the original camera files.</p>
  <table>
    <thead><tr><th>What</th><th>How</th></tr></thead>
    <tbody>
      <tr><td>File name</td><td><code>AFRI-CVS-V1-Welcome-Take2.MOV</code> (video number, short title, take number)</td></tr>
      <tr><td>What to send</td><td>All complete takes. If a take is unusable, still send it and mark it in the note.</td></tr>
      <tr><td>Where</td><td>A shared Drive folder that People &amp; Culture will create, or a link to hr@afrivate.org</td></tr>
      <tr><td>Note with the files</td><td>Which take you prefer for each video, if you have a preference</td></tr>
    </tbody>
  </table>

  <h2>8. Shoot cards</h2>
  <p>Each card below is one film. Use the beats if you want to speak freely. Use the script if you want a full pass. Either is correct.</p>
  ${videos.map((v, i) => videoCard({ ...v, pageBreak: i > 0 })).join('\n')}

  <h2>9. Editing direction</h2>
  <p>For People &amp; Culture and the editor. The finished films should stay clean, simple, and professional. Nothing should pull attention away from Joshua.</p>
  <h3>9.1 Include</h3>
  <ul>
    <li>AfriVate branding (logo sting / lower third as designed)</li>
    <li>Clean subtitles throughout</li>
    <li>Simple text highlights on the words marked on each card</li>
    <li>Appropriate jump cuts to keep pace</li>
    <li>Light background music only where it supports, never where it competes</li>
    <li>AfriVate visuals where they help: Portal screens, team screenshots, virtual meetings, product interfaces, internal tools — not a fake office</li>
  </ul>
  <h3>9.2 Highlight vocabulary</h3>
  ${pills(['Ownership', 'Integrity', 'Excellence', 'Impact', 'Communication', 'Growth', 'Trust', 'Quality'])}
  <h3>9.3 Do not</h3>
  <ul>
    <li>Use heavy effects, transitions, or trend audio that dates the series</li>
    <li>Stage an office that is not ours</li>
    <li>Cover Joshua’s face with graphics during key lines</li>
    <li>Normalise the series into an advertisement. These are messages to the team.</li>
  </ul>

  <h2>10. Closing note to Joshua</h2>
  <p>The most important thing is that these videos sound like you. The scripts are there to structure the message. Please adjust the wording, add personal experience, or say an idea differently if that feels more natural.</p>
  <p>We want the team to hear directly from you — not only what AfriVate is building, but why we are building it, how we should work together, and the kind of company we are becoming.</p>
  <p>Thank you, Joshua.</p>
  <p class="tagline">Build Digital Products That Elevate Life in Africa.</p>

  <p class="footer-note">Internal operational brief. Not a binding policy. Master copy: official document repository. Contact: hr@afrivate.org.</p>
  ${hrSignBlockIssuedHtml}
`
