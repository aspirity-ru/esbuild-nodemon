#!/usr/bin/env node
const { resolve: resolvePath, relative } = require("path");
const { parse: nodemonParse } = require("nodemon/lib/cli");
const { getRootBuildDirectory } = require("../lib/get-root-build-directory");
const { rmdirSync } = require("../lib/rm");
const { startBuild } = require("../lib/esbuild");
const { startNodemon } = require("../lib/nodemon");

async function run() {
  const outFilename = "output.js";
  const buildDir = resolvePath(getRootBuildDirectory(), `_${getPathDate()}`);
  const outputFilePath = resolvePath(buildDir, outFilename);
  console.log("[esbuild-nodemon]", { pid: process.pid });

  /** @type { nodemon.Settings } */
  const nodemonOptions = nodemonParse(process.argv);
  await startBuild(nodemonOptions.script, outputFilePath);
  const mon = startNodemon(nodemonOptions, outputFilePath);

  function removeBuildDir() {
    const relPath = relative(process.cwd(), buildDir);
    console.log("[esbuild-nodemon]", "Removing build directory", {
      path: relPath,
    });
    rmdirSync(buildDir, { recursive: true });
  }

  let shutdown = function (signal) {
    console.log("[esbuild-nodemon]", "Graceful shutdown", { signal });

    mon.emit("quit", 0);
    mon.once("exit", () => {
      removeBuildDir();
      process.exit();
    });

    shutdown = () => {
      removeBuildDir();
      console.log("[esbuild-nodemon]", "Force shutdown");
      process.exit();
    };
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

run();

function getPathDate() {
  return new Date().toISOString().replace(/\:/g, "-");
}
