import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { axe } from 'vitest-axe';
import ProductGallery from './ProductGallery';

const fotos = (n) => Array.from({ length: n }, (_, i) => ({ id: `i${i + 1}`, image: `/${i + 1}.png` }));
const fotoPrincipal = () => screen.getByRole('img', { name: 'Camiseta' });
const miniaturas = () => screen.queryByRole('group', { name: 'Fotos do produto' });

// jsdom não calcula layout: simula as medidas da faixa de miniaturas e avisa a galeria.
const simularRolagem = ({ scrollHeight, clientHeight, scrollTop = 0 }) => {
  const faixa = screen.getByTestId('faixa-miniaturas');
  Object.defineProperty(faixa, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(faixa, 'clientHeight', { configurable: true, value: clientHeight });
  Object.defineProperty(faixa, 'scrollWidth', { configurable: true, value: 0 });
  Object.defineProperty(faixa, 'clientWidth', { configurable: true, value: 0 });
  faixa.scrollTop = scrollTop;
  faixa.scrollTo = vi.fn(({ top, left }) => {
    if (top !== undefined) faixa.scrollTop = top;
    if (left !== undefined) faixa.scrollLeft = left;
  });
  fireEvent.scroll(faixa);
  return faixa;
};

describe('ProductGallery', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sem fotos mostra só o quadro vazio, sem miniaturas', () => {
    render(<ProductGallery images={[]} productName="Camiseta" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(miniaturas()).not.toBeInTheDocument();
  });

  it('com uma foto não mostra a coluna de miniaturas', () => {
    render(<ProductGallery images={fotos(1)} productName="Camiseta" />);
    expect(fotoPrincipal()).toHaveAttribute('src', '/1.png');
    expect(miniaturas()).not.toBeInTheDocument();
  });

  it('com muitas fotos mostra uma miniatura para cada', () => {
    render(<ProductGallery images={fotos(10)} productName="Camiseta" />);
    expect(within(miniaturas()).getAllByRole('button', { name: /^Ver foto \d+ de 10$/ })).toHaveLength(10);
  });

  it('foto principal aparece inteira, sem corte', () => {
    render(<ProductGallery images={fotos(3)} productName="Camiseta" />);
    expect(fotoPrincipal()).toHaveClass('object-contain');
    expect(fotoPrincipal()).not.toHaveClass('object-cover');
  });

  it('clicar numa miniatura troca a foto principal e marca a miniatura', () => {
    render(<ProductGallery images={fotos(3)} productName="Camiseta" />);
    const terceira = screen.getByRole('button', { name: 'Ver foto 3 de 3' });
    fireEvent.click(terceira);
    expect(fotoPrincipal()).toHaveAttribute('src', '/3.png');
    expect(terceira).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Ver foto 1 de 3' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('sem rolagem não mostra as setas', () => {
    render(<ProductGallery images={fotos(3)} productName="Camiseta" />);
    simularRolagem({ scrollHeight: 300, clientHeight: 300 });
    expect(screen.queryByRole('button', { name: 'Fotos anteriores' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Próximas fotos' })).not.toBeInTheDocument();
  });

  it('com rolagem mostra as setas e a de voltar fica apagada no começo', () => {
    render(<ProductGallery images={fotos(10)} productName="Camiseta" />);
    simularRolagem({ scrollHeight: 1500, clientHeight: 500 });
    expect(screen.getByRole('button', { name: 'Fotos anteriores' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Próximas fotos' })).toHaveAttribute('aria-disabled', 'false');
  });

  it('seta de avançar rola a faixa e libera a de voltar', () => {
    render(<ProductGallery images={fotos(10)} productName="Camiseta" />);
    const faixa = simularRolagem({ scrollHeight: 1500, clientHeight: 500 });
    fireEvent.click(screen.getByRole('button', { name: 'Próximas fotos' }));
    expect(faixa.scrollTop).toBeGreaterThan(0);
    fireEvent.scroll(faixa);
    expect(screen.getByRole('button', { name: 'Fotos anteriores' })).toHaveAttribute('aria-disabled', 'false');
  });

  it('no fim da faixa a seta de avançar fica apagada', () => {
    render(<ProductGallery images={fotos(10)} productName="Camiseta" />);
    simularRolagem({ scrollHeight: 1500, clientHeight: 500, scrollTop: 1000 });
    expect(screen.getByRole('button', { name: 'Próximas fotos' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('não tem violações de acessibilidade com rolagem', async () => {
    const { container } = render(<ProductGallery images={fotos(10)} productName="Camiseta" />);
    simularRolagem({ scrollHeight: 1500, clientHeight: 500 });
    expect(await axe(container)).toHaveNoViolations();
  });
  it('com duas fotos já mostra a coluna de miniaturas', () => {
    render(<ProductGallery images={fotos(2)} productName="Camiseta" />);
    expect(within(miniaturas()).getAllByRole('button')).toHaveLength(2);
  });

  it('rola com animação suave por padrão', () => {
    render(<ProductGallery images={fotos(10)} productName="Camiseta" />);
    const faixa = simularRolagem({ scrollHeight: 1500, clientHeight: 500 });
    fireEvent.click(screen.getByRole('button', { name: 'Próximas fotos' }));
    expect(faixa.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });

  it('respeita o pedido do sistema de reduzir animações', () => {
    vi.stubGlobal('matchMedia', (q) => ({ matches: q.includes('prefers-reduced-motion: reduce'), media: q }));
    render(<ProductGallery images={fotos(10)} productName="Camiseta" />);
    const faixa = simularRolagem({ scrollHeight: 1500, clientHeight: 500 });
    fireEvent.click(screen.getByRole('button', { name: 'Próximas fotos' }));
    expect(faixa.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
  });

  it('seta apagada no fim não rola e continua com o foco do teclado', () => {
    render(<ProductGallery images={fotos(10)} productName="Camiseta" />);
    const faixa = simularRolagem({ scrollHeight: 1500, clientHeight: 500, scrollTop: 1000 });
    const proxima = screen.getByRole('button', { name: 'Próximas fotos' });
    proxima.focus();
    fireEvent.click(proxima);
    expect(faixa.scrollTo).not.toHaveBeenCalled();
    expect(proxima).not.toBeDisabled();
    expect(proxima).toHaveFocus();
  });

  it('foto que não carrega vira o quadro cinza, sem ícone de imagem quebrada', () => {
    render(<ProductGallery images={fotos(3)} productName="Camiseta" />);
    fireEvent.error(fotoPrincipal());
    expect(screen.queryByRole('img', { name: 'Camiseta' })).not.toBeInTheDocument();
    // é o mesmo arquivo: a miniatura dele também vira quadro cinza
    expect(screen.getByRole('button', { name: 'Ver foto 1 de 3' }).querySelector('img')).toBeNull();
    const terceira = screen.getByRole('button', { name: 'Ver foto 3 de 3' });
    fireEvent.error(terceira.querySelector('img'));
    expect(terceira.querySelector('img')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver foto 2 de 3' }));
    expect(fotoPrincipal()).toHaveAttribute('src', '/2.png');
  });

  it('cliques rápidos somam mesmo com a rolagem anterior ainda em andamento', () => {
    render(<ProductGallery images={fotos(10)} productName="Camiseta" />);
    const faixa = simularRolagem({ scrollHeight: 1500, clientHeight: 500 });
    faixa.scrollTo = vi.fn(); // animação em andamento: a posição ainda não mudou
    const proxima = screen.getByRole('button', { name: 'Próximas fotos' });
    fireEvent.click(proxima);
    fireEvent.click(proxima);
    const [primeiro, segundo] = faixa.scrollTo.mock.calls.map(([arg]) => arg.top);
    expect(segundo).toBe(primeiro * 2);
  });

  it('não passa do fim da faixa', () => {
    render(<ProductGallery images={fotos(10)} productName="Camiseta" />);
    const faixa = simularRolagem({ scrollHeight: 1500, clientHeight: 500, scrollTop: 950 });
    fireEvent.click(screen.getByRole('button', { name: 'Próximas fotos' }));
    expect(faixa.scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ top: 1000 }));
  });

  it.each(['scrollend', 'wheel', 'touchstart'])('depois de %s a próxima seta parte da posição real', (evento) => {
    render(<ProductGallery images={fotos(10)} productName="Camiseta" />);
    const faixa = simularRolagem({ scrollHeight: 1500, clientHeight: 500 });
    faixa.scrollTo = vi.fn();
    const proxima = screen.getByRole('button', { name: 'Próximas fotos' });
    fireEvent.click(proxima);
    const passo = faixa.scrollTo.mock.calls[0][0].top;
    faixa.scrollTop = 400;
    faixa.dispatchEvent(new Event(evento));
    fireEvent.click(proxima);
    expect(faixa.scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ top: 400 + passo }));
  });
});
