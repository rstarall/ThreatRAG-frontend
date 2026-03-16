import api from './index';
import { USE_MOCK } from './mock';
import { mockKgUpload, mockKgExtract, type KgUploadResp, type KgExtractResp } from './mock/kg';

export interface KgUploadRequest {
  files: File[];
  chunk_size: number;
}

export interface KgExtractRequest {
  document_ids: string[];
  llm_model: string;
}

/**
 * 知识图谱构建 API
 * 支持 mock / 真实接口切换
 */
export class KgAPI {
  /**
   * 文件上传与预处理
   * POST /api/v1/kg/upload
   */
  static async upload(request: KgUploadRequest): Promise<KgUploadResp> {
    if (USE_MOCK) {
      return mockKgUpload(request.files, request.chunk_size);
    }

    const formData = new FormData();
    request.files.forEach((file) => formData.append('file', file));
    formData.append('chunk_size', String(request.chunk_size));

    const response = await api.post<KgUploadResp>('/api/v1/kg/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  /**
   * 图谱抽取与构建
   * POST /api/v1/kg/extract
   */
  static async extract(request: KgExtractRequest): Promise<KgExtractResp> {
    if (USE_MOCK) {
      return mockKgExtract(request);
    }

    const response = await api.post<KgExtractResp>('/api/v1/kg/extract', request);
    return response.data;
  }
}

export default KgAPI;