import api from './index';
import { USE_MOCK } from './mock';
import {
  mockReasoningPredict,
  mockReasoningSubgraph,
  type ReasoningPredictResp,
  type SubgraphResp,
} from './mock/reasoning';

export class ReasoningAPI {
  /**
   * GET /api/v1/reasoning/subgraph
   */
  static async getSubgraph(params: {
    entity_id: string;
    max_hops: number;
  }): Promise<SubgraphResp> {
    if (USE_MOCK) {
      return mockReasoningSubgraph(params);
    }

    const response = await api.get<SubgraphResp>('/api/v1/reasoning/subgraph', { params });
    return response.data;
  }

  /**
   * POST /api/v1/reasoning/predict
   */
  static async predict(body: { subgraph_data: SubgraphResp }): Promise<ReasoningPredictResp> {
    if (USE_MOCK) {
      return mockReasoningPredict(body);
    }

    const response = await api.post<ReasoningPredictResp>('/api/v1/reasoning/predict', body);
    return response.data;
  }
}

export default ReasoningAPI;
