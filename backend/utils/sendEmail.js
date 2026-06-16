import { Resend } from "resend";

export async function sendTaskAssignmentEmail(assignee, task) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";

  console.log(`📧 [EMAIL DEBUG] Attempting to send email to: ${assignee.email}`);
  console.log(`📧 [EMAIL DEBUG] RESEND_API_KEY set: ${apiKey ? "YES" : "NO ❌"}`);
  console.log(`📧 [EMAIL DEBUG] FROM: ${fromEmail}`);

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing in environment variables.");
  }

  const resend = new Resend(apiKey);

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

  const { data, error } = await resend.emails.send({
    from: `Task Manager <${fromEmail}>`,
    to: assignee.email,
    subject: `New Task Assigned: ${task.title}`,
    text: emailBody,
  });

  if (error) {
    console.error(`❌ [EMAIL DEBUG] Resend error:`, error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  console.log(`✅ [EMAIL DEBUG] Email sent successfully to ${assignee.email} | MessageId: ${data.id}`);
}