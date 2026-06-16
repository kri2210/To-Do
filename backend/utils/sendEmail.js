import { createTransport } from "nodemailer";

export async function sendTaskAssignmentEmail(assignee, task) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  console.log(`📧 [EMAIL DEBUG] Attempting to send email to: ${assignee.email}`);
  console.log(`📧 [EMAIL DEBUG] EMAIL_USER set: ${user ? "YES (" + user + ")" : "NO ❌"}`);
  console.log(`📧 [EMAIL DEBUG] EMAIL_APP_PASSWORD set: ${pass ? "YES (length: " + pass.length + ")" : "NO ❌"}`);

  if (!user || !pass) {
    throw new Error("EMAIL_USER or EMAIL_APP_PASSWORD is missing in environment variables.");
  }

  const transporter = createTransport({
  service: "gmail",
  auth: {
    user,
    pass,
  },

  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,

  logger: true,
  debug: true,
});

  console.log(`📧 [EMAIL DEBUG] Transporter created, verifying connection...`);

  try {
  const info = await transporter.sendMail({
    from: user,
    to: user,
    subject: "SMTP Test",
    text: "Testing from Render",
  });

  console.log("Mail sent:", info);
} catch (err) {
  console.error("SENDMAIL ERROR:", err);
}

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
    from: `"Task Manager" <${user}>`,
    to: assignee.email,
    subject: `New Task Assigned: ${task.title}`,
    text: emailBody,
  });

  console.log(`✅ [EMAIL DEBUG] Email sent successfully to ${assignee.email} | MessageId: ${info.messageId}`);
}