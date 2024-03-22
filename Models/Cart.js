const mongoose = require('mongoose');

const Cart = new mongoose.Schema({
    products: [],
    total: {
        type:Number
    }
})
module.exports= mongoose.model('Cart',Cart)