import { getInput, setFailed, summary } from "@actions/core";
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

const logger = generateCoreLogger();

const action = async () => {
  const token = getInput("GITHUB_TOKEN", { required: true });
  const repoInfo = getRepo(context);
  const actionUrl = `${context.serverUrl}/${repoInfo.owner}/${repoInfo.repo}/actions/runs/${context.runId}`;
  const requireAutoMerge: boolean =
    getInput("REQUIRE_AUTO_MERGE", { required: false }) !== "false";
  const api = new PullRequestApi(getOctokit(token), repoInfo, logger);
  const prs = await api.listPRs(requireAutoMerge);
  if (prs.length > 0) {
    logger.info(`About to update ${prs.length} PRs 🗄️`);
    const rows: SummaryTableRow[] = [
      [
        { data: "PR Number", header: true },
        { data: "Title", header: true },
        { data: "Result", header: true },
      ],
    ];

    // JSON array with all the PRs numbers
    const prsNumbers = JSON.stringify(prs.map(({ number }) => number));

    logger.info(`About to update PRs: ${prsNumbers}`);

    for (const { number, title } of prs.sort((a, b) => a.number - b.number)) {
      logger.info(`📡 - Updating '${title}' #${number}`);
      const repoTxt = `${repoInfo.owner}/${repoInfo.repo}#${number}`;
      try {
        await api.update(number);
        rows.push([repoTxt, title, "Pass ✅"]);
        logger.info(`📥 - Updated #${number}`);
      } catch (error) {
        logger.error(error as string | Error);
        rows.push([repoTxt, title, "Fail ❌"]);
        await api.comment(
          number,
          "# Failed to update PR ❌\n\n" +
            "There was an error while trying to keep this PR `up-to-date`\n\n" +
            "You may have conflicts ‼️ or may have to manually sync it with the target branch 👉❇️\n\n" +
            `More info in the [logs](${actionUrl}) 📋`,
        );
      }
    }
    logger.info("🪄 - Finished updating PRs");
    await summary
      .addHeading("Up to date", 1)
      .addHeading("PRs updated", 3)
      .addTable(rows)
      .write();
  } else {
    logger.info("No matching PRs found. Aborting");
    await summary
      .addHeading("Up to date", 1)
      .addHeading("No matching PRs found")
      .write();
  }
};

action()
  .then(() => {
    logger.info("Operation completed");
  })
  .catch(setFailed);
