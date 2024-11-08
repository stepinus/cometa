const shortRussianWords = [
  "я", "он", "она", "оно", "мы", "вы", "их", "ей", "им", "ею", 
  "ним", "нам", "вам", "да", "нет", "так", "где", "что", "как", 
  "тут", "там", "еще", "все", "сам", "них", "ему", "его", "ею"
];

const startWords = [
  "ка-мета",
  "комета",
  "камета",
  "ka-meta",
  "kameta",
  "привет",
  "здравствуй",
  "здравствуйте",
  "доброе утро",
  "добрый день",
  "добрый вечер",
  "приветствую",
  "салют",
  "хай",
  "хеллоу",
  "hey",
  "hi",
  "начать",
  "поехали",
  "старт",
  "start",
  "го",
  "погнали"
];

export default function verify(text: string) {
  const normalizedText = text.toLowerCase().trim();
  const words = normalizedText.split(/\s+/);
  
  // Проверяем наличие хотя бы одного стартового слова
  const hasStartWord = startWords.some(word => 
    words.some(w => w === word)
  );

  if (!hasStartWord) {
    return false;
  }

  
  // Проверяем, что есть слова длиннее 4 символов, 
  // исключая короткие служебные слова


  return true;
}
