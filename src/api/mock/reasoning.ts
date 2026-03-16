import { sleep } from './index';

export type ReasoningNode = {
  id: string;
  name: string;
  type: string;
  properties?: Record<string, any>;
};

export type ReasoningEdge = {
  source_id: string;
  target_id: string;
  type: string;
  label?: string;
};

export type SubgraphResp = {
  nodes: ReasoningNode[];
  edges: ReasoningEdge[];
};

export type PredictedEdge = {
  source: string;
  target: string;
  relation: string;
  confidence: number;
};

export type ReasoningPredictResp = {
  predicted_edges: PredictedEdge[];
  logs: { step: number; action: string; score: number }[];
};

export async function mockReasoningSubgraph(_params: {
  entity_id: string;
  max_hops: number;
}): Promise<SubgraphResp> {
  await sleep(500);

  const nodes: ReasoningNode[] = [
    { id: 'apt29', name: 'APT29', type: 'ThreatActor' },
    { id: 'cve1', name: 'CVE-2023-23397', type: 'Vulnerability' },
    { id: 't1059', name: 'T1059', type: 'ATTACK_Technique' },
    { id: 'ip1', name: '185.220.101.1', type: 'IP' },
    { id: 'mal1', name: 'CobaltStrike', type: 'Malware' },
    { id: 'host1', name: 'Server-192', type: 'Host' },
  ];

  const edges: ReasoningEdge[] = [
    { source_id: 'apt29', target_id: 't1059', type: 'uses' },
    { source_id: 'apt29', target_id: 'cve1', type: 'exploits' },
    { source_id: 'apt29', target_id: 'ip1', type: 'uses' },
    { source_id: 'ip1', target_id: 'host1', type: 'connects_to' },
    { source_id: 'mal1', target_id: 'host1', type: 'deployed_on' },
  ];

  return { nodes, edges };
}

export async function mockReasoningPredict(_params: {
  subgraph_data: SubgraphResp;
}): Promise<ReasoningPredictResp> {
  await sleep(1200);

  const predicted_edges: PredictedEdge[] = [
    { source: 'apt29', target: 'mal1', relation: 'uses', confidence: 0.92 },
    { source: 'cve1', target: 'host1', relation: 'leads_to', confidence: 0.85 },
    { source: 't1059', target: 'mal1', relation: 'delivers', confidence: 0.78 },
  ];

  const logs = [
    { step: 1, action: 'obs:apt29 → t1059', score: 0.95 },
    { step: 2, action: 'act:pred_candidate[mal1]', score: 0.88 },
    { step: 3, action: 'intervention:remove(ip1)', score: 0.72 },
    { step: 4, action: 'final:pred_edges', score: 0.91 },
  ];

  return { predicted_edges, logs };
}
