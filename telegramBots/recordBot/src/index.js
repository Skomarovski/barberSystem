const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const fs = require('fs');
const config = require('./config');
const helper = require('./helper');
const navigation = require('./navigation');
const keyboard = require('./keyboards');
const { getQueryId } = require('./helper');

const DELIMITER = '-----------------------------------------------------------------------';
const MESSAGE = {
  ONLINE_RECORD: 'Здесь можно записаться или отменить существующую запись',
  SELECT_OFFICE: 'Выберите удобный для вас салон',
  GO_TO_MAIN_PAGE: 'Главное меню',
  SERVICES: services => {
    return '<b>Выберите услугу:</b>\n' + services.map((s, i) => {
      return `<b>${i+1}.</b> ${s.title} - ${s.price} руб.`
    }).join('\n')
  },
  SELECT_DATE: 'Выберите дату.',
  SELECT_TIME: 'Выберите время.',
  SELECT_NOTIFICATION: 'Когда вам удобнее напомнить о записи?',
  RECORD_INFORMATION: (adress, date, time, master, service, price, bonus) => {
    return `Ваша заявка принята!\n\nМы ожидаем вас:\nАдрес: ${adress},\n` +
            `Дата: ${date},\nВремя: ${time},\nМастер: ${master},\nУслуга: ${service},\n\n` +
            `Стоимость услуги: ${price} руб.,\nПри оплате вам начислится ${bonus} бонусных рублей.`;
  }
}
const TEXT_BTN = {
  SELECT_OFFICE: 'Выбрать этот филиал',
  SELECT_MASTER: master => {
    return `Выбрать мастера ${master.firstname}`;
  },
}
const ACTION_TYPE = {
  CHOUSE_OFFICE: 'cho',
  CHOUSE_SERVICE: 'chs',
  CHOUSE_MASTER: 'chm',
  CHOUSE_DATE: 'chd',
  CHOUSE_TIME: 'cht',
  CHOUSE_NOTIFICATION: 'chn',
  PASS: 'p'
}
const NOTIFICATION = [
  {TEXT: 'За 1 час до записи', VALUE: {HOURS: 1, MINUTES: 0}},
  {TEXT: 'За 2 час до записи', VALUE: {HOURS: 2, MINUTES: 0}},
  {TEXT: 'Не напоминать', VALUE: {HOURS: -1}}
]

// Модели базы данных
require('./models/branchOffice.model');
require('./models/customer.model');
require('./models/master.model');
require('./models/record.model');
require('./models/service.model');

const BranchOffice = mongoose.model('BranchOffice');
const Customer = mongoose.model('Customer');
const Master = mongoose.model('Master');
const Record = mongoose.model('Record');
const Service = mongoose.model('Service');

// Логирование запуска бота
helper.logBotStarted();

// Инициализация базы данных
mongoose.connect(config.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => helper.logMongoConnected())
  .catch(err => console.error(err));

// Создание экземпляра бота
const bot = new TelegramBot(config.TOKEN, {
  polling: true
});

// Обработка команды /start
bot.onText(/\/start/, msg => {
  const firstName = helper.getFirstName(msg);
  const chatId = helper.getChatId(msg);
  sayHi(chatId, firstName);
})

