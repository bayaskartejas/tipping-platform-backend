const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const prisma = new PrismaClient();

// Store review
router.post('/store/:storeId', async (req, res) => {
  try {
    let { storeId } = req.params;
    storeId = storeId.replace(":", "").trim();
    const { phone, rating, title, content } = req.body;

    // Find user by phone or use "Unknown User"
    const user = phone ? await prisma.customer.findUnique({ where: { phone } }) : null;
    const userName = user ? user.name : 'Unknown User';

    // Create and save the store review
    const review = { user: userName, rating, title, content };

    // Update store's reviews array and calculate new average rating
    const updatedStore = await prisma.store.update({
      where: { storeId },
      data: {
        reviews: { push: review },
        avgRating: {
          set: await calculateAverageRating(storeId, "store") // Custom function to calculate average rating
        }
      }
    });

    res.status(201).json({ message: 'Store review submitted successfully', review: updatedStore });
  } catch (error) {
    console.error('Error submitting store review:', error);
    res.status(500).json({ error: 'Error submitting review' });
  }
});

// Staff review
router.post('/staff/:staffId', async (req, res) => {
  try {
    const { staffId } = req.params;
    const { phone, rating, title, content } = req.body;

    // Find user by phone or use "Unknown User"
    const user = phone ? await prisma.customer.findUnique({ where: { phone } }) : null;
    const userName = user ? user.name : 'Unknown User';

    // Create and save the staff review
    const review = { user: userName, rating, title, content };

    // Update staff's reviews array and calculate new average rating
    const updatedStaff = await prisma.staff.update({
      where: { id: parseInt(staffId) },
      data: {
        reviews: { push: review },
        avgRating: {
          set: await calculateAverageRating(staffId, "staff") // Custom function to calculate average rating
        }
      }
    });

    res.status(201).json({ message: 'Staff review submitted successfully', review: updatedStaff });
  } catch (error) {
    console.error('Error submitting staff review:', error);
    res.status(500).json({ error: 'Error submitting review' });
  }
});

// Platform review
router.post('/platform', async (req, res) => {
  try {
    const { phone, rating, title, content } = req.body;

    // Find user by phone or use "Unknown User"
    const user = phone ? await prisma.customer.findUnique({ where: { phone } }) : null;
    const userName = user ? user.name : 'Unknown User';

    // Create and save the platform review
    const platformReview = await prisma.platformReview.create({
      data: {
        name: userName,
        rating,
        title,
        text: content
      }
    });

    res.status(201).json({ message: 'Platform review submitted successfully', review: platformReview });
  } catch (error) {
    console.error('Error submitting platform review:', error);
    res.status(500).json({ error: 'Error submitting review' });
  }
});

// Helper function to calculate average rating
async function calculateAverageRating(entityId, entityType) {
  let entity;
  if(entityType == "store"){
    entity = await prisma.store.findUnique({
      where: { storeId: entityId },
      select: { reviews: true }
    });
  }
  else if(entityType == "staff"){
    entity = await prisma.staff.findUnique({
      where: { id: parseInt(entityId) },
      select: { reviews: true }
    });
  }
  const reviews = entity.reviews || [];
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  return reviews.length ? totalRating / reviews.length : 0;
}


module.exports = router;