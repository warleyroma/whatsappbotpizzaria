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
        try:
            await self.page.goto(f"https://web.whatsapp.com/send?phone={numero}&text={mensagem}")
            await self.page.wait_for_load_state("networkidle")
            await self.page.keyboard.press("Enter")
            print(f" Mensagem enviada para {numero}: {mensagem}")
        except Exception as e:
            print(f"❌ Erro ao enviar mensagem para {numero}: {e}")

    async def get_unread_messages(self):
        """ Captura mensagens não lidas na aba ativa do WhatsApp Web. """
        try:
            messages = await self.page.evaluate('''
                async () => {
                    let unreadMessages = [];
                    let chats = document.querySelectorAll("div[aria-label='Conversas']");

                    chats.forEach(chat => {
                        let unreadCount = chat.querySelector("span[title]");
                        if (unreadCount) {
                            let contactName = chat.querySelector("span[dir='auto']").innerText;
                            unreadMessages.push({ contact: contactName, count: unreadCount.innerText });
                        }
                    });
                    return unreadMessages;
                }
            ''')
            print(f" Mensagens não lidas: {messages}")
            return messages
        except Exception as e:
            print(f"❌ Erro ao obter mensagens não lidas: {e}")
            return []

    async def get_message_content(self, contact_name):
        """Abre a conversa e extrai o texto das mensagens."""
        try:
            # Localiza e clica na conversa
            await self.page.click(f"span[title='{contact_name}']")
            await asyncio.sleep(2)  # Espera a conversa carregar

            # Extrai o texto das mensagens
            messages = await self.page.evaluate('''
                () => {
                    let messages = [];
                    let messageElements = document.querySelectorAll("div.x1n2onr6 _ak9y span.selectable-text");
                    messageElements.forEach(element => {
                        messages.push(element.innerText);
                    });
                    return messages;
                }
            ''')
            return messages
        except Exception as e:
            print(f"❌ Erro ao obter conteúdo da mensagem de {contact_name}: {e}")
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
        try:
            await page.goto("https://web.whatsapp.com")
            await page.wait_for_load_state("networkidle")
            await page.screenshot(path="whatsapp_loaded.png") #Captura de tela
            whatsapp = WhatsApp(page)
            print(" Bot iniciado... Escutando mensagens...")

            while True:
                messages = await whatsapp.get_unread_messages()

                if messages:
                    for msg in messages:
                        print(f" Nova mensagem de {msg['contact']} - {msg['count']} mensagens não lidas.")
                        message_content = await whatsapp.get_message_content(msg["contact"])
                        for content in message_content:
                            if "pedido" in content.lower():
                                pedido_info = content.replace("pedido", "").strip()
                                order_id = salvar_pedido_no_banco(msg["contact"], pedido_info)
                                if order_id:
                                    resposta = f"✅ Seu pedido foi registrado! Número do pedido: {order_id}"
                                    await whatsapp.enviar_mensagem(msg["contact"], resposta)
                                    break
                else:
                    print(" Nenhuma nova mensagem.")

                await asyncio.sleep(5)
        except Exception as e:
            print(f"❌ Erro durante a execução: {e}")
            await page.screenshot(path="error_screenshot.png") #Captura de tela em caso de erro
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
        print(f"✅ Pedido salvo no banco: {order_id}")
        return order_id
    except Exception as e:
        print(f"❌ Erro ao salvar pedido: {e}")
        return None

# Inicia o bot
if __name__ == "__main__":
    asyncio.run(main())