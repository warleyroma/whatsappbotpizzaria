import os
import sys

def install_packages():
    packages = ["playwright", "fastapi", "mysql-connector-python", "uvicorn"]
    
    print("🔄 Instalando pacotes necessários...")
    for package in packages:
        os.system(f"{sys.executable} -m pip install {package}")

    print("✅ Todos os pacotes foram instalados!")

    # Instalar os navegadores necessários para o Playwright
    os.system(f"{sys.executable} -m playwright install")

if __name__ == "__main__":
    install_packages()
