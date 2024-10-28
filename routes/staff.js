const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const { putObject, getObjectURL, deleteObject } = require('../utils/s3');
const { generateOTP, sendOTP } = require('../utils/email');
const router = express.Router();
const jwt = require("jsonwebtoken")
const bcrypt = require('bcrypt');
const saltRounds = 10;
const prisma = new PrismaClient();
const {staffSchema} = require("../schema")

let mime;
(async () => {
    mime = await import('mime');
})();

router.post('/register', async (req, res) => {
  try {
    await prisma.staff.deleteMany({where: {isVerified : false}})
    let { storeId, name, email, aadhaar, upi, dob, gender, number, password } = req.body;
    const result = staffSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message });
    }
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    number = number.toString()
    aadhaar = aadhaar.toString()
    password = hashedPassword
    const existingStaff = await prisma.staff.findUnique({ where: { email } });
    const existingStaff2 = await prisma.staff.findUnique({ where: { number } });
    const existingStaff3 = await prisma.staff.findUnique({ where: { aadhaar } });

    if (existingStaff) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    else if(existingStaff2){
      return res.status(400).json({ error: 'Mobile number already registered' });
    }
    else if(existingStaff3){
      return res.status(400).json({ error: 'Aadhaar number already registered' });
    }

    const store = await prisma.store.findUnique({ where: { storeId } });
    if (!store) {
      return res.status(400).json({ error: 'Invalid StoreId' });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); 

    const [staff] = await prisma.$transaction([
      prisma.staff.create({
        data: {
          storeId: storeId,
          name,
          email,
          aadhaar,
          upi,
          dob: new Date(dob),
          gender,
          number,
          otp,
          otpExpires,
          password
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
      where: { storeId: storeId },
      data: {
        staff: {
          connect: { email: email }
        }
      },
    })

    const token = jwt.sign({ id: staff.id, role: 'staff' }, process.env.JWT_SECRET);
    res.json({ message: 'Email verified successfully', token,  storeId: staff.storeId  });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Error verifying email' });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const staff = await prisma.staff.findUnique({
      where: { id: req.user.id },
      include: { store: false },
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
      where: { storeId },
      select: {
        id: true,
        name: true,
        photo: true,
        avgRating: true,
      },
    });
    res.json(helpers);
  } catch (error) {
    console.error('Error fetching helpers:', error);
    res.status(500).json({ error: 'Error fetching helpers' });
  }
});

router.post('/update-logo', authMiddleware, async (req, res) => {
  try {
    const { number, logoFile } = req.body;
    const staff = await prisma.staff.findUnique({ where: { number } });
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const logoKey = `staff-photos/photo-${number}.${mime.default.getExtension(logoFile.contentType)}`;
    const logoPutUrl = await putObject(`photo-${number}.${mime.default.getExtension(logoFile.contentType)}`, logoFile.contentType, "staff-photos");

    await prisma.staff.update({
      where: { number },
      data: { photo: logoKey }
    });

    res.status(200).json({ logoPutUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating logo image' });
  }
});

router.get('/image-urls/:id', async (req, res) => {
  try {
    let { id } = req.params;
    id = parseInt(id)
    const staff = await prisma.staff.findUnique({ where: { id } });
    
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const photoUrl = staff.photo ? await getObjectURL(staff.photo) : null;

    res.json({ photoUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error getting image URLs' });
  }
});

module.exports = router;