import { PullRequestsQuery, PullRequestsQueryVariables } from "./queries";
import PRQuery from "./queries/PullRequests";
import { ActionLogger, GitHubClient } from "./types";

type PullData = { number: number; title: string };

export type PullRequest = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<PullRequestsQuery["repository"]>["pullRequests"]["edges"]
    >[number]
  >["node"]
>;

/** API class that uses the default token to access the data from the pull request and the repository */
export class PullRequestApi {
  constructor(
    private readonly api: GitHubClient,
    private readonly repo: { owner: string; repo: string },
    private readonly logger: ActionLogger,
  ) {}

  async fetchOpenPRs(): Promise<PullRequest[]> {
    const prs: PullRequest[] = [];

    let cursor: string | null | undefined = null;
    let hasNextPage: boolean = false;

    do {
      const variables: PullRequestsQueryVariables = {
        cursor,
        repo: this.repo.repo,
        owner: this.repo.owner,
      };
      const query = await this.api.graphql<PullRequestsQuery>(
        PRQuery,
        variables,
      );
      if (!query.repository?.pullRequests) {
        throw new Error("Could not fetch pull requests");
      }
      const { edges, pageInfo } = query.repository.pullRequests;
      if (!edges) {
        this.logger.warn("Query returned undefined values");
        break;
      }

      for (const edge of edges) {
        const node = edge?.node as PullRequest;
        prs.push(node);
      }

      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;
    } while (hasNextPage);

    return prs;
  }

  async listPRs(onlyAutoMerge: boolean): Promise<PullData[]> {
    this.logger.debug("Fetching list of PR");

    const openPRs = await this.fetchOpenPRs();

    this.logger.debug(JSON.stringify(openPRs));

    const prs: PullData[] = [];
    for (const pr of openPRs) {
      const { number, title } = pr;

      const autoMergeEnabled: boolean =
        pr.autoMergeRequest?.enabledAt != undefined &&
        pr.autoMergeRequest?.enabledAt != null;

      if (pr.isDraft) {
        this.logger.debug(`❕ - Ignoring #${number} because it is a draft`);
      } else if (!pr.viewerCanUpdateBranch) {
        this.logger.info(
          `⭕️ - Skipping #${number} because the viewer can not update the branch`,
        );
      } else if (!autoMergeEnabled && onlyAutoMerge) {
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
