const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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
            <p style="color: #64748b; margin: 8px 0 0 0;">📅 ${date} at ${time}</p>
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
};

async function sendEmail(to, template) {
  try {
    await transporter.sendMail({
      from: `"Nebs Marketing OS" <${process.env.EMAIL_FROM}>`,
      to,
      subject: template.subject,
      html: template.html,
    });
    return true;
  } catch (error) {
    console.error('Email send failed:', error.message);
    return false;
  }
}

module.exports = { sendEmail, emailTemplates };
