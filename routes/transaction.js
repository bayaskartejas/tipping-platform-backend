const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const crypto = require('crypto');

const prisma = new PrismaClient();

function generateUPIQRCode(upiId, amount, transactionId) {
  return `upi://pay?pa=${upiId}&pn=TipNex&am=${amount}&tr=${transactionId}&cu=INR`;
}

router.post('/upi-payment', authMiddleware, async (req, res) => {
  try {
    const { customerId, storeId, staffId, bill, tip } = req.body;
    const total = parseFloat(bill) + parseFloat(tip);

    // Generate a unique transaction ID
    const transactionId = uuidv4();

    // Create a pending transaction in the database
    const pendingTransaction = await prisma.transaction.create({
      data: {
        customerId: parseInt(customerId),
        storeId: parseInt(storeId),
        staffId: parseInt(staffId),
        bill: parseFloat(bill),
        tip: parseFloat(tip),
        total,
        orderId: transactionId,
        status: 'PENDING',
      },
    });

    // Fetch the store's UPI ID (assuming it's stored in the store model)
    const store = await prisma.store.findUnique({
      where: { id: parseInt(storeId) },
      select: { ownerUpi: true },
    });

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Generate UPI QR code
    const upiQRCode = generateUPIQRCode(store.ownerUpi, total.toFixed(2), transactionId);

    // Return UPI payment details
    res.status(200).json({
      transactionId,
      amount: total.toFixed(2),
      upiQRCode,
      upiOptions: [
        { name: 'Paytm', upiId: store.ownerUpi },
        { name: 'PhonePe', upiId: store.ownerUpi },
        { name: 'Google Pay', upiId: store.ownerUpi },
        { name: 'BHIM', upiId: store.ownerUpi },
      ],
    });

  } catch (error) {
    console.error('Error initiating UPI payment:', error);
    res.status(500).json({ error: 'Error initiating UPI payment' });
  }
});

// Endpoint to handle UPI payment status update
router.post('/upi-callback', async (req, res) => {
  try {
    const { transactionId, status, upiTransactionId } = req.body;

    // Verify the callback (implement proper security measures here)
    // This is a placeholder for actual verification logic
    const isValidCallback = true;

    if (!isValidCallback) {
      return res.status(400).json({ error: 'Invalid callback' });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { orderId: transactionId },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (status === 'SUCCESS') {
      // Update transaction status
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          status: 'COMPLETED',
          upiTransactionId: upiTransactionId
        },
      });

      // Update customer's total spent
      await prisma.customer.update({
        where: { id: transaction.customerId },
        data: { totalSpent: { increment: transaction.total } },
      });

      res.status(200).json({ message: 'Payment successful' });
    } else {
      // Update transaction status to failed
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' },
      });

      res.status(400).json({ error: 'Payment failed' });
    }
  } catch (error) {
    console.error('Error processing UPI callback:', error);   
    res.status(500).json({ error: 'Error processing UPI callback' });
  }
});

router.get('/history/customer', authMiddleware, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { customerId: req.user.id },
      include: { store: true, staff: true },
      orderBy: { time: 'desc' },
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching transaction history' });
  }
});

router.get('/history/store', authMiddleware, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { storeId: req.user.id },
      include: { customer: true, staff: true },
      orderBy: { time: 'desc' },
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching transaction history' });
  }
});

router.get('/history/staff', authMiddleware, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { staffId: req.user.id },
      include: { customer: true, store: true },
      orderBy: { time: 'desc' },
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching transaction history' });
  }
});

module.exports = router;