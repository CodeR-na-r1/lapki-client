import { ComponentProps, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface TextSelectProps extends ComponentProps<'select'> {
  label: string;
  //value - переменная содержащая данные события, на который кликнули
  isElse: boolean;
  error?: boolean;
  errorMessage: string;
}

const options = [
  { value: 'System', label: 'System' },
  { value: 'onEnter', label: 'onEnter' },
  { value: 'onExit', label: 'onExit' },
  { value: 'LED', label: 'LED' },
  { value: 'off', label: 'off' },
  { value: 'on', label: 'on' },
];
export const TextSelect = forwardRef<HTMLSelectElement, TextSelectProps>(
  ({ label, isElse, error, errorMessage, ...props }, ref) => {
    return (
      <label
        className={twMerge('mx-1 flex flex-col ', error && 'text-red-500', isElse && 'hidden')}
      >
        {label}
        <select
          className={twMerge(
            'h-[34px] w-[200px] max-w-[200px] rounded border bg-transparent px-2 py-1 outline-none transition-colors placeholder:font-normal',
            error && 'border-red-500 placeholder:text-red-500',
            !error && 'border-neutral-200 text-neutral-50 focus:border-neutral-50'
          )}
          ref={ref}
          {...props}
        >
          {options.map((option) => (
            <option
              className="bg-neutral-800"
              key={'option' + option.value}
              value={option.value}
              label={option.label}
            />
          ))}
        </select>
        <p className="min-h-[24px] text-[14px] text-red-500">{errorMessage}</p>
      </label>
    );
  }
);
