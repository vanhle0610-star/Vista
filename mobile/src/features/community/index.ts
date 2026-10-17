/**
 * Feature: Community & Content (BF-06)
 * Phụ trách: M5 (Mobile Safety/Community Engineer)
 */
export interface CommunityPost {
  id: string;
  userId: string;
  destinationId?: string;
  body: string;
  status: 'PENDING' | 'VISIBLE' | 'HIDDEN';
  createdAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  body: string;
  createdAt: string;
}
