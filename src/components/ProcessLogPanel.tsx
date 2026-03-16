'use client';

import React from 'react';
import { Card, Typography } from 'antd';

export type ProcessLogPanelProps = {
  title?: string;
  logs: string[];
  height?: number;
};

export default function ProcessLogPanel({
  title = '处理进度流',
  logs,
  height = 260,
}: ProcessLogPanelProps) {
  return (
    <Card size="small" title={title} className="w-full">
      <div
        className="w-full rounded-md bg-slate-950 text-slate-100 p-3 overflow-auto"
        style={{ height }}
      >
        {logs.length === 0 ? (
          <Typography.Text type="secondary" className="text-xs text-slate-300">
            暂无日志
          </Typography.Text>
        ) : (
          <div className="space-y-1">
            {logs.map((line, idx) => (
              <div key={idx} className="text-xs leading-5 font-mono whitespace-pre-wrap">
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
