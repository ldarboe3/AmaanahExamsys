// SendGrid Email Service for Amaanah Exam System (via Replit Connector)
// Handles verification emails, notifications, and system communications

import sgMail from '@sendgrid/mail';
import crypto from 'crypto';

let connectionSettings: any;

// Get credentials from Replit SendGrid connector
async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key || !connectionSettings.settings.from_email)) {
    throw new Error('SendGrid not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, email: connectionSettings.settings.from_email };
}

// WARNING: Never cache this client - tokens expire
// Always call this function to get a fresh client
export async function getUncachableSendGridClient() {
  const { apiKey, email } = await getCredentials();
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: email
  };
}

// Generate a cryptographically secure verification token
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Hash a token for secure storage (optional - for enhanced security)
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Calculate expiry time (2 hours from now)
export function getVerificationExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 2);
  return expiry;
}

// Generate a cryptographically secure random 6-digit index number
export function generateIndexNumber(): string {
  const min = 100000;
  const max = 999999;
  return crypto.randomInt(min, max + 1).toString();
}

// Generate unique invoice number
export function generateInvoiceNumber(schoolId: number, examYearId: number): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  return `INV-${examYearId}-${schoolId}-${timestamp}`;
}

interface EmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

// Send email using SendGrid
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();

    const msg = {
      to: options.to,
      from: fromEmail,
      subject: options.subject,
      html: options.htmlBody,
      text: options.textBody || options.htmlBody.replace(/<[^>]*>/g, ''),
    };

    await client.send(msg);
    console.log(`Email sent successfully to ${options.to} from ${fromEmail}`);
    return true;
  } catch (error: any) {
    console.error('Failed to send email:', error?.message || error);
    return false;
  }
}

// Send school verification email with 2-hour expiry link
export async function sendSchoolVerificationEmail(
  schoolEmail: string,
  schoolName: string,
  registrarName: string,
  verificationToken: string,
  baseUrl: string
): Promise<boolean> {
  const verificationLink = `${baseUrl}/school-verify/${verificationToken}`;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1E8F4D, #166534); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .btn { display: inline-block; background: #1E8F4D; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .btn:hover { background: #166534; }
        .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .arabic { font-family: 'Noto Naskh Arabic', 'Traditional Arabic', serif; direction: rtl; text-align: right; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Amaanah Islamic Education</h1>
          <p class="arabic">الأمانة للتعليم الإسلامي</p>
        </div>
        <div class="content">
          <h2>Welcome to Amaanah Exam System</h2>
          <p>Dear ${registrarName},</p>
          <p>Your school <strong>${schoolName}</strong> has been registered in the Amaanah Examination System. Please click the button below to verify your email address and complete your school profile setup.</p>
          
          <div style="text-align: center;">
            <a href="${verificationLink}" class="btn">Verify Email & Complete Registration</a>
          </div>
          
          <div class="warning">
            <strong>Important:</strong> This verification link will expire in <strong>2 hours</strong>. If you do not verify within this time, you will need to request a new verification link.
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #1E8F4D;">${verificationLink}</p>
          
          <p>During verification, you will:</p>
          <ul>
            <li>Create your login username and password</li>
            <li>Get immediate access to your school dashboard</li>
            <li>Be able to register students for examinations</li>
            <li>View and print student index numbers after payment</li>
          </ul>
          
          <p>If you did not register for this account, please ignore this email.</p>
          
          <p>Best regards,<br>Amaanah Examination Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Amaanah Islamic Education - The Gambia</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: schoolEmail,
    subject: 'Verify Your School Registration - Amaanah Exam System',
    htmlBody: htmlBody
  });
}

// Send payment confirmation email
export async function sendPaymentConfirmationEmail(
  schoolEmail: string,
  schoolName: string,
  invoiceNumber: string,
  totalAmount: string,
  studentCount: number,
  baseUrl: string
): Promise<boolean> {
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1E8F4D, #166534); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .success { background: #D1FAE5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .invoice-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .invoice-details table { width: 100%; border-collapse: collapse; }
        .invoice-details td { padding: 10px; border-bottom: 1px solid #eee; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Confirmed</h1>
        </div>
        <div class="content">
          <div class="success">
            <strong>Payment Successful!</strong> Your payment has been confirmed and student index numbers have been generated.
          </div>
          
          <p>Dear ${schoolName},</p>
          
          <div class="invoice-details">
            <h3>Payment Details</h3>
            <table>
              <tr><td><strong>Invoice Number:</strong></td><td>${invoiceNumber}</td></tr>
              <tr><td><strong>Total Students:</strong></td><td>${studentCount}</td></tr>
              <tr><td><strong>Amount Paid:</strong></td><td>GMD ${totalAmount}</td></tr>
              <tr><td><strong>Payment Date:</strong></td><td>${new Date().toLocaleDateString()}</td></tr>
            </table>
          </div>
          
          <p>You can now:</p>
          <ul>
            <li>View and print student index numbers from your dashboard</li>
            <li>Download student exam cards</li>
            <li>View assigned examination centers</li>
          </ul>
          
          <p>Login to your dashboard at: <a href="${baseUrl}/login">${baseUrl}/login</a></p>
          
          <p>Best regards,<br>Amaanah Examination Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Amaanah Islamic Education - The Gambia</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: schoolEmail,
    subject: `Payment Confirmed - Invoice ${invoiceNumber}`,
    htmlBody: htmlBody
  });
}

