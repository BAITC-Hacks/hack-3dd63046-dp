#!/usr/bin/env node

/**
 * Терминальный FAQ-бот для репетиции.
 * Нужен только Node.js 18+: внешних зависимостей нет.
 */

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const FAQ_PATH = path.join(__dirname, 'faq.txt');
const UNKNOWN = 'не знаю';
const STOP_WORDS = new Set([
  'а', 'в', 'во', 'вы', 'да', 'для', 'есть', 'за', 'и', 'из', 'как', 'ли',
  'мне', 'мы', 'на', 'не', 'о', 'от', 'по', 'с', 'со', 'то', 'у', 'что',
  'это', 'я', 'когда', 'какой', 'какая', 'какие', 'нужен', 'нужна', 'нужно',
]);

// Основы слов и синонимы для каждой темы. Они хранятся отдельно от ответов,
// поэтому faq.txt остаётся легко редактируемым файлом из пяти пар Q&A.
const TOPIC_KEYWORDS = new Map([
  ['time', ['врем', 'начал', 'час', 'суббот', 'прийт', 'расписан']],
  ['team', ['команд', 'участ', 'разработ', 'дизайнер', 'менеджер', 'состав', 'кто']],
  ['track', ['трек', 'направлен', 'дашборд', 'аналитик', 'данн']],
  ['submission', ['сдач', 'сдат', 'дедлайн', 'защит', 'демо', 'жюри', 'прототип', 'финал']],
  ['prizes', ['приз', 'наград', 'победител', 'выигр', 'эксперт']],
]);

const COMMAND_ALIASES = new Map([
  ['help', 'help'], ['помощь', 'help'], ['?', 'help'],
  ['topics', 'topics'], ['темы', 'topics'], ['список', 'topics'],
  ['stats', 'stats'], ['статистика', 'stats'],
  ['examples', 'examples'], ['примеры', 'examples'],
  ['why', 'why'], ['почему', 'why'],
  ['reload', 'reload'], ['перезагрузить', 'reload'],
  ['exit', 'exit'], ['quit', 'exit'], ['q', 'exit'], ['выход', 'exit'],
]);

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s/?-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keywords(text) {
  return new Set(
    normalize(text)
      .split(/\s+/)
      .filter((word) => word.length > 1 && !STOP_WORDS.has(word)),
  );
}

function parseFaq(content) {
  const entries = [];
  const seenIds = new Set();

  for (const [index, rawLine] of content.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const parts = line.split('\t');
    if (parts.length !== 3) {
      throw new Error(`Строка ${index + 1}: нужны ID, вопрос и ответ, разделённые табуляцией.`);
    }

    const [id, question, answer] = parts.map((part) => part.trim());
    if (!TOPIC_KEYWORDS.has(id)) {
      throw new Error(`Строка ${index + 1}: неизвестная тема «${id}».`);
    }
    if (!question || !answer || seenIds.has(id)) {
      throw new Error(`Строка ${index + 1}: тема, вопрос и ответ должны быть уникальными и непустыми.`);
    }

    seenIds.add(id);
    entries.push({ id, question, answer, words: new Set([...keywords(question), ...TOPIC_KEYWORDS.get(id)]) });
  }

  if (entries.length !== 5) {
    throw new Error('faq.txt должен содержать ровно пять тем.');
  }
  return entries;
}

function loadFaq(filePath = FAQ_PATH) {
  return parseFaq(fs.readFileSync(filePath, 'utf8'));
}

function wordsMatch(first, second) {
  if (first === second) return true;
  const commonLength = Math.min(first.length, second.length);
  return commonLength >= 4 && (first.startsWith(second) || second.startsWith(first));
}

function scoreQuestion(questionWords, faqWords) {
  let score = 0;
  for (const word of questionWords) {
    for (const faqWord of faqWords) {
      if (wordsMatch(word, faqWord)) {
        // Точное совпадение надёжнее совпадения только по основе слова.
        score += word === faqWord ? 3 : 2;
        break;
      }
    }
  }
  return score;
}

