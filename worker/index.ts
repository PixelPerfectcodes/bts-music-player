const CANONICAL_HOST = "www.truckdrivermusic.in";

export default {
  fetch(request, env) {
    const url = new URL(request.url);

    if (url.protocol !== "https:" || url.hostname !== CANONICAL_HOST) {
      url.protocol = "https:";
      url.hostname = CANONICAL_HOST;
      url.port = "";

      return Response.redirect(url.toString(), 308);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
