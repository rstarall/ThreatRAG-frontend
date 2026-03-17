import { create } from 'zustand';
import { persist, type StorageValue } from 'zustand/middleware';

export type ClawMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
};

export type ClawConversation = {
  id: string;
  title: string;
  time: string;
  messages: ClawMessage[];
};

export type ClawConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type ClawConfig = {
  serverUrl: string;
  token: string;
  autoReconnect: boolean;
  reconnectInterval: number;
};

export type ClawState = {
  config: ClawConfig;
  connectionStatus: ClawConnectionStatus;
  connectionError: string;
  
  // 会话管理
  conversations: Record<string, ClawConversation>;
  currentConversationId: string;
  
  // WebSocket连接
  ws: WebSocket | null;
  clientId: string | null;
  
  // 设置
  setConfig: (config: Partial<ClawConfig>) => void;
  setConnectionStatus: (status: ClawConnectionStatus, error?: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // 会话管理
  createConversation: (title?: string) => string;
  deleteConversation: (id: string) => void;
  setCurrentConversationId: (id: string) => void;
  addMessage: (conversationId: string, message: ClawMessage) => void;
  clearMessages: (conversationId: string) => void;
};

// 生成唯一ID
const generateId = () => `${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

const useStore = create<ClawState>()(
  persist(
    (set, get) => ({
      config: {
        serverUrl: '',
        token: '',
        autoReconnect: true,
        reconnectInterval: 5000,
      },
      connectionStatus: 'disconnected',
      connectionError: '',
      conversations: {},
      currentConversationId: '',
      ws: null,
      clientId: null,

      setConfig: (newConfig) => {
        set({ config: { ...get().config, ...newConfig } });
      },

      setConnectionStatus: (status, error = '') => {
        set({ connectionStatus: status, connectionError: error });
      },

      connect: async () => {
        const { config, setConnectionStatus, ws } = get();
        
        if (!config.serverUrl) {
          setConnectionStatus('error', '请先配置服务器地址');
          return;
        }

        // 关闭现有连接
        if (ws) {
          ws.close();
        }

        setConnectionStatus('connecting');

        return new Promise<void>((resolve, reject) => {
          try {
            // 创建WebSocket连接
            const wsUrl = config.token 
              ? `${config.serverUrl}?token=${config.token}`
              : config.serverUrl;
            
            const socket = new WebSocket(wsUrl);
            
            // 存储原始socket引用
            let socketRef = socket;

            socket.onopen = () => {
              console.log('WebSocket连接已建立');
              
              // 发送connect请求
              const connectRequest = {
                type: 'req',
                id: generateId(),
                method: 'connect',
                params: {
                  minProtocol: 3,
                  maxProtocol: 3,
                  client: {
                    id: 'threatrag-web',
                    version: '1.0.0',
                    platform: 'web',
                    mode: 'operator'
                  },
                  role: 'operator',
                  scopes: ['operator.read', 'operator.write'],
                  auth: config.token ? { token: config.token } : {},
                  locale: 'zh-CN',
                  userAgent: 'ThreatRAG-web/1.0.0',
                }
              };

              socket.send(JSON.stringify(connectRequest));
            };

            socket.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data);
                console.log('收到消息:', data);

                // 处理connect响应
                if (data.type === 'res' && data.ok) {
                  set({ 
                    connectionStatus: 'connected', 
                    ws: socketRef,
                    clientId: data.payload?.clientId || generateId()
                  });
                  resolve();
                } 
                // 处理错误
                else if (data.type === 'res' && !data.ok) {
                  const errorMsg = data.error?.message || '连接失败';
                  setConnectionStatus('error', errorMsg);
                  reject(new Error(errorMsg));
                }
                // 处理connect.challenge事件
                else if (data.type === 'event' && data.event === 'connect.challenge') {
                  // 收到challenge，需要签名响应（简化版直接发送connect）
                  const connectRequest = {
                    type: 'req',
                    id: generateId(),
                    method: 'connect',
                    params: {
                      minProtocol: 3,
                      maxProtocol: 3,
                      client: {
                        id: 'threatrag-web',
                        version: '1.0.0',
                        platform: 'web',
                        mode: 'operator'
                      },
                      role: 'operator',
                      scopes: ['operator.read', 'operator.write'],
                      auth: config.token ? { token: config.token } : {},
                      locale: 'zh-CN',
                      userAgent: 'ThreatRAG-web/1.0.0',
                      device: {
                        id: 'web-device-' + generateId(),
                        nonce: data.payload?.nonce,
                      }
                    }
                  };
                  socket.send(JSON.stringify(connectRequest));
                }

                // 处理聊天消息事件
                if (data.type === 'event' && data.event === 'chat.message') {
                  const { currentConversationId } = get();
                  if (currentConversationId) {
                    const message: ClawMessage = {
                      id: generateId(),
                      role: 'assistant',
                      content: data.payload?.content || '',
                      timestamp: Date.now()
                    };
                    get().addMessage(currentConversationId, message);
                  }
                }

                // 处理exec.approval.requested事件
                if (data.type === 'event' && data.event === 'exec.approval.requested') {
                  const { currentConversationId } = get();
                  if (currentConversationId) {
                    const message: ClawMessage = {
                      id: generateId(),
                      role: 'system',
                      content: `🔔 执行请求需要审批: ${data.payload?.command || '未知命令'}`,
                      timestamp: Date.now()
                    };
                    get().addMessage(currentConversationId, message);
                  }
                }

              } catch (err) {
                console.error('解析消息失败:', err);
              }
            };

            socket.onerror = (error) => {
              console.error('WebSocket错误:', error);
              setConnectionStatus('error', '连接出错');
              reject(error);
            };

            socket.onclose = (event) => {
              console.log('WebSocket关闭:', event.code, event.reason);
              set({ ws: null, connectionStatus: 'disconnected' });
              
              // 自动重连
              const { config } = get();
              if (config.autoReconnect && event.code !== 1000 && config.serverUrl) {
                setTimeout(() => {
                  console.log('尝试自动重连...');
                  get().connect().catch(console.error);
                }, config.reconnectInterval);
              }
            };

            // 存储socket引用用于后续访问
            set({ ws: socket });

          } catch (error) {
            console.error('连接失败:', error);
            setConnectionStatus('error', '连接失败');
            reject(error);
          }
        });
      },

      disconnect: () => {
        const { ws } = get();
        if (ws) {
          ws.close(1000, '客户端断开');
          set({ ws: null, connectionStatus: 'disconnected' });
        }
      },

      createConversation: (title = '新会话') => {
        const id = generateId();
        const conversation: ClawConversation = {
          id,
          title,
          time: Date.now().toString(),
          messages: []
        };

        set({
          conversations: {
            ...get().conversations,
            [id]: conversation
          },
          currentConversationId: id
        });

        return id;
      },

      deleteConversation: (id) => {
        const { conversations, currentConversationId } = get();
        const newConversations = { ...conversations };
        delete newConversations[id];

        let newCurrentId = currentConversationId;
        if (currentConversationId === id) {
          const remainingIds = Object.keys(newConversations);
          newCurrentId = remainingIds[0] || '';
        }

        set({
          conversations: newConversations,
          currentConversationId: newCurrentId
        });
      },

      setCurrentConversationId: (id) => {
        set({ currentConversationId: id });
      },

      addMessage: (conversationId, message) => {
        const { conversations } = get();
        const conversation = conversations[conversationId];
        if (conversation) {
          set({
            conversations: {
              ...conversations,
              [conversationId]: {
                ...conversation,
                messages: [...conversation.messages, message]
              }
            }
          });
        }
      },

      clearMessages: (conversationId) => {
        const { conversations } = get();
        const conversation = conversations[conversationId];
        if (conversation) {
          set({
            conversations: {
              ...conversations,
              [conversationId]: {
                ...conversation,
                messages: []
              }
            }
          });
        }
      }
    }),
    {
      name: 'claw-storage',
      partialize: (state) => ({
        config: state.config,
        conversations: state.conversations,
        currentConversationId: state.currentConversationId
      }),
      storage: typeof window !== 'undefined' ? {
        getItem: (name): StorageValue<{
          config: ClawConfig;
          conversations: Record<string, ClawConversation>;
          currentConversationId: string;
        }> | null => {
          try {
            const str = localStorage.getItem(name);
            return str ? JSON.parse(str) : null;
          } catch (err) {
            console.warn('存储访问失败:', err);
            return null;
          }
        },
        setItem: (name, value: StorageValue<{
          config: ClawConfig;
          conversations: Record<string, ClawConversation>;
          currentConversationId: string;
        }>) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (err) {
            console.warn('存储写入失败:', err);
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch (err) {
            console.warn('存储删除失败:', err);
          }
        }
      } : undefined
    }
  )
);

export const useClawStore = useStore;