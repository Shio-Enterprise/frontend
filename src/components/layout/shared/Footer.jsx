import { Link } from 'react-router-dom';
import logo from '../../../assets/logo/logo.svg';
import { NewsletterBand } from '../../ui/ShioDesign';

const columns = [
  {
    title: 'Shio',
    links: [
      { label: 'Sobre nós', to: '/' },
      { label: 'Nossa história', to: '/' },
      { label: 'Drops', to: '/category/all' },
      { label: 'Contato', to: '/' },
    ],
  },
  {
    title: 'Ajuda',
    links: [
      { label: 'Suporte ao cliente', to: '/' },
      { label: 'Prazo de entrega', to: '/' },
      { label: 'Trocas e devoluções', to: '/' },
    ],
  },
  {
    title: 'Minha conta',
    links: [
      { label: 'Meus dados', to: '/my-account' },
      { label: 'Meus pedidos', to: '/my-orders' },
      { label: 'Endereços', to: '/addresses' },
      { label: 'Cadastre-se', to: '/signup' },
    ],
  },
  {
    title: 'Redes sociais',
    links: [
      { label: 'Instagram', to: '/' },
      { label: 'WhatsApp', to: '/' },
      { label: 'TikTok', to: '/' },
    ],
  },
];

function PaymentBadges() {
  return (
    <div className="flex flex-wrap justify-center gap-3 md:justify-end">
      <span className="flex h-7 items-center justify-center rounded bg-white px-3 text-[11px] font-bold text-[#10a545] shadow-sm">Pix</span>
      <span className="flex h-7 items-center justify-center rounded bg-white px-3 text-[11px] font-bold text-black shadow-sm">Cartão</span>
      <span className="flex h-7 items-center justify-center rounded bg-white px-3 text-[11px] font-bold text-black shadow-sm">Boleto</span>
    </div>
  );
}

export default function Footer({ showNewsletter = true }) {
  return (
    <footer id="contato" className="bg-[#f0f0f0] font-inter text-black">
      {showNewsletter && (
        <div className="-mt-16">
          <NewsletterBand />
        </div>
      )}

      <div className={`mx-auto max-w-[1240px] px-6 pb-10 ${showNewsletter ? 'pt-10' : 'pt-16'}`}>
        <div className="grid gap-12 lg:grid-cols-[260px_1fr]">
          <div className="flex items-start justify-center lg:justify-start">
            <img src={logo} alt="Shio Logo" className="h-auto w-[190px]" />
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="mb-6 text-[13px] font-bold uppercase tracking-[0.22em]">{column.title}</h3>
                <ul className="space-y-4 text-[14px] text-black/50">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link to={link.to} className="transition hover:text-black">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-black/10 pt-5 sm:flex-row">
          <p className="text-[13px] text-black/40">© 2026 Shio Company. Todos os direitos reservados.</p>
          <PaymentBadges />
        </div>
      </div>
    </footer>
  );
}