// Обработка входящих от пользователя сообщений
bot.on('message', msg => {
  const chatId = helper.getChatId(msg);
  const telegramId = helper.getTelegramId(msg);
  const recievedText = helper.getTextMessage(msg);
  let sendText = '';

  // Обработка нажатия кнопок клавиатуры
  switch (recievedText) {
    // Переход на экран онлайн-записи

    // HOME PAGE -------------------------------------------------------------
    
    case navigation.homePage.onlineRecordBtn:
      sendText = MESSAGE.ONLINE_RECORD;
      bot.sendMessage(chatId, sendText, {
        reply_markup: {
          keyboard: keyboard.onlineRecordKeyboard
        }
      });
      break;

    case navigation.homePage.priceListBtn:
      break;
    
    case navigation.homePage.bonusesBtn:
      break;
    
    case navigation.homePage.referralProgramBtn:
      break;
    
    // ONLINE RECORD PAGE -------------------------------------------------------------

    // Начало онлайн-записи
    case navigation.onlineRecordPage.recordBtn:
      // Скрыть клавиатуру
      // bot.sendMessage(chatId, sendText, {
      //   reply_markup: {
      //     remove_keyboard: true
      //   }
      // })

      // Создание заявки
      Customer.findOne({telegramId: chatId}).then(customer => {
        Record.find({inDevelopment: true, customer: customer._id}).then(records => {
          if (records.length !== 0) {
            for (let i = 0; i < records.length; i++) {
              records[i].inDevelopment = false;
              records[i].isActual = false;
              records[i].save();
            }
          }

          new Record({
            customer: customer._id
          }).save()
        })
      })

      sendText = MESSAGE.SELECT_OFFICE;

      BranchOffice.find({}).then(offices =>  {
        let coordinates = [];

        for (let i = 0, p = Promise.resolve(); i < offices.length; i++) {
          p = p.then(_ => new Promise(resolve => {
            coordinates = offices[i].coordinates;
            if (i > 0) {
              sendText = `${DELIMITER}\n⬇️ ${offices[i].adress}`;
            } else {
              sendText = `⬇️ ${offices[i].adress}`;
            }
            bot.sendMessage(chatId, sendText)
              .then(_ => {
                bot.sendLocation(chatId, coordinates[0], coordinates[1], {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: TEXT_BTN.SELECT_OFFICE,
                          callback_data: JSON.stringify({
                            type: ACTION_TYPE.CHOUSE_OFFICE,
                            officeId: offices[i]._id
                          })
                        }
                      ]
                    ]
                  }
                })
              });

            setTimeout(function () {
                resolve();
            }, 500) 
          }));
        }
      });
      break;

    case navigation.onlineRecordPage.cancelBtn:
      break;

    // BACK -------------------------------------------------------------
    case navigation.backBtn:
      sendText = MESSAGE.GO_TO_MAIN_PAGE;
      bot.sendMessage(chatId, sendText, {
        reply_markup: {
          keyboard: keyboard.homeKeyboard
        }
      });
      break;
  }
})

