require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// DEBUG: Log all incoming requests to find where they are getting stuck
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - [${req.method}] ${req.url}`);
  next();
});

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aureva', {
  serverSelectionTimeoutMS: 5000 // Timeout after 5 seconds instead of 30
})
  .then(async () => {
    console.log('MongoDB Connected to aureva database');
    
    // Ensure admin user exists
    try {
      const User = require('./models/User');
      const bcrypt = require('bcryptjs');
      const adminEmail = 'admin@aureva.com';
      const adminUser = await User.findOne({ email: adminEmail });
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      if (!adminUser) {
        await User.create({
          name: 'Admin User',
          email: adminEmail,
          password: hashedPassword,
          role: 'admin'
        });
        console.log('Default admin user created: admin@aureva.com / admin123');
      } else {
        // Update existing admin to ensure password and role are correct
        adminUser.role = 'admin';
        adminUser.password = hashedPassword;
        await adminUser.save();
        console.log('Admin user credentials updated: admin@aureva.com / admin123');
      }
    } catch (err) {
      console.error('Error ensuring admin user:', err.message);
    }
  })
  .catch(err => {
    console.error('CRITICAL: MongoDB connection error:', err.message);
    console.log('Check if mongod is running on port 27017');
  });

app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Rule-Based Dynamic Pricing Engine API is running 🚀'
  });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`Node/Express Auth server running on port ${PORT}`));
