package com.aishware.reacta11y

import com.google.gson.Gson
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.process.CapturingProcessHandler
import com.intellij.ide.plugins.PluginManagerCore
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.application.PathManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.extensions.PluginId
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Key
import com.intellij.util.EnvironmentUtil
import java.io.File
import java.io.IOException
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption

data class CliWcagRef(val sc: String = "", val name: String = "", val level: String = "")

data class CliFix(val start: Int = 0, val end: Int = 0, val replacement: String = "")

data class CliIssue(
    val ruleId: String = "",
    val message: String = "",
    val severity: String = "",
    val file: String = "",
    val line: Int = 1,
    val column: Int = 1,
    val endLine: Int = 1,
    val endColumn: Int = 1,
    val wcag: List<CliWcagRef> = emptyList(),
    val helpUrl: String? = null,
    val fix: CliFix? = null,
)

data class CliReport(
    val platform: String = "web",
    val filesScanned: Int = 0,
    val durationMs: Int = 0,
    val issueCount: Int = 0,
    val issues: List<CliIssue> = emptyList(),
)

object CliRunner {
    const val PLUGIN_ID = "com.aishware.react-a11y"

    private val LOG = Logger.getInstance(CliRunner::class.java)
    private val NOTIFIED = Key.create<Boolean>("react-a11y.setup-notified")
    private val gson = Gson()

    /**
     * Lints one in-memory buffer via `--stdin`; config and platform detection
     * come from the working directory (the project root), matching a scan.
     */
    fun lintBuffer(project: Project, text: String, filePath: String): CliReport? =
        run(project, listOf("--stdin", "--stdin-filename", filePath), text)

    /** Full project scan, including cross-file checks live linting cannot do. */
    fun scanProject(project: Project, root: String): CliReport? =
        run(project, listOf(root), null, timeoutMs = 120_000)

    private fun run(project: Project, args: List<String>, stdin: String?, timeoutMs: Int = 15_000): CliReport? {
        val node = nodeExecutable(project) ?: run {
            notifySetupProblem(project, "Node.js was not found. Set its path in Settings → Tools → react-a11y.")
            return null
        }
        val cli = cliScript(project) ?: run {
            notifySetupProblem(project, "The react-a11y CLI could not be located or unpacked.")
            return null
        }
        val settings = A11ySettings.getInstance(project).state
        val platformArgs = when (settings.platform) {
            "web", "native" -> listOf("--platform", settings.platform!!)
            else -> emptyList()
        }
        val command = GeneralCommandLine(node.toString(), cli.toString())
            .withParameters(args + platformArgs + listOf("--format", "json", "--fail-on", "none"))
            .withWorkDirectory(project.basePath)
            .withCharset(StandardCharsets.UTF_8)
        return try {
            val handler = CapturingProcessHandler(command)
            if (stdin != null) {
                // The CLI drains stdin before writing anything, so this cannot deadlock.
                handler.processInput.use { it.write(stdin.toByteArray(StandardCharsets.UTF_8)) }
            }
            val output = handler.runProcess(timeoutMs)
            when {
                output.isTimeout -> {
                    LOG.warn("react-a11y CLI timed out after ${timeoutMs}ms")
                    null
                }
                output.exitCode != 0 -> {
                    LOG.warn("react-a11y CLI exited with ${output.exitCode}: ${output.stderr}")
                    null
                }
                else -> gson.fromJson(output.stdout, CliReport::class.java)
            }
        } catch (e: Exception) {
            LOG.warn("react-a11y CLI failed", e)
            null
        }
    }

    fun nodeExecutable(project: Project): Path? {
        val configured = A11ySettings.getInstance(project).state.nodePath
        if (!configured.isNullOrBlank()) {
            return Path.of(configured).takeIf { Files.isExecutable(it) }
        }
        val exe = if (isWindows()) "node.exe" else "node"
        val pathDirs = (EnvironmentUtil.getValue("PATH") ?: "").split(File.pathSeparator)
        val home = System.getProperty("user.home")
        // GUI-launched IDEs often have a minimal PATH; try version-manager and
        // package-manager locations before giving up.
        val fallbacks = listOf(
            "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin",
            "$home/.volta/bin", "$home/.local/share/fnm/aliases/default/bin",
        )
        for (dir in pathDirs + fallbacks) {
            if (dir.isBlank()) continue
            val candidate = Path.of(dir, exe)
            if (Files.isExecutable(candidate)) return candidate
        }
        return nvmNode()
    }

    private fun nvmNode(): Path? {
        val versions = Path.of(System.getProperty("user.home"), ".nvm", "versions", "node")
        if (!Files.isDirectory(versions)) return null
        val newest = try {
            Files.list(versions).use { stream ->
                stream.filter { Files.isDirectory(it) }
                    .toList()
                    .maxByOrNull { sortableVersion(it.fileName.toString()) }
            }
        } catch (e: IOException) {
            return null
        }
        return newest?.resolve("bin/node")?.takeIf { Files.isExecutable(it) }
    }

    /** "v20.11.1" → "00020.00011.00001" so a plain string comparison orders versions. */
    private fun sortableVersion(name: String): String =
        Regex("\\d+").findAll(name).take(3).joinToString(".") { it.value.padStart(5, '0') }

    fun cliScript(project: Project): Path? {
        val configured = A11ySettings.getInstance(project).state.cliPath
        if (!configured.isNullOrBlank()) {
            return Path.of(configured).takeIf { Files.isRegularFile(it) }
        }
        project.basePath?.let { base ->
            val local = Path.of(base, "node_modules", "@aishware", "react-a11y", "dist", "index.js")
            if (Files.isRegularFile(local)) return local
        }
        return bundledCli
    }

    private val bundledCli: Path? by lazy {
        val version = PluginManagerCore.getPlugin(PluginId.getId(PLUGIN_ID))?.version ?: "dev"
        val target = Path.of(PathManager.getSystemPath(), "react-a11y", version, "cli.cjs")
        try {
            if (!Files.isRegularFile(target)) {
                Files.createDirectories(target.parent)
                CliRunner::class.java.getResourceAsStream("/react-a11y/cli.cjs")?.use { input ->
                    Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING)
                } ?: return@lazy null
            }
            target
        } catch (e: IOException) {
            LOG.warn("could not unpack bundled react-a11y CLI", e)
            null
        }
    }

    private fun isWindows(): Boolean =
        System.getProperty("os.name").lowercase().contains("win")

    private fun notifySetupProblem(project: Project, message: String) {
        if (project.getUserData(NOTIFIED) == true) return
        project.putUserData(NOTIFIED, true)
        NotificationGroupManager.getInstance()
            .getNotificationGroup("react-a11y")
            .createNotification("react-a11y cannot run", message, NotificationType.WARNING)
            .notify(project)
    }
}
