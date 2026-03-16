import { sleep } from './index';

export type KgUploadResp = {
  document_ids: string[];
  meta?: { filename: string; pages?: number; size?: number }[];
};

export type KgEntity = {
  name: string;
  type: string;
  capec_id?: string;
  mitre_attack_id?: string;
  cve?: string;
};

export type KgTriple = {
  head: string;
  relation: string;
  tail: string;
};

export type KgExtractResp = {
  status: 'running' | 'completed';
  entities: KgEntity[];
  triples: KgTriple[];
  logs: string[];
};

export async function mockKgUpload(files: File[], _chunk_size: number): Promise<KgUploadResp> {
  await sleep(600);
  const document_ids = files.map((_, i) => `doc_${Date.now()}_${i}`);
  return {
    document_ids,
    meta: files.map((file) => ({ filename: file.name, size: file.size })),
  };
}

export async function mockKgExtract(params: {
  document_ids: string[];
  llm_model: string;
}): Promise<KgExtractResp> {
  await sleep(900);

  const logs = [
    `开始抽取，模型: ${params.llm_model}`,
    `分块数量: ${params.document_ids.length * 3}`,
    '抽取实体: 恶意IP / 漏洞CVE / 攻击技术 / 组织',
    '实体消歧与合并完成',
    '三元组写入完成',
  ];

  const entities = [
    { name: 'APT29', type: 'ThreatActor', capec_id: 'CAPEC-17' },
    { name: 'CVE-2023-23397', type: 'Vulnerability', cve: 'CVE-2023-23397' },
    { name: 'T1059', type: 'ATTACK_Technique', mitre_attack_id: 'T1059' },
    { name: '185.220.101.1', type: 'IP' },
  ];

  const triples = [
    { head: 'APT29', relation: 'uses', tail: 'T1059' },
    { head: 'APT29', relation: 'exploits', tail: 'CVE-2023-23397' },
    { head: '185.220.101.1', relation: 'mapped_to', tail: 'APT29' },
  ];

  return {
    status: 'completed',
    entities,
    triples,
    logs,
  };
}
