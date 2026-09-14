import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import apiClient from '../../lib/axios';

export function PageMarker({ name }) {
  return <span className="sr-only">{name}</span>;
}

export function Icon({ name, className = 'h-5 w-5' }) {
  const common = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
  };

  const paths = {
    search: <path d="m21 21-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />,
    cart: <path d="M3 3h2l.5 3m0 0L7 15h10l3-9H5.5Zm4.5 15a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />,
    user: <path d="M19 20a7 7 0 0 0-14 0m11-11a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />,
    close: <path d="M18 6 6 18M6 6l12 12" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    mail: <path d="M4 6h16v12H4V6Zm0 1 8 6 8-6" />,
    arrowRight: <path d="M5 12h14m-6-6 6 6-6 6" />,
    arrowLeft: <path d="M19 12H5m6-6-6 6 6 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    trash: <path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
    tag: <path d="M20 12 12 20 4 12V4h8l8 8ZM8 8h.01" />,
    grid: <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" />,
    box: <path d="m21 8-9-5-9 5 9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8" />,
    users: <path d="M16 19a4 4 0 0 0-8 0m4-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 8a3 3 0 0 0-4-2.8m2-8.2a2.5 2.5 0 1 1-1.5 4.5" />,
    bag: <path d="M6 8h12l-1 12H7L6 8Zm3 0a3 3 0 0 1 6 0" />,
    more: <path d="M12 6h.01M12 12h.01M12 18h.01" />,
    logout: <path d="M14 8V5H5v14h9v-3m-3-4h9m-3-3 3 3-3 3" />,
    save: <path d="M5 4h12l2 2v14H5V4Zm3 0v6h8V4M8 20v-7h8v7" />,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

export function Rating({ value }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-black/55">
      <span className="text-base leading-none text-[#ffc633]">★★★★★</span>
      <span>{value}</span>
    </div>
  );
}

export function ProductCard({ product }) {
  return (
    <article className="group">
      <Link to={`/product/${product.id ?? '1'}`} className="block overflow-hidden rounded-[16px] bg-[#f0efed]">
        {product.image ? (
          <img src={product.image} alt={product.name}
            className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'block'; }} />
        ) : null}
        <div className={`aspect-square w-full bg-[#f0efed] ${product.image ? 'hidden' : 'block'}`} />
      </Link>
      <h3 className="mt-4 text-[16px] font-semibold leading-tight text-black">{product.name}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[20px] font-bold text-black">{product.price}</span>
        {product.oldPrice && <span className="text-[18px] font-bold text-black/35 line-through">{product.oldPrice}</span>}
        {product.discount && (
          <span className="rounded-full bg-[#ffebeb] px-3 py-1 text-xs font-medium text-[#ff3333]">
            {product.discount}
          </span>
        )}
      </div>
    </article>
  );
}

export function SectionTitle({ children }) {
  return <h2 className="text-center text-[32px] font-black uppercase leading-tight text-black md:text-[42px]">{children}</h2>;
}

export function ViewAllButton({ to = '/category/all' }) {
  return (
    <div className="mt-8 flex justify-center">
      <Link
        to={to}
        className="inline-flex min-w-[180px] items-center justify-center rounded-full border border-black/10 px-8 py-3 text-sm font-medium text-black transition hover:border-black"
      >
        Ver todos
      </Link>
    </div>
  );
}

