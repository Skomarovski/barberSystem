const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ServiceSchema = new Schema({
  title: {
    type: String, required: true
  },
  masters: {
    type: [Schema.Types.ObjectId], default: []
  },
  offices: {
    type: [Schema.Types.ObjectId], default: []
  },
  price: {
    type: Number, required: true
  },
  duration: {
    hours: {
      type: Number, required: true, min: 0, max: 23
    },
    minutes: {
        type: Number, required: true, min: 0, max: 59
    }
  },
  bonusPercent: {
    type: Number, default: 0
  }
})

mongoose.model('Service', ServiceSchema);