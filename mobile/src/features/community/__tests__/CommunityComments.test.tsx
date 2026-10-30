import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { CommunityComments } from '../CommunityComments';
import { api } from '@/services/api/client';
import { Alert } from 'react-native';
import type { components } from '@/types/api.generated';
jest.mock('@/services/api/client', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  apiErrorMessage: () => 'Mất kết nối, vui lòng thử lại',
}));
jest.mock('../CommunityTools', () => {
  const { View } = jest.requireActual('react-native');
  return {
    PublicAvatar: () => <View />,
    ui: {
      screen: {},
      flex: {},
      gap: {},
      list: {},
      input: {},
      title: {},
      strong: {},
    },
  };
});
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '55555555-5555-4555-8555-555555555555'),
}));
type Comment = components['schemas']['Comment'];
const root: Comment = {
  id: 'root',
  postId: 'post',
  body: 'Bình luận gốc',
  version: 0,
  createdAt: '2026-10-29T00:00:00Z',
  updatedAt: '2026-10-29T00:00:00Z',
  author: { id: 'b', displayName: 'Tài khoản B' },
  replyCount: 0,
  rootId: null,
  replyToId: null,
  deleted: false,
};
let comments: Comment[], saved: Map<string, Comment>;
beforeEach(() => {
  jest.clearAllMocks();
  comments = [{ ...root }];
  saved = new Map();
  jest.mocked(api.get).mockImplementation(async (url) => {
    const replies = String(url).includes('/replies');
    const active = comments.filter((item) => !item.deleted);
    const items = replies
      ? active.filter((item) => item.rootId === 'root')
      : comments
          .filter(
            (item) =>
              !item.rootId &&
              (!item.deleted ||
                active.some((reply) => reply.rootId === item.id)),
          )
          .map((item) => ({
            ...item,
            replyCount: active.filter((reply) => reply.rootId === item.id)
              .length,
          }));
    return {
      data: {
        items,
        total: items.length,
        page: 0,
        size: 10,
        commentCount: active.length,
      },
    };
  });
  jest.mocked(api.delete).mockImplementation(async (url) => {
    const item = comments.find((c) => String(url).endsWith(c.id));
    if (item) item.deleted = true;
    return { data: {} };
  });
  jest.mocked(api.post).mockImplementation(async (_url, payload) => {
    const data = payload as {
      body: string;
      replyToId?: string;
      clientRequestId: string;
    };
    if (saved.has(data.clientRequestId))
      return { data: saved.get(data.clientRequestId) };
    const target = comments.find((item) => item.id === data.replyToId);
    const created: Comment = {
      ...root,
      id: `created-${comments.length}`,
      body: data.body,
      author: { id: 'a', displayName: 'Tài khoản A' },
      rootId: target ? target.rootId || target.id : null,
      replyToId: target?.id,
      replyToAuthor: target?.author,
    };
    comments.push(created);
    saved.set(data.clientRequestId, created);
    return { data: created };
  });
});
const mount = () =>
  render(
    <CommunityComments
      postId="post"
      userId="a"
      viewer={{ displayName: 'Tài khoản A' }}
      active
      onClose={jest.fn()}
      onCountChange={jest.fn()}
    />,
  );

test('reply form targets the right author, persists a reply, opens its thread and supports collapse', async () => {
  await mount();
  await screen.findByText('Bình luận gốc');
  await fireEvent.press(screen.getByText('Trả lời'));
  expect(screen.getByText('Đang trả lời Tài khoản B')).toBeTruthy();
  await fireEvent.changeText(
    screen.getByLabelText('Trả lời Tài khoản B'),
    'Phản hồi mới',
  );
  await fireEvent.press(screen.getByText('Gửi phản hồi'));
  await screen.findByText('Phản hồi mới');
  expect(screen.getByText('2 bình luận')).toBeTruthy();
  expect(api.post).toHaveBeenCalledWith(
    '/posts/post/comments',
    expect.objectContaining({
      replyToId: 'root',
      clientRequestId: expect.any(String),
    }),
  );
  await fireEvent.press(screen.getByText('Thu gọn câu trả lời'));
  expect(screen.queryByText('Phản hồi mới')).toBeNull();
  await fireEvent.press(screen.getByText('Xem 1 câu trả lời'));
  await screen.findByText('Phản hồi mới');
});

