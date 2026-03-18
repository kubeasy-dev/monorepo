import { describe, it } from "vitest";

describe("OAuth provider configuration", () => {
  it.todo(
    "configures GitHub socialProvider with redirectURI to api.kubeasy.dev (AUTH-02)",
  );
  it.todo(
    "configures Google socialProvider with redirectURI to api.kubeasy.dev (AUTH-02)",
  );
  it.todo(
    "configures Microsoft socialProvider with redirectURI to api.kubeasy.dev (AUTH-02)",
  );
});

describe("trustedOrigins", () => {
  it.todo(
    "includes localhost:3000, localhost:3001, kubeasy.dev, api.kubeasy.dev (AUTH-04)",
  );
  it.todo("does not include *.vercel.app wildcard (AUTH-04)");
});

describe("CORS configuration", () => {
  it.todo("allowHeaders includes User-Agent (AUTH-04)");
  it.todo("origin list matches trustedOrigins (AUTH-04)");
});
