'use client';

import { XMarkIcon } from '@heroicons/react/24/solid';
import { Snackbar } from '@mui/material';
import cx from 'classnames';
import { useRouter } from 'next/navigation';
import { getHost } from '~shared/env/environment';
import DefaultButton from '~src/app/extension/home/DefaultButton';

export interface ListButtonProps {
  text: string;
  onClick: () => void;
}

export interface ButtonListPageProps {
  buttons: ListButtonProps[];
  buttonMargin?: 'small' | 'normal' | 'large';
  buttonsClassName?: string;
  listClassName?: string;
  placeholder?: string;
  snackbar?: {
    actionButton?: JSX.Element;
    message: string | undefined;
    onClose: () => void;
  };
  onClose?: () => void;
}

export default function ButtonListPage(props: ButtonListPageProps) {
  const router = useRouter();

  const renderSnackbar = () => {
    if (!props.snackbar) return null;
    return (
      <Snackbar
        action={props.snackbar?.actionButton}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        autoHideDuration={3000}
        message={props.snackbar.message}
        onClose={props.snackbar.onClose}
        open={!!props.snackbar.message}
      />
    );
  };
  const renderButtons = () => {
    if (props.buttons.length < 1) return <p>{props?.placeholder ?? 'Loading...'}</p>;

    const addButton = (index: number, text: string, onClick: () => void) => (
      <div
        key={index.toString()}
        className={cx(
          'h-fit w-full items-center justify-center first:mt-0 last:mb-0',
          props.buttonMargin === 'small' ? 'my-1' : props.buttonMargin === 'large' ? 'my-5' : 'my-3',
        )}
      >
        <DefaultButton
          className={`relative w-64 overflow-y-hidden overflow-x-scroll bg-sky-200 animate-delay-100`}
          onClick={onClick}
        >
          {text}
        </DefaultButton>
      </div>
    );

    return (
      <div
        className={cx(
          'flex h-full w-full flex-col items-center justify-start overflow-x-hidden overflow-y-scroll pb-4 pt-4',
          props.listClassName,
        )}
      >
        {props.buttons.map((button, index) => addButton(index, button.text, button.onClick))}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-transparent">
      <XMarkIcon
        className="absolute right-4 top-4 h-6 w-6 cursor-pointer text-white"
        onClick={props.onClose ?? (() => router.push(getHost() + '/extension/home'))}
      />

      {renderSnackbar()}
      {renderButtons()}
    </div>
  );
}
