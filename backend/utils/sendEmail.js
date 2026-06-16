import { OAuth2Client } from "google-auth-library";

export async function sendTaskAssignmentEmail(assignee, task) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const fromEmail = process.env.EMAIL_USER || "shahkrish221005@gmail.com";

  console.log(`📧 [EMAIL DEBUG] Attempting to send email to: ${assignee.email}`);
  console.log(`📧 [EMAIL DEBUG] GOOGLE_CLIENT_ID set: ${clientId ? "YES" : "NO ❌"}`);
  console.log(`📧 [EMAIL DEBUG] GOOGLE_CLIENT_SECRET set: ${clientSecret ? "YES" : "NO ❌"}`);
  console.log(`📧 [EMAIL DEBUG] GOOGLE_REFRESH_TOKEN set: ${refreshToken ? "YES" : "NO ❌"}`);

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google OAuth2 credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN) in environment variables.");
  }

  // Set up OAuth2 Client
  const oauth2Client = new OAuth2Client(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  console.log(`📧 [EMAIL DEBUG] Fetching new access token...`);
  const { token: accessToken } = await oauth2Client.getAccessToken();
  if (!accessToken) {
    throw new Error("Failed to retrieve access token from Google OAuth2 client.");
  }
  console.log(`📧 [EMAIL DEBUG] Access token retrieved successfully.`);

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

  // Formulate raw RFC 2822 email message with base64 transfer encoding
  const utf8Subject = `=?utf-8?B?${Buffer.from(`New Task Assigned: ${task.title}`).toString("base64")}?=`;
  const messageParts = [
    `From: "Task Manager" <${fromEmail}>`,
    `To: ${assignee.name} <${assignee.email}>`,
    `Subject: ${utf8Subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(emailBody).toString("base64")
  ];
  const rawMessage = messageParts.join("\r\n");
  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  console.log(`📧 [EMAIL DEBUG] Sending API request to Gmail REST API...`);

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: encodedMessage
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("❌ [EMAIL DEBUG] Gmail API error response:", errorData);
    const msg = errorData?.error?.message || response.statusText;
    throw new Error(`Gmail API send failed: ${msg}`);
  }

  const result = await response.json();
  console.log(`✅ [EMAIL DEBUG] Email sent successfully to ${assignee.email} via Gmail REST API | MessageId: ${result.id}`);
}