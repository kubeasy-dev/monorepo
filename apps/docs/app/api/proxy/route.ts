import { withEvlog } from "@/lib/evlog";
import { openapi } from "@/lib/openapi";

const proxy = openapi.createProxy();

export const GET = withEvlog(proxy.GET);
export const HEAD = withEvlog(proxy.HEAD);
export const PUT = withEvlog(proxy.PUT);
export const POST = withEvlog(proxy.POST);
export const PATCH = withEvlog(proxy.PATCH);
export const DELETE = withEvlog(proxy.DELETE);
