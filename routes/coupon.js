const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
const { couponSchema } = require("../schema")
const prisma = new PrismaClient();

router.post('/create-coupon/:storeId', authMiddleware, async (req, res) => {
  try {
    let { storeId } = req.params;
    storeId = storeId.replace(":", "").trim();
    const validationResult = couponSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error.issues });
    }

    const store = await prisma.store.findUnique({ where: { storeId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const coupon = await prisma.coupon.create({
      data: {
        ...req.body,
        store: { connect: { id: store.id } },
        createdAt: new Date(),    
        updatedAt: new Date(),
      },
    });

    await prisma.store.update({
      where: { storeId },
      data: {
        coupons: {
          connect: { id: coupon.id },
        },
      },
    });

    res.status(201).json(coupon);
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ error: 'Error creating coupon' });
  }
});


router.get('/customer', authMiddleware, async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      where: { customerId: req.user.id },
      orderBy: { validity: 'asc' },
    });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching coupons' });
  }
});

router.get('/store', authMiddleware, async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      where: { storeId: req.user.id },
      include: { customer: true },
      orderBy: { validity: 'asc' },
    });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching coupons' });
  }
});

module.exports = router;