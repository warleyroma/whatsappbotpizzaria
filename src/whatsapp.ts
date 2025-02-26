import { create, CreateOptions } from '@wppconnect-team/wppconnect';
import axios from 'axios';
import { Message } from '@wppconnect-team/wppconnect/dist/api/model/message';
import qrcode from 'qrcode-terminal';
import chromium from 'chromium';

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
        executablePath: chromium.path,
        headless: 'new', // Usar o novo modo headless
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process'
        ]
      },
      disableWelcome: true,
      catchQR: (qrCode: string, asciiQR: string, attempt: number) => {
        console.clear();
        console.log('QR Code:');
        qrcode.generate(qrCode, { small: true });
        console.log(`Tentativa: ${attempt}`);
      },
      statusFind: (statusSession: string) => {
        console.log('Status:', statusSession);
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
    console.error('Erro ao iniciar:', error);
    process.exit(1);
  }
}
