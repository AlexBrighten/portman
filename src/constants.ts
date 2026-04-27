/**
 * Shared constants for Portman.
 * Per review feedback: thresholds and system process lists are defined here,
 * not as inline magic numbers.
 */

/** PID threshold below which the system process safety guard applies (FR-04) */
export const SYSTEM_PID_THRESHOLD = 100;

/**
 * Known system process names that should always trigger the safety guard,
 * regardless of PID value. (Review gap: NFR-03)
 */
export const SYSTEM_PROCESS_NAMES: ReadonlySet<string> = new Set([
  // macOS
  'launchd', 'kernel_task', 'WindowServer', 'loginwindow', 'coreaudiod',
  'mds', 'mds_stores', 'diskarbitrationd', 'configd',
  // Linux
  'systemd', 'init', 'kthreadd', 'ksoftirqd', 'rcu_sched',
  'migration', 'watchdog', 'kworker', 'dbus-daemon',
  // Windows
  'System', 'smss', 'csrss', 'wininit', 'winlogon',
  'services', 'lsass', 'svchost', 'dwm',
  'explorer', 'spoolsv', 'SearchIndexer',
  'conhost', 'fontdrvhost', 'sihost', 'taskhostw',
  'RuntimeBroker', 'ShellExperienceHost', 'StartMenuExperienceHost',
  'SecurityHealthService', 'SecurityHealthSystray', 'MsMpEng',
  'WmiPrvSE', 'dllhost', 'audiodg', 'ctfmon',
  'dasHost', 'msdtc', 'NisSrv', 'SearchHost',
  'TextInputHost', 'WidgetService', 'Widgets',
  'LsaIso', 'Memory Compression', 'Registry',
  'jhi_service', 'Intel', 'igfxCUIService',
  'spoolsv', 'wlms', 'WUDFHost',
  'Unknown Process',
]);

/**
 * IDE / editor-related process names. These are safe but not "dev server" ports.
 * They go in a collapsed "IDE / Tools" section.
 */
export const IDE_PROCESS_NAMES: ReadonlySet<string> = new Set([
  // VS Code
  'Code', 'code', 'code-insiders',
  'Antigravity', 'antigravity',
  'language_server_windows_x64',
  'electron',
  // JetBrains
  'idea', 'idea64', 'phpstorm', 'webstorm', 'pycharm', 'goland', 'rider',
  'clion', 'datagrip', 'rubymine',
  // Other editors
  'sublime_text', 'atom', 'brackets',
]);

/** Default polling interval in milliseconds */
export const DEFAULT_REFRESH_INTERVAL = 5000;

/** Minimum allowed polling interval */
export const MIN_REFRESH_INTERVAL = 500;

/** Maximum allowed polling interval */
export const MAX_REFRESH_INTERVAL = 60000;

/** Timeout for OS commands (lsof, netstat, etc.) in milliseconds */
export const COMMAND_TIMEOUT_MS = 3000;

/** Delay before post-kill refresh scan */
export const POST_KILL_REFRESH_DELAY_MS = 500;

/** Maximum annotation label length (FR-09) */
export const MAX_ANNOTATION_LENGTH = 50;

/** Maximum profile name length (FR-08) */
export const MAX_PROFILE_NAME_LENGTH = 40;

/** Maximum profile description length (FR-08) */
export const MAX_PROFILE_DESCRIPTION_LENGTH = 120;

/** Maximum process command string length for display */
export const MAX_CMD_DISPLAY_LENGTH = 60;

/** Maximum process command string length for storage */
export const MAX_CMD_STORAGE_LENGTH = 200;

/** Notification deduplication window in milliseconds */
export const NOTIFICATION_DEDUP_WINDOW_MS = 2000;

/** Port count threshold for status bar warning state */
export const STATUS_BAR_WARNING_THRESHOLD = 10;

/** Number of ports to scan ahead when finding a free port */
export const FREE_PORT_SCAN_RANGE = 20;

/** Output channel name for kill history */
export const KILL_HISTORY_CHANNEL_NAME = 'Portman — Kill History';

/** Output channel name for extension logs */
export const LOG_CHANNEL_NAME = 'Portman';

/**
 * Built-in framework detection patterns (FR-14).
 * Ordered by specificity — more specific patterns first.
 * Per review: patterns use case-insensitive matching and account for
 * Windows-style paths (\\next\\ alongside /next/).
 */
