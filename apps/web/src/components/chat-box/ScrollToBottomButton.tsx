interface Props {
  scrollToBottom: () => void;
}

export function ScrollToBottomButton({ scrollToBottom }: Props) {
  return (
    <button
      className="fixed bottom-12 left-1/2 z-50 mx-auto h-fit w-fit -translate-x-1/2 rounded-full bg-blue-600 px-2 py-1 text-xs text-white shadow-centered-light shadow-white/60"
      onClick={scrollToBottom}
    >
      View Latest
    </button>
  );
}
