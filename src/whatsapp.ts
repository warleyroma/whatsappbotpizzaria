import { create, Whatsapp } from '@wppconnect-team/wppconnect';
import axios from 'axios';
import { Message } from '@wppconnect-team/wppconnect/dist/api/model/message';

const sessionName = 'pizzaria-session';

async function sendToAPI(endpoint: string, data: any) {
  try {
    await axios.post(endpoint, data);
    console.log('✅ Dados enviados para a API!');
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('❌ Erro na API:', error.message);
    } else {
      console.error('❌ Erro desconhecido:', error);
    }
  }
}

function parseMessage(message: Message) {
  const { body, from } = message;
  if (!body) return null;

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

  if (body.startsWith('/cliente')) {
    const [nome, endereco] = body.replace('/cliente ', '').split(' - ');
    return {
      tipo: 'cliente',
      dados: { nome, endereco, telefone: from }
    };
  }

  return null;
}

export async function startWhatsApp() {
  const client = await create({
    session: sessionName,
    puppeteerOptions: { 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    },
  });

  client.onMessage(async (message: Message) => {
    if (!message.body) return;
    
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

    await client.sendText(message.from, '✅ Recebemos seu pedido!');
  });

  console.log('🚀 WhatsApp conectado!');
}
