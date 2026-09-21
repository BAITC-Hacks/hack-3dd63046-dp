#!/usr/bin/env node

/**
 * Консольный FAQ-бот для репетиции HackAlem AI.
 * Зависимости не нужны: достаточно Node.js 18+.
 */

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const FAQ_PATH = path.join(__dirname, 'faq.txt');
const STOP_WORDS = new Set([
  'а', 'в', 'во', 'вы', 'да', 'для', 'есть', 'за', 'и', 'из', 'как',
  'ли', 'мне', 'мы', 'на', 'не', 'нужно', 'о', 'от', 'по', 'с', 'со', 'то',
  'у', 'что', 'это', 'я', 'когда', 'какой', 'нужна', 'нужен',
]);
const STRONG_KEYWORDS = new Set(['где', 'куда', 'репозитор', 'readme', 'github']);

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s]/gi, ' ')
    .trim();
}

function keywords(text) {
  return new Set(
    normalize(text)
      .split(/\s+/)
      .filter((word) => word.length > 1 && !STOP_WORDS.has(word)),
  );
}

// Синонимы и основы слов для пяти вопросов. Ключи привязаны к тексту вопроса,
// поэтому порядок строк в faq.txt не важен.
const TOPIC_KEYWORDS = new Map([
  [normalize('Когда нужно сдать решение?'), ['срок', 'дедлайн', 'врем', 'окончан', 'заканч', 'сдач', 'сдава']],
  [normalize('Кто сдаёт решение?'), ['команд', 'участ', 'состав']],
  [normalize('Какой выбран трек?'), ['трек', 'llm', 'приложен']],
  [normalize('Куда загружать решение?'), ['где', 'куда', 'загруз', 'отправ', 'репозитор', 'readme', 'github']],
  [normalize('Есть ли призы за репетицию?'), ['приз', 'наград', 'выигр']],
]);

function loadFaq(filePath = FAQ_PATH) {
  const rows = fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/);
  return rows.map((row, index) => {
    const [question, answer] = row.split('\t');
    if (!question || !answer) {
      throw new Error(`Строка ${index + 1} в faq.txt должна содержать вопрос и ответ через табуляцию.`);
    }
    const extraWords = TOPIC_KEYWORDS.get(normalize(question)) ?? [];
    return { question, answer, words: new Set([...keywords(question), ...extraWords]) };
  });
}

function wordsMatch(first, second) {
  if (first === second) return true;
  const length = Math.min(first.length, second.length);
  return length >= 4 && (first.startsWith(second) || second.startsWith(first));
}

function score(questionWords, faqWords) {
  let matches = 0;
  for (const word of questionWords) {
    if ([...faqWords].some((faqWord) => wordsMatch(word, faqWord))) {
      matches += STRONG_KEYWORDS.has(word) ? 3 : 1;
    }
  }
  return matches;
}

function findAnswer(userQuestion, faq) {
  const userWords = keywords(userQuestion);
  let best = null;
  let bestScore = 0;
  let isTie = false;

  for (const item of faq) {
    const currentScore = score(userWords, item.words);
    if (currentScore > bestScore) {
      best = item;
      bestScore = currentScore;
      isTie = false;
    } else if (currentScore > 0 && currentScore === bestScore) {
      isTie = true;
    }
  }

  return best && !isTie ? best.answer : 'не знаю';
}

function start() {
  const faq = loadFaq();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('FAQ-бот репетиции HackAlem AI');
  console.log('Задайте вопрос. Для выхода введите «выход».');

  const ask = () => rl.question('> ', (input) => {
    if (normalize(input) === 'выход') {
      rl.close();
      return;
    }

    console.log(findAnswer(input, faq));
    ask();
  });

  ask();
}

if (require.main === module) start();

module.exports = { findAnswer, keywords, loadFaq, normalize, wordsMatch };
