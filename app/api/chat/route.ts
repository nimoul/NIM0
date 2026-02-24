export const maxDuration = 60;

import {
  convertToModelMessages,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { Octokit } from "@octokit/rest";
import { auth } from "@/app/(auth)/auth";
import { getChatCountByUserId } from "@/lib/db/queries";
import { userEntitlements } from "@/lib/entitlements";
import { ChatSDKError } from "@/lib/errors";

function getOctokit() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set");
  return new Octokit({ auth: token });
}

function getRepoInfo() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!owner || !repo) throw new Error("GITHUB_OWNER or GITHUB_REPO is not set");
  return { owner, repo, branch };
}

const tools = {
  list_directory_contents: tool({
    description:
      "List the files and folders at a given path in the GitHub repository. Use this to explore the codebase structure before reading or editing files. Returns an array of entries with name, type (file or dir), and path.",
    inputSchema: z.object({
      path: z
        .string()
        .describe(
          "The directory path to list, relative to the repository root. Use an empty string or '.' for the root."
        ),
    }),
    execute: async ({ path }) => {
      const octokit = getOctokit();
      const { owner, repo, branch } = getRepoInfo();
      const normalizedPath = path === "." ? "" : path;

      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: normalizedPath,
        ref: branch,
      });

      if (!Array.isArray(data)) {
        return { error: "Path is a file, not a directory. Use read_github_file instead." };
      }

      return data.map((item) => ({
        name: item.name,
        type: item.type,
        path: item.path,
      }));
    },
  }),

  read_github_file: tool({
    description:
      "Read the full text content of a single file from the GitHub repository. Returns the decoded UTF-8 string content. You MUST use list_directory_contents first to verify the file exists before reading.",
    inputSchema: z.object({
      path: z
        .string()
        .describe("The file path relative to the repository root, e.g. 'app/page.tsx'."),
    }),
    execute: async ({ path }) => {
      const octokit = getOctokit();
      const { owner, repo, branch } = getRepoInfo();

      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      if (Array.isArray(data) || data.type !== "file") {
        return { error: "Path is a directory, not a file. Use list_directory_contents instead." };
      }

      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return { path, content, sha: data.sha };
    },
  }),

  create_github_file: tool({
    description:
      "Create a brand new file in the GitHub repository and commit it. The file must NOT already exist. Use list_directory_contents to confirm the file does not exist before calling this.",
    inputSchema: z.object({
      path: z
        .string()
        .describe(
          "The file path relative to the repository root where the new file will be created."
        ),
      content: z
        .string()
        .describe("The full text content to write into the new file."),
    }),
    execute: async ({ path, content }) => {
      const octokit = getOctokit();
      const { owner, repo, branch } = getRepoInfo();

      const { data } = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: `Create ${path}`,
        content: Buffer.from(content).toString("base64"),
        branch,
      });

      return {
        success: true,
        path,
        sha: data.content?.sha,
        commitSha: data.commit.sha,
      };
    },
  }),

  patch_github_file: tool({
    description:
      "Surgically edit an existing file in the GitHub repository by replacing an exact substring. Fetches the current file, runs a single string replacement, and commits the result. IMPORTANT: You MUST read_github_file first to get the exact current content. The targetString must match the file content EXACTLY (including whitespace and indentation) or the patch will fail.",
    inputSchema: z.object({
      path: z
        .string()
        .describe("The file path relative to the repository root to patch."),
      targetString: z
        .string()
        .describe(
          "The exact code block to find and replace. Must match the current file content character-for-character including whitespace."
        ),
      replacementString: z
        .string()
        .describe("The new code block that will replace the targetString."),
    }),
    execute: async ({ path, targetString, replacementString }) => {
      const octokit = getOctokit();
      const { owner, repo, branch } = getRepoInfo();

      // Fetch the current file to get its sha and content
      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      if (Array.isArray(fileData) || fileData.type !== "file") {
        return { error: "Path is a directory, not a file." };
      }

      const currentContent = Buffer.from(fileData.content, "base64").toString("utf-8");

      if (!currentContent.includes(targetString)) {
        return {
          error:
            "targetString not found in file. Read the file first with read_github_file and copy the exact text you want to replace.",
          currentContentPreview: currentContent.slice(0, 500),
        };
      }

      const updatedContent = currentContent.replace(targetString, replacementString);

      const { data } = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: `Patch ${path}`,
        content: Buffer.from(updatedContent).toString("base64"),
        sha: fileData.sha,
        branch,
      });

      return {
        success: true,
        path,
        sha: data.content?.sha,
        commitSha: data.commit.sha,
      };
    },
  }),
};

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chatCount = await getChatCountByUserId({
    userId: session.user.id,
    differenceInHours: 24,
  });

  if (chatCount >= userEntitlements.maxMessagesPerDay) {
    return new ChatSDKError("rate_limit:chat").toResponse();
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "openai/gpt-4o",
    system: `You are an expert autonomous coding agent with direct access to a GitHub repository. You can explore the codebase, read files, create new files, and surgically patch existing files.

WORKFLOW — Always follow this order:
1. EXPLORE first: Use list_directory_contents to understand the project structure.
2. READ before editing: Use read_github_file to get the exact current content of any file you plan to modify.
3. EDIT surgically: Use patch_github_file with an exact targetString copied from the file you just read. Never guess at file contents.
4. CREATE when needed: Use create_github_file only for brand new files after confirming the path doesn't already exist.

Never attempt to patch a file you haven't just read. Never assume file contents — always verify first.`,
    messages: await convertToModelMessages(messages),
    tools,
    maxSteps: 20,
    abortSignal: req.signal,
  });

  return result.toUIMessageStreamResponse();
}
