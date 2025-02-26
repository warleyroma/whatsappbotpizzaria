import { create, Client, Message } from '@wppconnect-team/wppconnect';
import axios from 'axios';

// Configurações
const sessionName = 'pizzaria-session';

// Função para enviar dados para sua API
async function sendToAPI(endpoint: string, data: any) {
  try {
    await axios.post(endpoint, data);
    console.log('✅ Dados enviados para a API!');
  } catch (error) {
    console.error('❌ Erro na API:', error.message);
  }
}

// Função para processar mensagens
function parseMessage(message: Message) {
  const { body, from } = message;
  
  // Pedido (exemplo: "/pedido 2x Pizza Calabresa - R$50")
  if (body.startsWith('/pedido')) {
    const match = body.match(/(\d+)x (.+) - R\$(.+)/);
    if (match) {
      return {
        tipo: 'pedido',
        dados: {
          produto: match[2],
          quantidade: parseInt(match[1]),
          total: parseFloat(match[3].replace(',', '.')),
          cliente: from
        }
      };
    }
  }

  // Cliente (exemplo: "/cliente João - Rua ABC, 123")
  if (body.startsWith('/cliente')) {
    const [nome, endereco] = body.replace('/cliente ', '').split(' - ');
    return {
      tipo: 'cliente',
      dados: { nome, endereco, telefone: from }
    };
  }

  return null;
}

// Inicializar WhatsApp
export async function startWhatsApp() {
  const client = await create({
    session: sessionName,
    puppeteerOptions: { headless: true }, // Modo sem interface gráfica
  });

  // Ouvir mensagens
  client.onMessage(async (message) => {
    const parsed = parseMessage(message);
    if (!parsed) return;

    switch (parsed.tipo) {
      case 'pedido':
        await sendToAPI('https://apipizzaria-ea2f.onrender.com/pedidos/', parsed.dados);
        break;
      case 'cliente':
        await sendToAPI('https://apipizzaria-ea2f.onrender.com/clientes/', parsed.dados);
        break;
    }

    // Opcional: Enviar confirmação
    await client.sendText(message.from, '✅ Recebemos seu pedido!');
  });

  console.log('🚀 WhatsApp conectado!');
}
