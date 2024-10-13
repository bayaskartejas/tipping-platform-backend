const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const prisma = new PrismaClient();

router.post('/platform', async (req, res) => {
  try {
    const { name, title, text, rating } = req.body;
    const review = await prisma.platformReview.create({
      data: { name, title, text, rating: parseInt(rating) },
    });
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: 'Error adding platform review' });
  }
});

router.post('/store', authMiddleware, async (req, res) => {
  try {
    const { storeId, rating, comment } = req.body;
    const store = await prisma.store.findUnique({ where: { id: parseInt(storeId) } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const updatedStore = await prisma.store.update({
      where: { id: parseInt(storeId) },
      data: {
        reviews: {
          push: { id: Date.now(), name: req.user.name, rating: parseFloat(rating), comment },
        },
      },
    });

    res.status(201).json(updatedStore);
  } catch (error) {
    res.status(500).json({ error: 'Error adding store review' });
  }
});

router.post('/staff', authMiddleware, async (req, res) => {
  try {
    const { staffId, rating, comment } = req.body;
    const staff = await prisma.staff.findUnique({ where: { id: parseInt(staffId) } });
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const updatedStaff = await prisma.staff.update({
      where: { id: parseInt(staffId) },
      data: {
        reviews: {
          push: { id: Date.now(), 
            name: req.user.name, rating: parseFloat(rating), comment },
        },
        avgRating: {
          set: (staff.avgRating * staff.reviews.length + parseFloat(rating)) / (staff.reviews.length + 1),
        },
      },
    });

    res.status(201).json(updatedStaff);
  } catch (error) {
    res.status(500).json({ error: 'Error adding staff review' });
  }
});

module.exports = router;