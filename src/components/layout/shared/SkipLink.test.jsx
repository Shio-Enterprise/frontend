import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import SkipLink, { MAIN_CONTENT_ID } from './SkipLink';

describe('SkipLink', () => {
  it('aponta para o conteúdo principal', () => {
    render(<SkipLink />);
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' }))
      .toHaveAttribute('href', `#${MAIN_CONTENT_ID}`);
  });

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(
      <>
        <SkipLink />
        <main id={MAIN_CONTENT_ID} tabIndex={-1}>Conteúdo</main>
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