export const BUILTIN_FRAMEWORK_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  // JavaScript / TypeScript frameworks
  { pattern: /next[\\/].*dev|next\s+dev/i, label: 'Next.js' },
  { pattern: /nuxt[\\/]|nuxt\s+dev/i, label: 'Nuxt' },
  { pattern: /remix[\\/].*dev|remix\s+dev/i, label: 'Remix' },
  { pattern: /gatsby[\\/].*develop|gatsby\s+develop/i, label: 'Gatsby' },
  { pattern: /astro[\\/].*dev|astro\s+dev/i, label: 'Astro' },
  { pattern: /svelte[\\/].*dev|svelte-kit\s+dev/i, label: 'SvelteKit' },
  { pattern: /vite/i, label: 'Vite' },
  { pattern: /react-scripts\s+start/i, label: 'Create React App' },
  { pattern: /angular[\\/]cli|ng\s+serve/i, label: 'Angular' },
  { pattern: /webpack[\\/]|webpack-dev-server/i, label: 'Webpack Dev Server' },
  { pattern: /parcel/i, label: 'Parcel' },
  { pattern: /turbo[\\/]|turbopack/i, label: 'Turbopack' },
  { pattern: /electron/i, label: 'Electron' },
  { pattern: /express/i, label: 'Express' },
  { pattern: /fastify/i, label: 'Fastify' },
  { pattern: /nest[\\/].*start|nest\s+start/i, label: 'NestJS' },
  { pattern: /hono/i, label: 'Hono' },

  // Python
  { pattern: /uvicorn/i, label: 'FastAPI (Uvicorn)' },
  { pattern: /gunicorn/i, label: 'Gunicorn' },
  { pattern: /flask\s+run/i, label: 'Flask' },
  { pattern: /manage\.py\s+runserver/i, label: 'Django' },
  { pattern: /streamlit/i, label: 'Streamlit' },

  // Ruby
  { pattern: /rails\s+server|rails\s+s\b/i, label: 'Ruby on Rails' },
  { pattern: /puma/i, label: 'Puma' },

  // Go
  { pattern: /go\s+run/i, label: 'Go' },

  // Java / JVM
  { pattern: /java\s+-jar/i, label: 'Java' },
  { pattern: /spring-boot/i, label: 'Spring Boot' },
  { pattern: /tomcat/i, label: 'Tomcat' },
  { pattern: /gradle.*bootRun/i, label: 'Spring Boot (Gradle)' },

  // Rust
  { pattern: /cargo\s+run/i, label: 'Rust (Cargo)' },

  // PHP
  { pattern: /php\s+artisan\s+serve/i, label: 'Laravel' },
  { pattern: /php\s+-S/i, label: 'PHP Built-in Server' },

  // Docker
  { pattern: /docker-proxy/i, label: 'Docker' },
  { pattern: /com\.docker/i, label: 'Docker' },

  // Databases & Services
  { pattern: /mongod/i, label: 'MongoDB' },
  { pattern: /mysqld/i, label: 'MySQL' },
  { pattern: /postgres/i, label: 'PostgreSQL' },
  { pattern: /redis-server/i, label: 'Redis' },
  { pattern: /nginx/i, label: 'Nginx' },
];

/**
 * Regex patterns to extract port numbers from package.json scripts (FR-13).
 */
export const PORT_EXTRACTION_PATTERNS: RegExp[] = [
  /PORT[=\s]+(\d{2,5})/i,
  /--port[=\s]+(\d{2,5})/i,
  /-p[=\s]+(\d{2,5})/,
  /:(\d{4,5})(?:\/|$|\s|")/,
];

/**
 * Regex patterns to detect port conflict errors in terminal output (FR-15).
 */
export const TERMINAL_CONFLICT_PATTERNS: RegExp[] = [
  /EADDRINUSE[:\s].*?:(\d{2,5})/i,
  /address already in use[:\s].*?:(\d{2,5})/i,
  /bind: address already in use/i,
  /Port (\d{2,5}) is in use/i,
  /listen EADDRINUSE.*?:(\d{2,5})/i,
];

/** Known .env variable name patterns for port detection (FR-16) */
export const ENV_PORT_VARIABLE_PATTERNS: RegExp[] = [
  /^PORT$/i,
  /^.*_PORT$/i,
  /^SERVER_PORT$/i,
  /^DATABASE_PORT$/i,
  /^API_PORT$/i,
  /^REDIS_PORT$/i,
];

/** .env file variants to scan */
export const ENV_FILE_NAMES: string[] = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  '.env.test',
];
