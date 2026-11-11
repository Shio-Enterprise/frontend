import { useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import PublicLayout from '../../../components/layout/public/PublicLayout';
import { Icon } from '../../../components/ui/ShioDesign';
import { institutionalPages } from '../../../data/institutionalContent';

function PageNavigation() {
  return (
    <nav aria-label="Informações da Shio" className="space-y-7">
      {['Shio', 'Ajuda'].map((group) => (
        <div key={group}>
          <h2 className="mb-2 px-4 text-[13px] font-bold uppercase tracking-[0.16em] text-shio-muted">{group}</h2>
          <ul className="space-y-1">
            {Object.values(institutionalPages).filter((page) => page.group === group).map((page) => (
              <li key={page.path}>
                <NavLink to={page.path} className={({ isActive }) => `flex min-h-11 items-center rounded-[12px] px-4 py-3 text-[14px] transition-colors ${isActive ? 'bg-[#f0f0f0] font-semibold text-black' : 'text-shio-muted hover:bg-[#f7f7f7] hover:text-black'}`}>
                  {page.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function InstitutionalPage({ pageKey }) {
  const page = institutionalPages[pageKey];

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${page.label} | Shio`;
    window.scrollTo(0, 0);
    return () => { document.title = previousTitle; };
  }, [page.label]);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-[1240px] px-6 pb-16 pt-6 md:pb-24 md:pt-8">
        <nav aria-label="Caminho da página" className="mb-7 text-[13px] text-shio-muted md:mb-10">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link to="/" className="inline-flex min-h-11 items-center hover:text-black">Início</Link></li>
            <li aria-hidden="true"><Icon name="arrowRight" className="h-3 w-3" /></li>
            <li aria-current="page">{page.label}</li>
          </ol>
        </nav>

        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
          <aside className="hidden lg:block"><PageNavigation /></aside>
          <div className="min-w-0">
            <details key={pageKey} className="mb-8 rounded-[12px] border border-black/15 lg:hidden">
              <summary className="cursor-pointer px-4 py-3 text-[14px] font-semibold text-black">Nesta seção: {page.label}</summary>
              <div className="px-2 pb-4 pt-2"><PageNavigation /></div>
            </details>

            <article>
              <header>
                <h1 className="max-w-[18ch] text-[36px] font-black uppercase leading-[1.08] tracking-[-0.03em] text-black md:text-[48px]">{page.label}</h1>
                <p className="mt-5 max-w-[55ch] text-[18px] leading-relaxed text-shio-muted md:text-[20px]">{page.intro}</p>
                <p role="note" className="mt-6 rounded-[12px] bg-[#f0f0f0] px-5 py-4 text-[14px] leading-relaxed text-shio-muted">
                  <strong className="font-semibold text-black">Conteúdo provisório.</strong>{' '}
                  Textos{page.image ? ' e imagens' : ''} de demonstração, aguardando aprovação da Shio.
                </p>
              </header>

              {page.image && (
                <figure className="mt-9">
                  <img src={page.image.src} alt={page.image.alt} width="1440" height="642" className="aspect-[1440/642] w-full rounded-[16px] bg-[#f0f0f0] object-cover" />
                  <figcaption className="mt-3 text-[12px] leading-relaxed text-shio-muted">{page.image.caption}</figcaption>
                </figure>
              )}

              {page.contacts && (
                <dl className="mt-9 divide-y divide-black/10 border-y border-black/10">
                  {page.contacts.map((contact) => (
                    <div key={contact.label} className="grid gap-2 py-5 sm:grid-cols-[200px_1fr] sm:gap-6">
                      <dt className="text-[15px] font-semibold text-black">{contact.label}</dt>
                      <dd className="text-[15px] leading-relaxed text-shio-muted">{contact.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="mt-10 space-y-10 md:mt-12 md:space-y-12">
                {page.sections.map((section) => (
                  <section key={section.title}>
                    <h2 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-black md:text-[26px]">{section.title}</h2>
                    {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 max-w-[68ch] text-[16px] leading-7 text-shio-muted">{paragraph}</p>)}
                    {section.link && (
                      <Link to={section.link.to} className="mt-3 inline-flex min-h-11 items-center gap-3 text-[14px] font-semibold text-black underline underline-offset-4 hover:text-shio-muted">
                        {section.link.label}<Icon name="arrowRight" className="h-4 w-4" />
                      </Link>
                    )}
                  </section>
                ))}
              </div>

              {page.action && (
                <div className="mt-12 border-t border-black/10 pt-8">
                  <Link to={page.action.to} className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-black px-8 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-black/85 sm:w-auto">
                    {page.action.label}<Icon name="arrowRight" className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </article>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
