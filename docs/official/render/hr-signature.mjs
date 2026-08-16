/** Shared HR signatory — update here to propagate across official documents. */
export const HR_SIGNATORY_NAME = 'Emmanuel Okpiaifo'
export const HR_SIGNATORY_TITLE = 'Human Resources Manager'
export const HR_SIGNATORY_ORG = 'AfriVate Technologies Ltd'

export const hrSignCardHtml = `<div class="sign-card"><div class="who">${HR_SIGNATORY_NAME}</div><div class="role">${HR_SIGNATORY_TITLE} · ${HR_SIGNATORY_ORG}</div></div>`

export const hrSignBlockWithCeoHtml = `
  <div class="sign-block">
    <p><strong>Issued for and on behalf of AfriVate Technologies Ltd,</strong></p>
    <div class="sign-row">
      <div class="sign-card"><div class="who">Joshua Oluwasujibomi Komolafe</div><div class="role">Chief Executive Officer</div></div>
      ${hrSignCardHtml}
    </div>
  </div>`

export const hrSignBlockIssuedHtml = `
  <div class="sign-block">
    <p><strong>Issued for AfriVate Technologies Ltd,</strong></p>
    <div class="sign-row">
      <div class="sign-card"><div class="who">Joshua Oluwasujibomi Komolafe</div><div class="role">Chief Executive Officer</div></div>
      ${hrSignCardHtml}
    </div>
  </div>`

export const hrAcknowledgementSignBlockHtml = `
  <div class="sign-block">
    <p><strong>Acknowledgement</strong></p>
    <p>By acknowledging this document in the Portal (or signing below where a written copy is used), the Team Member confirms they have read, understood, and agree to comply.</p>
    <div class="sign-row">
      <div class="sign-card"><div class="who">Team Member Name / Signature</div><div class="role">Role / Department · Date</div></div>
      ${hrSignCardHtml}
    </div>
  </div>`
