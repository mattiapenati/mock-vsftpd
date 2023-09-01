import "https://deno.land/std@0.201.0/dotenv/load.ts";
import { Octokit } from "https://esm.sh/octokit@3.1.0?dts";

interface Version {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

function versionCmp(a: Version, b: Version) {
  // lexicographic comparison
  const aa = a.major * 1_000_000 + a.minor * 1_000 + a.patch;
  const bb = b.major * 1_000_000 + b.minor * 1_000 + b.patch;
  return (aa < bb) ? -1 : ((aa > bb) ? 1 : 0);
}

const dockerBaseUrl = "https://hub.docker.com";

async function dockerLogin(
  options: { username: string; password: string },
): Promise<string> {
  interface Response {
    token: string;
  }

  const url = `${dockerBaseUrl}/v2/users/login`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });

  if (response.status !== 200) {
    throw new Error("failed to login");
  }

  return response.json().then((data: Response) => data.token);
}

async function dockerListTags(
  token: string,
  { namespace, repository }: {
    namespace: string;
    repository: string;
  },
) {
  interface Response {
    count: number;
    results: {
      name: string;
    }[];
  }

  let allNames: string[] = [];
  const page = 0;
  for (;;) {
    const pageSize = 100;
    const url = (page && page >= 0)
      ? `${dockerBaseUrl}/v2/namespaces/${namespace}/repositories/${repository}/tags?page=${page}&page_size=${pageSize}`
      : `${dockerBaseUrl}/v2/namespaces/${namespace}/repositories/${repository}/tags?page_size=${pageSize}`;
    const response = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (response.status !== 200) {
      throw new Error("failed to download list of tags");
    }

    const body: Response = await response.json();
    allNames = allNames.concat(body.results.map((r) => r.name));

    if (allNames.length < body.count) {
      break;
    }
  }

  // filter only valid triplet
  const validVersionRegExp = /^(\d+)\.(\d+)\.(\d+)$/;
  return allNames
    .map((name) => {
      const matches = name.match(validVersionRegExp);
      if (matches) {
        const version = {
          major: Number.parseInt(matches[1]),
          minor: Number.parseInt(matches[2]),
          patch: Number.parseInt(matches[3]),
        };
        return version;
      }
    })
    .filter((x): x is Version => x !== undefined)
    .sort(versionCmp);
}

async function githubListContainerTags(token: string, { packageName }: {
  packageName: string;
}) {
  const octokit = new Octokit({ auth: token });

  const api = octokit.rest.packages
    .getAllPackageVersionsForPackageOwnedByAuthenticatedUser;
  const packageVersion = octokit.paginate.iterator(api, {
    package_type: "container",
    package_name: packageName,
    per_page: 100,
  });

  let allTags: string[] = [];
  for await (const { data: packages } of packageVersion) {
    for (const { metadata: packageMetadata } of packages) {
      const tags = packageMetadata.container.tags as string[];
      if (tags.length > 0) {
        allTags = allTags.concat(tags);
      }
    }
  }

  // filter only valid triplet
  const validTagRegExp = /^(\d+)\.(\d+)\.(\d+)$/;
  return allTags
    .map((name) => {
      const matches = name.match(validTagRegExp);
      if (matches) {
        const version = {
          major: Number.parseInt(matches[1]),
          minor: Number.parseInt(matches[2]),
          patch: Number.parseInt(matches[3]),
        };
        return version;
      }
    })
    .filter((x): x is Version => x !== undefined)
    .sort(versionCmp);
}

async function main() {
  // fetch list of all docker alpine images
  const dockerUsername = Deno.env.get("DOCKER_USERNAME") as string;
  const dockerPassword = Deno.env.get("DOCKER_PASSWORD") as string;
  const dockerToken = await dockerLogin({
    username: dockerUsername,
    password: dockerPassword,
  });
  const allAlpineTags = await dockerListTags(dockerToken, {
    namespace: "library",
    repository: "alpine",
  });

  // fetch list of all package tags
  const githubToken = Deno.env.get("GITHUB_TOKEN") as string;
  const allPackageTags = await githubListContainerTags(githubToken, {
    packageName: "mock-vsftpd",
  });

  const latestPackageVersion = allPackageTags[allPackageTags.length - 1];

  const newestAlpineTags = allAlpineTags.filter((alpineTag) =>
    versionCmp(latestPackageVersion, alpineTag) < 0
  );

  const value = JSON.stringify(newestAlpineTags.map((v) => `${v.major}.${v.minor}.${v.patch}`));
  const name = "version";
  console.log(`${name}=${value}`);

  // workaroung for octokit
  Deno.exit(0);
}

main();
