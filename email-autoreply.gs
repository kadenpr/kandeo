// Kandeo — Gmail Auto-Reply Script
//
// Handles two sources:
//   1. Direct emails to kandeoai@gmail.com
//   2. Website form submissions (via FormSubmit) — replies to the enquirer, not FormSubmit
//
// SETUP:
// 1. Go to script.google.com — sign in with kandeoai@gmail.com
// 2. New project → paste this file → save
// 3. Run → autoReplyToEnquiries → grant permissions
// 4. Clock icon → Add Trigger:
//      Function: autoReplyToEnquiries | Time-driven | Minutes timer | Every 5 minutes
// 5. Save.

const CALENDLY_LINK = 'https://calendly.com/kandeoai/30min';
const LABEL_NAME    = 'kandeo-auto-replied';
const REPLY_NAME    = 'Kandeo';

function autoReplyToEnquiries() {
  let label;
  try { label = GmailApp.getUserLabelByName(LABEL_NAME); } catch(e) {}
  if (!label) label = GmailApp.createLabel(LABEL_NAME);

  const threads = GmailApp.search(`is:unread -label:${LABEL_NAME}`, 0, 25);

  threads.forEach(thread => {
    const msg     = thread.getMessages()[0];
    const from    = msg.getFrom();
    const subject = msg.getSubject() || '';
    const replyTo = msg.getReplyTo();

    // Skip automated senders to avoid loops
    if (/no-?reply|noreply|mailer-daemon|unsubscribe|postmaster|@googlegroups|kandeoai@gmail/i.test(from)) {
      thread.addLabel(label);
      return;
    }

    // Detect website form submissions from FormSubmit
    const isFormSubmit = /formsubmit/i.test(from) || /— Kandeo/i.test(subject);

    // For form submissions: send to the enquirer's email (stored in Reply-To)
    // For direct emails: reply to the sender
    let recipientEmail = from;
    if (isFormSubmit && replyTo) {
      // Reply-To may be "Name <email@domain.com>" — extract just the address
      const match = replyTo.match(/<(.+?)>/) || replyTo.match(/([^\s]+@[^\s]+)/);
      if (match) recipientEmail = match[1];
    }

    // Extract first name
    // For form submissions the subject is "New enquiry from Alex Turner — Kandeo"
    let firstName = 'there';
    if (isFormSubmit) {
      const nameMatch = subject.match(/New enquiry from ([^\s]+)/);
      if (nameMatch) firstName = nameMatch[1];
    } else {
      const nameMatch = from.match(/^"?([^"<@]+)"?\s*</);
      if (nameMatch) firstName = nameMatch[1].trim().split(/\s+/)[0];
    }

    const htmlBody = `
<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;line-height:1.65;max-width:560px">
  <p>Hi ${firstName},</p>
  <p>Thanks for getting in touch with Kandeo.</p>
  <p>We've received your message and one of the team will get back to you <strong>within 24 hours</strong> — usually the same day.</p>
  <p>If you'd prefer to book a call straight away, you can pick a time here:<br>
     <a href="${CALENDLY_LINK}" style="color:#0d9e9a">${CALENDLY_LINK}</a></p>
  <p>Speak soon,<br><strong>The Kandeo Team</strong></p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="font-size:12px;color:#999">
    Kandeo · AI front desk for service businesses · London, UK<br>
    kandeoai@gmail.com
  </p>
</div>`;

    if (isFormSubmit) {
      // Send a fresh email directly to the person who filled in the form
      GmailApp.sendEmail(recipientEmail, 'Thanks for your enquiry — Kandeo', '', {
        htmlBody,
        name: REPLY_NAME,
        replyTo: 'kandeoai@gmail.com',
      });
    } else {
      // Reply to direct email
      msg.reply('', { htmlBody, name: REPLY_NAME });
    }

    thread.addLabel(label);
    Logger.log(`Auto-replied to: ${recipientEmail} (${isFormSubmit ? 'form' : 'direct'})`);
  });
}
