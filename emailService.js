/**
 * Email Service for Casa Amara Boutique Hotel
 * Handles:
 * 1. OTP Verification Email
 * 2. Reservation Request Received Email (with Cancellation Policy)
 * 3. Final Reservation Approval Email (with Cancellation Policy)
 * 4. Final Reservation Rejection Email (with Rejection Reason)
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const EMAIL_LOGS_PATH = path.join(__dirname, 'data', 'email_logs.json');

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });
  }
  return null;
}

function getFromAddress() {
  return process.env.SMTP_FROM || '"Casa Amara Boutique Hotel" <reservations@casaamara.ph>';
}

/**
 * Log email for audit trail and local development fallback
 */
function logEmailLocally(to, subject, html, text, meta = {}) {
  try {
    let logs = [];
    if (fs.existsSync(EMAIL_LOGS_PATH)) {
      try {
        logs = JSON.parse(fs.readFileSync(EMAIL_LOGS_PATH, 'utf8') || '[]');
      } catch (e) {
        logs = [];
      }
    }
    const logEntry = {
      id: Date.now(),
      sent_at: new Date().toISOString(),
      to,
      subject,
      meta,
      preview_text: text ? text.substring(0, 200) : ''
    };
    logs.unshift(logEntry);
    if (logs.length > 100) logs = logs.slice(0, 100);
    fs.writeFileSync(EMAIL_LOGS_PATH, JSON.stringify(logs, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not write to email_logs.json:', err.message);
  }
}

/**
 * Shared Cancellation Policy HTML & Text
 */
const CANCELLATION_POLICY_HTML = `
  <div style="margin-top: 28px; padding: 22px; background-color: #FAF7F2; border: 1px solid #E2DBD2; border-radius: 6px;">
    <h3 style="margin: 0 0 10px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 16px; color: #1C1917; letter-spacing: 0.05em; text-transform: uppercase;">
      Cancellation Policy
    </h3>
    <p style="margin: 0 0 14px 0; font-size: 13px; color: #57534E; line-height: 1.55;">
      Please review our standard reservation cancellation policy below. Cancellation fees are calculated based on the total booking cost:
    </p>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
      <thead>
        <tr style="border-bottom: 2px solid #D5CCC0; background-color: #F3ECE2;">
          <th style="padding: 10px 12px; color: #1C1917; font-weight: 600;">Cancellation Timing</th>
          <th style="padding: 10px 12px; color: #1C1917; font-weight: 600; text-align: right;">Cancellation Fee</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #E7E2DA;">
          <td style="padding: 10px 12px; color: #44403C;">7 or more days before check-in</td>
          <td style="padding: 10px 12px; color: #166534; font-weight: 600; text-align: right;">Free (0%)</td>
        </tr>
        <tr style="border-bottom: 1px solid #E7E2DA;">
          <td style="padding: 10px 12px; color: #44403C;">3–6 days before check-in</td>
          <td style="padding: 10px 12px; color: #854D0E; font-weight: 600; text-align: right;">25% of total booking cost</td>
        </tr>
        <tr style="border-bottom: 1px solid #E7E2DA;">
          <td style="padding: 10px 12px; color: #44403C;">1–2 days before check-in</td>
          <td style="padding: 10px 12px; color: #C2410C; font-weight: 600; text-align: right;">50% of total booking cost</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; color: #44403C;">On check-in date or no-show</td>
          <td style="padding: 10px 12px; color: #991B1B; font-weight: 600; text-align: right;">100% of total booking cost</td>
        </tr>
      </tbody>
    </table>
    <p style="margin: 14px 0 0 0; font-size: 11.5px; color: #78716C; font-style: italic; line-height: 1.4;">
      * Note: This policy is provided for your information. To inquire about booking modifications or cancellations, please contact the hotel directly with your reference number.
    </p>
  </div>
`;

const CANCELLATION_POLICY_TEXT = `
CANCELLATION POLICY:
- 7 or more days before check-in: Free (0%)
- 3–6 days before check-in: 25% of total booking cost
- 1–2 days before check-in: 50% of total booking cost
- On check-in date or no-show: 100% of total booking cost
* Cancellation fees are calculated based on the total booking cost.
`;

/**
 * Base email wrapper for Casa Amara luxury aesthetic
 */
function wrapEmailHtml(title, bodyContent) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8F5F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1C1917; }
    .email-wrapper { max-width: 620px; margin: 30px auto; background-color: #FFFFFF; border: 1px solid #E6DFD5; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
    .email-header { background-color: #1C1917; padding: 28px 24px; text-align: center; }
    .brand-logo-text { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: #FFFFFF; letter-spacing: 0.12em; text-transform: uppercase; margin: 0; }
    .brand-sub-text { font-size: 10px; color: #B59A72; letter-spacing: 0.25em; text-transform: uppercase; margin-top: 5px; }
    .email-body { padding: 36px 32px; }
    .email-footer { background-color: #FAF7F2; border-top: 1px solid #EDE7DF; padding: 22px; text-align: center; font-size: 12px; color: #78716C; }
    .detail-table { width: 100%; border-collapse: collapse; margin-top: 18px; margin-bottom: 20px; font-size: 13.5px; }
    .detail-table td { padding: 8px 10px; border-bottom: 1px solid #F0EAE1; }
    .detail-label { color: #78716C; width: 38%; font-weight: 500; }
    .detail-value { color: #1C1917; font-weight: 600; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <div class="brand-logo-text">Casa Amara</div>
      <div class="brand-sub-text">Boutique Hotel</div>
    </div>
    <div class="email-body">
      ${bodyContent}
    </div>
    <div class="email-footer">
      <p style="margin: 0 0 6px 0; font-weight: 600; color: #44403C;">Casa Amara Boutique Hotel</p>
      <p style="margin: 0 0 6px 0;">San Juan, Batangas, Philippines · +63 917 123 4567</p>
      <p style="margin: 0; color: #A8A29E;">reservations@casaamara.ph · www.casaamara.ph</p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Deliver email via transporter if configured, or record locally
 */
async function sendEmail({ to, subject, html, text, meta = {} }) {
  const transporter = getTransporter();
  const from = getFromAddress();

  logEmailLocally(to, subject, html, text, meta);

  if (!transporter) {
    console.log(`[EMAIL DISPATCH - DEV SIMULATION] To: ${to} | Subject: ${subject}`);
    if (meta.otp) {
      console.log(`[EMAIL DISPATCH - DEV SIMULATION] OTP Code: >>> ${meta.otp} <<<`);
    }
    return { success: true, simulated: true, to, subject };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html
    });
    console.log(`[EMAIL DISPATCH - SENT] MessageId: ${info.messageId} to ${to}`);
    return { success: true, messageId: info.messageId, to, subject };
  } catch (error) {
    console.error(`[EMAIL DISPATCH - ERROR] Failed to send email to ${to}:`, error.message);
    throw error;
  }
}

/**
 * 1. Send 6-Digit OTP Verification Email
 */
async function sendOtpEmail(toEmail, otpCode) {
  const subject = `${otpCode} is your Casa Amara verification code`;
  const text = `Your Casa Amara verification code is: ${otpCode}\n\nThis 6-digit code will expire in 5 minutes.\nIf you did not request this code, please ignore this email.`;

  const html = wrapEmailHtml('Verification Code', `
    <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: #1C1917; margin: 0 0 12px 0;">
      Verify Your Email Address
    </h2>
    <p style="font-size: 14.5px; color: #44403C; line-height: 1.6; margin: 0 0 24px 0;">
      Thank you for choosing Casa Amara Boutique Hotel. To submit your reservation request, please enter the 6-digit verification code below:
    </p>

    <div style="text-align: center; margin: 30px 0; padding: 22px; background-color: #FAF7F2; border: 1px dashed #B59A72; border-radius: 8px;">
      <span style="font-size: 11px; letter-spacing: 0.15em; color: #78716C; text-transform: uppercase; display: block; margin-bottom: 8px;">6-DIGIT VERIFICATION CODE</span>
      <span style="font-family: monospace, Courier; font-size: 34px; font-weight: 700; letter-spacing: 0.28em; color: #1C1917; padding-left: 0.28em;">
        ${escapeHtml(otpCode)}
      </span>
    </div>

    <p style="font-size: 13px; color: #78716C; line-height: 1.5; margin: 0 0 10px 0;">
      <strong>Expires in 5 minutes.</strong> For your security, please do not share this code with anyone.
    </p>
    <p style="font-size: 12.5px; color: #A8A29E; line-height: 1.4; margin: 0;">
      If you did not make this reservation request, you can safely disregard this message.
    </p>
  `);

  return sendEmail({
    to: toEmail,
    subject,
    html,
    text,
    meta: { type: 'OTP', otp: otpCode }
  });
}

/**
 * 2. Send Reservation Request Received Email (Pending Approval)
 */
async function sendReservationRequestEmail(reservation) {
  const ref = reservation.reference_id || 'N/A';
  const guestName = reservation.guest_name || 'Valued Guest';
  const roomName = reservation.room_name || 'Selected Room';
  const roomNum = reservation.room_number ? ` (Room ${reservation.room_number})` : '';
  const checkin = reservation.check_in || '';
  const checkout = reservation.check_out || '';
  const nights = reservation.nights || 1;
  const guests = reservation.guests || 2;
  const total = Number(reservation.total_amount || 0).toLocaleString();

  const subject = `Reservation Request Received: ${ref} - Casa Amara Boutique Hotel`;

  const text = `Dear ${guestName},

Thank you for your reservation request at Casa Amara Boutique Hotel!

IMPORTANT STATUS NOTICE:
Your reservation request has been successfully received and is currently AWAITING HOTEL STAFF APPROVAL. 
Please note that your booking is NOT YET CONFIRMED. Our hotel management team will review room availability and schedule, and we will email you once your reservation is confirmed or updated.

RESERVATION DETAILS:
- Booking Reference: ${ref}
- Guest: ${guestName}
- Room: ${roomName}${roomNum}
- Dates: ${checkin} to ${checkout} (${nights} night${nights > 1 ? 's' : ''})
- Guests: ${guests}
- Total Amount: ₱${total}
- Status: Pending Hotel Approval

${CANCELLATION_POLICY_TEXT}

Warm regards,
Casa Amara Reservations Team`;

  const html = wrapEmailHtml('Reservation Request Received', `
    <div style="display: inline-block; padding: 4px 12px; background-color: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; border-radius: 999px; font-size: 11.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 14px;">
      Pending Hotel Staff Approval
    </div>

    <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; color: #1C1917; margin: 0 0 12px 0;">
      Reservation Request Received
    </h2>

    <p style="font-size: 14.5px; color: #44403C; line-height: 1.6; margin: 0 0 18px 0;">
      Dear <strong>${escapeHtml(guestName)}</strong>,
    </p>

    <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 14px 16px; margin-bottom: 22px; border-radius: 0 4px 4px 0;">
      <p style="margin: 0; font-size: 13.5px; color: #78350F; line-height: 1.55;">
        <strong>Please Note:</strong> Your reservation request has been recorded and is currently <strong>awaiting staff approval</strong>. Your booking is <strong>NOT yet confirmed</strong>. You will receive an official confirmation email once our team reviews your request.
      </p>
    </div>

    <div style="background-color: #1C1917; color: #FFFFFF; padding: 18px 20px; border-radius: 6px; margin-bottom: 20px;">
      <span style="font-size: 10px; letter-spacing: 0.18em; color: #B59A72; text-transform: uppercase; display: block; margin-bottom: 4px;">BOOKING REFERENCE</span>
      <span style="font-family: monospace, Courier; font-size: 22px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.08em;">
        ${escapeHtml(ref)}
      </span>
    </div>

    <h4 style="margin: 22px 0 8px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #78716C;">
      Reservation Summary
    </h4>
    <table class="detail-table">
      <tr>
        <td class="detail-label">Room Type</td>
        <td class="detail-value">${escapeHtml(roomName)}${escapeHtml(roomNum)}</td>
      </tr>
      <tr>
        <td class="detail-label">Stay Dates</td>
        <td class="detail-value">${escapeHtml(checkin)} → ${escapeHtml(checkout)} (${nights} night${nights > 1 ? 's' : ''})</td>
      </tr>
      <tr>
        <td class="detail-label">Party Size</td>
        <td class="detail-value">${guests} Guest${guests > 1 ? 's' : ''}</td>
      </tr>
      <tr>
        <td class="detail-label">Total Amount</td>
        <td class="detail-value" style="color: #1C1917; font-size: 15px;">₱${escapeHtml(total)}</td>
      </tr>
      <tr>
        <td class="detail-label">Current Status</td>
        <td class="detail-value" style="color: #B45309;">Pending Approval</td>
      </tr>
      ${reservation.special_requests ? `
      <tr>
        <td class="detail-label">Special Requests</td>
        <td class="detail-value" style="font-weight: 400; color: #57534E;">${escapeHtml(reservation.special_requests)}</td>
      </tr>` : ''}
    </table>

    ${CANCELLATION_POLICY_HTML}
  `);

  return sendEmail({
    to: reservation.email,
    subject,
    html,
    text,
    meta: { type: 'REQUEST_RECEIVED', reference_id: ref }
  });
}

/**
 * 3. Send Reservation Approved & Confirmed Email
 */
async function sendReservationApprovedEmail(reservation) {
  const ref = reservation.reference_id || 'N/A';
  const guestName = reservation.guest_name || 'Valued Guest';
  const roomName = reservation.room_name || 'Selected Room';
  const roomNum = reservation.room_number ? ` (Room ${reservation.room_number})` : '';
  const checkin = reservation.check_in || '';
  const checkout = reservation.check_out || '';
  const nights = reservation.nights || 1;
  const guests = reservation.guests || 2;
  const total = Number(reservation.total_amount || 0).toLocaleString();

  const subject = `Reservation Confirmed: ${ref} - Casa Amara Boutique Hotel`;

  const text = `Dear ${guestName},

Great news! Your reservation request at Casa Amara Boutique Hotel has been APPROVED and is now CONFIRMED.

RESERVATION DETAILS:
- Booking Reference: ${ref}
- Guest: ${guestName}
- Room: ${roomName}${roomNum}
- Dates: ${checkin} to ${checkout} (${nights} night${nights > 1 ? 's' : ''})
- Guests: ${guests}
- Total Amount: ₱${total}
- Status: Confirmed & Approved

We look forward to welcoming you for an unforgettable stay.

${CANCELLATION_POLICY_TEXT}

Warm regards,
Casa Amara Reservations Team`;

  const html = wrapEmailHtml('Reservation Confirmed', `
    <div style="display: inline-block; padding: 4px 12px; background-color: #DCFCE7; color: #166534; border: 1px solid #86EFAC; border-radius: 999px; font-size: 11.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 14px;">
      Reservation Confirmed
    </div>

    <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; color: #1C1917; margin: 0 0 12px 0;">
      Your Stay is Confirmed!
    </h2>

    <p style="font-size: 14.5px; color: #44403C; line-height: 1.6; margin: 0 0 18px 0;">
      Dear <strong>${escapeHtml(guestName)}</strong>,
    </p>

    <div style="background-color: #F0FDF4; border-left: 4px solid #22C55E; padding: 14px 16px; margin-bottom: 22px; border-radius: 0 4px 4px 0;">
      <p style="margin: 0; font-size: 13.5px; color: #14532D; line-height: 1.55;">
        We are delighted to confirm your reservation at Casa Amara Boutique Hotel. Our staff has approved your booking and your room is waiting for your arrival.
      </p>
    </div>

    <div style="background-color: #1C1917; color: #FFFFFF; padding: 18px 20px; border-radius: 6px; margin-bottom: 20px;">
      <span style="font-size: 10px; letter-spacing: 0.18em; color: #B59A72; text-transform: uppercase; display: block; margin-bottom: 4px;">CONFIRMED BOOKING REFERENCE</span>
      <span style="font-family: monospace, Courier; font-size: 22px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.08em;">
        ${escapeHtml(ref)}
      </span>
    </div>

    <h4 style="margin: 22px 0 8px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #78716C;">
      Confirmed Reservation Details
    </h4>
    <table class="detail-table">
      <tr>
        <td class="detail-label">Room Type</td>
        <td class="detail-value">${escapeHtml(roomName)}${escapeHtml(roomNum)}</td>
      </tr>
      <tr>
        <td class="detail-label">Check-in</td>
        <td class="detail-value">${escapeHtml(checkin)} (from 2:00 PM)</td>
      </tr>
      <tr>
        <td class="detail-label">Check-out</td>
        <td class="detail-value">${escapeHtml(checkout)} (until 12:00 PM)</td>
      </tr>
      <tr>
        <td class="detail-label">Duration</td>
        <td class="detail-value">${nights} Night${nights > 1 ? 's' : ''}</td>
      </tr>
      <tr>
        <td class="detail-label">Guests</td>
        <td class="detail-value">${guests} Guest${guests > 1 ? 's' : ''}</td>
      </tr>
      <tr>
        <td class="detail-label">Total Amount</td>
        <td class="detail-value" style="color: #1C1917; font-size: 15px;">₱${escapeHtml(total)}</td>
      </tr>
      <tr>
        <td class="detail-label">Status</td>
        <td class="detail-value" style="color: #15803D;">Approved / Confirmed</td>
      </tr>
      ${reservation.special_requests ? `
      <tr>
        <td class="detail-label">Special Requests</td>
        <td class="detail-value" style="font-weight: 400; color: #57534E;">${escapeHtml(reservation.special_requests)}</td>
      </tr>` : ''}
    </table>

    ${CANCELLATION_POLICY_HTML}
  `);

  return sendEmail({
    to: reservation.email,
    subject,
    html,
    text,
    meta: { type: 'RESERVATION_APPROVED', reference_id: ref }
  });
}

/**
 * 4. Send Reservation Rejection Email
 */
async function sendReservationRejectedEmail(reservation, rejectionReason = '') {
  const ref = reservation.reference_id || 'N/A';
  const guestName = reservation.guest_name || 'Valued Guest';
  const roomName = reservation.room_name || 'Selected Room';
  const checkin = reservation.check_in || '';
  const checkout = reservation.check_out || '';

  const subject = `Reservation Request Update: ${ref} - Casa Amara Boutique Hotel`;

  const reasonText = rejectionReason && rejectionReason.trim()
    ? `Reason provided: ${rejectionReason.trim()}`
    : `Due to high demand, scheduled maintenance, or room availability constraints, we are unable to accept your request at this time.`;

  const text = `Dear ${guestName},

Thank you for your interest in Casa Amara Boutique Hotel.

We regret to inform you that your reservation request (${ref}) for ${roomName} (${checkin} to ${checkout}) could not be approved at this time.

${reasonText}

No funds have been charged to your card. If you have any questions or wish to explore alternate dates, please feel free to contact our reservations desk at reservations@casaamara.ph or +63 917 123 4567.

Warm regards,
Casa Amara Reservations Team`;

  const html = wrapEmailHtml('Reservation Request Update', `
    <div style="display: inline-block; padding: 4px 12px; background-color: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; border-radius: 999px; font-size: 11.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 14px;">
      Reservation Not Approved
    </div>

    <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; color: #1C1917; margin: 0 0 12px 0;">
      Reservation Request Update
    </h2>

    <p style="font-size: 14.5px; color: #44403C; line-height: 1.6; margin: 0 0 18px 0;">
      Dear <strong>${escapeHtml(guestName)}</strong>,
    </p>

    <p style="font-size: 14.5px; color: #44403C; line-height: 1.6; margin: 0 0 20px 0;">
      Thank you for your interest in Casa Amara Boutique Hotel. We regret to inform you that we are unable to approve your reservation request <strong>${escapeHtml(ref)}</strong> for <strong>${escapeHtml(roomName)}</strong> (${escapeHtml(checkin)} → ${escapeHtml(checkout)}).
    </p>

    <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 14px 16px; margin-bottom: 22px; border-radius: 0 4px 4px 0;">
      <p style="margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #991B1B; font-weight: 600;">
        Reason for Decision:
      </p>
      <p style="margin: 0; font-size: 13.5px; color: #7F1D1D; line-height: 1.55;">
        ${escapeHtml(rejectionReason && rejectionReason.trim() ? rejectionReason.trim() : 'Due to room availability constraints, scheduling conflicts, or maintenance on selected dates, we cannot accommodate this booking at this time.')}
      </p>
    </div>

    <p style="font-size: 13.5px; color: #57534E; line-height: 1.6; margin: 0 0 15px 0;">
      Please be assured that <strong>no funds have been collected</strong>. If you would like to explore alternative dates or room categories, our front desk team would be pleased to assist you directly at <strong>reservations@casaamara.ph</strong> or <strong>+63 917 123 4567</strong>.
    </p>
  `);

  return sendEmail({
    to: reservation.email,
    subject,
    html,
    text,
    meta: { type: 'RESERVATION_REJECTED', reference_id: ref, reason: rejectionReason }
  });
}

module.exports = {
  sendOtpEmail,
  sendReservationRequestEmail,
  sendReservationApprovedEmail,
  sendReservationRejectedEmail,
  CANCELLATION_POLICY_HTML,
  CANCELLATION_POLICY_TEXT
};

