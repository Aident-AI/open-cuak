import cx from 'classnames';
// import AidentLogo from '~icons/aident-logo-white.svg'; // TODO: Add it back in

interface Props {
  className?: string;
}

export default function CompanionLogo(props: Props) {
  return (
    <div
      className={cx('absolute left-1/2 flex -translate-x-1/2 flex-col items-center justify-center', props.className)}
    >
      <div className="flex w-fit flex-col items-center justify-center">
        <div className="flex flex-row items-center justify-center">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black">
            {/* <Image className="h-5 w-5" src={AidentLogo} alt="Aident Logo" /> */}
          </div>
          <h1 className="ml-3 text-xl font-extralight text-black">Aident AI</h1>
        </div>
        <div className="mt-2 h-[0.5px] w-full bg-black"></div>
        <h1 className="ml-2 mr-2 mt-1 text-2xl font-medium tracking-wide text-black">Companion</h1>
      </div>
    </div>
  );
}
