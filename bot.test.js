const assert = require('node:assert/strict');
const path = require('node:path');
const {
  UNKNOWN, createState, explainMatch, findAnswer, handleInput, loadFaq, matchQuestion, parseFaq,
} = require('./bot');

const faq = loadFaq(path.join(__dirname, 'faq.txt'));
assert.equal(faq.length, 5);

assert.match(findAnswer('Во сколько начало?', faq), /18:00/);
assert.match(findAnswer('Кто участвует в команде?', faq), /разработчики/);
assert.match(findAnswer('Какое направление выбрали?', faq), /Дашборд/);
assert.match(findAnswer('Когда защита прототипа?', faq), /конце недели/);
assert.match(findAnswer('Будут награды?', faq), /призы/);
assert.equal(findAnswer('Расскажите о квантовой физике', faq), UNKNOWN);

// Равный результат по двум темам не должен давать случайный ответ.
assert.equal(matchQuestion('участники и данные', faq), null);
assert.throws(() => parseFaq('time\tВопрос\tОтвет'), /ровно пять тем/);

const state = createState(path.join(__dirname, 'faq.txt'));
assert.match(handleInput('/help', state).message, /\/topics/);
assert.match(handleInput('/topics', state).message, /1\. Когда проходит/);
assert.match(handleInput('/examples', state).message, /Во сколько начало/);
assert.match(handleInput('/why Во сколько начало?', state).message, /Совпавшие ключевые слова/);
assert.match(explainMatch('Расскажите о квантовой физике', faq), /Не удалось уверенно/);
assert.match(handleInput('Будут призы?', state).message, /Лучшие команды/);
assert.equal(handleInput('Что с погодой?', state).message, UNKNOWN);
assert.match(handleInput('/stats', state).message, /Вопросов: 2; найдено ответов: 1; «не знаю»: 1/);
assert.equal(handleInput('/exit', state).exit, true);

console.log('Все проверки пройдены.');