// Send results published notification
export async function sendResultsPublishedEmail(
  schoolEmail: string,
  schoolName: string,
  examYearName: string,
  grade: number,
  baseUrl: string
): Promise<boolean> {
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1E8F4D, #166534); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .btn { display: inline-block; background: #1E8F4D; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Examination Results Published</h1>
        </div>
        <div class="content">
          <p>Dear ${schoolName},</p>
          
          <p>We are pleased to inform you that the <strong>Grade ${grade}</strong> examination results for <strong>${examYearName}</strong> have been published.</p>
          
          <p>You can now access your students' results through your school dashboard.</p>
          
          <div style="text-align: center;">
            <a href="${baseUrl}/dashboard/results" class="btn">View Results</a>
          </div>
          
          <p>From your dashboard, you can:</p>
          <ul>
            <li>View individual student results</li>
            <li>Download and print result sheets</li>
            <li>Generate certificates for passed students</li>
          </ul>
          
          <p>Best regards,<br>Amaanah Examination Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Amaanah Islamic Education - The Gambia</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: schoolEmail,
    subject: `Grade ${grade} Results Published - ${examYearName}`,
    htmlBody: htmlBody
  });
}

// Send center allocation notification
export async function sendCenterAllocationEmail(
  schoolEmail: string,
  schoolName: string,
  centerName: string,
  centerAddress: string,
  examYearName: string,
  baseUrl: string
): Promise<boolean> {
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1E8F4D, #166534); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .center-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1E8F4D; }
        .btn { display: inline-block; background: #1E8F4D; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Examination Center Allocated</h1>
        </div>
        <div class="content">
          <p>Dear ${schoolName},</p>
          
          <p>An examination center has been allocated to your school for <strong>${examYearName}</strong>.</p>
          
          <div class="center-details">
            <h3>Center Information</h3>
            <p><strong>Center Name:</strong> ${centerName}</p>
            <p><strong>Address:</strong> ${centerAddress}</p>
          </div>
          
          <p>All registered students from your school will sit for their examinations at this center.</p>
          
          <div style="text-align: center;">
            <a href="${baseUrl}/dashboard/centers" class="btn">View Timetable & Details</a>
          </div>
          
          <p>Please ensure all students are aware of their examination center and arrive at least 30 minutes before each examination.</p>
          
          <p>Best regards,<br>Amaanah Examination Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Amaanah Islamic Education - The Gambia</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: schoolEmail,
    subject: `Examination Center Allocated - ${examYearName}`,
    htmlBody: htmlBody
  });
}

// Send password reset email
export async function sendPasswordResetEmail(
  schoolEmail: string,
  schoolName: string,
  registrarName: string,
  resetToken: string,
  baseUrl: string
): Promise<boolean> {
  const resetLink = `${baseUrl}/forgot-password/${resetToken}`;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1E8F4D, #166534); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .btn { display: inline-block; background: #1E8F4D; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .btn:hover { background: #166534; }
        .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .arabic { font-family: 'Noto Naskh Arabic', 'Traditional Arabic', serif; direction: rtl; text-align: right; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
          <p class="arabic">إعادة تعيين كلمة المرور</p>
        </div>
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>Dear ${registrarName},</p>
          <p>We received a request to reset the password for your school account <strong>${schoolName}</strong>. Click the button below to create a new password.</p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="btn">Reset Password</a>
          </div>
          
          <div class="warning">
            <strong>Important:</strong> This password reset link will expire in <strong>2 hours</strong>. If you do not reset your password within this time, you will need to request a new link.
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #1E8F4D;">${resetLink}</p>
          
          <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
          
          <p>Best regards,<br>Amaanah Examination Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Amaanah Islamic Education - The Gambia</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: schoolEmail,
    subject: 'Password Reset Request - Amaanah Exam System',
    htmlBody: htmlBody
  });
}
