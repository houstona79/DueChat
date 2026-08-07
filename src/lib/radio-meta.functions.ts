import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { readNowPlaying } from "./radio-meta.server";

export const getNowPlaying = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ url: z.string().url().max(500) }).parse(data))
  .handler(async ({ data }) => readNowPlaying(data.url));
