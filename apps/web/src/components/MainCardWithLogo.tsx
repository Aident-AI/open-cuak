import cx from 'classnames';
import Image from 'next/image';
import AidentLogo from '~assets/aident-logo-white.svg';

interface Props {
  children: React.ReactNode;
  className?: string;
}

export default function MainCardWithLogo(props: Props) {
  return (
    <div className="m-auto flex max-h-screen flex-col items-center justify-center rounded-xl p-2">
      <div className="z-50 flex items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black">
          <Image className="h-9 w-9" src={AidentLogo} alt="Aident Logo" />
        </div>
        <h1 className="ml-4 text-2xl font-extralight text-black">Aident AI</h1>
      </div>

      <div
        className={cx(
          'z-50 mt-8 flex w-full flex-col items-center justify-center overflow-scroll rounded-xl bg-white px-4 py-8 shadow-2xl shadow-neutral-600 plus:w-72 plus:px-6 tablet:w-96 tablet:px-12 tablet:py-12',
          props.className,
        )}
      >
        {props.children}
      </div>
    </div>
  );
}
