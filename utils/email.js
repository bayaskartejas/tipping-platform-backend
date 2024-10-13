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
      html: `<p>Your OTP for email verification is: <strong>${otp}</strong>. This OTP will expire in 10 minutes.</p>`,
    };

    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send OTP email');
  }
};

module.exports = { generateOTP, sendOTP };