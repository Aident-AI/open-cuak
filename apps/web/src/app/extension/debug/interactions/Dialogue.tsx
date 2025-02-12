'use client';

import { FormControlLabel, Switch, TextField, Tooltip } from '@mui/material';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { RequestBodyObject, SchemaObject } from 'openapi3-ts/oas31';
import React, { useState } from 'react';
import { getHost } from '~shared/env/environment';
import { X_REMOTE_BROWSER_SESSION_ID_HEADER } from '~shared/http/headers';
import { ALogger } from '~shared/logging/ALogger';

interface ParsedSchema {
  name: string;
  type: string;
  required: boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default?: any;
  description?: string;
}

export const parseRequestBody = (request: RequestBodyObject): ParsedSchema[] => {
  const content = request.content['application/json'];
  if (!content) {
    throw new Error('Only application/json content is supported.');
  }

  const schema = content.schema as SchemaObject;
  const properties = schema.properties as { [key: string]: SchemaObject };
  const requiredFields = schema.required || [];

  return Object.keys(properties).map((key) => ({
    name: key,
    required: requiredFields.includes(key),
    type: properties[key].type as string,
    default: properties[key].default,
    description: properties[key].description,
  }));
};

interface PopupDialogProps {
  handleClose: () => void;
  open: boolean;
  title: string;

  api?: string;
  children?: React.ReactNode;
  handleResponse?: (response: unknown) => void;
  schema?: ParsedSchema[];
  summary?: string;
  execSessionId?: string;
}

export default function PopupDialog(props: PopupDialogProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<{ [key: string]: any }>({});

  const handleStringChange =
    (name: string) => (event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) =>
      setFormData({ ...formData, [name]: event.target.value });
  const handleNumberChange =
    (name: string) => (event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) =>
      setFormData({ ...formData, [name]: Number(event.target.value) });

  const onSubmit = async (event: React.FormEvent) => {
    if (!props.api) throw new Error('No URL provided for form submission.');

    event.preventDefault();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (props.execSessionId) headers[X_REMOTE_BROWSER_SESSION_ID_HEADER] = props.execSessionId;
    const rsp = await fetch(getHost() + props.api, { method: 'POST', headers, body: JSON.stringify(formData) });
    if (!rsp.ok) {
      const error = 'web search request failed: ' + rsp.statusText;
      ALogger.error(error);
      if (props.handleResponse) props.handleResponse({ error });
      return;
    }

    const json = await rsp.json();
    ALogger.info({ context: 'popup dialogue response', response: json });
    if (props.handleResponse) props.handleResponse(json);
  };

  const renderField = (field: ParsedSchema) => {
    switch (field.type) {
      case 'string':
        return (
          <TextField
            fullWidth
            label={field.name}
            margin="normal"
            onChange={handleStringChange(field.name)}
            placeholder={field.default}
            required={field.required}
          />
        );
      case 'number':
        return (
          <TextField
            fullWidth
            label={field.name}
            margin="normal"
            onChange={handleNumberChange(field.name)}
            placeholder={field.default}
            required={field.required}
            type="number"
          />
        );
      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={formData[field.name] || false}
                onChange={(_, checked) => setFormData({ ...formData, [field.name]: checked })}
              />
            }
            label={field.name}
          />
        );
      default:
        ALogger.warn({ context: 'Unsupported field type', type: field.type });
        return null;
    }
  };
  const renderRequestForm = () => {
    if (!props.schema) return null;

    return props.schema.map((field) => (
      <Tooltip
        key={field.name}
        placement="bottom"
        arrow
        title={<p className="text-xs">{field.description}</p>}
        enterDelay={500}
      >
        <div>{renderField(field)}</div>
      </Tooltip>
    ));
  };

  return (
    <Dialog fullWidth open={props.open} onClose={props.handleClose}>
      <DialogTitle fontSize={18}>{props.title}</DialogTitle>
      <form onSubmit={onSubmit}>
        <DialogContent>
          <DialogContentText fontSize={14}>{props.summary}</DialogContentText>
          {props.children}
          {renderRequestForm()}
        </DialogContent>
        <DialogActions>
          <Button type="submit" color="primary" variant="outlined">
            Send
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
