export interface VaultEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type VaultEntryInput = Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>;
