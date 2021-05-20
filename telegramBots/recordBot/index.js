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
  DESCRIPTION_MAIN: '<b>Здесь вы можете:</b>\n' + 
                    '1. Записаться на процедуры,\n' +
                    '2. Отменить запись,\n' +
                    '3. Посмотреть список и стоимость услуг,\n' +
                    '4. Узнать количество бонусов на счету,\n' +
                    '5. Получить дополнительные баллы, пригласив друга',
  ONLINE_RECORD: 'Здесь вы можете записаться или отменить существующие записи',
  SELECT_OFFICE: 'Выберите салон',
  SELECT_DATE: 'Выберите дату',
  SELECT_TIME: 'Выберите время',
  SELECT_NOTIFICATION: 'Когда вам удобнее напомнить о записи?',
  REFERAL_PROGRAM_DESCRIPTION: 'Вы можете поделиться своим реферальным кодом с другом. ' +
                                'Если он его активирует и воспользуется нашими услугами, ' +
                                'вы и ваш товарищ получите на счет бонусные рубли',
  INSERT_REFERAL_CODE: 'Введите реферальный код вашего друга',
  CANCEL_RECORD: 'Список ваших записей',
  GO_TO_MAIN_PAGE: 'Главное меню',
  GO_TO_ONLINE_RECORD_PAGE: 'Меню онлайн-записи',
  GO_TO_REFERAL_PROGRAM_PAGE: 'Меню реферальной программы',
  BONUSES: bonusesAccount => {
    return `На вашем счету ${bonusesAccount} бонусных рублей`;
  },
  REFERAL_CODE: customerId => {
    return `Ваш реферальный код:\n${customerId}`;
  },
  SERVICES: services => {
    return '<b>Выберите услугу:</b>\n' + services.map((s, i) => {
      return `${i+1}. ${s.title} - ${s.price} руб.`
    }).join('\n')
  },
  RECORD_INFORMATION: (adress, date, time, master, service, price, bonus, mode) => {
    if (mode === 'Итог записи') {
      return `Ваша заявка принята!\n\nМы ожидаем вас:\nАдрес: ${adress},\n` +
            `Дата: ${date},\nВремя: ${time},\nМастер: ${master},\nУслуга: ${service},\n\n` +
            `Стоимость услуги: ${price} руб.,\nПри оплате вам начислится ${bonus} бонусных рублей.`;
    } else {
      return `Адрес: ${adress},\nДата: ${date},\nВремя: ${time},\nМастер: ${master},\nУслуга: ${service},\n\n` +
            `Стоимость услуги: ${price} руб.,\nПри оплате вам начислится ${bonus} бонусных рублей.`;
    }
  },
}
const TEXT_BTN = {
  SELECT_OFFICE: 'Выбрать этот салон',
  CANCEL_RECORD: 'Отменить запись ⬆️',
  SELECT_MASTER: master => {
    return `Выбрать мастера ${master.firstname}`;
  }
}
const ACTION_TYPE = {
  CHOUSE_OFFICE: 'cho',
  CHOUSE_SERVICE: 'chs',
  CHOUSE_MASTER: 'chm',
  CHOUSE_DATE: 'chd',
  CHOUSE_TIME: 'cht',
  CHOUSE_NOTIFICATION: 'chn',
  CANCEL_RECORD: 'cr',
  PASS: 'p'
}
const NOTIFICATION = [
  {TEXT: 'За 1 час до записи', VALUE: {HOURS: 1, MINUTES: 0}},
  {TEXT: 'За 2 час до записи', VALUE: {HOURS: 2, MINUTES: 0}},
  {TEXT: 'Не напоминать', VALUE: {HOURS: -1}}
]

// Модели базы данных
require('../../models/branchOffice.model');
require('../../models/customer.model');
require('../../models/master.model');
require('../../models/record.model');
require('../../models/service.model');

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

