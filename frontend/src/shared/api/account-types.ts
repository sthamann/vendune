/** Native personal account response shared by merchant and platform authentication. */
export type Session = {
  token?: string;
  workspace: string;
  user: { id: string; name: string; email: string };
  workspaces: { id: string; name: string; role: string }[];
};
