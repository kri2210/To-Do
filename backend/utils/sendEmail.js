import nodemailer from "nodemailer";

function getMailConfig() {
  const user = process.env.EMAIL_USER || process.env.Email;
  const pass = process.env.EMAIL_APP_PASSWORD || process.env.Password;

  if (!user || !pass) {
    throw new Error("Email credentials are missing. Set EMAIL_USER and EMAIL_APP_PASSWORD in .env.");
  }

  return { user, pass };
}

function createTransporter() {
  const { user, pass } = getMailConfig();

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export async function sendTaskAssignmentEmail(assignee, task) {
  const teamMembersStr = task.assignedTo.map(member => member.name).join("\n");
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

Please review the task details and begin working on it as per the requirements. Ensure that the task is completed before the specified deadline.

If you have any questions or require clarification, please contact the task assigner.

Best Regards,

Task Management System
${companyName}`;

  // 1. Try sending via Resend HTTP API (Port 443 - Never Blocked by Render)
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Task Manager <onboarding@resend.dev>",
          to: assignee.email,
          subject: `New Task Assigned: ${task.title}`,
          text: emailBody,
        }),
      });

      const resData = await response.json();
      if (response.ok) {
        console.log(`Email sent to ${assignee.email} via Resend:`, resData.id);
        return; // Success!
      } else {
        console.warn(`Resend HTTP API failed: ${resData.message || response.statusText}. Falling back to SMTP...`);
      }
    } catch (resErr) {
      console.warn("Resend API failed to connect. Falling back to SMTP:", resErr.message);
    }
  }

  // 2. Fallback: Gmail SMTP (Works locally, but fails on Render Free Tier)
  try {
    const mailConfig = getMailConfig();
    const mailOptions = {
      from: `"Task Manager" <${mailConfig.user}>`,
      to: assignee.email,
      subject: `New Task Assigned: ${task.title}`,
      text: emailBody,
    };

    await createTransporter().sendMail(mailOptions);
    console.log(`Email sent to ${assignee.email} via SMTP`);
  } catch (err) {
    if (err?.code === "EAUTH" || err?.responseCode === 535) {
      console.error(
        `Failed to send email to ${assignee.email}: Gmail rejected the login. Use a Gmail App Password, not the account password.`
      );
      return;
    }

    console.error(`Failed to send email to ${assignee.email} via SMTP:`, err.message);
  }
}

