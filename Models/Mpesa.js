const mongoose = require('mongoose');

const Mpesa = new mongoose.Schema({
    number: {
        type: String,
    },
    transaction_id: {
        type:String        
    },
    amount:{
        type: String   
    },
    message:{
        type: String,
        required:false
    }
})
module.exports = mongoose.model('Payment',Mpesa)