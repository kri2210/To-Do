import { createTransport } from "nodemailer";

export async function sendTaskAssignmentEmail(assignee, task) {
  const smtpLogin = process.env.BREVO_SMTP_LOGIN;   // your Brevo account email
  const smtpKey   = process.env.BREVO_SMTP_KEY;     // Brevo SMTP key (not API key)
  const fromEmail = process.env.EMAIL_FROM || smtpLogin;
  const fromName  = process.env.EMAIL_FROM_NAME || "Task Manager";

  console.log(`📧 [EMAIL DEBUG] Attempting to send email to: ${assignee.email}`);
  console.log(`📧 [EMAIL DEBUG] BREVO_SMTP_LOGIN set: ${smtpLogin ? "YES (" + smtpLogin + ")" : "NO ❌"}`);
  console.log(`📧 [EMAIL DEBUG] BREVO_SMTP_KEY set: ${smtpKey ? "YES (length: " + smtpKey.length + ")" : "NO ❌"}`);

  if (!smtpLogin || !smtpKey) {
    throw new Error("BREVO_SMTP_LOGIN or BREVO_SMTP_KEY is missing in environment variables.");
  }

  const transporter = createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: smtpLogin,
      pass: smtpKey,
    },
  });

  console.log(`📧 [EMAIL DEBUG] Verifying Brevo SMTP connection...`);
  await transporter.verify();
  console.log(`📧 [EMAIL DEBUG] Brevo SMTP verified ✅`);

  const teamMembersStr = task.assignedTo.map((m) => m.name).join("\n");
  const dueDateStr = new Date(task.deadline).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
  const currentDateTimeStr = new Date().toLocaleString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
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

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: assignee.email,
    subject: `New Task Assigned: ${task.title}`,
    text: emailBody,
  });

  console.log(`✅ [EMAIL DEBUG] Email sent to ${assignee.email} | MessageId: ${info.messageId}`);
}