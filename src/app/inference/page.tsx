'use client';

import React, { useMemo, useState } from 'react';
import { Button, Card, Divider, Input, InputNumber, Space, Typography, message } from 'antd';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import { ReasoningAPI } from '@/api';

const { Title, Paragraph, Text } = Typography;

export default function InferencePage() {
  const [entityId, setEntityId] = useState<string>('APT29');
  const [maxHops, setMaxHops] = useState<number>(6);

  const [loadingSubgraph, setLoadingSubgraph] = useState(false);
  const [loadingPredict, setLoadingPredict] = useState(false);

  const [subgraph, setSubgraph] = useState<any | null>(null);
  const [predictedEdges, setPredictedEdges] = useState<{
    source: string;
    target: string;
    relation: string;
    confidence: number;
  }[]>([]);
  const [logs, setLogs] = useState<{ step: number; action: string; score: number }[]>([]);

  const baseGraphData = useMemo(() => {
    if (!subgraph) return { nodes: [], edges: [] };

    const nodes = (subgraph.nodes || []).map((n: any) => ({
      id: n.id,
      name: n.name,
      properties: { type: n.type, ...(n.properties || {}) },
    }));

    const edges = (subgraph.edges || []).map((e: any) => ({
      source_id: e.source_id,
      target_id: e.target_id,
      type: e.type,
    }));

    return { nodes, edges };
  }, [subgraph]);

  const inferredGraphData = useMemo(() => {
    if (!subgraph) return { nodes: [], edges: [] };

    const base = baseGraphData;

    // 在原有边基础上追加推理边
    const extraEdges = predictedEdges.map((e) => ({
      source_id: e.source,
      target_id: e.target,
      type: `${e.relation} (pred: ${(e.confidence * 100).toFixed(1)}%)`,
    }));

    return {
      nodes: base.nodes,
      edges: [...base.edges, ...extraEdges],
    };
  }, [baseGraphData, predictedEdges, subgraph]);

  const handleLoadSubgraph = async () => {
    if (!entityId.trim()) {
      message.warning('请输入目标实体 ID 或名称');
      return;
    }

    setLoadingSubgraph(true);
    setPredictedEdges([]);
    setLogs([]);

    try {
      const resp = await ReasoningAPI.getSubgraph({ entity_id: entityId.trim(), max_hops: maxHops });
      setSubgraph(resp);
      message.success('已加载局部子图');
    } catch (e: any) {
      console.error(e);
      message.error('加载子图失败');
    } finally {
      setLoadingSubgraph(false);
    }
  };

  const handlePredict = async () => {
    if (!subgraph) {
      message.warning('请先加载子图');
      return;
    }

    setLoadingPredict(true);
    try {
      const resp = await ReasoningAPI.predict({ subgraph_data: subgraph });
      setPredictedEdges(resp.predicted_edges || []);
      setLogs(resp.logs || []);
      message.success('推理完成');
    } catch (e: any) {
      console.error(e);
      message.error('推理失败');
    } finally {
      setLoadingPredict(false);
    }
  };

  return (
    <div className="h-full w-full p-6 overflow-auto bg-slate-50">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <Title level={3} className="!mb-1">
              知识图谱智能推理补全（Inference）
            </Title>
            <Paragraph type="secondary" className="!mb-0">
              基于局部知识子图，因果强化学习 Agent 进行多跳推理与边补全。
            </Paragraph>
          </div>

          <Space wrap>
            <Button
              onClick={() => {
                setSubgraph(null);
                setPredictedEdges([]);
                setLogs([]);
              }}
            >
              重置
            </Button>
            <Button type="primary" loading={loadingSubgraph} onClick={handleLoadSubgraph}>
              1) 加载子图
            </Button>
            <Button
              type="primary"
              loading={loadingPredict}
              disabled={!subgraph}
              onClick={handlePredict}
            >
              2) 执行因果推理
            </Button>
          </Space>
        </div>

        <Divider />

        <Card size="small" title="推理参数" className="mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Text className="text-sm text-slate-600">目标实体</Text>
              <Input
                style={{ width: 220 }}
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="如 APT29 / 某 IP / 某主机标识"
              />
            </div>

            <div className="flex items-center gap-2">
              <Text className="text-sm text-slate-600">最大推理跳数</Text>
              <InputNumber
                min={1}
                max={10}
                value={maxHops}
                onChange={(v) => setMaxHops(Number(v ?? 6))}
              />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
          <Card
            size="small"
            title="原始局部知识子图"
            extra={<Text type="secondary">来自 /api/v1/reasoning/subgraph</Text>}
          >
            <div className="h-[420px]">
              <KnowledgeGraph data={baseGraphData} loading={loadingSubgraph} />
            </div>
          </Card>

          <Card
            size="small"
            title="推理后子图（新增边高亮）"
            extra={<Text type="secondary">包含预测出的候选关系边</Text>}
          >
            <div className="h-[420px]">
              <KnowledgeGraph data={inferredGraphData} loading={loadingPredict} />
            </div>
          </Card>
        </div>

        <Card size="small" title="推理日志面板">
          <div className="h-[220px] overflow-auto bg-slate-950 rounded-md p-3 text-slate-100 text-xs font-mono">
            {logs.length === 0 ? (
              <div className="text-slate-400">暂无推理日志</div>
            ) : (
              <div className="space-y-1">
                {logs.map((l, idx) => (
                  <div key={idx} className="flex justify-between gap-2">
                    <span className="text-slate-300">step {l.step} · {l.action}</span>
                    <span className="text-emerald-400">score: {l.score.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
