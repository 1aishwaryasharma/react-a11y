package com.aishware.reacta11y

import com.intellij.codeInsight.daemon.DaemonCodeAnalyzer
import com.intellij.openapi.components.BaseState
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.SimplePersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.components.StoragePathMacros
import com.intellij.openapi.components.service
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.ComboBox
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.components.JBTextField
import com.intellij.util.ui.FormBuilder
import javax.swing.JComponent
import javax.swing.JPanel

class A11ySettingsState : BaseState() {
    var enabled by property(true)

    /** Rule pack: "auto" (detect React Native/Expo from package.json), "web" or "native". */
    var platform by string("auto")

    /** Node.js executable; blank = auto-detect from PATH and common install locations. */
    var nodePath by string("")

    /** react-a11y CLI script; blank = the bundled, version-pinned copy. */
    var cliPath by string("")
}

@Service(Service.Level.PROJECT)
@State(name = "ReactA11ySettings", storages = [Storage(StoragePathMacros.WORKSPACE_FILE)])
class A11ySettings : SimplePersistentStateComponent<A11ySettingsState>(A11ySettingsState()) {
    companion object {
        fun getInstance(project: Project): A11ySettings = project.service()
    }
}

class A11ySettingsConfigurable(private val project: Project) : Configurable {
    private val enabled = JBCheckBox("Enable react-a11y diagnostics")
    private val platform = ComboBox(arrayOf("auto", "web", "native"))
    private val nodePath = JBTextField()
    private val cliPath = JBTextField()

    private val state get() = A11ySettings.getInstance(project).state

    override fun getDisplayName(): String = "react-a11y"

    override fun createComponent(): JComponent = FormBuilder.createFormBuilder()
        .addComponent(enabled)
        .addLabeledComponent("Rule pack:", platform)
        .addLabeledComponent("Node.js executable (blank = auto-detect):", nodePath)
        .addLabeledComponent("react-a11y CLI script (blank = bundled):", cliPath)
        .addComponentFillVertically(JPanel(), 0)
        .panel

    override fun isModified(): Boolean =
        enabled.isSelected != state.enabled ||
            platform.selectedItem as String != (state.platform ?: "auto") ||
            nodePath.text.trim() != (state.nodePath ?: "") ||
            cliPath.text.trim() != (state.cliPath ?: "")

    override fun apply() {
        state.enabled = enabled.isSelected
        state.platform = platform.selectedItem as String
        state.nodePath = nodePath.text.trim()
        state.cliPath = cliPath.text.trim()
        DaemonCodeAnalyzer.getInstance(project).restart()
    }

    override fun reset() {
        enabled.isSelected = state.enabled
        platform.selectedItem = state.platform ?: "auto"
        nodePath.text = state.nodePath ?: ""
        cliPath.text = state.cliPath ?: ""
    }
}
