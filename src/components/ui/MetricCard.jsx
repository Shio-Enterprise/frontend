import { AdminPanel, Icon } from './ShioDesign';

// Só elementos de frase (span), porque o corpo também vai dentro de <button>. Os {' '} separam as
// partes no nome acessível do botão ("Receita total R$ 10,00" e não "Receita totalR$ 10,00").
const MetricCardBody = ({ label, value, change, icon, negative }) => <span className="flex flex-wrap items-start">
  <span aria-hidden="true" className="order-1 flex h-7 w-7 items-center justify-center bg-[#f0f0f0] text-lg font-bold text-black">
    {icon === '$' ? '$' : <Icon name={icon} className="h-5 w-5" />}
  </span>
  {/* Ordem no código = ordem de leitura (nome, valor, variação); "order-*" mantém a variação no
      canto de cima, como antes. */}
  <span className="order-3 mt-3 block basis-full text-[14px] text-black/80 md:text-[20px]">{label}</span>{' '}
  <span className="order-4 mt-1 block basis-full text-[22px] font-bold text-black [overflow-wrap:anywhere] md:mt-2 md:text-[26px]">{value}</span>
  {change && <>{' '}
    <span className={`order-2 ml-auto text-[14px] font-semibold md:text-[20px] ${negative ? 'text-shio-danger' : 'text-shio-success'}`}>
      {change}
    </span>
  </>}
</span>;

// Card clicável é um <button> de verdade (#64): <section role="button"> não é permitido e não
// aparece como botão para todo leitor de tela.
const MetricCard = ({ onClick, ...props }) => (onClick ? (
  <button type="button" onClick={onClick}
    className="block w-full min-w-0 rounded-[18px] border border-black/20 bg-white p-5 text-left transition hover:ring-2 hover:ring-black/15 md:p-6">
    <MetricCardBody {...props} />
  </button>
) : (
  <AdminPanel className="min-w-0 p-5 md:p-6">
    <MetricCardBody {...props} />
  </AdminPanel>
));

export default MetricCard;
