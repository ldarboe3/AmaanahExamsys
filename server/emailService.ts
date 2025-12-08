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

// Send school verification email with 2-hour expiry link - supports both English and Arabic
export async function sendSchoolVerificationEmail(
  schoolEmail: string,
  schoolName: string,
  registrarName: string,
  verificationToken: string,
  baseUrl: string,
  preferredLanguage: string = 'english'
): Promise<boolean> {
  const verificationLink = `${baseUrl}/school-verify/${verificationToken}`;
  const isArabic = preferredLanguage.toLowerCase() === 'arabic';
  
  let htmlBody = '';
  let subject = '';

  if (isArabic) {
    htmlBody = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Noto Naskh Arabic', 'Traditional Arabic', serif; direction: rtl; text-align: right; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E8F4D, #166534); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .btn { display: inline-block; background: #1E8F4D; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .warning { background: #FEF3C7; border-right: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>الأمانة للتعليم الإسلامي</h1>
            <p>Amaanah Islamic Education</p>
          </div>
          <div class="content">
            <h2>أهلا بك في نظام امتحانات الأمانة</h2>
            <p>السيد/السيدة ${registrarName}،</p>
            <p>تم تسجيل مدرستك <strong>${schoolName}</strong> في نظام الامتحانات الإسلامية للأمانة. يرجى النقر على الزر أدناه للتحقق من عنوان بريدك الإلكتروني واستكمال إعداد ملف المدرسة.</p>
            
            <div style="text-align: center;">
              <a href="${verificationLink}" class="btn">التحقق من البريد الإلكتروني واستكمال التسجيل</a>
            </div>
            
            <div class="warning">
              <strong>مهم:</strong> سينتهي صلاحية رابط التحقق في <strong>ساعتين</strong>. إذا لم تتحقق خلال هذا الوقت، ستحتاج إلى طلب رابط تحقق جديد.
            </div>
            
            <p>إذا لم يعمل الزر، انسخ والصق هذا الرابط في متصفحك:</p>
            <p style="word-break: break-all; color: #1E8F4D;">${verificationLink}</p>
            
            <p>أثناء التحقق، ستتمكن من:</p>
            <ul>
              <li>إنشاء اسم المستخدم وكلمة المرور الخاصة بك</li>
              <li>الوصول الفوري إلى لوحة التحكم الخاصة بمدرستك</li>
              <li>تسجيل الطلاب للامتحانات</li>
              <li>عرض وطباعة أرقام الفهرس للطلاب بعد السداد</li>
            </ul>
            
            <p>إذا لم تقم بالتسجيل في هذا الحساب، يرجى تجاهل هذا البريد الإلكتروني.</p>
            
            <p>مع أطيب التحيات،<br>فريق امتحانات الأمانة</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} الأمانة للتعليم الإسلامي - جمهورية غامبيا</p>
            <p>هذه رسالة تلقائية. يرجى عدم الرد على هذا البريد الإلكتروني.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    subject = 'تحقق من تسجيل مدرستك - نظام امتحانات الأمانة';
  } else {
    htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E8F4D, #166534); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .btn { display: inline-block; background: #1E8F4D; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
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
    subject = 'Verify Your School Registration - Amaanah Exam System';
  }

  return sendEmail({
    to: schoolEmail,
    subject: subject,
    htmlBody: htmlBody
  });
}

