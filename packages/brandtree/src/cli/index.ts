#!/usr/bin/env node

import { runMain } from "citty";

import { mainCommand } from "./command.ts";

await runMain(mainCommand);
