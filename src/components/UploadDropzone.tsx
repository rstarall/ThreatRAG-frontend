'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Upload, Typography, message } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { InboxOutlined } from '@ant-design/icons';

const { Dragger } = Upload;

export type UploadDropzoneValue = {
  files: File[];
};

export type UploadDropzoneProps = {
  accept?: string;
  multiple?: boolean;
  maxCount?: number;
  value?: UploadDropzoneValue;
  onChange?: (value: UploadDropzoneValue) => void;
  disabled?: boolean;
  title?: string;
  hint?: string;
};

export default function UploadDropzone({
  accept = '.pdf,.txt,.json',
  multiple = true,
  maxCount = 20,
  value,
  onChange,
  disabled,
  title = '拖拽文件到此处，或点击选择文件',
  hint = '支持 PDF / TXT / JSON，支持多文件上传',
}: UploadDropzoneProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const selectedFiles = useMemo(() => value?.files ?? [], [value?.files]);

  const emit = useCallback(
    (files: File[]) => {
      onChange?.({ files });
    },
    [onChange]
  );

  const props: UploadProps = {
    name: 'file',
    multiple,
    accept,
    disabled,
    maxCount,
    fileList,
    beforeUpload: (file) => {
      // 阻止 antd 自动上传
      return false;
    },
    onChange(info) {
      const nextList = info.fileList.slice(0, maxCount);
      setFileList(nextList);

      const files = nextList
        .map((f) => f.originFileObj)
        .filter(Boolean) as File[];

      emit(files);
    },
    onDrop() {
      // no-op
    },
    onRemove(file) {
      const nextList = fileList.filter((f) => f.uid !== file.uid);
      setFileList(nextList);
      const files = nextList
        .map((f) => f.originFileObj)
        .filter(Boolean) as File[];
      emit(files);
      return true;
    },
  };

  // 外部受控 value 与内部 fileList 不做强同步（避免 File 无法序列化导致问题）
  // 仅在用户交互时更新 fileList。

  return (
    <div className="w-full">
      <Dragger {...props} className="bg-white">
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <Typography.Title level={5} className="!m-0">
          {title}
        </Typography.Title>
        <Typography.Paragraph type="secondary" className="!mt-1 !mb-0">
          {hint}
        </Typography.Paragraph>
      </Dragger>
      {selectedFiles.length > 0 && (
        <Typography.Paragraph type="secondary" className="!mt-2 !mb-0 text-xs">
          已选择 {selectedFiles.length} 个文件
        </Typography.Paragraph>
      )}
    </div>
  );
}
