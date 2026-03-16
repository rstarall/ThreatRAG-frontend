'use client';

import React from 'react';
import { Card, Table, Tag } from 'antd';

export type EntityRow = {
  name: string;
  type: string;
  capec_id?: string;
  mitre_attack_id?: string;
  cve?: string;
};

export type TripleRow = {
  head: string;
  relation: string;
  tail: string;
};

export default function EntityRelationTables({
  entities,
  triples,
}: {
  entities: EntityRow[];
  triples: TripleRow[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card size="small" title="实体列表" className="w-full">
        <Table
          size="small"
          pagination={{ pageSize: 6 }}
          rowKey={(r) => `${r.type}:${r.name}`}
          dataSource={entities}
          columns={[
            {
              title: '实体',
              dataIndex: 'name',
              key: 'name',
              ellipsis: true,
            },
            {
              title: '类型',
              dataIndex: 'type',
              key: 'type',
              width: 140,
              render: (v: string) => <Tag color="blue">{v}</Tag>,
            },
            {
              title: '映射',
              key: 'mapping',
              width: 160,
              render: (_, r) =>
                r.capec_id || r.mitre_attack_id || r.cve ? (
                  <span className="text-xs text-slate-600">
                    {r.capec_id || r.mitre_attack_id || r.cve}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">-</span>
                ),
            },
          ]}
        />
      </Card>

      <Card size="small" title="关系列表（三元组）" className="w-full">
        <Table
          size="small"
          pagination={{ pageSize: 6 }}
          rowKey={(r) => `${r.head}-${r.relation}-${r.tail}`}
          dataSource={triples}
          columns={[
            { title: '头实体', dataIndex: 'head', key: 'head', ellipsis: true },
            {
              title: '关系',
              dataIndex: 'relation',
              key: 'relation',
              width: 120,
              render: (v: string) => <Tag color="purple">{v}</Tag>,
            },
            { title: '尾实体', dataIndex: 'tail', key: 'tail', ellipsis: true },
          ]}
        />
      </Card>
    </div>
  );
}
