import { ActionLogger, GitHubClient } from "./types";

type PullData = { number: number; title: string };

/** API class that uses the default token to access the data from the pull request and the repository */
export class PullRequestApi {
  constructor(
    private readonly api: GitHubClient,
    private readonly repo: { owner: string; repo: string },
    private readonly logger: ActionLogger,
  ) {}

  async listPRs(onlyAutoMerge: boolean): Promise<PullData[]> {
    this.logger.debug("Fetching list of PR");

    const openPRs = await this.api.paginate(this.api.rest.pulls.list, {
      ...this.repo,
      state: "open",
    });

    this.logger.debug(JSON.stringify(openPRs));

    const prs: PullData[] = [];
    for (const pr of openPRs) {
      const { number, title } = pr;

      if (pr.draft) {
        this.logger.debug(`❕ - Ignoring #${number} because it is a draft`);
      } else if (!pr.auto_merge && onlyAutoMerge) {
        this.logger.debug(
          `❗️ - Ignoring #${number} because auto-merge is not enabled`,
        );
      } else {
        prs.push({ number, title });
      }
    }
    return prs;
  }

  async update(number: number): Promise<string | undefined> {
    const { data } = await this.api.rest.pulls.updateBranch({
      ...this.repo,
      pull_number: number,
    });

    return data.message;
  }

  async comment(number: number, msg: string): Promise<void> {
    await this.api.rest.issues.createComment({
      ...this.repo,
      issue_number: number,
      body: msg,
    });
  }
}
