const https = require('https');

const BASE_URL = process.env.FRONTEND_URL || 'https://nebs-marketing-os.vercel.app';

function telegramRequest(token, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Escapes special chars for Telegram HTML (only & < > need escaping in HTML mode)
function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendTelegramNotification(text, taskId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  console.log('[Telegram] token set:', !!token, '| chatId:', chatId);

  if (!token || !chatId) {
    console.warn('[Telegram] Missing env vars — skipping');
    return;
  }

  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };

  if (taskId) {
    body.reply_markup = {
      inline_keyboard: [[
        { text: 'View Task →', url: `${BASE_URL}/dashboard/tasks/${taskId}` },
      ]],
    };
  }

  try {
    const result = await telegramRequest(token, body);
    console.log('[Telegram] Response:', result);
  } catch (err) {
    console.warn('[Telegram] Request failed:', err.message);
  }
}

const PRIORITY_EMOJI = { low: '🟢', medium: '🟡', high: '🟠', urgent: '🔴' };
const STATUS_EMOJI = {
  new: '🆕', todo: '📋', ongoing: '⚙️', in_review: '👀',
  in_revision: '🔄', approved: '✅', posted: '🚀',
};

const tg = {
  taskCreated(taskTitle, createdBy, priority, taskId) {
    const pEmoji = PRIORITY_EMOJI[priority] || '🟡';
    return sendTelegramNotification(
      `📋 <b>New Task Created</b>\n\n<b>Title:</b> ${esc(taskTitle)}\n<b>Priority:</b> ${pEmoji} ${esc(priority)}\n<b>Created by:</b> ${esc(createdBy)}`,
      taskId
    );
  },

  taskStatusChanged(taskTitle, oldStatus, newStatus, changedBy, taskId) {
    const sEmoji = STATUS_EMOJI[newStatus] || '📌';
    return sendTelegramNotification(
      `${sEmoji} <b>Task Status Updated</b>\n\n<b>Task:</b> ${esc(taskTitle)}\n<b>Status:</b> ${esc(oldStatus.replace(/_/g, ' '))} → <b>${esc(newStatus.replace(/_/g, ' '))}</b>\n<b>Updated by:</b> ${esc(changedBy)}`,
      taskId
    );
  },

  fileSubmitted(taskTitle, submittedBy, fileName, taskId) {
    return sendTelegramNotification(
      `📤 <b>File Submitted for Review</b>\n\n<b>Task:</b> ${esc(taskTitle)}\n<b>File:</b> ${esc(fileName)}\n<b>Submitted by:</b> ${esc(submittedBy)}`,
      taskId
    );
  },

  linkSubmitted(taskTitle, submittedBy, linkName, taskId) {
    return sendTelegramNotification(
      `🔗 <b>Link Submitted for Review</b>\n\n<b>Task:</b> ${esc(taskTitle)}\n<b>Link:</b> ${esc(linkName)}\n<b>Submitted by:</b> ${esc(submittedBy)}`,
      taskId
    );
  },

  fileReviewed(taskTitle, fileName, reviewStatus, reviewComment, taskId) {
    const approved = reviewStatus === 'accepted';
    const emoji = approved ? '✅' : '🔄';
    const label = approved ? 'File Approved' : 'File Needs Revision';
    let msg = `${emoji} <b>${label}</b>\n\n<b>Task:</b> ${esc(taskTitle)}\n<b>File:</b> ${esc(fileName)}`;
    if (reviewComment) msg += `\n<b>Comment:</b> ${esc(reviewComment)}`;
    return sendTelegramNotification(msg, taskId);
  },
};

module.exports = { sendTelegramNotification, tg };
