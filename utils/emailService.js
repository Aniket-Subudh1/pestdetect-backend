const nodemailer = require('nodemailer');


const createTransporter = () => {
  return nodemailer.createTransport({ 
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS 
    }
  });
};

// Send email verification OTP
const sendVerificationEmail = async (email, name, otp) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Verify Your Email - PestDetect App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #00BFA5; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">PestDetect</h1>
            <p style="color: white; margin: 5px 0;">Plant Disease & Pest Detection</p>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2 style="color: #333;">Welcome ${name}!</h2>
            <p style="color: #666; font-size: 16px;">
              Thank you for registering with PestDetect. Please verify your email address using the OTP below:
            </p>
            
            <div style="background-color: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; border: 2px solid #00BFA5;">
              <h1 style="color: #00BFA5; font-size: 36px; margin: 0; letter-spacing: 5px;">${otp}</h1>
              <p style="color: #999; margin: 10px 0 0 0;">This OTP expires in 10 minutes</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              If you didn't create this account, please ignore this email.
            </p>
          </div>
          
          <div style="background-color: #333; padding: 20px; text-align: center;">
            <p style="color: #999; margin: 0; font-size: 12px;">
              © 2025 PestDetect. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✓ Verification email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('✗ Email sending failed:', error);
    throw error;
  }
};

// Send password reset OTP
const sendPasswordResetEmail = async (email, name, otp) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Password Reset - PestDetect App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #00BFA5; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">PestDetect</h1>
            <p style="color: white; margin: 5px 0;">Plant Disease & Pest Detection</p>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p style="color: #666; font-size: 16px;">
              Hi ${name}, we received a request to reset your password. Use the OTP below to reset your password:
            </p>
            
            <div style="background-color: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; border: 2px solid #FF5722;">
              <h1 style="color: #FF5722; font-size: 36px; margin: 0; letter-spacing: 5px;">${otp}</h1>
              <p style="color: #999; margin: 10px 0 0 0;">This OTP expires in 10 minutes</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              If you didn't request this password reset, please ignore this email.
            </p>
          </div>
          
          <div style="background-color: #333; padding: 20px; text-align: center;">
            <p style="color: #999; margin: 0; font-size: 12px;">
              © 2025 PestDetect. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✓ Password reset email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('✗ Password reset email failed:', error);
    throw error;
  }
};

// Test email connection
const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✓ Email connection successful');
    return true;
  } catch (error) {
    console.error('✗ Email connection failed:', error.message);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  testEmailConnection
};