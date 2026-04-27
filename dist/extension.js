"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/tree-kill/index.js
var require_tree_kill = __commonJS({
  "node_modules/tree-kill/index.js"(exports2, module2) {
    "use strict";
    var childProcess = require("child_process");
    var spawn = childProcess.spawn;
    var exec5 = childProcess.exec;
    module2.exports = function(pid, signal, callback) {
      if (typeof signal === "function" && callback === void 0) {
        callback = signal;
        signal = void 0;
      }
      pid = parseInt(pid);
      if (Number.isNaN(pid)) {
        if (callback) {
          return callback(new Error("pid must be a number"));
        } else {
          throw new Error("pid must be a number");
        }
      }
      var tree = {};
      var pidsToProcess = {};
      tree[pid] = [];
      pidsToProcess[pid] = 1;
      switch (process.platform) {
        case "win32":
          exec5("taskkill /pid " + pid + " /T /F", callback);
          break;
        case "darwin":
          buildProcessTree(pid, tree, pidsToProcess, function(parentPid) {
            return spawn("pgrep", ["-P", parentPid]);
          }, function() {
            killAll(tree, signal, callback);
          });
          break;
        // case 'sunos':
        //     buildProcessTreeSunOS(pid, tree, pidsToProcess, function () {
        //         killAll(tree, signal, callback);
        //     });
        //     break;
        default:
          buildProcessTree(pid, tree, pidsToProcess, function(parentPid) {
            return spawn("ps", ["-o", "pid", "--no-headers", "--ppid", parentPid]);
          }, function() {
            killAll(tree, signal, callback);
          });
          break;
      }
    };
    function killAll(tree, signal, callback) {
      var killed = {};
      try {
        Object.keys(tree).forEach(function(pid) {
          tree[pid].forEach(function(pidpid) {
            if (!killed[pidpid]) {
              killPid(pidpid, signal);
              killed[pidpid] = 1;
            }
          });
          if (!killed[pid]) {
            killPid(pid, signal);
            killed[pid] = 1;
          }
        });
      } catch (err) {
        if (callback) {
          return callback(err);
        } else {
          throw err;
        }
      }
      if (callback) {
        return callback();
      }
    }
    function killPid(pid, signal) {
      try {
        process.kill(parseInt(pid, 10), signal);
      } catch (err) {
        if (err.code !== "ESRCH") throw err;
      }
    }
    function buildProcessTree(parentPid, tree, pidsToProcess, spawnChildProcessesList, cb) {
      var ps = spawnChildProcessesList(parentPid);
      var allData = "";
      ps.stdout.on("data", function(data) {
        var data = data.toString("ascii");
        allData += data;
      });
      var onClose = function(code) {
        delete pidsToProcess[parentPid];
        if (code != 0) {
          if (Object.keys(pidsToProcess).length == 0) {
            cb();
          }
          return;
        }
        allData.match(/\d+/g).forEach(function(pid) {
          pid = parseInt(pid, 10);
          tree[parentPid].push(pid);
          tree[pid] = [];
          pidsToProcess[pid] = 1;
          buildProcessTree(pid, tree, pidsToProcess, spawnChildProcessesList, cb);
        });
      };
      ps.on("close", onClose);
    }
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode15 = __toESM(require("vscode"));

// src/constants.ts
var SYSTEM_PID_THRESHOLD = 100;
var SYSTEM_PROCESS_NAMES = /* @__PURE__ */ new Set([
  // macOS
  "launchd",
  "kernel_task",
  "WindowServer",
  "loginwindow",
  "coreaudiod",
  "mds",
  "mds_stores",
  "diskarbitrationd",
  "configd",
  // Linux
  "systemd",
  "init",
  "kthreadd",
  "ksoftirqd",
  "rcu_sched",
  "migration",
  "watchdog",
  "kworker",
  "dbus-daemon",
  // Windows
  "System",
  "smss",
  "csrss",
  "wininit",
  "winlogon",
  "services",
  "lsass",
  "svchost",
  "dwm",
  "explorer",
  "spoolsv",
  "SearchIndexer",
  "conhost",
  "fontdrvhost",
  "sihost",
  "taskhostw",
  "RuntimeBroker",
  "ShellExperienceHost",
  "StartMenuExperienceHost",
  "SecurityHealthService",
  "SecurityHealthSystray",
  "MsMpEng",
  "WmiPrvSE",
  "dllhost",
  "audiodg",
  "ctfmon",
  "dasHost",
  "msdtc",
  "NisSrv",
  "SearchHost",
  "TextInputHost",
  "WidgetService",
  "Widgets",
  "LsaIso",
  "Memory Compression",
  "Registry",
  "jhi_service",
  "Intel",
  "igfxCUIService",
  "spoolsv",
  "wlms",
  "WUDFHost",
  "Unknown Process"
]);
var IDE_PROCESS_NAMES = /* @__PURE__ */ new Set([
  // VS Code
  "Code",
  "code",
  "code-insiders",
  "Antigravity",
  "antigravity",
  "language_server_windows_x64",
  "electron",
  // JetBrains
  "idea",
  "idea64",
  "phpstorm",
  "webstorm",
  "pycharm",
  "goland",
  "rider",
  "clion",
  "datagrip",
  "rubymine",
  // Other editors
  "sublime_text",
  "atom",
  "brackets"
]);
var DEFAULT_REFRESH_INTERVAL = 5e3;
var COMMAND_TIMEOUT_MS = 3e3;
var POST_KILL_REFRESH_DELAY_MS = 500;
var MAX_ANNOTATION_LENGTH = 50;
var MAX_PROFILE_NAME_LENGTH = 40;
var MAX_PROFILE_DESCRIPTION_LENGTH = 120;
var MAX_CMD_STORAGE_LENGTH = 200;
var NOTIFICATION_DEDUP_WINDOW_MS = 2e3;
var STATUS_BAR_WARNING_THRESHOLD = 10;
var FREE_PORT_SCAN_RANGE = 20;
var KILL_HISTORY_CHANNEL_NAME = "Portman \u2014 Kill History";
var BUILTIN_FRAMEWORK_PATTERNS = [
  // JavaScript / TypeScript frameworks
  { pattern: /next[\\/].*dev|next\s+dev/i, label: "Next.js" },
  { pattern: /nuxt[\\/]|nuxt\s+dev/i, label: "Nuxt" },
  { pattern: /remix[\\/].*dev|remix\s+dev/i, label: "Remix" },
  { pattern: /gatsby[\\/].*develop|gatsby\s+develop/i, label: "Gatsby" },
  { pattern: /astro[\\/].*dev|astro\s+dev/i, label: "Astro" },
  { pattern: /svelte[\\/].*dev|svelte-kit\s+dev/i, label: "SvelteKit" },
  { pattern: /vite/i, label: "Vite" },
  { pattern: /react-scripts\s+start/i, label: "Create React App" },
  { pattern: /angular[\\/]cli|ng\s+serve/i, label: "Angular" },
  { pattern: /webpack[\\/]|webpack-dev-server/i, label: "Webpack Dev Server" },
  { pattern: /parcel/i, label: "Parcel" },
  { pattern: /turbo[\\/]|turbopack/i, label: "Turbopack" },
  { pattern: /electron/i, label: "Electron" },
  { pattern: /express/i, label: "Express" },
  { pattern: /fastify/i, label: "Fastify" },
  { pattern: /nest[\\/].*start|nest\s+start/i, label: "NestJS" },
  { pattern: /hono/i, label: "Hono" },
  // Python
  { pattern: /uvicorn/i, label: "FastAPI (Uvicorn)" },
  { pattern: /gunicorn/i, label: "Gunicorn" },
  { pattern: /flask\s+run/i, label: "Flask" },
  { pattern: /manage\.py\s+runserver/i, label: "Django" },
  { pattern: /streamlit/i, label: "Streamlit" },
  // Ruby
  { pattern: /rails\s+server|rails\s+s\b/i, label: "Ruby on Rails" },
  { pattern: /puma/i, label: "Puma" },
  // Go
  { pattern: /go\s+run/i, label: "Go" },
  // Java / JVM
  { pattern: /java\s+-jar/i, label: "Java" },
  { pattern: /spring-boot/i, label: "Spring Boot" },
  { pattern: /tomcat/i, label: "Tomcat" },
  { pattern: /gradle.*bootRun/i, label: "Spring Boot (Gradle)" },
  // Rust
  { pattern: /cargo\s+run/i, label: "Rust (Cargo)" },
  // PHP
  { pattern: /php\s+artisan\s+serve/i, label: "Laravel" },
  { pattern: /php\s+-S/i, label: "PHP Built-in Server" },
  // Docker
  { pattern: /docker-proxy/i, label: "Docker" },
  { pattern: /com\.docker/i, label: "Docker" },
  // Databases & Services
  { pattern: /mongod/i, label: "MongoDB" },
  { pattern: /mysqld/i, label: "MySQL" },
  { pattern: /postgres/i, label: "PostgreSQL" },
  { pattern: /redis-server/i, label: "Redis" },
  { pattern: /nginx/i, label: "Nginx" }
];
var PORT_EXTRACTION_PATTERNS = [
  /PORT[=\s]+(\d{2,5})/i,
  /--port[=\s]+(\d{2,5})/i,
  /-p[=\s]+(\d{2,5})/,
  /:(\d{4,5})(?:\/|$|\s|")/
];
var TERMINAL_CONFLICT_PATTERNS = [
  /EADDRINUSE[:\s].*?:(\d{2,5})/i,
  /address already in use[:\s].*?:(\d{2,5})/i,
  /bind: address already in use/i,
  /Port (\d{2,5}) is in use/i,
  /listen EADDRINUSE.*?:(\d{2,5})/i
];
var ENV_PORT_VARIABLE_PATTERNS = [
  /^PORT$/i,
  /^.*_PORT$/i,
  /^SERVER_PORT$/i,
  /^DATABASE_PORT$/i,
  /^API_PORT$/i,
  /^REDIS_PORT$/i
];
var ENV_FILE_NAMES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test"
];

// src/data/portScanner.ts
var import_child_process = require("child_process");
var os = __toESM(require("os"));
function execAsync(cmd, timeoutMs = COMMAND_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const child = (0, import_child_process.exec)(cmd, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed) {
          reject(new Error(`Command timed out after ${timeoutMs}ms: ${cmd}`));
        } else {
          resolve(stdout || "");
        }
      } else {
        resolve(stdout);
      }
    });
  });
}
function parseLsofOutput(stdout) {
  const entries = [];
  const lines = stdout.split("\n");
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 9) {
      continue;
    }
    const name = parts[parts.length - 1];
    const state = parts[parts.length - 1];
    const node = parts[parts.length - 2];
    const nameField = parts.find((p) => p.includes(":") && /\d+/.test(p) && !p.startsWith("0t"));
    if (!nameField) {
      continue;
    }
    const lastColon = nameField.lastIndexOf(":");
    if (lastColon === -1) {
      continue;
    }
    const address = nameField.substring(0, lastColon).replace(/[\[\]]/g, "") || "0.0.0.0";
    const portStr = nameField.substring(lastColon + 1);
    const port = parseInt(portStr, 10);
    if (isNaN(port) || port <= 0 || port > 65535) {
      continue;
    }
    const pid = parseInt(parts[1], 10);
    if (isNaN(pid)) {
      continue;
    }
    const protocolField = parts[7] || parts[8] || "";
    const protocol = protocolField.toUpperCase().includes("UDP") ? "UDP" : "TCP";
    entries.push({
      port,
      protocol,
      address: address === "*" ? "0.0.0.0" : address,
      pid
    });
  }
  return entries;
}
function parseSsOutput(stdout) {
  const entries = [];
  const lines = stdout.split("\n");
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5 || !parts[0].includes("LISTEN")) {
      continue;
    }
    const localAddr = parts[3];
    const lastColon = localAddr.lastIndexOf(":");
    if (lastColon === -1) {
      continue;
    }
    const address = localAddr.substring(0, lastColon).replace(/[\[\]]/g, "") || "0.0.0.0";
    const port = parseInt(localAddr.substring(lastColon + 1), 10);
    if (isNaN(port) || port <= 0 || port > 65535) {
      continue;
    }
    const processInfo = parts.slice(5).join(" ");
    const pidMatch = processInfo.match(/pid=(\d+)/);
    const pid = pidMatch ? parseInt(pidMatch[1], 10) : 0;
    entries.push({
      port,
      protocol: "TCP",
      // ss -t only shows TCP; would need -u for UDP
      address: address === "*" ? "0.0.0.0" : address,
      pid
    });
  }
  return entries;
}
function parseNetstatOutput(stdout) {
  const entries = [];
  const lines = stdout.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.includes("LISTENING")) {
      continue;
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length < 5) {
      continue;
    }
    const proto = parts[0].toUpperCase();
    const protocol = proto === "UDP" ? "UDP" : "TCP";
    const localAddr = parts[1];
    const lastColon = localAddr.lastIndexOf(":");
    if (lastColon === -1) {
      continue;
    }
    let address = localAddr.substring(0, lastColon).replace(/[\[\]]/g, "");
    const port = parseInt(localAddr.substring(lastColon + 1), 10);
    if (isNaN(port) || port <= 0 || port > 65535) {
      continue;
    }
    if (address === "::" || address === "::1") {
      address = address;
    } else if (!address) {
      address = "0.0.0.0";
    }
    const pid = parseInt(parts[parts.length - 1], 10);
    if (isNaN(pid)) {
      continue;
    }
    entries.push({ port, protocol, address, pid });
  }
  return entries;
}
async function scanPorts() {
  const platform4 = os.platform();
  let entries = [];
  if (platform4 === "win32") {
    try {
      const stdout = await execAsync("netstat -ano");
      entries = parseNetstatOutput(stdout);
    } catch (err) {
      console.error("[Portman] netstat scan failed:", err.message);
      return [];
    }
  } else {
    try {
      const stdout = await execAsync("lsof -nP -iTCP -iUDP -sTCP:LISTEN");
      entries = parseLsofOutput(stdout);
    } catch {
      try {
        const stdout = await execAsync("ss -tlnp");
        entries = parseSsOutput(stdout);
      } catch (err) {
        console.error("[Portman] Port scan failed (both lsof and ss):", err.message);
        return [];
      }
    }
  }
  const seen = /* @__PURE__ */ new Set();
  const deduplicated = entries.filter((e) => {
    const key = `${e.port}:${e.protocol}:${e.pid}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  deduplicated.sort((a, b) => a.port - b.port);
  return deduplicated;
}

// src/data/processMapper.ts
var import_child_process2 = require("child_process");
var os2 = __toESM(require("os"));
function execAsync2(cmd, timeoutMs = COMMAND_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    (0, import_child_process2.exec)(cmd, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout) => {
      if (error) {
        if (error.killed) {
          reject(new Error(`Command timed out after ${timeoutMs}ms: ${cmd}`));
        } else {
          resolve(stdout || "");
        }
      } else {
        resolve(stdout);
      }
    });
  });
}
async function mapProcessesUnix(pids) {
  const result = /* @__PURE__ */ new Map();
  if (pids.length === 0) {
    return result;
  }
  const batchSize = 50;
  for (let i = 0; i < pids.length; i += batchSize) {
    const batch = pids.slice(i, i + batchSize);
    const pidList = batch.join(",");
    try {
      const stdout = await execAsync2(`ps -p ${pidList} -o pid=,ppid=,rss=,comm=,args=`);
      const lines = stdout.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        const parts = trimmed.split(/\s+/);
        if (parts.length < 4) {
          continue;
        }
        const pid = parseInt(parts[0], 10);
        const ppid = parseInt(parts[1], 10);
        const rss = parseInt(parts[2], 10);
        if (isNaN(pid)) {
          continue;
        }
        const comm = parts[3];
        const cmd = parts.slice(4).join(" ") || comm;
        result.set(pid, {
          pid,
          ppid: isNaN(ppid) ? 0 : ppid,
          name: comm.split("/").pop() || comm,
          cmd: cmd.substring(0, MAX_CMD_STORAGE_LENGTH),
          memoryMB: isNaN(rss) ? 0 : Math.round(rss / 1024)
        });
      }
    } catch (err) {
      console.error(`[Portman] ps lookup failed for batch:`, err.message);
    }
  }
  return result;
}
async function mapProcessesWindows(pids) {
  const result = /* @__PURE__ */ new Map();
  if (pids.length === 0) {
    return result;
  }
  const pidSet = new Set(pids);
  try {
    const stdout = await execAsync2("tasklist /FO CSV /NH");
    const lines = stdout.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      const match = trimmed.match(/"([^"]+)","(\d+)","[^"]*","[^"]*","([\d,]+)\s*K"/);
      if (!match) {
        continue;
      }
      const name = match[1];
      const pid = parseInt(match[2], 10);
      const memKB = parseInt(match[3].replace(/,/g, ""), 10);
      if (pidSet.has(pid)) {
        result.set(pid, {
          pid,
          ppid: 0,
          name: name.replace(/\.exe$/i, ""),
          cmd: name,
          memoryMB: isNaN(memKB) ? 0 : Math.round(memKB / 1024)
        });
      }
    }
  } catch (err) {
    console.error(`[Portman] tasklist failed:`, err.message);
  }
  const enrichPids = [...result.keys()].slice(0, 30);
  for (const pid of enrichPids) {
    const info = result.get(pid);
    if (!info) {
      continue;
    }
    try {
      const stdout = await execAsync2(
        `wmic process where "ProcessId=${pid}" get CommandLine /format:list`,
        2e3
      );
      const match = stdout.match(/CommandLine=(.*)/);
      if (match && match[1].trim()) {
        info.cmd = match[1].trim().substring(0, MAX_CMD_STORAGE_LENGTH);
      }
    } catch {
    }
  }
  return result;
}
async function mapProcesses(pids) {
  const uniquePids = [...new Set(pids.filter((p) => p > 0))];
  const platform4 = os2.platform();
  let processMap;
  if (platform4 === "win32") {
    processMap = await mapProcessesWindows(uniquePids);
  } else {
    processMap = await mapProcessesUnix(uniquePids);
  }
  for (const pid of uniquePids) {
    if (!processMap.has(pid)) {
      processMap.set(pid, {
        pid,
        ppid: 0,
        name: "Unknown Process",
        cmd: `PID ${pid} \u2014 process terminated or inaccessible`,
        memoryMB: 0
      });
    }
  }
  return processMap;
}

// src/logic/frameworkDetector.ts
var vscode = __toESM(require("vscode"));
function detectFramework(cmd) {
  if (!cmd || cmd.trim().length === 0) {
    return null;
  }
  const config = vscode.workspace.getConfiguration("portman");
  const customMappings = config.get("frameworkMappings", []);
  for (const mapping of customMappings) {
    try {
      const regex = new RegExp(mapping.pattern, "i");
      if (regex.test(cmd)) {
        return mapping.label;
      }
    } catch {
      console.warn(`[Portman] Invalid regex in frameworkMappings: "${mapping.pattern}"`);
    }
  }
  for (const { pattern, label } of BUILTIN_FRAMEWORK_PATTERNS) {
    if (pattern.test(cmd)) {
      return label;
    }
  }
  return null;
}
function detectFrameworkFromProcess(processName, cmd) {
  const fromCmd = detectFramework(cmd);
  if (fromCmd) {
    return fromCmd;
  }
  const fromName = detectFramework(processName);
  return fromName;
}

// src/logic/killOrchestrator.ts
var vscode2 = __toESM(require("vscode"));
var os3 = __toESM(require("os"));
var import_child_process3 = require("child_process");
var import_tree_kill = __toESM(require_tree_kill());
function execAsync3(cmd, timeoutMs = COMMAND_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    (0, import_child_process3.exec)(cmd, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}
function isSystemProcess(pid, processName) {
  if (pid <= SYSTEM_PID_THRESHOLD) {
    return true;
  }
  const normalizedName = processName.replace(/\.exe$/i, "");
  for (const sysName of SYSTEM_PROCESS_NAMES) {
    if (sysName.toLowerCase() === normalizedName.toLowerCase()) {
      return true;
    }
  }
  return false;
}
async function verifyPid(pid, expectedName) {
  const platform4 = os3.platform();
  try {
    if (platform4 === "win32") {
      const stdout = await execAsync3(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, 2e3);
      const match = stdout.match(/"([^"]+)","(\d+)"/);
      if (!match) {
        return { exists: false, nameMatches: false, currentName: "" };
      }
      const currentName = match[1].replace(/\.exe$/i, "");
      return {
        exists: true,
        nameMatches: currentName.toLowerCase() === expectedName.replace(/\.exe$/i, "").toLowerCase(),
        currentName
      };
    } else {
      const stdout = await execAsync3(`ps -p ${pid} -o comm=`, 2e3);
      const currentName = stdout.trim().split("/").pop() || "";
      if (!currentName) {
        return { exists: false, nameMatches: false, currentName: "" };
      }
      return {
        exists: true,
        nameMatches: currentName.toLowerCase() === expectedName.toLowerCase(),
        currentName
      };
    }
  } catch {
    return { exists: false, nameMatches: false, currentName: "" };
  }
}
function killAsync(pid, signal) {
  return new Promise((resolve, reject) => {
    (0, import_tree_kill.default)(pid, signal, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
var KillOrchestrator = class {
  sessionHistory;
  onRefreshRequested = null;
  constructor(sessionHistory) {
    this.sessionHistory = sessionHistory;
  }
  /** Register a callback to trigger port list refresh after a kill */
  setRefreshCallback(callback) {
    this.onRefreshRequested = callback;
  }
  /**
   * Kill a process by PID.
   * Handles system process safety guard, PID validation, and logging.
   */
  async kill(pid, port, processName, source = "sidebar") {
    if (isSystemProcess(pid, processName)) {
      const confirm = await vscode2.window.showWarningMessage(
        `\u26A0\uFE0F System Process Warning

Process "${processName}" (PID ${pid}) appears to be a system-critical process.
Terminating it may cause OS instability.

Are you sure you want to kill this process?`,
        { modal: true },
        "Kill Anyway"
      );
      if (confirm !== "Kill Anyway") {
        this.sessionHistory.log({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          port,
          pid,
          processName,
          outcome: "cancelled",
          errorMessage: "User cancelled system process kill",
          riskLevel: "high_risk",
          source
        });
        return false;
      }
    }
    const verification = await verifyPid(pid, processName);
    if (!verification.exists) {
      vscode2.window.showInformationMessage(
        `Process "${processName}" (PID ${pid}) has already terminated.`
      );
      this.sessionHistory.log({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        port,
        pid,
        processName,
        outcome: "failure",
        errorMessage: "Process no longer exists",
        riskLevel: isSystemProcess(pid, processName) ? "high_risk" : "normal",
        source
      });
      this.scheduleRefresh();
      return false;
    }
    if (!verification.nameMatches) {
      const proceed = await vscode2.window.showWarningMessage(
        `PID Mismatch Warning

PID ${pid} is now running "${verification.currentName}" instead of "${processName}".
The original process may have terminated and the PID was reused.

Kill "${verification.currentName}" anyway?`,
        { modal: true },
        "Kill Anyway"
      );
      if (proceed !== "Kill Anyway") {
        this.sessionHistory.log({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          port,
          pid,
          processName,
          outcome: "cancelled",
          errorMessage: `PID reuse detected: now "${verification.currentName}"`,
          riskLevel: "high_risk",
          source
        });
        return false;
      }
    }
    try {
      await killAsync(pid, "SIGTERM");
      this.sessionHistory.log({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        port,
        pid,
        processName,
        outcome: "success",
        errorMessage: null,
        riskLevel: isSystemProcess(pid, processName) ? "high_risk" : "normal",
        source
      });
      vscode2.window.showInformationMessage(
        `Killed "${processName}" (PID ${pid}) on port ${port}.`
      );
      this.scheduleRefresh();
      return true;
    } catch (err) {
      const errorMessage = err.message;
      this.sessionHistory.log({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        port,
        pid,
        processName,
        outcome: "failure",
        errorMessage,
        riskLevel: isSystemProcess(pid, processName) ? "high_risk" : "normal",
        source
      });
      const retry = await vscode2.window.showErrorMessage(
        `Failed to kill "${processName}" (PID ${pid}): ${errorMessage}`,
        "Retry"
      );
      if (retry === "Retry") {
        return this.kill(pid, port, processName, source);
      }
      return false;
    }
  }
  /**
   * Kill all processes matching a set of ports (for bulk profile kill).
   * FR-08: Shows a confirmation modal listing all processes before killing.
   */
  async killBulk(entries) {
    if (entries.length === 0) {
      return { succeeded: 0, failed: 0 };
    }
    const processList = entries.map((e) => `  \u2022 Port ${e.port}: ${e.processName} (PID ${e.pid})`).join("\n");
    const confirm = await vscode2.window.showWarningMessage(
      `Kill ${entries.length} process(es)?

${processList}`,
      { modal: true },
      "Kill All"
    );
    if (confirm !== "Kill All") {
      return { succeeded: 0, failed: 0 };
    }
    let succeeded = 0;
    let failed = 0;
    for (const entry of entries) {
      const result = await this.kill(entry.pid, entry.port, entry.processName, "bulk_profile");
      if (result) {
        succeeded++;
      } else {
        failed++;
      }
    }
    return { succeeded, failed };
  }
  scheduleRefresh() {
    if (this.onRefreshRequested) {
      setTimeout(() => {
        this.onRefreshRequested?.();
      }, POST_KILL_REFRESH_DELAY_MS);
    }
  }
};

// src/logic/conflictDetector.ts
var vscode3 = __toESM(require("vscode"));
var path = __toESM(require("path"));
function extractPortsFromScript(scriptValue) {
  const ports = [];
  for (const pattern of PORT_EXTRACTION_PATTERNS) {
    const matches = scriptValue.matchAll(new RegExp(pattern, "gi"));
    for (const match of matches) {
      const port = parseInt(match[1], 10);
      if (port >= 1024 && port <= 65535 && !ports.includes(port)) {
        ports.push(port);
      }
    }
  }
  return ports;
}
var ConflictDetector = class {
  scriptPortMap = /* @__PURE__ */ new Map();
  disposables = [];
  portListGetter = null;
  /** Register a callback to get the current live port list */
  setPortListGetter(getter) {
    this.portListGetter = getter;
  }
  /** Initialize by scanning workspace package.json files */
  async initialize() {
    await this.scanWorkspaceScripts();
    const watcher = vscode3.workspace.createFileSystemWatcher("**/package.json");
    watcher.onDidChange(() => this.scanWorkspaceScripts());
    watcher.onDidCreate(() => this.scanWorkspaceScripts());
    watcher.onDidDelete(() => this.scanWorkspaceScripts());
    this.disposables.push(watcher);
    const config = vscode3.workspace.getConfiguration("portman");
    if (config.get("conflictPrediction", true)) {
      this.disposables.push(
        vscode3.tasks.onDidStartTask((e) => this.onTaskStarted(e))
      );
    }
  }
  /** Scan all package.json files in the workspace for port references */
  async scanWorkspaceScripts() {
    this.scriptPortMap.clear();
    const packageJsonFiles = await vscode3.workspace.findFiles(
      "**/package.json",
      "**/node_modules/**",
      20
      // limit
    );
    for (const uri of packageJsonFiles) {
      try {
        const content = await vscode3.workspace.fs.readFile(uri);
        const pkg = JSON.parse(Buffer.from(content).toString("utf-8"));
        if (pkg.scripts && typeof pkg.scripts === "object") {
          for (const [scriptName, scriptValue] of Object.entries(pkg.scripts)) {
            if (typeof scriptValue !== "string") {
              continue;
            }
            const ports = extractPortsFromScript(scriptValue);
            if (ports.length > 0) {
              const key = `${path.basename(path.dirname(uri.fsPath))}:${scriptName}`;
              this.scriptPortMap.set(key, ports);
            }
          }
        }
      } catch {
      }
    }
  }
  /** Handle task start events — check for conflicts */
  onTaskStarted(e) {
    if (!this.portListGetter) {
      return;
    }
    const config = vscode3.workspace.getConfiguration("portman");
    if (!config.get("conflictPrediction", true)) {
      return;
    }
    const task = e.execution.task;
    const activePorts = this.portListGetter();
    let taskPorts = [];
    for (const [scriptKey, ports] of this.scriptPortMap) {
      const scriptName = scriptKey.split(":").pop() || "";
      if (task.name.includes(scriptName) || scriptName.includes(task.name)) {
        taskPorts = ports;
        break;
      }
    }
    if (task.definition && typeof task.definition === "object") {
      const cmdStr = JSON.stringify(task.definition);
      const extracted = extractPortsFromScript(cmdStr);
      taskPorts = [.../* @__PURE__ */ new Set([...taskPorts, ...extracted])];
    }
    for (const requiredPort of taskPorts) {
      const conflict = activePorts.find((p) => p.port === requiredPort);
      if (conflict) {
        this.showConflictWarning({
          port: requiredPort,
          taskName: task.name,
          occupyingPid: conflict.pid,
          occupyingProcessName: conflict.processName,
          source: "task"
        });
      }
    }
  }
  /** Show a conflict warning notification */
  async showConflictWarning(event) {
    const processLabel = event.occupyingProcessName || `PID ${event.occupyingPid}`;
    const action = await vscode3.window.showWarningMessage(
      `Port ${event.port} required by "${event.taskName}" is currently occupied by ${processLabel} (PID ${event.occupyingPid}). Kill it before the task fails?`,
      "Kill Now",
      "Ignore"
    );
    if (action === "Kill Now") {
      vscode3.commands.executeCommand("portman.killProcess", {
        pid: event.occupyingPid,
        port: event.port,
        processName: event.occupyingProcessName
      });
    }
  }
  /** Get all known script→port mappings (for testing/debugging) */
  getScriptPortMap() {
    return new Map(this.scriptPortMap);
  }
  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
};

// src/logic/profileManager.ts
var vscode4 = __toESM(require("vscode"));
var PROFILES_STORAGE_KEY = "portman.profiles";
var ProfileManager = class {
  context;
  constructor(context) {
    this.context = context;
  }
  /** Get all saved profiles */
  getProfiles() {
    return this.context.globalState.get(PROFILES_STORAGE_KEY, []);
  }
  /** Get a single profile by ID */
  getProfile(id) {
    return this.getProfiles().find((p) => p.id === id);
  }
  /** Save all profiles to globalState */
  async saveProfiles(profiles) {
    await this.context.globalState.update(PROFILES_STORAGE_KEY, profiles);
  }
  /** Create a new profile */
  async createProfile(name, ports, description) {
    const profiles = this.getProfiles();
    const profile = {
      id: this.generateId(),
      name: name.substring(0, MAX_PROFILE_NAME_LENGTH),
      description: description?.substring(0, MAX_PROFILE_DESCRIPTION_LENGTH) ?? null,
      ports,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      isActive: false,
      source: "local"
    };
    profiles.push(profile);
    await this.saveProfiles(profiles);
    return profile;
  }
  /** Update an existing profile */
  async updateProfile(id, updates) {
    const profiles = this.getProfiles();
    const index = profiles.findIndex((p) => p.id === id);
    if (index === -1) {
      return void 0;
    }
    if (updates.name) {
      profiles[index].name = updates.name.substring(0, MAX_PROFILE_NAME_LENGTH);
    }
    if (updates.description !== void 0) {
      profiles[index].description = updates.description?.substring(0, MAX_PROFILE_DESCRIPTION_LENGTH) ?? null;
    }
    if (updates.ports) {
      profiles[index].ports = updates.ports;
    }
    profiles[index].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await this.saveProfiles(profiles);
    return profiles[index];
  }
  /** Delete a profile by ID */
  async deleteProfile(id) {
    const profiles = this.getProfiles();
    const filtered = profiles.filter((p) => p.id !== id);
    if (filtered.length === profiles.length) {
      return false;
    }
    await this.saveProfiles(filtered);
    return true;
  }
  /** Activate a profile (deactivates all others first) */
  async activateProfile(id) {
    const profiles = this.getProfiles();
    let found = false;
    for (const profile of profiles) {
      if (profile.id === id) {
        profile.isActive = true;
        found = true;
      } else {
        profile.isActive = false;
      }
    }
    if (found) {
      await this.saveProfiles(profiles);
    }
    return found;
  }
  /** Deactivate all profiles */
  async deactivateAll() {
    const profiles = this.getProfiles();
    for (const profile of profiles) {
      profile.isActive = false;
    }
    await this.saveProfiles(profiles);
  }
  /** Get the currently active profile, if any */
  getActiveProfile() {
    return this.getProfiles().find((p) => p.isActive);
  }
  /**
   * Compute the health state of a profile based on the live port list.
   *
   * - green: All profile ports are free (no conflicts)
   * - amber: Some profile ports are running (expected)
   * - red: A profile port is occupied by an unexpected process
   *
   * Per review feedback (FR-08 gap).
   */
  getProfileHealth(profile, activePorts) {
    const activePortNumbers = new Set(activePorts.map((p) => p.port));
    const profilePortSet = new Set(profile.ports);
    let occupiedCount = 0;
    for (const port of profilePortSet) {
      if (activePortNumbers.has(port)) {
        occupiedCount++;
      }
    }
    if (occupiedCount === 0) {
      return "green";
    }
    if (occupiedCount === profile.ports.length) {
      return "amber";
    }
    return "amber";
  }
  /** Generate a UUID v4 */
  generateId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  /**
   * Interactive profile creation flow via Quick Pick + Input Box.
   * Three steps: name → port selection → description
   */
  async interactiveCreateProfile(availablePorts) {
    const name = await vscode4.window.showInputBox({
      prompt: "Enter a name for the port profile",
      placeHolder: "e.g., Full Stack Dev, API + DB",
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "Profile name is required";
        }
        if (value.length > MAX_PROFILE_NAME_LENGTH) {
          return `Maximum ${MAX_PROFILE_NAME_LENGTH} characters`;
        }
        return null;
      }
    });
    if (!name) {
      return void 0;
    }
    const portItems = availablePorts.map((p) => ({
      label: `Port ${p.port}`,
      description: `${p.frameworkLabel || p.processName} (PID ${p.pid})`,
      port: p.port,
      picked: false
    }));
    if (portItems.length === 0) {
      vscode4.window.showWarningMessage("No active ports to add to the profile.");
      return void 0;
    }
    const selected = await vscode4.window.showQuickPick(portItems, {
      canPickMany: true,
      placeHolder: "Select ports to include in the profile",
      title: `Profile: ${name}`
    });
    if (!selected || selected.length === 0) {
      return void 0;
    }
    const description = await vscode4.window.showInputBox({
      prompt: "Enter an optional description (press Enter to skip)",
      placeHolder: "e.g., Frontend + API + Redis for local development",
      validateInput: (value) => {
        if (value && value.length > MAX_PROFILE_DESCRIPTION_LENGTH) {
          return `Maximum ${MAX_PROFILE_DESCRIPTION_LENGTH} characters`;
        }
        return null;
      }
    });
    const ports = selected.map((s) => s.port);
    return this.createProfile(name, ports, description || void 0);
  }
};

// src/logic/teamConfigManager.ts
var vscode5 = __toESM(require("vscode"));
var TeamConfigManager = class {
  profileManager;
  constructor(profileManager) {
    this.profileManager = profileManager;
  }
  /**
   * Auto-import team profiles on workspace open.
   * Called at activation if portman.useTeamConfig is enabled.
   */
  async autoImport() {
    const config = vscode5.workspace.getConfiguration("portman");
    if (!config.get("useTeamConfig", false)) {
      return;
    }
    const files = await vscode5.workspace.findFiles(
      ".devcontainer/portman.json",
      null,
      1
    );
    if (files.length === 0) {
      return;
    }
    try {
      const content = await vscode5.workspace.fs.readFile(files[0]);
      const teamConfig = JSON.parse(Buffer.from(content).toString("utf-8"));
      await this.importProfiles(teamConfig);
      console.log("[Portman] Team config imported from .devcontainer/portman.json");
    } catch (err) {
      console.error("[Portman] Failed to import team config:", err.message);
    }
  }
  /** Import profiles from a team config, merging with existing profiles */
  async importProfiles(teamConfig) {
    if (!teamConfig.profiles || !Array.isArray(teamConfig.profiles)) {
      return;
    }
    const existingProfiles = this.profileManager.getProfiles();
    const existingTeamNames = new Set(
      existingProfiles.filter((p) => p.source === "team").map((p) => p.name)
    );
    for (const teamProfile of teamConfig.profiles) {
      if (!teamProfile.name || !Array.isArray(teamProfile.ports)) {
        continue;
      }
      if (existingTeamNames.has(teamProfile.name)) {
        const existing = existingProfiles.find(
          (p) => p.source === "team" && p.name === teamProfile.name
        );
        if (existing) {
          await this.profileManager.updateProfile(existing.id, {
            ports: teamProfile.ports,
            description: teamProfile.description
          });
        }
        continue;
      }
      const profile = await this.profileManager.createProfile(
        teamProfile.name,
        teamProfile.ports,
        teamProfile.description
      );
      const profiles = this.profileManager.getProfiles();
      const created = profiles.find((p) => p.id === profile.id);
      if (created) {
        created.source = "team";
        await this.profileManager.updateProfile(created.id, {
          name: created.name
          // no-op update to trigger save
        });
      }
    }
    if (teamConfig.defaultProfile) {
      const allProfiles = this.profileManager.getProfiles();
      const defaultP = allProfiles.find((p) => p.name === teamConfig.defaultProfile);
      if (defaultP) {
        await this.profileManager.activateProfile(defaultP.id);
      }
    }
  }
  /**
   * Export current profiles to .devcontainer/portman.json.
   * Creates the .devcontainer directory if it doesn't exist.
   */
  async exportProfiles() {
    const profiles = this.profileManager.getProfiles();
    if (profiles.length === 0) {
      vscode5.window.showWarningMessage("No profiles to export.");
      return false;
    }
    const items = profiles.map((p) => ({
      label: p.name,
      description: `${p.ports.length} port(s)${p.source === "team" ? " [team]" : ""}`,
      picked: true,
      profile: p
    }));
    const selected = await vscode5.window.showQuickPick(items, {
      canPickMany: true,
      placeHolder: "Select profiles to export",
      title: "Export to .devcontainer/portman.json"
    });
    if (!selected || selected.length === 0) {
      return false;
    }
    const teamConfig = {
      profiles: selected.map((s) => ({
        name: s.profile.name,
        description: s.profile.description || void 0,
        ports: s.profile.ports
      }))
    };
    const activeProfile = this.profileManager.getActiveProfile();
    if (activeProfile && selected.some((s) => s.profile.id === activeProfile.id)) {
      teamConfig.defaultProfile = activeProfile.name;
    }
    const workspaceFolder = vscode5.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode5.window.showErrorMessage("No workspace folder open.");
      return false;
    }
    const devcontainerDir = vscode5.Uri.joinPath(workspaceFolder.uri, ".devcontainer");
    const configFile = vscode5.Uri.joinPath(devcontainerDir, "portman.json");
    try {
      try {
        await vscode5.workspace.fs.stat(devcontainerDir);
      } catch {
        await vscode5.workspace.fs.createDirectory(devcontainerDir);
      }
      const content = JSON.stringify(teamConfig, null, 2) + "\n";
      await vscode5.workspace.fs.writeFile(
        configFile,
        Buffer.from(content, "utf-8")
      );
      vscode5.window.showInformationMessage(
        `Exported ${selected.length} profile(s) to .devcontainer/portman.json`
      );
      return true;
    } catch (err) {
      vscode5.window.showErrorMessage(
        `Failed to export: ${err.message}`
      );
      return false;
    }
  }
};

// node_modules/get-port-please/dist/index.mjs
var import_node_net = require("node:net");
var import_node_os = require("node:os");
var unsafePorts = /* @__PURE__ */ new Set([
  1,
  // tcpmux
  7,
  // echo
  9,
  // discard
  11,
  // systat
  13,
  // daytime
  15,
  // netstat
  17,
  // qotd
  19,
  // chargen
  20,
  // ftp data
  21,
  // ftp access
  22,
  // ssh
  23,
  // telnet
  25,
  // smtp
  37,
  // time
  42,
  // name
  43,
  // nicname
  53,
  // domain
  69,
  // tftp
  77,
  // priv-rjs
  79,
  // finger
  87,
  // ttylink
  95,
  // supdup
  101,
  // hostriame
  102,
  // iso-tsap
  103,
  // gppitnp
  104,
  // acr-nema
  109,
  // pop2
  110,
  // pop3
  111,
  // sunrpc
  113,
  // auth
  115,
  // sftp
  117,
  // uucp-path
  119,
  // nntp
  123,
  // NTP
  135,
  // loc-srv /epmap
  137,
  // netbios
  139,
  // netbios
  143,
  // imap2
  161,
  // snmp
  179,
  // BGP
  389,
  // ldap
  427,
  // SLP (Also used by Apple Filing Protocol)
  465,
  // smtp+ssl
  512,
  // print / exec
  513,
  // login
  514,
  // shell
  515,
  // printer
  526,
  // tempo
  530,
  // courier
  531,
  // chat
  532,
  // netnews
  540,
  // uucp
  548,
  // AFP (Apple Filing Protocol)
  554,
  // rtsp
  556,
  // remotefs
  563,
  // nntp+ssl
  587,
  // smtp (rfc6409)
  601,
  // syslog-conn (rfc3195)
  636,
  // ldap+ssl
  989,
  // ftps-data
  990,
  // ftps
  993,
  // ldap+ssl
  995,
  // pop3+ssl
  1719,
  // h323gatestat
  1720,
  // h323hostcall
  1723,
  // pptp
  2049,
  // nfs
  3659,
  // apple-sasl / PasswordServer
  4045,
  // lockd
  5060,
  // sip
  5061,
  // sips
  6e3,
  // X11
  6566,
  // sane-port
  6665,
  // Alternate IRC [Apple addition]
  6666,
  // Alternate IRC [Apple addition]
  6667,
  // Standard IRC [Apple addition]
  6668,
  // Alternate IRC [Apple addition]
  6669,
  // Alternate IRC [Apple addition]
  6697,
  // IRC + TLS
  10080
  // Amanda
]);
function isUnsafePort(port) {
  return unsafePorts.has(port);
}
function isSafePort(port) {
  return !isUnsafePort(port);
}
var GetPortError = class extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.message = message;
  }
  name = "GetPortError";
};
function _log(verbose, message) {
  if (verbose) {
    console.log(`[get-port] ${message}`);
  }
}
function _generateRange(from, to) {
  if (to < from) {
    return [];
  }
  const r = [];
  for (let index = from; index <= to; index++) {
    r.push(index);
  }
  return r;
}
function _tryPort(port, host) {
  return new Promise((resolve) => {
    const server = (0, import_node_net.createServer)();
    server.unref();
    server.on("error", () => {
      resolve(false);
    });
    server.listen({ port, host }, () => {
      const { port: port2 } = server.address();
      server.close(() => {
        resolve(isSafePort(port2) && port2);
      });
    });
  });
}
function _getLocalHosts(additional) {
  const hosts = new Set(additional);
  for (const _interface of Object.values((0, import_node_os.networkInterfaces)())) {
    for (const config of _interface || []) {
      if (config.address && !config.internal && !config.address.startsWith("fe80::") && // Link-Local
      !config.address.startsWith("169.254")) {
        hosts.add(config.address);
      }
    }
  }
  return [...hosts];
}
async function _findPort(ports, host) {
  for (const port of ports) {
    const r = await _tryPort(port, host);
    if (r) {
      return r;
    }
  }
}
function _fmtOnHost(hostname) {
  return hostname ? `on host ${JSON.stringify(hostname)}` : "on any host";
}
var HOSTNAME_RE = /^(?!-)[\d.:A-Za-z-]{1,63}(?<!-)$/;
function _validateHostname(hostname, _public, verbose) {
  if (hostname && !HOSTNAME_RE.test(hostname)) {
    const fallbackHost = _public ? "0.0.0.0" : "127.0.0.1";
    _log(
      verbose,
      `Invalid hostname: ${JSON.stringify(hostname)}. Using ${JSON.stringify(
        fallbackHost
      )} as fallback.`
    );
    return fallbackHost;
  }
  return hostname;
}
async function getPort(_userOptions = {}) {
  if (typeof _userOptions === "number" || typeof _userOptions === "string") {
    _userOptions = { port: Number.parseInt(_userOptions + "") || 0 };
  }
  const _port = Number(_userOptions.port ?? process.env.PORT);
  const _userSpecifiedAnyPort = Boolean(
    _userOptions.port || _userOptions.ports?.length || _userOptions.portRange?.length
  );
  const options = {
    random: _port === 0,
    ports: [],
    portRange: [],
    alternativePortRange: _userSpecifiedAnyPort ? [] : [3e3, 3100],
    verbose: false,
    ..._userOptions,
    port: _port,
    host: _validateHostname(
      _userOptions.host ?? process.env.HOST,
      _userOptions.public,
      _userOptions.verbose
    )
  };
  if (options.random && !_userSpecifiedAnyPort) {
    return getRandomPort(options.host);
  }
  const portsToCheck = [
    options.port,
    ...options.ports,
    ..._generateRange(...options.portRange)
  ].filter((port) => {
    if (!port) {
      return false;
    }
    if (!isSafePort(port)) {
      _log(options.verbose, `Ignoring unsafe port: ${port}`);
      return false;
    }
    return true;
  });
  if (portsToCheck.length === 0) {
    portsToCheck.push(3e3);
  }
  let availablePort = await _findPort(portsToCheck, options.host);
  if (!availablePort && options.alternativePortRange.length > 0) {
    availablePort = await _findPort(
      _generateRange(...options.alternativePortRange),
      options.host
    );
    if (portsToCheck.length > 0) {
      let message = `Unable to find an available port (tried ${portsToCheck.join(
        "-"
      )} ${_fmtOnHost(options.host)}).`;
      if (availablePort) {
        message += ` Using alternative port ${availablePort}.`;
      }
      _log(options.verbose, message);
    }
  }
  if (!availablePort && _userOptions.random !== false) {
    availablePort = await getRandomPort(options.host);
    if (availablePort) {
      _log(options.verbose, `Using random port ${availablePort}`);
    }
  }
  if (!availablePort) {
    const triedRanges = [
      options.port,
      options.portRange.join("-"),
      options.alternativePortRange.join("-")
    ].filter(Boolean).join(", ");
    throw new GetPortError(
      `Unable to find an available port ${_fmtOnHost(
        options.host
      )} (tried ${triedRanges})`
    );
  }
  return availablePort;
}
async function getRandomPort(host) {
  const port = await checkPort(0, host);
  if (port === false) {
    throw new GetPortError(`Unable to find a random port ${_fmtOnHost(host)}`);
  }
  return port;
}
async function checkPort(port, host = process.env.HOST, verbose) {
  if (!host) {
    host = _getLocalHosts([void 0, "0.0.0.0"]);
  }
  if (!Array.isArray(host)) {
    return _tryPort(port, host);
  }
  for (const _host of host) {
    const _port = await _tryPort(port, _host);
    if (_port === false) {
      if (port < 1024 && verbose) {
        _log(
          verbose,
          `Unable to listen to the privileged port ${port} ${_fmtOnHost(
            _host
          )}`
        );
      }
      return false;
    }
    if (port === 0 && _port !== 0) {
      port = _port;
    }
  }
  return port;
}

// src/logic/portFinder.ts
async function findFreePort(basePort, excludePorts = []) {
  try {
    const port = await getPort({
      port: basePort + 1,
      portRange: [basePort + 1, basePort + FREE_PORT_SCAN_RANGE]
    });
    if (excludePorts.includes(port)) {
      for (let candidate = basePort + 1; candidate <= basePort + FREE_PORT_SCAN_RANGE; candidate++) {
        if (excludePorts.includes(candidate)) {
          continue;
        }
        const available = await getPort({ port: candidate });
        if (available === candidate) {
          return candidate;
        }
      }
      return null;
    }
    return port;
  } catch (err) {
    console.error("[Portman] Free port scan failed:", err.message);
    return null;
  }
}

// src/state/globalStore.ts
var ANNOTATIONS_PREFIX = "portman.annotations";
var GlobalStore = class {
  context;
  constructor(context) {
    this.context = context;
  }
  /**
   * Get the annotation for a port+process combination.
   * Key schema: annotation:{port}:{processName} (FR-09 review gap)
   */
  getAnnotation(port, processName) {
    const key = `${ANNOTATIONS_PREFIX}.${port}_${processName}`;
    return this.context.globalState.get(key, null) || null;
  }
  /**
   * Set an annotation for a port+process combination.
   */
  async setAnnotation(port, processName, label) {
    const key = `${ANNOTATIONS_PREFIX}.${port}_${processName}`;
    await this.context.globalState.update(key, label);
  }
  /**
   * Remove an annotation.
   */
  async removeAnnotation(port, processName) {
    const key = `${ANNOTATIONS_PREFIX}.${port}_${processName}`;
    await this.context.globalState.update(key, void 0);
  }
  /**
   * Get all annotations (for search/filter matching).
   * Returns a map of `{port}_{processName}` → label.
   */
  getAllAnnotations() {
    const result = /* @__PURE__ */ new Map();
    const keys = this.context.globalState.keys();
    for (const key of keys) {
      if (key.startsWith(ANNOTATIONS_PREFIX + ".")) {
        const suffix = key.substring(ANNOTATIONS_PREFIX.length + 1);
        const value = this.context.globalState.get(key);
        if (value) {
          result.set(suffix, value);
        }
      }
    }
    return result;
  }
  /**
   * Generic get from globalState.
   */
  get(key, defaultValue) {
    return this.context.globalState.get(key, defaultValue);
  }
  /**
   * Generic set to globalState.
   */
  async set(key, value) {
    await this.context.globalState.update(key, value);
  }
};

// src/state/sessionHistory.ts
var vscode6 = __toESM(require("vscode"));
var SessionHistory = class {
  entries = [];
  outputChannel;
  /**
   * Buffer for the last terminal command, used by the "Kill & Retry"
   * feature in Phase 2 (FR-15). Designed in Phase 1 per review feedback
   * to avoid a refactor of the kill orchestrator later.
   */
  lastTerminalCommand = null;
  constructor() {
    this.outputChannel = vscode6.window.createOutputChannel(KILL_HISTORY_CHANNEL_NAME);
  }
  /** Log a kill event to the session history */
  log(entry) {
    this.entries.push(entry);
    this.writeToChannel(entry);
  }
  /** Get all history entries */
  getEntries() {
    return this.entries;
  }
  /** Get the count of entries */
  get count() {
    return this.entries.length;
  }
  /** Clear all history entries */
  clear() {
    this.entries = [];
    this.outputChannel.clear();
    this.outputChannel.appendLine("--- Session history cleared ---");
  }
  /** Show the output channel */
  show() {
    if (this.entries.length === 0) {
      this.outputChannel.appendLine("No kill events recorded in this session.");
    }
    this.outputChannel.show(true);
  }
  /** Write a formatted entry to the output channel */
  writeToChannel(entry) {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const risk = entry.riskLevel === "high_risk" ? " \u26A0\uFE0F HIGH RISK" : "";
    const icon = entry.outcome === "success" ? "\u2713" : entry.outcome === "failure" ? "\u2717" : "\u25CB";
    let line = `[${timestamp}] ${icon} Port ${entry.port} | PID ${entry.pid} | ${entry.processName} | ${entry.outcome.toUpperCase()}${risk}`;
    if (entry.errorMessage) {
      line += ` | ${entry.errorMessage}`;
    }
    line += ` | via ${entry.source}`;
    this.outputChannel.appendLine(line);
  }
  /** Store the last terminal command for Kill & Retry (Phase 2) */
  setLastTerminalCommand(command, terminalName) {
    this.lastTerminalCommand = {
      command,
      terminalName,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  dispose() {
    this.outputChannel.dispose();
  }
};

// src/state/activityTracker.ts
var MAX_ENTRIES_PER_PORT = 50;
var ActivityTracker = class {
  /** Map of port → first seen timestamp */
  firstSeen = /* @__PURE__ */ new Map();
  /** Map of port → activity log */
  activities = /* @__PURE__ */ new Map();
  /** Record that a port was detected (tracks first-seen time) */
  portDetected(port, processName) {
    if (!this.firstSeen.has(port)) {
      this.firstSeen.set(port, /* @__PURE__ */ new Date());
      this.addActivity(port, {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        message: `process started on :${port}`,
        type: "info"
      });
    }
  }
  /** Record that a port is no longer active */
  portRemoved(port) {
    this.addActivity(port, {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      message: `:${port} process stopped`,
      type: "info"
    });
    this.firstSeen.delete(port);
  }
  /** Record a conflict detected on a port */
  conflictDetected(port, conflictWith) {
    this.addActivity(port, {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      message: `port :${port} conflict detected${conflictWith ? " with " + conflictWith : ""}`,
      type: "error"
    });
  }
  /** Record a kill event */
  killEvent(port, success, processName) {
    this.addActivity(port, {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      message: success ? `killed ${processName} on :${port}` : `failed to kill ${processName}`,
      type: success ? "success" : "error"
    });
  }
  /** Record an HTTP/network event (placeholder for future) */
  genericEvent(port, message, type = "info") {
    this.addActivity(port, {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      message,
      type
    });
  }
  /** Get the first-seen time for a port */
  getFirstSeen(port) {
    return this.firstSeen.get(port);
  }
  /** Get the uptime string for a port */
  getUptime(port) {
    const firstSeen = this.firstSeen.get(port);
    if (!firstSeen) {
      return "just now";
    }
    const diffMs = Date.now() - firstSeen.getTime();
    const seconds = Math.floor(diffMs / 1e3);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${seconds}s`;
  }
  /** Get activity log for a port */
  getActivities(port) {
    return this.activities.get(port) || [];
  }
  /** Reconcile current ports — track new ones, remove stale ones */
  reconcile(currentPorts, processNames) {
    const currentSet = new Set(currentPorts);
    for (const port of currentPorts) {
      if (!this.firstSeen.has(port)) {
        this.portDetected(port, processNames.get(port) || "unknown");
      }
    }
    for (const [port] of this.firstSeen) {
      if (!currentSet.has(port)) {
        this.portRemoved(port);
      }
    }
  }
  addActivity(port, activity) {
    if (!this.activities.has(port)) {
      this.activities.set(port, []);
    }
    const list = this.activities.get(port);
    list.push(activity);
    if (list.length > MAX_ENTRIES_PER_PORT) {
      list.splice(0, list.length - MAX_ENTRIES_PER_PORT);
    }
  }
};

// src/state/workspaceStore.ts
var vscode7 = __toESM(require("vscode"));
var WorkspaceStore = class {
  /**
   * Check if the current VS Code window has multiple workspace folders.
   */
  isMultiRoot() {
    const folders = vscode7.workspace.workspaceFolders;
    return !!folders && folders.length > 1;
  }
  /**
   * Get all workspace folder names and paths.
   */
  getWorkspaceFolders() {
    const folders = vscode7.workspace.workspaceFolders || [];
    return folders.map((f) => ({
      name: f.name,
      path: f.uri.fsPath
    }));
  }
  /**
   * Determine which workspace folder a port entry belongs to,
   * based on its process command path.
   *
   * @returns The workspace folder name, or null if not matched.
   */
  matchWorkspaceFolder(entry) {
    const folders = vscode7.workspace.workspaceFolders;
    if (!folders || folders.length <= 1) {
      return null;
    }
    const cmd = entry.processCmd.toLowerCase();
    for (const folder of folders) {
      const folderPath = folder.uri.fsPath.toLowerCase();
      if (cmd.includes(folderPath)) {
        return folder.name;
      }
      const folderName = folder.name.toLowerCase();
      if (cmd.includes(folderName)) {
        return folder.name;
      }
    }
    return null;
  }
  /**
   * Group port entries by workspace folder.
   * Returns a map of folderName → PortEntry[].
   * Ports not matching any workspace go under "Other".
   */
  groupByWorkspace(entries) {
    const groups = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      const folder = this.matchWorkspaceFolder(entry) || "Other";
      if (!groups.has(folder)) {
        groups.set(folder, []);
      }
      groups.get(folder).push(entry);
    }
    return groups;
  }
};

