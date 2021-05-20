const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerSchema = new Schema({
  name: {
    type: String, required: true
  },
  phone: {
    type: String, default: null
  },
  telegramId: {
    type: String, required: true
  },
  favoriteOffice: {
    type: Schema.Types.ObjectId, default: null
  },
  records: {
    type: [Schema.Types.ObjectId], default: []
  },
  bonuses: {
    type: Number, default: 0
  },
  invitedBy: {
    type: Schema.Types.ObjectId, default: null
  }
})

mongoose.model('Customer', CustomerSchema);