const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors')
const bcrypt = require('bcryptjs')
const axios = require('axios');
const app = express();
require('dotenv').config();


//Setting Up MiddleWares
app.use(express.json());
app.use(cors({
   origin: 'http://localhost:5173',
   credentials:true
}))
//Establishing Connnection To MongoDB
mongoose.connect('mongodb+srv://johnwambugu236:MPbBH2nE4FoebhLY@cluster0.a4bysmk.mongodb.net/').then(() => {
   console.log('Connected Successfully to MongoDB')
   app.listen(3770, () => console.log('Server Runing on port 3770'))
}).catch((e) => console.log(e));

const User = require('./Models/User');
app.post('/register', async (req, res) => {
   const {name,setPassword,email,phone } = req.body;
   try { 
      const existingUser = await User.findOne({ email });
      if (existingUser) {
         return res.json('User already exists')
      } else {
         const hashPassword = bcrypt.hashSync(setPassword, 10);
         const newUser = await User.create({
            name,
            email,
            phone,
             password: hashPassword
         })
         if (newUser) {
           res.json(newUser)
         } else {
            res.status(500).json('Failed to create a user')
         }
      }
   } catch (e) {
      res.json(e)
   }
})
app.post('/login', async (req, res) => {
   const { email, setPassword } = req.body;
   try {
      const findUser = await User.findOne({ email });
      if (!findUser) {
         return res.json('User doesnt Exist');
      } else {
           const checkPassword = bcrypt.compareSync(setPassword, findUser.password);
         if (checkPassword) {
               return res.json(findUser)
         } else {
            return res.json('Password do not Match')
            }
         }
      } catch (e) {
      return res.json(e)
    }
})
//Importing the Cart Model
const Cart = require('./Models/Cart')
app.post('/cart-data', async (req, res) => {
   const { total, products } = req.body;
   try {
      const productData = await Cart.create({
         products,
         total
      })
      if (productData) {
         return res.json(productData)
      } else {
         res.json('Failed to save to MongoDB')
      }
   } catch (error) {
     return res.json(error)
   }
})

//Setting Up Mpesa Functionality
const GenerateToken = async (req, res, next) => {
    const consumerKey = ' l9evY3M5U1rizFVLCAg4eG2xkruJMNDA8rLu3jzO2Yxh28NM';
    const consumerSecret = 'dTqp2YGKwQ2CrrA9AUF9HucCFRAtsrzFI4Z5NrHHJXMUWvVw3nAVGAXHMF8EQXGx'
    const auth = new Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")
    axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
        headers: {
            authorization:`Basic ${auth}`
        }
    }).then((res) => {
        console.log(res.data)
        token = res.data.access_token
        next();
    }).catch((err) => {
        console.log(err)
    })
}
app.get('/token', (req, res) => {
    GenerateToken();
})
app.post('/stk',GenerateToken, async (req, res) => {
   const { phone, amount } = req.body;
   console.log(phone,amount);
    const shortCode = 174379;
  const passkey ="bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
  const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

  const date = new Date();
  const timestamp =
    date.getFullYear() +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    ("0" + date.getDate()).slice(-2) +
    ("0" + date.getHours()).slice(-2) +
    ("0" + date.getMinutes()).slice(-2) +
    ("0" + date.getSeconds()).slice(-2);
  const password = new Buffer.from(shortCode + passkey + timestamp).toString(
    "base64"
  );
    const data = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: `254${phone}`,
    PartyB: 174379,
    PhoneNumber: `254${phone}`,
    CallBackURL: "https://major-nails-love.loca.lt/callback",
    AccountReference: "Mpesa Test",
    TransactionDesc: "Testing stk push",
  };

  await axios
    .post(url, data, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    .then((data) => {     
      res.status(200).json(data.data);
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json(err.message);
    });
})
//Saving Results from Mpesa Callback to MongoDB
const Payment = require('./Models/Mpesa')
app.post('/callback', async(req, res) => {
   const result = req.body;
   console.log(result)
   if (!result.Body.stkCallback.CallbackMetadata) {
      await Payment.create({
         number: "0",
         amount: "0",
         transaction_id: "0",
         message:result.Body.stkCallback.ResultDesc
         
      }).then((data) => {
         return res.json(data)
      }).catch((err)=>console.log(err))
   } else {
         const number = result.Body.stkCallback.CallbackMetadata.Item[4].value;
         const transaction_id = result.Body.stkCallback.CallbackMetadata.Item[3].value;
         const amount = result.Body.stkCallback.CallbackMetadata.Item[0].value;
         await Payment.create({
            number,
            transaction_id,
            amount,
            message: "Payment Successfull"
         }).then((data) => {
            return res.json(data)
         }).catch((err) => console.log(err))
      
   }
   console.log(result)
})
