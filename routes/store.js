const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const { putObject, getObjectURL, deleteObject } = require('../utils/s3');
const authMiddleware = require('../middleware/auth');
const { generateOTP, sendOTP } = require('../utils/email');
const router = express.Router();
const {storeSchema} = require("../schema")
const bcrypt = require('bcrypt');
const saltRounds = 10;
require('dotenv').config();
let mime;
(async () => {
    mime = await import('mime');
})();

const prisma = new PrismaClient();

router.post('/register', async (req, res) => {
  try {
    let { name, address, ownerName, ownerDob, ownerGender, ownerPhone, ownerAadhaar, ownerUpi, email, password, logoFile, ownerPhotoFile } = req.body;
    await prisma.store.deleteMany({ where: { isVerified: false } });
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

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

    if(!logoFile){
      return res.status(400).json({ error: "Please select a logo" });
    }
    if(!ownerPhotoFile){
      return res.status(400).json({ error: "Please select an owner photo" });
    }
    
    const result = storeSchema.safeParse(storeData);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message });
    }

    storeData.password = hashedPassword
    ownerPhone = ownerPhone.toString();
    ownerAadhaar = ownerAadhaar.toString();
    
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
        cover: "",
        ownerUpi,
        otp,
        otpExpires,
        isVerified,
        storeId,
        password: hashedPassword // Use the hashed password
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

router.post('/update-cover', authMiddleware, async (req, res) => {
  try {
    const { storeId, cover } = req.body;
    const store = await prisma.store.findUnique({ where: { storeId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const coverKey = `store-covers/cover-${storeId}.${mime.default.getExtension(cover.contentType)}`;
    const coverPutUrl = await putObject(`cover-${storeId}.${mime.default.getExtension(cover.contentType)}`, cover.contentType, "store-covers");

    await prisma.store.update({
      where: { storeId },
      data: { cover: coverKey }
    });

    res.status(200).json({ coverPutUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating cover image' });
  }
});

// Endpoint for logo image upload/update
router.post('/update-logo', authMiddleware, async (req, res) => {
  try {
    const { storeId, logoFile } = req.body;
    const store = await prisma.store.findUnique({ where: { storeId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const logoKey = `store-logos/logo-${storeId}.${mime.default.getExtension(logoFile.contentType)}`;
    const logoPutUrl = await putObject(`logo-${storeId}.${mime.default.getExtension(logoFile.contentType)}`, logoFile.contentType, "store-logos");

    await prisma.store.update({
      where: { storeId },
      data: { logo: logoKey }
    });

    res.status(200).json({ Url: logoPutUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating logo image' });
  }
});

// Endpoint for owner photo upload/update
router.post('/update-ownerPhoto', authMiddleware, async (req, res) => {
  try {
    const { storeId, ownerPhotoFile } = req.body;
    const store = await prisma.store.findUnique({ where: { storeId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const ownerPhotoKey = `owner-photos/photo-${storeId}.${mime.default.getExtension(ownerPhotoFile.contentType)}`;
    const ownerPhotoPutUrl = await putObject(`photo-${storeId}.${mime.default.getExtension(ownerPhotoFile.contentType)}`, ownerPhotoFile.contentType, "owner-photos");

    await prisma.store.update({
      where: { storeId },
      data: { ownerPhoto: ownerPhotoKey }
    });

    res.status(200).json({ ownerPhotoPutUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating owner photo' });
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
    const coverUrl = store.cover ? await getObjectURL(store.cover) : null

    res.json({ logoUrl, ownerPhotoUrl, coverUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error getting image URLs' });
  }
});

router.get('/staff-image-urls/:storeId', async (req, res) => {
  try {
    let { storeId } = req.params;
    storeId = storeId.replace(":", "").trim();
    console.log('Fetching image URLs for store:', storeId);
    
    const store = await prisma.store.findUnique({
      where: { storeId },
      include: { staff: true }
    }); 
    
    if (!store) {
      console.log('Store not found:', storeId);
      return res.status(404).json({ error: 'Store not found' });
    }

    const staffPhotoUrls = {};
    for (const staffMember of store.staff) {
      if (staffMember.photo) {
        staffPhotoUrls[staffMember.id] = await getObjectURL(staffMember.photo);
      }
    }

    console.log('Successfully fetched image URLs for store:', storeId);
    res.json({ 
      staffPhotoUrls
    });
  } catch (error) {
    console.error('Error getting image URLs:', error);
    res.status(500).json({ error: 'Error getting image URLs' });
  }
});

router.get('/:storeId/coupons', authMiddleware, async (req, res) => {
  try {
    let { storeId } = req.params;
    storeId = parseInt(storeId)
    const coupons = await prisma.coupon.findMany({
      where: { id: storeId },
    });
    res.json(coupons);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ error: 'Error fetching coupons' });
  }
});

router.put('/:storeId/coupons/:couponId', authMiddleware, async (req, res) => {
  try {
    const { storeId, couponId } = req.params;
    const { title, code, description, expirationDate } = req.body;

    const updatedCoupon = await prisma.coupon.update({
      where: { id: parseInt(couponId), storeId },
      data: {
        title,
        code,
        description,
        expirationDate: new Date(expirationDate),
      },
    });

    res.json(updatedCoupon);
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ error: 'Error updating coupon' });
  }
});

router.delete('/:storeId/coupons/:couponId', authMiddleware, async (req, res) => {
  try {
    const { storeId, couponId } = req.params;

    await prisma.coupon.delete({
      where: { id: parseInt(couponId), storeId },
    });

    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ error: 'Error deleting coupon' });
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
      where: { id: req.user.id},
      include: { staff: true },
    });
    res.json(store);
  } catch (error) {
    console.log(error )
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