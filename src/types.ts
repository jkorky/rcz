export type Comment = {
  postId: number;
  id: string;
  text: string;
  link: string;
};

export type State = {
  lastSeenPostId: number | null;
  lastSeenPage: number | null;
};
