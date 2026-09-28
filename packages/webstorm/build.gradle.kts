import org.jetbrains.intellij.platform.gradle.IntelliJPlatformType

plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "2.2.20"
    id("org.jetbrains.intellij.platform") version "2.18.1"
}

group = "com.aishware"
version = "0.5.0"

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        // Compiled against IntelliJ Community: the plugin only references the
        // JavaScript plugin by id in plugin.xml, never its classes, so the
        // smaller IDE is enough to build while WebStorm & friends run it.
        create("IC", "2024.1.7")
    }
}

kotlin {
    jvmToolchain(17)
    compilerOptions {
        // The IDE we compile against bundles the Kotlin 1.9 stdlib
        // (kotlin.stdlib.default.dependency=false); don't emit newer API calls.
        apiVersion = org.jetbrains.kotlin.gradle.dsl.KotlinVersion.KOTLIN_1_9
        languageVersion = org.jetbrains.kotlin.gradle.dsl.KotlinVersion.KOTLIN_1_9
    }
}

// The annotator shells out to the react-a11y CLI. Bundle it from the sibling
// npm workspaces so the plugin works without a project-local install.
val bundleCli by tasks.registering(Exec::class) {
    workingDir = projectDir
    val npm = if (System.getProperty("os.name").lowercase().contains("win")) "npm.cmd" else "npm"
    commandLine(npm, "run", "build")
    inputs.files(
        fileTree("../cli/src"),
        fileTree("../core/src"),
        fileTree("../rules-web/src"),
        fileTree("../rules-native/src"),
    )
    outputs.file(layout.projectDirectory.file("src/main/resources/react-a11y/cli.cjs"))
}

tasks.processResources {
    dependsOn(bundleCli)
}

intellijPlatform {
    pluginVerification {
        ides {
            // Verify the oldest supported WebStorm and the latest release.
            // IntelliJ Community does not bundle the required JavaScript plugin.
            create(IntelliJPlatformType.WebStorm, "2024.1")
            latest {
                types = listOf(IntelliJPlatformType.WebStorm)
            }
        }
    }
    pluginConfiguration {
        ideaVersion {
            // Matches the platform version we compile against; no until-build,
            // so future IDE releases keep working until an API actually breaks.
            sinceBuild = "241"
            untilBuild = provider { null }
        }
    }
    buildSearchableOptions = false
}
