const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BranchOfficeSchema = new Schema({
  adress: {
    type: String, required: true
  },
  coordinates: {
    type: [String], required: true
  },
  workTime: {
    weekdays: {
      hours: {
          type: Number, required: true, min: 0, max: 23
      },
      minutes: {
          type: Number, default: 0, min: 0, max: 59
      }
    },
    saturday: {
      hours: {
          type: Number, required: true, min: 0, max: 23
      },
      minutes: {
          type: Number, default: 0, min: 0, max: 59
      }
    },
    sunday: {
      hours: {
          type: Number, required: true, min: 0, max: 23
      },
      minutes: {
          type: Number, default: 0, min: 0, max: 59
      }
    },
  },
  isActive: {
    type: Boolean, default: true
  },
  masters: {
    type: [Schema.Types.ObjectId]
  }
})

mongoose.model('BranchOffice', BranchOfficeSchema);