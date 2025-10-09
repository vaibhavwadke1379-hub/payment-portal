// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public')); // serve frontend from /public

// init Razorpay with env vars (set them locally in .env and in Render later)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// CHANGE THESE to your single allowed values
const validInstitute = "Institute of Technology";
const validRollno = "23bec202";

// Give the client the public key id (no secret here)
app.get('/config', (req, res) => {
  res.json({ key: process.env.RAZORPAY_KEY_ID || '' });
});

// create order only if institute + roll matches the single allowed combination
app.post('/create-order', async (req, res) => {
  const { rollno, institute } = req.body;
  if (!rollno || !institute) return res.status(400).json({ error: 'Missing fields' });

  if (
    institute.toLowerCase() !== validInstitute.toLowerCase() ||
    rollno.toLowerCase() !== validRollno.toLowerCase()
  ) {
    return res.status(400).json({ error: 'Invalid institute or roll number' });
  }

  try {
    // --- THIS IS THE UPDATED SECTION ---
    const options = {
      amount: 173400 * 100, // amount in paise (₹173,400)
      currency: "INR",
      receipt: "receipt#1"
    };
    // -----------------------------------
    
    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id, amount: options.amount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Order creation failed' });
  }
});

// verify payment signature (call after checkout handler)
app.post('/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment fields' });
  }

  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  if (generated_signature === razorpay_signature) {
    // payment is verified — you can save a record here (DB or file) if needed
    return res.json({ status: 'ok', message: 'Payment verified' });
  } else {
    return res.status(400).json({ status: 'error', message: 'Invalid signature' });
  }
});

const PORT = process.env.PORT || 3000;
// =================================================================
// START: FREE CRON JOB ENDPOINT
// =================================================================

// We create a secret URL path that only we know.
// UptimeRobot will visit this URL to trigger our code.
const CRON_JOB_SECRET_PATH = '/trigger-cron-j4k8s9p2q1';

app.get(CRON_JOB_SECRET_PATH, (req, res) => {
  // This message will appear in your Render logs every time the task runs.
  console.log(`Cron job triggered at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

  // --- ----------------------------------------------- ---
  // --- PUT THE CODE YOU WANT TO RUN ON A SCHEDULE HERE ---
  //
  //  For example:
  //  - Sending a daily report email
  //  - Cleaning up old data
  //  - Calling another API
  //
  // --- ----------------------------------------------- ---

  // Send a success response so UptimeRobot knows the site is "Up".
  res.status(200).send('Scheduled task executed successfully.');
});

// =================================================================
// END: FREE CRON JOB ENDPOINT
// =================================================================
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
