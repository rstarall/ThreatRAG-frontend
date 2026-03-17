'use client';

import { Input, Button, message, Modal, Empty, Spin } from 'antd';
import { SearchOutlined, PlusOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
import { useClawStore } from '@/stores/clawStore';
import { useEffect, useState, useCallback, memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';

export default function ClawSideContainer() {
  const [messageApi, contextHolder] = message.useMessage();
  const { 
    conversations, 
    currentConversationId, 
    setCurrentConversationId, 
    deleteConversation, 
    createConversation 
  } = useClawStore();
  const [items, setItems] = useState<Array<{ id: string; title: string; time: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [isInit, setIsInit] = useState(false);
  const [deletedConversationId, setDeletedConversationId] = useState<string | null>(null);

  const memoizedItems = useMemo(() => {
    return Object.values(conversations).map(conversation => ({
      id: conversation.id,
      title: conversation.title,
      time: conversation.time
    }));
  }, [conversations]);

  const getSortedItems = useCallback(() => {
    const sortedItems = memoizedItems.sort((a, b) => 
      new Date(b.time).getTime() - new Date(a.time).getTime()
    );

    if (!isInit) {
      setIsInit(true);
    }

    return sortedItems;
  }, [memoizedItems, isInit]);

  useEffect(() => {
    setItems(getSortedItems());
    setLoading(false);
  }, [getSortedItems]);

  useEffect(() => {
    if (deletedConversationId) {
      messageApi.open({
        type: 'success',
        content: '删除成功',
      });
      setDeletedConversationId(null);
    }
  }, [deletedConversationId, messageApi]);

  const handleDelete = useCallback((id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个会话吗？此操作不可恢复。',
      onOk: () => {
        deleteConversation(id);
        setDeletedConversationId(id);
      }
    });
  }, [deleteConversation]);

  const MemoizedRow = memo(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];
    return (
      <div
        style={style}
        className={`rounded-md p-2 cursor-pointer ${item.id === currentConversationId ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
        onClick={() => setCurrentConversationId(item.id)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 overflow-hidden">
            <HistoryOutlined className="text-gray-400 flex-shrink-0" />
            <span className='overflow-hidden text-ellipsis whitespace-nowrap' title={item.title || '新会话'}>
              {item.title || '新会话'}
            </span>
          </div>
          <Button
            type="text"
            icon={<DeleteOutlined />}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(item.id);
            }}
          />
        </div>
      </div>
    );
  });

  MemoizedRow.displayName = 'MemoizedRow';

  const [listHeight, setListHeight] = useState(500);

  useEffect(() => {
    const calculateHeight = () => {
      const windowHeight = window.innerHeight;
      const offset = 200;
      setListHeight(windowHeight + offset);
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, []);

  const handleNewConversation = () => {
    const id = createConversation(`会话 ${new Date().toLocaleTimeString()}`);
    setCurrentConversationId(id);
  };

  return (
    <div className="h-full relative">
      {contextHolder}
      <div className="p-4 pb-3 border-b h-[60px]">
        <Input
          placeholder="搜索会话"
          prefix={<SearchOutlined />}
          allowClear
        />
      </div>
      <div className="p-2 z-0 h-[calc(100%-100px)] w-full">
        <Spin spinning={loading}>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div className="text-center">
                    <p className="text-gray-500 mb-2">暂无会话记录</p>
                    <p className="text-gray-400 text-sm">点击下方按钮开始新的会话</p>
                  </div>
                }
              />
            </div>
          ) : (
            <List
              className='z-0'
              height={listHeight}
              itemCount={items.length}
              itemSize={50}
              width="100%"
              itemData={items}
              overscanCount={5}
            >
              {MemoizedRow}
            </List>
          )}
        </Spin>
      </div>
      <div className="absolute bottom-0 left-0 border-t p-4 bg-white w-[calc(100%-10px)] h-[90px] z-10">
        <Button onClick={handleNewConversation} type="primary" block icon={<PlusOutlined />}>
          新建会话
        </Button>
      </div>
    </div>
  );
}