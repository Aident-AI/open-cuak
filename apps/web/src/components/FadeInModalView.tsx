import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import cx from 'classnames';
import { Fragment } from 'react';

interface Props {
  children: React.ReactNode;
  modalTitle: string;
  modalIsOpen: boolean;
  closeModal: () => void;

  bgClassName?: string;
}

export function FadeInModalView(props: Props) {
  return (
    <Transition appear show={props.modalIsOpen} as={Fragment}>
      <Dialog
        as="div"
        className="z-1 relative"
        onClose={() => {
          // do nothing to allow dismiss alerts.
          // TODO: fix this for a proper z-index ordering
        }}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className={cx('fixed inset-0 bg-black bg-opacity-75', props.bgClassName)} />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-[0_5px_85px_-12px] shadow-blue-600 transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  {props.modalTitle}
                </Dialog.Title>
                <XMarkIcon
                  className="absolute right-3 top-3 h-6 w-6 cursor-pointer text-gray-400 hover:text-gray-500"
                  onClick={props.closeModal}
                />
                {props.children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
