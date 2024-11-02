const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
const { putObject, getObjectURL, deleteObject } = require('../utils/s3');

const prisma = new PrismaClient();
let mime;
(async () => {
    mime = await import('mime');
})();

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.user.userId },
      include: { coupons: true },
    });
    res.json(customer);
  } catch (error) {
    console.log(error);
    
    res.status(500).json({ error: 'Error fetching customer profile' });
  }
});

router.get('/coupons', authMiddleware, async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      where: { customerId: req.user.id },
    });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching coupons' });
  }
});

router.post('/update-profile-image', authMiddleware, async (req, res) => {
  try {
    const { phone, customerPhotoFile } = req.body;  
    const customer = await prisma.customer.findUnique({ where: { phone } });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customerPhotoKey = `customer-photos/photo-${phone}.${mime.default.getExtension(customerPhotoFile.contentType)}`;
    const customerPhotoPutUrl = await putObject(`photo-${phone}.${mime.default.getExtension(customerPhotoFile.contentType)}`, customerPhotoFile.contentType, "customer-photos");
    
    await prisma.customer.update({       
      where: { phone },
      data: { customerPhoto: customerPhotoKey }
    });

    res.status(200).json({ customerPhotoPutUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating customer photo' });
  }
});

router.get('/image-urls/:id', authMiddleware, async (req, res) => {
  try {
    let { id } = req.params;
    id = id.replace(":", "").trim();
    id = parseInt(id)
    
    const customer = await prisma.customer.findUnique({ where: { id } });
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const Url = customer.customerPhoto ? await getObjectURL(customer.customerPhoto) : null;

    res.json({ Url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error getting image URLs' });
  }
});

router.get('/get-coupon-info/:storeId', async (req, res) => {
  try {
    let { storeId } = req.params;
    storeId = storeId.replace(":", "").trim();
    const { phone } = req.query;

    // Find the store
    const store = await prisma.store.findUnique({
      where: { storeId },
      include: { coupons: true },
    });

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Find the customer
    const customer = await prisma.customer.findUnique({
      where: { phone },
      include: { coupons: true },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Filter coupons
    const eligibleCoupons = store.coupons.filter(coupon => {
      const customerCoupon = customer.coupons.find(c => c.couponId === coupon.id);
      return coupon.totalUses > 0 && (!customerCoupon || customerCoupon.usesPerCustomer > customerCoupon.timesCouponUsed);
    });

    res.json({ coupons: eligibleCoupons });
  } catch (error) {
    console.error('Error fetching coupon info:', error);
    res.status(500).json({ error: 'Error fetching coupon info' });
  }
});

// In your customer.js route file

router.post('/update-coupon/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { phone, couponId } = req.body;

    // Find the customer
    const customer = await prisma.customer.findUnique({
      where: { phone },
      include: { coupons: true },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Find the coupon
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // Find or create the CustomerCoupon record
    let customerCoupon = await prisma.customerCoupon.findUnique({
      where: {
        customerId_couponId: {
          customerId: customer.id,
          couponId: coupon.id,
        },
      },
    });

    if (!customerCoupon) {
      customerCoupon = await prisma.customerCoupon.create({
        data: {
          customerId: customer.id,
          couponId: coupon.id,
          timesCouponUsed: 0,
        },
      });
    }

    // Update the CustomerCoupon and Coupon in a transaction
    const updatedData = await prisma.$transaction([
      prisma.customerCoupon.update({
        where: { id: customerCoupon.id },
        data: { timesCouponUsed: { increment: 1 } },
      }),
      prisma.coupon.update({
        where: { id: couponId },
        data: { totalUses: { decrement: 1 } },
      }),
    ]);

    res.json({ message: 'Coupon usage updated successfully', data: updatedData });
  } catch (error) {
    console.error('Error updating coupon usage:', error);
    res.status(500).json({ error: 'Error updating coupon usage' });
  }
});


module.exports = router;