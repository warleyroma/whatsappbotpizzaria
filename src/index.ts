import express from 'express';
import { startWhatsApp } from './whatsapp';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Rota de status
app.get('/', (req, res) => {
  res.send('Servidor da Pizzaria Online!');
});

// Iniciar tudo
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  startWhatsApp().catch((error) => {
    console.error('Erro ao iniciar WhatsApp:', error);
    process.exit(1);
  });
});
