export type Verification = "blue" | "gold" | "gray" | "none";
export type Metric = "replies" | "reposts" | "likes" | "bookmarks" | "views";

export interface PostSegment {
  text: string;
  type: "text" | "link" | "mention" | "hashtag";
  href?: string;
}

export interface PostMedia {
  type: "photo" | "video" | "gif";
  url: string;
  width: number;
  height: number;
  alt: string;
}

export interface Post {
  id: string;
  author: { name: string; handle: string; avatar: string; verified: Verification };
  text: string;
  segments: PostSegment[];
  createdAt: string;
  metrics: Partial<Record<Metric, number>>;
  media: PostMedia[];
  quotedPost?: Post;
  replyTo?: { handle: string; id?: string; post?: Post };
  communityNote?: { text: string; url?: string };
  linkCard?: { url: string; title: string; description?: string; image?: string; domain?: string };
  isTruncated?: boolean;
}

export type TweetErrorCode = "MALFORMED_URL" | "DELETED" | "PROTECTED" | "AGE_RESTRICTED" | "NOT_FOUND" | "RATE_LIMITED" | "UNAVAILABLE";
export interface TweetError { code: TweetErrorCode; message: string }
export type TweetResult = { post: Post; error?: never } | { error: TweetError; post?: never };
