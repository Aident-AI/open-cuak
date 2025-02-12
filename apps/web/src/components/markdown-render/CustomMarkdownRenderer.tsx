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
  };

  return <ReactMarkdown components={customComponents}>{content}</ReactMarkdown>;
};

export default CustomMarkdownRenderer;
