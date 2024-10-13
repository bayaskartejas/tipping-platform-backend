const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const { generateOTP, sendOTP } = require('../utils/email');
const router = express.Router();
const jwt = require("jsonwebtoken")
const prisma = new PrismaClient();

router.post('/register', async (req, res) => {
  try {
    const { storeId, name, email, aadhaar, upi, dob, gender, number } = req.body;
    
    // Check if staff with this email already exists
    const existingStaff = await prisma.staff.findUnique({ where: { email } });
    if (existingStaff) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Check if the store exists
    const store = await prisma.store.findUnique({ where: { storeId: parseInt(storeId) } });
    if (!store) {
      return res.status(400).json({ error: 'Invalid StoreId' });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

    // Create the staff member and update the store's staff array in a transaction
    const [staff] = await prisma.$transaction([
      prisma.staff.create({
        data: {
          storeId: parseInt(storeId),
          name,
          email,
          aadhaar,
          upi,
          dob: new Date(dob),
          gender,
          number,
          otp,
          otpExpires,
        },
      }),

    ]);

    await sendOTP(email, otp);

    res.status(201).json({ message: 'OTP sent to staff email for verification' });
  } catch (error) {
    console.error('Error registering staff:', error);
    res.status(500).json({ error: 'Error registering staff' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { email, otp, storeId } = req.body;
    const staff = await prisma.staff.findUnique({ where: { email } });

    if (!staff || staff.otp !== otp || staff.otpExpires < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await prisma.staff.update({
      where: { id: staff.id },
      data: { isVerified: true, otp: null, otpExpires: null },
    });
    await prisma.store.update({
      where: { storeId: parseInt(storeId) },
      data: {
        staff: {
          connect: { email: email }
        }
      },
    })

    const token = jwt.sign({ id: staff.id, role: 'staff' }, process.env.JWT_SECRET);
    res.json({ message: 'Email verified successfully', token });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Error verifying email' });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const staff = await prisma.staff.findUnique({
      where: { id: req.user.id },
      include: { store: true },
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching staff profile' });
  }
});

router.get('/store/:storeId', async (req, res) => {
  try {
    let { storeId } = req.params;
    storeId = storeId.replace(":", "").trim();
    const helpers = await prisma.staff.findMany({
      where: { storeId: parseInt(storeId) },
      select: {
        id: true,
        name: true,
        /*photo: true,*/
        avgRating: true,
      },
    });

    res.json(helpers);
  } catch (error) {
    console.error('Error fetching helpers:', error);
    res.status(500).json({ error: 'Error fetching helpers' });
  }
});
// Add more staff-related routes

module.exports = router;