export function NewsletterBand() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEmailValid || !consent) return;

    setSubmitting(true);
    setErrorMessage('');
    try {
      await apiClient.post('/auth/newsletter/subscribe/', {
        email,
        consent_lgpd: consent,
      });
      setStatus('success');
      setEmail('');
      setConsent(false);
      setTimeout(() => setStatus(null), 4000);
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err.response?.data?.email?.[0] ??
        err.response?.data?.consent_lgpd?.[0] ??
        'Não foi possível concluir a inscrição.'
      );
      setTimeout(() => setStatus(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-[1240px] px-6">
      <form onSubmit={handleSubmit}>
        <div className="grid gap-8 rounded-[20px] bg-black px-8 py-9 text-white md:grid-cols-[1fr_420px] md:items-center md:px-14">
          <h2 className="max-w-xl text-[30px] font-black uppercase leading-[1.08] md:text-[36px]">
            Cadastre-se para receber novidades
          </h2>
          <div className="grid gap-3">
            <label className="flex h-12 items-center gap-3 rounded-full bg-white px-5 text-black/45">
              <Icon name="mail" className="h-5 w-5 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu e-mail"
                className="w-full bg-transparent text-sm text-black outline-none placeholder:text-black/35"
              />
            </label>
            {status === 'success' ? (
              <p className="h-12 flex items-center justify-center rounded-full bg-[#10a545] text-sm font-medium text-white">
                Inscrito com sucesso!
              </p>
            ) : (
              <>
                <label className="flex items-start gap-2 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5"
                  />
                  Aceito receber comunicações da Shio por e-mail, conforme a Política de Privacidade.
                </label>
                <button
                  type="submit"
                  disabled={!isEmailValid || !consent || submitting}
                  className="h-12 rounded-full bg-white text-sm font-medium text-black transition hover:bg-[#f2f2f2] disabled:opacity-40"
                >
                  Inscrever-se
                </button>
                {status === 'error' && (
                  <p className="text-center text-xs text-red-400">{errorMessage}</p>
                )}
              </>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}

export function QuantityControl() {
  return (
    <div className="inline-flex h-11 items-center gap-5 rounded-full bg-[#f0f0f0] px-5 text-black">
      <button aria-label="Diminuir quantidade">
        <Icon name="minus" className="h-5 w-5" />
      </button>
      <span className="text-sm">1</span>
      <button aria-label="Aumentar quantidade">
        <Icon name="plus" className="h-5 w-5" />
      </button>
    </div>
  );
}

export function AdminPanel({ children, className = '' }) {
  return (
    <section className={`rounded-[18px] border border-black/20 bg-white ${className}`}>
      {children}
    </section>
  );
}

export function AdminTitle({ eyebrow, title, action }) {
  return (
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {eyebrow && <p className="text-[15px] text-black/55">{eyebrow}</p>}
        <h1 className="mt-2 text-[34px] font-black uppercase leading-tight text-black md:text-[42px]">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function BlackButton({ as: Component, children, to, className = '', type = 'button', ...props }) {
  const classes = `inline-flex h-12 items-center justify-center gap-3 rounded-[10px] bg-black px-7 text-sm font-bold uppercase text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:bg-black/45 ${className}`;
  if (Component) {
    return <Component to={to} className={classes} {...props}>{children}</Component>;
  }
  if (to) {
    return <Link to={to} className={classes} {...props}>{children}</Link>;
  }
  return <button type={type} className={classes} {...props}>{children}</button>;
}

export function ActionMenu({ label, items }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen(true);
  };

  const close = () => setOpen(false);

  const menu = open ? (
    <>
      <div className="fixed inset-0 z-40" onClick={close} />
      <div
        className="fixed z-50 w-52 overflow-hidden rounded-[14px] border border-black/10 bg-white shadow-lg"
        style={{ top: pos.top, right: pos.right }}
      >
        {items.map((item, i) => {
          if (item.separator) {
            return <div key={item.key ?? `sep-${i}`} className="mx-4 border-t border-black/10" />;
          }
          const cls = `flex w-full items-center gap-2.5 px-5 py-3 text-[15px] text-left ${
            item.danger
              ? 'font-semibold text-[#ff3333] hover:bg-[#fff5f5]'
              : 'text-black hover:bg-[#f5f5f5]'
          }`;
          if (item.to) {
            return (
              <Link key={item.label} to={item.to} className={cls} onClick={close}>
                {item.icon && <Icon name={item.icon} className="h-4 w-4 shrink-0" />}
                {item.label}
              </Link>
            );
          }
          return (
            <button key={item.label} type="button" className={cls} onClick={() => { close(); item.onClick?.(); }}>
              {item.icon && <Icon name={item.icon} className="h-4 w-4 shrink-0" />}
              {item.label}
            </button>
          );
        })}
      </div>
    </>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        onClick={handleOpen}
        className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-black/5"
      >
        <Icon name="more" className="h-6 w-6" />
      </button>
      {createPortal(menu, document.body)}
    </>
  );
}
