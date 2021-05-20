const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RecordSchema = new Schema({
  customer: {
    type: Schema.Types.ObjectId, default: null
  },
  office: {
    type: Schema.Types.ObjectId, default: null
  },
  service: {
    type: Schema.Types.ObjectId, default: null
  },
  master: {
    type: Schema.Types.ObjectId, default: null
  },
  date: {
    type: Date, default: null
  },
  time: {
    hours: {
      type: Number, default: 0, min: -1, max: 23
    },
    minutes: {
      type: Number, default: 0, min: 0, max: 59
    }
  },
  inDevelopment: {
    type: Boolean, default: true
  },
  isActual: {
    type: Boolean, default: true
  },
  notification: {
    date: {
      type: Date, default: null
    },
    time: {
      hours: {
        type: Number, default: 0, min: -1, max: 23
      },
      minutes: {
        type: Number, default: 0, min: 0, max: 59
      }
    },
    isActual: {
      type: Boolean, default: false
    }
  }
})

mongoose.model('Record', RecordSchema);