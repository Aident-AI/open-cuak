import { Tooltip } from '@mui/material';
import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';

interface Props {
  content: string | undefined;
  tooltipSource?: Map<string, string>;
}

const TooltipLink = ({ title, children, ...rest }: React.ComponentPropsWithoutRef<'a'>) => {
  return (
    <Tooltip title={title}>
      <span>
        <a {...rest}>{children}</a>
      </span>
    </Tooltip>
  );
};

export const CustomMarkdownRenderer = ({ content, tooltipSource }: Props) => {
  const customComponents: Components = {
    a: ({ ...props }) => {
      const href = props.href ?? '';
      const title = props.title ?? '';
      const isTooltipLink = href === '#tooltip';

      if (isTooltipLink) {
        return (
          <TooltipLink {...props} title={tooltipSource?.get(title) ?? ''} href="#">
            {props.children}
          </TooltipLink>
        );
      }

      return <a {...props} />;
    },
    blockquote: ({ children }) => (
      <blockquote className="my-2 border-white/70 text-sm font-extralight not-italic text-gray-500">
        {children}
      </blockquote>
    ),
    p: ({ children }) => <p className="my-0">{children}</p>,
  };

  return <ReactMarkdown components={customComponents}>{content}</ReactMarkdown>;
};

export default CustomMarkdownRenderer;
