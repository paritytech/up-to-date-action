import { DeepMockProxy, mock, mockDeep, MockProxy } from "jest-mock-extended";

import { PullRequest, PullRequestApi } from "../github/pullRequest";
import { ActionLogger, GitHubClient } from "../github/types";

describe("Pull Request API Tests", () => {
  let api: PullRequestApi;
  let logger: MockProxy<ActionLogger>;
  let client: DeepMockProxy<GitHubClient>;
  beforeEach(() => {
    logger = mock<ActionLogger>();
    client = mockDeep<GitHubClient>();

    api = new PullRequestApi(
      client,
      { owner: "owner", repo: "example" },
      logger,
    );
  });

  test("Should filter prs without auto-merge", async () => {
    const mockedPrs: { node: Partial<PullRequest> }[] = [
      {
        node: {
          number: 1,
          autoMergeRequest: { enabledAt: "abc" },
          viewerCanUpdateBranch: true,
          title: "one",
        },
      },
      { node: { number: 2, viewerCanUpdateBranch: true, title: "two" } },
    ];
    client.graphql.mockResolvedValue({
      repository: {
        pullRequests: { edges: mockedPrs, pageInfo: { hasNextPage: false } },
      },
    });
    const prs = await api.listPRs(true);
    expect(prs).toHaveLength(1);
    expect(prs).toContainEqual({
      number: mockedPrs[0].node.number,
      title: mockedPrs[0].node.title,
    });
    expect(prs).not.toContainEqual({
      number: mockedPrs[1].node.number,
      title: mockedPrs[1].node.title,
    });
  });

  test("Should return all prs without filter", async () => {
    const mockedPrs: { node: Partial<PullRequest> }[] = [
      {
        node: {
          number: 1,
          autoMergeRequest: { enabledAt: "abc" },
          viewerCanUpdateBranch: true,
          title: "one",
        },
      },
      { node: { number: 2, viewerCanUpdateBranch: true, title: "two" } },
    ];
    client.graphql.mockResolvedValue({
      repository: {
        pullRequests: { edges: mockedPrs, pageInfo: { hasNextPage: false } },
      },
    });
    const prs = await api.listPRs(false);
    expect(prs).toHaveLength(2);
    expect(prs).toEqual([
      { number: mockedPrs[0].node.number, title: mockedPrs[0].node.title },
      { number: mockedPrs[1].node.number, title: mockedPrs[1].node.title },
    ]);
  });

  test("Should filter drafts PRs", async () => {
    const mockedPrs: { node: Partial<PullRequest> }[] = [
      {
        node: {
          number: 1,
          autoMergeRequest: { enabledAt: "abc" },
          viewerCanUpdateBranch: true,
          title: "one",
        },
      },
      { node: { number: 2, viewerCanUpdateBranch: true, isDraft:true, title: "two" } },
    ];
    client.graphql.mockResolvedValue({
      repository: {
        pullRequests: { edges: mockedPrs, pageInfo: { hasNextPage: false } },
      },
    });
    client.graphql.mockResolvedValue({
      repository: {
        pullRequests: { edges: mockedPrs, pageInfo: { hasNextPage: false } },
      },
    });
    const prs = await api.listPRs(false);
    expect(prs).toHaveLength(1);
    expect(prs).toContainEqual({
      number: mockedPrs[0].node.number,
      title: mockedPrs[0].node.title,
    });
    expect(prs).not.toContainEqual({
      number: mockedPrs[1].node.number,
      title: mockedPrs[1].node.title,
    });
  });
});
