const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const prisma = new PrismaClient();

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.user.id },
      include: { coupons: true },
    });
    res.json(customer);
  } catch (error) {
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

module.exports = router;