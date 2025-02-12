import cx from 'classnames';

interface Props {
  dotClassName?: string;
}

export const LoadingDots = (props: Props) => {
  const docClassName = cx('h-2 w-2 animate-bounce rounded-full bg-sky-600/95', props.dotClassName);

  return (
    <div className="flex h-fit w-fit items-center justify-center space-x-1 pb-1 pr-1 pt-1.5 dark:invert">
      <span className="sr-only">Loading...</span>
      <div className={cx('[animation-delay:-0.3s]', docClassName)} />
      <div className={cx('[animation-delay:-0.15s]', docClassName)} />
      <div className={cx(docClassName)} />
    </div>
  );
};
