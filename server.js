const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Import routes
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customer');
const storeRoutes = require('./routes/store');
const staffRoutes = require('./routes/staff');
const reviewRoutes = require('./routes/review');
const transactionRoutes = require('./routes/transaction');
const couponRoutes = require('./routes/coupon');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/transaction', transactionRoutes);
app.use('/api/coupon', couponRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});