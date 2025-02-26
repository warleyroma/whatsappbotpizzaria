import { create } from '@wppconnect-team/wppconnect';
import axios from 'axios';
import { Message } from '@wppconnect-team/wppconnect/dist/api/model/message';
import qrcode from 'qrcode-terminal';

const sessionName = 'pizzaria-session';

interface PedidoData {
  produto: string;
  quantidade: number;
  total: number;
  cliente: string;
}

interface ClienteData {
  nome: string;
  endereco: string;
  telefone: string;
}

async function sendToAPI(endpoint: string, data: PedidoData | ClienteData) {
  try {
    await axios.post(endpoint, data);
    console.log('✅ Dados enviados para a API:', data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('❌ Erro na API:', error.message);
    } else {
      console.error('❌ Erro desconhecido:', error);
    }
  }
}

function parseMessage(message: Message): { tipo: string; dados: PedidoData | ClienteData } | null {
  const { body, from } = message;
  
  if (!body) return null;

  // Processar pedidos
  if (body.startsWith('/pedido')) {
    const match = body.match(/(\d+)x (.+?) - R\$(\d+\.?\d*)/);
    if (match) {
      return {
        tipo: 'pedido',
        dados: {
          produto: match[2].trim(),
          quantidade: parseInt(match[1], 10),
          total: parseFloat(match[3].replace(',', '.')),
          cliente: from
        }
      };
    }
  }

  // Processar clientes
  if (body.startsWith('/cliente')) {
    const [nome, endereco] = body.replace('/cliente ', '').split(' - ');
    return {
      tipo: 'cliente',
      dados: {
        nome: nome?.trim() || '',
        endereco: endereco?.trim() || '',
        telefone: from
      }
    };
  }

  return null;
}

export async function startWhatsApp() {
  try {
    const client = await create({
      session: sessionName,
      puppeteerOptions: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      },
      disableWelcome: true,
      catchQR: (qrCode: string, asciiQR: string, attempt: number) => {
        console.clear();
        console.log('🔍 Escaneie o QR Code abaixo:');
        qrcode.generate(qrCode, { small: true });
        console.log(`Tentativa: ${attempt}`);
        console.log('⚠️ Toque em "Mais dispositivos" no WhatsApp do seu celular!');
      },
      statusFind: (statusSession: string) => {
        console.log('Status da sessão:', statusSession);
      }
    });

    console.log('🚀 WhatsApp conectado!');

    client.onMessage(async (message: Message) => {
      try {
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

        await client.sendText(message.from, '✅ Recebemos sua solicitação!');
        
      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
      }
    });

  } catch (error) {
    console.error('Erro ao iniciar WhatsApp:', error);
    process.exit(1);
  }
}
