const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const s3 = require('../utils/s3');
const authMiddleware = require('../middleware/auth');
const { generateOTP, sendOTP } = require('../utils/email');
const router = express.Router();
const {storeSchema} = require("../schema")

const prisma = new PrismaClient();
const upload = multer();

router.post('/register', upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'ownerPhoto', maxCount: 1 }
]), async (req, res) => {
  try {
    let { name, address, ownerName, ownerDob, ownerGender, ownerPhone, ownerAadhaar, ownerUpi, email } = req.body;
    let storeData = {
      name,
      address,
      ownerName,
      ownerDob,
      ownerGender,
      ownerPhone: parseInt(ownerPhone),
      ownerAadhaar: parseInt(ownerAadhaar),
      ownerUpi,
      email
    }
    const result = storeSchema.safeParse(storeData)
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message });
    }
    ownerPhone = ownerPhone.toString()
    ownerAadhaar = ownerAadhaar.toString()

    await prisma.store.deleteMany({where: {isVerified : false}})
    const existingStore = await prisma.store.findUnique({ where: { ownerPhone } });
    const existingStore2 = await prisma.store.findUnique({ where: { ownerAadhaar } });
    const existingStore3 = await prisma.store.findUnique({ where: { email } });
    if (existingStore) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }
    else if(existingStore2){
      return res.status(400).json({ error: 'Aadhaar number already registered' });
    }
    else if(existingStore3){
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Upload logo and owner photo to S3
    // const logoKey = `store-logos/${Date.now()}-${req.files.logo[0].originalname}`;
    // const ownerPhotoKey = `owner-photos/${Date.now()}-${req.files.ownerPhoto[0].originalname}`;

    // await s3.upload({
    //   Bucket: process.env.S3_BUCKET_NAME,
    //   Key: logoKey,
    //   Body: req.files.logo[0].buffer,
    // }).promise();

    // await s3.upload({
    //   Bucket: process.env.S3_BUCKET_NAME,
    //   Key: ownerPhotoKey,
    //   Body: req.files.ownerPhoto[0].buffer,
    // }).promise();

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes
    const isVerified = false;
    const storeId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const store = await prisma.store.create({
      data: {
        name,
        address,
        logo: `${Math.random().toString()}`,/*`https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${logoKey}`,*/
        ownerName,
        ownerDob: new Date(ownerDob),
        ownerGender,
        ownerPhone,
        ownerAadhaar,
        email,
        ownerPhoto: `${Math.random().toString()}`,/*`https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${ownerPhotoKey}`,*/
        ownerUpi,
        otp,
        otpExpires,
        isVerified,
        storeId
      },
    });

    await sendOTP(email, otp);

    res.status(201).json({ message: 'OTP sent to your email for verification' });
  } catch (error) {
    console.log(error);
    
    res.status(500).json({ error: 'Error registering store' });
  }
});

// router.post('/verify', async (req, res) => {
//   try {
//     const { ownerPhone, otp } = req.body;
//     const store = await prisma.store.findUnique({ where: { ownerPhone } });

//     if (!store || store.otp !== otp || store.otpExpires < new Date()) {
//       return res.status(400).json({ error: 'Invalid or expired OTP' });
//     }

//     await prisma.store.update({
//       where: { id: store.id },
//       data: { isVerified: true, otp: null, otpExpires: null },
//     });

//     const token = jwt.sign({ id: store.id, role: 'store' }, process.env.JWT_SECRET);
//     res.json({ message: 'Email verified successfully', token });
//   } catch (error) {
//     res.status(500).json({ error: 'Error verifying email' });
//   }
// });

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const store = await prisma.store.findUnique({
      where: { id: req.user.id },
      include: { staff: true },
    });
    res.json(store);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching store profile' });
  }
});

router.get('/:storeId', async (req, res) => {
  try {
    let { storeId } = req.params;
    storeId = storeId.replace(":", "").trim();
    console.log("storeId", storeId);

    const store = await prisma.store.findUnique({
      where: { storeId: parseInt(storeId) },
      select: {
        name: true,
        email: true,
        ownerName: true,
        ownerPhone: true,
        ownerAadhaar: true,
        ownerUpi: true,
        staff: true, // Including staff relation
        transactions: true, // Including transactions relation
        coupons: true, // Including coupons relation
      },
    });

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    res.json(store);
  } catch (error) {
    console.error('Error fetching store:', error);
    res.status(500).json({ error: 'Error fetching store' });
  }
});


// Add more store-related routes

module.exports = router;