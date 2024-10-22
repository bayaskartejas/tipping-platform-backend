const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const { putObject, getObjectURL } = require('../utils/s3');
const authMiddleware = require('../middleware/auth');
const { generateOTP, sendOTP } = require('../utils/email');
const router = express.Router();
const {storeSchema} = require("../schema")
require('dotenv').config();
let mime;
(async () => {
    mime = await import('mime');
})();

const prisma = new PrismaClient();
const upload = multer();
let logoFileType;
let photoFileType
router.post('/register', async (req, res) => {
  try {
    let { name, address, ownerName, ownerDob, ownerGender, ownerPhone, ownerAadhaar, ownerUpi, email, password, logoFile, ownerPhotoFile } = req.body;
    let storeData = {
      name,
      address,
      ownerName,
      ownerDob,
      ownerGender,
      ownerPhone: parseInt(ownerPhone),
      ownerAadhaar: parseInt(ownerAadhaar),
      ownerUpi,
      email,
      password
    };
    
    const result = storeSchema.safeParse(storeData);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message });
    }
    
    ownerPhone = ownerPhone.toString();
    ownerAadhaar = ownerAadhaar.toString();
    
    await prisma.store.deleteMany({ where: { isVerified: false } });
    
    const existingStore = await prisma.store.findUnique({ where: { ownerPhone } });
    const existingStore2 = await prisma.store.findUnique({ where: { ownerAadhaar } });
    const existingStore3 = await prisma.store.findUnique({ where: { email } });
    
    if (existingStore) {
      return res.status(400).json({ error: 'Phone number already registered' });
    } else if (existingStore2) {
      return res.status(400).json({ error: 'Aadhaar number already registered' });
    } else if (existingStore3) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    let storeId;
    let isStoreIdUnique = false;
    while (!isStoreIdUnique) {
      storeId = Math.random().toString(36).substring(2, 10).toUpperCase();
      const existingStoreId = await prisma.store.findUnique({ where: { storeId } });
      if (!existingStoreId) {
        isStoreIdUnique = true;
      }
    }

    const logoKey = `store-logos/logo-${ownerPhone}.${mime.default.getExtension(logoFile.contentType)}`;
    const ownerPhotoKey = `owner-photos/photo-${ownerPhone}.${mime.default.getExtension(ownerPhotoFile.contentType)}`;

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    const isVerified = false;
    

    // Generate presigned URLs for image upload
    const logoPutUrl = logoFile ? await putObject(`logo-${ownerPhone}.${mime.default.getExtension(logoFile.contentType)}`, logoFile.contentType, "store-logos") : null;
    const ownerPhotoPutUrl = ownerPhotoFile ? await putObject(`photo-${ownerPhone}.${mime.default.getExtension(ownerPhotoFile.contentType)}`, ownerPhotoFile.contentType, "owner-photos") : null;
    logoFileType = mime.default.getExtension(logoFile.contentType);
    photoFileType = mime.default.getExtension(ownerPhotoFile.contentType);
    // Create the new store
    const store = await prisma.store.create({
      data: {
        name,
        address,
        logo: logoKey,
        ownerName,
        ownerDob: new Date(ownerDob),
        ownerGender,
        ownerPhone,
        ownerAadhaar,
        email,
        ownerPhoto: ownerPhotoKey,
        ownerUpi,
        otp,
        otpExpires,
        isVerified,
        storeId,
        password
      },
    });

    // Send OTP for email verification
    await sendOTP(email, otp);

    res.status(201).json({ 
      message: 'OTP sent to your email for verification',
      logoPutUrl,
      ownerPhotoPutUrl,
      storeId
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Error registering store' });
  }
});

// New endpoint to get signed URLs for viewing images
router.get('/image-urls/:storeId', async (req, res) => {
  try {
    let { storeId } = req.params;
    storeId = storeId.replace(":", "").trim();
    console.log(storeId);
    
    const store = await prisma.store.findUnique({ where: { storeId } });
    
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const logoUrl = store.logo ? await getObjectURL(store.logo) : null;
    const ownerPhotoUrl = store.ownerPhoto ? await getObjectURL(store.ownerPhoto) : null;

    res.json({ logoUrl, ownerPhotoUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error getting image URLs' });
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
      where: { storeId },
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