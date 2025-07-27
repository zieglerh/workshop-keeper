import nodemailer from 'nodemailer';
import type { User } from '@shared/schema';

// SMTP configuration for united-domains.de
const transporter = nodemailer.createTransport({
  host: 'smtps.udag.de',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'workshop@intertwinet.de',
    pass: 'mzn9yuz3brk9QZP!dfj'
  },
  tls: {
    // Do not fail on invalid certs
    rejectUnauthorized: false
  }
});

// Verify connection configuration
transporter.verify(function(error: any, success: any) {
  if (error) {
    console.log('Email configuration error:', error);
  } else {
    console.log('Email server ready to send messages');
  }
});

interface BorrowNotificationParams {
  itemName: string;
  borrowerName: string;
  borrowerEmail?: string;
  borrowDate: string;
  adminEmails: string[];
}

export async function sendBorrowNotification(params: BorrowNotificationParams): Promise<boolean> {
  const { itemName, borrowerName, borrowerEmail, borrowDate, adminEmails } = params;
  
  // Filter out empty email addresses
  const validAdminEmails = adminEmails.filter(email => email && email.trim() !== '');
  
  if (validAdminEmails.length === 0) {
    console.log('No valid admin email addresses found, skipping notification');
    return false;
  }

  const subject = `Workshop-Alert: Gegenstand ausgeliehen - ${itemName}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2563eb; margin: 0 0 10px 0;">🔧 Workshop Benachrichtigung</h2>
        <p style="color: #6b7280; margin: 0;">Ein Gegenstand wurde aus dem Inventar ausgeliehen</p>
      </div>
      
      <div style="background-color: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="color: #374151; margin: 0 0 15px 0;">Ausleih-Details:</h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151; width: 120px;">Gegenstand:</td>
            <td style="padding: 8px 0; color: #6b7280;">${itemName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Ausgeliehen von:</td>
            <td style="padding: 8px 0; color: #6b7280;">${borrowerName}</td>
          </tr>
          ${borrowerEmail ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">E-Mail:</td>
            <td style="padding: 8px 0; color: #6b7280;">${borrowerEmail}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Datum:</td>
            <td style="padding: 8px 0; color: #6b7280;">${borrowDate}</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e;">
          <strong>Hinweis:</strong> Bitte überprüfen Sie die Verfügbarkeit des Gegenstands und verfolgen Sie die Rückgabe.
        </p>
      </div>
      
      <div style="margin-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p>Diese Nachricht wurde automatisch vom Workshop-Inventarsystem gesendet.</p>
      </div>
    </div>
  `;

  const textContent = `
Workshop Benachrichtigung - Gegenstand ausgeliehen

Gegenstand: ${itemName}
Ausgeliehen von: ${borrowerName}
${borrowerEmail ? `E-Mail: ${borrowerEmail}\n` : ''}Datum: ${borrowDate}

Bitte überprüfen Sie die Verfügbarkeit des Gegenstands und verfolgen Sie die Rückgabe.

Diese Nachricht wurde automatisch vom Workshop-Inventarsystem gesendet.
  `;

  try {
    const info = await transporter.sendMail({
      from: '"Workshop System" <workshop@intertwinet.de>',
      to: validAdminEmails.join(', '),
      subject: subject,
      text: textContent,
      html: htmlContent,
    });

    console.log('Borrow notification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending borrow notification email:', error);
    return false;
  }
}

export async function testEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email connection test failed:', error);
    return false;
  }
}