import { createTransport } from "nodemailer";

function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "Email credentials are missing. Set EMAIL_USER and EMAIL_APP_PASSWORD in your Render environment."
    );
  }

  return createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

export async function sendTaskAssignmentEmail(assignee, task) {
  const teamMembersStr = task.assignedTo.map((member) => member.name).join("\n");
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

  const user = process.env.EMAIL_USER;
  await createTransporter().sendMail({
    from: `"Task Manager" <${user}>`,
    to: assignee.email,
    subject: `New Task Assigned: ${task.title}`,
    text: emailBody,
  });

  console.log(`✅ Email sent to ${assignee.email}`);
}