// Обработка нажатия инлайн-кнопок
bot.on('callback_query', query => {
  const queryId = getQueryId(query);
  let data = '';

  try {
    data = JSON.parse(query.data);
  } catch (err) {
    throw new Error('Data is not an object');
  }

  const { type } = data;

  switch (type) {
    // Обработка нажатия кнопки выбора филиала
    case ACTION_TYPE.CHOUSE_OFFICE:
      // Запись филиала в заявку и клиента
      Customer.findOne({telegramId: queryId}).then(customer => {
        customer.favoriteOffice = data.officeId;
        customer.save();
        Record.findOne({inDevelopment: true, customer: customer._id}).then(record => {
          record.office = data.officeId;
          record.save();
        })
      });

      Service.find({}).then(services => {
        const sendHTML = MESSAGE.SERVICES(services);

        let inlineKeyboard = [];
        for (let i = 0; i < services.length; i++) {
          inlineKeyboard.push([{
            text: services[i].title,
            callback_data: JSON.stringify({
              type: ACTION_TYPE.CHOUSE_SERVICE,
              serviceId: services[i]._id
            })
          }])
        }

        bot.sendMessage(queryId, sendHTML, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: inlineKeyboard
          }
        })
      });
      break;
    
    // Обратока нажатия кнопки выбора услуги
    case ACTION_TYPE.CHOUSE_SERVICE:
      // Запись услуги в заявку
      Customer.findOne({telegramId: queryId}).then(customer => {
        Record.findOne({inDevelopment: true, customer: customer._id}).then(record => {
          record.service = data.serviceId;
          record.save();
        })
      })

      Master.find({}).then(masters => {
        let photo;

        for (let i = 0, p = Promise.resolve(); i < masters.length; i++) {
          
          p = p.then(_ => new Promise(resolve => {
            photo = fs.readFileSync(__dirname.split('\\').slice(0, -3).join('\\') + `\\images\\${masters[i].photoUrl}`);
            if (i > 0) {
              sendText = `${DELIMITER}\n⬇️ ${helper.getFio(masters[i].firstname, masters[i].middlename, masters[i].lastname)}`;
            } else {
              sendText = `⬇️ ${helper.getFio(masters[i].firstname, masters[i].middlename, masters[i].lastname)}`;
            }
            bot.sendMessage(queryId, sendText)
              .then(_ => {
                bot.sendPhoto(queryId, photo, {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: TEXT_BTN.SELECT_MASTER(masters[i]),
                          callback_data: JSON.stringify({
                            type: ACTION_TYPE.CHOUSE_MASTER,
                            masterId: masters[i]._id
                          })
                        }
                      ]
                    ]
                  }
                })
              });

            setTimeout(function () {
                resolve();
            }, 1500) 
          }));
        }
      });
      break;

    // Обработка нажатия кнопки выбора мастера
    case ACTION_TYPE.CHOUSE_MASTER:
      // Запись мастера в заявку
      Customer.findOne({telegramId: queryId}).then(customer => {
        Record.findOne({inDevelopment: true, customer: customer._id}).then(record => {
          record.master = data.masterId;
          record.save();
        })
      })

      Master.find({_id: data.masterId}).then(masters => {
        const master = masters[0];
        const daysSchedule = master.daysSchedule;
        let day;
        let date;
        let inlineKeyboard = [];
        let btnText = '';
        let btnType = '';
        const row = 3;
        let nowRow = 0;

        for (let i = 0; i < daysSchedule.length; i++) {
          canRecord = false;
          for (let j = 0; j < daysSchedule[i].time.length; j++) {
            if (daysSchedule[i].time[j].hours !== -1) {
              canRecord = true;
              break;
            }
          }
          if (canRecord) {
            day = daysSchedule[i].day;
            date = helper.stringifyDate(daysSchedule[i].date);
            btnText = `${date} (${day})`;
            btnType = ACTION_TYPE.CHOUSE_DATE;
          } else {
            btnText = '–';
            btnType = ACTION_TYPE.PASS;
          }
          
          if (nowRow === 0) {
            inlineKeyboard.push([]);
          }

          inlineKeyboard[inlineKeyboard.length-1].push({
            text: btnText,
            callback_data: JSON.stringify({
              type: btnType,
              day: daysSchedule[i]._id
            })
          })

          if (++nowRow === row) {
            nowRow = 0;
          }
        };

        sendText = MESSAGE.SELECT_DATE;

        bot.sendMessage(queryId, sendText, {
          reply_markup: {
            inline_keyboard: inlineKeyboard
          }
        })
      });
      break;

    // Обработка нажатия кнопки даты
    case ACTION_TYPE.CHOUSE_DATE:
      Customer.findOne({telegramId: queryId}).then(customer => {
        Record.findOne({inDevelopment: true, customer: customer._id}).then(record => {
          Master.findOne({_id: record.master}).then(master => {
            master.daysSchedule.forEach(day => {
              if (String(day._id) === String(data.day)) {
                let timeCell = '';
                let hoursCell = '';
                let minutesCell = '';
                let btnType = '';
                let inlineKeyboard = [];
                const row = 3;
                let nowRow = 0;

                // Запись даты в заявку
                Record.findOne({inDevelopment: true, customer: customer._id}).then(record => {
                  record.date = day.date;
                  record.save();
                })

                day.time.forEach(t => {
                  
                  if (t.hours === -1) {
                    timeCell = '–';
                    btnType = ACTION_TYPE.PASS;
                  } else {
                    timeCell = helper.stringifyTime(t.hours, t.minutes);
                    btnType = ACTION_TYPE.CHOUSE_TIME;
                  }

                  if (nowRow === 0) {
                    inlineKeyboard.push([]);
                  }
        
                  inlineKeyboard[inlineKeyboard.length-1].push({
                    text: timeCell,
                    callback_data: JSON.stringify({
                      type: btnType,
                      dayAndTime: [data.day, t.hours].join('/')
                    })
                  })
        
                  if (++nowRow === row) {
                    nowRow = 0;
                  }
                })

                sendText = MESSAGE.SELECT_TIME;

                bot.sendMessage(queryId, sendText, {
                  reply_markup: {
                    inline_keyboard: inlineKeyboard
                  }
                })
              }
            })
          })
        })
      })

      break;

    // Обработка нажатия кнопки времени
    case ACTION_TYPE.CHOUSE_TIME:
      const dayId = data.dayAndTime.split('/')[0];
      const hours = data.dayAndTime.split('/')[1];
      let inlineKeyboard = [];
      
      Customer.findOne({telegramId: queryId}).then(customer => {
        Record.findOne({inDevelopment: true, customer: customer._id}).then(record => {
          Master.findOne({_id: record.master}).then(master => {
            master.daysSchedule.forEach(day => {
              if (String(day._id) === String(dayId)) {
                day.time.forEach(t => {
                  if (String(t.hours) === String(hours)) {
                    // Внесение времени записи в заявку
                    record.time.hours = t.hours;
                    record.time.minutes = t.minutes;
                    record.save();

                    // Внесение изменений в расписании мастера
                    t.hours = -1;
                    master.save();

                    sendText = MESSAGE.SELECT_NOTIFICATION;

                    NOTIFICATION.forEach(option => {
                      inlineKeyboard.push([{
                        text: option.TEXT,
                        callback_data: JSON.stringify({
                          type: ACTION_TYPE.CHOUSE_NOTIFICATION,
                          notificationTime: [option.VALUE.HOURS, option.VALUE.MINUTES].join('/')
                        })
                      }])
                    });

                    bot.sendMessage(queryId, sendText, {
                      reply_markup: {
                        inline_keyboard: inlineKeyboard
                      }
                    })
                  }
                })
              }
            })
          })
        })
      });
      break;

    // Обработка нажатия кнопки нотификации
    case ACTION_TYPE.CHOUSE_NOTIFICATION:
      Customer.findOne({telegramId: queryId}).then(customer => {
        Record.findOne({inDevelopment: true, customer: customer._id}).then(record => {
          Master.findOne({_id: record.master}).then(master => {
            BranchOffice.findOne({_id: record.office}).then(office => {
              Service.findOne({_id: record.service}).then(service => {
                // Добавление данных нотификации
                record.notification.date = record.date;
                record.notification.time.hours = record.time.hours - Number(data.notificationTime.split('/')[0]);
                record.notification.time.minutes = record.time.minutes - Number(data.notificationTime.split('/')[1]);
                record.notification.isActual = !(Number(data.notificationTime.split('/')[0]) === -1);

                // Завершение заявки
                record.inDevelopment = false;
                record.save();
  
                // Добавление заявки в массив заявок клиента
                customer.records.push(record);
                customer.save();
  
                const adressParam = office.adress;
                const dateParam = helper.stringifyDate(record.date);
                const timeParam = helper.stringifyTime(record.time.hours, record.time.minutes);
                const masterParam = helper.getFio(master.firstname, master.middlename, master.lastname);
                const serviceParam = service.title;
                const priceParam = service.price;
                const bonusParam = String(Math.round(service.price * service.bonusPercent));
  
                sendHTML = MESSAGE.RECORD_INFORMATION(adressParam, dateParam, timeParam,
                                                      masterParam, serviceParam, priceParam,
                                                      bonusParam);

                bot.sendMessage(queryId, sendHTML, {
                  parse_mode: 'HTML'
                });
              })
            })
          })
        })
      });
      break;
  }
})