// Send school login credentials email
export async function sendSchoolCredentialsEmail(
  schoolEmail: string,
  schoolName: string,
  username: string,
  temporaryPassword: string,
  baseUrl: string
): Promise<boolean> {
  const loginUrl = `${baseUrl}/login`;
  
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
        .credentials { background: #E0F2FE; border: 2px solid #0EA5E9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .credentials h3 { margin-top: 0; color: #0369A1; }
        .credentials table { width: 100%; border-collapse: collapse; }
        .credentials td { padding: 8px 0; }
        .credentials .label { font-weight: bold; color: #0369A1; }
        .credentials .value { font-family: monospace; font-size: 16px; background: white; padding: 8px 12px; border-radius: 4px; }
        .btn { display: inline-block; background: #1E8F4D; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
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
          <h2>Your Login Credentials</h2>
          <p>Dear ${schoolName},</p>
          <p>Here are your login credentials to access the Amaanah Examination System:</p>
          
          <div class="credentials">
            <h3>Login Details</h3>
            <table>
              <tr>
                <td class="label">Username:</td>
                <td><span class="value">${username}</span></td>
              </tr>
              <tr>
                <td class="label">Temporary Password:</td>
                <td><span class="value">${temporaryPassword}</span></td>
              </tr>
            </table>
          </div>
          
          <div class="warning">
            <strong>Important:</strong> You will be required to change your password upon first login for security purposes. Please keep your new password safe and do not share it with anyone.
          </div>
          
          <div style="text-align: center;">
            <a href="${loginUrl}" class="btn">Login Now</a>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #1E8F4D;">${loginUrl}</p>
          
          <p>After logging in, you can:</p>
          <ul>
            <li>Register students for examinations</li>
            <li>View and manage your school profile</li>
            <li>Process payments and view invoices</li>
            <li>Download student index numbers and exam cards</li>
          </ul>
          
          <p>If you have any questions, please contact the Amaanah Examination Office.</p>
          
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
    subject: 'Your Login Credentials - Amaanah Exam System',
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
        .btn { display: inline-block; background: #1E8F4D; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .btn:hover { background: #166534; }
        .btn a { color: white !important; text-decoration: none; }
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

// Send school admin invitation email
export async function sendSchoolAdminInvitationEmail(
  email: string,
  schoolName: string,
  recipientName: string,
  verificationUrl: string
): Promise<boolean> {
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
        .btn { display: inline-block; background: #1E8F4D; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .btn:hover { background: #166534; }
        .highlight { background: #E7F9EE; border-left: 4px solid #1E8F4D; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .arabic { font-family: 'Noto Naskh Arabic', 'Traditional Arabic', serif; direction: rtl; text-align: right; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>School Admin Invitation</h1>
          <p class="arabic">دعوة مسؤول المدرسة</p>
        </div>
        <div class="content">
          <h2>You've Been Invited!</h2>
          <p>Dear ${recipientName},</p>
          <p>You have been invited to join the Amaanah Examination Management System as an administrator for <strong>${schoolName}</strong>.</p>
          
          <div class="highlight">
            <p>As a school administrator, you will be able to:</p>
            <ul>
              <li>Manage student registrations for examinations</li>
              <li>View and download examination results</li>
              <li>Access school profile and payment information</li>
              <li>Generate certificates and transcripts</li>
            </ul>
          </div>
          
          <p>Click the button below to create your account:</p>
          
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="btn">Create Your Account</a>
          </div>
          
          <div class="warning">
            <strong>Important:</strong> This invitation link will expire in <strong>48 hours</strong>. Please complete your account setup before then.
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #1E8F4D;">${verificationUrl}</p>
          
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
    to: email,
    subject: `You're Invited to ${schoolName} - Amaanah Exam System`,
    htmlBody: htmlBody
  });
}

// Send initial exam year creation notification to all schools
export async function sendExamYearCreatedNotification(
  schoolEmail: string,
  schoolName: string,
  registrarName: string,
  examYearName: string,
  registrationEndDate: Date,
  baseUrl: string
): Promise<boolean> {
  const formattedDeadline = registrationEndDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
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
        .btn { display: inline-block; background: #1E8F4D; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .highlight { background: #E7F9EE; border-left: 4px solid #1E8F4D; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .arabic { font-family: 'Noto Naskh Arabic', 'Traditional Arabic', serif; direction: rtl; text-align: right; }
        .deadline-box { background: #1E8F4D; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
        .deadline-date { font-size: 24px; font-weight: bold; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Examination Year Announced!</h1>
          <p class="arabic">إعلان عن عام دراسي جديد!</p>
        </div>
        <div class="content">
          <h2>Assalamu Alaikum ${registrarName},</h2>
          <p>We are pleased to announce that <strong>${examYearName}</strong> is now open for student registration!</p>
          
          <div class="deadline-box">
            <p style="margin: 0; font-size: 14px;">REGISTRATION DEADLINE</p>
            <p class="deadline-date">${formattedDeadline}</p>
          </div>
          
          <div class="highlight">
            <p><strong>Important Information for ${schoolName}:</strong></p>
            <ul>
              <li>Student registration is now open</li>
              <li>Register all eligible students before the deadline</li>
              <li>Payment must be completed for registration to be valid</li>
              <li>Late registration will incur additional penalties</li>
            </ul>
          </div>
          
          <div style="text-align: center;">
            <a href="${baseUrl}/students" class="btn">Register Students Now</a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important Notice:</strong> Schools that fail to complete registration by the deadline will be subject to late registration penalties. Please ensure all students are registered on time.
          </div>
          
          <p>If you have any questions, please contact the examination office.</p>
          
          <p>Best regards,<br>Amaanah Examination Team</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <div class="arabic" style="margin-top: 20px;">
            <h3>السلام عليكم ${registrarName}</h3>
            <p>يسرنا أن نعلن أن التسجيل مفتوح الآن لـ <strong>${examYearName}</strong>!</p>
            <p><strong>آخر موعد للتسجيل: ${formattedDeadline}</strong></p>
            <p>يرجى تسجيل جميع الطلاب قبل الموعد النهائي لتجنب أي عقوبات.</p>
          </div>
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
    subject: `📢 ${examYearName} - Registration Now Open!`,
    htmlBody: htmlBody
  });
}

// Send weekly registration reminder email
export async function sendWeeklyRegistrationReminder(
  schoolEmail: string,
  schoolName: string,
  registrarName: string,
  examYearName: string,
  registrationEndDate: Date,
  daysRemaining: number,
  registeredStudents: number,
  baseUrl: string
): Promise<boolean> {
  const formattedDeadline = registrationEndDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .btn { display: inline-block; background: #2563eb; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .highlight { background: #EFF6FF; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .arabic { font-family: 'Noto Naskh Arabic', 'Traditional Arabic', serif; direction: rtl; text-align: right; }
        .countdown-box { background: #2563eb; color: white; padding: 25px; text-align: center; border-radius: 8px; margin: 20px 0; }
        .countdown-number { font-size: 48px; font-weight: bold; }
        .stats-box { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📅 Weekly Registration Reminder</h1>
          <p>${examYearName}</p>
        </div>
        <div class="content">
          <h2>Assalamu Alaikum ${registrarName},</h2>
          <p>This is a friendly reminder that the registration deadline for <strong>${examYearName}</strong> is approaching.</p>
          
          <div class="countdown-box">
            <p style="margin: 0; font-size: 14px; text-transform: uppercase;">Days Remaining</p>
            <p class="countdown-number">${daysRemaining}</p>
            <p style="margin: 0; font-size: 14px;">Deadline: ${formattedDeadline}</p>
          </div>
          
          <div class="stats-box">
            <p style="margin: 0; color: #666;">Students Registered from ${schoolName}</p>
            <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold; color: #2563eb;">${registeredStudents}</p>
          </div>
          
          <div class="highlight">
            <p><strong>Checklist:</strong></p>
            <ul>
              <li>Ensure all eligible students are registered</li>
              <li>Verify student information is accurate</li>
              <li>Complete payment for all registered students</li>
              <li>Download and keep index numbers for reference</li>
            </ul>
          </div>
          
          <div style="text-align: center;">
            <a href="${baseUrl}/students" class="btn">Review & Register Students</a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Reminder:</strong> Late registration will incur additional penalties. Please complete all registrations before ${formattedDeadline}.
          </div>
          
          <p>Best regards,<br>Amaanah Examination Team</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <div class="arabic" style="margin-top: 20px;">
            <h3>تذكير أسبوعي</h3>
            <p>متبقي <strong>${daysRemaining} يوم</strong> حتى انتهاء موعد التسجيل.</p>
            <p>عدد الطلاب المسجلين: <strong>${registeredStudents}</strong></p>
          </div>
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
    subject: `⏰ ${daysRemaining} Days Left - ${examYearName} Registration Reminder`,
    htmlBody: htmlBody
  });
}

// Send urgent daily registration reminder (less than 3 days remaining)
export async function sendUrgentRegistrationReminder(
  schoolEmail: string,
  schoolName: string,
  registrarName: string,
  examYearName: string,
  registrationEndDate: Date,
  daysRemaining: number,
  hoursRemaining: number,
  registeredStudents: number,
  baseUrl: string
): Promise<boolean> {
  const formattedDeadline = registrationEndDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const timeDisplay = daysRemaining > 0 
    ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} ${hoursRemaining} hours`
    : `${hoursRemaining} hours`;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #DC2626, #991B1B); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .btn { display: inline-block; background: #DC2626; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .urgent-box { background: #DC2626; color: white; padding: 25px; text-align: center; border-radius: 8px; margin: 20px 0; animation: pulse 2s infinite; }
        .urgent-number { font-size: 48px; font-weight: bold; }
        .warning { background: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .penalty-box { background: #7F1D1D; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .arabic { font-family: 'Noto Naskh Arabic', 'Traditional Arabic', serif; direction: rtl; text-align: right; }
        .stats-box { background: white; border: 2px solid #DC2626; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 URGENT: Registration Deadline Approaching!</h1>
          <p>${examYearName}</p>
        </div>
        <div class="content">
          <h2>⚠️ URGENT ACTION REQUIRED</h2>
          <p>Dear ${registrarName},</p>
          <p>This is an <strong>urgent reminder</strong> that the registration deadline for ${schoolName} is <strong>almost here!</strong></p>
          
          <div class="urgent-box">
            <p style="margin: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 2px;">⏰ TIME REMAINING</p>
            <p class="urgent-number">${timeDisplay}</p>
            <p style="margin: 0; font-size: 14px;">Deadline: ${formattedDeadline}</p>
          </div>
          
          <div class="stats-box">
            <p style="margin: 0; color: #DC2626; font-weight: bold;">Current Registration Status</p>
            <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold; color: #DC2626;">${registeredStudents} Students</p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">Registered from ${schoolName}</p>
          </div>
          
          <div class="penalty-box">
            <h3 style="margin: 0 0 10px 0;">⚠️ LATE REGISTRATION PENALTIES</h3>
            <p style="margin: 0;">Schools that miss the deadline will be subject to:</p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
              <li>Late registration fees</li>
              <li>Possible exclusion from current examination session</li>
              <li>Administrative processing delays</li>
            </ul>
          </div>
          
          <div style="text-align: center;">
            <a href="${baseUrl}/students" class="btn">COMPLETE REGISTRATION NOW</a>
          </div>
          
          <div class="warning">
            <strong>Final Checklist:</strong>
            <ul style="margin: 10px 0 0 0;">
              <li>✅ All students registered?</li>
              <li>✅ Student information verified?</li>
              <li>✅ Payment completed?</li>
              <li>✅ Index numbers downloaded?</li>
            </ul>
          </div>
          
          <p>If you need assistance, please contact the examination office immediately.</p>
          
          <p>Best regards,<br>Amaanah Examination Team</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <div class="arabic" style="margin-top: 20px;">
            <h3 style="color: #DC2626;">🚨 تنبيه عاجل!</h3>
            <p>الوقت المتبقي للتسجيل: <strong>${timeDisplay}</strong></p>
            <p>يرجى إكمال تسجيل جميع الطلاب فوراً لتجنب العقوبات!</p>
            <p>عدد الطلاب المسجلين حالياً: <strong>${registeredStudents}</strong></p>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Amaanah Islamic Education - The Gambia</p>
          <p>This is an automated urgent notification.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: schoolEmail,
    subject: `🚨 URGENT: Only ${timeDisplay} Left! - ${examYearName} Registration`,
    htmlBody: htmlBody
  });
}
