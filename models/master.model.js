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
    Monday: {
      type: Boolean, default: true
    },
    Tuesday: {
      type: Boolean, default: true  
    },
    Wednesday: {
      type: Boolean, default: true
    },
    Thursday: {
      type: Boolean, default: true
    },
    Friday: {
      type: Boolean, default: true  
    },
    Saturday: {
      type: Boolean, default: false
    },
    Sunday: {
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
      },
      busy: {
        type: Boolean, default: false
      }
    }],
    day: {
      type: String, required: true
    }
  }]
})

mongoose.model('Master', MasterSchema);