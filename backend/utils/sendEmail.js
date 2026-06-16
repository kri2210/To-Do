import * as Brevo from "@getbrevo/brevo";

export async function sendTaskAssignmentEmail(assignee, task) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "noreply@yourdomain.com";
  const fromName = process.env.EMAIL_FROM_NAME || "Task Manager";

  console.log(`📧 [EMAIL DEBUG] Attempting to send email to: ${assignee.email}`);
  console.log(`📧 [EMAIL DEBUG] BREVO_API_KEY set: ${apiKey ? "YES" : "NO ❌"}`);
  console.log(`📧 [EMAIL DEBUG] FROM: ${fromName} <${fromEmail}>`);

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is missing in environment variables.");
  }

  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.authentications["api-key"].apiKey = apiKey;

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

  const sendSmtpEmail = new Brevo.SendSmtpEmail();
  sendSmtpEmail.subject = `New Task Assigned: ${task.title}`;
  sendSmtpEmail.textContent = emailBody;
  sendSmtpEmail.sender = { name: fromName, email: fromEmail };
  sendSmtpEmail.to = [{ email: assignee.email, name: assignee.name }];

  const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

  console.log(`✅ [EMAIL DEBUG] Email sent successfully to ${assignee.email} | MessageId: ${result.body?.messageId || result.messageId}`);
}