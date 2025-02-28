'use client';

import { useRouter } from 'next/navigation';

interface Props {
  targetPath?: string;
  title?: string;
}

export default function NavigationButton(props: Props) {
  const router = useRouter();

  return (
    <button
      onClick={() => (props.targetPath ? router.push(props.targetPath) : router.back())}
      className="text-foreground bg-btn-background hover:bg-btn-background-hover group absolute left-8 top-8 z-50 flex items-center rounded-md px-4 py-2 text-sm text-white no-underline"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>{' '}
      {props.title || 'Back'}
    </button>
  );
}
