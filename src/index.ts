import { getInput, setOutput, summary } from "@actions/core";
import { SummaryTableRow } from "@actions/core/lib/summary";
import { context, getOctokit } from "@actions/github";
import { Context } from "@actions/github/lib/context";

import { PullRequestApi } from "./github/pullRequest";
import { generateCoreLogger } from "./util";

const getRepo = (ctx: Context) => {
  let repo = getInput("repo", { required: false });
  if (!repo) {
    repo = ctx.repo.repo;
  }

  let owner = getInput("owner", { required: false });
  if (!owner) {
    owner = ctx.repo.owner;
  }

  return { repo, owner };
};

const repo = getRepo(context);

setOutput("repo", `${repo.owner}/${repo.repo}`);
const logger = generateCoreLogger();

const action = async () => {
  const token = getInput("GITHUB_TOKEN", { required: true });
  const repoInfo = getRepo(context);
  const api = new PullRequestApi(getOctokit(token), repoInfo);
  const prs = await api.listPRs(true);
  if (prs.length > 0) {
    logger.info(`About to update ${prs.length} PRs 🗄️`);
    const rows: SummaryTableRow[] = [
      [
        { data: "PR Number", header: true },
        { data: "Result", header: true },
      ],
    ];
    for (const number of prs) {
      logger.info(`📡 - Updating #${number}`);
      const repoTxt = `[#${number}](https://github.com/${repoInfo.owner}/${repoInfo.repo}/pull/${number})`;
      try {
        await api.update(number);
        rows.push([repoTxt, "Pass ✅"]);
        logger.info(`📥 - Updated #${number}`);
      } catch (error) {
        logger.error(error as string | Error);
        rows.push([repoTxt, "Fail ❌"]);
      }
    }
    logger.info(" - Finished updating PRs");
    await summary
      .addHeading("Up to date", 1)
      .addHeading("PRs updated", 3)
      .addTable(rows)
      .write();
  } else {
    logger.info("No matching PRs found. Aborting");
    summary.addHeading("Up to date", 1).addHeading("No matching PRs found");
  }
};

action()
  .then(() => {
    logger.info("Operation completed");
  })
  .catch((e) => logger.error(e as Error));
