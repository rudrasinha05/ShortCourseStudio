import {adminAccountForDialog,isPortalSessionAction,portalSessionAction,scopePortalRequest} from "../lib/portal-session";
import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const worker = {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, async () => {
      const path=new URL(request.url).pathname;
      if(path==="/session/admin-account")return adminAccountForDialog(request,env.SITE_ADMIN_EMAIL);
      if(isPortalSessionAction(path))return env.DB?portalSessionAction(request,env.DB,env.SITE_ADMIN_EMAIL):new Response("Portal sign-in is temporarily unavailable.",{status:503,headers:{"cache-control":"no-store"}});
      const scoped=await scopePortalRequest(request,env.DB,env.SITE_ADMIN_EMAIL);
      const response = await handler.fetch(scoped, env, ctx);
      if (path!=="/"&&!/^\/(?:apply|application-status|student|faculty|admin|staff|login|profile|forms|api|courses|wishlist)(?:\/|$)/.test(path)) return response;
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "private, no-store");
      return new Response(response.body, {status:response.status,statusText:response.statusText,headers});
    });
  },
};

export default worker;
