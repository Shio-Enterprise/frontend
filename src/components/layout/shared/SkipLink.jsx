export const MAIN_CONTENT_ID = 'conteudo';

// Primeiro item focável da página: leva o teclado direto ao <main>, pulando a navegação.
const SkipLink = () => (
  <a
    href={`#${MAIN_CONTENT_ID}`}
    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-black focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
  >
    Pular para o conteúdo
  </a>
);

export default SkipLink;