// src/ui/portWebviewProvider.ts
var vscode8 = __toESM(require("vscode"));
var PortWebviewProvider = class {
  static viewType = "portman-ports";
  webviewView;
  portEntries = [];
  freePorts = [];
  filterText = "";
  activityTracker;
  constructor(activityTracker) {
    this.activityTracker = activityTracker;
  }
  resolveWebviewView(webviewView, _context, _token) {
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true
    };
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "showDetail":
          vscode8.commands.executeCommand("portman.showDetail", this.portEntries.find((e) => e.port === message.port));
          break;
        case "killProcess":
          const entry = this.portEntries.find((e) => e.port === message.port);
          if (entry) {
            vscode8.commands.executeCommand("portman.killProcess", entry);
          }
          break;
        case "copyFreePort":
          vscode8.commands.executeCommand("portman.copyFreePort", message.port);
          break;
        case "refresh":
          vscode8.commands.executeCommand("portman.refreshPorts");
          break;
        case "filter":
          this.filterText = message.text || "";
          this.render();
          break;
      }
    });
    this.render();
  }
  /** Update port entries and re-render */
  setPortEntries(entries) {
    this.portEntries = entries;
    this.render();
  }
  /** Update free ports */
  setNearbyFreePorts(ports) {
    this.freePorts = ports;
    this.render();
  }
  /** Get port entries */
  getPortEntries() {
    return this.portEntries;
  }
  /** Get free ports */
  getFreePorts() {
    return this.freePorts;
  }
  /** Get dev port count */
  getDevPortCount() {
    return this.portEntries.filter((e) => e.category === "dev").length;
  }
  /** Get match count text */
  getMatchCountText() {
    const devCount = this.portEntries.filter((e) => e.category === "dev").length;
    return devCount > 0 ? `${devCount} dev port${devCount !== 1 ? "s" : ""}` : "no dev ports";
  }
  getFilteredEntries() {
    if (!this.filterText) {
      return this.portEntries;
    }
    const ft = this.filterText.toLowerCase();
    return this.portEntries.filter((e) => {
      return [
        String(e.port),
        String(e.pid),
        e.processName,
        e.processCmd,
        e.frameworkLabel || "",
        e.annotation || "",
        e.dockerContainerName || "",
        e.envVarName || ""
      ].some((f) => f.toLowerCase().includes(ft));
    });
  }
  render() {
    if (!this.webviewView) {
      return;
    }
    const filtered = this.getFilteredEntries();
    const devPorts = filtered.filter((e) => e.category === "dev");
    const idePorts = filtered.filter((e) => e.category === "ide");
    const systemPorts = filtered.filter((e) => e.category === "system");
    this.webviewView.webview.html = this.getHtml(devPorts, idePorts, systemPorts);
  }
  getHtml(devPorts, idePorts, systemPorts) {
    const devCardsHtml = devPorts.length > 0 ? devPorts.map((e) => this.renderDevCard(e)).join("") : `<div class="empty-state">
           <span class="empty-icon">\u2299</span>
           <div class="empty-title">No dev servers running</div>
           <div class="empty-sub">Start a project to see ports here</div>
         </div>`;
    const ideListHtml = idePorts.length > 0 ? idePorts.map((e) => this.renderCompactItem(e)).join("") : "";
    const systemListHtml = systemPorts.length > 0 ? systemPorts.map((e) => this.renderCompactItem(e)).join("") : "";
    const freeChipsHtml = this.freePorts.map(
      (p) => `<span class="chip" onclick="copyFreePort(${p})">${p}</span>`
    ).join("");
    return (
      /*html*/
      `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  :root {
    --bg: var(--vscode-sideBar-background);
    --fg: var(--vscode-sideBar-foreground);
    --card-bg: var(--vscode-editor-background);
    --card-border: var(--vscode-widget-border, #3e3e42);
    --card-hover: var(--vscode-list-hoverBackground);
    --accent: var(--vscode-focusBorder, #007acc);
    --green: #4ec9b0;
    --red: #f44747;
    --orange: #ce9178;
    --muted: var(--vscode-descriptionForeground);
    --badge-bg: var(--vscode-badge-background);
    --badge-fg: var(--vscode-badge-foreground);
    --input-bg: var(--vscode-input-background);
    --input-border: var(--vscode-input-border);
    --input-fg: var(--vscode-input-foreground);
    --section-border: var(--vscode-sideBarSectionHeader-border, #3e3e42);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--fg);
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    padding: 0;
    overflow-x: hidden;
  }

  /* \u2500\u2500 Search \u2500\u2500 */
  .search-bar {
    padding: 8px 12px;
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--bg);
    border-bottom: 1px solid var(--section-border);
  }
  .search-input {
    width: 100%;
    padding: 5px 8px;
    border-radius: 4px;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--input-fg);
    font-size: 12px;
    outline: none;
  }
  .search-input:focus { border-color: var(--accent); }
  .search-input::placeholder { color: var(--muted); }

  /* \u2500\u2500 Section headers \u2500\u2500 */
  .section {
    padding: 0 8px;
  }
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 4px 6px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--muted);
    cursor: pointer;
    user-select: none;
  }
  .section-header:hover { color: var(--fg); }
  .section-count {
    font-size: 11px;
    background: var(--badge-bg);
    color: var(--badge-fg);
    border-radius: 10px;
    padding: 1px 7px;
    font-weight: 600;
  }
  .section-toggle {
    font-size: 10px;
    margin-right: 4px;
    transition: transform 0.15s;
  }
  .section-toggle.collapsed { transform: rotate(-90deg); }
  .section-body.collapsed { display: none; }

  /* \u2500\u2500 Dev port cards \u2500\u2500 */
  .dev-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 8px;
    padding: 12px 14px;
    margin: 6px 0;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
    position: relative;
  }
  .dev-card:hover {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }
  .card-top {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .status-dot.green { background: var(--green); box-shadow: 0 0 6px rgba(78,201,176,0.4); }
  .status-dot.red { background: var(--red); box-shadow: 0 0 6px rgba(244,71,71,0.4); }
  .status-dot.grey { background: var(--muted); }
  .status-dot.purple { background: #b267e6; box-shadow: 0 0 6px rgba(178,103,230,0.4); }

  .card-port {
    font-size: 16px;
    font-weight: 700;
    color: var(--fg);
    letter-spacing: -0.5px;
  }
  .card-framework {
    font-size: 12px;
    font-weight: 500;
    color: var(--accent);
    margin-left: auto;
  }
  .card-process {
    font-size: 12px;
    color: var(--muted);
    margin-top: 4px;
    padding-left: 20px;
  }
  .card-badges {
    display: flex;
    gap: 4px;
    margin-top: 6px;
    padding-left: 20px;
    flex-wrap: wrap;
  }
  .card-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .card-badge.docker { background: #563d7c; color: #d4bbff; }
  .card-badge.env { background: #2d4a22; color: #8fca7f; }
  .card-badge.mem { background: transparent; color: var(--muted); border: 1px solid var(--card-border); }
  .card-badge.pid { background: transparent; color: var(--muted); border: 1px solid var(--card-border); }

  .card-actions {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    padding-left: 20px;
  }
  .card-action {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid var(--card-border);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition: all 0.12s;
  }
  .card-action:hover { color: var(--fg); border-color: var(--accent); }
  .card-action.kill { color: var(--red); }
  .card-action.kill:hover { border-color: var(--red); background: rgba(244,71,71,0.08); }

  /* \u2500\u2500 Compact list items (IDE/System) \u2500\u2500 */
  .compact-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    font-size: 12px;
    border-radius: 4px;
    color: var(--muted);
  }
  .compact-item:hover { background: var(--card-hover); }
  .compact-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--muted);
    opacity: 0.5;
    flex-shrink: 0;
  }
  .compact-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .compact-port { font-size: 11px; opacity: 0.6; }

  /* \u2500\u2500 Free ports chips \u2500\u2500 */
  .chips-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    padding: 4px 0 8px;
  }
  .chip {
    padding: 3px 10px;
    border-radius: 4px;
    background: var(--accent);
    color: #fff;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.12s;
  }
  .chip:hover { opacity: 0.8; }

  /* \u2500\u2500 Empty state \u2500\u2500 */
  .empty-state {
    text-align: center;
    padding: 32px 16px;
    color: var(--muted);
  }
  .empty-icon { font-size: 28px; display: block; margin-bottom: 8px; opacity: 0.4; }
  .empty-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
  .empty-sub { font-size: 12px; opacity: 0.7; }

  /* \u2500\u2500 Divider \u2500\u2500 */
  .divider {
    height: 1px;
    background: var(--section-border);
    margin: 8px 8px;
  }
</style>
</head>
<body>
  <div class="search-bar">
    <input class="search-input" type="text" placeholder="Filter ports..." oninput="filterPorts(this.value)" />
  </div>

  <!-- Dev Ports (cards) -->
  <div class="section">
    <div class="section-header" onclick="toggleSection('dev')">
      <div><span class="section-toggle" id="toggle-dev">\u25BE</span> Dev Ports</div>
      ${devPorts.length > 0 ? `<span class="section-count">${devPorts.length}</span>` : ""}
    </div>
    <div class="section-body" id="section-dev">
      ${devCardsHtml}
    </div>
  </div>

  <!-- Free Nearby -->
  ${this.freePorts.length > 0 ? `
  <div class="section">
    <div class="section-header" onclick="toggleSection('free')">
      <div><span class="section-toggle section-toggle" id="toggle-free">\u25BE</span> Free Nearby</div>
    </div>
    <div class="section-body" id="section-free">
      <div class="chips-row">${freeChipsHtml}</div>
    </div>
  </div>` : ""}

  ${idePorts.length > 0 || systemPorts.length > 0 ? '<div class="divider"></div>' : ""}

  <!-- IDE / Tools (compact, collapsed) -->
  ${idePorts.length > 0 ? `
  <div class="section">
    <div class="section-header" onclick="toggleSection('ide')">
      <div><span class="section-toggle collapsed" id="toggle-ide">\u25BE</span> IDE / Tools</div>
      <span class="section-count">${idePorts.length}</span>
    </div>
    <div class="section-body collapsed" id="section-ide">
      ${ideListHtml}
    </div>
  </div>` : ""}

  <!-- System (compact, collapsed) -->
  ${systemPorts.length > 0 ? `
  <div class="section">
    <div class="section-header" onclick="toggleSection('system')">
      <div><span class="section-toggle collapsed" id="toggle-system">\u25BE</span> System</div>
      <span class="section-count">${systemPorts.length}</span>
    </div>
    <div class="section-body collapsed" id="section-system">
      ${systemListHtml}
    </div>
  </div>` : ""}

  <script>
    const vscode = acquireVsCodeApi();

    function showDetail(port) {
      vscode.postMessage({ command: 'showDetail', port });
    }
    function killProcess(port, e) {
      e.stopPropagation();
      vscode.postMessage({ command: 'killProcess', port });
    }
    function copyFreePort(port) {
      vscode.postMessage({ command: 'copyFreePort', port });
    }
    function filterPorts(text) {
      vscode.postMessage({ command: 'filter', text });
    }
    function toggleSection(id) {
      const body = document.getElementById('section-' + id);
      const toggle = document.getElementById('toggle-' + id);
      if (body && toggle) {
        body.classList.toggle('collapsed');
        toggle.classList.toggle('collapsed');
      }
    }
  </script>
</body>
</html>`
    );
  }
  renderDevCard(entry) {
    const framework = entry.frameworkLabel || "";
    const processLine = entry.annotation || `${entry.processName} \xB7 pid ${entry.pid}`;
    const uptime = this.activityTracker.getUptime(entry.port);
    const dotClass = entry.isDockerPort ? "purple" : entry.status === "healthy" ? "green" : entry.status === "conflict" ? "red" : "grey";
    const badges = [];
    if (entry.isDockerPort && entry.dockerContainerName) {
      badges.push(`<span class="card-badge docker">\u{1F433} ${esc(entry.dockerContainerName)}</span>`);
    }
    if (entry.envVarName) {
      badges.push(`<span class="card-badge env">.env: ${esc(entry.envVarName)}</span>`);
    }
    if (entry.memoryMB > 0) {
      badges.push(`<span class="card-badge mem">${entry.memoryMB} MB</span>`);
    }
    badges.push(`<span class="card-badge pid">PID ${entry.pid}</span>`);
    return (
      /*html*/
      `
    <div class="dev-card" onclick="showDetail(${entry.port})">
      <div class="card-top">
        <div class="status-dot ${dotClass}"></div>
        <span class="card-port">:${entry.port}</span>
        ${framework ? `<span class="card-framework">${esc(framework)}</span>` : ""}
      </div>
      <div class="card-process">${esc(processLine)} \xB7 ${uptime}</div>
      ${badges.length > 0 ? `<div class="card-badges">${badges.join("")}</div>` : ""}
      <div class="card-actions">
        <button class="card-action kill" onclick="killProcess(${entry.port}, event)">\u2715 Kill</button>
        <button class="card-action" onclick="event.stopPropagation(); copyFreePort(${entry.port})">\u2398 Copy</button>
      </div>
    </div>`
    );
  }
  renderCompactItem(entry) {
    const name = entry.frameworkLabel || entry.processName;
    return (
      /*html*/
      `
    <div class="compact-item">
      <div class="compact-dot"></div>
      <span class="compact-name">${esc(name)}</span>
      <span class="compact-port">:${entry.port}</span>
    </div>`
    );
  }
};
function esc(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/ui/statusBarController.ts
var vscode9 = __toESM(require("vscode"));
var StatusBarController = class {
  statusBarItem;
  isScanning = false;
  conflictCount = 0;
  nextFreePort = null;
  constructor() {
    this.statusBarItem = vscode9.window.createStatusBarItem(
      vscode9.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "portman-ports.focus";
    this.statusBarItem.name = "Portman";
    this.statusBarItem.show();
  }
  /** Update the status bar with current state */
  update(portCount, conflicts = 0, nextFree = null) {
    if (this.isScanning) {
      return;
    }
    this.conflictCount = conflicts;
    this.nextFreePort = nextFree;
    const parts = [];
    parts.push(`$(plug) ${portCount} port${portCount !== 1 ? "s" : ""} active`);
    if (conflicts > 0) {
      parts.push(`$(warning) ${conflicts} conflict${conflicts !== 1 ? "s" : ""}`);
    }
    if (nextFree) {
      parts.push(`next free: ${nextFree}`);
    }
    this.statusBarItem.text = parts.join("   ");
    if (conflicts > 0) {
      this.statusBarItem.backgroundColor = new vscode9.ThemeColor("statusBarItem.errorBackground");
      this.statusBarItem.tooltip = `${portCount} active ports, ${conflicts} conflict(s). Click to open Portman.`;
    } else if (portCount > STATUS_BAR_WARNING_THRESHOLD) {
      this.statusBarItem.backgroundColor = new vscode9.ThemeColor("statusBarItem.warningBackground");
      this.statusBarItem.tooltip = `${portCount} active ports (high). Click to open Portman.`;
    } else if (portCount === 0) {
      this.statusBarItem.text = "$(plug) No active ports";
      this.statusBarItem.backgroundColor = void 0;
      this.statusBarItem.tooltip = "No listening ports detected. Click to open Portman.";
    } else {
      this.statusBarItem.backgroundColor = void 0;
      this.statusBarItem.tooltip = `${portCount} active port${portCount !== 1 ? "s" : ""}. Click to open Portman.`;
    }
  }
  /** Show scanning indicator */
  showScanning() {
    this.isScanning = true;
    this.statusBarItem.text = "$(loading~spin) Scanning...";
    this.statusBarItem.backgroundColor = void 0;
  }
  /** Clear scanning indicator */
  hideScanning() {
    this.isScanning = false;
  }
  dispose() {
    this.statusBarItem.dispose();
  }
};

// src/ui/notificationService.ts
var vscode10 = __toESM(require("vscode"));
var NotificationService = class {
  /** Map of message hash → last shown timestamp */
  recentMessages = /* @__PURE__ */ new Map();
  /** Simple hash of a string for dedup key */
  hash(message) {
    return message.substring(0, 100);
  }
  /** Check if a message was recently shown */
  isDuplicate(message) {
    const key = this.hash(message);
    const lastShown = this.recentMessages.get(key);
    if (lastShown && Date.now() - lastShown < NOTIFICATION_DEDUP_WINDOW_MS) {
      return true;
    }
    this.recentMessages.set(key, Date.now());
    if (this.recentMessages.size > 50) {
      const now = Date.now();
      for (const [k, v] of this.recentMessages) {
        if (now - v > NOTIFICATION_DEDUP_WINDOW_MS * 2) {
          this.recentMessages.delete(k);
        }
      }
    }
    return false;
  }
  /** Show an information notification (deduplicated) */
  async showInfo(message, ...actions) {
    if (this.isDuplicate(message)) {
      return void 0;
    }
    return vscode10.window.showInformationMessage(message, ...actions);
  }
  /** Show a warning notification (deduplicated) */
  async showWarning(message, ...actions) {
    if (this.isDuplicate(message)) {
      return void 0;
    }
    return vscode10.window.showWarningMessage(message, ...actions);
  }
  /** Show an error notification (deduplicated) */
  async showError(message, ...actions) {
    if (this.isDuplicate(message)) {
      return void 0;
    }
    return vscode10.window.showErrorMessage(message, ...actions);
  }
  /** Show a notification without deduplication (for unique messages) */
  async showInfoDirect(message, ...actions) {
    return vscode10.window.showInformationMessage(message, ...actions);
  }
};

// src/ui/portDetailPanel.ts
var vscode11 = __toESM(require("vscode"));
var PortDetailPanel = class _PortDetailPanel {
  static currentPanel;
  panel;
  currentEntry = null;
  activityTracker;
  disposables = [];
  onKillRequest = null;
  onFindFreePort = null;
  freePorts = [];
  constructor(panel, activityTracker) {
    this.panel = panel;
    this.activityTracker = activityTracker;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (message) => this.handleMessage(message),
      null,
      this.disposables
    );
  }
  /** Show or create the detail panel */
  static show(entry, activityTracker, freePorts, onKill, onFindFreePort) {
    if (_PortDetailPanel.currentPanel) {
      _PortDetailPanel.currentPanel.currentEntry = entry;
      _PortDetailPanel.currentPanel.freePorts = freePorts;
      _PortDetailPanel.currentPanel.onKillRequest = onKill;
      _PortDetailPanel.currentPanel.onFindFreePort = onFindFreePort;
      _PortDetailPanel.currentPanel.updateContent(entry, freePorts);
      _PortDetailPanel.currentPanel.panel.reveal(vscode11.ViewColumn.One);
      return _PortDetailPanel.currentPanel;
    }
    const panel = vscode11.window.createWebviewPanel(
      "portmanDetail",
      `:${entry.port} \u2014 Portman`,
      vscode11.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    const detailPanel = new _PortDetailPanel(panel, activityTracker);
    detailPanel.currentEntry = entry;
    detailPanel.freePorts = freePorts;
    detailPanel.onKillRequest = onKill;
    detailPanel.onFindFreePort = onFindFreePort;
    detailPanel.updateContent(entry, freePorts);
    _PortDetailPanel.currentPanel = detailPanel;
    return detailPanel;
  }
  /** Update the panel with new port data */
  updateContent(entry, freePorts) {
    this.currentEntry = entry;
    this.freePorts = freePorts;
    this.panel.title = `:${entry.port} \u2014 Portman`;
    this.panel.webview.html = this.getHtml(entry, freePorts);
  }
  /** Update just the activity log and uptime without full re-render */
  updateDynamic(entry) {
    if (this.currentEntry && this.currentEntry.port === entry.port) {
      this.currentEntry = entry;
      this.panel.webview.postMessage({
        type: "update",
        uptime: this.activityTracker.getUptime(entry.port),
        activities: this.activityTracker.getActivities(entry.port),
        memoryMB: entry.memoryMB,
        status: entry.status
      });
    }
  }
  handleMessage(message) {
    switch (message.command) {
      case "kill":
        if (this.currentEntry && this.onKillRequest) {
          this.onKillRequest(this.currentEntry);
        }
        break;
      case "switchPort":
        if (message.port && this.onFindFreePort) {
          this.onFindFreePort(message.port);
        }
        break;
      case "copyUrl":
        if (this.currentEntry) {
          const addr = this.currentEntry.address === "0.0.0.0" ? "localhost" : this.currentEntry.address;
          vscode11.env.clipboard.writeText(`http://${addr}:${this.currentEntry.port}`);
          vscode11.window.showInformationMessage(`Copied http://${addr}:${this.currentEntry.port}`);
        }
        break;
      case "copyPort":
        if (this.currentEntry) {
          vscode11.env.clipboard.writeText(String(this.currentEntry.port));
          vscode11.window.showInformationMessage(`Port ${this.currentEntry.port} copied.`);
        }
        break;
    }
  }
  getHtml(entry, freePorts) {
    const uptime = this.activityTracker.getUptime(entry.port);
    const activities = this.activityTracker.getActivities(entry.port);
    const displayName = entry.frameworkLabel || entry.processName;
    const subtitle = [
      entry.processName,
      `pid ${entry.pid}`,
      entry.frameworkLabel ? `${entry.frameworkLabel} dev server` : null,
      `listening since ${uptime} ago`
    ].filter(Boolean).join(" \xB7 ");
    const statusColor = entry.status === "healthy" ? "#4ec9b0" : entry.status === "conflict" ? "#f44747" : "#cccccc";
    const statusText = entry.status === "healthy" ? "listening" : entry.status === "conflict" ? "conflict" : "unknown";
    const conflictText = entry.status === "conflict" ? "detected" : "none";
    const conflictColor = entry.status === "conflict" ? "#f44747" : "#4ec9b0";
    const freePortChips = freePorts.slice(0, 6).map(
      (p) => `<span class="chip" onclick="switchPort(${p})">${p}</span>`
    ).join("");
    const activityHtml = activities.slice(-8).reverse().map((a) => {
      const time = new Date(a.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const cls = a.type === "error" ? "log-error" : a.type === "warning" ? "log-warn" : a.type === "success" ? "log-success" : "log-info";
      return `<div class="log-entry ${cls}"><span class="log-time">[${time}]</span> ${escapeHtml(a.message)}</div>`;
    }).join("");
    return (
      /*html*/
      `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  :root {
    --bg: #1e1e1e;
    --surface: #252526;
    --surface2: #2d2d2d;
    --border: #3e3e42;
    --text: #cccccc;
    --text-muted: #858585;
    --accent: #007acc;
    --green: #4ec9b0;
    --red: #f44747;
    --orange: #ce9178;
    --yellow: #dcdcaa;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 32px 40px;
    line-height: 1.5;
  }

  /* \u2500\u2500 Header \u2500\u2500 */
  .port-header {
    margin-bottom: 8px;
  }
  .port-number {
    font-size: 48px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -1px;
  }
  .port-subtitle {
    font-size: 14px;
    color: var(--text-muted);
    margin-top: 4px;
  }

  /* \u2500\u2500 Actions \u2500\u2500 */
  .actions {
    display: flex;
    gap: 16px;
    margin: 28px 0;
    flex-wrap: wrap;
  }
  .action-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .action-btn:hover {
    background: var(--surface2);
    border-color: var(--accent);
  }
  .action-btn.danger { color: var(--red); }
  .action-btn.danger:hover { border-color: var(--red); background: rgba(244,71,71,0.08); }
  .action-btn.primary { color: var(--green); }
  .action-btn.primary:hover { border-color: var(--green); background: rgba(78,201,176,0.08); }
  .action-icon { font-size: 16px; }

  /* \u2500\u2500 Stats Grid \u2500\u2500 */
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: var(--border);
    border-radius: 8px;
    overflow: hidden;
    margin: 24px 0;
  }
  .stat-cell {
    background: var(--surface);
    padding: 16px 20px;
  }
  .stat-label {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .stat-value {
    font-size: 18px;
    font-weight: 600;
    color: #ffffff;
  }
  .stat-value.green { color: var(--green); }
  .stat-value.red { color: var(--red); }

  /* \u2500\u2500 Free Ports \u2500\u2500 */
  .free-ports {
    margin: 24px 0;
  }
  .free-ports-title {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
  }
  .chips {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .chip {
    padding: 4px 14px;
    border-radius: 4px;
    background: var(--accent);
    color: #ffffff;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .chip:hover { opacity: 0.85; }

  /* \u2500\u2500 Activity Log \u2500\u2500 */
  .activity {
    margin-top: 32px;
  }
  .activity-title {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 14px;
  }
  .log-entry {
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    font-size: 13px;
    padding: 5px 0;
    color: var(--text-muted);
  }
  .log-time {
    color: var(--text-muted);
    font-weight: 600;
  }
  .log-error { color: var(--red); }
  .log-error .log-time { color: var(--red); }
  .log-warn { color: var(--orange); }
  .log-warn .log-time { color: var(--orange); }
  .log-success { color: var(--green); }
  .log-success .log-time { color: var(--green); }
  .log-info { color: var(--text-muted); }

  /* \u2500\u2500 Divider \u2500\u2500 */
  .divider {
    height: 1px;
    background: var(--border);
    margin: 24px 0;
  }
</style>
</head>
<body>
  <div class="port-header">
    <div class="port-number">:${entry.port}</div>
    <div class="port-subtitle">${escapeHtml(subtitle)}</div>
  </div>

  <div class="actions">
    <button class="action-btn danger" onclick="killProcess()">
      <span class="action-icon">\u2715</span> Kill process
    </button>
    ${freePorts.length > 0 ? `
    <button class="action-btn primary" onclick="switchPort(${freePorts[0]})">
      <span class="action-icon">+</span> Switch to ${freePorts[0]}
    </button>` : ""}
    <button class="action-btn" onclick="copyUrl()">
      <span class="action-icon">\u25A1</span> Copy URL
    </button>
  </div>

  <div class="stats-grid">
    <div class="stat-cell">
      <div class="stat-label">Protocol</div>
      <div class="stat-value">${entry.protocol} / HTTP</div>
    </div>
    <div class="stat-cell">
      <div class="stat-label">Status</div>
      <div class="stat-value green" id="status-value">${statusText}</div>
    </div>
    <div class="stat-cell">
      <div class="stat-label">Memory</div>
      <div class="stat-value" id="memory-value">${entry.memoryMB > 0 ? entry.memoryMB + " MB" : "\u2014"}</div>
    </div>
    <div class="stat-cell">
      <div class="stat-label">Conflicts</div>
      <div class="stat-value ${entry.status === "conflict" ? "red" : "green"}" id="conflict-value">${conflictText}</div>
    </div>
  </div>

  ${freePorts.length > 0 ? `
  <div class="free-ports">
    <div class="free-ports-title">Free nearby</div>
    <div class="chips">${freePortChips}</div>
  </div>` : ""}

  <div class="divider"></div>

  <div class="activity">
    <div class="activity-title">Recent Activity</div>
    <div id="activity-log">
      ${activityHtml || '<div class="log-entry log-info">No activity recorded yet.</div>'}
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function killProcess() {
      vscode.postMessage({ command: 'kill' });
    }
    function switchPort(port) {
      vscode.postMessage({ command: 'switchPort', port });
    }
    function copyUrl() {
      vscode.postMessage({ command: 'copyUrl' });
    }

    // Handle dynamic updates from extension
    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'update') {
        const mem = document.getElementById('memory-value');
        if (mem && msg.memoryMB > 0) mem.textContent = msg.memoryMB + ' MB';

        const status = document.getElementById('status-value');
        if (status) {
          status.textContent = msg.status === 'healthy' ? 'listening' : msg.status;
          status.className = 'stat-value ' + (msg.status === 'healthy' ? 'green' : 'red');
        }
      }
    });
  </script>
</body>
</html>`
    );
  }
  dispose() {
    _PortDetailPanel.currentPanel = void 0;
    this.panel.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
};
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/commands/commandRegistry.ts
var vscode12 = __toESM(require("vscode"));
var CommandRegistry = class {
  constructor(killOrchestrator, profileManager, globalStore, sessionHistory, portProvider, notifications, refreshCallback) {
    this.killOrchestrator = killOrchestrator;
    this.profileManager = profileManager;
    this.globalStore = globalStore;
    this.sessionHistory = sessionHistory;
    this.portProvider = portProvider;
    this.notifications = notifications;
    this.refreshCallback = refreshCallback;
  }
  disposables = [];
  /** Register all commands */
  registerAll() {
    this.register("portman.refreshPorts", async () => {
      await this.refreshCallback();
    });
    this.register("portman.killProcess", async (arg) => {
      let pid, port, processName;
      if (arg && typeof arg === "object" && "pid" in arg) {
        pid = arg.pid;
        port = arg.port;
        processName = arg.processName;
      } else {
        return;
      }
      await this.killOrchestrator.kill(pid, port, processName, "sidebar");
    });
    this.register("portman.killPort", async () => {
      const input = await vscode12.window.showInputBox({
        prompt: "Enter the port number to kill",
        placeHolder: "e.g., 3000",
        validateInput: (value) => {
          const num = parseInt(value, 10);
          if (isNaN(num) || num < 1 || num > 65535) {
            return "Enter a valid port number (1\u201365535)";
          }
          return null;
        }
      });
      if (!input) {
        return;
      }
      const port = parseInt(input, 10);
      const entries = this.portProvider.getPortEntries();
      const entry = entries.find((e) => e.port === port);
      if (!entry) {
        this.notifications.showInfo(`Port ${port} is not currently occupied.`);
        return;
      }
      await this.killOrchestrator.kill(entry.pid, entry.port, entry.processName, "command_palette");
    });
    this.register("portman.findFreePort", async () => {
      const input = await vscode12.window.showInputBox({
        prompt: "Enter a base port number to scan from",
        placeHolder: "e.g., 3000",
        validateInput: (value) => {
          const num = parseInt(value, 10);
          if (isNaN(num) || num < 1 || num > 65535) {
            return "Enter a valid port number (1\u201365535)";
          }
          return null;
        }
      });
      if (!input) {
        return;
      }
      await this.findAndSuggestFreePort(parseInt(input, 10));
    });
    this.register("portman.findFreePortFromHere", async (arg) => {
      if (!arg || !("port" in arg)) {
        return;
      }
      await this.findAndSuggestFreePort(arg.port);
    });
    this.register("portman.showKillHistory", () => {
      this.sessionHistory.show();
    });
    this.register("portman.clearHistory", () => {
      this.sessionHistory.clear();
      this.notifications.showInfo("Session history cleared.");
    });
    this.register("portman.createProfile", async () => {
      const entries = this.portProvider.getPortEntries();
      const profile = await this.profileManager.interactiveCreateProfile(entries);
      if (profile) {
        this.notifications.showInfoDirect(
          `Profile "${profile.name}" created with ${profile.ports.length} port(s).`
        );
      }
    });
    this.register("portman.activateProfile", async () => {
      const profiles = this.profileManager.getProfiles();
      if (profiles.length === 0) {
        this.notifications.showInfo("No profiles saved yet. Create one first.");
        return;
      }
      const items = profiles.map((p) => ({
        label: `${p.isActive ? "$(check) " : ""}${p.name}`,
        description: `${p.ports.length} port(s)${p.description ? " \u2014 " + p.description : ""}`,
        id: p.id
      }));
      const selected = await vscode12.window.showQuickPick(items, {
        placeHolder: "Select a profile to activate",
        title: "Activate Port Profile"
      });
      if (selected) {
        await this.profileManager.activateProfile(selected.id);
        const profile = this.profileManager.getProfile(selected.id);
        if (profile) {
          this.notifications.showInfoDirect(`Profile "${profile.name}" activated.`);
        }
      }
    });
    this.register("portman.deactivateProfile", async () => {
      await this.profileManager.deactivateAll();
      this.notifications.showInfo("All profiles deactivated.");
    });
    this.register("portman.deleteProfile", async () => {
      const profiles = this.profileManager.getProfiles();
      if (profiles.length === 0) {
        this.notifications.showInfo("No profiles to delete.");
        return;
      }
      const items = profiles.map((p) => ({
        label: p.name,
        description: `${p.ports.length} port(s)`,
        id: p.id
      }));
      const selected = await vscode12.window.showQuickPick(items, {
        placeHolder: "Select a profile to delete",
        title: "Delete Port Profile"
      });
      if (selected) {
        const confirm = await vscode12.window.showWarningMessage(
          `Delete profile "${selected.label}"? This cannot be undone.`,
          { modal: true },
          "Delete"
        );
        if (confirm === "Delete") {
          await this.profileManager.deleteProfile(selected.id);
          this.notifications.showInfoDirect(`Profile "${selected.label}" deleted.`);
        }
      }
    });
    this.register("portman.annotatePort", async (arg) => {
      if (!arg || !("port" in arg)) {
        return;
      }
      const portNum = arg.port;
      const procName = "processName" in arg ? arg.processName : "unknown";
      const existing = this.globalStore.getAnnotation(portNum, procName);
      const label = await vscode12.window.showInputBox({
        prompt: `Annotate port ${portNum}`,
        placeHolder: "e.g., Auth API, Remix frontend, Redis cache",
        value: existing || "",
        validateInput: (value) => {
          if (value && value.length > MAX_ANNOTATION_LENGTH) {
            return `Maximum ${MAX_ANNOTATION_LENGTH} characters`;
          }
          return null;
        }
      });
      if (label === void 0) {
        return;
      }
      if (label === "") {
        await this.globalStore.removeAnnotation(portNum, procName);
      } else {
        await this.globalStore.setAnnotation(portNum, procName, label);
      }
      await this.refreshCallback();
    });
    this.register("portman.copyPortNumber", async (arg) => {
      if (!arg || !("port" in arg)) {
        return;
      }
      await vscode12.env.clipboard.writeText(String(arg.port));
      this.notifications.showInfo(`Port ${arg.port} copied to clipboard.`);
    });
  }
  /**
   * Find a free port and present it as an info notification with a Copy action.
   * Per review feedback (FR-04 gap): copies `export PORT=NNNN` to clipboard.
   */
  async findAndSuggestFreePort(basePort) {
    const freePort = await findFreePort(basePort);
    if (freePort) {
      const action = await this.notifications.showInfoDirect(
        `Port ${freePort} is available (next free from ${basePort}). Copy to clipboard?`,
        "Copy"
      );
      if (action === "Copy") {
        await vscode12.env.clipboard.writeText(String(freePort));
        this.notifications.showInfo(`Port ${freePort} copied to clipboard.`);
      }
    } else {
      this.notifications.showWarning(
        `No free ports found in range ${basePort + 1}\u2013${basePort + 20}.`
      );
    }
  }
  /** Register a single command */
  register(commandId, handler) {
    this.disposables.push(
      vscode12.commands.registerCommand(commandId, handler)
    );
  }
  /** Get all disposables for cleanup */
  getDisposables() {
    return this.disposables;
  }
  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
};

// src/data/terminalWatcher.ts
var vscode13 = __toESM(require("vscode"));
var TerminalWatcher = class {
  disposables = [];
  onKillRequest = null;
  onFindFreePort = null;
  portListGetter = null;
  sessionHistory;
  activityTracker;
  recentNotifications = /* @__PURE__ */ new Map();
  // port → timestamp
  constructor(sessionHistory, activityTracker) {
    this.sessionHistory = sessionHistory;
    this.activityTracker = activityTracker;
  }
  /** Set callbacks for kill and free port actions */
  setCallbacks(onKill, onFindFreePort, portListGetter) {
    this.onKillRequest = onKill;
    this.onFindFreePort = onFindFreePort;
    this.portListGetter = portListGetter;
  }
  /** Initialize terminal watching */
  initialize() {
    const config = vscode13.workspace.getConfiguration("portman");
    if (!config.get("terminalInterception", true)) {
      return;
    }
    try {
      if (vscode13.window.onDidStartTerminalShellExecution) {
        this.disposables.push(
          vscode13.window.onDidStartTerminalShellExecution((e) => {
            const cmdLine = e.execution.commandLine;
            if (cmdLine && typeof cmdLine === "object" && "value" in cmdLine) {
              this.sessionHistory.setLastTerminalCommand(
                cmdLine.value,
                e.terminal.name
              );
            }
          })
        );
      }
    } catch {
      console.log("[Portman] Shell integration API not available, Kill & Retry will not auto-capture commands.");
    }
    try {
      const onDidWrite = vscode13.window.onDidWriteTerminalData;
      if (typeof onDidWrite === "function") {
        this.disposables.push(
          onDidWrite((e) => {
            this.handleTerminalOutput(e.data, e.terminal.name);
          })
        );
        console.log("[Portman] Terminal data interception active (proposed API).");
        return;
      }
    } catch {
    }
    this.disposables.push(
      vscode13.window.onDidOpenTerminal(() => {
        this.boostScanRate();
      })
    );
    console.log("[Portman] Terminal interception using scan-delta fallback.");
  }
  /** Handle terminal output — scan for EADDRINUSE patterns */
  handleTerminalOutput(data, terminalName) {
    for (const pattern of TERMINAL_CONFLICT_PATTERNS) {
      const match = data.match(pattern);
      if (match) {
        const portStr = match[1];
        if (portStr) {
          const port = parseInt(portStr, 10);
          if (port >= 1 && port <= 65535) {
            this.showCrashNotification(port, terminalName);
            return;
          }
        }
        const genericPortMatch = data.match(/:(\d{2,5})/);
        if (genericPortMatch) {
          const port = parseInt(genericPortMatch[1], 10);
          if (port >= 1024 && port <= 65535) {
            this.showCrashNotification(port, terminalName);
            return;
          }
        }
      }
    }
  }
  /**
   * Show the crash interception notification.
   * "Port :3000 is in use by <process>. Kill and retry?"
   */
  async showCrashNotification(port, terminalName) {
    const lastShown = this.recentNotifications.get(port);
    if (lastShown && Date.now() - lastShown < NOTIFICATION_DEDUP_WINDOW_MS * 3) {
      return;
    }
    this.recentNotifications.set(port, Date.now());
    const portList = this.portListGetter?.() || [];
    const occupying = portList.find((e) => e.port === port);
    const processLabel = occupying ? `${occupying.frameworkLabel || occupying.processName} (PID ${occupying.pid})` : `unknown process`;
    this.activityTracker.conflictDetected(port, processLabel);
    const actions = ["Kill & Retry", "Kill Only", "Find Alternative"];
    const action = await vscode13.window.showWarningMessage(
      `Port :${port} is already in use by ${processLabel}. Kill it and retry?`,
      ...actions
    );
    if (!action) {
      return;
    }
    if (action === "Kill & Retry" || action === "Kill Only") {
      if (occupying && this.onKillRequest) {
        const killed = await this.onKillRequest(occupying.pid, port, occupying.processName);
        if (killed && action === "Kill & Retry") {
          const lastCmd = this.sessionHistory.lastTerminalCommand;
          if (lastCmd) {
            const terminal = vscode13.window.terminals.find((t) => t.name === lastCmd.terminalName) || vscode13.window.createTerminal(lastCmd.terminalName);
            terminal.show();
            await new Promise((resolve) => setTimeout(resolve, 800));
            terminal.sendText(lastCmd.command);
          } else {
            vscode13.window.showInformationMessage(
              `Port :${port} freed. Re-run your command manually (command history not available).`
            );
          }
        }
      } else {
        vscode13.window.showWarningMessage(
          `Could not identify the process on port :${port}. Try refreshing the port list.`
        );
      }
    }
    if (action === "Find Alternative") {
      if (this.onFindFreePort) {
        const freePort = await this.onFindFreePort(port);
        if (freePort) {
          const copy = await vscode13.window.showInformationMessage(
            `Port ${freePort} is available (next free from ${port}).`,
            "Copy"
          );
          if (copy === "Copy") {
            await vscode13.env.clipboard.writeText(String(freePort));
          }
        } else {
          vscode13.window.showWarningMessage(`No free ports found near ${port}.`);
        }
      }
    }
  }
  /**
   * Scan-delta detection: called from the main refresh loop.
   * Compares previous and current port lists — if a port appears that
   * was previously free AND a terminal was recently opened, show notification.
   */
  previousPorts = /* @__PURE__ */ new Set();
  scanBoostActive = false;
  detectNewConflicts(currentEntries) {
    if (!this.scanBoostActive) {
      this.previousPorts = new Set(currentEntries.map((e) => e.port));
      return;
    }
    const currentPorts = new Set(currentEntries.map((e) => e.port));
    for (const entry of currentEntries) {
      if (!this.previousPorts.has(entry.port) && entry.category === "dev") {
      }
    }
    this.previousPorts = currentPorts;
  }
  /** Temporarily increase scan frequency after terminal events */
  boostTimer = null;
  boostScanRate() {
    this.scanBoostActive = true;
    if (this.boostTimer) {
      clearTimeout(this.boostTimer);
    }
    this.boostTimer = setTimeout(() => {
      this.scanBoostActive = false;
    }, 1e4);
  }
  dispose() {
    this.disposables.forEach((d) => d.dispose());
    if (this.boostTimer) {
      clearTimeout(this.boostTimer);
    }
  }
};

// src/data/envScanner.ts
var vscode14 = __toESM(require("vscode"));
var EnvScanner = class {
  envPortMap = /* @__PURE__ */ new Map();
  disposables = [];
  /** Initialize scanner and set up file watchers */
  async initialize() {
    await this.scanAllEnvFiles();
    for (const envFile of ENV_FILE_NAMES) {
      const watcher = vscode14.workspace.createFileSystemWatcher(`**/${envFile}`);
      watcher.onDidChange(() => this.scanAllEnvFiles());
      watcher.onDidCreate(() => this.scanAllEnvFiles());
      watcher.onDidDelete(() => this.scanAllEnvFiles());
      this.disposables.push(watcher);
    }
  }
  /** Get the current env port map */
  getEnvPorts() {
    return this.envPortMap;
  }
  /** Check if a port is referenced in .env files */
  getEnvRef(port) {
    return this.envPortMap.get(port);
  }
  /** Scan all .env files in the workspace */
  async scanAllEnvFiles() {
    this.envPortMap.clear();
    for (const envFileName of ENV_FILE_NAMES) {
      const files = await vscode14.workspace.findFiles(
        `**/${envFileName}`,
        "**/node_modules/**",
        10
        // limit
      );
      for (const uri of files) {
        try {
          const content = await vscode14.workspace.fs.readFile(uri);
          const text = Buffer.from(content).toString("utf-8");
          this.parseEnvFile(text, uri.fsPath);
        } catch {
        }
      }
    }
  }
  /** Parse a single .env file for port variables */
  parseEnvFile(content, filePath) {
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) {
        continue;
      }
      const key = trimmed.substring(0, eqIdx).trim();
      const value = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      const isPortVar = ENV_PORT_VARIABLE_PATTERNS.some((pattern) => pattern.test(key));
      if (!isPortVar) {
        continue;
      }
      const port = parseInt(value, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        continue;
      }
      this.envPortMap.set(port, {
        port,
        variableName: key,
        sourceFile: filePath
      });
    }
  }
  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
};

// src/data/dockerDetector.ts
var import_child_process4 = require("child_process");
function execAsync4(cmd, timeoutMs = COMMAND_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    (0, import_child_process4.exec)(cmd, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}
var DockerDetector = class {
  isAvailable = null;
  portMappings = /* @__PURE__ */ new Map();
  /**
   * Check if Docker CLI is available.
   * Caches the result to avoid repeated checks.
   */
  async checkAvailability() {
    if (this.isAvailable !== null) {
      return this.isAvailable;
    }
    try {
      await execAsync4('docker version --format "{{.Server.Version}}"', 2e3);
      this.isAvailable = true;
    } catch {
      this.isAvailable = false;
    }
    return this.isAvailable;
  }
  /**
   * Scan running Docker containers for port mappings.
   * Returns a Map<hostPort, DockerPortMapping>.
   */
  async scan() {
    this.portMappings.clear();
    if (!await this.checkAvailability()) {
      return this.portMappings;
    }
    try {
      const stdout = await execAsync4(
        'docker ps --format "{{.ID}}|{{.Names}}|{{.Ports}}"',
        COMMAND_TIMEOUT_MS
      );
      const lines = stdout.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        const parts = trimmed.split("|");
        if (parts.length < 3) {
          continue;
        }
        const containerId = parts[0];
        const containerName = parts[1];
        const portsStr = parts[2];
        const portEntries = portsStr.split(",");
        for (const portEntry of portEntries) {
          const portTrimmed = portEntry.trim();
          const match = portTrimmed.match(
            /(?:[\d.]+:|:::)?(\d+)->(\d+)\/(\w+)/
          );
          if (match) {
            const hostPort = parseInt(match[1], 10);
            const containerPort = parseInt(match[2], 10);
            const protocol = match[3];
            this.portMappings.set(hostPort, {
              containerName,
              containerId,
              containerPort,
              hostPort,
              protocol
            });
          }
        }
      }
    } catch (err) {
      console.log("[Portman] Docker scan skipped:", err.message);
    }
    return this.portMappings;
  }
  /** Get Docker mapping for a specific host port */
  getMapping(hostPort) {
    return this.portMappings.get(hostPort);
  }
  /** Get all current mappings */
  getMappings() {
    return this.portMappings;
  }
  /** Reset availability cache (e.g., after Docker is installed/started) */
  resetAvailability() {
    this.isAvailable = null;
  }
};

// src/extension.ts
var pollingTimer = null;
var isScanning = false;
function activate(context) {
  console.log("[Portman] Extension activating...");
  const globalStore = new GlobalStore(context);
  const sessionHistory = new SessionHistory();
  const activityTracker = new ActivityTracker();
  const workspaceStore = new WorkspaceStore();
  context.subscriptions.push({ dispose: () => sessionHistory.dispose() });
  const killOrchestrator = new KillOrchestrator(sessionHistory);
  const profileManager = new ProfileManager(context);
  const conflictDetector = new ConflictDetector();
  const teamConfigManager = new TeamConfigManager(profileManager);
  const notifications = new NotificationService();
  const terminalWatcher = new TerminalWatcher(sessionHistory, activityTracker);
  const envScanner = new EnvScanner();
  const dockerDetector = new DockerDetector();
  const sidebarProvider = new PortWebviewProvider(activityTracker);
  const statusBar = new StatusBarController();
  context.subscriptions.push(statusBar);
  context.subscriptions.push(
    vscode15.window.registerWebviewViewProvider(
      PortWebviewProvider.viewType,
      sidebarProvider
    )
  );
  killOrchestrator.setRefreshCallback(() => refreshPorts());
  conflictDetector.setPortListGetter(() => sidebarProvider.getPortEntries());
  terminalWatcher.setCallbacks(
    (pid, port, name) => killOrchestrator.kill(pid, port, name, "notification"),
    (port) => findFreePort(port),
    () => sidebarProvider.getPortEntries()
  );
  function classifyProcess(processName, pid) {
    if (pid <= SYSTEM_PID_THRESHOLD) {
      return "system";
    }
    const normalized = processName.replace(/\.exe$/i, "");
    for (const sysName of SYSTEM_PROCESS_NAMES) {
      if (sysName.toLowerCase() === normalized.toLowerCase()) {
        return "system";
      }
    }
    for (const ideName of IDE_PROCESS_NAMES) {
      if (ideName.toLowerCase() === normalized.toLowerCase()) {
        return "ide";
      }
    }
    return "dev";
  }
  const commonPorts = [3e3, 3001, 3002, 4e3, 5e3, 5173, 8e3, 8080, 8888, 9e3];
  async function discoverFreePorts(activePorts) {
    const activeSet = new Set(activePorts);
    const free = [];
    for (const port of commonPorts) {
      if (!activeSet.has(port) && free.length < 6) {
        free.push(port);
      }
    }
    if (activePorts.length > 0) {
      const lowest = Math.min(...activePorts);
      try {
        const nextFree = await findFreePort(lowest);
        if (nextFree && !free.includes(nextFree) && !activeSet.has(nextFree)) {
          free.unshift(nextFree);
          if (free.length > 6) {
            free.pop();
          }
        }
      } catch {
      }
    }
    return free.sort((a, b) => a - b);
  }
  async function refreshPorts() {
    if (isScanning) {
      return;
    }
    isScanning = true;
    statusBar.showScanning();
    try {
      const rawEntries = await scanPorts();
      const pids = rawEntries.map((e) => e.pid);
      const processMap = await mapProcesses(pids);
      const dockerMappings = await dockerDetector.scan();
      const envPorts = envScanner.getEnvPorts();
      const entries = rawEntries.map((raw) => {
        const processInfo = processMap.get(raw.pid);
        const processName = processInfo?.name || "Unknown Process";
        const processCmd = processInfo?.cmd || "";
        const memoryMB = processInfo?.memoryMB || 0;
        const frameworkLabel = detectFrameworkFromProcess(processName, processCmd);
        const annotation = globalStore.getAnnotation(raw.port, processName);
        const firstSeenAt = activityTracker.getFirstSeen(raw.port) || /* @__PURE__ */ new Date();
        let category = classifyProcess(processName, raw.pid);
        if (frameworkLabel) {
          category = "dev";
        }
        const dockerMapping = dockerMappings.get(raw.port);
        const isDockerPort = !!dockerMapping;
        const dockerContainerName = dockerMapping?.containerName || null;
        if (isDockerPort) {
          category = "dev";
        }
        const envRef = envPorts.get(raw.port);
        const envVarName = envRef?.variableName || null;
        const isEnvExpected = !!envRef;
        return {
          port: raw.port,
          protocol: raw.protocol,
          address: raw.address,
          pid: raw.pid,
          processName,
          processCmd,
          frameworkLabel,
          annotation,
          isDockerPort,
          dockerContainerName,
          envVarName,
          isEnvExpected,
          detectedAt: /* @__PURE__ */ new Date(),
          firstSeenAt,
          memoryMB,
          status: "healthy",
          category
        };
      });
      const processNames = new Map(entries.map((e) => [e.port, e.processName]));
      activityTracker.reconcile(entries.map((e) => e.port), processNames);
      terminalWatcher.detectNewConflicts(entries);
      sidebarProvider.setPortEntries(entries);
      const allPorts = entries.map((e) => e.port);
      const freePorts = await discoverFreePorts(allPorts);
      sidebarProvider.setNearbyFreePorts(freePorts);
      statusBar.hideScanning();
      const devCount = entries.filter((e) => e.category === "dev").length;
      const nextFree = freePorts.length > 0 ? freePorts[0] : null;
      statusBar.update(devCount, 0, nextFree);
      if (PortDetailPanel.currentPanel) {
        const currentPort = entries.find(
          (e) => PortDetailPanel.currentPanel && e.port === PortDetailPanel.currentPanel.currentEntry?.port
        );
        if (currentPort) {
          PortDetailPanel.currentPanel.updateDynamic(currentPort);
        }
      }
    } catch (err) {
      const msg = err.message;
      console.error("[Portman] Scan error:", msg);
      statusBar.hideScanning();
      statusBar.update(0);
    } finally {
      isScanning = false;
    }
  }
  context.subscriptions.push(
    vscode15.commands.registerCommand("portman.showDetail", (entry) => {
      if (!entry) {
        return;
      }
      const freePorts = sidebarProvider.getFreePorts();
      PortDetailPanel.show(
        entry,
        activityTracker,
        freePorts,
        (e) => killOrchestrator.kill(e.pid, e.port, e.processName, "sidebar"),
        async (port) => {
          await vscode15.env.clipboard.writeText(String(port));
          vscode15.window.showInformationMessage(`Port ${port} copied to clipboard.`);
        }
      );
    })
  );
  context.subscriptions.push(
    vscode15.commands.registerCommand("portman.copyFreePort", async (port) => {
      await vscode15.env.clipboard.writeText(String(port));
      vscode15.window.showInformationMessage(`Port ${port} copied to clipboard.`);
    })
  );
  context.subscriptions.push(
    vscode15.commands.registerCommand("portman.exportToDevcontainer", () => {
      teamConfigManager.exportProfiles();
    })
  );
  context.subscriptions.push(
    vscode15.commands.registerCommand("portman.importFromDevcontainer", () => {
      teamConfigManager.autoImport();
    })
  );
  const commandRegistry = new CommandRegistry(
    killOrchestrator,
    profileManager,
    globalStore,
    sessionHistory,
    sidebarProvider,
    notifications,
    refreshPorts
  );
  commandRegistry.registerAll();
  context.subscriptions.push(commandRegistry);
  function startPolling() {
    stopPolling();
    const config = vscode15.workspace.getConfiguration("portman");
    const interval = config.get("refreshInterval", DEFAULT_REFRESH_INTERVAL);
    pollingTimer = setInterval(() => {
      refreshPorts();
    }, interval);
  }
  function stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  }
  context.subscriptions.push(
    vscode15.window.onDidChangeWindowState((state) => {
      if (state.focused) {
        startPolling();
        refreshPorts();
      } else {
        stopPolling();
      }
    })
  );
  context.subscriptions.push(
    vscode15.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("portman.refreshInterval")) {
        startPolling();
      }
      if (e.affectsConfiguration("portman.frameworkMappings")) {
        refreshPorts();
      }
    })
  );
  conflictDetector.initialize().catch((err) => {
    console.error("[Portman] Conflict detector init failed:", err.message);
  });
  context.subscriptions.push({ dispose: () => conflictDetector.dispose() });
  terminalWatcher.initialize();
  context.subscriptions.push({ dispose: () => terminalWatcher.dispose() });
  envScanner.initialize().catch((err) => {
    console.error("[Portman] Env scanner init failed:", err.message);
  });
  context.subscriptions.push({ dispose: () => envScanner.dispose() });
  teamConfigManager.autoImport().catch((err) => {
    console.error("[Portman] Team config import failed:", err.message);
  });
  context.subscriptions.push({ dispose: () => {
    stopPolling();
  } });
  refreshPorts();
  startPolling();
  console.log("[Portman] Extension activated successfully (Phase 2 + Cards).");
}
function deactivate() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  console.log("[Portman] Extension deactivated.");
  return void 0;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
