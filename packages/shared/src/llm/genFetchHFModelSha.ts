export const genFetchHFModelSha = async (modelName: string): Promise<string> => {
  const apiUrl = `https://huggingface.co/api/models/${modelName}`;
  const token = process.env.HUGGINGFACE_API_TOKEN;
  const response = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}` } });

  if (!response.ok) throw new Error(`Failed to fetch model data: ${response.status} ${response.statusText}`);
  const data = await response.json();
  if (!data.siblings) throw new Error('No siblings found in model data');
  const { sha } = data;
  if (!sha) throw new Error('No sha found in model data');

  return sha;
};
