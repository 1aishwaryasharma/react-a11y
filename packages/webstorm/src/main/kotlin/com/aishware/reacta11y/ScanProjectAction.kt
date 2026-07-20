package com.aishware.reacta11y

import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.execution.filters.OpenFileHyperlinkInfo
import com.intellij.execution.filters.TextConsoleBuilderFactory
import com.intellij.execution.ui.ConsoleView
import com.intellij.execution.ui.ConsoleViewContentType
import com.intellij.execution.ui.RunContentDescriptor
import com.intellij.execution.ui.RunContentManager
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.Task
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import java.nio.file.Path

/**
 * Live linting is per-file, so it cannot run the cross-file checks (label
 * resolution, Expo config). This action scans the whole project with the CLI
 * and lists every finding in a console with clickable locations — the
 * counterpart of the VS Code extension's "Scan workspace" command.
 */
class ScanProjectAction : AnAction(), DumbAware {

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project?.basePath != null
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val root = project.basePath ?: return
        object : Task.Backgroundable(project, "react-a11y: scanning project…", false) {
            private var report: CliReport? = null

            override fun run(indicator: ProgressIndicator) {
                report = CliRunner.scanProject(project, root)
            }

            override fun onSuccess() {
                val result = report ?: return // discovery problems already notified
                showResults(project, root, result)
            }
        }.queue()
    }

    private fun showResults(project: Project, root: String, report: CliReport) {
        val console = TextConsoleBuilderFactory.getInstance().createBuilder(project).console
        val descriptor = RunContentDescriptor(console, null, console.component, "react-a11y")
        RunContentManager.getInstance(project)
            .showRunContent(DefaultRunExecutor.getRunExecutorInstance(), descriptor)

        console.print(
            "react-a11y — platform: ${report.platform}, ${report.filesScanned} files scanned in ${report.durationMs} ms\n\n",
            ConsoleViewContentType.SYSTEM_OUTPUT,
        )
        if (report.issues.isEmpty()) {
            console.print("No issues found.\n", ConsoleViewContentType.NORMAL_OUTPUT)
            return
        }
        val severityRank = mapOf("critical" to 0, "serious" to 1, "moderate" to 2, "minor" to 3)
        val sorted = report.issues.sortedWith(
            compareBy({ severityRank[it.severity] ?: 4 }, { it.file }, { it.line }),
        )
        for (issue in sorted) {
            printLocation(console, project, root, issue)
            val contentType = when (issue.severity) {
                "critical", "serious" -> ConsoleViewContentType.ERROR_OUTPUT
                else -> ConsoleViewContentType.NORMAL_OUTPUT
            }
            console.print("  ${issue.severity}  ${issue.ruleId}\n", contentType)
            val wcag = issue.wcag.joinToString("; ") { "${it.sc} ${it.name} (${it.level})" }
            console.print("    ${issue.message} [WCAG $wcag]\n", ConsoleViewContentType.NORMAL_OUTPUT)
        }
        val counts = sorted.groupingBy { it.severity }.eachCount()
        val summary = listOf("critical", "serious", "moderate", "minor")
            .mapNotNull { s -> counts[s]?.let { "$it $s" } }
            .joinToString(", ")
        console.print("\n${report.issues.size} issues ($summary)\n", ConsoleViewContentType.SYSTEM_OUTPUT)
    }

    private fun printLocation(console: ConsoleView, project: Project, root: String, issue: CliIssue) {
        val location = "${issue.file}:${issue.line}:${issue.column}"
        val virtualFile = LocalFileSystem.getInstance().findFileByNioFile(Path.of(root, issue.file))
        if (virtualFile != null) {
            console.printHyperlink(location, OpenFileHyperlinkInfo(project, virtualFile, issue.line - 1, issue.column - 1))
        } else {
            console.print(location, ConsoleViewContentType.NORMAL_OUTPUT)
        }
    }
}
