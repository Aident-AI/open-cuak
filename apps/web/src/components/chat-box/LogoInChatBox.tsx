import cx from 'classnames';
import Image from 'next/image';
import AidentLogo from '~assets/aident-logo-white.svg';

interface Props {
  title?: string;
  titleClassName?: string;
  subtitle?: string;
  subtitleClassName?: string;

  handleButtonPress?: () => void;
  handleButtonRelease?: () => void;
}

export function LogoInChatBox(props: Props) {
  return (
    <div className="absolute left-1/2 top-1/3 flex w-full -translate-x-1/2 flex-col items-center justify-center transition-all duration-500">
      <div className="flex w-fit flex-col items-center justify-center">
        <div className="flex flex-row items-center justify-center">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black"
            onMouseDown={props.handleButtonPress}
            onMouseUp={props.handleButtonRelease}
            onMouseLeave={props.handleButtonRelease} // In case the mouse leaves the button before release
            onTouchStart={props.handleButtonPress} // For touch devices
            onTouchEnd={props.handleButtonRelease} // For touch devices
          >
            <Image className="h-5 w-5" src={AidentLogo} alt="Aident Logo" />
          </div>
          <h1 className={cx('ml-3 text-xl font-extralight text-black', props.titleClassName)}>
            {props.title || 'Aident AI'}
          </h1>
        </div>
        <div className="mt-2 h-[0.5px] w-full bg-black"></div>
        <h1
          className={cx(
            'ml-2 mr-2 mt-1 text-center text-2xl font-medium tracking-wider text-black',
            props.subtitleClassName,
          )}
        >
          {props.subtitle || 'Companion'}
        </h1>
      </div>
    </div>
  );
}
