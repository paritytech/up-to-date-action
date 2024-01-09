import { GitHubClient } from "./types";

/** API class that uses the default token to access the data from the pull request and the repository */
export class PullRequestApi {
  constructor(
    private readonly api: GitHubClient,
    private readonly repo: { owner: string; repo: string },
  ) {}

  async listPRs(
    onlyAutoMerge: boolean,
  ): Promise<{ number: number; title: string }[]> {
    const openPRs = await this.api.paginate(this.api.rest.pulls.list, {
      ...this.repo,
      state: "open",
    });

    if (onlyAutoMerge) {
      return openPRs
        .filter((pr) => pr.auto_merge)
        .map(({ number, title }) => ({ number, title }) as const);
    } else {
      return openPRs.map(({ number, title }) => ({ number, title }) as const);
    }
  }

  async update(number: number): Promise<string | undefined> {
    const { data } = await this.api.rest.pulls.updateBranch({
      ...this.repo,
      pull_number: number,
    });

    return data.message;
  }
}
