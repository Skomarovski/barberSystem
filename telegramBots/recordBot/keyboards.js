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
    [navigation.toMainPageBtn]
  ],

  // Клавиатура для отмены заявок
  cancelRecordKeyboard: [
    [navigation.toOnlineRecordBtn, navigation.toMainPageBtn]
  ],

  // Клавиатура для страницы меню реферальной программы
  referalProgramKeyboard: [
    [navigation.referalProgramPage.referalCodeBtn, navigation.referalProgramPage.insertReferalCodeBtn],
    [navigation.toMainPageBtn]
  ],

  // Клавиатура для страниц показа или ввода реферального кода
  referalShowOrInsertKeyboard: [
    [navigation.toReferalProgramBtn, navigation.toMainPageBtn]
  ]
}