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

  const subject = `Workshop Alert: Item Borrowed - ${itemName}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2563eb; margin: 0 0 10px 0;">🔧 Workshop Notification</h2>
        <p style="color: #6b7280; margin: 0;">An item has been borrowed from inventory</p>
      </div>
      
      <div style="background-color: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="color: #374151; margin: 0 0 15px 0;">Borrowing Details:</h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151; width: 120px;">Item:</td>
            <td style="padding: 8px 0; color: #6b7280;">${itemName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Borrowed by:</td>
            <td style="padding: 8px 0; color: #6b7280;">${borrowerName}</td>
          </tr>
          ${borrowerEmail ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Email:</td>
            <td style="padding: 8px 0; color: #6b7280;">${borrowerEmail}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Date:</td>
            <td style="padding: 8px 0; color: #6b7280;">${borrowDate}</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e;">
          <strong>Note:</strong> Please check the availability of the item and track its return.
        </p>
      </div>
      
      <div style="margin-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p>This message was sent automatically by the Workshop Inventory System.</p>
      </div>
    </div>
  `;

  const textContent = `
Workshop Notification - Item Borrowed

Item: ${itemName}
Borrowed by: ${borrowerName}
${borrowerEmail ? `Email: ${borrowerEmail}\n` : ''}Date: ${borrowDate}

Please check the availability of the item and track its return.

This message was sent automatically by the Workshop Inventory System.
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

  const subject = `Workshop Alert: Item Purchased - ${itemName}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #16a34a; margin: 0 0 10px 0;">💰 Workshop Sale</h2>
        <p style="color: #6b7280; margin: 0;">An item has been sold from inventory</p>
      </div>
      
      <div style="background-color: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="color: #374151; margin: 0 0 15px 0;">Sale Details:</h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151; width: 120px;">Item:</td>
            <td style="padding: 8px 0; color: #6b7280;">${itemName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Buyer:</td>
            <td style="padding: 8px 0; color: #6b7280;">${buyerName}</td>
          </tr>
          ${buyerEmail ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Email:</td>
            <td style="padding: 8px 0; color: #6b7280;">${buyerEmail}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Quantity:</td>
            <td style="padding: 8px 0; color: #6b7280;">${quantity}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Total Price:</td>
            <td style="padding: 8px 0; color: #16a34a; font-weight: bold;">€${totalPrice.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Date:</td>
            <td style="padding: 8px 0; color: #6b7280;">${purchaseDate}</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e;">
          <strong>Note:</strong> Please check the inventory and update availability if necessary.
        </p>
      </div>
      
      <div style="margin-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p>Diese Nachricht wurde automatisch vom Workshop-Inventarsystem gesendet.</p>
      </div>
    </div>
  `;

  const textContent = `
Workshop Notification - Item Sold

Item: ${itemName}
Buyer: ${buyerName}
${buyerEmail ? `Email: ${buyerEmail}\n` : ''}Quantity: ${quantity}
Total Price: €${totalPrice.toFixed(2)}
Date: ${purchaseDate}

Please check the inventory and update availability if necessary.

This message was sent automatically by the Workshop Inventory System.
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
  const subject = `Workshop Alert: New User Registration - ${username}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2563eb; margin: 0 0 10px 0;">👤 New User Registration</h2>
        <p style="color: #6b7280; margin: 0;">A new user has registered and is waiting for approval</p>
      </div>
      
      <div style="background-color: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="color: #374151; margin: 0 0 15px 0;">User Details:</h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151; width: 120px;">Username:</td>
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
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Email:</td>
            <td style="padding: 8px 0; color: #6b7280;">${email}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Registered on:</td>
            <td style="padding: 8px 0; color: #6b7280;">${registrationDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Status:</td>
            <td style="padding: 8px 0; color: #f59e0b; font-weight: bold;">Waiting for approval</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
        <p style="margin: 0; color: #991b1b;">
          <strong>Action required:</strong> Please log into the admin panel to review and activate the new user.
        </p>
      </div>
      
      <div style="margin-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p>This message was sent automatically by the Workshop Inventory System.</p>
      </div>
    </div>
  `;

  const textContent = `
Workshop Notification - New User Registration

Username: ${username}
${fullName ? `Name: ${fullName}\n` : ''}${email ? `Email: ${email}\n` : ''}Registered on: ${registrationDate}
Status: Waiting for approval

Action required: Please log into the admin panel to review and activate the new user.

This message was sent automatically by the Workshop Inventory System.
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