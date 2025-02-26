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
        await self.page.keyboard.press("Enter")

    async def get_unread_messages(self):
        """ Captura mensagens não lidas na aba ativa do WhatsApp Web. """
        messages = await self.page.evaluate(() => {
            let unreadMessages = [];
            let chats = document.querySelectorAll("._2nY6U"); // Classe das conversas
            chats.forEach(chat => {
                let unreadCount = chat.querySelector("._1pJ9J");
                if (unreadCount) {
                    let contactName = chat.querySelector("._21S-L").innerText;
                    unreadMessages.push({ contact: contactName, count: unreadCount.innerText });
                }
            });
            return unreadMessages;
        })
        return messages

    def __init__(self, page):
        self.page = page

    async def enviar_mensagem(self, numero, mensagem):
        await self.page.goto(f"https://web.whatsapp.com/send?phone={numero}&text={mensagem}")
        await self.page.wait_for_load_state("networkidle")
        await self.page.keyboard.press("Enter")



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
            for msg in messages:
                print(f"📩 Mensagem de {msg['sender']}: {msg['content']}")
                if "pedido" in msg["content"].lower():
                    pedido_info = msg["content"].replace("pedido", "").strip()
                    order_id = salvar_pedido_no_banco(msg["sender"], pedido_info)
                    resposta = f"✅ Seu pedido foi registrado! Número do pedido: {order_id}"
                    await whatsapp.send_message(msg["sender"], resposta)
            await asyncio.sleep(5)  # Verifica novas mensagens a cada 5 segundos

def salvar_pedido_no_banco(cliente, pedido_info):
    """Salva o pedido no banco MySQL e retorna o ID"""
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO pedidos (cliente_id, status, total) VALUES (%s, %s, %s)", (cliente, "Pendente", 0))
    conn.commit()
    order_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return order_id

# Inicia o bot
if __name__ == "__main__":
    asyncio.run(main())
