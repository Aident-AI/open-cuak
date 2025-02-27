'use client';

import { useEffect, useState } from 'react';
import { ClaudeVariant, GeminiVariant, LlmRouterModel, LlmRouterModelHumanReadableName } from '~shared/llm/ModelRouter';
import { ALogger } from '~shared/logging/ALogger';
import { SupabaseClientForClient } from '~shared/supabase/client/SupabaseClientForClient';
import { BoundingBoxGenerator, UserConfig, UserConfigData } from '~shared/user-config/UserConfig';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function UserConfigModal(props: Props) {
  const [configData, setConfigData] = useState<UserConfigData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [showAccessKeySettings, setShowAccessKeySettings] = useState(false);
  const [textInputError, setTextInputError] = useState(false);

  const supabase = SupabaseClientForClient.createForClientComponent();

  useEffect(() => {
    if (!props.isOpen) return;

    (async () => {
      const userConfig = await UserConfig.genFetch(props.userId, supabase);
      setConfigData(userConfig);
      setIsLoading(false);
    })();
  }, [props.isOpen, props.userId]);

  const handleDataUpdate = async (newValue: object) => {
    if (!configData) throw new Error('configData should be initialized');
    const newData = {
      ...configData,
      ...newValue,
    };
    setConfigData(newData);
  };

  const handleSave = async () => {
    if (!configData) throw new Error('configData should be initialized');
    if (configData.boundingBoxGenerator === BoundingBoxGenerator.OMNI_PARSER && !configData.omniparserHost?.trim()) {
      setTextInputError(true);
      return;
    }
    setTextInputError(false);
    try {
      await UserConfig.genUpsert(props.userId, configData, supabase);
      props.onClose();
    } catch (err) {
      ALogger.error((err as Error).message);
    }
  };

  if (!props.isOpen) return null;

  const isVisionModelConfigValid = () => {
    if (!configData) return false;

    switch (configData.llmModel) {
      case LlmRouterModel.OPEN_AI:
        return !!configData.llmOpenaiApiKey;
      case LlmRouterModel.CLAUDE:
        // Check if using GCP or AWS based on variant
        const isGcpVariant = configData.llmModelVariant?.includes('GCP');
        const isAwsVariant = configData.llmModelVariant?.includes('BEDROCK');

        if (isGcpVariant) {
          return !!(configData.llmGcpProject && configData.llmGcpClientEmail && configData.llmGcpPrivateKey);
        } else if (isAwsVariant) {
          return !!(configData.llmAwsBedrockRegion && configData.llmAwsAccessKeyId && configData.llmAwsSecretAccessKey);
        }
        return false;
      case LlmRouterModel.GEMINI:
        return !!configData.llmGeminiApiKey;
      case LlmRouterModel.AZURE_OAI:
        return !!(
          configData.llmAzureOpenaiInstanceName &&
          configData.llmAzureOpenaiKey &&
          configData.llmAzureOpenaiDeployment
        );
      case LlmRouterModel.OPEN_AI_COMPATIBLE:
        return !!(configData.llmOpenaiCompatibleBaseUrl && configData.llmOpenaiCompatibleApiKey);
      default:
        return false;
    }
  };
  const renderLlmSettings = () => {
    if (!configData) return null;

    const renderSettingsContent = () => {
      if (!showAccessKeySettings) return null;

      switch (configData.llmModel) {
        case LlmRouterModel.OPEN_AI:
          return (
            <div className="space-y-2 rounded border border-gray-200 p-2">
              <div>
                <label className="block text-xs text-gray-600">OpenAI API Key</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="OpenAI API Key"
                  value={configData.llmOpenaiApiKey || ''}
                  onChange={(e) => handleDataUpdate({ llmOpenaiApiKey: e.target.value.trim() })}
                  className="w-full rounded border px-2 py-1 text-sm text-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Custom Model Name (optional)</label>
                <input
                  type="text"
                  autoComplete="new-password"
                  placeholder="Default: gpt-4o-2024-11-20"
                  value={configData.llmOpenaiModelName || ''}
                  onChange={(e) => handleDataUpdate({ llmOpenaiModelName: e.target.value.trim() })}
                  className="w-full rounded border px-2 py-1 text-sm text-black"
                />
              </div>
            </div>
          );

        case LlmRouterModel.CLAUDE:
          return (
            <div className="space-y-2 rounded border border-gray-200 p-2">
              <div>
                <label className="block text-xs text-gray-600">Claude Model Variant</label>
                <select
                  value={configData.llmModelVariant || ClaudeVariant.SONNET_3_5_GCP}
                  onChange={(e) => handleDataUpdate({ llmModelVariant: e.target.value })}
                  className="w-full rounded border px-2 py-1 text-sm text-black"
                >
                  {Object.entries(ClaudeVariant).map(([key, value]) => (
                    <option key={value} value={value}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600">GCP Project ID</label>
                <input
                  type="text"
                  autoComplete="new-password"
                  placeholder="GCP Project ID"
                  value={configData.llmGcpProject || ''}
                  onChange={(e) => handleDataUpdate({ llmGcpProject: e.target.value.trim() })}
                  className="w-full rounded border px-2 py-1 text-sm text-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">GCP Client Email</label>
                <input
                  type="text"
                  autoComplete="new-password"
                  placeholder="GCP Client Email"
                  value={configData.llmGcpClientEmail || ''}
                  onChange={(e) => handleDataUpdate({ llmGcpClientEmail: e.target.value.trim() })}
                  className="w-full rounded border px-2 py-1 text-sm text-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">GCP Private Key</label>
                <textarea
                  autoComplete="new-password"
                  placeholder="GCP Private Key"
                  value={configData.llmGcpPrivateKey || ''}
                  onChange={(e) => handleDataUpdate({ llmGcpPrivateKey: e.target.value.trim() })}
                  className="h-20 w-full rounded border px-2 py-1 text-sm text-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">GCP Client ID</label>
                <input
                  type="text"
                  autoComplete="new-password"
                  placeholder="GCP Client ID"
                  value={configData.llmGcpClientId || ''}
                  onChange={(e) => handleDataUpdate({ llmGcpClientId: e.target.value.trim() })}
                  className="w-full rounded border px-2 py-1 text-sm text-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">AWS Bedrock Region</label>
                <input
                  type="text"
                  autoComplete="new-password"
                  placeholder="AWS Bedrock Region"
                  value={configData.llmAwsBedrockRegion || ''}
                  onChange={(e) => handleDataUpdate({ llmAwsBedrockRegion: e.target.value.trim() })}
                  className="w-full rounded border px-2 py-1 text-sm text-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">AWS Access Key ID</label>
                <input
                  type="text"
                  autoComplete="new-password"
                  placeholder="AWS Access Key ID"
                  value={configData.llmAwsAccessKeyId || ''}
                  onChange={(e) => handleDataUpdate({ llmAwsAccessKeyId: e.target.value.trim() })}
                  className="w-full rounded border px-2 py-1 text-sm text-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">AWS Secret Access Key</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="AWS Secret Access Key"
                  value={configData.llmAwsSecretAccessKey || ''}
                  onChange={(e) => handleDataUpdate({ llmAwsSecretAccessKey: e.target.value.trim() })}
                  className="w-full rounded border px-2 py-1 text-sm text-black"
                />
              </div>
            </div>
          );

        case LlmRouterModel.GEMINI:
          return (
            <div className="space-y-2 rounded border border-gray-200 p-2">
              <div>
                <label className="block text-xs text-gray-600">Gemini Model Variant</label>
                <select
                  value={configData.llmModelVariant || GeminiVariant.FLASH_2_0}
                  onChange={(e) => handleDataUpdate({ llmModelVariant: e.target.value })}
                  className="w-full rounded border px-2 py-1 text-sm text-black"
                >
                  {Object.entries(GeminiVariant).map(([key, value]) => (
                    <option key={value} value={value}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600">Gemini API Key</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Gemini API Key"
                  value={configData.llmGeminiApiKey || ''}
                  onChange={(e) => handleDataUpdate({ llmGeminiApiKey: e.target.value.trim() })}
                  className="w-full rounded border px-2 py-1 text-sm text-black"
                />
              </div>
            </div>
          );

        case LlmRouterModel.AZURE_OAI:
          return (
            <div className="space-y-2 rounded border border-gray-200 p-2">
              <div>
                <label className="block text-xs text-gray-600">Azure OpenAI Instance Name</label>
                <input
                  type="text"
                  autoComplete="new-password"
                  placeholder="Azure OpenAI Instance Name"
                  value={configData.llmAzureOpenaiInstanceName || ''}
                  onChange={(e) => handleDataUpdate({ llmAzureOpenaiInstanceName: e.target.value.trim() })}
                  className="w-full rounded border px-2 py-1 text-sm text-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Azure OpenAI Key</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Azure OpenAI Key"
                  value={configData.llmAzureOpenaiKey || ''}
                  onChange={(e) => handleDataUpdate({ llmAzureOpenaiKey: e.target.value.trim() })}
                  className="w-full rounded border px-2 py-1 text-sm text-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Azure OpenAI Deployment</label>
                <input
                  type="text"
                  autoComplete="new-password"
                  placeholder="Azure OpenAI Deployment"
                  value={configData.llmAzureOpenaiDeployment || ''}
                  onChange={(e) => handleDataUpdate({ llmAzureOpenaiDeployment: e.target.value.trim() })}
                  className="w-full rounded border px-2 py-1 text-sm text-black"
                />
              </div>
            </div>
          );

        case LlmRouterModel.OPEN_AI_COMPATIBLE:
          return (
            <div className="space-y-2 rounded border border-gray-200 p-2">
              <div>
                <label className="block text-xs text-gray-600">Base URL</label>
                <input
                  type="text"
                  autoComplete="new-password"
                  placeholder="baseUrl"
                  value={configData.llmOpenaiCompatibleBaseUrl || ''}
                  onChange={(e) => handleDataUpdate({ llmOpenaiCompatibleBaseUrl: e.target.value.trim() })}
                  className="w-full rounded border px-2 py-1 text-sm text-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">API Key</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="apiKey"
                  value={configData.llmOpenaiCompatibleApiKey || ''}
                  onChange={(e) => handleDataUpdate({ llmOpenaiCompatibleApiKey: e.target.value.trim() })}
                  className="w-full rounded border px-2 py-1 text-sm text-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Model Name (optional)</label>
                <input
                  type="text"
                  autoComplete="new-password"
                  placeholder="Custom model name"
                  value={configData.llmModelVariant || ''}
                  onChange={(e) => handleDataUpdate({ llmModelVariant: e.target.value.trim() })}
                  className="w-full rounded border px-2 py-1 text-sm text-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Endpoint Name (optional)</label>
                <input
                  type="text"
                  autoComplete="new-password"
                  placeholder="Default: openai-compatible"
                  value={configData.llmOpenaiCompatibleApiName || ''}
                  onChange={(e) => handleDataUpdate({ llmOpenaiCompatibleApiName: e.target.value.trim() })}
                  className="w-full rounded border px-2 py-1 text-sm text-black"
                />
              </div>
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <div className="mt-2 space-y-2">
        <button
          type="button"
          onClick={() => setShowAccessKeySettings(!showAccessKeySettings)}
          className="text-xs text-blue-500 underline"
        >
          {showAccessKeySettings ? 'Hide' : 'Show'} Access Key Settings
        </button>
        {renderSettingsContent()}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-96 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-bold text-black">Configurations</h2>
        {isLoading || !configData ? (
          <div className="flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
          </div>
        ) : (
          <form>
            {/* Bounding Box Generator section */}
            <div className="mb-4">
              <label className="block text-gray-700">Bounding Box Generator</label>
              <select
                value={configData.boundingBoxGenerator}
                onChange={(e) => handleDataUpdate({ boundingBoxGenerator: e.target.value as BoundingBoxGenerator })}
                className="mt-2 w-full rounded border px-2 py-1 text-sm text-black"
              >
                {Object.values(BoundingBoxGenerator).map((generator) => (
                  <option key={generator} value={generator}>
                    {generator}
                  </option>
                ))}
              </select>
              {configData.boundingBoxGenerator === BoundingBoxGenerator.OMNI_PARSER && (
                <input
                  type="text"
                  autoComplete="new-password"
                  placeholder="Enter OmniParser Host"
                  value={configData.omniparserHost || ''}
                  onChange={(e) => {
                    setTextInputError(false);
                    handleDataUpdate({ omniparserHost: e.target.value.trim() });
                  }}
                  className={`mt-2 w-full rounded border px-2 py-1 text-sm text-black ${
                    textInputError ? 'border-red-500 bg-red-50' : ''
                  }`}
                  required
                />
              )}
            </div>

            <div className="mb-4">
              <label className="flex items-center justify-between text-gray-700">
                <span>Vision Model</span>
                <span
                  className={`ml-2 flex items-center ${
                    isVisionModelConfigValid() ? 'text-green-500' : 'cursor-pointer text-gray-300'
                  }`}
                  onClick={isVisionModelConfigValid() ? undefined : () => setShowAccessKeySettings(true)}
                  title={isVisionModelConfigValid() ? 'Configuration is valid' : 'Click to configure access keys'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="ml-1 text-xs">{isVisionModelConfigValid() ? 'Valid' : 'Invalid'}</span>
                </span>
              </label>
              <select
                value={configData.llmModel || LlmRouterModel.OPEN_AI}
                onChange={(e) => {
                  handleDataUpdate({ llmModel: e.target.value as LlmRouterModel });
                  setShowAccessKeySettings(false); // Hide access key settings when model changes
                }}
                className="mt-2 w-full rounded border px-2 py-1 text-sm text-black"
              >
                {Object.values(LlmRouterModel)
                  .filter((i) => i !== LlmRouterModel.VLLM)
                  .map((model) => (
                    <option key={model} value={model}>
                      {LlmRouterModelHumanReadableName[model]}
                    </option>
                  ))}
              </select>
              {renderLlmSettings()}
            </div>

            <div className="mb-4">
              <label className="flex items-center justify-between text-gray-700">
                <span>Save and apply cookies</span>
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={configData.autoSaveAndApplyCookies}
                    onChange={(e) => handleDataUpdate({ autoSaveAndApplyCookies: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-blue-300"></div>
                </div>
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={props.onClose}
                className="mr-2 rounded border-2 border-blue-500 bg-transparent px-4 py-1 text-blue-500"
              >
                Cancel
              </button>
              <button type="button" onClick={handleSave} className="rounded bg-blue-500 px-4 py-1 text-white">
                Save
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
