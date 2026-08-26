/** Glama ownership claim: https://glama.ai — email must match the Glama account. */
export const GET = () =>
  Response.json(
    { $schema: "https://glama.ai/mcp/schemas/connector.json", maintainers: [{ email: process.env.GLAMA_MAINTAINER_EMAIL ?? "hapark85@gmail.com" }] },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
