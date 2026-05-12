const https = require('https');

function resendRequest(body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data || '{}'));
        } else {
          reject(new Error(`Resend ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function verifyEmailConfig() {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️  RESEND_API_KEY not set — email notifications disabled');
    return false;
  }
  try {
    // Send a test to verify the key is valid without actually delivering
    await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.resend.com',
        path: '/domains',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
      };
      const req = https.request(options, (res) => {
        res.on('data', () => {});
        res.on('end', () => res.statusCode < 400 ? resolve() : reject(new Error(`Status ${res.statusCode}`)));
      });
      req.on('error', reject);
      req.end();
    });
    console.log('✅ Resend email ready');
    return true;
  } catch (error) {
    console.error('❌ Resend verification failed:', error.message);
    return false;
  }
}

async function sendEmail(to, template) {
  if (!process.env.RESEND_API_KEY) return false;
  try {
    await resendRequest({
      from: `Nebs Marketing OS <${process.env.EMAIL_FROM}>`,
      to: [to],
      subject: template.subject,
      html: template.html,
    });
    console.log(`📧 Email sent → ${to} | ${template.subject}`);
    return true;
  } catch (error) {
    console.error(`📧 Email FAILED → ${to} | ${error.message}`);
    return false;
  }
}

async function sendBulkEmail(users, templateFn) {
  for (const user of users) {
    await sendEmail(user.work_email, templateFn(user.full_name));
  }
}

const emailTemplates = {
  taskAssigned: (userName, taskName, deadline) => ({
    subject: `New Task Assigned: ${taskName}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: #1A56DB; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Nebs Marketing OS</h1>
        </div>
        <div style="background: white; border-radius: 0 0 12px 12px; padding: 32px;">
          <h2 style="color: #1e293b;">Hi ${userName},</h2>
          <p style="color: #475569;">You have been assigned a new task:</p>
          <div style="background: #EFF6FF; border-left: 4px solid #1A56DB; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <strong style="color: #1A56DB; font-size: 18px;">${taskName}</strong>
            ${deadline ? `<p style="color: #64748b; margin: 8px 0 0 0;">Deadline: ${new Date(deadline).toLocaleString()}</p>` : ''}
          </div>
          <p style="color: #475569;">Log in to Nebs Marketing OS to view your task details and get started.</p>
          <a href="${process.env.FRONTEND_URL}/dashboard/my-tasks" style="display: inline-block; background: #1A56DB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">View My Tasks</a>
        </div>
      </div>
    `
  }),

  taskReviewed: (userName, taskName, status, comment) => ({
    subject: `Task ${status === 'accepted' ? 'Approved ✅' : 'Needs Revision 🔄'}: ${taskName}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: ${status === 'accepted' ? '#059669' : '#D97706'}; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Nebs Marketing OS</h1>
        </div>
        <div style="background: white; border-radius: 0 0 12px 12px; padding: 32px;">
          <h2 style="color: #1e293b;">Hi ${userName},</h2>
          <p style="color: #475569;">Your submission for <strong>${taskName}</strong> has been reviewed.</p>
          <div style="background: ${status === 'accepted' ? '#ECFDF5' : '#FFFBEB'}; border-left: 4px solid ${status === 'accepted' ? '#059669' : '#D97706'}; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <strong style="color: ${status === 'accepted' ? '#059669' : '#D97706'};">${status === 'accepted' ? '✅ Approved' : '🔄 Needs Revision'}</strong>
            ${comment ? `<p style="color: #64748b; margin: 8px 0 0 0;">${comment}</p>` : ''}
          </div>
          <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; background: #1A56DB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Go to Dashboard</a>
        </div>
      </div>
    `
  }),

  meetingConfirmed: (userName, topic, date, time) => ({
    subject: `Meeting Confirmed: ${topic}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: #1A56DB; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Nebs Marketing OS</h1>
        </div>
        <div style="background: white; border-radius: 0 0 12px 12px; padding: 32px;">
          <h2 style="color: #1e293b;">Hi ${userName},</h2>
          <p style="color: #475569;">A meeting has been confirmed and added to your calendar:</p>
          <div style="background: #EFF6FF; border-left: 4px solid #1A56DB; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <strong style="color: #1A56DB; font-size: 18px;">${topic}</strong>
            <p style="color: #64748b; margin: 8px 0 0 0;">&#128197; ${date} at ${time}</p>
          </div>
          <a href="${process.env.FRONTEND_URL}/dashboard/meetings" style="display: inline-block; background: #1A56DB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">View Meeting</a>
        </div>
      </div>
    `
  }),

  passwordReset: (userName, resetLink) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: #1A56DB; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Nebs Marketing OS</h1>
        </div>
        <div style="background: white; border-radius: 0 0 12px 12px; padding: 32px;">
          <h2 style="color: #1e293b;">Hi ${userName},</h2>
          <p style="color: #475569;">We received a request to reset your password. Click the button below to proceed:</p>
          <a href="${resetLink}" style="display: inline-block; background: #1A56DB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Reset Password</a>
          <p style="color: #94a3b8; font-size: 14px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
        </div>
      </div>
    `
  }),

  taskCreated: (adminName, creatorName, taskTitle, priority, deadline, taskId) => ({
    subject: `New Task Created: ${taskTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: #1A56DB; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Nebs Marketing OS</h1>
        </div>
        <div style="background: white; border-radius: 0 0 12px 12px; padding: 32px;">
          <h2 style="color: #1e293b;">Hi ${adminName},</h2>
          <p style="color: #475569;">A new task has been created by <strong>${creatorName}</strong>:</p>
          <div style="background: #EFF6FF; border-left: 4px solid #1A56DB; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <strong style="color: #1A56DB; font-size: 18px;">${taskTitle}</strong>
            <p style="color: #64748b; margin: 8px 0 0 0;">Priority: <strong>${(priority || 'medium').toUpperCase()}</strong></p>
            ${deadline ? `<p style="color: #64748b; margin: 4px 0 0 0;">Deadline: ${new Date(deadline).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
          </div>
          <a href="${process.env.FRONTEND_URL}/dashboard/tasks/${taskId}" style="display: inline-block; background: #1A56DB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">View Task</a>
        </div>
      </div>
    `
  }),

  taskSubmitted: (adminName, uploaderName, taskTitle, fileName, taskId) => ({
    subject: `File Submitted for Review: ${taskTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: #D97706; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Nebs Marketing OS</h1>
        </div>
        <div style="background: white; border-radius: 0 0 12px 12px; padding: 32px;">
          <h2 style="color: #1e293b;">Hi ${adminName},</h2>
          <p style="color: #475569;"><strong>${uploaderName}</strong> has submitted a file for your review:</p>
          <div style="background: #FFFBEB; border-left: 4px solid #D97706; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <strong style="color: #D97706; font-size: 16px;">&#128206; ${fileName}</strong>
            <p style="color: #64748b; margin: 8px 0 0 0;">Task: <strong>${taskTitle}</strong></p>
          </div>
          <a href="${process.env.FRONTEND_URL}/dashboard/tasks/${taskId}" style="display: inline-block; background: #D97706; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Review Submission</a>
        </div>
      </div>
    `
  }),

  fileReviewed: (userName, taskTitle, fileName, reviewStatus, comment, taskId) => ({
    subject: `File ${reviewStatus === 'accepted' ? 'Approved ✅' : 'Needs Revision 🔄'}: ${taskTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: ${reviewStatus === 'accepted' ? '#059669' : '#D97706'}; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Nebs Marketing OS</h1>
        </div>
        <div style="background: white; border-radius: 0 0 12px 12px; padding: 32px;">
          <h2 style="color: #1e293b;">Hi ${userName},</h2>
          <p style="color: #475569;">Your submitted file has been reviewed:</p>
          <div style="background: ${reviewStatus === 'accepted' ? '#ECFDF5' : '#FFFBEB'}; border-left: 4px solid ${reviewStatus === 'accepted' ? '#059669' : '#D97706'}; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <strong style="color: ${reviewStatus === 'accepted' ? '#059669' : '#D97706'};">${reviewStatus === 'accepted' ? '✅ Approved' : '🔄 Needs Revision'}</strong>
            <p style="color: #64748b; margin: 8px 0 0 0;">File: <strong>${fileName}</strong></p>
            <p style="color: #64748b; margin: 4px 0 0 0;">Task: <strong>${taskTitle}</strong></p>
            ${comment ? `<p style="color: #64748b; margin: 10px 0 0 0; font-style: italic;">"${comment}"</p>` : ''}
          </div>
          <a href="${process.env.FRONTEND_URL}/dashboard/tasks/${taskId}" style="display: inline-block; background: #1A56DB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">View Task</a>
        </div>
      </div>
    `
  }),

  assigneeAdded: (userName, taskTitle, deadline, taskId) => ({
    subject: `You've Been Added to a Task: ${taskTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: #1A56DB; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Nebs Marketing OS</h1>
        </div>
        <div style="background: white; border-radius: 0 0 12px 12px; padding: 32px;">
          <h2 style="color: #1e293b;">Hi ${userName},</h2>
          <p style="color: #475569;">You have been added as an assignee to a task:</p>
          <div style="background: #EFF6FF; border-left: 4px solid #1A56DB; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <strong style="color: #1A56DB; font-size: 18px;">${taskTitle}</strong>
            ${deadline ? `<p style="color: #64748b; margin: 8px 0 0 0;">Deadline: ${new Date(deadline).toLocaleString()}</p>` : ''}
          </div>
          <a href="${process.env.FRONTEND_URL}/dashboard/tasks/${taskId}" style="display: inline-block; background: #1A56DB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">View Task</a>
        </div>
      </div>
    `
  }),

  ideaSubmitted: (adminName, submitterName, ideaTitle) => ({
    subject: `New Idea Submitted: ${ideaTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: #7C3AED; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Nebs Marketing OS</h1>
        </div>
        <div style="background: white; border-radius: 0 0 12px 12px; padding: 32px;">
          <h2 style="color: #1e293b;">Hi ${adminName},</h2>
          <p style="color: #475569;"><strong>${submitterName}</strong> has submitted a new idea for your review:</p>
          <div style="background: #F5F3FF; border-left: 4px solid #7C3AED; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <strong style="color: #7C3AED; font-size: 18px;">${ideaTitle}</strong>
          </div>
          <a href="${process.env.FRONTEND_URL}/dashboard/ideation" style="display: inline-block; background: #7C3AED; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Review Idea</a>
        </div>
      </div>
    `
  }),

  meetingRequested: (adminName, requesterName, topic, date, time, priority) => ({
    subject: `Meeting Request: ${topic}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: #0891B2; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Nebs Marketing OS</h1>
        </div>
        <div style="background: white; border-radius: 0 0 12px 12px; padding: 32px;">
          <h2 style="color: #1e293b;">Hi ${adminName},</h2>
          <p style="color: #475569;"><strong>${requesterName}</strong> has requested a meeting:</p>
          <div style="background: #ECFEFF; border-left: 4px solid #0891B2; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <strong style="color: #0891B2; font-size: 18px;">${topic}</strong>
            <p style="color: #64748b; margin: 8px 0 0 0;">&#128197; ${date} at ${time}</p>
            <p style="color: #64748b; margin: 4px 0 0 0;">Priority: <strong>${(priority || 'medium').toUpperCase()}</strong></p>
          </div>
          <a href="${process.env.FRONTEND_URL}/dashboard/meetings" style="display: inline-block; background: #0891B2; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Review Request</a>
        </div>
      </div>
    `
  }),

  ideaReviewed: (userName, ideaTitle, status, comment) => ({
    subject: `Idea ${status === 'approved' ? 'Approved ✅' : 'Rejected ❌'}: ${ideaTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: ${status === 'approved' ? '#059669' : '#DC2626'}; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Nebs Marketing OS</h1>
        </div>
        <div style="background: white; border-radius: 0 0 12px 12px; padding: 32px;">
          <h2 style="color: #1e293b;">Hi ${userName},</h2>
          <p style="color: #475569;">Your idea has been reviewed:</p>
          <div style="background: ${status === 'approved' ? '#ECFDF5' : '#FEF2F2'}; border-left: 4px solid ${status === 'approved' ? '#059669' : '#DC2626'}; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <strong style="color: ${status === 'approved' ? '#059669' : '#DC2626'};">${status === 'approved' ? '✅ Approved' : '❌ Rejected'}</strong>
            <p style="color: #1e293b; margin: 8px 0 0 0; font-size: 16px;"><strong>${ideaTitle}</strong></p>
            ${comment ? `<p style="color: #64748b; margin: 10px 0 0 0; font-style: italic;">"${comment}"</p>` : ''}
          </div>
          <a href="${process.env.FRONTEND_URL}/dashboard/ideation" style="display: inline-block; background: #1A56DB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">View Ideas</a>
        </div>
      </div>
    `
  }),

  meetingReviewed: (userName, topic, status, comment, date, time) => ({
    subject: `Meeting ${status === 'approved' ? 'Approved ✅' : status === 'rejected' ? 'Rejected ❌' : 'Marked Done ✔️'}: ${topic}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: ${status === 'approved' ? '#059669' : status === 'rejected' ? '#DC2626' : '#6D28D9'}; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Nebs Marketing OS</h1>
        </div>
        <div style="background: white; border-radius: 0 0 12px 12px; padding: 32px;">
          <h2 style="color: #1e293b;">Hi ${userName},</h2>
          <p style="color: #475569;">Your meeting request has been reviewed:</p>
          <div style="background: ${status === 'approved' ? '#ECFDF5' : status === 'rejected' ? '#FEF2F2' : '#F5F3FF'}; border-left: 4px solid ${status === 'approved' ? '#059669' : status === 'rejected' ? '#DC2626' : '#6D28D9'}; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <strong style="color: ${status === 'approved' ? '#059669' : status === 'rejected' ? '#DC2626' : '#6D28D9'};">${status === 'approved' ? '✅ Approved' : status === 'rejected' ? '❌ Rejected' : '✔️ Marked Done'}</strong>
            <p style="color: #1e293b; margin: 8px 0 0 0; font-size: 16px;"><strong>${topic}</strong></p>
            ${date && time ? `<p style="color: #64748b; margin: 4px 0 0 0;">&#128197; ${date} at ${time}</p>` : ''}
            ${comment ? `<p style="color: #64748b; margin: 10px 0 0 0; font-style: italic;">"${comment}"</p>` : ''}
          </div>
          <a href="${process.env.FRONTEND_URL}/dashboard/meetings" style="display: inline-block; background: #1A56DB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">View Meetings</a>
        </div>
      </div>
    `
  }),

  taskStatusChanged: (userName, taskTitle, oldStatus, newStatus, taskId) => ({
    subject: `Task Status Updated: ${taskTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: #1A56DB; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Nebs Marketing OS</h1>
        </div>
        <div style="background: white; border-radius: 0 0 12px 12px; padding: 32px;">
          <h2 style="color: #1e293b;">Hi ${userName},</h2>
          <p style="color: #475569;">A task you are assigned to has been updated:</p>
          <div style="background: #EFF6FF; border-left: 4px solid #1A56DB; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <strong style="color: #1A56DB; font-size: 16px;">${taskTitle}</strong>
            <p style="color: #64748b; margin: 8px 0 0 0;">Status: <strong>${oldStatus}</strong> &#8594; <strong>${newStatus}</strong></p>
          </div>
          <a href="${process.env.FRONTEND_URL}/dashboard/tasks/${taskId}" style="display: inline-block; background: #1A56DB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">View Task</a>
        </div>
      </div>
    `
  }),
};

module.exports = { sendEmail, sendBulkEmail, verifyEmailConfig, emailTemplates };
