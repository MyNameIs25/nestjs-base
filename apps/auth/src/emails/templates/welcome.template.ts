import type { TemplateFunction } from '@app/common';

type WelcomeData = {
  displayName: string;
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const welcomeTemplate: TemplateFunction<WelcomeData> = (data) => {
  const { displayName } = data;
  const safeDisplayName = escapeHtml(displayName);

  return {
    subject: `Welcome to IdealTech, ${displayName}!`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f7">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff">
    <tr>
      <td style="padding:40px 30px;text-align:center;background-color:#4f46e5">
        <h1 style="color:#ffffff;margin:0;font-size:24px">Welcome!</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px">
        <p style="color:#333333;font-size:16px;line-height:24px;margin:0 0 20px">
          Hi ${safeDisplayName},
        </p>
        <p style="color:#333333;font-size:16px;line-height:24px;margin:0 0 20px">
          Welcome to IdealTech! We're excited to have you on board. Your account is now ready to use.
        </p>
        <p style="color:#666666;font-size:14px;line-height:20px;margin:20px 0 0">
          If you have any questions, don't hesitate to reach out to our support team.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim(),
    text: `Hi ${displayName},\n\nWelcome to IdealTech! We're excited to have you on board. Your account is now ready to use.\n\nIf you have any questions, don't hesitate to reach out to our support team.`,
  };
};
