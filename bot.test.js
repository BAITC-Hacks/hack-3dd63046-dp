const assert = require('node:assert/strict');
const path = require('node:path');
const { findAnswer, loadFaq } = require('./bot');

const faq = loadFaq(path.join(__dirname, 'faq.txt'));

assert.equal(
  findAnswer('Когда дедлайн сдачи?', faq),
  'Загрузите решение в репозиторий команды до окончания хакатона.',
);
assert.equal(
  findAnswer('Когда сдавать решение?', faq),
  'Загрузите решение в репозиторий команды до окончания хакатона.',
);
assert.equal(
  findAnswer('Что по времени?', faq),
  'Загрузите решение в репозиторий команды до окончания хакатона.',
);
assert.equal(findAnswer('Будут награды?', faq), 'Нет, это репетиция, поэтому призов нет.');
assert.equal(findAnswer('Какой LLM-трек выбран?', faq), 'Выбран трек 03 «LLM-приложения».');
assert.equal(findAnswer('Куда отправить README?', faq), 'Сдайте решение в репозиторий команды.');
assert.equal(findAnswer('Где сдавать?', faq), 'Сдайте решение в репозиторий команды.');
assert.equal(findAnswer('Кто участвует от команды?', faq), 'Сдача выполняется в репозиторий команды.');
assert.equal(findAnswer('Расскажите про квантовую физику', faq), 'не знаю');

console.log('Все проверки пройдены.');
