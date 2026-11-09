import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
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
  faixa.scrollBy = ({ top = 0, left = 0 }) => { faixa.scrollTop += top; faixa.scrollLeft += left; };
  fireEvent.scroll(faixa);
  return faixa;
};

describe('ProductGallery', () => {
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
});
