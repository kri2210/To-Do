import nodemailer from "nodemailer";

// ──────────────────────────────────────────────────────
// SMTP fallback (works locally; blocked on Render free)
// ──────────────────────────────────────────────────────
function getMailConfig() {
  const user = process.env.EMAIL_USER || process.env.Email;
  const pass = process.env.EMAIL_APP_PASSWORD || process.env.Password;
  if (!user || !pass) throw new Error("Email credentials missing.");
  return { user, pass };
}

function createSmtpTransporter() {
  const { user, pass } = getMailConfig();
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

// ──────────────────────────────────────────────────────
// Primary sender: Resend HTTP API (port 443 — never
// blocked by Render free tier)
// Sign up free at https://resend.com → API Keys
// Add RESEND_API_KEY to Render Environment Variables
// ──────────────────────────────────────────────────────
async function sendViaResend(to, subject, text) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set.");

  const fromAddress = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from: fromAddress, to, subject, text }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Resend API error: ${data.message || response.statusText}`);
  }

  return data;
}

// ──────────────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────────────
export async function sendTaskAssignmentEmail(assignee, task) {
  const teamMembersStr = task.assignedTo.map((m) => m.name).join("\n");
  const dueDateStr = new Date(task.deadline).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const currentDateTimeStr = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const companyName = process.env.COMPANY_NAME || "To-Do+";

  const emailBody = `Dear ${assignee.name},

A new task has been assigned to you through the Task Management System.

━━━━━━━━━━━━━━━━━━━━━━
TASK DETAILS
━━━━━━━━━━━━━━━━━━━━━━

Task Title:
${task.title}

Assigned By:
${task.assignedBy?.name || "System"} (${task.assignedBy?.role || "Admin"})

Assigned To:
${assignee.name}

Due Date:
${dueDateStr}

Priority:
${task.priority || "Medium"}

Description:
${task.description || "No description provided."}

Team Members Assigned:
${teamMembersStr}

Task Status:
Pending

Assigned On:
${currentDateTimeStr}

━━━━━━━━━━━━━━━━━━━━━━

Please review the task details and begin working on it as per the requirements.
Ensure that the task is completed before the specified deadline.

If you have any questions or require clarification, please contact the task assigner.

Best Regards,
Task Management System
${companyName}`;

  const subject = `New Task Assigned: ${task.title}`;

  // 1️⃣ Try Resend first (works on Render free tier)
  if (process.env.RESEND_API_KEY) {
    try {
      const result = await sendViaResend(assignee.email, subject, emailBody);
      console.log(`✅ Email sent to ${assignee.email} via Resend (id: ${result.id})`);
      return;
    } catch (err) {
      console.warn(`⚠️ Resend failed for ${assignee.email}: ${err.message}. Falling back to SMTP...`);
    }
  }

  // 2️⃣ Fallback: Gmail SMTP (works locally, blocked on Render free tier)
  try {
    const { user } = getMailConfig();
    await createSmtpTransporter().sendMail({
      from: `"Task Manager" <${user}>`,
      to: assignee.email,
      subject,
      text: emailBody,
    });
    console.log(`✅ Email sent to ${assignee.email} via SMTP`);
  } catch (err) {
    if (err?.code === "EAUTH" || err?.responseCode === 535) {
      console.error(`❌ Gmail SMTP auth failed for ${assignee.email}: Use an App Password, not your account password.`);
      return;
    }
    console.error(`❌ SMTP send failed for ${assignee.email}:`, err.message);
  }
}
