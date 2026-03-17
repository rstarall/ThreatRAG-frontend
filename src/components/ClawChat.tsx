"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { BubbleProps } from '@ant-design/x';
import { XProvider, Bubble, Sender } from '@ant-design/x';
import { Avatar, Typography, message, Button, Form, Input, Select, Switch, Tag, Tooltip, Drawer } from 'antd';
import { 
  SettingOutlined, 
  DisconnectOutlined, 
  WifiOutlined,
  ExclamationCircleOutlined,
  ApiOutlined
} from '@ant-design/icons';
import { useClawStore, ClawMessage, ClawConnectionStatus } from '../stores/clawStore';
import MarkdownRenderer from './Markdown';

const MemoizedMarkdownRenderer = ({ content }: { content: string }) => (
  <Typography>
    <MarkdownRenderer content={content} />
  </Typography>
);

MemoizedMarkdownRenderer.displayName = 'MemoizedMarkdownRenderer';

const ClawChat: React.FC<{ siderWidth: number }> = ({ siderWidth = 300 }) => {
  const [value, setValue] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [settingOpen, setSettingOpen] = useState(false);
  const [form] = Form.useForm();
  const [connecting, setConnecting] = useState(false);

  const {
    config,
    setConfig,
    connectionStatus,
    connectionError,
    conversations,
    currentConversationId,
    setCurrentConversationId,
    createConversation,
    addMessage,
    connect,
    disconnect,
    ws
  } = useClawStore();

  const currentConversation = currentConversationId ? conversations[currentConversationId] : null;
  const messages = currentConversation?.messages || [];

  // 自动滚动到底部
  const autoScrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, 100);
  }, []);

  // 消息变化时滚动
  useEffect(() => {
    if (messages.length > 0) {
      autoScrollToBottom();
    }
  }, [messages.length, autoScrollToBottom]);

  // 初始化默认会话
  useEffect(() => {
    const conversationIds = Object.keys(conversations);
    if (conversationIds.length === 0) {
      createConversation('默认会话');
    } else if (!currentConversationId) {
      setCurrentConversationId(conversationIds[0]);
    }
  }, [conversations, currentConversationId, createConversation, setCurrentConversationId]);

  // 发送消息
  const handleSubmit = async (content: string) => {
    if (!content.trim()) return;
    if (!currentConversationId) {
      createConversation('会话 ' + new Date().toLocaleTimeString());
    }

    // 添加用户消息
    const userMessage: ClawMessage = {
      id: `${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now()
    };
    addMessage(currentConversationId, userMessage);

    setValue('');

    // 通过WebSocket发送消息
    if (ws && connectionStatus === 'connected') {
      const chatRequest = {
        type: 'req',
        id: `${Date.now()}`,
        method: 'chat.send',
        params: {
          message: content,
          conversationId: currentConversationId
        }
      };
      ws.send(JSON.stringify(chatRequest));

      // 添加一个临时的机器人消息
      const botMessage: ClawMessage = {
        id: `${Date.now() + 1}`,
        role: 'assistant',
        content: '消息已发送...',
        timestamp: Date.now()
      };
      addMessage(currentConversationId, botMessage);
    } else {
      message.warning('请先连接龙虾服务器');
    }
  };

  // 连接/断开
  const handleConnect = async () => {
    if (connectionStatus === 'connected') {
      disconnect();
    } else {
      setConnecting(true);
      try {
        await connect();
        message.success('连接成功');
      } catch (error: any) {
        message.error(error.message || '连接失败');
      } finally {
        setConnecting(false);
      }
    }
  };

  // 保存设置
  const handleSaveConfig = async (values: any) => {
    setConfig({
      serverUrl: values.serverUrl,
      token: values.token || '',
      autoReconnect: values.autoReconnect ?? true,
      reconnectInterval: values.reconnectInterval || 5000,
    });
    setSettingOpen(false);
    message.success('设置已保存');
  };

  // 连接状态显示
  const getStatusTag = () => {
    const statusConfig: Record<ClawConnectionStatus, { color: string; text: string }> = {
      disconnected: { color: 'default', text: '未连接' },
      connecting: { color: 'processing', text: '连接中...' },
      connected: { color: 'success', text: '已连接' },
      error: { color: 'error', text: '连接错误' }
    };
    const status = statusConfig[connectionStatus];
    return <Tag color={status.color}>{status.text}</Tag>;
  };

  // 消息渲染
  const messageRenderer = useMemo(() => {
    return (content: string, msg?: ClawMessage) => {
      return (
        <div>
          <MemoizedMarkdownRenderer content={content} />
        </div>
      );
    };
  }, []);

  // 创建消息气泡
  const createBubble = useCallback((msg: ClawMessage): BubbleProps => {
    const roleIcons: Record<string, string> = {
      user: '👤',
      assistant: '🦞',
      system: '⚙️'
    };

    return {
      key: msg.id,
      content: msg.content,
      messageRender: (content: string) => messageRenderer(content, msg),
      placement: msg.role === 'user' ? 'end' as const : 'start' as const,
      variant: msg.role === 'user' ? 'filled' as const : 'outlined' as const,
      shape: 'round' as const,
      avatar: msg.role !== 'user' ? <Avatar>{roleIcons[msg.role] || '🦞'}</Avatar> : undefined,
      className: msg.role === 'system' ? 'bg-yellow-50' : '',
    };
  }, [messageRenderer]);

  // 加载设置到表单
  useEffect(() => {
    if (settingOpen) {
      form.setFieldsValue({
        serverUrl: config.serverUrl,
        token: config.token,
        autoReconnect: config.autoReconnect,
        reconnectInterval: config.reconnectInterval,
      });
    }
  }, [settingOpen, config, form]);

  return (
    <XProvider>
      <div ref={containerRef} className='h-[calc(100vh-50px)] bg-white relative overflow-auto' style={{
        backgroundImage: "url('./Q&A.png')",
        backgroundSize: '85%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}>
        {/* 顶部工具栏 */}
        <div className="sticky top-0 z-10 bg-white border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-medium">龙虾聊天</span>
            {getStatusTag()}
            {connectionError && (
              <Tooltip title={connectionError}>
                <ExclamationCircleOutlined className="text-red-500" />
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type={connectionStatus === 'connected' ? 'default' : 'primary'}
              icon={connectionStatus === 'connected' ? <DisconnectOutlined /> : <ApiOutlined />}
              onClick={handleConnect}
              loading={connecting}
              danger={connectionStatus === 'connected'}
            >
              {connectionStatus === 'connected' ? '断开' : '连接'}
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setSettingOpen(true)}
            >
              设置
            </Button>
          </div>
        </div>

        {/* 消息列表 */}
        <div
          className='bg-white'
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '20px',
            minHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <WifiOutlined className="text-4xl mb-4" />
              <p>暂无消息，请连接龙虾服务器开始聊天</p>
            </div>
          ) : (
            <Bubble.List
              className='bg-white pb-[140px] overflow-hidden'
              items={messages.map(msg => createBubble(msg))}
            />
          )}
        </div>

        {/* 输入区域：fixed 相对于视口，需用 100vw 并设置 left 避免被侧边栏遮挡 */}
        <div
          className="fixed bottom-0 bg-white"
          style={{
            left: `${siderWidth}px`,
            right: 0,
            padding: '10px',
            borderTop: '1px solid #eee',
            width: `calc(100vw - ${siderWidth}px)`,
          }}
        >
          <Sender
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            placeholder={connectionStatus === 'connected' ? "输入消息..." : "请先连接服务器"}
            submitType="enter"
            disabled={connectionStatus !== 'connected'}
          />
        </div>

        {/* 设置弹窗 */}
        <Drawer
          title="龙虾连接设置"
          placement="right"
          onClose={() => setSettingOpen(false)}
          open={settingOpen}
          width={400}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSaveConfig}
          >
            <Form.Item
              label="服务器地址"
              name="serverUrl"
              rules={[{ required: true, message: '请输入服务器地址 (wss://host:port)' }]}
            >
              <Input placeholder="wss://192.168.1.100:18789" />
            </Form.Item>

            <Form.Item
              label="认证Token"
              name="token"
              tooltip="如果服务器需要认证，请输入Token"
            >
              <Input.Password placeholder="请输入认证Token" />
            </Form.Item>

            <Form.Item
              label="自动重连"
              name="autoReconnect"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="重连间隔 (毫秒)"
              name="reconnectInterval"
            >
              <Select>
                <Select.Option value={3000}>3秒</Select.Option>
                <Select.Option value={5000}>5秒</Select.Option>
                <Select.Option value={10000}>10秒</Select.Option>
                <Select.Option value={30000}>30秒</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                保存设置
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-4 p-4 bg-gray-50 rounded">
            <h4 className="font-medium mb-2">连接说明</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 服务器地址格式: wss://ip:port</li>
              <li>• 默认端口: 18789</li>
              <li>• 需要先在服务器配置Token认证</li>
            </ul>
          </div>
        </Drawer>
      </div>
    </XProvider>
  );
};

export default ClawChat;