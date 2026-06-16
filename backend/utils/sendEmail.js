export async function sendTaskAssignmentEmail(assignee, task) {
  const apiKey    = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;
  const fromName  = process.env.EMAIL_FROM_NAME || "Task Manager";

  console.log(`📧 [EMAIL DEBUG] Attempting to send email to: ${assignee.email}`);
  console.log(`📧 [EMAIL DEBUG] SENDGRID_API_KEY set: ${apiKey ? "YES" : "NO ❌"}`);
  console.log(`📧 [EMAIL DEBUG] EMAIL_FROM set: ${fromEmail ? "YES (" + fromEmail + ")" : "NO ❌"}`);

  if (!apiKey)    throw new Error("SENDGRID_API_KEY is missing in environment variables.");
  if (!fromEmail) throw new Error("EMAIL_FROM is missing in environment variables.");

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

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: assignee.email, name: assignee.name }] }],
      from: { email: fromEmail, name: fromName },
      subject: `New Task Assigned: ${task.title}`,
      content: [{ type: "text/plain", value: emailBody }],
    }),
  });

  // SendGrid returns 202 Accepted on success (no body)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData?.errors?.[0]?.message || response.statusText;
    console.error(`❌ [EMAIL DEBUG] SendGrid error ${response.status}:`, errorData);
    throw new Error(`Failed to send email: ${msg}`);
  }

  console.log(`✅ [EMAIL DEBUG] Email sent successfully to ${assignee.email} (SendGrid 202 Accepted)`);
}