const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const { generateOTP, sendOTP } = require('../utils/email');
const router = express.Router();
const {customerSchema} = require("../schema");
const { hash } = require('crypto');
require('dotenv').config();
const { JWT_SECRET } = process.env;

const prisma = new PrismaClient();
router.post('/register/customer', async (req, res) => {
    try {
      await prisma.customer.deleteMany({where: {isVerified : false}})
      let { name, email, phone, password } = req.body;
      const result = customerSchema.safeParse(req.body)
      if (!result.success) {
        return res.status(400).json({ error: result.error.issues[0].message });
      }
      phone = phone.toString()
      const hashedPassword = await bcrypt.hash(password, saltRounds);
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
          isVerified: false,
          password: hashedPassword,
          customerPhoto: ""
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
      res.status(201).json({ message: 'Email verified successfully', token});
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
      
      res.json({ message: 'Email verified successfully', token, storeId: user.storeId, 
        user: {
          id: user.id,
          email: user.email,
          name: user.ownerName,
          role: 'store',
          storeId: user.storeId
        }
       });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({ error: 'Error verifying OTP' });
    }
  });

// Owner login endpoint
router.post('/login-store', async (req, res) => {
  try {
    const { email, password } = req.body;

    const owner = await prisma.store.findUnique({
      where: { email: email }
    });

    if (!owner) {
      return res.status(401).json({ error: 'Invalid email' });
    }

    const isPasswordValid = await bcrypt.compare(password, owner.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: owner.id, email: owner.email, role: 'owner' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: owner.id,
        email: owner.email,
        name: owner.ownerName,
        role: 'store',
        storeId: owner.storeId
      }
    });
  } catch (error) {
    console.error('Owner login error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

// Staff login endpoint
router.post('/login-staff', async (req, res) => {
  try {
    const { email, password } = req.body;

    const staff = await prisma.staff.findUnique({
      where: { email: email }
    });

    if (!staff) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, staff.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: staff.id, email: staff.email, role: 'staff' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: staff.id,
        email: staff.email,
        name: staff.name,
        role: 'staff',
        storeId: staff.storeId
      }
    });
  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

// Customer login endpoint
router.post('/login-customer', async (req, res) => {
  try {
    const { email, password } = req.body;

    const customer = await prisma.customer.findUnique({
      where: { email: email }
    });

    if (!customer) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, customer.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: customer.id, email: customer.email, role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        role: 'customer'
      }
    });
  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});
  



module.exports = router;