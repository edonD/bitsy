export interface EvidenceItem {
  id: string;
  claim: string;
  paper: string;
  venue: string;
  url: string;
  finding: string;
}

export interface ChannelItem {
  kind: string;
  where: string;
  evidence: EvidenceItem[];
}

export interface AmpRow {
  domain: string;
  target_cite_count: number;
  peer_cite_counts: Record<string, number>;
  total_peer_cites: number;
  gap: number;
  pitch_angle: string;
  evidence: EvidenceItem[];
}

export interface PairingItem {
  what: string;
  why: string;
  evidence: EvidenceItem[];
}

export interface TimingItem {
  ship_by: string;
  refresh_cadence_days: number;
  rationale: string;
  evidence: EvidenceItem[];
}

export interface BlogOutlineRow {
  heading: string;
  wordcount: number;
  note?: string | null;
}

export interface BlogTemplate {
  id: string;
  title: string;
  premise: string;
  why_this_works: string;
  outline: BlogOutlineRow[];
  target_word_count: number;
  effort_hours: number;
  evidence: EvidenceItem[];
}

export interface Playbook {
  brand: string;
  feature: string;
  query: string | null;
  user_value: number;
  leader_value: number;
  leader_brand: string | null;
  content_patch: { text: string; char_count: number; evidence: EvidenceItem[] };
  channels: ChannelItem[];
  amplification: AmpRow[];
  content_pairing: PairingItem[];
  blog_templates: BlogTemplate[];
  timing: TimingItem;
  summary: string;
  evidence_library_size: number;
}
