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
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendTaskAssignmentEmail(toEmail, toName, taskTitle, assignedByName, deadline) {
  const deadlineStr = new Date(deadline).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const mailOptions = {
    from: `"Task Manager" <${getMailConfig().user}>`,
    to: toEmail,
    subject: `New Task Assigned: ${taskTitle}`,
    text: `Hi ,

You have been assigned a new task.

Task        : ${taskTitle}
Assigned By : ${assignedByName}
Deadline    : ${deadlineStr}


Regards,
`,
  };

  try {
    await createTransporter().sendMail(mailOptions);
    console.log(`Email sent to ${toEmail}`);
  } catch (err) {
    if (err?.code === "EAUTH" || err?.responseCode === 535) {
      console.error(
        `Failed to send email to ${toEmail}: Gmail rejected the login. Use a Gmail App Password, not the account password.`
      );
      return;
    }

    console.error(`Failed to send email to ${toEmail}:`, err.message);
  }
}
