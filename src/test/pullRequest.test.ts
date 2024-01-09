import { DeepMockProxy, mock, mockDeep, MockProxy } from "jest-mock-extended";

import { PullRequestApi } from "../github/pullRequest";
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
    const mockedPrs = [
      { number: 1, auto_merge: true, title: "one" },
      { number: 2, auto_merge: false, title: "two" },
    ];
    client.paginate.mockResolvedValue(mockedPrs);
    const prs = await api.listPRs(true);
    expect(prs).toHaveLength(1);
    expect(prs).toContainEqual({
      number: mockedPrs[0].number,
      title: mockedPrs[0].title,
    });
    expect(prs).not.toContainEqual({
      number: mockedPrs[1].number,
      title: mockedPrs[1].title,
    });
  });

  test("Should return all prs without filter", async () => {
    const mockedPrs = [
      { number: 1, auto_merge: true, title: "one" },
      { number: 2, auto_merge: false, title: "two" },
    ];
    client.paginate.mockResolvedValue(mockedPrs);
    const prs = await api.listPRs(false);
    expect(prs).toHaveLength(2);
    expect(prs).toEqual([
      { number: mockedPrs[0].number, title: mockedPrs[0].title },
      { number: mockedPrs[1].number, title: mockedPrs[1].title },
    ]);
  });

  test("Should filter drafts PRs", async () => {
    const mockedPrs = [
      { number: 1, auto_merge: false, title: "one" },
      { number: 2, auto_merge: false, draft: true, title: "two" },
    ];
    client.paginate.mockResolvedValue(mockedPrs);
    const prs = await api.listPRs(false);
    expect(prs).toHaveLength(1);
    expect(prs).toContainEqual({
      number: mockedPrs[0].number,
      title: mockedPrs[0].title,
    });
    expect(prs).not.toContainEqual({
      number: mockedPrs[1].number,
      title: mockedPrs[1].title,
    });
  });
});
