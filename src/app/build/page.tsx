'use client';

import React, { useMemo, useState } from 'react';
import { Button, Card, Divider, InputNumber, Select, Space, Typography, message } from 'antd';
import UploadDropzone from '@/components/UploadDropzone';
import ProcessLogPanel from '@/components/ProcessLogPanel';
import EntityRelationTables from '@/components/EntityRelationTables';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import { KgAPI } from '@/api';

const { Title, Paragraph, Text } = Typography;

const MODEL_OPTIONS = [
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'DeepSeek-V3', value: 'deepseek-v3' },
  { label: 'DeepSeek-Chat', value: 'deepseek-chat' },
];

export default function BuildPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [chunkSize, setChunkSize] = useState<number>(4096);
  const [llmModel, setLlmModel] = useState<string>('deepseek-v3');

  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingExtract, setLoadingExtract] = useState(false);

  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const [entities, setEntities] = useState<any[]>([]);
  const [triples, setTriples] = useState<any[]>([]);

  const graphData = useMemo(() => {
    const nodeNameSet = new Set<string>();
    const nodes: any[] = [];

    const ensureNode = (name: string) => {
      if (!name || nodeNameSet.has(name)) return;
      nodeNameSet.add(name);
      // 尽量从 entities 找类型与属性
      const e = entities.find((x) => x.name === name);
      nodes.push({
        id: name,
        name,
        properties: e
          ? {
              type: e.type,
              capec_id: e.capec_id,
              mitre_attack_id: e.mitre_attack_id,
              cve: e.cve,
            }
          : undefined,
      });
    };

    triples.forEach((t) => {
      ensureNode(t.head);
      ensureNode(t.tail);
    });

    // 如果 triples 为空但 entities 有数据，也把实体作为孤立点显示
    if (triples.length === 0) {
      entities.forEach((e) => ensureNode(e.name));
    }

    const edges = triples.map((t: any) => ({
      source_id: t.head,
      target_id: t.tail,
      type: t.relation,
    }));

    return { nodes, edges };
  }, [entities, triples]);

  const appendLog = (line: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`]);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      message.warning('请先选择要上传的文件');
      return;
    }

    setLoadingUpload(true);
    setLogs([]);
    setEntities([]);
    setTriples([]);
    setDocumentIds([]);

    try {
      appendLog(`开始上传 ${files.length} 个文件...`);
      const resp = await KgAPI.upload({ files, chunk_size: chunkSize });
      setDocumentIds(resp.document_ids);
      appendLog(`上传完成，得到 document_ids: ${resp.document_ids.join(', ')}`);
      message.success('上传成功');
    } catch (e: any) {
      console.error(e);
      message.error('上传失败');
      appendLog(`上传失败：${e?.message ?? String(e)}`);
    } finally {
      setLoadingUpload(false);
    }
  };

  const handleExtract = async () => {
    if (documentIds.length === 0) {
      message.warning('请先上传文件并获得 document_ids');
      return;
    }

    setLoadingExtract(true);
    try {
      appendLog('开始抽取与构建知识图谱...');
      const resp = await KgAPI.extract({ document_ids: documentIds, llm_model: llmModel });

      resp.logs?.forEach((l) => appendLog(l));
      setEntities(resp.entities || []);
      setTriples(resp.triples || []);

      appendLog('构建完成');
      message.success('抽取完成');
    } catch (e: any) {
      console.error(e);
      message.error('抽取失败');
      appendLog(`抽取失败：${e?.message ?? String(e)}`);
    } finally {
      setLoadingExtract(false);
    }
  };

  return (
    <div className="h-full w-full p-6 overflow-auto bg-slate-50">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <Title level={3} className="!mb-1">
              威胁情报知识图谱构建（Build）
            </Title>
            <Paragraph type="secondary" className="!mb-0">
              上传威胁情报文档 → 智能分块 → 实体/关系抽取 → 消歧合并 → 三元组入库
            </Paragraph>
          </div>

          <Space wrap>
            <Button onClick={() => {
              setFiles([]);
              setLogs([]);
              setEntities([]);
              setTriples([]);
              setDocumentIds([]);
            }}>
              重置
            </Button>
            <Button type="primary" loading={loadingUpload} onClick={handleUpload}>
              1) 上传与预处理
            </Button>
            <Button type="primary" loading={loadingExtract} disabled={documentIds.length === 0} onClick={handleExtract}>
              2) 抽取与构建
            </Button>
          </Space>
        </div>

        <Divider />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-1 space-y-4">
            <Card size="small" title="输入与参数">
              <div className="space-y-4">
                <UploadDropzone
                  value={{ files }}
                  onChange={(v) => setFiles(v.files)}
                  accept=".pdf,.txt,.json"
                  multiple
                />

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Text className="text-sm text-slate-600">分块阈值（Tokens）</Text>
                    <InputNumber
                      min={512}
                      max={16384}
                      step={256}
                      value={chunkSize}
                      onChange={(v) => setChunkSize(Number(v ?? 4096))}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Text className="text-sm text-slate-600">大模型</Text>
                    <Select
                      style={{ width: 180 }}
                      value={llmModel}
                      onChange={setLlmModel}
                      options={MODEL_OPTIONS}
                    />
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  当前 document_ids：{documentIds.length ? documentIds.join(', ') : '未生成'}
                </div>
              </div>
            </Card>

            <ProcessLogPanel logs={logs} />
          </div>

          <div className="xl:col-span-2 space-y-4">
            <EntityRelationTables entities={entities} triples={triples} />

            <Card size="small" title="知识图谱可视化预览">
              <div className="h-[520px]">
                <KnowledgeGraph data={graphData} loading={loadingExtract} />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
