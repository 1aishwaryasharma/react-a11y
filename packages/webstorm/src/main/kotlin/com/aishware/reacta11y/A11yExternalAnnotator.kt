package com.aishware.reacta11y

import com.intellij.codeInsight.intention.HighPriorityAction
import com.intellij.codeInsight.intention.IntentionAction
import com.intellij.lang.annotation.AnnotationHolder
import com.intellij.lang.annotation.ExternalAnnotator
import com.intellij.lang.annotation.HighlightSeverity
import com.intellij.openapi.editor.Document
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.TextRange
import com.intellij.openapi.util.text.StringUtil
import com.intellij.psi.PsiDocumentManager
import com.intellij.psi.PsiFile

class A11yInfo(val project: Project, val text: String, val filePath: String)

class A11yResult(val text: String, val issues: List<CliIssue>)

class A11yExternalAnnotator : ExternalAnnotator<A11yInfo, A11yResult>() {

    override fun collectInformation(file: PsiFile): A11yInfo? {
        if (!A11ySettings.getInstance(file.project).state.enabled) return null
        val virtualFile = file.virtualFile ?: return null
        if (!virtualFile.isInLocalFileSystem) return null
        return A11yInfo(file.project, file.text, virtualFile.path)
    }

    override fun collectInformation(file: PsiFile, editor: Editor, hasErrors: Boolean): A11yInfo? =
        collectInformation(file)

    override fun doAnnotate(info: A11yInfo?): A11yResult? {
        info ?: return null
        val report = CliRunner.lintBuffer(info.project, info.text, info.filePath) ?: return null
        return A11yResult(info.text, report.issues)
    }

    override fun apply(file: PsiFile, result: A11yResult?, holder: AnnotationHolder) {
        result ?: return
        val document = PsiDocumentManager.getInstance(file.project).getDocument(file) ?: return
        // The buffer may have changed while the CLI ran; stale offsets would
        // highlight the wrong code. The daemon re-runs us for the new text.
        if (!StringUtil.equals(document.charsSequence, result.text)) return

        val verifiedFixes = result.issues.mapNotNull { issue ->
            val fix = issue.fix ?: return@mapNotNull null
            if (fix.start < 0 || fix.end > result.text.length || fix.start > fix.end) return@mapNotNull null
            VerifiedFix(issue.ruleId, fix, result.text.substring(fix.start, fix.end))
        }

        for (issue in result.issues) {
            val range = rangeOf(document, issue) ?: continue
            val wcag = issue.wcag.joinToString("; ") { "${it.sc} ${it.name} (${it.level})" }
            val message = "${issue.message} [WCAG $wcag] — react-a11y(${issue.ruleId})"
            val tooltip = buildString {
                append("<html>").append(StringUtil.escapeXmlEntities(issue.message))
                append("<br>WCAG ").append(StringUtil.escapeXmlEntities(wcag))
                issue.helpUrl?.let { append("<br><a href=\"").append(it).append("\">").append(issue.ruleId).append(" docs</a>") }
                append("</html>")
            }
            var annotation = holder.newAnnotation(severityOf(issue.severity), message)
                .range(range)
                .tooltip(tooltip)
            val ownFix = verifiedFixes.find { it.fix === issue.fix }
            if (ownFix != null) {
                annotation = annotation.withFix(ApplyA11yFix(ownFix))
                if (verifiedFixes.size > 1) {
                    annotation = annotation.withFix(FixAllA11y(verifiedFixes))
                }
            }
            annotation.create()
        }
    }

    private fun severityOf(severity: String): HighlightSeverity = when (severity) {
        "critical", "serious" -> HighlightSeverity.ERROR
        "moderate" -> HighlightSeverity.WARNING
        else -> HighlightSeverity.WEAK_WARNING
    }

    private fun rangeOf(document: Document, issue: CliIssue): TextRange? {
        if (document.lineCount == 0) return null
        val start = offsetOf(document, issue.line, issue.column)
        val end = offsetOf(document, issue.endLine, issue.endColumn)
        return if (end > start) TextRange(start, end) else null
    }

    /** CLI positions are 1-based line/column; clamp into the document to stay safe. */
    private fun offsetOf(document: Document, line: Int, column: Int): Int {
        val lineIndex = (line - 1).coerceIn(0, document.lineCount - 1)
        val lineStart = document.getLineStartOffset(lineIndex)
        val lineEnd = document.getLineEndOffset(lineIndex)
        return (lineStart + column - 1).coerceIn(lineStart, lineEnd)
    }
}

/** A fix plus the exact text it replaces, so applying can detect staleness. */
class VerifiedFix(val ruleId: String, val fix: CliFix, val original: String)

private fun Document.applyIfCurrent(fix: CliFix, original: String): Boolean {
    if (fix.end > textLength) return false
    if (getText(TextRange(fix.start, fix.end)) != original) return false
    replaceString(fix.start, fix.end, fix.replacement)
    return true
}

class ApplyA11yFix(private val verified: VerifiedFix) : IntentionAction, HighPriorityAction {
    override fun getText(): String = "Fix: ${verified.ruleId}"
    override fun getFamilyName(): String = "react-a11y"
    override fun startInWriteAction(): Boolean = true

    override fun isAvailable(project: Project, editor: Editor?, file: PsiFile?): Boolean = editor != null

    override fun invoke(project: Project, editor: Editor?, file: PsiFile?) {
        editor?.document?.applyIfCurrent(verified.fix, verified.original)
    }
}

class FixAllA11y(private val fixes: List<VerifiedFix>) : IntentionAction {
    override fun getText(): String = "Fix all react-a11y issues in file"
    override fun getFamilyName(): String = "react-a11y"
    override fun startInWriteAction(): Boolean = true

    override fun isAvailable(project: Project, editor: Editor?, file: PsiFile?): Boolean = editor != null

    override fun invoke(project: Project, editor: Editor?, file: PsiFile?) {
        val document = editor?.document ?: return
        // Descending by start keeps earlier offsets valid; overlapping fixes
        // (rare) are skipped the same way the CLI's applyFixes skips them.
        var lastStart = Int.MAX_VALUE
        for (verified in fixes.sortedByDescending { it.fix.start }) {
            if (verified.fix.end > lastStart) continue
            if (document.applyIfCurrent(verified.fix, verified.original)) {
                lastStart = verified.fix.start
            }
        }
    }
}
