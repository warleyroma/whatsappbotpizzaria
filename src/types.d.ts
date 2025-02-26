// Para resolver possíveis erros de tipo
declare module 'qrcode-terminal' {
  export function generate(qrCode: string, options?: { small: boolean }): void;
}
