// ─── Ayurveda / Herbs / Home Remedies topic pool ──────────────────────────────
const TOPICS = [
  // Herbs & spices
  'Benefits of sauf (fennel) seeds',
  'How to use ajwain for digestion',
  'Benefits of tulsi leaves',
  'How to use ashwagandha daily',
  'Benefits of triphala churna',
  'How to use neem for skin',
  'Benefits of giloy (guduchi)',
  'How to use turmeric in daily life',
  'Benefits of amla (Indian gooseberry)',
  'How to use brahmi for brain health',
  'Benefits of shilajit for energy',
  'How to use mulethi (licorice) root',
  'Benefits of moringa leaves',
  'How to use kalonji (black seed) oil',
  'Benefits of methi (fenugreek) seeds',
  'How to use ginger for cold and cough',
  'Benefits of cinnamon for blood sugar',
  'How to use cloves for toothache',
  'Benefits of cardamom for digestion',
  'How to use curry leaves for hair fall',

  // Home remedies
  'Home remedy for acidity with ajwain',
  'Home remedy for cold using ginger tea',
  'Home remedy for gas and bloating',
  'Home remedy for headache with clove',
  'Home remedy for sore throat with honey',
  'Home remedy for skin glow with turmeric',
  'Home remedy for hair growth with onion',
  'Home remedy for joint pain with garlic',
  'Home remedy for weight loss with jeera',
  'Home remedy for bad breath with fennel',
  'Home remedy for diabetes with karela',
  'Home remedy for insomnia with warm milk',
  'Home remedy for cough with tulsi',
  'Home remedy for immunity with giloy',
  'Home remedy for dark circles with rose water',

  // Ayurvedic concepts
  'What is Ayurveda and how it works',
  'What are the three doshas in Ayurveda',
  'Ayurvedic morning routine (Dinacharya)',
  'Benefits of oil pulling (Gandusha)',
  'What is Panchakarma therapy',
  'Ayurvedic diet for better digestion',
  'Benefits of Abhyanga (oil massage)',
  'What is Rasayana in Ayurveda',
  'Ayurvedic herbs for stress relief',
  'Ayurvedic tips for glowing skin',
  'Ayurvedic remedies for hair loss',
  'Benefits of drinking copper vessel water',
  'Ayurvedic tips for better sleep',
  'How Ayurveda boosts immunity naturally',
  'Ayurvedic herbs for weight management',

  // Why / What / How angles
  'Why you should drink warm water daily',
  'Why jeera water is good for you',
  'Why Ayurveda says eat with seasons',
  'Why ghee is healthy in Ayurveda',
  'How to detox with Ayurvedic herbs',
  'How to balance Vata dosha naturally',
  'How to balance Pitta dosha naturally',
  'How to balance Kapha dosha naturally',
  'How to use Chyawanprash every day',
  'How to make kadha for immunity',
];

function getRandomTopic() {
  return TOPICS[Math.floor(Math.random() * TOPICS.length)];
}

function getAllTopics() {
  return [...TOPICS];
}

module.exports = { getRandomTopic, getAllTopics, TOPICS };
