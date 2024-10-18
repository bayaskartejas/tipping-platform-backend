const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const otpGenerator = require('otp-generator');

const createTransporter = async () => {
  const oauth2Client = new OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  });

  const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        reject("Failed to create access token :(");
      }
      resolve(token);
    });
  });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.GMAIL_EMAIL,
      accessToken,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN
    }
  });

  return transporter;
};

const generateOTP = () => {
  return otpGenerator.generate(6, { digits: true, specialChars: false,lowerCaseAlphabets: false, upperCaseAlphabets: false });
};

const sendOTP = async (email, otp) => {
  try {
    const transporter = await createTransporter();
    const mailOptions = {
      from: process.env.GMAIL_EMAIL,
      to: email,
      subject: 'TipNex - Verify Your Email',
      text: `Your OTP for email verification is: ${otp}. This OTP will expire in 10 minutes.`,
      html: `<!DOCTYPE html>
              <html lang="en">
              <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>TipNex - Verify Your Email</title>
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; background-color: #f4f4f4; margin: 0; padding: 0;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                          <td style="padding: 20px 0; text-align: center; background-color: #229799;">
                              <img src="https://via.placeholder.com/200x50.png?text=TipNex+Logo" alt="TipNex Logo" style="max-width: 200px; height: auto;">
                          </td>
                      </tr>
                      <tr>
                          <td style="padding: 40px 20px; background-color: #ffffff;">
                              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                  <tr>
                                      <td style="padding-bottom: 20px; text-align: center;">
                                          <h1 style="color: #333333; font-size: 24px; margin: 0;">Verify Your Email</h1>
                                      </td>
                                  </tr>
                                  <tr>
                                      <td style="padding-bottom: 20px; text-align: center;">
                                          <p style="color: #666666; font-size: 16px; margin: 0;">Thank you for signing up with TipNex. To complete your registration, please use the following OTP:</p>
                                      </td>
                                  </tr>
                                  <tr>
                                      <td style="padding-bottom: 20px; text-align: center;">
                                          <div style="background-color: #f0f0f0; border-radius: 4px; padding: 15px; display: inline-block;">
                                              <span style="color: #229799; font-size: 32px; font-weight: bold; letter-spacing: 5px;">${otp}</span>
                                          </div>
                                      </td>
                                  </tr>
                                  <tr>
                                      <td style="padding-bottom: 20px; text-align: center;">
                                          <p style="color: #666666; font-size: 14px; margin: 0;">This OTP will expire in <strong>10 minutes</strong>.</p>
                                      </td>
                                  </tr>
                                  <tr>
                                      <td style="padding-top: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                                          <p style="color: #999999; font-size: 12px; margin: 0;">If you didn't request this email, please ignore it or contact our support team if you have any concerns.</p>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>
                      <tr>
                          <td style="padding: 20px; text-align: center; background-color: #229799; color: #ffffff;">
                              <p style="margin: 0; font-size: 14px;">&copy; 2024 TipNex. All rights reserved.</p>
                              <p style="margin: 5px 0 0; font-size: 12px;">
                                  <a href="#" style="color: #ffffff; text-decoration: none;">Privacy Policy</a> | 
                                  <a href="#" style="color: #ffffff; text-decoration: none;">Terms of Service</a>
                              </p>
                          </td>
                      </tr>
                  </table>
              </body>
              </html>`,
    };

    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send OTP email');
  }
};

module.exports = { generateOTP, sendOTP };