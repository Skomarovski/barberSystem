module.exports = {
  logBotStarted() {
    console.log('Bot has been started...');
  },

  logMongoConnected() {
    console.log('MongoDB has been connected...');
  },

  getTextMessage(msg) {
    return msg.text;
  },

  getFirstName(msg) {
    return msg.from.first_name;
  },

  getChatId(msg) {
    return msg.chat.id;
  },

  getTelegramId(msg) {
    return msg.from.id;
  },

  getQueryId(query) {
    return query.from.id;
  },

  getFio(firstname, middlename, lastname) {
    return `${lastname} ${firstname} ${middlename}`;
  },

  stringifyDate(date) {
    return String(date.getDate()).length === 1 ? ['0' + String(date.getDate()), '0' + String(date.getMonth()+1)].join('.') :
                                                  [date.getDate(), '0' + String(date.getMonth()+1)].join('.');
  },
  
  stringifyTime(hours, minutes) {
    const hoursUpd = 10 - hours <= 0 ? String(hours) : '0' + String(hours);
    const minutesUpd = 10 - minutes <= 0 ? String(minutes) : '0' + String(minutes);
    return `${hoursUpd}:${minutesUpd}`;
  },

  getDayOfWeek(date) {
    const dayOfWeek = new Date(date).getDay();    
    return isNaN(dayOfWeek) ? null : 
      ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
  }
}