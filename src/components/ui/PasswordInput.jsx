import { useId, useState } from 'react';
import { Icon } from './ShioDesign';

// Campo de senha com rótulo visível e botão de olho para mostrar/ocultar.
// O nome do botão não muda; o estado vai no aria-pressed.
const PasswordInput = ({ label, error, className = '', ...inputProps }) => {
  const id = useId();
  const errorId = `${id}-erro`;
  const [visible, setVisible] = useState(false);

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-black">
        {label}
      </label>
      <div className="relative">
        <input
          {...inputProps}
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="w-full rounded-md border border-gray-300 p-3 pr-12 text-sm focus:border-black focus:outline-none aria-[invalid=true]:border-shio-danger"
        />
        <button
          type="button"
          aria-label="Mostrar senha"
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-shio-muted hover:text-black"
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} />
        </button>
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-[13px] text-shio-danger">
          {error}
        </p>
      )}
    </div>
  );
};

export default PasswordInput;
