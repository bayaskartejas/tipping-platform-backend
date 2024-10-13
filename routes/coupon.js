const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const prisma = new PrismaClient();

router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { storeId, discount, validity } = req.body;
    const store = await prisma.store.findUnique({ where: { id: parseInt(storeId) } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const code = Math.random().toString(36).substring(2, 9).toUpperCase();
    const coupon = await prisma.coupon.create({
      data: {
        customerId: req.user.id,
        storeId: parseInt(storeId),
        storeName: store.name,
        discount: parseFloat(discount),
        validity: new Date(validity),
        code,
      },
    });

    res.status(201).json(coupon);
  } catch (error) {
    res.status(500).json({ error: 'Error generating coupon' });
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