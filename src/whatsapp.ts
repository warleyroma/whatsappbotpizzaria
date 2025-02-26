import { create } from '@wppconnect-team/wppconnect';
import axios from 'axios';
import { Message } from '@wppconnect-team/wppconnect/dist/api/model/message';
import qrcode from 'qrcode-terminal';
import 'dotenv/config'; // Carrega variáveis de ambiente do arquivo .env

// Configurações da sessão
const sessionName = process.env.SESSION_NAME || 'pizzaria-session';

// Interfaces para tipagem
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

// Função para enviar dados para a API
async function sendToAPI(endpoint: string, data: PedidoData | ClienteData) {
  const baseURL = process.env.API_BASE_URL || 'https://apipizzaria-ea2f.onrender.com';
  try {
    await axios.post(`${baseURL}${endpoint}`, data);
    console.log('✅ Dados enviados para a API:', data);
  } catch (error) {
    console.error('❌ Erro na API:', error);
  }
}

// Função para processar mensagens
function parseMessage(message: Message): { tipo: string; dados: PedidoData | ClienteData } | null {
  const { body, from } = message;
  
  if (!body) return null;

  // Processar pedidos (exemplo: "/pedido 2x Pizza Calabresa - R$50")
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

  // Processar clientes (exemplo: "/cliente João - Rua ABC, 123")
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

// Função principal para iniciar o WhatsApp
export async function startWhatsApp() {
  try {
    const client = await create({
      session: sessionName,
      puppeteerOptions: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      },
      disableWelcome: true,
      catchQR: (qrCode: string) => {
        console.clear();
        console.log('🔍 Escaneie o QR Code abaixo:');
        qrcode.generate(qrCode, { small: true });
        console.log('\n⚠️ Toque em "Mais dispositivos" no WhatsApp do seu celular!');
      },
      statusFind: (statusSession: string) => {
        console.log('Status da sessão:', statusSession);
      }
    });

    console.log('🚀 WhatsApp conectado!');

    // Ouvir mensagens recebidas
    client.onMessage(async (message: Message) => {
      try {
        if (!message.body) return;

        const parsed = parseMessage(message);
        if (!parsed) return;

        switch (parsed.tipo) {
          case 'pedido':
            await sendToAPI('/pedidos/', parsed.dados);
            break;
            
          case 'cliente':
            await sendToAPI('/clientes/', parsed.dados);
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
