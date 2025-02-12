import cx from 'classnames';

interface Props {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function DefaultButton({ children, className, onClick }: Props) {
  return (
    <button
      className={cx(
        'text-medium absolute left-1/2 flex h-12 w-48 origin-left -translate-x-1/2 animate-fade items-center justify-center rounded-xl bg-white text-base font-thin tracking-wide text-black shadow-2xl shadow-neutral-600',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
