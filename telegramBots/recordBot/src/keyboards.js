const navigation = require('./navigation');

module.exports = {
  // Клавиатура для главного меню
  homeKeyboard: [
    [navigation.homePage.onlineRecordBtn, navigation.homePage.priceListBtn],
    [navigation.homePage.bonusesBtn, navigation.homePage.referralProgramBtn]
  ],

  // Клавиатура для страницы меню онлайн-записи
  onlineRecordKeyboard: [
    [navigation.onlineRecordPage.recordBtn, navigation.onlineRecordPage.cancelBtn],
    [navigation.backBtn]
  ],

  // Клавиатура для страницы подачи заявки
  recordKeyboard: [
    [navigation.recordPage.cancelBtn]
  ],

  // Клавиатура для страницы с прайс-листом
  priceListKeyboard: [

  ],

  // Клавиатура для страницы с бонусным счетом
  bonusesKeyboard: [

  ],

  // Клавиатура для страницы меню реферальной программы
  referralProgramKeyboard: [

  ]
}