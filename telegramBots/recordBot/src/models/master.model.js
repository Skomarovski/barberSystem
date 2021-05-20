const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MasterSchema = new Schema({
  lastname: {
    type: String, required: true
  },
  firstname: {
    type: String, required: true
  },
  middlename: {
    type: String
  },
  photoUrl: {
    type: String, required: true
  },
  isAbsentToday: {
    type: Boolean, default: false
  },
  workingDays: {
    monday: {
      type: Boolean, default: true
    },
    tuesday: {
      type: Boolean, default: true  
    },
    wednesday: {
      type: Boolean, default: true
    },
    thursday: {
      type: Boolean, default: true
    },
    friday: {
      type: Boolean, default: true  
    },
    saturday: {
      type: Boolean, default: false
    },
    sunday: {
      type: Boolean, default: false
    }
  },
  daysSchedule: [{
    date: {
      type: Date, required: true
    },
    time: [{
      hours: {
        type: Number, required: true, min: -1, max: 23
      },
      minutes: {
        type: Number, default: 0, min: 0, max: 59
      }
    }],
    day: {
      type: String, required: true
    }
  }]
})

mongoose.model('Master', MasterSchema);