function matchedWords(questionWords, faqWords) {
  return [...questionWords].filter((word) =>
    [...faqWords].some((faqWord) => wordsMatch(word, faqWord)));
}

function matchQuestion(userQuestion, faq) {
  const questionWords = keywords(userQuestion);
  let best = null;
  let bestScore = 0;
  let tied = false;

  for (const entry of faq) {
    const currentScore = scoreQuestion(questionWords, entry.words);
    if (currentScore > bestScore) {
      best = entry;
      bestScore = currentScore;
      tied = false;
    } else if (currentScore > 0 && currentScore === bestScore) {
      tied = true;
    }
  }

  return best && !tied
    ? { entry: best, score: bestScore, words: matchedWords(questionWords, best.words) }
    : null;
}

function findAnswer(userQuestion, faq) {
  return matchQuestion(userQuestion, faq)?.entry.answer ?? UNKNOWN;
}

function helpText() {
  return [
    'Задайте вопрос о репетиции — бот найдёт подходящую тему по ключевым словам.',
    'Команды: /topics — вопросы; /examples — примеры; /why <вопрос> — объяснение ответа;',
    '/stats — статистика; /reload — перечитать faq.txt; /exit — выйти.',
  ].join('\n');
}

function parseCommand(input) {
  const value = normalize(input).replace(/^\//, '');
  const [name, ...argument] = value.split(' ');
  return { command: COMMAND_ALIASES.get(name), argument: argument.join(' ') };
}

function commandFromInput(input) {
  return parseCommand(input).command;
}

function examplesText() {
  return [
    'Примеры вопросов:',
    '— Во сколько начало?',
    '— Кто участвует в команде?',
    '— Какое направление выбрали?',
    '— Когда защита прототипа?',
    '— Будут награды?',
  ].join('\n');
}

function explainMatch(userQuestion, faq) {
  const match = matchQuestion(userQuestion, faq);
  if (!match) return 'Не удалось уверенно выбрать тему: попробуйте сформулировать вопрос точнее.';

  return [
    `Подходящая тема: «${match.entry.question}».`,
    `Совпавшие ключевые слова: ${match.words.join(', ')}.`,
    `Оценка совпадения: ${match.score}.`,
  ].join('\n');
}

function createState(filePath = FAQ_PATH) {
  return { filePath, faq: loadFaq(filePath), stats: { total: 0, known: 0, unknown: 0 } };
}

function handleInput(input, state) {
  const { command, argument } = parseCommand(input);
  if (command === 'exit') return { message: 'До свидания!', exit: true };
  if (command === 'help') return { message: helpText() };
  if (command === 'examples') return { message: examplesText() };
  if (command === 'why') {
    return { message: argument ? explainMatch(argument, state.faq) : 'Использование: /why <ваш вопрос>.' };
  }
  if (command === 'topics') {
    return { message: state.faq.map((item, index) => `${index + 1}. ${item.question}`).join('\n') };
  }
  if (command === 'stats') {
    const { total, known, unknown } = state.stats;
    return { message: `Вопросов: ${total}; найдено ответов: ${known}; «не знаю»: ${unknown}.` };
  }
  if (command === 'reload') {
    try {
      state.faq = loadFaq(state.filePath);
      return { message: `FAQ обновлён: ${state.faq.length} тем.` };
    } catch (error) {
      return { message: `Не удалось обновить FAQ: ${error.message}` };
    }
  }

  const answer = findAnswer(input, state.faq);
  state.stats.total += 1;
  if (answer === UNKNOWN) state.stats.unknown += 1;
  else state.stats.known += 1;
  return { message: answer };
}

function start() {
  const state = createState();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('FAQ-бот репетиции. Введите вопрос или /help для списка команд.');
  const ask = () => rl.question('> ', (input) => {
    const result = handleInput(input, state);
    console.log(result.message);
    if (result.exit) rl.close();
    else ask();
  });
  ask();
}

if (require.main === module) start();

module.exports = {
  UNKNOWN, commandFromInput, createState, examplesText, explainMatch, findAnswer,
  handleInput, keywords, loadFaq, matchQuestion, normalize, parseCommand, parseFaq, wordsMatch,
};