setInterval(_ => {
  schedulesRefresh();
}, 50000);

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
      Service.find({}).then(services => {
        const sendHTML = MESSAGE.SERVICES(services);

        bot.sendMessage(chatId, sendHTML, {
          parse_mode: 'HTML',
          reply_markup: {
            keyboard: [[navigation.toMainPageBtn]]
          }
        })
      });
      break;
    
    case navigation.homePage.bonusesBtn:
      Customer.findOne({telegramId: chatId}).then(customer => {
        sendText = MESSAGE.BONUSES(customer.bonuses);
        bot.sendMessage(chatId, sendText, {
          reply_markup: {
            keyboard: [[navigation.toMainPageBtn]]
          }
        });
      });
      break;
    
    case navigation.homePage.referralProgramBtn:
      sendText = MESSAGE.REFERAL_PROGRAM_DESCRIPTION;
      bot.sendMessage(chatId, sendText, {
        reply_markup: {
          keyboard: keyboard.referalProgramKeyboard
        }
      });
      break;
    
    // ONLINE RECORD PAGE -------------------------------------------------------------

    // Начало онлайн-записи
    case navigation.onlineRecordPage.recordBtn:
      // Скрыть клавиатуру
      sendText = MESSAGE.SELECT_OFFICE;
      bot.sendMessage(chatId, sendText, {
        reply_markup: {
          remove_keyboard: true
        }
      })

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
                    remove_keyboard: true,
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

    // Просмотр или отмена заявки
    case navigation.onlineRecordPage.cancelBtn:
      sendText = MESSAGE.CANCEL_RECORD;
      bot.sendMessage(chatId, sendText, {
        reply_markup: {
          keyboard: keyboard.cancelRecordKeyboard
        }
      });

      Customer.findOne({telegramId: chatId}).then(customer => {
        Record.find({isActual: true, customer: customer._id}).then(records => {
          records.forEach(record => {
            Master.findOne({_id: record.master}).then(master => {
              BranchOffice.findOne({_id: record.office}).then(office => {
                Service.findOne({_id: record.service}).then(service => {
                  const adressParam = office.adress;
                  const dateParam = helper.stringifyDate(record.date);
                  const timeParam = helper.stringifyTime(record.time.hours, record.time.minutes);
                  const masterParam = helper.getFio(master.firstname, master.middlename, master.lastname);
                  const serviceParam = service.title;
                  const priceParam = service.price;
                  const bonusParam = String(Math.round(service.price * service.bonusPercent));

                  sendHTML = MESSAGE.RECORD_INFORMATION(adressParam, dateParam, timeParam,
                                                        masterParam, serviceParam, priceParam,
                                                        bonusParam, 'Заявка');

                  bot.sendMessage(chatId, sendHTML, {
                    parse_mode: 'HTML',
                    reply_markup: {
                      inline_keyboard: [
                        [
                          {
                            text: TEXT_BTN.CANCEL_RECORD,
                            callback_data: JSON.stringify({
                              type: ACTION_TYPE.CANCEL_RECORD,
                              recordId: record._id
                            })
                          }
                        ]
                      ]
                    }
                  });
                })
              })
            })
          })
        })
      });
      break;

    // REFERAL PROGRAMM PAGE -------------------------------------------------------------

    case navigation.referalProgramPage.referalCodeBtn:
      Customer.findOne({telegramId: chatId}).then(customer => {
        sendText = MESSAGE.REFERAL_CODE(customer._id);
        bot.sendMessage(chatId, sendText, {
          reply_markup: {
            keyboard: keyboard.referalShowOrInsertKeyboard
          }
        });
      });
      break;

    case navigation.referalProgramPage.insertReferalCodeBtn:
      bot.on('message', msg => {
        const recievedText = msg.text;
        Customer.find({_id: recievedText}).then(invitee => {
          if (invitee.length !== 0) {
            Customer.findOne({telegramId: chatId}).then(customer => {
              if (customer.invitedBy === null) {
                customer.bonuses += 1000;
                customer.invitedBy = invitee[0]._id;
                customer.save();
                invitee[0].bonuses += 1000;
                invitee[0].save();
              }
            });
          }
        });
      })
      sendText = MESSAGE.INSERT_REFERAL_CODE;
      bot.sendMessage(chatId, sendText, {
        reply_markup: {
          keyboard: keyboard.referalShowOrInsertKeyboard
        }
      });
      break;

    // TO REFERAL PROGRAMM PAGE -------------------------------------------------------------

    case navigation.toReferalProgramBtn:
      sendText = MESSAGE.GO_TO_REFERAL_PROGRAM_PAGE;
      bot.sendMessage(chatId, sendText, {
        reply_markup: {
          keyboard: keyboard.referalProgramKeyboard
        }
      });
      break;

    // TO ONLINE-RECORD PAGE -------------------------------------------------------------

    case navigation.toOnlineRecordBtn:
      sendText = MESSAGE.GO_TO_ONLINE_RECORD_PAGE;
      bot.sendMessage(chatId, sendText, {
        reply_markup: {
          keyboard: keyboard.onlineRecordKeyboard
        }
      });
      break; 

    // TO MAIN PAGE -------------------------------------------------------------
    
    case navigation.toMainPageBtn:
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
          BranchOffice.findOne({_id: record.office}).then(office => {
            const mastersInOffice = office.masters;

            Master.find({}).then(masters => {
              let photo;
      
              for (let i = 0, p = Promise.resolve(); i < masters.length; i++) {
                
                p = p.then(_ => new Promise(resolve => {
                  if (mastersInOffice.includes(masters[i]._id)) {
                    photo = fs.readFileSync(__dirname.split('\\').slice(0, -2).join('\\') + `\\images\\${masters[i].photoUrl}`);
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
                      })
                  }
      
                  setTimeout(function () {
                      resolve();
                  }, 1500) 
                }))
              }
            })
          })
        })
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
                                                      bonusParam, 'Итог записи');

                bot.sendMessage(queryId, sendHTML, {
                  parse_mode: 'HTML',
                  reply_markup: {
                    keyboard: keyboard.onlineRecordKeyboard
                  }
                });
              })
            })
          })
        })
      });
      break;

    // Обработка нажатия кнопки отмены заявки
    case ACTION_TYPE.CANCEL_RECORD:
      Record.findOne({_id: data.recordId}).then(record => {
        record.isActual = false;
        record.save();
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

    sendText = [sendText, MESSAGE.DESCRIPTION_MAIN].join('\n\n');

    bot.sendMessage(chatId, sendText, {
      parse_mode: 'HTML',
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

function schedulesRefresh() {
  const dateNow = new Date();
  dateNow.setHours(0,0,0,0);

  Master.find({}).then(masters => {
    masters.forEach(master => {

      if (+dateNow > +master.daysSchedule[0].date) {
        const workingDays = master.workingDays;
        const daysSchedule = master.daysSchedule;
        let newDaysSchedule = [];

        for (let i = 0; i < daysSchedule.length; i++) {
          if (+daysSchedule[i].date >= +dateNow) {
            newDaysSchedule.push(daysSchedule[i]);
          }
        };
        let nextDate = daysSchedule[daysSchedule.length - 1].date;
        let d = '';

        while (newDaysSchedule.length !== daysSchedule.length) {
          nextDate = new Date(nextDate.valueOf());
          nextDate.setDate(nextDate.getDate() + 1);

          const dayOfWeek = helper.getDayOfWeek(nextDate);
          if (workingDays[String(dayOfWeek)]) {
            const dayObject = {};
            switch (dayOfWeek) {
              case 'Monday':
                d = 'пн';
                break;
              case 'Tuesday':
                d = 'вт';
                break;
              case 'Wednesday':
                d = 'ср';
                break;
              case 'Thursday':
                d = 'чт';
                break;
              case 'Friday':
                d = 'пт';
                break;
              case 'Saturday':
                d = 'сб';
                break;
              case 'Sunday':
                d = 'вс';
                break;
            };

            dayObject['date'] = nextDate;
            dayObject['day'] = d;
            dayObject['time'] = [
              {"hours": -1, "minutes": 0},
              {"hours": 9, "minutes": 0},
              {"hours": 10, "minutes": 0},
              {"hours": 11, "minutes": 0},
              {"hours": 12, "minutes": 0},
              {"hours": 13, "minutes": 0},
              {"hours": 14, "minutes": 0},
              {"hours": 15, "minutes": 0},
              {"hours": 16, "minutes": 0},
              {"hours": 17, "minutes": 0},
              {"hours": 18, "minutes": 0},
              {"hours": -1, "minutes": 0},
              {"hours": -1, "minutes": 0},
              {"hours": -1, "minutes": 0},
              {"hours": -1, "minutes": 0}
            ];

            newDaysSchedule.push(dayObject);
          }
        };
        
        master.daysSchedule = newDaysSchedule;
        master.save();
        console.log(`Schedule of master ${helper.getFio(master.firstname, master.middlename, master.lastname)} have been refreshed`);
      }
    })
  })
};