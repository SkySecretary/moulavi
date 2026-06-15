import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_CONFIG, isS3Configured, extractS3KeyFromUrl } from '../config/s3';

dotenv.config();

// Email configuration constants
const EMAIL_CONFIG = {
  from: '"Moulavi Travels" <info@moulavi.com>',
  adminEmail: 'info@moulavi.com',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
} as const;

// Email enabled flag (defaults to true for backward compatibility)
const EMAIL_ENABLED = process.env.EMAIL_ENABLED !== 'false';

// SMTP transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.bizmail.yahoo.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true' || (process.env.SMTP_PORT === '465' || !process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER || 'info@moulavi.com',
    pass: process.env.SMTP_PASSWORD || 'swokfyqwqpttwcvq',
  },
  // Mandrill specific configuration
  ...(process.env.SMTP_HOST === 'smtp.mandrillapp.com' && {
    pool: true,
    maxConnections: 1,
    rateDelta: 20000,
    rateLimit: 5,
  }),
});

// Email templates
const EMAIL_TEMPLATES = {
  registrationThankYou: (name: string, email: string, password?: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank You for Registering - Moulavi Travels</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .header { background: #065f46; color: white; padding: 40px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .content { padding: 30px; }
        .greeting { font-size: 18px; font-weight: 600; margin-bottom: 20px; color: #065f46; }
        .message { font-size: 16px; color: #555; margin-bottom: 20px; }
        .info-box { background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; border-radius: 4px; margin-bottom: 30px; }
        .credential-box { background: #f8fafc; border: 1px dashed #cbd5e1; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .credential-row { margin-bottom: 10px; font-family: monospace; }
        .label { font-weight: bold; color: #64748b; width: 100px; display: inline-block; }
        .value { color: #1e293b; font-weight: bold; }
        .footer { background: #1e293b; color: #cbd5e1; padding: 20px; text-align: center; font-size: 12px; }
        .footer p { margin: 5px 0; }
        .cta-button { display: inline-block; background: #d4a843; color: #1e293b; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>NuSync Gateway Registration</h1>
        </div>
        <div class="content">
          <div class="greeting">Assalamu Alaikum ${name},</div>
          <div class="message">
            Thank you for requesting access to the NuSync Umrah Gateway by Moulavi Travels. We have received your agency registration details.
          </div>
          
          ${password ? `
          <div class="info-box">
            <p><strong>Your Account is Ready!</strong></p>
            <p>We have automatically created your agent portal access. You can now log in using the credentials below. <strong>Please note that you will be required to verify your email address and complete your profile (PAN, Aadhaar, etc.) upon your first login.</strong></p>
          </div>
          
          <div class="credential-box">
            <div class="credential-row"><span class="label">Login URL:</span> <span class="value">https://umra.moulavi.in/login</span></div>
            <div class="credential-row"><span class="label">Username:</span> <span class="value">${email}</span></div>
            <div class="credential-row"><span class="label">Password:</span> <span class="value">${password}</span></div>
          </div>
          
          <center>
            <a href="https://umra.moulavi.in/login" class="cta-button">Access Agent Portal</a>
          </center>
          ` : `
          <div class="info-box">
            <p><strong>Review in Progress</strong></p>
            <p>Our onboarding team is currently reviewing your application. Once verified, you will receive your secure login credentials via WhatsApp and Email.</p>
          </div>
          `}
          
          <p class="message" style="margin-top: 30px;">
            We look forward to a fruitful cooperation and to being your trusted partner in serving the guests of the Kingdom.
          </p>
          <p style="font-weight: bold; color: #065f46;">Moulavi Travels and Recruiting Agents Pvt Ltd<br>Season 1448 Hijri</p>
        </div>
        <div class="footer">
          <p>© 2025 Moulavi Travels. All rights reserved.</p>
          <p>info@moulavi.com | +91 90044 81414</p>
        </div>
        </div>
        </body>
        </html>
        `,

        missingBrnNotification: (agentName: string, voucherNo: string, arrivalDate: string) => `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Missing Madinah BRN - Action Required</title>
        <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .header { background: #d97706; color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .content { padding: 30px; }
        .greeting { font-size: 18px; font-weight: 600; margin-bottom: 20px; color: #b45309; }
        .message { font-size: 16px; color: #555; margin-bottom: 20px; }
        .info-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 4px; margin-bottom: 30px; }
        .footer { background: #1e293b; color: #cbd5e1; padding: 20px; text-align: center; font-size: 12px; }
        .footer p { margin: 5px 0; }
        </style>
        </head>
        <body>
        <div class="container">
        <div class="header">
          <h1>Action Required: Missing Madinah BRN</h1>
        </div>
        <div class="content">
          <div class="greeting">Dear ${agentName},</div>
          <div class="message">
            Greetings from Moulavi Travel.
          </div>
          <div class="message">
            Your Voucher No. <strong>${voucherNo}</strong> is scheduled for travel from Makkah to Madinah on <strong>${arrivalDate}</strong>.
          </div>
          <div class="info-box">
            <p><strong>Important Notice:</strong> We have not yet received your Madinah BRN. Please note that the transport company will not provide the bus service without a valid Madinah BRN.</p>
            <p><strong>Without the Madinah BRN, you will not be permitted to enter or visit Madinah City.</strong></p>
          </div>
          <div class="message">
            Kindly submit the Madinah BRN at least 5 days before the travel date to avoid any disruption to your transportation and travel arrangements.
          </div>
          <p class="message" style="margin-top: 30px;">
            Your prompt cooperation is highly appreciated.
          </p>
          <p style="font-weight: bold; color: #b45309;">Regards,<br>Moulavi Travel</p>
        </div>
        <div class="footer">
          <p>© 2026 Moulavi Travels. All rights reserved.</p>
          <p>info@moulavi.com | +91 90044 81414</p>
        </div>
        </div>
        </body>
        </html>
        `,

  registrationAdminNotification: (details: any) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Agency Registration - NuSync</title>
      <style>
        body { font-family: sans-serif; line-height: 1.5; color: #333; }
        .container { max-width: 600px; margin: 20px auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
        h2 { color: #065f46; border-bottom: 2px solid #065f46; padding-bottom: 10px; }
        .detail-row { margin-bottom: 10px; display: flex; }
        .label { font-weight: bold; width: 180px; color: #666; }
        .value { flex: 1; }
        .section-title { background: #f3f4f6; padding: 5px 10px; font-weight: bold; margin: 20px 0 10px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>New Gateway Access Request</h2>
        <p>A new agency has registered on the NuSync landing page.</p>
        
        <div class="section-title">Agency Details</div>
        <div class="detail-row"><div class="label">Agency Name:</div><div class="value">${details.party_name}</div></div>
        <div class="detail-row"><div class="label">Agency Code:</div><div class="value">${details.party_code || 'N/A'}</div></div>
        <div class="detail-row"><div class="label">Email:</div><div class="value">${details.email}</div></div>
        <div class="detail-row"><div class="label">WhatsApp:</div><div class="value">${details.whatsapp_number}</div></div>
        <div class="detail-row"><div class="label">Office Contact:</div><div class="value">${details.contact_number || 'N/A'}</div></div>
        <div class="detail-row"><div class="label">Address:</div><div class="value">${details.address || 'N/A'}</div></div>
        
        <div class="section-title">Primary Contact</div>
        <div class="detail-row"><div class="label">Contact Name:</div><div class="value">${details.contact_name}</div></div>
        <div class="detail-row"><div class="label">Contact Number:</div><div class="value">${details.contact_person_number}</div></div>
        <div class="detail-row"><div class="label">Department:</div><div class="value">${details.department || 'N/A'}</div></div>
        
        <div class="section-title">Account Setup</div>
        <div class="detail-row"><div class="label">Currency:</div><div class="value">${details.account_currency_id}</div></div>
        <div class="detail-row"><div class="label">Customer Type:</div><div class="value">${details.customer_type}</div></div>
        <div class="detail-row"><div class="label">GST Number:</div><div class="value">${details.gst_number || 'N/A'}</div></div>
        <div class="detail-row"><div class="label">PAN Number:</div><div class="value">${details.pan_number || 'N/A'}</div></div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #888;">Submitted at: ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `,

  verificationCode: (code: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Email Verification - NuSync</title>
      <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; text-align: center; padding: 40px; }
        .code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #065f46; margin: 20px 0; padding: 20px; background: #f0fdf4; border-radius: 8px; display: inline-block; }
      </style>
    </head>
    <body>
      <h2>Verify Your Email</h2>
      <p>Your verification code for NuSync registration is:</p>
      <div class="code">${code}</div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this code, please ignore this email.</p>
    </body>
    </html>
  `,
  credentials: (name: string, email: string, password: string, frontendUrl: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Credentials - NuSync</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; }
        .email-container { max-width: 650px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #E3000F 0%, #C7000A 100%); color: white; padding: 40px 30px; text-align: center; position: relative; }
        .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>'); opacity: 0.1; }
        .logo { font-size: 28px; font-weight: 700; margin-bottom: 10px; position: relative; z-index: 1; }
        .tagline { font-size: 14px; opacity: 0.9; position: relative; z-index: 1; }
        .content { padding: 40px 30px; background-color: #ffffff; }
        .greeting { font-size: 18px; margin-bottom: 20px; color: #2c3e50; }
        .message { font-size: 16px; margin-bottom: 30px; color: #555; }
        .credentials-box { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 2px solid #E3000F; padding: 25px; margin: 25px 0; border-radius: 12px; position: relative; }
        .credentials-box::before { content: '🔐'; position: absolute; top: -15px; left: 20px; background: #E3000F; color: white; padding: 8px 12px; border-radius: 50%; font-size: 16px; }
        .credential-item { margin: 12px 0; font-size: 16px; }
        .credential-label { font-weight: 600; color: #E3000F; display: inline-block; min-width: 80px; }
        .credential-value { font-family: 'Courier New', monospace; background: #ffffff; padding: 8px 12px; border-radius: 6px; border: 1px solid #dee2e6; margin-left: 10px; }
        .warning-box { background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-left: 5px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .warning-icon { color: #856404; font-size: 18px; margin-right: 8px; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #E3000F 0%, #C7000A 100%); color: white; text-decoration: none; padding: 15px 35px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 25px 0; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(227, 0, 15, 0.3); }
        .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(227, 0, 15, 0.4); }
        .support-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center; }
        .footer { background: #2c3e50; color: #bdc3c7; padding: 30px; text-align: center; }
        .footer-logo { font-size: 20px; font-weight: 700; color: #E3000F; margin-bottom: 10px; }
        .footer-text { font-size: 14px; margin: 5px 0; }
        .social-links { margin: 20px 0; }
        .social-link { display: inline-block; margin: 0 10px; color: #bdc3c7; text-decoration: none; }
        .divider { height: 2px; background: linear-gradient(90deg, transparent, #E3000F, transparent); margin: 30px 0; }
        @media (max-width: 600px) {
          .email-container { margin: 0; box-shadow: none; }
          .header, .content, .footer { padding: 20px; }
          .logo { font-size: 24px; }
          .cta-button { display: block; text-align: center; }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo">NuSync</div>
          <div class="tagline">Professional Business Solutions</div>
        </div>
        
        <div class="content">
          <div class="greeting">Dear ${name},</div>
          
          <div class="message">
            Welcome to NuSync! Your account has been successfully created and is ready for use. 
            Below are your login credentials to access your personalized dashboard.
          </div>
          
          <div class="credentials-box">
            <div class="credential-item">
              <span class="credential-label">Email:</span>
              <span class="credential-value">${email}</span>
            </div>
            <div class="credential-item">
              <span class="credential-label">Password:</span>
              <span class="credential-value">${password}</span>
            </div>
          </div>
          
          <div class="warning-box">
            <span class="warning-icon">⚠️</span>
            <strong>Security Notice:</strong> For your account security, please change your password immediately after your first login.
          </div>
          
          <div style="text-align: center;">
            <a href="${frontendUrl}" class="cta-button">Access Your Account</a>
          </div>
          
          <div class="divider"></div>
          
          <div class="support-info">
            <p><strong>Need Help?</strong></p>
            <p>Our support team is available 24/7 to assist you with any questions or technical issues.</p>
            <p>📧 Email: info@moulavi.com | 📞 Phone: +9190044 81414</p>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-logo">NuSync</div>
          <div class="footer-text">Professional Business Solutions</div>
          <div class="social-links">
            <a href="#" class="social-link">LinkedIn</a>
            <a href="#" class="social-link">Twitter</a>
            <a href="#" class="social-link">Facebook</a>
          </div>
          <div class="footer-text">© 2025 NuSync. All rights reserved.</div>
          <div class="footer-text">This is an automated email. Please do not reply to this message.</div>
        </div>
      </div>
    </body>
    </html>
  `,

  serviceConfirmation: (name: string, serviceType: string, bookingId: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Service Request Confirmation - NuSync</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; }
        .email-container { max-width: 650px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #E3000F 0%, #C7000A 100%); color: white; padding: 40px 30px; text-align: center; position: relative; }
        .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>'); opacity: 0.1; }
        .logo { font-size: 28px; font-weight: 700; margin-bottom: 10px; position: relative; z-index: 1; }
        .tagline { font-size: 14px; opacity: 0.9; position: relative; z-index: 1; }
        .success-icon { font-size: 48px; margin-bottom: 20px; position: relative; z-index: 1; }
        .content { padding: 40px 30px; background-color: #ffffff; }
        .greeting { font-size: 18px; margin-bottom: 20px; color: #2c3e50; }
        .message { font-size: 16px; margin-bottom: 30px; color: #555; }
        .service-details { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 2px solid #E3000F; padding: 25px; margin: 25px 0; border-radius: 12px; position: relative; }
        .service-details::before { content: '📋'; position: absolute; top: -15px; left: 20px; background: #E3000F; color: white; padding: 8px 12px; border-radius: 50%; font-size: 16px; }
        .detail-item { margin: 12px 0; font-size: 16px; }
        .detail-label { font-weight: 600; color: #E3000F; display: inline-block; min-width: 120px; }
        .detail-value { background: #ffffff; padding: 8px 12px; border-radius: 6px; border: 1px solid #dee2e6; margin-left: 10px; }
        .status-box { background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); border-left: 5px solid #28a745; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .status-icon { color: #155724; font-size: 18px; margin-right: 8px; }
        .next-steps { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0; }
        .step-item { margin: 10px 0; padding-left: 25px; position: relative; }
        .step-item::before { content: '✓'; position: absolute; left: 0; color: #E3000F; font-weight: bold; }
        .footer { background: #2c3e50; color: #bdc3c7; padding: 30px; text-align: center; }
        .footer-logo { font-size: 20px; font-weight: 700; color: #E3000F; margin-bottom: 10px; }
        .footer-text { font-size: 14px; margin: 5px 0; }
        .social-links { margin: 20px 0; }
        .social-link { display: inline-block; margin: 0 10px; color: #bdc3c7; text-decoration: none; }
        .divider { height: 2px; background: linear-gradient(90deg, transparent, #E3000F, transparent); margin: 30px 0; }
        @media (max-width: 600px) {
          .email-container { margin: 0; box-shadow: none; }
          .header, .content, .footer { padding: 20px; }
          .logo { font-size: 24px; }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo">NuSync</div>
          <div class="tagline">Professional Business Solutions</div>
          <div class="success-icon">✅</div>
        </div>
        
        <div class="content">
          <div class="greeting">Dear ${name},</div>
          
          <div class="message">
            Thank you for choosing NuSync! Your service request has been successfully submitted and is now being processed by our team.
          </div>
          
          <div class="service-details">
            <div class="detail-item">
              <span class="detail-label">Service Type:</span>
              <span class="detail-value">${serviceType}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Booking ID:</span>
              <span class="detail-value">${bookingId}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Submitted:</span>
              <span class="detail-value">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          
          <div class="status-box">
            <span class="status-icon">📋</span>
            <strong>Status:</strong> Your request is currently under review. Our team will process it within 24-48 hours and keep you updated on the progress.
          </div>
          
          <div class="next-steps">
            <h3 style="color: #E3000F; margin-bottom: 15px;">What happens next?</h3>
            <div class="step-item">Our team will review your request and verify all submitted documents</div>
            <div class="step-item">You will receive updates via email at each processing stage</div>
            <div class="step-item">Once approved, you'll receive your service confirmation</div>
            <div class="step-item">Our support team will be available throughout the process</div>
          </div>
          
          <div class="divider"></div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
            <p><strong>Questions or Concerns?</strong></p>
            <p>Our dedicated support team is here to help you every step of the way.</p>
            <p>📧 Email: Info@moulavi.com | 📞 Phone: +91-XXX-XXX-XXXX</p>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-logo">NuSync</div>
          <div class="footer-text">Professional Business Solutions</div>
          <div class="social-links">
            <a href="#" class="social-link">LinkedIn</a>
            <a href="#" class="social-link">Twitter</a>
            <a href="#" class="social-link">Facebook</a>
          </div>
          <div class="footer-text">© 2025 NuSync. All rights reserved.</div>
          <div class="footer-text">This is an automated email. Please do not reply to this message.</div>
        </div>
        </div>
      </body>
    </html>
  `,

  iqamaConfirmation: (name: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Iqama Confirmation - NuSync</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; }
        .email-container { max-width: 650px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #E3000F 0%, #C7000A 100%); color: white; padding: 40px 30px; text-align: center; position: relative; }
        .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>'); opacity: 0.1; }
        .logo { font-size: 28px; font-weight: 700; margin-bottom: 10px; position: relative; z-index: 1; }
        .tagline { font-size: 14px; opacity: 0.9; position: relative; z-index: 1; }
        .content { padding: 40px 30px; background-color: #ffffff; }
        .greeting { font-size: 18px; margin-bottom: 20px; color: #2c3e50; }
        .message { font-size: 16px; margin-bottom: 30px; color: #555; }
        .info-box { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 2px solid #E3000F; padding: 25px; margin: 25px 0; border-radius: 12px; }
        .instruction-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 5px solid #E3000F; }
        .step-item { margin: 12px 0; padding-left: 25px; position: relative; }
        .step-item::before { content: '✓'; position: absolute; left: 0; color: #E3000F; font-weight: bold; font-size: 18px; }
        .footer { background: #2c3e50; color: #bdc3c7; padding: 30px; text-align: center; }
        .footer-logo { font-size: 20px; font-weight: 700; color: #E3000F; margin-bottom: 10px; }
        .footer-text { font-size: 14px; margin: 5px 0; }
        .divider { height: 2px; background: linear-gradient(90deg, transparent, #E3000F, transparent); margin: 30px 0; }
        @media (max-width: 600px) {
          .email-container { margin: 0; box-shadow: none; }
          .header, .content, .footer { padding: 20px; }
          .logo { font-size: 24px; }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo">NuSync</div>
          <div class="tagline">Professional Business Solutions</div>
        </div>
        
        <div class="content">
          <div class="greeting">Dear ${name},</div>
          
          <div class="message">
            🌙 Greetings from Umra Company, Saudi Arabia 🇸🇦
          </div>
          
          <div class="info-box">
            <p style="margin-bottom: 15px;">👨‍👩‍👧 Your family has applied for an Umrah visa through our Indian agent.</p>
            <p style="margin-bottom: 15px;">✅ Kindly log in to your Absher account and approve the request at the earliest convenience.</p>
            <p style="margin-bottom: 15px;">🔎 For your reference, please check under "Qabul Services" in your Absher account to view and approve the request.</p>
            <p>📞 If you need any assistance, please feel free to contact us anytime.</p>
          </div>
          
          <div class="divider"></div>
          
          <div class="instruction-box">
            <h3 style="color: #E3000F; margin-bottom: 15px;">✅ How to Check Qabul Services in Absher</h3>
            <div class="step-item">Log in to <a href="https://www.absher.sa" style="color: #E3000F; text-decoration: none;">Absher.sa</a> → Individual account</div>
            <div class="step-item">Go to My Services (خدماتي) → Inquiries (الاستعلامات)</div>
            <div class="step-item">Select General Services (الخدمات العامة)</div>
            <div class="step-item">Click Qabul Services (قبول الخدمات)</div>
            <div class="step-item">View or Accept (قبول) / Reject (رفض) any pending requests</div>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-logo">NuSync</div>
          <div class="footer-text">Professional Business Solutions</div>
          <div class="footer-text">© 2025 NuSync. All rights reserved.</div>
          <div class="footer-text">This is an automated email. Please do not reply to this message.</div>
        </div>
      </div>
    </body>
    </html>
  `,
} as const;

// Utility function to send email with error handling
const sendEmail = async (mailOptions: nodemailer.SendMailOptions): Promise<void> => {
  const logPrefix = '[EMAIL]';
  
  // Check if email is enabled
  if (!EMAIL_ENABLED) {
    console.log(`${logPrefix} ⚠️ Email sending is disabled (EMAIL_ENABLED=false). Skipping email.`);
    console.log(`${logPrefix} To: ${mailOptions.to || 'null'}`);
    console.log(`${logPrefix} Subject: ${mailOptions.subject || 'null'}`);
    console.log(`${logPrefix} ========== END: Email Skipped (Disabled) ==========`);
    return;
  }

  const startTime = Date.now();
  
  console.log(`${logPrefix} ========== START: Sending Email ==========`);
  console.log(`${logPrefix} Timestamp: ${new Date().toISOString()}`);
  console.log(`${logPrefix} To: ${mailOptions.to || 'null'}`);
  console.log(`${logPrefix} Subject: ${mailOptions.subject || 'null'}`);
  console.log(`${logPrefix} From: ${mailOptions.from || EMAIL_CONFIG.from}`);
  console.log(`${logPrefix} CC: ${mailOptions.cc || 'none'}`);
  console.log(`${logPrefix} BCC: ${mailOptions.bcc || 'none'}`);
  console.log(`${logPrefix} Has Attachments: ${mailOptions.attachments ? mailOptions.attachments.length : 0}`);
  
  if (mailOptions.attachments && mailOptions.attachments.length > 0) {
    mailOptions.attachments.forEach((att, idx) => {
      console.log(`${logPrefix}   Attachment ${idx + 1}: ${att.filename || 'unnamed'} (${att.content ? 'Buffer' : 'path'})`);
    });
  }

  // Log SMTP configuration (masked)
  console.log(`${logPrefix} SMTP Configuration:`);
  const smtpOptions = transporter.options as any;
  console.log(`${logPrefix}   Host: ${smtpOptions.host || process.env.SMTP_HOST || 'not set'}`);
  console.log(`${logPrefix}   Port: ${smtpOptions.port || process.env.SMTP_PORT || 'not set'}`);
  console.log(`${logPrefix}   Secure: ${smtpOptions.secure || process.env.SMTP_SECURE === 'true' || false}`);
  const authUser = smtpOptions.auth?.user || process.env.SMTP_USER;
  console.log(`${logPrefix}   User: ${authUser ? `${authUser.substring(0, 3)}***` : 'not set'}`);

  try {
    // Verify SMTP connection (helps catch configuration issues early)
      console.log(`${logPrefix} Verifying SMTP connection...`);
      const verifyStartTime = Date.now();
    try {
      await transporter.verify();
      const verifyDuration = Date.now() - verifyStartTime;
      console.log(`${logPrefix} ✓ SMTP connection verified successfully in ${verifyDuration}ms`);
    } catch (verifyError: any) {
      console.error(`${logPrefix} ⚠️ SMTP verification failed (will still attempt to send):`, verifyError?.message);
      // Don't throw here - some SMTP servers don't support verify but still work
      // We'll catch the actual send error if it fails
    }
    
    console.log(`${logPrefix} Sending email via SMTP...`);
    const sendStartTime = Date.now();
    const result = await transporter.sendMail(mailOptions);
    const sendDuration = Date.now() - sendStartTime;
    const totalDuration = Date.now() - startTime;
    
    console.log(`${logPrefix} ✅ SUCCESS: Email sent successfully`);
    console.log(`${logPrefix} Message ID: ${result.messageId || 'N/A'}`);
    console.log(`${logPrefix} Response: ${result.response || 'N/A'}`);
    console.log(`${logPrefix} Accepted: ${result.accepted?.join(', ') || 'N/A'}`);
    console.log(`${logPrefix} Rejected: ${result.rejected?.join(', ') || 'none'}`);
    console.log(`${logPrefix} Send Duration: ${sendDuration}ms`);
    console.log(`${logPrefix} Total Duration: ${totalDuration}ms`);
    console.log(`${logPrefix} ========== END: Email Sent Successfully ==========`);
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`${logPrefix} ❌ EXCEPTION: Error sending email`);
    console.error(`${logPrefix} Duration before error: ${totalDuration}ms`);
    console.error(`${logPrefix} Error Type: ${error?.constructor?.name || 'Unknown'}`);
    console.error(`${logPrefix} Error Message: ${error?.message || 'Unknown error'}`);
    console.error(`${logPrefix} Error Code: ${error?.code || 'Unknown code'}`);
    console.error(`${logPrefix} Error Stack:`, error?.stack || 'No stack trace available');
    
    if (error?.command) {
      console.error(`${logPrefix} SMTP Command: ${error.command}`);
    }
    
    if (error?.response) {
      console.error(`${logPrefix} SMTP Response: ${error.response}`);
    }
    
    if (error?.responseCode) {
      console.error(`${logPrefix} SMTP Response Code: ${error.responseCode}`);
    }
    
    console.error(`${logPrefix} To: ${mailOptions.to || 'null'}`);
    console.error(`${logPrefix} Subject: ${mailOptions.subject || 'null'}`);
    console.error(`${logPrefix} ========== END: Exception ==========`);
    throw new Error(`Failed to send email: ${error?.message || 'Unknown error'}`);
  }
};

// Send credentials email
export const sendCredentialsEmail = async (
  to: string,
  name: string,
  email: string,
  password: string,
  phoneNumber?: string
): Promise<void> => {
  console.log('[EMAIL] ========== sendCredentialsEmail called ==========');
  console.log('[EMAIL] Parameters:', {
    to: to || 'null',
    name: name || 'null',
    email: email || 'null',
    password: password ? '***masked***' : 'null',
    phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'not provided',
  });
  
  const mailOptions: nodemailer.SendMailOptions = {
    from: EMAIL_CONFIG.from,
    to,
    subject: 'Your NuSync Account Credentials',
    html: EMAIL_TEMPLATES.credentials(name, email, password, EMAIL_CONFIG.frontendUrl),
  };
  
  console.log('[EMAIL] Email template generated');
  const htmlLength = typeof mailOptions.html === 'string' ? mailOptions.html.length : 0;
  console.log('[EMAIL] HTML length:', htmlLength);
  
  try {
    // Attempt to send email (will be skipped if EMAIL_ENABLED=false)
    await sendEmail(mailOptions);
    if (EMAIL_ENABLED) {
    console.log('[EMAIL] ✅ sendCredentialsEmail email sent successfully');
    }
    
    // Send WhatsApp message if phone number is provided (always attempt, regardless of email status)
    if (phoneNumber) {
      console.log('[EMAIL] Attempting to send WhatsApp credentials...');
      try {
        const { sendCredentialsWhatsApp } = await import('./whatsappService');
        await sendCredentialsWhatsApp(phoneNumber, name, email, password);
        console.log('[EMAIL] ✅ WhatsApp credentials sent successfully');
      } catch (error: any) {
        console.error('[EMAIL] ❌ Failed to send WhatsApp credentials:', error?.message || 'Unknown error');
        console.error('[EMAIL] Error details:', error);
        // Don't throw error to avoid breaking flow
      }
    } else {
      console.log('[EMAIL] No phone number provided, skipping WhatsApp');
    }
    
    console.log('[EMAIL] ✅ sendCredentialsEmail completed successfully');
  } catch (error: any) {
    console.error('[EMAIL] ❌ sendCredentialsEmail failed:', error?.message || 'Unknown error');
    // Only throw error if email was enabled and failed
    // If email is disabled, we still want to proceed with WhatsApp
    if (EMAIL_ENABLED) {
    throw error;
    }
  }
};

// Send service confirmation email
export const sendServiceConfirmationEmail = async (
  to: string,
  name: string,
  serviceType: string,
  bookingId: string,
  phoneNumber?: string
): Promise<void> => {
  console.log('[EMAIL] ========== sendServiceConfirmationEmail called ==========');
  console.log('[EMAIL] Parameters:', {
    to: to || 'null',
    name: name || 'null',
    serviceType: serviceType || 'null',
    bookingId: bookingId || 'null',
    phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'not provided',
  });
  
  const mailOptions: nodemailer.SendMailOptions = {
    from: EMAIL_CONFIG.from,
    to,
    subject: `${serviceType} Service Request Confirmation`,
    html: EMAIL_TEMPLATES.serviceConfirmation(name, serviceType, bookingId),
  };
  
  console.log('[EMAIL] Email template generated');
  const htmlLength = typeof mailOptions.html === 'string' ? mailOptions.html.length : 0;
  console.log('[EMAIL] HTML length:', htmlLength);
  
  try {
    // Attempt to send email (will be skipped if EMAIL_ENABLED=false)
    await sendEmail(mailOptions);
    if (EMAIL_ENABLED) {
    console.log('[EMAIL] ✅ sendServiceConfirmationEmail email sent successfully');
    }
    
    // Send WhatsApp message if phone number is provided (always attempt, regardless of email status)
    if (phoneNumber) {
      console.log('[EMAIL] Attempting to send WhatsApp service confirmation...');
      try {
        const { sendServiceConfirmationWhatsApp } = await import('./whatsappService');
        await sendServiceConfirmationWhatsApp(phoneNumber, name, serviceType, bookingId);
        console.log('[EMAIL] ✅ WhatsApp service confirmation sent successfully');
      } catch (error: any) {
        console.error('[EMAIL] ❌ Failed to send WhatsApp service confirmation:', error?.message || 'Unknown error');
        console.error('[EMAIL] Error details:', error);
        // Don't throw error to avoid breaking flow
      }
    } else {
      console.log('[EMAIL] No phone number provided, skipping WhatsApp');
    }
    
    console.log('[EMAIL] ✅ sendServiceConfirmationEmail completed successfully');
  } catch (error: any) {
    console.error('[EMAIL] ❌ sendServiceConfirmationEmail failed:', error?.message || 'Unknown error');
    // Only throw error if email was enabled and failed
    // If email is disabled, we still want to proceed with WhatsApp
    if (EMAIL_ENABLED) {
    throw error;
    }
  }
};

export const sendMissingBrnEmail = async (
  to: string,
  agentName: string,
  voucherNo: string,
  arrivalDate: string
): Promise<void> => {
  console.log(`[EMAIL] Attempting to send Missing BRN email to ${to}`);
  const mailOptions: nodemailer.SendMailOptions = {
    from: EMAIL_CONFIG.from,
    to,
    subject: `Action Required: Missing Madinah BRN for ${voucherNo}`,
    html: EMAIL_TEMPLATES.missingBrnNotification(agentName, voucherNo, arrivalDate),
  };
  await sendEmail(mailOptions);
  console.log(`[EMAIL] Successfully sent Missing BRN email to ${to}`);
};

// Send bill email with PDF attachment
export const sendBillEmail = async (
  to: string,
  partyName: string,
  groupNumber: string,
  groupName: string,
  pdfBuffer: Buffer
): Promise<void> => {
  console.log('[EMAIL] ========== sendBillEmail called ==========');
  console.log('[EMAIL] Parameters:', {
    to: to || 'null',
    partyName: partyName || 'null',
    groupNumber: groupNumber || 'null',
    groupName: groupName || 'null',
    pdfBufferSize: pdfBuffer ? `${(pdfBuffer.length / 1024).toFixed(2)} KB` : 'null',
  });
  
  const mailOptions: nodemailer.SendMailOptions = {
    from: EMAIL_CONFIG.from,
    to,
    subject: `Bill for ${groupNumber}, ${groupName} generated`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bill Generated</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #E3000F 0%, #C7000A 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #ffffff; }
          .message { font-size: 16px; margin-bottom: 20px; color: #555; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bill Generated</h1>
          </div>
          <div class="content">
            <p class="message">
              Dear ${partyName},
            </p>
            <p class="message">
              The bill for Group ${groupNumber} (${groupName}) has been generated and is attached to this email.
            </p>
            <p class="message">
              Please find the bill PDF attached below.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated email from NuSync.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    attachments: [
      {
        filename: `Bill_${groupNumber}_${groupName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };
  
  console.log('[EMAIL] Email template generated with PDF attachment');
  const htmlLength = typeof mailOptions.html === 'string' ? mailOptions.html.length : 0;
  console.log('[EMAIL] HTML length:', htmlLength);
  console.log('[EMAIL] Attachment filename:', mailOptions.attachments?.[0]?.filename || 'N/A');
  
  try {
    // Attempt to send email (will be skipped if EMAIL_ENABLED=false)
    await sendEmail(mailOptions);
    if (EMAIL_ENABLED) {
    console.log('[EMAIL] ✅ sendBillEmail completed successfully');
    } else {
      console.log('[EMAIL] ✅ sendBillEmail skipped (email disabled)');
    }
  } catch (error: any) {
    console.error('[EMAIL] ❌ sendBillEmail failed:', error?.message || 'Unknown error');
    // Only throw error if email was enabled and failed
    if (EMAIL_ENABLED) {
    throw error;
    }
  }
};

// Export transporter for testing purposes
// Send movement update email
export const sendMovementUpdateEmail = async (
  to: string,
  partyName: string,
  voucherNumber: string,
  movementDetails: {
    date: string;
    time: string;
    fromLocation: string;
    toLocation: string;
    driverDetails1: string;
    driverDetails2: string;
    vehicleNumber: string;
  },
  partyWhatsApp?: string,
  guestMobile?: string
): Promise<void> => {
  const emailSubject = `Movement Update - Voucher ${voucherNumber}`;
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Movement Update - NuSync</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #E3000F;">Movement Details Updated</h2>
        <p>Dear ${partyName},</p>
        <p>Your movement details have been updated for voucher <strong>${voucherNumber}</strong>.</p>
        <h3 style="color: #E3000F; margin-top: 20px;">Movement Details:</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="margin: 10px 0;"><strong>Date:</strong> ${movementDetails.date}</li>
          <li style="margin: 10px 0;"><strong>Time:</strong> ${movementDetails.time || 'N/A'}</li>
          <li style="margin: 10px 0;"><strong>From:</strong> ${movementDetails.fromLocation || 'N/A'}</li>
          <li style="margin: 10px 0;"><strong>To:</strong> ${movementDetails.toLocation || 'N/A'}</li>
          <li style="margin: 10px 0;"><strong>Driver 1:</strong> ${movementDetails.driverDetails1 || 'N/A'}</li>
          <li style="margin: 10px 0;"><strong>Driver 2:</strong> ${movementDetails.driverDetails2 || 'N/A'}</li>
          <li style="margin: 10px 0;"><strong>Vehicle Number:</strong> ${movementDetails.vehicleNumber || 'N/A'}</li>
        </ul>
        <p style="margin-top: 20px;">Thank you for choosing our services.</p>
      </div>
    </body>
    </html>
  `;

  const mailOptions: nodemailer.SendMailOptions = {
    from: EMAIL_CONFIG.from,
    to,
    subject: emailSubject,
    html: emailHtml,
  };

  console.log('[EMAIL] ========== sendMovementUpdateEmail called ==========');
  console.log('[EMAIL] Parameters:', {
    to: to || 'null',
    partyName: partyName || 'null',
    voucherNumber: voucherNumber || 'null',
    partyWhatsApp: partyWhatsApp ? `${partyWhatsApp.substring(0, 3)}***${partyWhatsApp.substring(partyWhatsApp.length - 2)}` : 'not provided',
    guestMobile: guestMobile ? `${guestMobile.substring(0, 3)}***${guestMobile.substring(guestMobile.length - 2)}` : 'not provided',
    movementDetails: {
      date: movementDetails.date || 'null',
      time: movementDetails.time || 'null',
      fromLocation: movementDetails.fromLocation || 'null',
      toLocation: movementDetails.toLocation || 'null',
      driverDetails1: movementDetails.driverDetails1 || 'null',
      driverDetails2: movementDetails.driverDetails2 || 'null',
      vehicleNumber: movementDetails.vehicleNumber || 'null',
    },
  });
  console.log('[EMAIL] Email template generated');
  console.log('[EMAIL] HTML length:', emailHtml.length);

  try {
    // Attempt to send email (will be skipped if EMAIL_ENABLED=false)
    await sendEmail(mailOptions);
    if (EMAIL_ENABLED) {
      console.log('[EMAIL] ✅ sendMovementUpdateEmail email sent successfully');
    }
    
    // Send WhatsApp messages (always attempt, regardless of email status)
    const { sendMovementUpdateWhatsApp } = await import('./whatsappService');
    const phoneNumbers: Array<{ number: string; recipient: string }> = [];
    
    if (partyWhatsApp) {
      phoneNumbers.push({ number: partyWhatsApp, recipient: 'Party' });
    }
    if (guestMobile) {
      phoneNumbers.push({ number: guestMobile, recipient: 'Guest' });
    }
    
    if (phoneNumbers.length > 0) {
      console.log(`[EMAIL] Attempting to send WhatsApp movement update to ${phoneNumbers.length} recipient(s)...`);
      
      // Send to all phone numbers
      const whatsappPromises = phoneNumbers.map(async ({ number, recipient }) => {
        try {
          await sendMovementUpdateWhatsApp(number, partyName, voucherNumber, movementDetails);
          console.log(`[EMAIL] ✅ WhatsApp movement update sent successfully to ${recipient}`);
        } catch (error: any) {
          console.error(`[EMAIL] ❌ Failed to send WhatsApp movement update to ${recipient}:`, error?.message || 'Unknown error');
          console.error(`[EMAIL] Error details:`, error);
          // Don't throw error to avoid breaking flow
        }
      });
      
      await Promise.allSettled(whatsappPromises);
    } else {
      console.log('[EMAIL] No phone numbers provided, skipping WhatsApp');
    }
    
    console.log('[EMAIL] ✅ sendMovementUpdateEmail completed successfully');
  } catch (error: any) {
    console.error('[EMAIL] ❌ sendMovementUpdateEmail failed:', error?.message || 'Unknown error');
    // Only throw error if email was enabled and failed
    // If email is disabled, we still want to proceed with WhatsApp
    if (EMAIL_ENABLED) {
    throw error;
    }
  }
};

// Helper function to get file buffer from S3 or local filesystem
const getFileBuffer = async (filePath: string): Promise<{ buffer: Buffer; filename: string; contentType: string } | null> => {
  try {
    // Check if it's an S3 URL
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      if (!isS3Configured() || !s3Client) {
        console.log('[EMAIL] S3 not configured, cannot download file from URL');
        return null;
      }

      // Extract S3 key from URL
      const s3Key = extractS3KeyFromUrl(filePath);
      if (!s3Key) {
        console.log('[EMAIL] Could not extract S3 key from URL:', filePath);
        return null;
      }

      // Download file from S3
      const command = new GetObjectCommand({
        Bucket: S3_CONFIG.BUCKET_NAME,
        Key: s3Key,
      });

      const response = await s3Client.send(command);
      const chunks: Uint8Array[] = [];
      
      if (response.Body) {
        for await (const chunk of response.Body as any) {
          chunks.push(chunk);
        }
      }

      const buffer = Buffer.concat(chunks);
      const filename = path.basename(s3Key);
      const contentType = response.ContentType || 'image/jpeg';

      return { buffer, filename, contentType };
    } else {
      // Local file path
      if (!fs.existsSync(filePath)) {
        console.log('[EMAIL] Local file not found:', filePath);
        return null;
      }

      const buffer = fs.readFileSync(filePath);
      const filename = path.basename(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const contentTypeMap: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };
      const contentType = contentTypeMap[ext] || 'image/jpeg';

      return { buffer, filename, contentType };
    }
  } catch (error: any) {
    console.error('[EMAIL] Error reading file:', error?.message || 'Unknown error');
    return null;
  }
};

// Send iqama confirmation email with image attachment
export const sendIqamaConfirmationEmail = async (
  to: string | undefined,
  name: string,
  confirmationImagePath?: string,
  phoneNumber?: string
): Promise<void> => {
  console.log('[EMAIL] ========== sendIqamaConfirmationEmail called ==========');
  console.log('[EMAIL] Parameters:', {
    to: to || 'null',
    name: name || 'null',
    confirmationImagePath: confirmationImagePath ? 'provided' : 'not provided',
    phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'not provided',
  });

  // Prepare attachments
  const attachments: Array<{ filename: string; content: Buffer; contentType?: string }> = [];
  
  if (confirmationImagePath) {
    console.log('[EMAIL] Attempting to attach confirmation image...');
    const fileData = await getFileBuffer(confirmationImagePath);
    if (fileData) {
      attachments.push({
        filename: fileData.filename,
        content: fileData.buffer,
        contentType: fileData.contentType,
      });
      console.log('[EMAIL] ✅ Confirmation image attached:', fileData.filename);
    } else {
      console.log('[EMAIL] ⚠️ Could not attach confirmation image, continuing without attachment');
    }
  }

  // Send email only if valid email address is provided
  if (to && to !== 'no-email@placeholder.com' && to.includes('@')) {
    const mailOptions: nodemailer.SendMailOptions = {
      from: EMAIL_CONFIG.from,
      to,
      subject: 'Umrah Visa Confirmation - Action Required',
      html: EMAIL_TEMPLATES.iqamaConfirmation(name),
      attachments: attachments.length > 0 ? attachments as any : undefined,
    };

    console.log('[EMAIL] Email template generated');
    const htmlLength = typeof mailOptions.html === 'string' ? mailOptions.html.length : 0;
    console.log('[EMAIL] HTML length:', htmlLength);
    console.log('[EMAIL] Attachments:', attachments.length);

    try {
      // Attempt to send email (will be skipped if EMAIL_ENABLED=false)
      await sendEmail(mailOptions);
      if (EMAIL_ENABLED) {
        console.log('[EMAIL] ✅ sendIqamaConfirmationEmail email sent successfully');
      }
    } catch (error: any) {
      console.error('[EMAIL] ❌ sendIqamaConfirmationEmail failed:', error?.message || 'Unknown error');
      // Only throw error if email was enabled and failed
      // If email is disabled, we still want to proceed with WhatsApp
      if (EMAIL_ENABLED) {
        throw error;
      }
    }
  } else {
    console.log('[EMAIL] No valid email address provided, skipping email');
  }
  
  // Send WhatsApp message if phone number is provided (always attempt, regardless of email status)
  if (phoneNumber) {
    console.log('[EMAIL] Attempting to send WhatsApp iqama confirmation...');
    try {
      const { sendIqamaConfirmationWhatsApp } = await import('./whatsappService');
      await sendIqamaConfirmationWhatsApp(phoneNumber, name);
      console.log('[EMAIL] ✅ WhatsApp iqama confirmation sent successfully');
    } catch (error: any) {
      console.error('[EMAIL] ❌ Failed to send WhatsApp iqama confirmation:', error?.message || 'Unknown error');
      console.error('[EMAIL] Error details:', error);
      // Don't throw error to avoid breaking flow
    }
  } else {
    console.log('[EMAIL] No phone number provided, skipping WhatsApp');
  }
  
  console.log('[EMAIL] ✅ sendIqamaConfirmationEmail completed successfully');
};

// Send Thank You email to customer after landing page registration
export const sendLandingRegistrationThankYouEmail = async (
  to: string,
  name: string,
  password?: string
): Promise<void> => {
  const mailOptions: nodemailer.SendMailOptions = {
    from: EMAIL_CONFIG.from,
    to,
    subject: 'Welcome to NuSync — Your Agent Access is Ready',
    html: EMAIL_TEMPLATES.registrationThankYou(name, to, password),
  };

  try {
    await sendEmail(mailOptions);
  } catch (error: any) {
    console.error('[EMAIL] ❌ sendLandingRegistrationThankYouEmail failed:', error?.message);
    // Don't re-throw to avoid breaking the registration process if email fails
  }
};

// Send notification email to admin after new landing page registration
export const sendLandingRegistrationAdminNotificationEmail = async (
  details: any
): Promise<void> => {
  const mailOptions: nodemailer.SendMailOptions = {
    from: EMAIL_CONFIG.from,
    to: EMAIL_CONFIG.adminEmail,
    cc: "awadnajilp@gmail.com",
    subject: `New Gateway Access Request: ${details.party_name}`,
    html: EMAIL_TEMPLATES.registrationAdminNotification(details),
  };

  try {
    await sendEmail(mailOptions);
  } catch (error: any) {
    console.error('[EMAIL] ❌ sendLandingRegistrationAdminNotificationEmail failed:', error?.message);
  }
};


// Send Voucher Generated Email
export const sendVoucherGeneratedEmail = async (
  to: string,
  partyName: string,
  voucherNumber: string,
  pdfBuffer: Buffer
): Promise<void> => {
  const mailOptions: nodemailer.SendMailOptions = {
    from: EMAIL_CONFIG.from,
    to,
    subject: `Voucher Generated - Booking ${voucherNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3d167a;">Voucher Generated</h2>
        <p>Dear ${partyName},</p>
        <p>Your transport and accommodation voucher for booking <strong>${voucherNumber}</strong> has been successfully generated.</p>
        <p>Please find the PDF voucher attached to this email.</p>
        <br/>
        <p>Best regards,<br/><strong>NuSync</strong></p>
      </div>
    `,
    attachments: [
      {
        filename: `Voucher_${voucherNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  try {
    await sendEmail(mailOptions);
  } catch (error: any) {
    console.error('[EMAIL] ❌ sendVoucherGeneratedEmail failed:', error?.message);
    // Don't throw, just log so it doesn't break the flow
  }
};

// Send verification code email
export const sendVerificationEmail = async (
  to: string,
  code: string
): Promise<void> => {
  const mailOptions: nodemailer.SendMailOptions = {
    from: EMAIL_CONFIG.from,
    to,
    subject: 'Verification Code - NuSync Moulavi Travels',
    html: EMAIL_TEMPLATES.verificationCode(code),
  };

  try {
    await sendEmail(mailOptions);
  } catch (error: any) {
    console.error('[EMAIL] ❌ sendVerificationEmail failed:', error?.message);
    throw new Error('Failed to send verification email');
  }
};
