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

module.exports = router;