import cx from 'classnames';

interface Props {
  text: string;

  className?: string;
  disabled?: boolean;
  loadingText?: string;
  onClick?: () => void;
}

export function MainCardButton(props: Props) {
  const buttonText = !props.disabled ? props.text : (props.loadingText ?? 'Loading...');
  return (
    <button
      className={cx('flex w-full items-center justify-between rounded-xl bg-blue-300 p-2', props.className)}
      disabled={props.disabled}
      onClick={() => props.onClick?.()}
    >
      <p className={cx('w-full text-center', props.disabled ? 'text-white/60' : 'text-white')}>{buttonText}</p>
    </button>
  );
}
