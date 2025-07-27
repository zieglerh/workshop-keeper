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

interface PurchaseNotificationParams {
  itemName: string;
  buyerName: string;
  buyerEmail?: string;
  quantity: number;
  totalPrice: number;
  purchaseDate: string;
  adminEmails: string[];
}

export async function sendPurchaseNotification(params: PurchaseNotificationParams): Promise<boolean> {
  const { itemName, buyerName, buyerEmail, quantity, totalPrice, purchaseDate, adminEmails } = params;
  
  // Filter out empty email addresses
  const validAdminEmails = adminEmails.filter(email => email && email.trim() !== '');
  
  if (validAdminEmails.length === 0) {
    console.log('No valid admin email addresses found, skipping purchase notification');
    return false;
  }

  const subject = `Workshop-Alert: Artikel gekauft - ${itemName}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #16a34a; margin: 0 0 10px 0;">💰 Workshop Verkauf</h2>
        <p style="color: #6b7280; margin: 0;">Ein Artikel wurde aus dem Inventar verkauft</p>
      </div>
      
      <div style="background-color: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="color: #374151; margin: 0 0 15px 0;">Verkaufs-Details:</h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151; width: 120px;">Artikel:</td>
            <td style="padding: 8px 0; color: #6b7280;">${itemName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Käufer:</td>
            <td style="padding: 8px 0; color: #6b7280;">${buyerName}</td>
          </tr>
          ${buyerEmail ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">E-Mail:</td>
            <td style="padding: 8px 0; color: #6b7280;">${buyerEmail}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Menge:</td>
            <td style="padding: 8px 0; color: #6b7280;">${quantity}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Gesamtpreis:</td>
            <td style="padding: 8px 0; color: #16a34a; font-weight: bold;">€${totalPrice.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Datum:</td>
            <td style="padding: 8px 0; color: #6b7280;">${purchaseDate}</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e;">
          <strong>Hinweis:</strong> Bitte überprüfen Sie den Lagerbestand und aktualisieren Sie bei Bedarf die Verfügbarkeit.
        </p>
      </div>
      
      <div style="margin-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p>Diese Nachricht wurde automatisch vom Workshop-Inventarsystem gesendet.</p>
      </div>
    </div>
  `;

  const textContent = `
Workshop Benachrichtigung - Artikel verkauft

Artikel: ${itemName}
Käufer: ${buyerName}
${buyerEmail ? `E-Mail: ${buyerEmail}\n` : ''}Menge: ${quantity}
Gesamtpreis: €${totalPrice.toFixed(2)}
Datum: ${purchaseDate}

Bitte überprüfen Sie den Lagerbestand und aktualisieren Sie bei Bedarf die Verfügbarkeit.

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

    console.log('Purchase notification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending purchase notification email:', error);
    return false;
  }
}

interface UserRegistrationNotificationParams {
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  registrationDate: string;
  adminEmails: string[];
}

export async function sendUserRegistrationNotification(params: UserRegistrationNotificationParams): Promise<boolean> {
  const { username, firstName, lastName, email, registrationDate, adminEmails } = params;
  
  // Filter out empty email addresses
  const validAdminEmails = adminEmails.filter(email => email && email.trim() !== '');
  
  if (validAdminEmails.length === 0) {
    console.log('No valid admin email addresses found, skipping registration notification');
    return false;
  }

  const fullName = firstName && lastName ? `${firstName} ${lastName}` : '';
  const subject = `Workshop-Alert: Neue Benutzerregistrierung - ${username}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2563eb; margin: 0 0 10px 0;">👤 Neue Benutzerregistrierung</h2>
        <p style="color: #6b7280; margin: 0;">Ein neuer Benutzer hat sich registriert und wartet auf Freischaltung</p>
      </div>
      
      <div style="background-color: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="color: #374151; margin: 0 0 15px 0;">Benutzer-Details:</h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151; width: 120px;">Benutzername:</td>
            <td style="padding: 8px 0; color: #6b7280;">${username}</td>
          </tr>
          ${fullName ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Name:</td>
            <td style="padding: 8px 0; color: #6b7280;">${fullName}</td>
          </tr>
          ` : ''}
          ${email ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">E-Mail:</td>
            <td style="padding: 8px 0; color: #6b7280;">${email}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Registriert am:</td>
            <td style="padding: 8px 0; color: #6b7280;">${registrationDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Status:</td>
            <td style="padding: 8px 0; color: #f59e0b; font-weight: bold;">Wartet auf Freischaltung</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
        <p style="margin: 0; color: #991b1b;">
          <strong>Aktion erforderlich:</strong> Bitte loggen Sie sich in das Admin-Panel ein, um den neuen Benutzer zu überprüfen und freizuschalten.
        </p>
      </div>
      
      <div style="margin-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p>Diese Nachricht wurde automatisch vom Workshop-Inventarsystem gesendet.</p>
      </div>
    </div>
  `;

  const textContent = `
Workshop Benachrichtigung - Neue Benutzerregistrierung

Benutzername: ${username}
${fullName ? `Name: ${fullName}\n` : ''}${email ? `E-Mail: ${email}\n` : ''}Registriert am: ${registrationDate}
Status: Wartet auf Freischaltung

Aktion erforderlich: Bitte loggen Sie sich in das Admin-Panel ein, um den neuen Benutzer zu überprüfen und freizuschalten.

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

    console.log('User registration notification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending user registration notification email:', error);
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