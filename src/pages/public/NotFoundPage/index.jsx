import { Link, useLocation } from 'react-router-dom';
import PublicLayout from '../../../components/layout/public/PublicLayout';

const LINK_CLASS =
  'inline-flex h-11 items-center justify-center rounded-full px-7 text-[14px] font-bold uppercase transition';

// Endereço que não existe (#90). A rota "*" tem a menor prioridade,
// então só cai aqui o que nenhuma outra rota atende.
const NotFoundPage = () => {
  const { pathname } = useLocation();
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  return (
    <PublicLayout showNewsletter={false}>
      <div className="mx-auto max-w-[640px] px-6 py-20 text-center">
        <h1 className="text-[28px] font-black uppercase text-black md:text-[34px]">Página não encontrada</h1>
        <p className="mt-4 text-[16px] text-shio-muted">
          O endereço que você abriu não existe ou mudou de lugar.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {isAdmin && (
            <Link to="/admin/dashboard" className={`${LINK_CLASS} bg-black text-white hover:bg-black/85`}>
              Ir para o painel
            </Link>
          )}
          <Link
            to="/"
            className={`${LINK_CLASS} ${isAdmin ? 'border border-black/25 text-black hover:border-black' : 'bg-black text-white hover:bg-black/85'}`}
          >
            Voltar para a loja
          </Link>
          <Link to="/category/all" className={`${LINK_CLASS} border border-black/25 text-black hover:border-black`}>
            Ver produtos
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
};

export default NotFoundPage;
