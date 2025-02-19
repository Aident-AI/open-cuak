import { create } from 'zustand';
import { AiAgentSOP, AiAgentSOPSchema } from '~shared/sop/AiAgentSOP';
import { SupabaseClientForClient } from '~shared/supabase/client/SupabaseClientForClient';

interface SopStore {
  sops: AiAgentSOP[];
  isLoading: boolean;
  error: string | null;
  fetchSops: () => Promise<void>;
}

const supabase = SupabaseClientForClient.createForClientComponent();

export const useSopStore = create<SopStore>((set) => ({
  sops: [],
  isLoading: false,
  error: null,
  fetchSops: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase.from('prebuilt_sops').select('*');
    if (error) {
      set({ error: error.message, isLoading: false });
    } else {
      const parsedSops = data.map((sop) => AiAgentSOPSchema.parse(sop));
      set({ sops: parsedSops, isLoading: false, error: null });
    }
  },
}));
