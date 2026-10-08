import AppKit
import Foundation

// AppKit provides app names/icons and activation without Accessibility or Automation.
@main
struct OpenApps {
    @MainActor static func main() {
        let workspace = NSWorkspace.shared
        var icons: [String: String] = [:]
        var lastSnapshot = ""

        func send(_ value: [String: Any]) {
            guard let data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]) else { return }
            FileHandle.standardOutput.write(data)
            FileHandle.standardOutput.write(Data([10]))
        }

        func snapshot() {
            let apps = workspace.runningApplications.filter {
                $0.activationPolicy == .regular && !$0.isTerminated
                    && $0.bundleIdentifier != "com.elgato.StreamDeck"
            }
            let activePid = workspace.frontmostApplication?.processIdentifier ?? 0
            let signature = apps.map { "\($0.processIdentifier):\($0.bundleIdentifier ?? ""):\($0.localizedName ?? "")" }.sorted().joined(separator: "|") + ":\(activePid)"
            guard signature != lastSnapshot else { return }
            lastSnapshot = signature
            let entries: [[String: Any]] = apps.map { app in
                let id = app.bundleIdentifier ?? app.bundleURL?.path ?? String(app.processIdentifier)
                if icons[id] == nil, let image = app.icon {
                    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 96, pixelsHigh: 96, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
                    NSGraphicsContext.saveGraphicsState()
                    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
                    image.draw(in: NSRect(x: 0, y: 0, width: 96, height: 96), from: .zero, operation: .copy, fraction: 1)
                    NSGraphicsContext.restoreGraphicsState()
                    icons[id] = bitmap.representation(using: .png, properties: [:])?.base64EncodedString() ?? ""
                }
                return ["id": id, "pid": app.processIdentifier, "name": app.localizedName ?? "Application", "icon": icons[id] ?? ""]
            }
            send(["type": "snapshot", "apps": entries, "activePid": activePid])
        }

        if CommandLine.arguments.contains("--snapshot") {
            snapshot()
            return
        }

        // Read on a background queue, then perform all AppKit calls on the main loop.
        DispatchQueue.global().async {
            while let line = readLine() {
                guard let data = line.data(using: .utf8),
                      let request = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let pid = request["pid"] as? Int,
                      let expectedId = request["id"] as? String,
                      let requestId = request["requestId"] as? String else { continue }
                DispatchQueue.main.async {
                    guard let app = NSRunningApplication(processIdentifier: Int32(pid)), !app.isTerminated,
                          (app.bundleIdentifier ?? app.bundleURL?.path ?? String(pid)) == expectedId else {
                        send(["type": "result", "requestId": requestId, "ok": false])
                        return
                    }
                    // Reveal a hidden app and ask macOS to bring its existing windows forward.
                    app.unhide()
                    let ok = app.activate(options: [.activateAllWindows])
                    send(["type": "result", "requestId": requestId, "ok": ok])
                    snapshot()
                }
            }
            exit(0) // Do not leave a helper process behind after Stream Deck stops the plugin.
        }
        snapshot()
        _ = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            DispatchQueue.main.async { snapshot() }
        }
        RunLoop.main.run()
    }
}
