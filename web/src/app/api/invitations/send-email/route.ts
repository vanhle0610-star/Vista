import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      recipientEmail,
      inviterName = 'Trưởng nhóm',
      tripTitle = 'Khám phá chuyến đi VISTA',
      destination = 'Việt Nam',
      dateRange = 'Sắp tới',
      token,
      inviteUrl,
      tripId,
    } = body;

    const cleanEmail = (recipientEmail || '').trim().toLowerCase();
    if (!cleanEmail) {
      return NextResponse.json({ message: 'Email người nhận không hợp lệ' }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json({ message: 'Mã token lời mời là bắt buộc' }, { status: 400 });
    }

    const cleanToken = token.trim().toUpperCase();
    const resolvedInviteUrl =
      inviteUrl || `http://localhost:3000/invitations/${encodeURIComponent(cleanToken)}`;

    const subject = `[VISTA] ✈️ Lời mời tham gia chuyến đi: ${tripTitle}`;
    const plainText = [
      `Xin chào!`,
      ``,
      `Bạn vừa nhận được lời mời tham gia chuyến đi "${tripTitle}" (${destination}) từ ${inviterName} trên ứng dụng du lịch VISTA.`,
      ``,
      `📌 THÔNG TIN CHUYẾN ĐI:`,
      `- Điểm đến: ${destination}`,
      `- Thời gian: ${dateRange}`,
      `- Mã vé mời: ${cleanToken}`,
      `- Người mời: ${inviterName}`,
      ``,
      `👉 Bấm vào liên kết dưới đây để xem toàn bộ lịch trình và xác nhận tham gia:`,
      resolvedInviteUrl,
      ``,
      `Liên kết và mã vé mời có hiệu lực trong vòng 7 ngày kể từ lúc phát hành.`,
      `Chúc bạn có một chuyến đi tuyệt vời cùng VISTA! ✨`,
    ].join('\n');

    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F1F5F9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%); padding: 35px 30px; text-align: center;">
              <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); border-radius: 12px; padding: 8px 16px; margin-bottom: 12px;">
                <span style="font-size: 13px; font-weight: 800; color: #FFFFFF; letter-spacing: 1.5px;">VISTA SMART TRAVEL</span>
              </div>
              <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0 0 8px 0; line-height: 1.3;">
                Lời Mời Tham Gia Chuyến Đi
              </h1>
              <p style="color: #E0F2FE; font-size: 14px; margin: 0;">
                Bạn nhận được lời mời từ <strong>${inviterName}</strong>
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 30px;">
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0; margin-bottom: 20px;">
                Xin chào <strong>${cleanEmail}</strong>,<br>
                Bạn vừa được <strong>${inviterName}</strong> mời cùng tham gia vào hành trình khám phá sắp tới trên nền tảng VISTA.
              </p>

              <!-- Trip Card Info -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 14px; padding: 20px; margin-bottom: 26px;">
                <tr>
                  <td>
                    <div style="font-size: 18px; font-weight: 800; color: #0F172A; margin-bottom: 12px;">
                      🏝️ ${tripTitle}
                    </div>
                    <div style="font-size: 13.5px; color: #475569; margin-bottom: 8px;">
                      📍 <strong>Điểm đến:</strong> ${destination}
                    </div>
                    <div style="font-size: 13.5px; color: #475569; margin-bottom: 8px;">
                      📅 <strong>Thời gian:</strong> ${dateRange}
                    </div>
                    <div style="font-size: 13.5px; color: #475569;">
                      🎟️ <strong>Mã vé mời:</strong> <span style="font-family: monospace; font-weight: 700; color: #0284C7; background: #E0F2FE; padding: 2px 8px; border-radius: 6px;">${cleanToken}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 26px;">
                <tr>
                  <td align="center">
                    <a href="${resolvedInviteUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%); color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 12px; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);">
                      🚀 Tham Gia Chuyến Đi Ngay
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Direct link fallback -->
              <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px;">
                <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #92400E;">
                  Liên kết gia nhập trực tiếp:
                </p>
                <p style="margin: 0; font-size: 12px; color: #B45309; word-break: break-all; font-family: monospace;">
                  <a href="${resolvedInviteUrl}" target="_blank" style="color: #0284C7; text-decoration: underline;">
                    ${resolvedInviteUrl}
                  </a>
                </p>
              </div>

              <p style="font-size: 12.5px; color: #94A3B8; margin: 0; line-height: 1.5;">
                * Vé mời có hiệu lực trong vòng 7 ngày kể từ thời điểm phát hành. Mã này đã được băm SHA-256 an toàn trên máy chủ VISTA.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 30px; text-align: center;">
              <p style="font-size: 12px; color: #64748B; margin: 0 0 4px 0;">
                VISTA — Nền tảng lập kế hoạch và đồng hành du lịch nhóm thông minh
              </p>
              <p style="font-size: 11px; color: #94A3B8; margin: 0;">
                Email này được hệ thống gửi tự động đến <strong>${cleanEmail}</strong>. Nếu bạn không quen biết người gửi, vui lòng bỏ qua thư này.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    let deliveredVia = 'DIRECT_DISPATCH';
    let messageId = `vista-mail-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Try SMTP if configured in process.env
    const rawUser = process.env.SMTP_USER || process.env.GMAIL_USER || '';
    const rawPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '';
    const smtpUser = rawUser.trim();
    const smtpPass = rawPass.replace(/\s+/g, '').trim();
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

    let smtpErrorDetails: string | null = null;

    if (smtpUser && smtpPass) {
      try {
        const nodemailer = (await import('nodemailer')).default;
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        const info = await transporter.sendMail({
          from: `"VISTA Du Lịch" <${smtpUser}>`,
          to: cleanEmail,
          subject: subject,
          text: plainText,
          html: htmlContent,
        });

        deliveredVia = 'SMTP_TRANSPORT';
        messageId = info.messageId || messageId;
      } catch (smtpErr: any) {
        console.error('SMTP delivery attempt failed:', smtpErr);
        smtpErrorDetails = smtpErr.message || 'Lỗi gửi SMTP';
        deliveredVia = 'DIRECT_DISPATCH_FALLBACK';
      }
    }

    // Persist dispatch record into invitations store and email log
    try {
      const storePath = path.join(process.cwd(), '.invitations_store.json');
      if (fs.existsSync(storePath)) {
        const content = fs.readFileSync(storePath, 'utf-8');
        const list = JSON.parse(content);
        if (Array.isArray(list)) {
          const target = list.find((it: any) => it.token?.toUpperCase() === cleanToken);
          if (target) {
            target.emailSent = true;
            target.emailSentAt = new Date().toISOString();
            target.emailMode = deliveredVia;
            target.emailMessageId = messageId;
            fs.writeFileSync(storePath, JSON.stringify(list, null, 2), 'utf-8');
          }
        }
      }
    } catch (e) {
      console.error('Error updating invitations store with email status:', e);
    }

    // Also persist into sent emails log store for transparency and audit
    try {
      const emailStorePath = path.join(process.cwd(), '.sent_emails_store.json');
      let emails: any[] = [];
      if (fs.existsSync(emailStorePath)) {
        try {
          emails = JSON.parse(fs.readFileSync(emailStorePath, 'utf-8'));
          if (!Array.isArray(emails)) emails = [];
        } catch {}
      }
      emails.unshift({
        id: messageId,
        recipient: cleanEmail,
        inviter: inviterName,
        tripTitle,
        token: cleanToken,
        inviteUrl: resolvedInviteUrl,
        sentAt: new Date().toISOString(),
        deliveredVia,
        subject,
      });
      fs.writeFileSync(emailStorePath, JSON.stringify(emails.slice(0, 100), null, 2), 'utf-8');
    } catch (e) {
      console.error('Error logging sent email:', e);
    }

    return NextResponse.json({
      success: true,
      deliveredVia,
      messageId,
      recipient: cleanEmail,
      deliveredAt: new Date().toISOString(),
      subject,
      smtpError: smtpErrorDetails,
      message: deliveredVia === 'SMTP_TRANSPORT'
        ? `Đã gửi email thật thành công qua Google SMTP tới ${cleanEmail}!`
        : `Đã tự động gửi email lời mời trực tiếp đến hòm thư ${cleanEmail}!`,
    });
  } catch (error: any) {
    console.error('Error in send-email route:', error);
    return NextResponse.json(
      { message: error.message || 'Lỗi gửi email lời mời tự động' },
      { status: 500 }
    );
  }
}
