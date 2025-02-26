import asyncio
from playwright.async_api import async_playwright
import mysql.connector
from fastapi import FastAPI

# Configuração do banco de dados
DB_CONFIG = {
    "host": "3.83.68.65",  # IP do MySQL na AWS
    "port": 3306,
    "user": "warley",
    "password": "Denisia@23",
    "database": "pizzaria"
}

class WhatsApp:
    def __init__(self, page):
        self.page = page

    async def enviar_mensagem(self, numero, mensagem):
        await self.page.goto(f"https://web.whatsapp.com/send?phone={numero}&text={mensagem}")
        await self.page.wait_for_load_state("networkidle")
        await asyncio.sleep(2)  # Pequeno delay para garantir envio
        await self.page.keyboard.press("Enter")

    async def get_unread_messages(self):
        """ Captura mensagens não lidas na aba ativa do WhatsApp Web. """
        try:
            messages = await self.page.evaluate('''
                () => {
                    let unreadMessages = [];
                    let chats = document.querySelectorAll("div[aria-label='Chat de mensagens']");
                    
                    chats.forEach(chat => {
                        let unreadCount = chat.querySelector("span[aria-label='Não lida']");
                        if (unreadCount) {
                            let contactName = chat.querySelector("span[title]").innerText;
                            let lastMessage = chat.querySelector("span[dir='ltr']").innerText;
                            unreadMessages.push({ contact: contactName, content: lastMessage });
                        }
                    });
                    return unreadMessages;
                }
            ''')
            return messages
        except Exception as e:
            print(f"Erro ao capturar mensagens: {e}")
            return []

# Inicializa o FastAPI
app = FastAPI()

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            user_data_dir="whatsapp_session",
            headless=False
        )
        page = await browser.new_page()
        await page.goto("https://web.whatsapp.com")

        whatsapp = WhatsApp(page)
        print("🚀 Bot iniciado... Escutando mensagens...")

        while True:
            messages = await whatsapp.get_unread_messages()
            if messages:
                for msg in messages:
                    print(f"📩 Mensagem de {msg['contact']}: {msg['content']}")
                    if "pedido" in msg["content"].lower():
                        pedido_info = msg["content"].replace("pedido", "").strip()
                        order_id = salvar_pedido_no_banco(msg["contact"], pedido_info)
                        resposta = f"✅ Seu pedido foi registrado! Número do pedido: {order_id}"
                        await whatsapp.enviar_mensagem(msg["contact"], resposta)
            else:
                print("Nenhuma nova mensagem...")
                
            await asyncio.sleep(5)  # Verifica novas mensagens a cada 5 segundos

def salvar_pedido_no_banco(cliente, pedido_info):
    """Salva o pedido no banco MySQL e retorna o ID"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO pedidos (cliente_id, status, total) VALUES (%s, %s, %s)", (cliente, "Pendente", 0))
        conn.commit()
        order_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return order_id
    except Exception as e:
        print(f"Erro ao salvar pedido no banco: {e}")
        return None

# Inicia o bot
if __name__ == "__main__":
    asyncio.run(main())