// Функция приветствия
function sayHi(chatId, name) {
  Customer.find({ telegramId: chatId }).then(customer => {
    sendText = '';

    if (customer.length === 0) {
      createCustomer(chatId, name);

      if (!Number(name)) {
        sendText = `Здравствуйте, ${name}!`;
      } else {
        sendText = 'Здравствуйте!';
      }
    } else {
      if (!Number(name)) {
        sendText = sendText = `Здравствуйте, ${customer[0].name}, давно не виделись!`;
      } else {
        sendText = 'Здравствуйте, давно не виделись!';
      }
    }

    bot.sendMessage(chatId, sendText, {
      reply_markup: {
        keyboard: keyboard.homeKeyboard
      }
    })
  })
}

// Функция создания клиента
function createCustomer(chatId, name) {
  let customer = {};
  customer['name'] = name;
  customer['telegramId'] = chatId;
  new Customer(customer).save()
    .catch(err => console.log(err));
}

// Наполнение базы данных
// const database = require('../../../db/database.json');
// database.Service.forEach(service => new Service(service).save().catch(err => console.log(err)));
// database.BranchOffice.forEach(office => new BranchOffice(office).save().catch(err => console.log(err)));
// database.Master.forEach(master => new Master(master).save().catch(err => console.log(err)));