test('cancel replying does not send data or clear the independent root draft', async () => {
  await mount();
  await screen.findByText('Bình luận gốc');
  await fireEvent.changeText(
    screen.getByLabelText('Nội dung bình luận'),
    'Bản nháp gốc',
  );
  await fireEvent.press(screen.getByText('Trả lời'));
  await fireEvent.press(screen.getByText('Hủy'));
  expect(screen.getByLabelText('Nội dung bình luận').props.value).toBe(
    'Bản nháp gốc',
  );
  expect(api.post).not.toHaveBeenCalled();
});

test('ambiguous network error retains comment payload and request ID for retry', async () => {
  const normal = jest.mocked(api.post).getMockImplementation()!;
  jest.mocked(api.post).mockImplementationOnce(async (...args) => {
    await normal(...args);
    throw new Error('timeout after server saved');
  });
  await mount();
  await screen.findByText('Bình luận gốc');
  await fireEvent.changeText(
    screen.getByLabelText('Nội dung bình luận'),
    'Không tạo trùng',
  );
  await fireEvent.press(screen.getByText('Lưu bình luận'));
  await screen.findByText(/Giữ nguyên bản nháp/);
  await fireEvent.press(screen.getByText('Thử gửi lại bình luận'));
  await screen.findByText('Không tạo trùng');
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
  expect(jest.mocked(api.post).mock.calls[0][1]).toEqual(
    jest.mocked(api.post).mock.calls[1][1],
  );
  expect(
    comments.filter((item) => item.body === 'Không tạo trùng'),
  ).toHaveLength(1);
});

test('other account comments have no edit or delete controls', async () => {
  await mount();
  await screen.findByText('Bình luận gốc');
  expect(screen.queryByText('Sửa bình luận')).toBeNull();
  expect(screen.queryByText('Xóa bình luận')).toBeNull();
});

test('replying to a reply keeps the original root and targets the selected reply', async () => {
  comments.push({
    ...root,
    id: 'reply-b',
    rootId: 'root',
    replyToId: 'root',
    body: 'Phản hồi của B',
  });
  await mount();
  await screen.findByText('Bình luận gốc');
  await fireEvent.press(screen.getByText('Xem 1 câu trả lời'));
  await screen.findByText('Phản hồi của B');
  await fireEvent.press(screen.getAllByText('Trả lời').at(-1)!);
  await fireEvent.changeText(
    screen.getByLabelText('Trả lời Tài khoản B'),
    'Trả lời một phản hồi',
  );
  await fireEvent.press(screen.getByText('Gửi phản hồi'));
  await screen.findByText('Trả lời một phản hồi');
  expect(comments.at(-1)?.rootId).toBe('root');
  expect(comments.at(-1)?.replyToId).toBe('reply-b');
  expect(screen.getByText('3 bình luận')).toBeTruthy();
});

test('deleting an owned root leaves a tombstone and another account reply visible', async () => {
  comments[0] = { ...root, author: { id: 'a', displayName: 'Tài khoản A' } };
  comments.push({
    ...root,
    id: 'reply-b',
    rootId: 'root',
    replyToId: 'root',
    body: 'Giữ phản hồi của B',
  });
  const confirm = jest
    .spyOn(Alert, 'alert')
    .mockImplementation((_title, _text, buttons) => {
      buttons?.find((b) => b.text === 'Xóa')?.onPress?.();
    });
  await mount();
  await screen.findByText('Bình luận gốc');
  await fireEvent.press(screen.getByText('Xóa bình luận'));
  await screen.findByText('Bình luận đã bị xóa');
  await fireEvent.press(screen.getByText('Xem 1 câu trả lời'));
  await screen.findByText('Giữ phản hồi của B');
  expect(screen.getByText('1 bình luận')).toBeTruthy();
  expect(screen.queryByText('Trả lời')).toBeNull();
  confirm.mockRestore();
});
