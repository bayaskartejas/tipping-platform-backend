const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateOTP, sendOTP } = require('../utils/email');
const router = express.Router();
const {customerSchema} = require("../schema")
require('dotenv').config();
const { JWT_SECRET } = process.env;

const prisma = new PrismaClient();
let abc =12
router.post('/register/customer', async (req, res) => {
    try {
      await prisma.customer.deleteMany({where: {isVerified : false}})
      let { name, email, phone } = req.body;
      const result = customerSchema.safeParse(req.body)
      if (!result.success) {
        return res.status(400).json({ error: result.error.issues[0].message });
      }
      phone = phone.toString()
      const existingCustomer = await prisma.customer.findUnique({ where: { email } });
      const existingCustomer2 = await prisma.customer.findUnique({ where: { phone } });
      if (existingCustomer) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      else if (existingCustomer2) {
        return res.status(400).json({ error: 'Mobile number already registered' });
      }  
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

      const customer = await prisma.customer.create({
        data: { 
          name, 
          email, 
          phone, 
          otp, 
          otpExpires, 
          isVerified: false
        },
      });
  
      await sendOTP(email, otp);
      res.status(201).json({ message: 'OTP sent to your email for verification' });
    } catch (error) {
      console.error('Error registering customer:', error);
      res.status(500).json({ error: 'Error registering customer' });
    }
  });

router.post('/verify/customer', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const customer = await prisma.customer.findUnique({ where: { email } });

    if (!customer || customer.otp !== otp ) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    else if(customer.otpExpires < new Date()){
      return res.status(400).json({ error: 'OTP is expired' });
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { isVerified: true, otp: null, otpExpires: null },
    });

    const token = jwt.sign({ id: customer.id, role: 'customer' }, process.env.JWT_SECRET);
    res.json({ message: 'Email verified successfully', token });
  } catch (error) {
    res.status(500).json({ error: 'Error verifying email' });
  }
});

router.post('/resend-otp', async (req, res) => {
    try {
      const { email, userType } = req.body;
      const validUserTypes = ['customer', 'store', 'staff'];
      if (!validUserTypes.includes(userType)) {
        return res.status(400).json({ error: 'Invalid user type' });
    }
    const userModel = prisma[userType];
    const user = await userModel.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes
  
      await userModel.update({
        where: { email },
        data: { otp, otpExpires },
      });
  
      await sendOTP(email, otp);
  
      res.json({ message: 'OTP resent successfully' });
    } catch (error) {
      console.error('Error resending OTP:', error);
      res.status(500).json({ error: 'Error resending OTP' });
    }
  });

  router.post('/verify-otp-customer', async (req, res) => {
    try {
      const { email, otp } = req.body;
      const user = await prisma.customer.findUnique({
        where: {
          email: email, // Use the email from the request body
        }
      });
  
      if (!user || user.otp !== otp || user.otpExpires < new Date()) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }
  
      await prisma.customer.update({
        where: { email: email },
        data: { isVerified: true, otp: null, otpExpires: null },
      });
  
      const token = jwt.sign({ id: user.id, role: 'customer' }, process.env.JWT_SECRET);
      res.json({ message: 'Email verified successfully', token });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({ error: 'Error verifying OTP' });
    }
  });
  router.post('/verify-otp-owner', async (req, res) => {
    try {
      const { email, otp } = req.body;
      const user = await prisma.store.findUnique({
        where: {
          email: email, // Use the email from the request body
        }
      });
  
      if (!user) {
        return res.status(400).json({ error: "User doesn't exist!" });
      }
      else if (user.otp !== otp){
        return res.status(400).json({ error: "Invalid OTP !" });
      }
      else if (user.otpExpires < new Date()){   
        return res.status(400).json({ error: "OTP Expired !" });
      }
  
      await prisma.store.update({
        where: { email: email },
        data: { isVerified: true, otp: null, otpExpires: null },
      });
  
      const token = jwt.sign({ id: user.id, role: 'store' }, JWT_SECRET);
      console.log(JWT_SECRET);
      
      res.json({ message: 'Email verified successfully', token });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({ error: 'Error verifying OTP' });
    }
  });

  



module.exports = router;