import 'dotenv/config';

const k = process.env.ANTHROPIC_API_KEY || '';
console.log('KEY?', !!k);
console.log('LEN:', k.length);
console.log('PREFIX:', k.slice(0,7));
console.log('PORT:', process.env.PORT);
